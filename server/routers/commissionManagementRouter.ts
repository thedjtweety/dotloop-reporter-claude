/**
 * Commission Management Router - Phase 3: Commission Management (3.1-3.4)
 * Handles commission plans, agent assignments, calculations, and audit trails
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { commissionPlans, agentAssignments, transactions } from '../../drizzle/schema';
import { getDb } from '../db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit-logger';

export interface CommissionPlan {
  id: number;
  tenantId: number;
  name: string;
  description: string;
  type: 'flat' | 'tiered' | 'hybrid';
  basePercentage: number;
  tiers: Array<{
    minVolume: number;
    maxVolume: number;
    percentage: number;
  }>;
  bonusStructure: Array<{
    metric: string;
    threshold: number;
    bonusPercentage: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentAssignment {
  id: number;
  tenantId: number;
  agentId: number;
  agentName: string;
  planId: number;
  planName: string;
  commissionPercentage: number;
  buySidePercentage: number;
  sellSidePercentage: number;
  assignedAt: Date;
}

export interface CommissionCalculation {
  transactionId: number;
  transactionName: string;
  price: number;
  commissionRate: number;
  totalCommission: number;
  buySideCommission: number;
  sellSideCommission: number;
  companyDollar: number;
  agentCommission: number;
  bonusAmount: number;
  notes: string;
}

export const commissionManagementRouter = router({
  /**
   * Priority 3.1: Create commission plan
   */
  createPlan: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        type: z.enum(['flat', 'tiered', 'hybrid']),
        basePercentage: z.number().min(0).max(100),
        tiers: z
          .array(
            z.object({
              minVolume: z.number(),
              maxVolume: z.number(),
              percentage: z.number().min(0).max(100),
            })
          )
          .optional(),
        bonusStructure: z
          .array(
            z.object({
              metric: z.string(),
              threshold: z.number(),
              bonusPercentage: z.number().min(0).max(100),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        const result = await db.insert(commissionPlans).values({
          id: `plan_${Date.now()}`,
          tenantId,
          name: input.name,
          description: input.description || '',
          splitPercentage: Math.round(input.basePercentage * 100),
          tiers: input.tiers ? JSON.stringify(input.tiers) : '[]',
          useSliding: input.type === 'tiered' ? 1 : 0,
        } as any);

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_created',
          targetType: 'system',
          targetName: `Commission Plan: ${input.name}`,
          details: `Created new commission plan with type: ${input.type}`,
        });

        return { success: true, planId: result[0] };
      } catch (error) {
        console.error('Create plan error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create commission plan',
        });
      }
    }),

  /**
   * Priority 3.1: Get all commission plans
   */
  getPlans: protectedProcedure.query(async ({ ctx }) => {
    try {
      const tenantId = ctx.user.id as number;
      if (!tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'No tenant context',
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        });
      }

      const plans = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.tenantId, tenantId));

      return plans.map((plan) => ({
        ...plan,
        tiers: plan.tiers ? JSON.parse(plan.tiers) : [],
      }));
    } catch (error) {
      console.error('Get plans error:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch commission plans',
      });
    }
  }),

  /**
   * Priority 3.2: Assign agent to commission plan
   */
  assignAgent: protectedProcedure
    .input(
      z.object({
        agentId: z.number(),
        agentName: z.string(),
        planId: z.number(),
        commissionPercentage: z.number().min(0).max(100),
        buySidePercentage: z.number().min(0).max(100),
        sellSidePercentage: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Check if assignment already exists
        const existing = await db
          .select()
          .from(agentAssignments)
          .where(
            and(
              eq(agentAssignments.tenantId, tenantId),
              eq(agentAssignments.agentName, input.agentName)
            )
          );

        if (existing.length > 0) {
          // Update existing
          await db
            .update(agentAssignments)
            .set({
              planId: String(input.planId),
            })
            .where(eq(agentAssignments.id, existing[0].id));
        } else {
          // Create new
          await db.insert(agentAssignments).values({
            id: `assign_${Date.now()}`,
            tenantId,
            agentName: input.agentName,
            planId: String(input.planId),
          } as any);
        }

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_role_changed',
          targetType: 'user',
          targetName: input.agentName,
          details: `Assigned to commission plan ${input.planId}`,
        });

        return { success: true };
      } catch (error) {
        console.error('Assign agent error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to assign agent',
        });
      }
    }),

  /**
   * Priority 3.3: Calculate commission for transaction
   */
  calculateCommission: protectedProcedure
    .input(
      z.object({
        transactionId: z.number(),
        price: z.number(),
        agentId: z.number(),
        planId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Get plan details
        const plan = await db
          .select()
          .from(commissionPlans)
          .where(
            and(
              eq(commissionPlans.tenantId, tenantId),
              eq(commissionPlans.id, String(input.planId))
            )
          );

        if (plan.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Commission plan not found',
          });
        }

        const planData = plan[0];
        let commissionRate = (planData.splitPercentage || 0) / 100;

        // Apply tiered rates if applicable
        if (planData.useSliding) {
          const tiers = planData.tiers ? JSON.parse(planData.tiers) : [];
          for (const tier of tiers) {
            if (input.price >= tier.minVolume && input.price <= tier.maxVolume) {
              commissionRate = tier.percentage;
              break;
            }
          }
        }

        // Calculate base commission
        const totalCommission = (input.price * commissionRate) / 100;
        const buySideCommission = (totalCommission * 50) / 100;
        const sellSideCommission = (totalCommission * 50) / 100;
        const companyDollar = (totalCommission * 20) / 100;
        const agentCommission = totalCommission - companyDollar;

        // Apply royalty if applicable
        let bonusAmount = 0;
        if (planData.royaltyPercentage) {
          bonusAmount = (input.price * planData.royaltyPercentage) / 100;
          if (planData.royaltyCap && bonusAmount > planData.royaltyCap) {
            bonusAmount = planData.royaltyCap;
          }
        }

        return {
          transactionId: input.transactionId,
          price: input.price,
          commissionRate,
          totalCommission: Math.round(totalCommission * 100) / 100,
          buySideCommission: Math.round(buySideCommission * 100) / 100,
          sellSideCommission: Math.round(sellSideCommission * 100) / 100,
          companyDollar: Math.round(companyDollar * 100) / 100,
          agentCommission: Math.round(agentCommission * 100) / 100,
          bonusAmount: Math.round(bonusAmount * 100) / 100,
          totalWithBonus: Math.round((totalCommission + bonusAmount) * 100) / 100,
        };
      } catch (error) {
        console.error('Calculate commission error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to calculate commission',
        });
      }
    }),

  /**
   * Priority 3.4: Get commission audit trail
   */
  getCommissionAudit: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        agentId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Get transactions with commission data
        let whereConditions = [eq(transactions.tenantId, tenantId)];
        if (input.startDate) {
          whereConditions.push(gte(transactions.closingDate, input.startDate));
        }
        if (input.endDate) {
          whereConditions.push(lte(transactions.closingDate, input.endDate));
        }

        const txs = await db
          .select()
          .from(transactions)
          .where(and(...whereConditions));

        // Filter by agent if specified
        let filtered = txs;
        if (input.agentId !== undefined) {
          filtered = txs.filter((t) => {
            const agents = t.agents ? t.agents.split(',').map((a) => a.trim()) : [];
            return agents.some((a) => a === input.agentId!.toString());
          });
        }

        // Calculate audit data
        const auditData = filtered.map((tx) => ({
          transactionId: tx.id,
          transactionName: tx.loopName,
          closingDate: tx.closingDate,
          price: tx.price,
          commissionRate: tx.commissionRate || 0,
          totalCommission: tx.commissionTotal || 0,
          buySideCommission: tx.buySideCommission || 0,
          sellSideCommission: tx.sellSideCommission || 0,
          companyDollar: tx.companyDollar || 0,
          agentCommission: (tx.commissionTotal || 0) - (tx.companyDollar || 0),
          status: tx.loopStatus,
        }));

        return {
          totalTransactions: auditData.length,
          totalCommission: auditData.reduce((sum, a) => sum + a.totalCommission, 0),
          totalAgentCommission: auditData.reduce((sum, a) => sum + a.agentCommission, 0),
          totalCompanyDollar: auditData.reduce((sum, a) => sum + a.companyDollar, 0),
          auditData,
        };
      } catch (error) {
        console.error('Get commission audit error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch commission audit',
        });
      }
    }),
});
