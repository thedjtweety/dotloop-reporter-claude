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
import { getValidToken } from '../lib/dotloop-token-service';
import { DotloopAPIClient } from '../lib/dotloop-client';

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

// ─── GET /debug/loop/:loopId ──────────────────────────────────────────────────

router.get('/debug/loop/:loopId', requireAuth, async (req: Request, res: Response) => {
  const { loopId } = req.params;

  if (!/^\d+$/.test(loopId)) {
    res.status(400).json({ error: 'loopId must be numeric' });
    return;
  }

  const tenantId = req.tenantId!;

  try {
    const db = getSupabaseAdmin();

    const { data: connection, error: connErr } = await db
      .from('dotloop_connections')
      .select('dotloop_profile_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (connErr) {
      res.status(500).json({ error: connErr.message });
      return;
    }

    if (!connection || !connection.dotloop_profile_id) {
      res.status(400).json({ error: 'No Dotloop connection or dotloop_profile_id is missing for this tenant' });
      return;
    }

    const profileId = String(connection.dotloop_profile_id);
    console.log(`[debug/loop] fetching loop=${loopId} profile=${profileId} tenant=${tenantId}`);

    const accessToken = await getValidToken(tenantId);
    const client = new DotloopAPIClient(accessToken);

    let loop: unknown = null;
    let loopError: string | null = null;
    let detail: unknown = null;
    let detailError: string | null = null;
    let participants: unknown = null;
    let participantsError: string | null = null;

    try {
      loop = await client.getLoop(profileId, loopId);
    } catch (e) {
      loopError = String(e);
    }

    try {
      detail = await client.getLoopDetail(profileId, loopId);
    } catch (e) {
      detailError = String(e);
    }

    try {
      participants = await client.getLoopParticipants(profileId, loopId);
    } catch (e) {
      participantsError = String(e);
    }

    console.log(`[debug/loop] done loop=${loopId}`);

    res.json({
      profileId,
      loopId,
      results: {
        loop,
        loopError,
        detail,
        detailError,
        participants,
        participantsError,
      },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[dotloop-sync] GET /debug/loop error:', err);
    res.status(500).json({ error: 'Failed to fetch loop debug data' });
  }
});

export default router;
