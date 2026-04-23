import { describe, it, expect, beforeEach, vi } from 'vitest';
import { syncHistoryRouter } from './syncHistoryProcedures';
import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { eq, desc, and } from 'drizzle-orm';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

// Mock tenant context
vi.mock('../lib/tenant-context', () => ({
  getTenantIdFromUser: vi.fn().mockResolvedValue(1),
}));

describe('Sync History Router', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    mockCtx = {
      user: {
        id: 123,
        email: 'test@example.com',
      },
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe('getLogs', () => {
    it('should return empty array when no logs exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getLogs();

      expect(result).toEqual([]);
    });

    it('should return formatted sync logs', async () => {
      const mockLogs = [
        {
          id: 1,
          tenantId: 1,
          action: 'data_exported',
          createdAt: '2026-04-23T12:00:00.000Z',
          details: JSON.stringify({
            status: 'completed',
            transactionsFetched: 100,
            transactionsCreated: 50,
            transactionsUpdated: 30,
            duration: 5000,
          }),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockLogs),
              }),
            }),
          }),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getLogs();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: '1',
        status: 'completed',
        transactionsFetched: 100,
        transactionsCreated: 50,
        transactionsUpdated: 30,
        duration: 5000,
      });
    });

    it('should handle pagination', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getLogs({ limit: 25, offset: 50 });

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return default stats when no logs exist', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStats();

      expect(result).toMatchObject({
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        successRate: 0,
        totalTransactionsFetched: 0,
        totalTransactionsCreated: 0,
        totalTransactionsUpdated: 0,
        averageDuration: 0,
        lastSync: null,
      });
    });

    it('should calculate stats correctly', async () => {
      const mockLogs = [
        {
          id: 1,
          createdAt: '2026-04-23T12:00:00.000Z',
          details: JSON.stringify({
            status: 'completed',
            transactionsFetched: 100,
            transactionsCreated: 50,
            transactionsUpdated: 30,
            duration: 5000,
          }),
        },
        {
          id: 2,
          createdAt: '2026-04-22T12:00:00.000Z',
          details: JSON.stringify({
            status: 'completed',
            transactionsFetched: 80,
            transactionsCreated: 40,
            transactionsUpdated: 20,
            duration: 4000,
          }),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockLogs),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStats();

      expect(result).toMatchObject({
        totalSyncs: 2,
        successfulSyncs: 2,
        failedSyncs: 0,
        successRate: 100,
        totalTransactionsFetched: 180,
        totalTransactionsCreated: 90,
        totalTransactionsUpdated: 50,
        averageDuration: 4500,
      });
    });
  });

  describe('triggerManualSync', () => {
    it('should successfully trigger manual sync', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.triggerManualSync();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Manual sync triggered successfully');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle sync errors', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Insert failed')),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.triggerManualSync();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to trigger manual sync');
    });
  });

  describe('getLogDetails', () => {
    it('should return log details', async () => {
      const mockLog = {
        id: 1,
        tenantId: 1,
        createdAt: '2026-04-23T12:00:00.000Z',
        details: JSON.stringify({
          status: 'completed',
          transactionsFetched: 100,
          transactionsCreated: 50,
          transactionsUpdated: 30,
          duration: 5000,
        }),
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockLog]),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getLogDetails({ logId: '1' });

      expect(result).toMatchObject({
        id: '1',
        status: 'completed',
        transactionsFetched: 100,
        transactionsCreated: 50,
        transactionsUpdated: 30,
        duration: 5000,
      });
    });

    it('should return null when log not found', async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const caller = syncHistoryRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getLogDetails({ logId: '999' });

      expect(result).toBeNull();
    });
  });
});
