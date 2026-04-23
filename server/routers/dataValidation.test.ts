import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataValidationRouter } from './dataValidationProcedures';
import { getDb } from '../db';

// Mock the database
vi.mock('../db', () => ({
  getDb: vi.fn(),
}));

// Mock tenant context
vi.mock('../lib/tenant-context', () => ({
  getTenantIdFromUser: vi.fn().mockResolvedValue(1),
}));

describe('Data Validation Router', () => {
  let mockDb: any;
  let mockCtx: any;

  beforeEach(() => {
    mockDb = {
      select: vi.fn(),
      insert: vi.fn(),
    };

    mockCtx = {
      user: {
        id: 123,
        email: 'test@example.com',
      },
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  describe('getRules', () => {
    it('should return default validation rules', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getRules();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('field');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('errorMessage');
    });

    it('should return rules with correct structure', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getRules();

      const rule = result[0];
      expect(rule).toMatchObject({
        id: expect.any(String),
        field: expect.any(String),
        type: expect.stringMatching(/required|format|range|pattern|custom/),
        operator: expect.any(String),
        value: expect.any(String),
        errorMessage: expect.any(String),
        isActive: expect.any(Boolean),
        createdAt: expect.any(Date),
      });
    });
  });

  describe('saveRule', () => {
    it('should successfully save a new rule', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      });

      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.saveRule({
        field: 'loopName',
        type: 'required',
        operator: 'exists',
        value: '',
        errorMessage: 'Loop name is required',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
      expect(result.ruleId).toBeDefined();
    });

    it('should successfully update an existing rule', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      });

      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.saveRule({
        id: 'rule-123',
        field: 'price',
        type: 'range',
        operator: 'greaterThan',
        value: '0',
        errorMessage: 'Price must be greater than 0',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated successfully');
    });

    it('should handle save errors', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Insert failed')),
      });

      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.saveRule({
        field: 'loopName',
        type: 'required',
        operator: 'exists',
        value: '',
        errorMessage: 'Loop name is required',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to save');
    });
  });

  describe('deleteRule', () => {
    it('should successfully delete a rule', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue({ insertId: 1 }),
      });

      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.deleteRule({ ruleId: 'rule-123' });

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should handle delete errors', async () => {
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockRejectedValue(new Error('Delete failed')),
      });

      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.deleteRule({ ruleId: 'rule-123' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to delete');
    });
  });

  describe('getStats', () => {
    it('should return validation statistics', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.getStats();

      expect(result).toMatchObject({
        totalRules: expect.any(Number),
        activeRules: expect.any(Number),
        inactiveRules: expect.any(Number),
        rulesByType: expect.objectContaining({
          required: expect.any(Number),
          format: expect.any(Number),
          range: expect.any(Number),
          pattern: expect.any(Number),
          custom: expect.any(Number),
        }),
      });
    });
  });

  describe('validateData', () => {
    it('should validate data successfully', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.validateData({
        data: {
          loopName: 'Test Property',
          loopStatus: 'Active',
          price: 500000,
        },
      });

      expect(result).toMatchObject({
        isValid: expect.any(Boolean),
        errors: expect.any(Array),
        validatedAt: expect.any(Date),
      });
    });

    it('should detect missing required fields', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.validateData({
        data: {
          loopStatus: 'Active',
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'loopName')).toBe(true);
    });

    it('should detect invalid price range', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.validateData({
        data: {
          loopName: 'Test Property',
          loopStatus: 'Active',
          price: -100,
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'price')).toBe(true);
    });

    it('should handle validation errors', async () => {
      const caller = dataValidationRouter.createCaller({ user: mockCtx.user });
      const result = await caller.validateData({
        data: {},
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
