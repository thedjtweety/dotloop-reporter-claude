/**
 * Dashboard Router - Priority 2.3: Dashboard & Core Analytics
 * Provides all dashboard metrics and analytics data
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { transactions } from '../../drizzle/schema';
import { getDb } from '../db';
import { eq, and, gte, lte, sum, count, avg } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit-logger';

export interface DashboardMetrics {
  totalTransactions: number;
  totalVolume: number;
  closingRate: number;
  averageDaysToClose: number;
  activeListings: number;
  underContract: number;
  closedDeals: number;
  archivedLoops: number;
  averagePrice: number;
  medianPrice: number;
  totalCommission: number;
  companyDollar: number;
}

export interface PipelineBreakdown {
  status: string;
  count: number;
  percentage: number;
  volume: number;
}

export interface AgentMetrics {
  agentName: string;
  totalTransactions: number;
  closedTransactions: number;
  closingRate: number;
  totalVolume: number;
  averagePrice: number;
  totalCommission: number;
  daysToClose: number;
}

export const dashboardRouter = router({
  /**
   * Get main dashboard metrics
   */
  getMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
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

        // Build query conditions
        let whereConditions = [eq(transactions.tenantId, tenantId)];
        if (input.startDate) {
          whereConditions.push(gte(transactions.closingDate, input.startDate));
        }
        if (input.endDate) {
          whereConditions.push(lte(transactions.closingDate, input.endDate));
        }

        // Get all transactions for this tenant
        const allTransactions = await db
          .select()
          .from(transactions)
          .where(and(...whereConditions));

        // Calculate metrics
        const totalTransactions = allTransactions.length;
        const totalVolume = allTransactions.reduce((sum, t) => sum + (t.price || 0), 0);
        const closedDeals = allTransactions.filter((t) => t.loopStatus?.toLowerCase().includes('closed')).length;
        const closingRate = totalTransactions > 0 ? (closedDeals / totalTransactions) * 100 : 0;

        // Calculate days to close
        const closedWithDates = allTransactions.filter(
          (t) => t.listingDate && t.closingDate && t.loopStatus?.toLowerCase().includes('closed')
        );
        const daysToCloseList = closedWithDates.map((t) => {
          const listing = new Date(t.listingDate!).getTime();
          const closing = new Date(t.closingDate!).getTime();
          return Math.floor((closing - listing) / (1000 * 60 * 60 * 24));
        });
        const averageDaysToClose = daysToCloseList.length > 0 ? Math.round(daysToCloseList.reduce((a, b) => a + b, 0) / daysToCloseList.length) : 0;

        // Count by status
        const activeListings = allTransactions.filter((t) => t.loopStatus?.toLowerCase().includes('active')).length;
        const underContract = allTransactions.filter((t) => t.loopStatus?.toLowerCase().includes('contract') || t.loopStatus?.toLowerCase().includes('pending')).length;
        const archivedLoops = allTransactions.filter((t) => t.loopStatus?.toLowerCase().includes('archived')).length;

        // Price metrics
        const prices = allTransactions.map((t) => t.price || 0).sort((a, b) => a - b);
        const averagePrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
        const medianPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : 0;

        // Commission metrics
        const totalCommission = allTransactions.reduce((sum, t) => sum + (t.commissionTotal || 0), 0);
        const companyDollar = allTransactions.reduce((sum, t) => sum + (t.companyDollar || 0), 0);

        const metrics: DashboardMetrics = {
          totalTransactions,
          totalVolume,
          closingRate: Math.round(closingRate * 100) / 100,
          averageDaysToClose,
          activeListings,
          underContract,
          closedDeals,
          archivedLoops,
          averagePrice,
          medianPrice,
          totalCommission,
          companyDollar,
        };

        // Log audit event
        await logAuditEvent({
          tenantId: tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'upload_viewed',
          targetType: 'system',
          targetName: 'Main Dashboard',
          details: `Viewed dashboard with ${totalTransactions} transactions`,
        });

        return metrics;
      } catch (error) {
        console.error('Get metrics error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch metrics',
        });
      }
    }),

  /**
   * Get pipeline breakdown
   */
  getPipelineBreakdown: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
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

        // Build query conditions
        let whereConditions = [eq(transactions.tenantId, tenantId)];
        if (input.startDate) {
          whereConditions.push(gte(transactions.closingDate, input.startDate));
        }
        if (input.endDate) {
          whereConditions.push(lte(transactions.closingDate, input.endDate));
        }

        // Get all transactions
        const allTransactions = await db
          .select()
          .from(transactions)
          .where(and(...whereConditions));

        // Group by status
        const statusGroups = new Map<string, { count: number; volume: number }>();
        for (const tx of allTransactions) {
          const status = tx.loopStatus || 'Unknown';
          const existing = statusGroups.get(status) || { count: 0, volume: 0 };
          existing.count++;
          existing.volume += tx.price || 0;
          statusGroups.set(status, existing);
        }

        // Convert to breakdown array
        const breakdown: PipelineBreakdown[] = Array.from(statusGroups.entries()).map(([status, data]) => ({
          status,
          count: data.count,
          percentage: Math.round((data.count / allTransactions.length) * 100),
          volume: data.volume,
        }));

        return breakdown.sort((a, b) => b.count - a.count);
      } catch (error) {
        console.error('Get pipeline breakdown error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch pipeline breakdown',
        });
      }
    }),

  /**
   * Get agent metrics
   */
  getAgentMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
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

        // Build query conditions
        let whereConditions = [eq(transactions.tenantId, tenantId)];
        if (input.startDate) {
          whereConditions.push(gte(transactions.closingDate, input.startDate));
        }
        if (input.endDate) {
          whereConditions.push(lte(transactions.closingDate, input.endDate));
        }

        // Get all transactions
        const allTransactions = await db
          .select()
          .from(transactions)
          .where(and(...whereConditions));

        // Group by agent
        const agentGroups = new Map<string, any[]>();
        for (const tx of allTransactions) {
          const agents = tx.agents ? tx.agents.split(',').map((a) => a.trim()) : ['Unknown'];
          for (const agent of agents) {
            if (!agentGroups.has(agent)) {
              agentGroups.set(agent, []);
            }
            agentGroups.get(agent)!.push(tx);
          }
        }

        // Calculate metrics per agent
        const agentMetrics: AgentMetrics[] = Array.from(agentGroups.entries()).map(([agentName, txs]) => {
          const closedTxs = txs.filter((t) => t.loopStatus?.toLowerCase().includes('closed'));
          const closingRate = txs.length > 0 ? (closedTxs.length / txs.length) * 100 : 0;
          const totalVolume = txs.reduce((sum, t) => sum + (t.price || 0), 0);
          const averagePrice = txs.length > 0 ? Math.round(totalVolume / txs.length) : 0;
          const totalCommission = txs.reduce((sum, t) => sum + (t.commissionTotal || 0), 0);

          // Calculate days to close
          const closedWithDates = closedTxs.filter((t) => t.listingDate && t.closingDate);
          const daysToCloseList = closedWithDates.map((t) => {
            const listing = new Date(t.listingDate!).getTime();
            const closing = new Date(t.closingDate!).getTime();
            return Math.floor((closing - listing) / (1000 * 60 * 60 * 24));
          });
          const daysToClose = daysToCloseList.length > 0 ? Math.round(daysToCloseList.reduce((a, b) => a + b, 0) / daysToCloseList.length) : 0;

          return {
            agentName,
            totalTransactions: txs.length,
            closedTransactions: closedTxs.length,
            closingRate: Math.round(closingRate * 100) / 100,
            totalVolume,
            averagePrice,
            totalCommission,
            daysToClose,
          };
        });

        return agentMetrics.sort((a, b) => b.totalVolume - a.totalVolume);
      } catch (error) {
        console.error('Get agent metrics error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch agent metrics',
        });
      }
    }),

  /**
   * Get financial summary
   */
  getFinancialSummary: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
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

        // Build query conditions
        let whereConditions = [eq(transactions.tenantId, tenantId)];
        if (input.startDate) {
          whereConditions.push(gte(transactions.closingDate, input.startDate));
        }
        if (input.endDate) {
          whereConditions.push(lte(transactions.closingDate, input.endDate));
        }

        // Get all transactions
        const allTransactions = await db
          .select()
          .from(transactions)
          .where(and(...whereConditions));

        // Calculate financial metrics
        const totalVolume = allTransactions.reduce((sum, t) => sum + (t.price || 0), 0);
        const totalCommission = allTransactions.reduce((sum, t) => sum + (t.commissionTotal || 0), 0);
        const buySideCommission = allTransactions.reduce((sum, t) => sum + (t.buySideCommission || 0), 0);
        const sellSideCommission = allTransactions.reduce((sum, t) => sum + (t.sellSideCommission || 0), 0);
        const companyDollar = allTransactions.reduce((sum, t) => sum + (t.companyDollar || 0), 0);

        return {
          totalVolume,
          totalCommission,
          buySideCommission,
          sellSideCommission,
          companyDollar,
          commissionPercentage: totalVolume > 0 ? (totalCommission / totalVolume) * 100 : 0,
          averageCommissionPerTransaction: allTransactions.length > 0 ? totalCommission / allTransactions.length : 0,
        };
      } catch (error) {
        console.error('Get financial summary error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch financial summary',
        });
      }
    }),
});
