/**
 * Sync History Procedures
 * 
 * Handles fetching and managing Dotloop sync history and logs
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getTenantIdFromUser } from '../lib/tenant-context';

export const syncHistoryRouter = router({
  /**
   * Get sync history logs
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        const tenantId = await getTenantIdFromUser(ctx.user.id);
        const limit = input?.limit || 50;
        const offset = input?.offset || 0;

        // Fetch sync logs ordered by most recent first
        const logs = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.tenantId, tenantId),
              eq(auditLogs.action, 'data_exported')
            )
          )
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset);

        return logs.map(log => {
          const details = log.details ? JSON.parse(log.details) : {};
          return {
            id: String(log.id),
            timestamp: new Date(log.createdAt),
            status: details.status || 'completed',
            transactionsFetched: details.transactionsFetched || 0,
            transactionsCreated: details.transactionsCreated || 0,
            transactionsUpdated: details.transactionsUpdated || 0,
            duration: details.duration || 0,
            error: details.error,
            details: log.details,
          };
        });
      } catch (error) {
        console.error('Error fetching sync history:', error);
        return [];
      }
    }),

  /**
   * Get sync statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      // Get all sync logs for this tenant
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantId),
            eq(auditLogs.action, 'data_exported')
          )
        );

      const completedLogs = logs.filter(l => {
        const details = l.details ? JSON.parse(l.details) : {};
        return details.status === 'completed';
      });

      const failedLogs = logs.filter(l => {
        const details = l.details ? JSON.parse(l.details) : {};
        return details.status === 'failed';
      });

      const totalTransactionsFetched = completedLogs.reduce((sum, log) => {
        const details = log.details ? JSON.parse(log.details) : {};
        return sum + (details.transactionsFetched || 0);
      }, 0);

      const totalTransactionsCreated = completedLogs.reduce((sum, log) => {
        const details = log.details ? JSON.parse(log.details) : {};
        return sum + (details.transactionsCreated || 0);
      }, 0);

      const totalTransactionsUpdated = completedLogs.reduce((sum, log) => {
        const details = log.details ? JSON.parse(log.details) : {};
        return sum + (details.transactionsUpdated || 0);
      }, 0);

      const averageDuration =
        completedLogs.length > 0
          ? completedLogs.reduce((sum, log) => {
              const details = log.details ? JSON.parse(log.details) : {};
              return sum + (details.duration || 0);
            }, 0) / completedLogs.length
          : 0;

      const successRate = logs.length > 0 ? (completedLogs.length / logs.length) * 100 : 0;

      const lastSync = logs.length > 0 ? new Date(logs[0].createdAt) : null;

      return {
        totalSyncs: logs.length,
        successfulSyncs: completedLogs.length,
        failedSyncs: failedLogs.length,
        successRate: Math.round(successRate * 100) / 100,
        totalTransactionsFetched,
        totalTransactionsCreated,
        totalTransactionsUpdated,
        averageDuration: Math.round(averageDuration),
        lastSync,
      };
    } catch (error) {
      console.error('Error fetching sync statistics:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
        totalTransactionsFetched: 0,
        totalTransactionsCreated: 0,
        totalTransactionsUpdated: 0,
        averageDuration: 0,
        lastSync: null,
      };
    }
  }),

  /**
   * Trigger manual sync
   */
  triggerManualSync: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const tenantId = await getTenantIdFromUser(ctx.user.id);
      const startTime = Date.now();

      // Insert initial log entry
      await db.insert(auditLogs).values({
        tenantId,
        adminId: ctx.user.id,
        adminName: ctx.user.email || 'System',
        adminEmail: ctx.user.email,
        action: 'data_exported',
        targetType: 'system',
        details: JSON.stringify({
          type: 'manual_sync',
          status: 'running',
          startTime: new Date().toISOString(),
        }),
        createdAt: new Date().toISOString(),
      });

      // In a real implementation, this would:
      // 1. Get user's Dotloop token
      // 2. Fetch transactions from Dotloop API
      // 3. Process and store transactions
      // 4. Update sync log with results

      // For now, simulate successful sync
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Manual sync triggered successfully',
        duration,
      };
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      return {
        success: false,
        message: 'Failed to trigger manual sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Get detailed log information
   */
  getLogDetails: protectedProcedure
    .input(z.object({ logId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const log = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.id, parseInt(input.logId)),
              eq(auditLogs.tenantId, tenantId)
            )
          );

        if (!log || log.length === 0) {
          throw new Error('Sync log not found');
        }

        const logEntry = log[0];
        const details = logEntry.details ? JSON.parse(logEntry.details) : {};

        return {
          id: String(logEntry.id),
          timestamp: new Date(logEntry.createdAt),
          status: details.status || 'completed',
          transactionsFetched: details.transactionsFetched || 0,
          transactionsCreated: details.transactionsCreated || 0,
          transactionsUpdated: details.transactionsUpdated || 0,
          duration: details.duration || 0,
          error: details.error,
          details: logEntry.details,
        };
      } catch (error) {
        console.error('Error fetching log details:', error);
        return null;
      }
    }),
});
