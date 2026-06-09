/**
 * Auth Middleware
 *
 * requireAuth            — Validate session JWT, attach user + tenantId to req
 * requireDotloopConnection — Verify the tenant has an active Dotloop connection
 *
 * Session tokens are signed JWTs stored in the `session` cookie (set during OAuth callback).
 * The payload carries: { userId, tenantId, email }
 */

import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { getSupabaseAdmin } from '../lib/supabase';

// Extend Express Request to carry our session context
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
      userEmail?: string;
    }
  }
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

/**
 * Middleware that validates the session JWT and attaches user context to req.
 * Accepts token from either:
 *  1. Cookie: `session`
 *  2. Authorization: Bearer <token> header
 *
 * Returns 401 if no valid token found.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cookieToken = (req.cookies as Record<string, string>)?.session;
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : undefined;

    const token = cookieToken || headerToken;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId || !payload.tenantId) {
      res.status(401).json({ error: 'Invalid session token' });
      return;
    }

    req.userId    = String(payload.userId);
    req.tenantId  = String(payload.tenantId);
    req.userEmail = typeof payload.email === 'string' ? payload.email : undefined;

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// ─── requireDotloopConnection ─────────────────────────────────────────────────

/**
 * Middleware that checks the tenant has an active Dotloop connection.
 * Must be used after requireAuth (needs req.tenantId).
 * Returns 400 if not connected.
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
