/**
 * OAuth Token Retrieval Helper
 * 
 * Centralized helper for fetching, decrypting, and refreshing Dotloop OAuth tokens.
 * Features:
 * - Automatic token decryption
 * - Expiration checking with 5-minute buffer
 * - Automatic token refresh with retry logic
 * - Token caching to reduce database queries
 * - Comprehensive error handling
 */

import { getDb } from '../db';
import { oauthTokens } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { tokenEncryption } from './token-encryption';

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenId: number;
  profileId?: number;
  accountId?: number;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

// In-memory token cache to reduce database queries
// Cache structure: Map<userId-tenantId, { token: TokenData, cachedAt: number }>
const tokenCache = new Map<string, { token: TokenData; cachedAt: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute cache TTL
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5 minutes before expiry

/**
 * Get cache key for a user-tenant combination
 */
function getCacheKey(userId: number, tenantId: number): string {
  return `${userId}-${tenantId}`;
}

/**
 * Check if cached token is still valid
 */
function isCacheValid(cachedAt: number): boolean {
  return Date.now() - cachedAt < CACHE_TTL;
}

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired(expiresAt: string): boolean {
  const expiryTime = new Date(expiresAt).getTime();
  const now = Date.now();
  return expiryTime - now < TOKEN_EXPIRY_BUFFER;
}

/**
 * Refresh an expired OAuth token
 * 
 * @param refreshToken - The encrypted refresh token
 * @param tokenId - The token record ID
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param retries - Number of retry attempts (default: 3)
 * @returns Refreshed token data
 */
async function refreshOAuthToken(
  refreshToken: string,
  tokenId: number,
  tenantId: number,
  userId: number,
  retries: number = 3
): Promise<RefreshResult> {
  const DOTLOOP_TOKEN_URL = 'https://auth.dotloop.com/oauth/token';
  const clientId = process.env.DOTLOOP_CLIENT_ID;
  const clientSecret = process.env.DOTLOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Dotloop OAuth credentials not configured');
  }

  // Decrypt the refresh token
  const decryptedRefreshToken = tokenEncryption.decrypt(refreshToken);

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[OAuthTokenHelper] Refreshing token (attempt ${attempt}/${retries})`);

      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: decryptedRefreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await fetch(DOTLOOP_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Token refresh failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
        );
      }

      const tokenData = await response.json();

      // Encrypt new tokens
      const encryptedAccessToken = tokenEncryption.encrypt(tokenData.access_token);
      const encryptedRefreshToken = tokenEncryption.encrypt(tokenData.refresh_token);
      const tokenHash = tokenEncryption.hashToken(tokenData.access_token);
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Update token in database
      const db = await getDb();
      if (!db) throw new Error('Database connection not available');
      await db
        .update(oauthTokens)
        .set({
          encryptedAccessToken,
          encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          tokenHash,
          lastRefreshedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(oauthTokens.id, tokenId));

      console.log(`[OAuthTokenHelper] Token refreshed successfully`);

      // Invalidate cache for this user
      const cacheKey = getCacheKey(userId, tenantId);
      tokenCache.delete(cacheKey);

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
      };
    } catch (error) {
      lastError = error as Error;
      console.error(`[OAuthTokenHelper] Token refresh attempt ${attempt} failed:`, error);

      // Exponential backoff: wait 2^attempt seconds before retry
      if (attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[OAuthTokenHelper] Waiting ${backoffMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }
  }

  throw new Error(
    `Failed to refresh token after ${retries} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Get valid OAuth token for a user
 * 
 * Automatically handles:
 * - Token decryption
 * - Expiration checking
 * - Token refresh if expired
 * - Caching to reduce database queries
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 * @param provider - OAuth provider (default: 'dotloop')
 * @returns Token data with decrypted access token
 * @throws Error if no token found or refresh fails
 */
export async function getValidOAuthToken(
  userId: number,
  tenantId: number,
  provider: string = 'dotloop'
): Promise<TokenData> {
  const cacheKey = getCacheKey(userId, tenantId);

  // Check cache first
  const cached = tokenCache.get(cacheKey);
  if (cached && isCacheValid(cached.cachedAt)) {
    // Check if cached token is still valid (not expired)
    if (!isTokenExpired(cached.token.expiresAt)) {
      console.log(`[OAuthTokenHelper] Returning cached token for user ${userId}`);
      return cached.token;
    }
    // Cached token is expired, remove from cache
    tokenCache.delete(cacheKey);
  }

  // Fetch token from database
  const db = await getDb();
  if (!db) throw new Error('Database connection not available');
  const tokenRecords = await db
    .select()
    .from(oauthTokens)
    .where(eq(oauthTokens.userId, userId))
    .limit(10);
  
  // Filter in application layer to avoid Drizzle typing issues
  const tokenRecord = tokenRecords.find(t => 
    t.tenantId === tenantId && t.provider === provider
  );

  if (!tokenRecord) {
    throw new Error(`No OAuth token found for user ${userId} and provider ${provider}`);
  }

  // Decrypt tokens
  let accessToken = tokenEncryption.decrypt(tokenRecord.encryptedAccessToken);
  let refreshToken = tokenRecord.encryptedRefreshToken;
  let expiresAt = tokenRecord.tokenExpiresAt;

  // Check if token is expired or about to expire
  if (isTokenExpired(expiresAt)) {
    console.log(`[OAuthTokenHelper] Token expired or expiring soon, refreshing...`);
    
    try {
      const refreshed = await refreshOAuthToken(
        refreshToken,
        tokenRecord.id,
        tenantId,
        userId
      );
      
      accessToken = refreshed.accessToken;
      expiresAt = refreshed.expiresAt;
    } catch (error) {
      console.error(`[OAuthTokenHelper] Failed to refresh token:`, error);
      throw new Error(`Token expired and refresh failed: ${(error as Error).message}`);
    }
  }

  const tokenData: TokenData = {
    accessToken,
    refreshToken,
    expiresAt,
    tokenId: tokenRecord.id,
    profileId: tokenRecord.dotloopProfileId || undefined,
    accountId: tokenRecord.dotloopAccountId || undefined,
  };

  // Cache the token
  tokenCache.set(cacheKey, {
    token: tokenData,
    cachedAt: Date.now(),
  });

  // Update last used timestamp
  const db2 = await getDb();
  if (!db2) throw new Error('Database connection not available');
  await db2
    .update(oauthTokens)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(oauthTokens.id, tokenRecord.id));

  return tokenData;
}

/**
 * Invalidate cached token for a user
 * 
 * Call this after token revocation or manual token updates
 * 
 * @param userId - The user ID
 * @param tenantId - The tenant ID
 */
export function invalidateTokenCache(userId: number, tenantId: number): void {
  const cacheKey = getCacheKey(userId, tenantId);
  tokenCache.delete(cacheKey);
  console.log(`[OAuthTokenHelper] Cache invalidated for user ${userId}`);
}

/**
 * Clear all cached tokens
 * 
 * Useful for testing or maintenance
 */
export function clearTokenCache(): void {
  tokenCache.clear();
  console.log(`[OAuthTokenHelper] All token cache cleared`);
}

/**
 * Get cache statistics
 * 
 * Useful for monitoring and debugging
 */
export function getTokenCacheStats(): {
  size: number;
  entries: Array<{ key: string; cachedAt: number; expiresAt: string }>;
} {
  const entries = Array.from(tokenCache.entries()).map(([key, value]) => ({
    key,
    cachedAt: value.cachedAt,
    expiresAt: value.token.expiresAt,
  }));

  return {
    size: tokenCache.size,
    entries,
  };
}
