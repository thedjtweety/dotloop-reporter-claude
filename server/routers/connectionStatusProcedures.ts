/**
 * Connection Status Procedures
 * 
 * Handles checking Dotloop connection status, disconnecting, and reconnecting
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { oauthTokens } from '../../drizzle/schema';
import { getTenantIdFromUser } from '../lib/tenant-context';
import { eq, and } from 'drizzle-orm';

export const connectionStatusRouter = router({
  /**
   * Get current connection status
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Check if user has valid Dotloop token
      const token = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.userId, ctx.user.id))
        .limit(1);

      if (!token || token.length === 0) {
        return {
          isConnected: false,
          connectedAt: null,
          lastSyncAt: null,
          provider: 'dotloop',
        };
      }

      const tokenRecord = token[0];
      const isExpired = tokenRecord.tokenExpiresAt && new Date(tokenRecord.tokenExpiresAt) < new Date();

      return {
        isConnected: !isExpired,
        connectedAt: tokenRecord.createdAt,
        lastSyncAt: tokenRecord.lastUsedAt,
        provider: 'dotloop',
        expiresAt: tokenRecord.tokenExpiresAt,
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return {
        isConnected: false,
        connectedAt: null,
        lastSyncAt: null,
        provider: 'dotloop',
        error: 'Failed to check connection status',
      };
    }
  }),

  /**
   * Disconnect Dotloop account
   */
  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      // Delete the OAuth token
      const result = await db
        .delete(oauthTokens)
        .where(eq(oauthTokens.userId, ctx.user.id));

      return {
        success: true,
        message: 'Dotloop account disconnected successfully',
      };
    } catch (error) {
      console.error('Error disconnecting Dotloop:', error);
      return {
        success: false,
        message: 'Failed to disconnect Dotloop account',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Get reconnection URL (same as initial authorization)
   */
  getReconnectUrl: protectedProcedure.query(async ({ ctx }) => {
    try {
      const clientId = process.env.DOTLOOP_CLIENT_ID;
      const redirectUri = process.env.DOTLOOP_REDIRECT_URI;

      if (!clientId || !redirectUri) {
        throw new Error('Dotloop OAuth credentials not configured');
      }

      const state = Buffer.from(JSON.stringify({
        userId: ctx.user.id,
        timestamp: Date.now(),
        action: 'reconnect',
      })).toString('base64');

      const authUrl = new URL('https://auth.dotloop.com/oauth/authorize');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', 'account:read profile:* loop:* contact:* template:read');
      authUrl.searchParams.append('state', state);

      return {
        url: authUrl.toString(),
        message: 'Redirect to this URL to reconnect your Dotloop account',
      };
    } catch (error) {
      console.error('Error generating reconnect URL:', error);
      return {
        url: null,
        message: 'Failed to generate reconnect URL',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
});
