/**
 * Sync History Procedures
 * 
 * Handles real Dotloop API sync with database persistence
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { auditLogs, oauthTokens } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getTenantIdFromUser } from '../lib/tenant-context';
import { dotloopSyncService, type SyncResult } from '../services/dotloopSyncService';

export const syncHistoryRouter = router({
  /**
   * Get sync history logs from database
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

        // Fetch sync logs from auditLogs table
        const logs = await db
          .select()
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.tenantId, tenantId),
              eq(auditLogs.action, 'settings_changed')
            )
          )
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset);

        return logs
          .filter(log => {
            const details = log.details ? JSON.parse(log.details) : {};
            return details.type === 'sync_operation';
          })
          .map(log => {
            const details = log.details ? JSON.parse(log.details) : {};
            return {
              id: String(log.id),
              timestamp: new Date(log.createdAt),
              status: details.syncStatus || 'completed',
              transactionsFetched: details.transactionsFetched || 0,
              transactionsCreated: details.transactionsCreated || 0,
              transactionsUpdated: details.transactionsUpdated || 0,
              durationMs: details.durationMs || 0,
              errorMessage: details.errorMessage || null,
              errors: details.errors || [],
            };
          });
      } catch (error) {
        console.error('Error fetching sync history:', error);
        return [];
      }
    }),

  /**
   * Get sync statistics from all logs
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
            eq(auditLogs.action, 'settings_changed')
          )
        );

      const syncLogs = logs
        .filter(log => {
          const details = log.details ? JSON.parse(log.details) : {};
          return details.type === 'sync_operation';
        })
        .map(log => {
          const details = log.details ? JSON.parse(log.details) : {};
          return { details, createdAt: log.createdAt };
        });

      const completedLogs = syncLogs.filter(l => l.details.syncStatus === 'completed');
      const failedLogs = syncLogs.filter(l => l.details.syncStatus === 'failed');

      const totalTransactionsFetched = completedLogs.reduce(
        (sum, log) => sum + (log.details.transactionsFetched || 0),
        0
      );

      const totalTransactionsCreated = completedLogs.reduce(
        (sum, log) => sum + (log.details.transactionsCreated || 0),
        0
      );

      const totalTransactionsUpdated = completedLogs.reduce(
        (sum, log) => sum + (log.details.transactionsUpdated || 0),
        0
      );

      const averageDuration =
        completedLogs.length > 0
          ? completedLogs.reduce((sum, log) => sum + (log.details.durationMs || 0), 0) /
            completedLogs.length
          : 0;

      const successRate = syncLogs.length > 0 ? (completedLogs.length / syncLogs.length) * 100 : 0;

      const lastSync = syncLogs.length > 0 ? new Date(syncLogs[0].createdAt) : null;

      return {
        totalSyncs: syncLogs.length,
        successfulSyncs: completedLogs.length,
        failedSyncs: failedLogs.length,
        successRate: Math.round(successRate * 100) / 100,
        totalTransactionsFetched,
        totalTransactionsCreated,
        totalTransactionsUpdated,
        averageDurationMs: Math.round(averageDuration),
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
        averageDurationMs: 0,
        lastSync: null,
      };
    }
  }),

  /**
   * Trigger manual sync from real Dotloop API
   */
  triggerManualSync: protectedProcedure.mutation(async ({ ctx }) => {
    const startTime = Date.now();
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      // Verify user has valid Dotloop OAuth token
      const token = await db
        .select()
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.userId, ctx.user.id),
            eq(oauthTokens.provider, 'dotloop')
          )
        )
        .limit(1);

      if (!token || token.length === 0) {
        throw new Error('No Dotloop OAuth token found. Please connect your Dotloop account first.');
      }

      // Call real Dotloop sync service
      const result: SyncResult = await dotloopSyncService.manualSync(ctx.user.id, tenantId);

      const durationMs = Date.now() - startTime;

      // Log the sync operation with real results
      await db.insert(auditLogs).values({
        tenantId,
        adminId: ctx.user.id,
        adminName: ctx.user.email || 'System',
        adminEmail: ctx.user.email,
        action: 'settings_changed',
        targetType: 'system',
        details: JSON.stringify({
          type: 'sync_operation',
          syncStatus: result.success ? 'completed' : 'failed',
          transactionsFetched: result.transactionsFetched,
          transactionsCreated: result.transactionsCreated,
          transactionsUpdated: result.transactionsUpdated,
          durationMs,
          errorMessage: result.errors.length > 0 ? result.errors[0] : null,
          errors: result.errors,
        }),
      });

      return {
        success: result.success,
        message: result.success
          ? `Sync completed: ${result.transactionsFetched} fetched, ${result.transactionsCreated} created, ${result.transactionsUpdated} updated`
          : `Sync failed: ${result.errors[0] || 'Unknown error'}`,
        result: {
          transactionsFetched: result.transactionsFetched,
          transactionsCreated: result.transactionsCreated,
          transactionsUpdated: result.transactionsUpdated,
          durationMs,
          errors: result.errors,
        },
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error('Error triggering manual sync:', error);

      // Log the error
      try {
        const db = await getDb();
        if (db) {
          const tenantId = await getTenantIdFromUser(ctx.user.id);
          await db.insert(auditLogs).values({
            tenantId,
            adminId: ctx.user.id,
            adminName: ctx.user.email || 'System',
            adminEmail: ctx.user.email,
            action: 'settings_changed',
            targetType: 'system',
            details: JSON.stringify({
              type: 'sync_operation',
              syncStatus: 'failed',
              durationMs,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
              errors: [error instanceof Error ? error.message : 'Unknown error'],
            }),
          });
        }
      } catch (logError) {
        console.error('Error logging sync failure:', logError);
      }

      return {
        success: false,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        result: {
          transactionsFetched: 0,
          transactionsCreated: 0,
          transactionsUpdated: 0,
          durationMs,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        },
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
          )
          .limit(1);

        if (!log || log.length === 0) {
          throw new Error('Sync log not found');
        }

        const logEntry = log[0];
        const details = logEntry.details ? JSON.parse(logEntry.details) : {};

        return {
          id: String(logEntry.id),
          timestamp: new Date(logEntry.createdAt),
          status: details.syncStatus || 'completed',
          transactionsFetched: details.transactionsFetched || 0,
          transactionsCreated: details.transactionsCreated || 0,
          transactionsUpdated: details.transactionsUpdated || 0,
          durationMs: details.durationMs || 0,
          errorMessage: details.errorMessage || null,
          errors: details.errors || [],
          details,
        };
      } catch (error) {
        console.error('Error fetching log details:', error);
        return null;
      }
    }),

  /**
   * Get current sync status for real-time monitoring
   */
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      // Check if user has valid Dotloop token
      const token = await db
        .select()
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.userId, ctx.user.id),
            eq(oauthTokens.provider, 'dotloop')
          )
        )
        .limit(1);

      const isConnected = token && token.length > 0;

      // Get the most recent sync log
      const latestSync = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantId),
            eq(auditLogs.action, 'settings_changed')
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(1);

      if (!latestSync || latestSync.length === 0) {
        return {
          status: isConnected ? 'never_synced' : 'not_connected',
          lastSyncTime: null,
          isConnected,
          lastError: null,
        };
      }

      const details = latestSync[0].details ? JSON.parse(latestSync[0].details) : {};

      return {
        status: details.syncStatus || 'unknown',
        lastSyncTime: new Date(latestSync[0].createdAt),
        isConnected,
        lastError: details.errorMessage || null,
      };
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return {
        status: 'error',
        lastSyncTime: null,
        isConnected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
});
