/**
 * Dotloop Webhook Handler
 *
 * POST /api/dotloop/webhook
 *
 * Verifies HMAC-SHA1 signature, validates timestamp replay protection,
 * then upserts the affected loop for LOOP_CREATED / LOOP_UPDATED events.
 * Always responds within 5 seconds to avoid Dotloop retry storms.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase';
import { getValidToken } from '../lib/dotloop-token-service';
import { DotloopAPIClient } from '../lib/dotloop-client';
import { transformLoop } from '../lib/dotloop-sync';

const router = Router();

// Replay protection window: 5 minutes
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

// ─── Signature verification ───────────────────────────────────────────────────

function verifySignature(
  signingKey: string,
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto
    .createHmac('sha1', signingKey)
    .update(payload, 'utf8')
    .digest('hex');
  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

// ─── POST / ───────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
  // Respond 200 immediately — Dotloop requires a response within 5 seconds.
  // All processing is async after the response is sent.
  res.json({ received: true });

  const timestamp = req.headers['x-dotloop-timestamp'] as string | undefined;
  const signature = req.headers['x-dotloop-signature'] as string | undefined;
  const rawBody = JSON.stringify(req.body);

  // ── Timestamp replay protection ──
  if (!timestamp) {
    console.warn('[webhook] Missing X-DOTLOOP-TIMESTAMP header');
    return;
  }

  const tsMs = Number(timestamp) * 1000;
  if (isNaN(tsMs) || Math.abs(Date.now() - tsMs) > MAX_TIMESTAMP_SKEW_MS) {
    console.warn('[webhook] Timestamp out of acceptable range — possible replay attack');
    return;
  }

  // ── Find matching subscription by tenant ──
  const db = getSupabaseAdmin();
  const { data: subscriptions } = await db
    .from('webhook_subscriptions')
    .select('tenant_id, signing_key');

  if (!subscriptions || subscriptions.length === 0) {
    console.warn('[webhook] No webhook subscriptions found');
    return;
  }

  // Find the subscription whose signing key produces a valid signature
  let tenantId: string | null = null;
  for (const sub of subscriptions) {
    if (sub.signing_key && signature && verifySignature(sub.signing_key, timestamp, rawBody, signature)) {
      tenantId = sub.tenant_id;
      break;
    }
  }

  if (!tenantId) {
    console.warn('[webhook] No matching signing key found — ignoring event');
    return;
  }

  // ── Parse event ──
  const event = req.body as {
    event?: string;
    data?: { loopId?: string; profileId?: string };
  };

  const eventType = event?.event ?? '';
  const loopId    = event?.data?.loopId;
  const profileId = event?.data?.profileId;

  // Log to audit_log
  db.from('audit_log').insert({
    tenant_id: tenantId,
    action: `webhook_${eventType.toLowerCase()}`,
    resource_type: 'loop',
    resource_id: loopId ?? null,
    details: { event: eventType },
    created_at: new Date().toISOString(),
  }).then(({ error }) => {
    if (error) console.error('[webhook] audit log insert failed:', error.message);
  });

  // ── Handle loop events ──
  if (
    (eventType === 'LOOP_CREATED' || eventType === 'LOOP_UPDATED') &&
    loopId &&
    profileId
  ) {
    try {
      const accessToken = await getValidToken(tenantId);
      const client = new DotloopAPIClient(accessToken);
      const detail = await client.getLoopDetail(profileId, loopId);
      const row = transformLoop(detail, tenantId);

      await db
        .from('loops')
        .upsert(row, { onConflict: 'tenant_id,dotloop_loop_id', ignoreDuplicates: false });

      console.log(`[webhook] Upserted loop ${loopId} for tenant ${tenantId} (${eventType})`);
    } catch (err) {
      console.error(`[webhook] Failed to process ${eventType} for loop ${loopId}:`, err);
    }
  }
});

export default router;
