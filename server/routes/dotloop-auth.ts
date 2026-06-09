/**
 * Dotloop OAuth Routes
 *
 * GET  /api/dotloop/connect      — Redirect user to Dotloop authorization page
 * GET  /api/dotloop/callback     — Handle OAuth callback, exchange code for tokens
 * POST /api/dotloop/disconnect   — Revoke tokens and remove connection
 * GET  /api/dotloop/status       — Return current connection status for tenant
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { encryptToken } from '../lib/token-encryption';
import { revokeToken } from '../lib/dotloop-token-service';
import { DotloopAPIClient } from '../lib/dotloop-client';

const router = Router();

const DOTLOOP_AUTH_URL = 'https://auth.dotloop.com/oauth/authorize';
const DOTLOOP_TOKEN_URL = 'https://auth.dotloop.com/oauth/token';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDotloopCreds() {
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;
  const redirectUri = process.env.DOTLOOP_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('DOTLOOP_CLIENT_ID, DOTLOOP_CLIENT_SECRET, and DOTLOOP_REDIRECT_URI must be set.');
  }
  return { clientId, clientSecret, redirectUri };
}

function basicAuth(clientId: string, clientSecret: string) {
  return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

// ─── GET /connect ─────────────────────────────────────────────────────────────

// requireAuth accepts query param ?token= so browser redirects work
router.get('/connect', requireAuth, async (req: Request, res: Response) => {
  console.log('[dotloop/connect] ── handler reached ──');
  console.log('[dotloop/connect] tenantId:', req.tenantId, 'userId:', req.userId);
  try {
    console.log('[dotloop/connect] reading env vars...');
    console.log('[dotloop/connect] CLIENT_ID:', process.env.DOTLOOP_CLIENT_ID ? `${process.env.DOTLOOP_CLIENT_ID.slice(0, 8)}...` : 'MISSING');
    console.log('[dotloop/connect] CLIENT_SECRET:', process.env.DOTLOOP_CLIENT_SECRET ? 'set' : 'MISSING');
    console.log('[dotloop/connect] REDIRECT_URI:', process.env.DOTLOOP_REDIRECT_URI ?? 'MISSING');

    const { clientId, redirectUri } = getDotloopCreds();
    console.log('[dotloop/connect] creds OK — generating state...');

    const state = crypto.randomBytes(24).toString('hex');
    console.log('[dotloop/connect] state generated, setting cookies...');

    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: 'lax' as const,
    };
    res.cookie('dl_oauth_state', state,          cookieOpts);
    res.cookie('dl_tenant_id',   req.tenantId!,  cookieOpts);
    res.cookie('dl_user_id',     req.userId!,    cookieOpts);
    console.log('[dotloop/connect] cookies set, building redirect URL...');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     clientId,
      redirect_uri:  redirectUri,
      state,
    });

    const authorizeUrl = `${DOTLOOP_AUTH_URL}?${params.toString()}`;
    console.log('[dotloop/connect] redirecting to:', authorizeUrl.slice(0, 80) + '...');
    res.redirect(authorizeUrl);
    console.log('[dotloop/connect] ✓ redirect sent');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[dotloop/connect] CAUGHT ERROR:', msg);
    console.error('[dotloop/connect] full error:', err);
    res.status(500).json({ error: 'Connect failed', details: msg });
  }
});

// ─── GET /callback ────────────────────────────────────────────────────────────

router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error: oauthError } = req.query as Record<string, string>;

    if (oauthError) {
      console.warn('[dotloop-auth] OAuth error from Dotloop:', oauthError);
      res.redirect('/settings?error=auth_failed');
      return;
    }

    // CSRF state validation — check session or cookie fallback
    const expectedState =
      (req as any).session?.dotloopOAuthState ||
      (req.cookies as Record<string, string>)?.dl_oauth_state;

    if (!state || !expectedState || state !== expectedState) {
      console.error('[dotloop-auth] State mismatch — possible CSRF attack');
      res.status(400).json({ error: 'Invalid OAuth state parameter' });
      return;
    }

    // Clear state from session + cookie
    if ((req as any).session) {
      delete (req as any).session.dotloopOAuthState;
    }
    res.clearCookie('dl_oauth_state');

    // tenantId/userId were stored in the state cookie during /connect
    // Re-derive from the callback's cookie (no second auth needed — Dotloop signed the code)
    // We stored the user context in a cookie at /connect time; read it back
    const tenantId = (req.cookies as Record<string, string>)?.dl_tenant_id;
    const userId   = (req.cookies as Record<string, string>)?.dl_user_id;
    if (!tenantId || !userId) {
      console.error('[dotloop-auth] Missing tenant/user cookies in callback');
      res.redirect('/settings?error=auth_failed');
      return;
    }
    res.clearCookie('dl_tenant_id');
    res.clearCookie('dl_user_id');

    const { clientId, clientSecret, redirectUri } = getDotloopCreds();

    // Exchange authorization code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(DOTLOOP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: basicAuth(clientId, clientSecret),
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '');
      console.error('[dotloop-auth] Token exchange failed:', tokenRes.status, body);
      res.redirect('/settings?error=auth_failed');
      return;
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Fetch account + profiles with new token
    const client = new DotloopAPIClient(tokens.access_token);
    const [account, profiles] = await Promise.all([
      client.getAccount(),
      client.getProfiles(),
    ]);

    // Pick the first INDIVIDUAL profile (as opposed to team/brokerage profiles)
    const profile = profiles[0];

    // Persist to dotloop_connections
    const db = getSupabaseAdmin();
    await db.from('dotloop_connections').upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        dotloop_account_id: String(account.id),
        dotloop_profile_id: profile?.profileId ?? null,
        dotloop_profile_name: profile?.name ?? account.name,
        encrypted_access_token: encryptToken(tokens.access_token),
        encrypted_refresh_token: encryptToken(tokens.refresh_token),
        token_expires_at: tokenExpiresAt.toISOString(),
        sync_status: 'active',
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    );

    // Audit log
    await db.from('audit_log').insert({
      tenant_id: tenantId,
      user_id: userId,
      action: 'dotloop_connected',
      resource_type: 'dotloop_connection',
      details: { dotloop_account_id: account.id, profile_name: profile?.name },
      created_at: new Date().toISOString(),
    });

    res.redirect('/settings?connected=true');
  } catch (err) {
    console.error('[dotloop-auth] /callback error:', err);
    res.redirect('/settings?error=auth_failed');
  }
});

// ─── POST /disconnect ─────────────────────────────────────────────────────────

router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    await revokeToken(req.tenantId!);
    res.json({ success: true });
  } catch (err) {
    console.error('[dotloop-auth] /disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// ─── GET /status ──────────────────────────────────────────────────────────────

// /status is intentionally unauthenticated — returns {connected:false} when not logged in
// so the Settings form can show "Not connected" without requiring auth
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Verify token if present; if absent just return disconnected (not an error)
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.query as Record<string, string>)?.token;

    if (!token) {
      res.json({ connected: false, lastSynced: null, syncStatus: 'disconnected', loopsSynced: 0, profileName: null });
      return;
    }

    const db = getSupabaseAdmin();
    const { data: { user }, error: authErr } = await db.auth.getUser(token);
    if (authErr || !user) {
      res.json({ connected: false, lastSynced: null, syncStatus: 'disconnected', loopsSynced: 0, profileName: null });
      return;
    }

    const { data: userRow } = await db
      .from('users').select('tenant_id').eq('id', user.id).maybeSingle();
    if (!userRow?.tenant_id) {
      res.json({ connected: false, lastSynced: null, syncStatus: 'disconnected', loopsSynced: 0, profileName: null });
      return;
    }
    const tenantId = userRow.tenant_id as string;

    const { data: conn } = await db
      .from('dotloop_connections')
      .select('sync_status, last_synced_at, loops_synced, dotloop_profile_name')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!conn) {
      res.json({ connected: false, lastSynced: null, syncStatus: 'disconnected', loopsSynced: 0, profileName: null });
      return;
    }

    res.json({
      connected: true,
      lastSynced: conn.last_synced_at ?? null,
      syncStatus: conn.sync_status ?? 'active',
      loopsSynced: conn.loops_synced ?? 0,
      profileName: conn.dotloop_profile_name ?? null,
    });
  } catch (err) {
    console.error('[dotloop-auth] /status error:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;
