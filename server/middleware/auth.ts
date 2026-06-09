/**
 * Auth Middleware
 *
 * requireAuth              — Verify Supabase Bearer token, attach userId + tenantId to req
 * requireDotloopConnection — Verify the tenant has an active Dotloop connection
 *
 * All protected routes use Supabase JWTs issued by supabase.auth.signIn/signUp.
 * The service_role admin client is used server-side to verify tokens and fetch tenant data.
 *
 * Token flow:
 *   Frontend: Authorization: Bearer <supabase_access_token>
 *   Backend:  supabaseAdmin.auth.getUser(token) → user
 *             users table lookup by id (users.id = auth.users.id) → tenant_id
 */

import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';

// ─── Extend Express.Request ───────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      userEmail?: string;
    }
  }
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

/**
 * Verifies the Supabase access token from the Authorization: Bearer header,
 * looks up the user's tenant row, and attaches userId + tenantId to req.
 *
 * Returns 401 if no valid token is found or the user has no tenant row yet.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Accept token from Authorization header OR query param (for browser redirects)
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.query as Record<string, string>)?.token;

    if (!token) {
      console.warn('[requireAuth] no token on', req.method, req.path);
      res.status(401).json({ error: 'Authentication required — no token provided' });
      return;
    }

    const db = getSupabaseAdmin();

    // Verify the Supabase JWT
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      console.warn('[requireAuth] getUser failed:', authError?.message ?? 'no user returned');
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    console.log('[requireAuth] token verified, supabase_uid:', user.id);

    // Look up the tenant via users table
    const { data: userRow, error: dbError } = await db
      .from('users')
      .select('id, tenant_id, email')
      .eq('id', user.id)
      .maybeSingle();

    if (dbError) {
      console.error('[requireAuth] users table lookup error:', dbError.message, '| code:', dbError.code, '| details:', dbError.details);
      res.status(500).json({ error: `Failed to load user profile: ${dbError.message}` });
      return;
    }

    if (!userRow) {
      // User signed up in Supabase Auth but hasn't completed setup-tenant yet
      console.warn('[requireAuth] no users row for supabase_uid:', user.id);
      res.status(401).json({ error: 'User profile not found — complete account setup first' });
      return;
    }

    console.log('[requireAuth] ✓ user found, tenant_id:', userRow.tenant_id);
    req.userId    = userRow.id as string;
    req.tenantId  = userRow.tenant_id as string;
    req.userEmail = userRow.email as string | undefined;

    next();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[requireAuth] unexpected error:', msg, err);
    res.status(500).json({ error: `Authentication failed: ${msg}` });
  }
}

// ─── requireDotloopConnection ─────────────────────────────────────────────────

/**
 * Checks the tenant has an active Dotloop connection.
 * Must be used after requireAuth (needs req.tenantId).
 */
export async function requireDotloopConnection(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { tenantId } = req;
    if (!tenantId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const db = getSupabaseAdmin();
    const { data: conn } = await db
      .from('dotloop_connections')
      .select('sync_status')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!conn) {
      res.status(400).json({
        error: 'No Dotloop connection',
        message: 'Connect your Dotloop account in Settings before using this feature.',
      });
      return;
    }

    if (conn.sync_status === 'error') {
      res.status(400).json({
        error: 'Dotloop connection error',
        message: 'Your Dotloop connection encountered an error. Please reconnect in Settings.',
      });
      return;
    }

    next();
  } catch (err) {
    console.error('[requireDotloopConnection] error:', err);
    res.status(500).json({ error: 'Failed to verify Dotloop connection' });
  }
}
