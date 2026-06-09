/**
 * Loops Route
 *
 * GET /api/loops — Returns all loops for the authenticated tenant,
 *                  shaped as DotloopRecord-compatible objects so the
 *                  frontend TransactionDataContext can load them directly.
 *
 * Authentication: Supabase access token in Authorization: Bearer header.
 */

import { Router, Request, Response } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';

const router = Router();

// ─── GET /api/loops ───────────────────────────────────────────────────────────

router.get('/', async (req: Request, res: Response) => {
  try {
    // Get access token from Authorization header
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const db = getSupabaseAdmin();

    // Verify the Supabase JWT
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Get the tenant ID for this user
    const { data: userRow } = await db
      .from('users')
      .select('tenant_id')
      .eq('supabase_uid', user.id)
      .maybeSingle();

    if (!userRow?.tenant_id) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }

    const tenantId = userRow.tenant_id as string;

    // Fetch all loops for this tenant
    const { data: loops, error: loopsError } = await db
      .from('loops')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    if (loopsError) {
      console.error('[loops] query error:', loopsError.message);
      res.status(500).json({ error: 'Failed to fetch loops' });
      return;
    }

    // Transform to DotloopRecord-compatible shape
    const records = (loops ?? []).map(loop => ({
      loopId:           loop.dotloop_loop_id ?? '',
      loopName:         loop.loop_name ?? '',
      loopStatus:       loop.loop_status ?? '',
      address:          loop.address ?? '',
      city:             loop.city ?? '',
      state:            loop.state ?? '',
      propertyType:     loop.property_type ?? '',
      agents:           [loop.listing_agent, loop.buying_agent].filter(Boolean).join(', '),
      price:            Number(loop.listing_price ?? 0),
      salePrice:        Number(loop.sale_price ?? 0),
      commissionRate:   Number(loop.commission_rate ?? 0),
      commissionTotal:  Number(loop.total_commission ?? 0),
      companyDollar:    0,
      buySideCommission:  0,
      sellSideCommission: 0,
      closingDate:      loop.closing_date ?? '',
      listingDate:      loop.listing_date ?? '',
      createdDate:      loop.created_at_dotloop ?? loop.updated_at ?? '',
      offerDate:        '',
      leadSource:       '',
      referralSource:   '',
      referralPercentage: 0,
      earnestMoney:     0,
      complianceStatus: '',
      tags:             [],
    }));

    res.json({ records, tenantId });
  } catch (err) {
    console.error('[loops] error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
