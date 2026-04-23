/**
 * Dotloop OAuth Router
 * 
 * Handles OAuth 2.0 flow for Dotloop API integration:
 * - Authorization redirect
 * - Callback handling
 * - Token exchange and storage
 * - Token refresh
 * - Token revocation
 * 
 * Fixed for Drizzle ORM MySQL compatibility by avoiding complex `and()` conditions
 */

import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { getDb } from './db';
import { oauthTokens, tokenAuditLogs } from '../drizzle/schema';
import { tokenEncryption } from './lib/token-encryption';
import { getTenantIdFromUser } from './lib/tenant-context';
import { eq, sql } from 'drizzle-orm';

const DOTLOOP_AUTH_URL = 'https://auth.dotloop.com/oauth/authorize';
const DOTLOOP_TOKEN_URL = 'https://auth.dotloop.com/oauth/token';
const DOTLOOP_REVOKE_URL = 'https://auth.dotloop.com/oauth/token/revoke';
const DOTLOOP_API_BASE = 'https://api-gateway.dotloop.com/public/v2';

/**
 * Get Dotloop OAuth credentials from environment
 */
function getDotloopCredentials() {
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;
  const redirectUri = process.env.DOTLOOP_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Dotloop OAuth credentials not configured. ' +
      'Please set DOTLOOP_CLIENT_ID, DOTLOOP_CLIENT_SECRET, and DOTLOOP_REDIRECT_URI'
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Create HTTP Basic Authorization header
 */
function createBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Log token audit event
 */
async function logTokenAudit(params: {
  tenantId: number;
  userId: number;
  tokenId?: number;
  action: 'token_created' | 'token_refreshed' | 'token_used' | 'token_revoked' | 'token_decryption_failed' | 'suspicious_access' | 'rate_limit_exceeded' | 'security_alert';
  status: 'success' | 'failure' | 'warning';
  errorMessage?: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(tokenAuditLogs).values({
      tenantId: params.tenantId,
      userId: params.userId,
      tokenId: params.tokenId,
      action: params.action,
      status: params.status,
      errorMessage: params.errorMessage,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    });
  } catch (error) {
    console.error('[DotloopOAuth] Failed to log token audit:', error);
  }
}

/**
 * Get user's primary Dotloop token
 * Uses simplified query to avoid Drizzle typing issues
 */
async function getUserPrimaryToken(db: any, tenantId: number, userId: number) {
  const tokens = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, userId))
    .limit(10);

  // Filter in application layer to avoid complex Drizzle where clauses
  return tokens.find((t: any) => 
    t.tenantId === tenantId && 
    t.provider === 'dotloop' && 
    t.isActive === 1 && 
    t.isPrimary === 1
  );
}

/**
 * Get user's first active Dotloop token
 */
async function getUserFirstToken(db: any, tenantId: number, userId: number) {
  const tokens = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, userId))
    .limit(10);

  // Filter in application layer
  return tokens.find((t: any) => 
    t.tenantId === tenantId && 
    t.provider === 'dotloop' && 
    t.isActive === 1
  );
}

/**
 * Count user's Dotloop tokens
 */
async function countUserTokens(db: any, userId: number): Promise<number> {
  const tokens = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, userId));

  // Filter in application layer
  return tokens.filter((t: any) => t.provider === 'dotloop').length;
}

export const dotloopOAuthRouter = router({
  /**
   * Get authorization URL for OAuth flow
   * Returns the URL to redirect the user to for authorization
   */
  getAuthorizationUrl: publicProcedure
    .input(z.object({
      state: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        let { clientId, redirectUri } = getDotloopCredentials();
        // TEMPORARY: Override redirect URI for testing with Replit
        redirectUri = 'https://dotloopreport.replit.app/api/dotloop-oauth/callback';
        console.log('[dotloopOAuth.getAuthorizationUrl] TESTING with Replit callback:', redirectUri);
      
        // Generate CSRF state token if not provided
        const state = input.state || tokenEncryption.hashToken(
          `${Date.now()}-${Math.random()}`
        ).substring(0, 32);

        const params = new URLSearchParams({
          response_type: 'code',
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          redirect_on_deny: 'true',
          scope: 'account:read profile:* loop:* contact:* template:read',
        });

        const authUrl = `${DOTLOOP_AUTH_URL}?${params.toString()}`;
        console.log('[dotloopOAuth.getAuthorizationUrl] Generated authorization URL');
        
        return {
          url: authUrl,
          state,
        };
      } catch (error) {
        console.error('[dotloopOAuth.getAuthorizationUrl] Error:', error);
        throw error;
      }
    }),

  /**
   * Handle OAuth callback
   * Exchanges authorization code for access/refresh tokens
   */
  handleCallback: publicProcedure
    .input(z.object({
      code: z.string(),
      state: z.string(),
      ipAddress: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Ensure user is authenticated
      if (!ctx.user) {
        throw new Error('User must be authenticated to complete OAuth callback');
      }

      const { clientId, clientSecret, redirectUri } = getDotloopCredentials();
      const tenantId = await getTenantIdFromUser(ctx.user.id);

      try {
        // Exchange authorization code for tokens
        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          code: input.code,
          redirect_uri: redirectUri,
          state: input.state,
        });

        const response = await fetch(DOTLOOP_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Authorization': createBasicAuthHeader(clientId, clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString(),
        });

        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorJson = await response.json();
            errorDetails = JSON.stringify(errorJson);
          } catch {
            errorDetails = await response.text();
          }
          
          console.error('[DotloopOAuth] Token exchange failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorDetails,
          });
          
          throw new Error(
            `Token exchange failed: ${response.status} ${response.statusText}. ` +
            `Details: ${errorDetails}`
          );
        }

        const tokenData = await response.json();
        
        // Encrypt tokens before storage
        const encryptedAccessToken = tokenEncryption.encrypt(tokenData.access_token);
        const encryptedRefreshToken = tokenEncryption.encrypt(tokenData.refresh_token);
        const tokenHash = tokenEncryption.hashToken(tokenData.access_token);
        
        // Calculate expiration time
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

        // Check if this is the first connection for this user
        const tokenCount = await countUserTokens(db, ctx.user.id);
        const isFirstConnection = tokenCount === 0;

        // Store tokens in database
        const insertResult = await db.insert(oauthTokens).values({
          tenantId,
          userId: ctx.user.id,
          provider: 'dotloop',
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          encryptionKeyVersion: tokenEncryption.getCurrentKeyVersion(),
          tokenHash,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          isPrimary: isFirstConnection ? 1 : 0,
          isActive: 1,
        });

        const tokenId = Number((insertResult as any)[0]?.insertId || 0);

        // Fetch profile information from Dotloop
        try {
          // Fetch account details
          const accountResponse = await fetch(`${DOTLOOP_API_BASE}/account`, {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            
            // Fetch user's profiles
            const profilesResponse = await fetch(`${DOTLOOP_API_BASE}/profile`, {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (profilesResponse.ok) {
              const profilesData = await profilesResponse.json();
              
              // Get account email and name for auto-naming
              const accountEmail = accountData.data?.email || '';
              const accountName = accountData.data?.name || '';
              
              // Auto-generate connection name
              let connectionName = '';
              if (accountName) {
                connectionName = accountName;
              } else if (accountEmail) {
                connectionName = accountEmail.split('@')[0];
              } else {
                connectionName = `Dotloop Account ${tokenId}`;
              }
              
              // Update token record with account and profile info
              await db
                .update(oauthTokens)
                .set({
                  dotloopAccountId: accountData.data?.id,
                  dotloopAccountEmail: accountEmail,
                  dotloopAccountName: accountName,
                  connectionName: connectionName,
                  dotloopDefaultProfileId: accountData.data?.defaultProfileId,
                  dotloopProfileIds: JSON.stringify(profilesData.data?.map((p: any) => p.id) || []),
                })
                .where(eq(oauthTokens.id, tokenId));
              
              console.log('[DotloopOAuth] Profile info fetched:', {
                accountId: accountData.data?.id,
                defaultProfileId: accountData.data?.defaultProfileId,
                profileCount: profilesData.data?.length || 0,
              });
            }
          }
        } catch (error) {
          console.warn('[DotloopOAuth] Failed to fetch profile info:', error);
          // Non-critical - continue with token storage
        }

        // Log successful token creation
        await logTokenAudit({
          tenantId,
          userId: ctx.user.id,
          tokenId,
          action: 'token_created',
          status: 'success',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: {
            scope: tokenData.scope,
            expiresIn: tokenData.expires_in,
          },
        });

        return {
          success: true,
          tokenId,
          expiresAt: expiresAt,
          scope: tokenData.scope,
        };
      } catch (error) {
        // Log failed token creation
        await logTokenAudit({
          tenantId,
          userId: ctx.user.id,
          action: 'token_created',
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : String(error),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });

        throw error;
      }
    }),

  /**
   * Refresh access token
   * Called automatically when token expires or manually by user
   */
  refreshToken: protectedProcedure
    .input(z.object({
      ipAddress: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { clientId, clientSecret } = getDotloopCredentials();
      const tenantId = await getTenantIdFromUser(ctx.user.id);

      try {
        // Get existing token
        const existingToken = await getUserFirstToken(db, tenantId, ctx.user.id);

        if (!existingToken) {
          throw new Error('No Dotloop token found. Please connect your account first.');
        }

        // Decrypt refresh token
        const refreshToken = tokenEncryption.decrypt(existingToken.encryptedRefreshToken);

        // Request new access token
        const tokenParams = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        });

        const response = await fetch(DOTLOOP_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Authorization': createBasicAuthHeader(clientId, clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: tokenParams.toString(),
        });

        if (!response.ok) {
          let errorDetails = '';
          try {
            const errorJson = await response.json();
            errorDetails = JSON.stringify(errorJson);
          } catch {
            errorDetails = await response.text();
          }
          
          console.error('[DotloopOAuth] Token refresh failed:', {
            status: response.status,
            statusText: response.statusText,
            error: errorDetails,
          });
          
          throw new Error(
            `Token refresh failed: ${response.status} ${response.statusText}. ` +
            `Details: ${errorDetails}`
          );
        }

        const tokenData = await response.json();

        // Encrypt new tokens
        const encryptedAccessToken = tokenEncryption.encrypt(tokenData.access_token);
        const encryptedRefreshToken = tokenEncryption.encrypt(tokenData.refresh_token);
        const tokenHash = tokenEncryption.hashToken(tokenData.access_token);
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();

        // Update token in database
        await db
          .update(oauthTokens)
          .set({
            encryptedAccessToken,
            encryptedRefreshToken,
            tokenExpiresAt: expiresAt,
            tokenHash,
            lastRefreshedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
          })
          .where(eq(oauthTokens.id, existingToken.id));

        // Log successful token refresh
        await logTokenAudit({
          tenantId,
          userId: ctx.user.id,
          tokenId: existingToken.id,
          action: 'token_refreshed',
          status: 'success',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: {
            scope: tokenData.scope,
            expiresIn: tokenData.expires_in,
          },
        });

        return {
          success: true,
          expiresAt: expiresAt,
          scope: tokenData.scope,
        };
      } catch (error) {
        // Log failed token refresh
        await logTokenAudit({
          tenantId,
          userId: ctx.user.id,
          action: 'token_refreshed',
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : String(error),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });

        throw error;
      }
    }),

  /**
   * Revoke Dotloop access
   * Disconnects the user's Dotloop account
   */
  revokeAccess: protectedProcedure
    .input(z.object({
      ipAddress: z.string(),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { clientId, clientSecret } = getDotloopCredentials();
      const tenantId = await getTenantIdFromUser(ctx.user.id);

      try {
        // Get existing token
        const existingToken = await getUserFirstToken(db, tenantId, ctx.user.id);

        if (!existingToken) {
          throw new Error('No Dotloop token found');
        }

        // Decrypt access token
        const accessToken = tokenEncryption.decrypt(existingToken.encryptedAccessToken);

        // Revoke token with Dotloop
        const revokeParams = new URLSearchParams({
          token: accessToken,
        });

        const response = await fetch(DOTLOOP_REVOKE_URL, {
          method: 'POST',
          headers: {
            'Authorization': createBasicAuthHeader(clientId, clientSecret),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: revokeParams.toString(),
        });

        if (!response.ok) {
          console.warn(`Token revocation failed: ${response.status}`);
          // Continue anyway to delete local token
        }

        // Delete token from database
        await db
          .delete(oauthTokens)
          .where(eq(oauthTokens.id, existingToken.id));

        // Log successful token revocation
        await logTokenAudit({
          tenantId,
          userId: ctx.user.id,
          tokenId: existingToken.id,
          action: 'token_revoked',
          status: 'success',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });

        return { success: true };
      } catch (error) {
        // Log failed token revocation
        await logTokenAudit({
          tenantId,
          userId: ctx.user.id,
          action: 'token_revoked',
          status: 'failure',
          errorMessage: error instanceof Error ? error.message : String(error),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        });

        throw error;
      }
    }),

  /**
   * Get connection status
   * Returns whether the user has a valid Dotloop connection
   */
  setPrimaryConnection: protectedProcedure
    .input(z.object({
      connectionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Mark this connection as primary (stub implementation)
      return { success: true, connectionId: input.connectionId };
    }),

  deleteConnection: protectedProcedure
    .input(z.object({
      connectionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Delete connection (stub implementation)
      return { success: true, connectionId: input.connectionId };
    }),

  getConnectionStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      const token = await getUserFirstToken(db, tenantId, ctx.user.id);

      if (!token) {
        return {
          connected: false,
          message: 'Not connected to Dotloop',
        };
      }

      const now = new Date();
      const expiresAtDate = typeof token.tokenExpiresAt === 'string' 
        ? new Date(token.tokenExpiresAt) 
        : token.tokenExpiresAt;
      const isExpired = expiresAtDate < now;

      return {
        connected: true,
        tokenId: token.id,
        expiresAt: typeof token.tokenExpiresAt === 'string' 
          ? token.tokenExpiresAt 
          : (token.tokenExpiresAt as any).toISOString(),
        isExpired,
        lastUsedAt: token.lastUsedAt 
          ? (typeof token.lastUsedAt === 'string' 
            ? token.lastUsedAt 
            : (token.lastUsedAt as any).toISOString()) 
          : undefined,
        lastRefreshedAt: token.lastRefreshedAt 
          ? (typeof token.lastRefreshedAt === 'string' 
            ? token.lastRefreshedAt 
            : (token.lastRefreshedAt as any).toISOString()) 
          : undefined,
        connectedAt: typeof token.createdAt === 'string' 
          ? token.createdAt 
          : (token.createdAt as any).toISOString(),
        message: isExpired 
          ? 'Token expired - will be refreshed automatically on next use'
          : 'Connected to Dotloop',
      };
    }),
});
