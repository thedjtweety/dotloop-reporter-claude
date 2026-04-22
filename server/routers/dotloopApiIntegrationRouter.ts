/**
 * Dotloop API Integration Router - Phase 6: API Integration (6.1-6.4)
 * Handles real-time transaction sync, webhook processing, and API error handling
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { transactions, oauthTokens } from '../../drizzle/schema';
import { getDb } from '../db';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit-logger';
import { tokenEncryption } from '../lib/token-encryption';

interface DotloopTransaction {
  id: string;
  loopName: string;
  loopStatus: string;
  price?: number;
  commissionTotal?: number;
  closingDate?: string;
  agents?: string;
  buyerAgent?: string;
  sellerAgent?: string;
}

export const dotloopApiIntegrationRouter = router({
  /**
   * Priority 6.1: Sync transactions from Dotloop API
   */
  syncTransactionsFromDotloop: protectedProcedure.mutation(async ({ ctx }) => {
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

      // Get OAuth token for tenant
      const tokenRecord = await db
        .select()
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.tenantId, tenantId),
            eq(oauthTokens.isActive, 1)
          )
        );

      if (tokenRecord.length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No active Dotloop connection found',
        });
      }

      const token = tokenRecord[0];
      const decryptedAccessToken = tokenEncryption.decrypt(token.encryptedAccessToken);

      // Fetch transactions from Dotloop API
      const response = await fetch('https://api.dotloop.com/public/v1/loops', {
        headers: {
          Authorization: `Bearer ${decryptedAccessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Dotloop API error: ${response.statusText}`,
        });
      }

      const data = await response.json();
      const dotloopTransactions: DotloopTransaction[] = data.loops || [];

      // Sync transactions to database
      let syncedCount = 0;
      for (const tx of dotloopTransactions) {
        const existing = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              eq(transactions.loopName, tx.loopName)
            )
          );

        if (existing.length === 0) {
          await db.insert(transactions).values({
            tenantId,
            loopName: tx.loopName,
            loopStatus: tx.loopStatus,
            price: tx.price || 0,
            commissionTotal: tx.commissionTotal || 0,
            closingDate: tx.closingDate || new Date().toISOString(),
            agents: tx.agents || '',
            source: 'dotloop_api',
          } as any);
          syncedCount++;
        } else {
          // Update existing transaction
          await db
            .update(transactions)
            .set({
              loopStatus: tx.loopStatus,
              price: tx.price || 0,
              commissionTotal: tx.commissionTotal || 0,
            })
            .where(eq(transactions.loopName, tx.loopName));
        }
      }

      // Log audit event
      await logAuditEvent({
        tenantId,
        adminId: ctx.user.id as number,
        adminName: ctx.user.email || 'Unknown',
        action: 'user_created',
        targetType: 'system',
        targetName: 'Dotloop Sync',
        details: `Synced ${syncedCount} new transactions from Dotloop API`,
      });

      return {
        success: true,
        syncedCount,
        totalTransactions: dotloopTransactions.length,
      };
    } catch (error) {
      console.error('Sync transactions error:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to sync transactions from Dotloop',
      });
    }
  }),

  /**
   * Priority 6.2: Handle Dotloop webhooks (mock implementation)
   */
  handleDotloopWebhook: protectedProcedure
    .input(
      z.object({
        event: z.string(),
        loopId: z.string(),
        data: z.record(z.string(), z.any()),
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

        // Process webhook based on event type
        switch (input.event) {
          case 'loop.status_changed':
            // Update transaction status
            await db
              .update(transactions)
              .set({ loopStatus: input.data.status as string })
              .where(eq(transactions.loopName, input.loopId));
            break;

          case 'loop.closed':
            // Mark transaction as closed
            await db
              .update(transactions)
              .set({ loopStatus: 'closed' })
              .where(eq(transactions.loopName, input.loopId));
            break;

          case 'loop.created':
            // Create new transaction
            await db.insert(transactions).values({
              tenantId,
              loopName: input.loopId,
              loopStatus: 'active',
              source: 'dotloop_webhook',
            } as any);
            break;
        }

        return { success: true, processed: true };
      } catch (error) {
        console.error('Handle webhook error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process webhook',
        });
      }
    }),

  /**
   * Priority 6.3: Get Dotloop connection status
   */
  getDotloopConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
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

      const tokens = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.tenantId, tenantId));

      const activeToken = tokens.find((t) => t.isActive === 1);

      return {
        connected: !!activeToken,
        lastSync: activeToken?.lastUsedAt || null,
        expiresAt: activeToken?.tokenExpiresAt || null,
        connectionCount: tokens.length,
      };
    } catch (error) {
      console.error('Get connection status error:', error);
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get connection status',
      });
    }
  }),

  /**
   * Priority 6.4: Get sync history
   */
  getSyncHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
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

        // Get recent transactions
        const recentTxs = await db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, tenantId));

        return {
          total: recentTxs.length,
          recentSyncs: recentTxs.slice(0, input.limit),
        };
      } catch (error) {
        console.error('Get sync history error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch sync history',
        });
      }
    }),
});
