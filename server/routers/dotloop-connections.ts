/**
 * Dotloop Multi-Connection Management Router
 * 
 * Handles multiple Dotloop account connections:
 * - List connections
 * - Get active connection
 * - Switch between connections
 * - Update connection details
 * - Set primary connection
 * - Delete connections
 * - Admin: View all connections
 */

import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { oauthTokens, userPreferences, users } from '../../drizzle/schema';
import { tokenEncryption } from '../lib/token-encryption';
import { getTenantIdFromUser } from '../lib/tenant-context';
import { eq, and, sql } from 'drizzle-orm';

const DOTLOOP_REVOKE_URL = 'https://auth.dotloop.com/oauth/token/revoke';

/**
 * Get Dotloop OAuth credentials from environment
 */
function getDotloopCredentials() {
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Dotloop OAuth credentials not configured');
  }

  return { clientId, clientSecret };
}

/**
 * Create HTTP Basic Authorization header
 */
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

export const dotloopConnectionsRouter = router({
  /**
   * List all Dotloop connections for the current user
   */
  listConnections: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const tenantId = await getTenantIdFromUser(ctx.user?.id);
        if (!tenantId) throw new Error('Unable to determine tenant for user');

      const connections = await db
        .select({
          id: oauthTokens.id,
          connectionName: oauthTokens.connectionName,
          dotloopAccountEmail: oauthTokens.dotloopAccountEmail,
          dotloopAccountName: oauthTokens.dotloopAccountName,
          isPrimary: oauthTokens.isPrimary,
          isActive: oauthTokens.isActive,
          expiresAt: oauthTokens.tokenExpiresAt,
          lastUsedAt: oauthTokens.lastUsedAt,
          createdAt: oauthTokens.createdAt,
        })
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.tenantId, tenantId),
            eq(oauthTokens.userId, ctx.user?.id),
            eq(oauthTokens.provider, 'dotloop')
          )
        );

        return connections;
      } catch (error) {
        console.error('[dotloopConnections.listConnections] Error:', error);
        throw error;
      }
    }),

  /**
   * Get the active Dotloop connection
   */
  getActiveConnection: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const tenantId = await getTenantIdFromUser(ctx.user?.id);
        if (!tenantId) throw new Error('Unable to determine tenant for user');

        // First check user preferences
        const [prefs] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user?.id))
        .limit(1);

        if (prefs?.activeOAuthTokenId) {
          const [connection] = await db
            .select()
            .from(oauthTokens)
            .where(
              and(
                eq(oauthTokens.id, prefs.activeOAuthTokenId),
                eq(oauthTokens.userId, ctx.user?.id),
                eq(oauthTokens.isActive, 1)
              )
            )
            .limit(1);

          if (connection) return connection;
        }

        // Fall back to primary connection
        const [primary] = await db
          .select()
          .from(oauthTokens)
          .where(
            and(
              eq(oauthTokens.tenantId, tenantId),
              eq(oauthTokens.userId, ctx.user?.id),
              eq(oauthTokens.provider, 'dotloop'),
              eq(oauthTokens.isPrimary, 1),
              eq(oauthTokens.isActive, 1)
            )
          )
          .limit(1);

        return primary || null;
      } catch (error) {
        console.error('[dotloopConnections.getActiveConnection] Error:', error);
        throw error;
      }
    }),

  /**
   * Switch to a different Dotloop connection
   */
  switchConnection: publicProcedure
    .input(z.object({
      connectionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const tenantId = await getTenantIdFromUser(ctx.user?.id);

      // Verify ownership
      const [connection] = await db
        .select()
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.id, input.connectionId),
            eq(oauthTokens.userId, ctx.user?.id),
            eq(oauthTokens.tenantId, tenantId),
            eq(oauthTokens.isActive, 1)
          )
        )
        .limit(1);

      if (!connection) {
        throw new Error('Connection not found or not active');
      }

      // Update user preferences
      const [existing] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, ctx.user?.id))
        .limit(1);

      if (existing) {
        await db
          .update(userPreferences)
          .set({ activeOAuthTokenId: input.connectionId })
          .where(eq(userPreferences.id, existing.id));
      } else {
        await db.insert(userPreferences).values({
          userId: ctx.user?.id,
          tenantId,
          activeOAuthTokenId: input.connectionId,
        });
      }

      return { success: true };
    }),

  /**
   * Update connection details (name, active status)
   */
  updateConnection: publicProcedure
    .input(z.object({
      connectionId: z.number(),
      connectionName: z.string().optional(),
      isActive: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const tenantId = await getTenantIdFromUser(ctx.user?.id);

      // Verify ownership
      const [connection] = await db
        .select()
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.id, input.connectionId),
            eq(oauthTokens.userId, ctx.user?.id),
            eq(oauthTokens.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Don't allow disabling if it's the only active connection
      if (input.isActive === 0) {
        const [activeCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(oauthTokens)
          .where(
            and(
              eq(oauthTokens.userId, ctx.user?.id),
              eq(oauthTokens.isActive, 1)
            )
          );

        if (activeCount.count <= 1) {
          throw new Error('Cannot disable your only active connection');
        }
      }

      await db
        .update(oauthTokens)
        .set({
          connectionName: input.connectionName,
          isActive: input.isActive,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oauthTokens.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Set a connection as primary (default)
   */
  setPrimaryConnection: publicProcedure
    .input(z.object({
      connectionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const tenantId = await getTenantIdFromUser(ctx.user?.id);

      // Clear all primary flags for this user
      await db
        .update(oauthTokens)
        .set({ isPrimary: 0 })
        .where(
          and(
            eq(oauthTokens.userId, ctx.user?.id),
            eq(oauthTokens.tenantId, tenantId)
          )
        );

      // Set new primary
      await db
        .update(oauthTokens)
        .set({ isPrimary: 1 })
        .where(eq(oauthTokens.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Delete/disconnect a connection
   */
  deleteConnection: publicProcedure
    .input(z.object({
      connectionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const tenantId = await getTenantIdFromUser(ctx.user?.id);

      // Get connection info
      const [connection] = await db
        .select()
        .from(oauthTokens)
        .where(
          and(
            eq(oauthTokens.id, input.connectionId),
            eq(oauthTokens.userId, ctx.user?.id),
            eq(oauthTokens.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Revoke with Dotloop
      try {
        const { clientId, clientSecret } = getDotloopCredentials();
        const accessToken = tokenEncryption.decrypt(connection.encryptedAccessToken);

        await fetch(DOTLOOP_REVOKE_URL, {
          method: 'POST',
          headers: {
            'Authorization': createBasicAuthHeader(clientId, clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ token: accessToken }).toString(),
        });
      } catch (error) {
        console.warn('Failed to revoke with Dotloop:', error);
      }

      // Delete from database
      await db
        .delete(oauthTokens)
        .where(eq(oauthTokens.id, input.connectionId));

      return { success: true };
    }),

  /**
   * Get all connections (admin only)
   */
  listAllConnections: publicProcedure
    .input(z.object({
      userId: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Check if user is admin
      if (ctx.user?.role !== 'admin') {
        throw new Error('Unauthorized - admin only');
      }

      const tenantId = await getTenantIdFromUser(ctx.user?.id);

      const query = db
        .select({
          id: oauthTokens.id,
          userId: oauthTokens.userId,
          userName: users.name,
          userEmail: users.email,
          connectionName: oauthTokens.connectionName,
          dotloopAccountEmail: oauthTokens.dotloopAccountEmail,
          isPrimary: oauthTokens.isPrimary,
          isActive: oauthTokens.isActive,
          lastUsedAt: oauthTokens.lastUsedAt,
          createdAt: oauthTokens.createdAt,
        })
        .from(oauthTokens)
        .leftJoin(users, eq(oauthTokens.userId, users.id))
        .where(
          and(
            eq(oauthTokens.tenantId, tenantId),
            eq(oauthTokens.provider, 'dotloop'),
            input.userId ? eq(oauthTokens.userId, input.userId) : undefined
          )
        );

      return await query;
    }),
});
