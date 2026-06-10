/**
 * Dotloop Sync Engine
 *
 * Pulls all loops for a tenant from Dotloop API and upserts them into the
 * Supabase `loops` table.  Creates a sync_job record for observability.
 */

import { getSupabaseAdmin } from './supabase';
import { getValidToken } from './dotloop-token-service';
import { DotloopAPIClient, DotloopLoop, DotloopParticipant } from './dotloop-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SyncResult {
  jobId: string;
  status: 'success' | 'error';
  loopsFetched: number;
  loopsCreated: number;
  loopsUpdated: number;
  startedAt: Date;
  completedAt: Date;
  error?: string;
}

interface LoopInsert {
  tenant_id: string;
  dotloop_loop_id: string;
  loop_name: string;
  loop_status: string;
  listing_agent: string | null;
  buying_agent: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  listing_price: number | null;
  sale_price: number | null;
  commission_rate: number | null;
  total_commission: number | null;
  closing_date: string | null;
  listing_date: string | null;
  created_at_dotloop: string | null;
  view_url: string | null;
  raw_data: Record<string, unknown>;
  updated_at: string;
}

// ─── Transform ────────────────────────────────────────────────────────────────

export function transformLoop(
  loop: DotloopLoop & { participants?: DotloopParticipant[] },
  tenantId: string
): LoopInsert {
  const participants = loop.participants ?? [];
  const listingAgent = participants.find(p => p.role === 'LISTING_AGENT')?.name ?? null;
  const buyingAgent  = participants.find(p => p.role === 'BUYING_AGENT')?.name  ?? null;

  const parseNum = (v: unknown): number | null => {
    const n = Number(v);
    return isNaN(n) || v === '' || v == null ? null : n;
  };

  const parseDate = (v: unknown): string | null => {
    if (!v) return null;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  return {
    tenant_id:           tenantId,
    dotloop_loop_id:     loop.loopId,
    loop_name:           loop.name ?? '',
    loop_status:         loop.status ?? '',
    listing_agent:       listingAgent,
    buying_agent:        buyingAgent,
    address:             loop.address?.displayName ?? null,
    city:                loop.address?.city ?? null,
    state:               loop.address?.state ?? null,
    property_type:       loop.propertyType ?? null,
    bedrooms:            parseNum(loop.bedrooms),
    bathrooms:           parseNum(loop.bathrooms),
    square_footage:      parseNum(loop.squareFootage),
    listing_price:       parseNum(loop.listingPrice),
    sale_price:          parseNum(loop.salePrice),
    commission_rate:     parseNum(loop.commissionRate),
    total_commission:    parseNum(loop.totalCommission),
    closing_date:        parseDate(loop.closingDate),
    listing_date:        parseDate(loop.listingDate),
    created_at_dotloop:  parseDate(loop.created),
    view_url:            loop.viewUrl ?? null,
    raw_data:            loop as unknown as Record<string, unknown>,
    updated_at:          new Date().toISOString(),
  };
}

// ─── Main sync function ───────────────────────────────────────────────────────

export async function syncTenant(
  tenantId: string,
  triggeredBy?: string,
  triggerType: 'manual' | 'scheduled' | 'webhook' = 'manual'
): Promise<SyncResult> {
  const db = getSupabaseAdmin();
  const startedAt = new Date();

  // 1. Create sync job record
  const { data: job, error: jobError } = await db
    .from('sync_jobs')
    .insert({
      tenant_id: tenantId,
      triggered_by: triggeredBy ?? null,
      trigger_type: triggerType,
      status: 'running',
      started_at: startedAt.toISOString(),
    })
    .select('id')
    .single();

  if (jobError || !job) {
    throw new Error(`Failed to create sync_job: ${jobError?.message}`);
  }

  const jobId: string = job.id;

  try {
    // 2. Get valid token
    const accessToken = await getValidToken(tenantId);

    // 3. Get connection record for profile_id
    const { data: conn } = await db
      .from('dotloop_connections')
      .select('dotloop_profile_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const profileId = conn?.dotloop_profile_id;
    console.log('[sync] dotloop_profile_id from DB:', profileId);
    if (!profileId || profileId === 'null' || profileId === 'undefined') {
      throw new Error(
        'No Dotloop profile configured — please reconnect your Dotloop account in Settings. ' +
        `(tenant: ${tenantId}, stored profile_id: ${String(profileId)})`
      );
    }

    // 4. Create client and fetch all loops
    const client = new DotloopAPIClient(accessToken);
    const loops = await client.getAllLoops(profileId);

    // 5. Transform each loop
    const rows: LoopInsert[] = loops.map(l => transformLoop(l, tenantId));

    // 6. Upsert in batches of 200
    let loopsCreated = 0;
    let loopsUpdated = 0;
    const BATCH = 200;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error: upsertError } = await db
        .from('loops')
        .upsert(batch, { onConflict: 'tenant_id,dotloop_loop_id', ignoreDuplicates: false });

      if (upsertError) {
        throw new Error(`Upsert error on batch ${i / BATCH + 1}: ${upsertError.message}`);
      }

      // Supabase doesn't return insert/update counts natively — approximate
      loopsUpdated += batch.length;
    }

    const completedAt = new Date();

    // 7. Update sync job — success
    await db
      .from('sync_jobs')
      .update({
        status: 'success',
        loops_fetched: loops.length,
        loops_created: loopsCreated,
        loops_updated: loopsUpdated,
        completed_at: completedAt.toISOString(),
      })
      .eq('id', jobId);

    // 8. Update dotloop_connections
    await db
      .from('dotloop_connections')
      .update({
        last_synced_at: completedAt.toISOString(),
        sync_status: 'success',
        loops_synced: loops.length,
        updated_at: completedAt.toISOString(),
      })
      .eq('tenant_id', tenantId);

    return {
      jobId,
      status: 'success',
      loopsFetched: loops.length,
      loopsCreated,
      loopsUpdated,
      startedAt,
      completedAt,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const completedAt = new Date();

    // Always log full error to terminal — this is what shows in pnpm dev output
    console.error('[sync] FAILED for tenant:', tenantId);
    console.error('[sync] error message:', errorMsg);
    if (err instanceof Error && err.stack) {
      console.error('[sync] stack:', err.stack);
    }
    // If it's an axios error re-thrown from DotloopClient, the inner detail
    // is already logged there; print the full err object here as a safety net
    console.error('[sync] full error object:', err);

    await db
      .from('sync_jobs')
      .update({
        status: 'error',
        error_message: errorMsg,
        completed_at: completedAt.toISOString(),
      })
      .eq('id', jobId);

    return {
      jobId,
      status: 'error',
      loopsFetched: 0,
      loopsCreated: 0,
      loopsUpdated: 0,
      startedAt,
      completedAt,
      error: errorMsg,
    };
  }
}
