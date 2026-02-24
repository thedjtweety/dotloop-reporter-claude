/**
 * Commission Recalculation Router
 * Handles real-time commission recalculation when agents are assigned or plans change
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { transactions, agentAssignments, commissionPlans } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { calculateTransactionCommission, getCycleStartDate, getCycleEndDate } from '../lib/commission-calculator';
import type { CommissionPlan, Team } from '../lib/commission-calculator';

export const commissionRecalculationRouter = router({
  /**
   * Recalculate commissions for all transactions of a specific agent
   * Returns updated commission totals and transaction count
   */
  recalculateForAgent: publicProcedure
    .input(z.object({
      agentName: z.string().min(1, 'Agent name is required'),
      tenantId: z.number().optional(),
    }))
    .mutation(async (opts: any) => {
      const { input } = opts;
      try {
        const db = getDb();
        const tenantId = input.tenantId || 1; // Default to tenant 1 for now

        console.log(`[commissionRecalculation.recalculateForAgent] Starting recalculation for agent: ${input.agentName}`);

        // Step 1: Get agent's commission plan assignment
        const trimmedAgentName = input.agentName.trim();
        // Use case-insensitive search with LIKE (MySQL is case-insensitive by default)
        const allAssignments = await db
          .select()
          .from(agentAssignments)
          .where(eq(agentAssignments.tenantId, tenantId));
        
        const assignment = allAssignments.find(a => 
          a.agentName.toLowerCase() === trimmedAgentName.toLowerCase()
        );

        if (!assignment) {
          return {
            success: false,
            error: `Agent "${input.agentName}" does not have a commission plan assigned`,
            transactionCount: 0,
            totalCommission: 0,
          };
        }

        // Step 2: Get the commission plan
        const [plan] = await db
          .select()
          .from(commissionPlans)
          .where(eq(commissionPlans.id, assignment.planId))
          .limit(1);

        if (!plan) {
          return {
            success: false,
            error: `Commission plan not found for assignment`,
            transactionCount: 0,
            totalCommission: 0,
          };
        }

        // Step 3: Get all transactions for this agent
        const agentTransactions = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              // Search for agent name in the agents field (comma-separated)
              // Using LIKE for partial matching
            )
          );

        // Filter transactions where this agent is listed
        const relevantTransactions = agentTransactions.filter(t => {
          if (!t.agents) return false;
          const agentsList = t.agents.split(',').map(a => a.trim());
          return agentsList.some(a => a.toLowerCase() === trimmedAgentName.toLowerCase());
        });

        // Step 4: Recalculate commissions for each transaction
        let totalCommission = 0;
        let ytdCompanyDollar = 0;
        const commissionBreakdowns: any[] = [];

        // Sort transactions by closing date to calculate YTD correctly
        const sortedTransactions = relevantTransactions.sort((a, b) => {
          const dateA = new Date(a.closingDate || a.createdDate || '').getTime();
          const dateB = new Date(b.closingDate || b.createdDate || '').getTime();
          return dateA - dateB;
        });

        for (const transaction of sortedTransactions) {
          try {
            const breakdown = calculateTransactionCommission(
              {
                id: transaction.id.toString(),
                loopName: transaction.loopName || 'Unknown',
                closingDate: transaction.closingDate || transaction.createdDate || new Date().toISOString(),
                agents: transaction.agents || input.agentName,
                salePrice: transaction.salePrice || transaction.price || 0,
                commissionRate: transaction.commissionRate || 0,
              },
              trimmedAgentName,
              {
                id: plan.id,
                name: plan.name,
                splitPercentage: plan.splitPercentage,
                capAmount: plan.capAmount || 0,
                postCapSplit: plan.postCapSplit || 100,
                royaltyPercentage: plan.royaltyPercentage || undefined,
                royaltyCap: plan.royaltyCap || undefined,
                useSliding: Boolean(plan.useSliding),
                tiers: plan.tiers ? JSON.parse(plan.tiers) : undefined,
                deductions: plan.deductions ? JSON.parse(plan.deductions) : undefined,
              } as CommissionPlan,
              undefined, // No team for now
              ytdCompanyDollar
            );

            totalCommission += breakdown.agentNetCommission;
            ytdCompanyDollar = breakdown.ytdAfterTransaction;
            commissionBreakdowns.push(breakdown);
          } catch (error) {
            console.error(`[commissionRecalculation] Error calculating commission for transaction ${transaction.id}:`, error);
          }
        }

        console.log(`[commissionRecalculation.recalculateForAgent] Completed: ${relevantTransactions.length} transactions, total commission: $${totalCommission}`);

        return {
          success: true,
          agentName: input.agentName,
          transactionCount: relevantTransactions.length,
          totalCommission: Math.round(totalCommission),
          ytdCompanyDollar: Math.round(ytdCompanyDollar),
          commissionBreakdowns,
          message: `Recalculated ${relevantTransactions.length} transactions for ${input.agentName}`,
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
   * Recalculate commissions for all agents when a plan is updated
   */
  recalculateForPlan: publicProcedure
    .input(z.object({
      planId: z.string(),
      tenantId: z.number().optional(),
    }))
    .mutation(async (opts: any) => {
      const { input } = opts;
      try {
        const db = getDb();
        const tenantId = input.tenantId || 1;

        console.log(`[commissionRecalculation.recalculateForPlan] Starting recalculation for plan: ${input.planId}`);

        // Get all agents assigned to this plan
        const agentsWithPlan = await db
          .select()
          .from(agentAssignments)
          .where(
            and(
              eq(agentAssignments.tenantId, tenantId),
              eq(agentAssignments.planId, input.planId)
            )
          );

        let totalAgents = 0;
        let totalTransactions = 0;
        let totalCommission = 0;

        // Recalculate for each agent
        for (const assignment of agentsWithPlan) {
          const result = await opts.ctx.trpc.commissionRecalculation.recalculateForAgent.mutate({
            agentName: assignment.agentName,
            tenantId,
          });

          if (result.success) {
            totalAgents++;
            totalTransactions += result.transactionCount;
            totalCommission += result.totalCommission;
          }
        }

        console.log(`[commissionRecalculation.recalculateForPlan] Completed: ${totalAgents} agents, ${totalTransactions} transactions`);

        return {
          success: true,
          planId: input.planId,
          agentCount: totalAgents,
          transactionCount: totalTransactions,
          totalCommission: Math.round(totalCommission),
          message: `Recalculated ${totalTransactions} transactions for ${totalAgents} agents`,
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
   * Get calculated commission summary for an agent
   * Returns total commission, transaction count, and status
   */
  getAgentCommissionSummary: publicProcedure
    .input(z.object({
      agentName: z.string().min(1, 'Agent name is required'),
      tenantId: z.number().optional(),
    }))
    .query(async (opts: any) => {
      const { input } = opts;
      try {
        const db = getDb();
        const tenantId = input.tenantId || 1;

        const trimmedAgentName = input.agentName.trim();

        // Get agent's assignment
        const allAssignments = await db
          .select()
          .from(agentAssignments)
          .where(eq(agentAssignments.tenantId, tenantId));
        
        const assignment = allAssignments.find(a => 
          a.agentName.toLowerCase() === trimmedAgentName.toLowerCase()
        );

        if (!assignment) {
          return {
            hasAssignment: false,
            totalCommission: 0,
            transactionCount: 0,
            planName: null,
            status: 'no_plan_assigned',
          };
        }

        // Get the plan
        const [plan] = await db
          .select()
          .from(commissionPlans)
          .where(eq(commissionPlans.id, assignment.planId))
          .limit(1);

        // Get transactions for this agent
        const agentTransactions = await db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, tenantId));

        const relevantTransactions = agentTransactions.filter(t => {
          if (!t.agents) return false;
          const agentsList = t.agents.split(',').map(a => a.trim());
          return agentsList.some(a => a.toLowerCase() === trimmedAgentName.toLowerCase());
        });

        // Calculate total commission
        let totalCommission = 0;
        let ytdCompanyDollar = 0;

        const sortedTransactions = relevantTransactions.sort((a, b) => {
          const dateA = new Date(a.closingDate || a.createdDate || '').getTime();
          const dateB = new Date(b.closingDate || b.createdDate || '').getTime();
          return dateA - dateB;
        });

        for (const transaction of sortedTransactions) {
          try {
            const breakdown = calculateTransactionCommission(
              {
                id: transaction.id.toString(),
                loopName: transaction.loopName || 'Unknown',
                closingDate: transaction.closingDate || transaction.createdDate || new Date().toISOString(),
                agents: transaction.agents || input.agentName,
                salePrice: transaction.salePrice || transaction.price || 0,
                commissionRate: transaction.commissionRate || 0,
              },
              trimmedAgentName,
              {
                id: plan!.id,
                name: plan!.name,
                splitPercentage: plan!.splitPercentage,
                capAmount: plan!.capAmount || 0,
                postCapSplit: plan!.postCapSplit || 100,
                royaltyPercentage: plan!.royaltyPercentage || undefined,
                royaltyCap: plan!.royaltyCap || undefined,
                useSliding: Boolean(plan!.useSliding),
                tiers: plan!.tiers ? JSON.parse(plan!.tiers) : undefined,
                deductions: plan!.deductions ? JSON.parse(plan!.deductions) : undefined,
              } as CommissionPlan,
              undefined,
              ytdCompanyDollar
            );

            totalCommission += breakdown.agentNetCommission;
            ytdCompanyDollar = breakdown.ytdAfterTransaction;
          } catch (error) {
            console.error(`Error calculating commission for transaction:`, error);
          }
        }

        return {
          hasAssignment: true,
          totalCommission: Math.round(totalCommission),
          transactionCount: relevantTransactions.length,
          planName: plan?.name || 'Unknown',
          status: 'calculated',
          ytdCompanyDollar: Math.round(ytdCompanyDollar),
        };
      } catch (error) {
        console.error('[commissionRecalculation.getAgentCommissionSummary]', error);
        return {
          hasAssignment: false,
          totalCommission: 0,
          transactionCount: 0,
          planName: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});
