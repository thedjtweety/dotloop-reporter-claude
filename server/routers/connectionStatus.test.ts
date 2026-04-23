import { describe, it, expect, beforeEach, vi } from 'vitest';
import { connectionStatusRouter } from './connectionStatusProcedures';
import { getDb } from '../db';
import { oauthTokens } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

describe('Connection Status Router', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      delete: vi.fn(),
    };

    mockCtx = {
      user: {
        id: 123,
        email: 'test@example.com',
      },
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe('getStatus', () => {
    it('should return connected status when valid token exists', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              userId: 123,
              accessToken: 'valid-token',
              tokenExpiresAt: futureDate,
              createdAt: new Date().toISOString(),
              lastUsedAt: new Date().toISOString(),
            },
          ]),
        }),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStatus();

      expect(result.isConnected).toBe(true);
      expect(result.provider).toBe('dotloop');
      expect(result.connectedAt).toBeDefined();
    });

    it('should return not connected when no token exists', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStatus();

      expect(result.isConnected).toBe(false);
      expect(result.provider).toBe('dotloop');
    });

    it('should return not connected when token is expired', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              userId: 123,
              accessToken: 'expired-token',
              tokenExpiresAt: pastDate,
              createdAt: new Date().toISOString(),
            },
          ]),
        }),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStatus();

      expect(result.isConnected).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB Error')),
        }),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStatus();

      expect(result.isConnected).toBe(false);
      expect(result.error).toBe('Failed to check connection status');
    });
  });

  describe('disconnect', () => {
    it('should successfully disconnect Dotloop account', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.disconnect();

      expect(result.success).toBe(true);
      expect(result.message).toContain('disconnected successfully');
    });

    it('should handle disconnect errors', async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('Delete failed')),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.disconnect();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to disconnect');
    });
  });

  describe('getReconnectUrl', () => {
    it('should generate valid reconnect URL', async () => {
      process.env.DOTLOOP_CLIENT_ID = 'test-client-id';
      process.env.DOTLOOP_REDIRECT_URI = 'https://example.com/callback';

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getReconnectUrl();

      expect(result.url).toBeDefined();
      expect(result.url).toContain('https://auth.dotloop.com/oauth/authorize');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('redirect_uri=');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=read+write');
    });

    it('should handle missing OAuth credentials', async () => {
      process.env.DOTLOOP_CLIENT_ID = undefined;
      process.env.DOTLOOP_REDIRECT_URI = undefined;

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getReconnectUrl();

      expect(result.url).toBeNull();
      expect(result.message).toContain('Failed to generate reconnect URL');
    });
  });

  describe('End-to-End Disconnect/Reconnect Flow', () => {
    it('should complete full disconnect and reconnect cycle', async () => {
      // Step 1: Check initial status (connected)
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              userId: 123,
              accessToken: 'valid-token',
              tokenExpiresAt: futureDate,
              createdAt: new Date().toISOString(),
            },
          ]),
        }),
      });

      const caller = connectionStatusRouter.createCaller({ user: mockCtx.user });
      const initialStatus = await caller.getStatus();
      expect(initialStatus.isConnected).toBe(true);

      // Step 2: Disconnect
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
      });

      const disconnectResult = await caller.disconnect();
      expect(disconnectResult.success).toBe(true);

      // Step 3: Check status after disconnect (not connected)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const disconnectedStatus = await caller.getStatus();
      expect(disconnectedStatus.isConnected).toBe(false);

      // Step 4: Get reconnect URL
      process.env.DOTLOOP_CLIENT_ID = 'test-client-id';
      process.env.DOTLOOP_REDIRECT_URI = 'https://example.com/callback';

      const reconnectUrl = await caller.getReconnectUrl();
      expect(reconnectUrl.url).toBeDefined();
      expect(reconnectUrl.url).toContain('https://auth.dotloop.com/oauth/authorize');
    });
  });
});
