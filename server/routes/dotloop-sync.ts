/**
 * Dotloop Sync API Routes
 *
 * POST /api/dotloop/sync          — Trigger a manual sync for the tenant
 * GET  /api/dotloop/sync/status   — Get status of the latest sync job
 */

import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';
import { syncTenant } from '../lib/dotloop-sync';

const router = Router();

// ─── POST /sync ───────────────────────────────────────────────────────────────

router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = { tenantId: req.tenantId!, userId: req.userId! };

    const db = getSupabaseAdmin();

    // Guard: reject if a sync is already running
    const { data: running } = await db
      .from('sync_jobs')
      .select('id')
      .eq('tenant_id', session.tenantId)
      .eq('status', 'running')
      .maybeSingle();

    if (running) {
      res.status(409).json({ error: 'A sync is already in progress', jobId: running.id });
      return;
    }

    // Fire sync (async — respond with jobId immediately)
    const resultPromise = syncTenant(session.tenantId, session.userId, 'manual');

    // Return before awaiting so client isn't blocked
    // The job ID comes from the sync function itself; for now return a 202 Accepted
    resultPromise
      .then(r => console.log(`[sync] Tenant ${session.tenantId} sync ${r.status}: ${r.loopsFetched} loops`))
      .catch(e => console.error(`[sync] Tenant ${session.tenantId} sync error:`, e));

    res.status(202).json({ status: 'started', message: 'Sync initiated' });
  } catch (err) {
    console.error('[dotloop-sync] POST /sync error:', err);
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

// ─── GET /sync/status ─────────────────────────────────────────────────────────

router.get('/sync/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const session = { tenantId: req.tenantId!, userId: req.userId! };

    const db = getSupabaseAdmin();

    const { data: job, error } = await db
      .from('sync_jobs')
      .select('id, status, loops_fetched, loops_created, loops_updated, started_at, completed_at, error_message')
      .eq('tenant_id', session.tenantId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!job) {
      res.json({ status: 'never_synced', loopsFetched: 0, loopsCreated: 0, loopsUpdated: 0, startedAt: null, completedAt: null, error: null });
      return;
    }

    res.json({
      jobId: job.id,
      status: job.status,
      loopsFetched: job.loops_fetched ?? 0,
      loopsCreated: job.loops_created ?? 0,
      loopsUpdated: job.loops_updated ?? 0,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      error: job.error_message ?? null,
    });
  } catch (err) {
    console.error('[dotloop-sync] GET /sync/status error:', err);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

export default router;
