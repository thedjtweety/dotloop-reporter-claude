import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { recruitingProspects, recruitingPipelineActivity, recruitingRetentionRisk, recruitingImportHistory } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Helper to get db instance
const getDbInstance = async () => {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db;
};

export const recruitingRouter = router({
  // ============================================
  // PROSPECTS MANAGEMENT
  // ============================================

  /**
   * Import prospects from Market View Broker CSV
   */
  importProspects: protectedProcedure
    .input(
      z.object({
        prospects: z.array(
          z.object({
            firstName: z.string(),
            lastName: z.string(),
            email: z.string().email(),
            primaryPhone: z.string().optional(),
            mobilePhone: z.string().optional(),
            office: z.string().optional(),
            agentAddress: z.string().optional(),
            officeLocation: z.string().optional(),
            mlsId: z.string().optional(),
            listSideUnits: z.number().optional(),
            listSideVolume: z.number().optional(),
            salesSideUnits: z.number().optional(),
            salesSideVolume: z.number().optional(),
            totalUnits: z.number().optional(),
            totalVolume: z.number().optional(),
          })
        ),
        fileName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const importId = uuidv4();
      let recordsImported = 0;
      let recordsSkipped = 0;

      try {
        const db = await getDbInstance();
        // Import prospects
        for (const prospect of input.prospects) {
          try {
            const prospectId = uuidv4();
            await db.insert(recruitingProspects).values({
              id: prospectId,
              tenantId,
              firstName: prospect.firstName,
              lastName: prospect.lastName,
              email: prospect.email,
              primaryPhone: prospect.primaryPhone || null,
              mobilePhone: prospect.mobilePhone || null,
              office: prospect.office || null,
              agentAddress: prospect.agentAddress || null,
              officeLocation: prospect.officeLocation || null,
              mlsId: prospect.mlsId || null,
              listSideUnits: prospect.listSideUnits ? String(prospect.listSideUnits) : null,
              listSideVolume: prospect.listSideVolume ? String(prospect.listSideVolume) : null,
              salesSideUnits: prospect.salesSideUnits ? String(prospect.salesSideUnits) : null,
              salesSideVolume: prospect.salesSideVolume ? String(prospect.salesSideVolume) : null,
              totalUnits: prospect.totalUnits ? String(prospect.totalUnits) : null,
              totalVolume: prospect.totalVolume ? String(prospect.totalVolume) : null,
              pipelineStatus: 'lead',
              sourceType: 'market_view_broker',
            });
            recordsImported++;
          } catch (error) {
            recordsSkipped++;
          }
        }

        // Log import history
        const db2 = await getDbInstance();
        await db2.insert(recruitingImportHistory).values({
          id: importId,
          tenantId,
          fileName: input.fileName,
          importType: 'market_view_broker',
          recordsImported,
          recordsSkipped,
          importedBy: ctx.user?.id || 0,
          status: recordsSkipped === 0 ? 'success' : 'partial',
        });

        return {
          success: true,
          importId,
          recordsImported,
          recordsSkipped,
        };
      } catch (error) {
        throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  /**
   * Get all prospects for the tenant
   */
  getProspects: protectedProcedure
    .input(
      z.object({
        status: z.enum(['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding', 'hired', 'declined']).optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const db = await getDbInstance();
      let whereConditions = and(eq(recruitingProspects.tenantId, tenantId), eq(recruitingProspects.isActive, 1));
      
      if (input.status) {
        whereConditions = and(whereConditions, eq(recruitingProspects.pipelineStatus, input.status));
      }

      const prospects = await db
        .select()
        .from(recruitingProspects)
        .where(whereConditions);

      if (input.search) {
        const searchLower = input.search.toLowerCase();
        return prospects.filter(
          (p: any) =>
            p.firstName?.toLowerCase().includes(searchLower) ||
            p.lastName?.toLowerCase().includes(searchLower) ||
            p.email?.toLowerCase().includes(searchLower) ||
            p.office?.toLowerCase().includes(searchLower)
        );
      }

      return prospects;
    }),

  /**
   * Update prospect pipeline status
   */
  updateProspectStatus: protectedProcedure
    .input(
      z.object({
        prospectId: z.string(),
        newStatus: z.enum(['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding', 'hired', 'declined']),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const db = await getDbInstance();
      // Get current prospect
      const prospect = await db
        .select()
        .from(recruitingProspects)
        .where(and(eq(recruitingProspects.id, input.prospectId), eq(recruitingProspects.tenantId, tenantId)))
        .limit(1);

      if (!prospect.length) throw new Error('Prospect not found');

      const previousStatus = prospect[0].pipelineStatus;

      // Update prospect status
      await db
        .update(recruitingProspects)
        .set({
          pipelineStatus: input.newStatus,
          notes: input.notes || prospect[0].notes,
        })
        .where(eq(recruitingProspects.id, input.prospectId));

      // Log activity
      await db.insert(recruitingPipelineActivity).values({
        id: uuidv4(),
        tenantId,
        prospectId: input.prospectId,
        activityType: 'status_change',
        previousStatus: previousStatus as any,
        newStatus: input.newStatus,
        details: input.notes || null,
        createdBy: ctx.user?.id || 0,
      });

      return { success: true };
    }),

  /**
   * Get pipeline statistics
   */
  getPipelineStats: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user?.tenantId;
    if (!tenantId) throw new Error('No tenant context');

    const db = await getDbInstance();
    const prospects = await db
      .select()
      .from(recruitingProspects)
      .where(and(eq(recruitingProspects.tenantId, tenantId), eq(recruitingProspects.isActive, 1)));

    const stats = {
      inPipeline: prospects.filter((p: any) => p.pipelineStatus === 'lead' || p.pipelineStatus === 'contacted').length,
      offersPending: prospects.filter((p: any) => p.pipelineStatus === 'offer_extended').length,
      recentHires: prospects.filter((p: any) => p.pipelineStatus === 'hired').length,
      mvbProspects: prospects.length,
    };

    return stats;
  }),

  /**
   * Get conversion funnel data
   */
  getConversionFunnel: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user?.tenantId;
    if (!tenantId) throw new Error('No tenant context');

    const db = await getDbInstance();
    const prospects = await db
      .select()
      .from(recruitingProspects)
      .where(and(eq(recruitingProspects.tenantId, tenantId), eq(recruitingProspects.isActive, 1)));

    const funnel = {
      lead: prospects.filter((p: any) => p.pipelineStatus === 'lead').length,
      contacted: prospects.filter((p: any) => p.pipelineStatus === 'contacted').length,
      interviewing: prospects.filter((p: any) => p.pipelineStatus === 'interviewing').length,
      offerExtended: prospects.filter((p: any) => p.pipelineStatus === 'offer_extended').length,
      onboarding: prospects.filter((p: any) => p.pipelineStatus === 'onboarding').length,
    };

    return funnel;
  }),

  // ============================================
  // RETENTION RISK MANAGEMENT
  // ============================================

  /**
   * Get retention risk data
   */
  getRetentionRisk: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user?.tenantId;
    if (!tenantId) throw new Error('No tenant context');

    const db = await getDbInstance();
    const riskData = await db
      .select()
      .from(recruitingRetentionRisk)
      .where(eq(recruitingRetentionRisk.tenantId, tenantId))
      .orderBy(desc(recruitingRetentionRisk.dealChangePercent));

    return riskData;
  }),

  /**
   * Calculate retention risk for agents
   */
  calculateRetentionRisk: protectedProcedure
    .input(
      z.object({
        agents: z.array(
          z.object({
            agentName: z.string(),
            priorDeals: z.number(),
            priorVolume: z.number(),
            recentDeals: z.number(),
            recentVolume: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const db = await getDbInstance();
      for (const agent of input.agents) {
        const dealChange = agent.priorDeals > 0 ? ((agent.recentDeals - agent.priorDeals) / agent.priorDeals) * 100 : 0;
        const volumeChange = agent.priorVolume > 0 ? ((agent.recentVolume - agent.priorVolume) / agent.priorVolume) * 100 : 0;

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (dealChange < -50 || volumeChange < -50) {
          riskLevel = 'high';
        } else if (dealChange < -25 || volumeChange < -25) {
          riskLevel = 'medium';
        }

        // Upsert retention risk record
        const existing = await db
          .select()
          .from(recruitingRetentionRisk)
          .where(and(eq(recruitingRetentionRisk.tenantId, tenantId), eq(recruitingRetentionRisk.agentName, agent.agentName)))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(recruitingRetentionRisk)
            .set({
              priorDeals: agent.priorDeals,
              priorVolume: String(agent.priorVolume),
              recentDeals: agent.recentDeals,
              recentVolume: String(agent.recentVolume),
              dealChangePercent: String(dealChange),
              volumeChangePercent: String(volumeChange),
              riskLevel,
            })
            .where(eq(recruitingRetentionRisk.id, existing[0].id));
        } else {
          const db2 = await getDbInstance();
          await db2.insert(recruitingRetentionRisk).values({
            id: uuidv4(),
            tenantId,
            agentName: agent.agentName,
            priorDeals: agent.priorDeals,
            priorVolume: String(agent.priorVolume),
            recentDeals: agent.recentDeals,
            recentVolume: String(agent.recentVolume),
            dealChangePercent: String(dealChange),
            volumeChangePercent: String(volumeChange),
            riskLevel,
          });
        }
      }

      return { success: true };
    }),

  // ============================================
  // PROSPECT ACTIVITY & NOTES
  // ============================================

  /**
   * Add activity/note to a prospect
   */
  addProspectActivity: protectedProcedure
    .input(
      z.object({
        prospectId: z.string(),
        activityType: z.enum(['note', 'call', 'email', 'meeting', 'offer', 'status_change']),
        title: z.string(),
        description: z.string().optional(),
        contactDate: z.string().optional(),
        duration: z.number().optional(),
        offerAmount: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      const userId = ctx.user?.id;
      if (!tenantId || !userId) throw new Error('No tenant or user context');

      const db = await getDbInstance();
      
      // Import prospectActivity from schema
      const { prospectActivity } = await import('../../drizzle/schema');
      
      const id = uuidv4();
      await db.insert(prospectActivity).values({
        id,
        tenantId,
        prospectId: input.prospectId,
        activityType: input.activityType,
        title: input.title,
        description: input.description,
        contactDate: input.contactDate ? new Date(input.contactDate).toISOString() : undefined,
        duration: input.duration,
        offerAmount: input.offerAmount,
        createdBy: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { id, success: true };
    }),

  /**
   * Get activities for a prospect
   */
  getProspectActivities: protectedProcedure
    .input(z.object({ prospectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const db = await getDbInstance();
      const { prospectActivity } = await import('../../drizzle/schema');
      
      const activities = await db
        .select()
        .from(prospectActivity)
        .where(and(
          eq(prospectActivity.tenantId, tenantId),
          eq(prospectActivity.prospectId, input.prospectId)
        ))
        .orderBy(desc(prospectActivity.createdAt));

      return activities;
    }),

  // ============================================
  // RETENTION ALERTS
  // ============================================

  /**
   * Create or update retention alert
   */
  createRetentionAlert: protectedProcedure
    .input(
      z.object({
        agentName: z.string(),
        riskLevel: z.enum(['low', 'medium', 'high']),
        dealChangePercent: z.number(),
        volumeChangePercent: z.number(),
        retentionAction: z.string().optional(),
        emailRecipients: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const db = await getDbInstance();
      const { retentionAlerts } = await import('../../drizzle/schema');
      
      const id = uuidv4();
      await db.insert(retentionAlerts).values({
        id,
        tenantId,
        agentName: input.agentName,
        riskLevel: input.riskLevel,
        dealChangePercent: String(input.dealChangePercent),
        volumeChangePercent: String(input.volumeChangePercent),
        alertStatus: 'active',
        retentionAction: input.retentionAction,
        emailRecipients: input.emailRecipients ? JSON.stringify(input.emailRecipients) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { id, success: true };
    }),

  /**
   * Get retention alerts
   */
  getRetentionAlerts: protectedProcedure
    .input(
      z.object({
        status: z.enum(['active', 'acknowledged', 'resolved', 'dismissed']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      if (!tenantId) throw new Error('No tenant context');

      const db = await getDbInstance();
      const { retentionAlerts } = await import('../../drizzle/schema');
      
      const alerts = await db
        .select()
        .from(retentionAlerts)
        .where(
          input.status
            ? and(
                eq(retentionAlerts.tenantId, tenantId),
                eq(retentionAlerts.alertStatus, input.status)
              )
            : eq(retentionAlerts.tenantId, tenantId)
        )
        .orderBy(desc(retentionAlerts.createdAt));
      return alerts;
    }),

  /**
   * Acknowledge retention alert
   */
  acknowledgeRetentionAlert: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user?.tenantId;
      const userId = ctx.user?.id;
      if (!tenantId || !userId) throw new Error('No tenant or user context');

      const db = await getDbInstance();
      const { retentionAlerts } = await import('../../drizzle/schema');
      
      await db
        .update(retentionAlerts)
        .set({
          alertStatus: 'acknowledged',
          acknowledgedBy: userId,
          acknowledgedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(retentionAlerts.id, input.alertId));

      return { success: true };
    }),
});
