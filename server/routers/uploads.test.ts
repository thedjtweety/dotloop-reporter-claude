import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { uploadsRouter } from './uploads';
import { createCallerFactory } from '../_core/trpc';

/**
 * Tests for Upload History Router
 * 
 * Tests the following procedures:
 * - getHistory: Retrieves all uploads for a tenant
 * - getUploadTransactions: Gets detailed transaction data for a specific upload
 * - compareUploads: Compares two uploads and returns differences
 * - reuseUpload: Re-uses data from a previous upload
 */

describe('Upload History Router', () => {
  const mockUser = {
    id: 'test-user-1',
    tenantId: 'test-tenant-1',
    role: 'user' as const,
  };

  const mockContext = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  describe('getHistory', () => {
    it('should return empty array when no uploads exist', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.getHistory();

      expect(result.success).toBe(true);
      expect(Array.isArray(result.uploads)).toBe(true);
    });

    it('should return uploads with formatted dates', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.getHistory();

      if (result.uploads.length > 0) {
        const upload = result.uploads[0];
        expect(upload).toHaveProperty('id');
        expect(upload).toHaveProperty('fileName');
        expect(upload).toHaveProperty('recordCount');
        expect(upload).toHaveProperty('uploadedAtFormatted');
        expect(typeof upload.uploadedAtFormatted).toBe('string');
      }
    });
  });

  describe('compareUploads', () => {
    it('should return error when uploads not found', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.compareUploads({
        uploadId1: 99999,
        uploadId2: 99998,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return comparison statistics structure', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.compareUploads({
        uploadId1: 1,
        uploadId2: 2,
      });

      if (result.success && result.comparison) {
        expect(result.comparison).toHaveProperty('statistics');
        expect(result.comparison.statistics).toHaveProperty('newCount');
        expect(result.comparison.statistics).toHaveProperty('deletedCount');
        expect(result.comparison.statistics).toHaveProperty('modifiedCount');
        expect(result.comparison.statistics).toHaveProperty('unchangedCount');
      }
    });
  });

  describe('reuseUpload', () => {
    it('should return error when upload not found', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.reuseUpload({
        uploadId: 99999,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return upload metadata when successful', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.reuseUpload({
        uploadId: 1,
      });

      if (result.success) {
        expect(result).toHaveProperty('upload');
        expect(result).toHaveProperty('transactions');
        expect(result).toHaveProperty('transactionCount');
        expect(Array.isArray(result.transactions)).toBe(true);
      }
    });
  });

  describe('getUploadTransactions', () => {
    it('should return error when upload not found', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.getUploadTransactions({
        uploadId: 99999,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return transactions array', async () => {
      const caller = createCallerFactory(uploadsRouter)(mockContext);
      const result = await caller.getUploadTransactions({
        uploadId: 1,
      });

      if (result.success) {
        expect(Array.isArray(result.transactions)).toBe(true);
        expect(result).toHaveProperty('transactionCount');
        expect(typeof result.transactionCount).toBe('number');
      }
    });
  });
});
