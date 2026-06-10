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
      secure: false,           // false for localhost — Dotloop redirects back over HTTP in dev
      sameSite: 'lax' as const,
      maxAge: 10 * 60 * 1000, // 10 minutes
    };
    res.cookie('dl_oauth_state', state,         cookieOpts);
    res.cookie('dl_tenant_id',   req.tenantId!, cookieOpts);
    res.cookie('dl_user_id',     req.userId!,   cookieOpts);
    console.log('[dotloop/connect] cookies set — state:', state.slice(0, 8) + '...',
      'tenant:', req.tenantId, 'user:', req.userId);
    console.log('[dotloop/connect] building redirect URL...');

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
  console.log('[callback] ── handler reached ──');
  try {
    const { code, state, error: oauthError } = req.query as Record<string, string>;

    console.log('[callback] code:', code ? code.slice(0, 6) + '...' : 'MISSING');
    console.log('[callback] state from query:', state ?? 'MISSING');
    console.log('[callback] state from cookie:', (req.cookies as Record<string, string>)?.dl_oauth_state ?? 'MISSING');
    console.log('[callback] dl_tenant_id cookie:', (req.cookies as Record<string, string>)?.dl_tenant_id ?? 'MISSING');
    console.log('[callback] dl_user_id cookie:',   (req.cookies as Record<string, string>)?.dl_user_id   ?? 'MISSING');
    console.log('[callback] all cookies:', Object.keys(req.cookies ?? {}));

    if (oauthError) {
      console.warn('[callback] OAuth error from Dotloop:', oauthError);
      res.redirect('/settings?error=auth_failed');
      return;
    }

    // CSRF state validation
    const expectedState = (req.cookies as Record<string, string>)?.dl_oauth_state;

    if (!state || !expectedState || state !== expectedState) {
      console.error('[callback] STATE MISMATCH — query:', state, '| cookie:', expectedState);
      res.status(400).json({ error: 'Invalid OAuth state parameter', query: state, cookie: expectedState });
      return;
    }
    console.log('[callback] state OK');

    res.clearCookie('dl_oauth_state');

    const tenantId = (req.cookies as Record<string, string>)?.dl_tenant_id;
    const userId   = (req.cookies as Record<string, string>)?.dl_user_id;
    if (!tenantId || !userId) {
      console.error('[callback] Missing tenant/user cookies — tenantId:', tenantId, 'userId:', userId);
      res.redirect('/settings?error=auth_failed');
      return;
    }
    console.log('[callback] tenant:', tenantId, 'user:', userId);
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

    // ── Log raw API responses ────────────────────────────────────────────────
    console.log('[callback] full account object:', JSON.stringify(account));
    console.log('[callback] profiles:', JSON.stringify(profiles));

    // ── Select profile ───────────────────────────────────────────────────────
    // account.defaultProfileId is the most reliable fallback — it's present even
    // when getProfiles() returns an empty array (Dotloop API quirk).
    const defaultProfileId = account?.defaultProfileId
      ? String(account.defaultProfileId)
      : null;
    console.log('[callback] defaultProfileId from account:', defaultProfileId);

    // Prefer first INDIVIDUAL-typed profile → profiles[0] → account.defaultProfileId
    const individualProfile = profiles?.find(
      (p) => typeof p.type === 'string' && p.type.toUpperCase() === 'INDIVIDUAL'
    );
    const profileFromList = individualProfile ?? profiles?.[0] ?? null;

    const profileId   = profileFromList?.profileId ?? defaultProfileId;
    const profileName = profileFromList?.name ?? (account?.firstName && account?.lastName ? `${account.firstName} ${account.lastName}` : account?.email ?? 'Unknown');

    console.log('[callback] selected profileId:', profileId);
    console.log('[callback] selected profile source:',
      individualProfile   ? 'INDIVIDUAL match from profiles list' :
      profileFromList     ? 'fallback profiles[0]' :
      defaultProfileId    ? 'account.defaultProfileId fallback' :
                            'NONE — will abort'
    );

    if (!profileId) {
      console.error('[callback] no profile ID available — profiles:', JSON.stringify(profiles),
        '| defaultProfileId:', defaultProfileId);
      res.redirect('/settings?error=no_profile');
      return;
    }

    const encryptedAccessToken  = encryptToken(tokens.access_token);
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);

    // Persist to dotloop_connections
    const supabaseAdmin = getSupabaseAdmin();

    console.log('[callback] attempting DB insert', {
      tenant_id:         tenantId,
      user_id:           userId,
      has_access_token:  !!encryptedAccessToken,
      has_refresh_token: !!encryptedRefreshToken,
      profile_id:        profileId,
    });

    const { data: connData, error: connError } = await supabaseAdmin
      .from('dotloop_connections')
      .upsert(
        {
          tenant_id:               tenantId,
          user_id:                 userId,
          dotloop_account_id:      String(account.id),
          dotloop_profile_id:      profileId,          // already a string, never null
          dotloop_profile_name:    profileName,
          encrypted_access_token:  encryptedAccessToken,
          encrypted_refresh_token: encryptedRefreshToken,
          token_expires_at:        tokenExpiresAt.toISOString(),
          sync_status:             'never',
          is_active:               true,
          connected_at:            new Date().toISOString(),
        },
        { onConflict: 'tenant_id' }
      );

    console.log('[callback] DB insert result:', {
      data:    connData,
      error:   connError?.message,
      code:    connError?.code,
      details: connError?.details,
    });

    if (connError) {
      console.error('[callback] FAILED to save connection:', connError);
      // Don't redirect to success if save failed
      res.redirect('/settings?error=save_failed');
      return;
    }

    // Audit log (best-effort — after successful connection save)
    await supabaseAdmin.from('audit_log').insert({
      tenant_id:     tenantId,
      user_id:       userId,
      action:        'dotloop_connected',
      resource_type: 'dotloop_connection',
      details:       { dotloop_account_id: account.id, profile_name: profileName },
      created_at:    new Date().toISOString(),
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
