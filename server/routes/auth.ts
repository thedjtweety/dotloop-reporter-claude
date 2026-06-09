/**
 * Auth Routes
 *
 * GET  /api/auth/me          — Return tenant profile for the authenticated user
 * POST /api/auth/setup-tenant — Create tenant + user rows for a new Supabase signup
 *
 * These routes are called by the frontend after Supabase auth actions.
 * They rely on the Supabase user ID passed in the request body / JWT.
 * The service_role key is used server-side for privileged DB operations.
 */

import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * Returns the tenant profile for the currently authenticated user.
 * requireAuth middleware verifies the Supabase Bearer token and attaches
 * req.userId + req.tenantId before this handler runs.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getSupabaseAdmin();

    // requireAuth already verified the token and looked up the user row.
    // Fetch the tenant name to return brokerage info.
    const { data: tenantRow, error } = await db
      .from('tenants')
      .select('name')
      .eq('id', req.tenantId!)
      .maybeSingle();

    if (error) {
      console.error('[auth/me] tenant lookup error:', error.message);
      res.status(500).json({ error: 'Failed to load tenant' });
      return;
    }

    res.json({
      tenantId:      req.tenantId,
      brokerageName: tenantRow?.name ?? null,
      userId:        req.userId,
      email:         req.userEmail,
    });
  } catch (err) {
    console.error('[auth/me] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/setup-tenant ──────────────────────────────────────────────

/**
 * Called once after a new user signs up via Supabase Auth.
 * Creates:
 *   1. A new `tenants` row for the brokerage
 *   2. A `users` row linking the Supabase UID to the tenant
 */
router.post('/setup-tenant', async (req: Request, res: Response) => {
  console.log('[auth/setup-tenant] ── route hit ──');
  try {
    const { userId, email, brokerageName } = req.body as {
      userId?: string;
      email?: string;
      brokerageName?: string;
    };

    console.log('[auth/setup-tenant] received:', { userId, email, brokerageName });

    if (!userId || !email || !brokerageName) {
      console.warn('[auth/setup-tenant] missing fields — returning 400');
      res.status(400).json({ error: 'userId, email, and brokerageName are required' });
      return;
    }

    const db = getSupabaseAdmin();

    // Verify the user actually exists in Supabase Auth
    console.log('[auth/setup-tenant] verifying user in Supabase Auth:', userId);
    const { data: { user }, error: userError } = await db.auth.admin.getUserById(userId);
    console.log('[auth/setup-tenant] Supabase Auth lookup result:', { found: !!user, error: userError?.message ?? null });
    if (userError || !user) {
      res.status(400).json({ error: `Invalid Supabase user ID: ${userError?.message ?? 'user not found'}` });
      return;
    }

    // Check if user row already exists (idempotent)
    console.log('[auth/setup-tenant] checking for existing user row...');
    const { data: existing, error: existingErr } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', userId)
      .maybeSingle();
    console.log('[auth/setup-tenant] existing user row:', { existing, error: existingErr?.message ?? null });

    if (existing) {
      console.log('[auth/setup-tenant] user already exists, returning existing tenantId');
      res.json({ tenantId: existing.tenant_id, created: false });
      return;
    }

    // Create tenant
    const tenantId = uuidv4();
    console.log('[auth/setup-tenant] inserting tenant row, id:', tenantId);
    const { error: tenantError } = await db
      .from('tenants')
      .insert({
        id:         tenantId,
        name:       brokerageName,
        plan:       'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    console.log('[auth/setup-tenant] tenant insert result:', { error: tenantError?.message ?? null, code: tenantError?.code ?? null, details: tenantError?.details ?? null });

    if (tenantError) {
      res.status(500).json({ error: `Failed to create tenant: ${tenantError.message}` });
      return;
    }

    // Create user row — users.id IS the Supabase auth user id (no separate supabase_uid column)
    console.log('[auth/setup-tenant] inserting user row, id:', userId);
    const { error: userRowError } = await db
      .from('users')
      .insert({
        id:         userId,      // = auth.users.id (Supabase auth user id)
        tenant_id:  tenantId,
        email,
        role:       'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    console.log('[auth/setup-tenant] user row insert result:', { error: userRowError?.message ?? null, code: userRowError?.code ?? null, details: userRowError?.details ?? null });

    if (userRowError) {
      res.status(500).json({ error: `Failed to create user profile: ${userRowError.message}` });
      return;
    }

    // Audit log (best-effort, non-blocking)
    db.from('audit_log').insert({
      tenant_id:     tenantId,
      action:        'tenant_created',
      resource_type: 'tenant',
      resource_id:   tenantId,
      details:       { email, brokerageName },
      created_at:    new Date().toISOString(),
    }).then(({ error: auditErr }) => {
      if (auditErr) console.error('[auth] audit log insert failed:', auditErr.message);
    });

    console.log('[auth/setup-tenant] ✓ success — tenantId:', tenantId);
    res.status(201).json({ tenantId, created: true });
  } catch (err) {
    console.error('[auth/setup-tenant] THREW:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Internal server error: ${msg}` });
  }
});

export default router;
