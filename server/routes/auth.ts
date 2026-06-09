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
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

/**
 * Returns the tenant profile for the currently authenticated user.
 * The Supabase JWT is expected either in the Authorization header
 * (Bearer <access_token>) or via the `session` cookie.
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Get access token from Authorization header or cookie
    const token =
      req.headers.authorization?.replace('Bearer ', '') ||
      (req.cookies as Record<string, string>)?.['sb-access-token'];

    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const db = getSupabaseAdmin();

    // Verify the Supabase JWT and get the user
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Look up their tenant record
    const { data: userRow } = await db
      .from('users')
      .select('tenant_id, tenants(name)')
      .eq('supabase_uid', user.id)
      .maybeSingle();

    if (!userRow) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    // Supabase join returns the related table as a nested object
    const tenant = userRow.tenants as { name?: string } | null;

    res.json({
      tenantId:      userRow.tenant_id,
      brokerageName: tenant?.name ?? null,
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
  try {
    const { userId, email, brokerageName } = req.body as {
      userId?: string;
      email?: string;
      brokerageName?: string;
    };

    if (!userId || !email || !brokerageName) {
      res.status(400).json({ error: 'userId, email, and brokerageName are required' });
      return;
    }

    const db = getSupabaseAdmin();

    // Verify the user actually exists in Supabase Auth
    const { data: { user }, error: userError } = await db.auth.admin.getUserById(userId);
    if (userError || !user) {
      res.status(400).json({ error: 'Invalid Supabase user ID' });
      return;
    }

    // Check if user row already exists (idempotent)
    const { data: existing } = await db
      .from('users')
      .select('tenant_id')
      .eq('supabase_uid', userId)
      .maybeSingle();

    if (existing) {
      res.json({ tenantId: existing.tenant_id, created: false });
      return;
    }

    // Create tenant
    const tenantId = uuidv4();
    const { error: tenantError } = await db
      .from('tenants')
      .insert({
        id:         tenantId,
        name:       brokerageName,
        plan:       'trial',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (tenantError) {
      console.error('[auth/setup-tenant] tenant insert error:', tenantError.message);
      res.status(500).json({ error: 'Failed to create tenant' });
      return;
    }

    // Create user row
    const { error: userRowError } = await db
      .from('users')
      .insert({
        id:          uuidv4(),
        tenant_id:   tenantId,
        supabase_uid: userId,
        email,
        role:        'admin',
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
      });

    if (userRowError) {
      console.error('[auth/setup-tenant] user insert error:', userRowError.message);
      res.status(500).json({ error: 'Failed to create user profile' });
      return;
    }

    // Audit log
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

    res.status(201).json({ tenantId, created: true });
  } catch (err) {
    console.error('[auth/setup-tenant] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
