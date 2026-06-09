/**
 * Loops Route
 *
 * GET /api/loops — Returns all loops for the authenticated tenant,
 *                  shaped as DotloopRecord-compatible objects so the
 *                  frontend TransactionDataContext can load them directly.
 *
 * Authentication: requireAuth middleware (Supabase Bearer token).
 */

import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── GET /api/loops ───────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req: Request, res: Response) => {
  console.log('[loops] fetching for tenant:', req.tenantId);
  try {
    const db = getSupabaseAdmin();

    // requireAuth already verified token and attached req.tenantId
    const { data: loops, error: loopsError } = await db
      .from('loops')
      .select('*')
      .eq('tenant_id', req.tenantId!)
      .order('updated_at', { ascending: false });

    if (loopsError) {
      // 42P01 = table does not exist — loops haven't been synced yet, return empty
      const code = (loopsError as { code?: string }).code;
      console.error('[loops] query error:', loopsError.message,
        '| code:', code, '| details:', loopsError.details, '| hint:', loopsError.hint);
      if (code === '42P01' || loopsError.message?.includes('does not exist')) {
        console.log('[loops] loops table not found — returning empty (run a sync first)');
        res.json({ records: [], tenantId: req.tenantId });
        return;
      }
      res.status(500).json({ error: `Failed to fetch loops: ${loopsError.message}` });
      return;
    }
    console.log('[loops] found', loops?.length ?? 0, 'loops for tenant', req.tenantId);

    // Transform to DotloopRecord-compatible shape
    const records = (loops ?? []).map(loop => ({
      loopId:             loop.dotloop_loop_id ?? '',
      loopName:           loop.loop_name ?? '',
      loopStatus:         loop.loop_status ?? '',
      address:            loop.address ?? '',
      city:               loop.city ?? '',
      state:              loop.state ?? '',
      propertyType:       loop.property_type ?? '',
      agents:             [loop.listing_agent, loop.buying_agent].filter(Boolean).join(', '),
      price:              Number(loop.listing_price ?? 0),
      salePrice:          Number(loop.sale_price ?? 0),
      commissionRate:     Number(loop.commission_rate ?? 0),
      commissionTotal:    Number(loop.total_commission ?? 0),
      companyDollar:      0,
      buySideCommission:  0,
      sellSideCommission: 0,
      closingDate:        loop.closing_date ?? '',
      listingDate:        loop.listing_date ?? '',
      createdDate:        loop.created_at_dotloop ?? loop.updated_at ?? '',
      offerDate:          '',
      leadSource:         '',
      referralSource:     '',
      referralPercentage: 0,
      earnestMoney:       0,
      complianceStatus:   '',
      tags:               [] as string[],
    }));

    res.json({ records, tenantId: req.tenantId });
  } catch (err) {
    console.error('[loops] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
