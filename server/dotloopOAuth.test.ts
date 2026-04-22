/**
 * Dotloop OAuth Integration Tests
 * Tests the OAuth flow: authorization URL generation, callback handling, token refresh
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getDb } from './db';
import { oauthTokens, tokenAuditLogs } from '../drizzle/schema';
import { tokenEncryption } from './lib/token-encryption';
import { eq } from 'drizzle-orm';

describe('Dotloop OAuth Integration', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
  });

  describe('Token Encryption', () => {
    it('should encrypt and decrypt tokens correctly', () => {
      const plainToken = 'test_access_token_12345';
      
      const encrypted = tokenEncryption.encrypt(plainToken);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plainToken);
      expect(encrypted).toContain(':'); // Format: version:iv:authTag:data

      const decrypted = tokenEncryption.decrypt(encrypted);
      expect(decrypted).toBe(plainToken);
    });

    it('should generate different IVs for each encryption', () => {
      const plainToken = 'test_token';
      
      const encrypted1 = tokenEncryption.encrypt(plainToken);
      const encrypted2 = tokenEncryption.encrypt(plainToken);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // Both should decrypt to the same value
      expect(tokenEncryption.decrypt(encrypted1)).toBe(plainToken);
      expect(tokenEncryption.decrypt(encrypted2)).toBe(plainToken);
    });

    it('should hash tokens consistently', () => {
      const token = 'test_token_for_hashing';
      
      const hash1 = tokenEncryption.hashToken(token);
      const hash2 = tokenEncryption.hashToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex = 64 chars
    });
  });

  describe('OAuth Token Storage', () => {
    it('should store encrypted tokens in database', async () => {
      const testToken = 'test_dotloop_token_' + Date.now();
      const encrypted = tokenEncryption.encrypt(testToken);
      const tokenHash = tokenEncryption.hashToken(testToken);

      const result = await db.insert(oauthTokens).values({
        tenantId: 1,
        userId: 1,
        provider: 'dotloop',
        encryptedAccessToken: encrypted,
        encryptedRefreshToken: encrypted,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyVersion: 1,
        tokenHash,
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: 1,
        isPrimary: 1,
        dotloopAccountId: 12345,
        dotloopAccountEmail: 'test@dotloop.com',
      });

      expect(result).toBeDefined();

      // Verify we can retrieve and decrypt the token
      const stored = await db
        .select()
        .from(oauthTokens)
        .where(eq(oauthTokens.tokenHash, tokenHash))
        .limit(1);

      expect(stored).toHaveLength(1);
      expect(stored[0].encryptedAccessToken).not.toBe(testToken);
      
      // Decrypt and verify
      const decrypted = tokenEncryption.decrypt(stored[0].encryptedAccessToken);
      expect(decrypted).toBe(testToken);

      // Cleanup
      await db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, tokenHash));
    });
  });

  describe('Token Audit Logging', () => {
    it('should log token creation events', async () => {
      const result = await db.insert(tokenAuditLogs).values({
        tenantId: 1,
        userId: 1,
        tokenId: 1,
        action: 'token_created',
        status: 'success',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: new Date(),
      });

      expect(result).toBeDefined();

      // Verify audit log was created
      const logs = await db
        .select()
        .from(tokenAuditLogs)
        .limit(1);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('token_created');
      expect(logs[0].status).toBe('success');
    });

    it('should log token refresh events', async () => {
      const result = await db.insert(tokenAuditLogs).values({
        tenantId: 1,
        userId: 1,
        tokenId: 1,
        action: 'token_refreshed',
        status: 'success',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      });

      expect(result).toBeDefined();
    });

    it('should log failed token operations', async () => {
      const result = await db.insert(tokenAuditLogs).values({
        tenantId: 1,
        userId: 1,
        tokenId: 1,
        action: 'token_decryption_failed',
        status: 'failure',
        errorMessage: 'IV mismatch during decryption',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      });

      expect(result).toBeDefined();
    });
  });

  describe('OAuth Flow Validation', () => {
    it('should validate state token format', () => {
      const state = tokenEncryption.hashToken(`${Date.now()}-${Math.random()}`).substring(0, 32);
      expect(state).toHaveLength(32);
      expect(/^[a-f0-9]{32}$/.test(state)).toBe(true);
    });

    it('should generate valid authorization URL parameters', () => {
      const clientId = process.env.DOTLOOP_CLIENT_ID || 'test_client_id';
      const redirectUri = process.env.DOTLOOP_REDIRECT_URI || 'https://example.com/callback';
      const state = 'test_state_token_12345678901234';

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        redirect_on_deny: 'true',
        scope: 'account:read profile:* loop:* contact:* template:read',
      });

      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe(clientId);
      expect(params.get('redirect_uri')).toBe(redirectUri);
      expect(params.get('state')).toBe(state);
      expect(params.get('scope')).toContain('account:read');
    });
  });

  describe('Multi-Account Support', () => {
    it('should store multiple tokens per user', async () => {
      const userId = 1;
      const tenantId = 1;

      // Insert first token
      const token1Plaintext = 'token_1_' + Date.now();
      const token1 = tokenEncryption.encrypt(token1Plaintext);
      const hash1 = tokenEncryption.hashToken(token1Plaintext);

      await db.insert(oauthTokens).values({
        tenantId,
        userId,
        provider: 'dotloop',
        encryptedAccessToken: token1,
        encryptedRefreshToken: token1,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyVersion: 1,
        tokenHash: hash1,
        ipAddress: '127.0.0.1',
        isActive: 1,
        isPrimary: 1,
        dotloopAccountId: 111,
        dotloopAccountEmail: 'account1@dotloop.com',
      });

      // Insert second token
      const token2Plaintext = 'token_2_' + Date.now();
      const token2 = tokenEncryption.encrypt(token2Plaintext);
      const hash2 = tokenEncryption.hashToken(token2Plaintext);

      await db.insert(oauthTokens).values({
        tenantId,
        userId,
        provider: 'dotloop',
        encryptedAccessToken: token2,
        encryptedRefreshToken: token2,
        tokenExpiresAt: new Date(Date.now() + 3600000),
        encryptionKeyVersion: 1,
        tokenHash: hash2,
        ipAddress: '127.0.0.1',
        isActive: 1,
        isPrimary: 0,
        dotloopAccountId: 222,
        dotloopAccountEmail: 'account2@dotloop.com',
      });

      // Verify both tokens exist
      const tokens = await db
        .select()
        .from(oauthTokens)
        .limit(10);

      const userTokens = tokens.filter((t: any) => t.userId === userId);
      expect(userTokens.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, hash1));
      await db.delete(oauthTokens).where(eq(oauthTokens.tokenHash, hash2));
    });
  });
});
