/**
 * tRPC Request Context
 *
 * Mirrors the logic in server/middleware/auth.ts (requireAuth) but adapted for
 * tRPC: instead of calling res.status(401) on failure we return { user: null }
 * so that publicProcedure still works and protectedProcedure can throw its own
 * TRPCError.
 *
 * Token flow:
 *   Frontend: Authorization: Bearer <supabase_access_token>
 *   Context:  supabaseAdmin.auth.getUser(token) → user
 *             users table .eq('id', user.id)    → { id, tenant_id, email }
 */

import type { Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string | null;
  role: string | null;
  name: string | null;
}

export type TrpcContext = {
  req: Request;
  res: Response;
  user: AuthUser | null;
};

// ─── createContext ────────────────────────────────────────────────────────────

export async function createContext(opts: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  const { req, res } = opts;

  try {
    // Extract bearer token — same as requireAuth
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return { req, res, user: null };
    }

    const supabase = getSupabaseAdmin();

    // Verify the Supabase JWT
    const { data: { user: supabaseUser }, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !supabaseUser) {
      console.warn('[Context] getUser failed:', authError?.message ?? 'no user returned');
      return { req, res, user: null };
    }

    // Look up tenant via users table (users.id = auth.users.id)
    const { data: userRow, error: dbError } = await supabase
      .from('users')
      .select('id, tenant_id, email, role, name')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    if (dbError) {
      console.error('[Context] users table lookup error:', dbError.message);
      return { req, res, user: null };
    }

    if (!userRow) {
      console.warn('[Context] no users row for supabase_uid:', supabaseUser.id);
      return { req, res, user: null };
    }

    console.log('[Context] ✓ authenticated user, tenant_id:', userRow.tenant_id);

    return {
      req,
      res,
      user: {
        id:       userRow.id as string,
        tenantId: userRow.tenant_id as string,
        email:    (userRow.email as string | null) ?? null,
        role:     (userRow.role as string | null) ?? null,
        name:     (userRow.name as string | null) ??
                  (supabaseUser.user_metadata?.full_name as string | null) ?? null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Context] unexpected error:', msg);
    return { req, res: opts.res, user: null };
  }
}
