import { describe, it, expect } from 'vitest';
import {
  normalizeTransaction,
  normalizeTransactionBatch,
  calculateDataQuality,
} from './lib/data-normalizer';

describe('Data Normalizer', () => {
  describe('normalizeTransaction', () => {
    it('should normalize a valid transaction', () => {
      const record = {
        loopName: '  123 Main St  ',
        loopStatus: 'Closed',
        price: '$250,000.00',
        closingDate: '12/15/2024',
        address: '123 Main St',
        city: 'Austin',
        state: 'TX',
      };

      const result = normalizeTransaction(record);
      expect(result).not.toBeNull();
      expect(result?.loopName).toBe('123 Main St');
      expect(result?.loopStatus).toBe('Closed');
      expect(result?.price).toBe(250000);
      expect(result?.closingDate).toBe('2024-12-15');
      expect(result?.city).toBe('Austin');
      expect(result?.isClosed).toBe(true);
    });

    it('should handle missing required fields', () => {
      const record = {
        loopName: '',
        loopStatus: 'Closed',
        price: 250000,
      };

      const result = normalizeTransaction(record);
      expect(result).toBeNull();
    });

    it('should normalize currency values', () => {
      const record = {
        loopName: 'Test Loop',
        loopStatus: 'Active',
        price: '$1,250,000.99',
        earnestMoney: '$50,000',
        salePrice: '$1,250,000',
      };

      const result = normalizeTransaction(record);
      expect(result?.price).toBe(1250000.99);
      expect(result?.earnestMoney).toBe(50000);
      expect(result?.salePrice).toBe(1250000);
    });

    it('should parse various date formats', () => {
      const testCases = [
        { input: '12/15/2024', expected: '2024-12-15' },
        { input: '2024-12-15', expected: '2024-12-15' },
        { input: '15-12-2024', expected: '2024-12-15' },
      ];

      for (const testCase of testCases) {
        const record = {
          loopName: 'Test',
          loopStatus: 'Active',
          price: 100000,
          closingDate: testCase.input,
        };

        const result = normalizeTransaction(record);
        expect(result?.closingDate).toBe(testCase.expected);
      }
    });

    it('should calculate days to close', () => {
      const record = {
        loopName: 'Test Loop',
        loopStatus: 'Closed',
        price: 250000,
        listingDate: '01/01/2024',
        closingDate: '01/31/2024',
      };

      const result = normalizeTransaction(record);
      expect(result?.daysToClose).toBe(30);
    });

    it('should determine status flags correctly', () => {
      const activeListing = {
        loopName: 'Active',
        loopStatus: 'Active',
        price: 100000,
      };
      const closedDeal = {
        loopName: 'Closed',
        loopStatus: 'Closed',
        price: 100000,
      };
      const archived = {
        loopName: 'Archived',
        loopStatus: 'Archived',
        price: 100000,
      };

      const activeResult = normalizeTransaction(activeListing);
      const closedResult = normalizeTransaction(closedDeal);
      const archivedResult = normalizeTransaction(archived);

      expect(activeResult?.isActive).toBe(true);
      expect(activeResult?.isClosed).toBe(false);
      expect(activeResult?.isArchived).toBe(false);

      expect(closedResult?.isActive).toBe(false);
      expect(closedResult?.isClosed).toBe(true);
      expect(closedResult?.isArchived).toBe(false);

      expect(archivedResult?.isActive).toBe(false);
      expect(archivedResult?.isClosed).toBe(false);
      expect(archivedResult?.isArchived).toBe(true);
    });

    it('should normalize tags', () => {
      const record = {
        loopName: 'Test',
        loopStatus: 'Active',
        price: 100000,
        tags: 'tag1, tag2, tag3',
      };

      const result = normalizeTransaction(record);
      expect(result?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('normalizeTransactionBatch', () => {
    it('should normalize a batch of transactions', () => {
      const records = [
        {
          loopName: 'Loop 1',
          loopStatus: 'Active',
          price: 100000,
        },
        {
          loopName: 'Loop 2',
          loopStatus: 'Closed',
          price: 250000,
        },
        {
          loopName: 'Loop 3',
          loopStatus: 'Active',
          price: 150000,
        },
      ];

      const result = normalizeTransactionBatch(records);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
    });

    it('should handle mixed valid and invalid records', () => {
      const records = [
        {
          loopName: 'Valid Loop',
          loopStatus: 'Active',
          price: 100000,
        },
        {
          loopName: '',
          loopStatus: 'Active',
          price: 100000,
        },
        {
          loopName: 'Another Valid',
          loopStatus: 'Closed',
          price: 250000,
        },
      ];

      const result = normalizeTransactionBatch(records);
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].index).toBe(1);
    });
  });

  describe('calculateDataQuality', () => {
    it('should calculate data quality score', () => {
      const transactions = [
        normalizeTransaction({
          loopName: 'Loop 1',
          loopStatus: 'Closed',
          price: 100000,
          closingDate: '12/15/2024',
          address: '123 Main St',
          city: 'Austin',
          state: 'TX',
        }),
        normalizeTransaction({
          loopName: 'Loop 2',
          loopStatus: 'Active',
          price: 250000,
          closingDate: '01/15/2025',
          address: '456 Oak Ave',
          city: 'Dallas',
          state: 'TX',
        }),
      ].filter((t) => t !== null) as any[];

      const quality = calculateDataQuality(transactions);
      expect(quality.score).toBeGreaterThan(0);
      expect(quality.score).toBeLessThanOrEqual(100);
      expect(quality.completeness).toBeGreaterThan(0);
      expect(quality.validity).toBeGreaterThan(0);
      expect(quality.consistency).toBeGreaterThan(0);
    });

    it('should return zero scores for empty batch', () => {
      const quality = calculateDataQuality([]);
      expect(quality.score).toBe(0);
      expect(quality.completeness).toBe(0);
      expect(quality.validity).toBe(0);
      expect(quality.consistency).toBe(0);
    });
  });
});
