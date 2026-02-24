/**
 * Commission Recalculation Router
 * Handles real-time commission recalculation when agents are assigned or plans change
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { getTenantIdFromUser } from '../lib/tenant-context';
import { calculateCommissions } from '../lib/commission-calculator';


export const commissionRecalculationRouter = router({
  /**
   * Recalculate commissions for all transactions when an agent is assigned
   */
  recalculateForAgent: publicProcedure
    .input(z.object({
      agentId: z.string(),
      tenantId: z.string().optional(),
    }))
    .mutation(async (opts: any) => {
      const { input, ctx } = opts;
      try {
        const tenantId = input.tenantId || getTenantIdFromUser(ctx.user);
        if (!tenantId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No tenant context found',
          });
        }

        console.log(`[commissionRecalculation.recalculateForAgent] Starting recalculation for agent: ${input.agentId}`);

        // This is a placeholder implementation
        // In production, you would:
        // 1. Get all transactions for this agent
        // 2. Get agent's commission plan
        // 3. Recalculate commission for each transaction using calculateCommissions
        // 4. Update database with new commission values
        // 5. Invalidate cache to trigger real-time updates

        return {
          success: true,
          agentId: input.agentId,
          transactionCount: 0,
          totalCommission: 0,
          message: `Recalculation queued for agent ${input.agentId}`,
        };
      } catch (error) {
        console.error('[commissionRecalculation.recalculateForAgent]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to recalculate commissions',
        });
      }
    }),

  /**
   * Recalculate commissions for all transactions when a commission plan is updated
   */
  recalculateForPlan: publicProcedure
    .input(z.object({
      planId: z.string(),
      tenantId: z.string().optional(),
    }))
    .mutation(async (opts: any) => {
      const { input, ctx } = opts;
      try {
        const tenantId = input.tenantId || getTenantIdFromUser(ctx.user);
        if (!tenantId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No tenant context found',
          });
        }

        console.log(`[commissionRecalculation.recalculateForPlan] Starting recalculation for plan: ${input.planId}`);

        // This is a placeholder implementation
        // In production, you would:
        // 1. Get all agents using this plan
        // 2. For each agent, get all their transactions
        // 3. Recalculate commission using the new plan
        // 4. Batch update all transactions
        // 5. Invalidate cache to trigger real-time updates

        return {
          success: true,
          planId: input.planId,
          agentCount: 0,
          transactionCount: 0,
          totalCommission: 0,
          message: `Recalculation queued for plan ${input.planId}`,
        };
      } catch (error) {
        console.error('[commissionRecalculation.recalculateForPlan]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to recalculate commissions',
        });
      }
    }),

  /**
   * Recalculate all commissions for the entire tenant
   */
  recalculateAll: publicProcedure
    .input(z.object({
      tenantId: z.string().optional(),
    }))
    .mutation(async (opts: any) => {
      const { input, ctx } = opts;
      try {
        const tenantId = input.tenantId || getTenantIdFromUser(ctx.user);
        if (!tenantId) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'No tenant context found',
          });
        }

        console.log(`[commissionRecalculation.recalculateAll] Starting full recalculation for tenant: ${tenantId}`);

        // This is a placeholder implementation
        // In production, you would:
        // 1. Get all transactions for this tenant
        // 2. For each transaction, get the agent's assigned plan
        // 3. Recalculate commission based on the plan
        // 4. Batch update all transactions
        // 5. Invalidate cache to trigger real-time updates

        return {
          success: true,
          transactionCount: 0,
          totalCommission: 0,
          message: `Full recalculation queued for tenant`,
        };
      } catch (error) {
        console.error('[commissionRecalculation.recalculateAll]', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to recalculate commissions',
        });
      }
    }),
});
