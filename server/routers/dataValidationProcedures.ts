/**
 * Data Validation Procedures
 * 
 * Handles persistent data validation rules stored in database
 * Rules are applied during sync operations to validate incoming transactions
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { getTenantIdFromUser } from '../lib/tenant-context';
import { eq, and } from 'drizzle-orm';

// Validation rule types
export type ValidationRuleType = 'required' | 'format' | 'range' | 'pattern' | 'custom';

export interface ValidationRule {
  id: string;
  field: string;
  type: ValidationRuleType;
  operator: string;
  value: string;
  errorMessage: string;
  isActive: boolean;
  createdAt: Date;
}

// In-memory storage for validation rules (persisted via auditLogs)
const rulesStore = new Map<number, ValidationRule[]>();

export const dataValidationRouter = router({
  /**
   * Get all active validation rules for tenant
   */
  getRules: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      // Check in-memory store first
      if (rulesStore.has(tenantId)) {
        return rulesStore.get(tenantId) || [];
      }

      // Load from auditLogs if not in memory
      const logs = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, tenantId),
            eq(auditLogs.action, 'settings_changed')
          )
        );

      const rules: ValidationRule[] = [];
      logs.forEach(log => {
        const details = log.details ? JSON.parse(log.details) : {};
        if (details.type === 'validation_rule' && details.rule) {
          rules.push(details.rule);
        }
      });

      // Cache in memory
      rulesStore.set(tenantId, rules);
      return rules;
    } catch (error) {
      console.error('Error fetching validation rules:', error);
      return [];
    }
  }),

  /**
   * Save a validation rule (create or update)
   */
  saveRule: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        field: z.string(),
        type: z.enum(['required', 'format', 'range', 'pattern', 'custom']),
        operator: z.string(),
        value: z.string(),
        errorMessage: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const ruleId = input.id || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const rule: ValidationRule = {
          id: ruleId,
          field: input.field,
          type: input.type,
          operator: input.operator,
          value: input.value,
          errorMessage: input.errorMessage,
          isActive: true,
          createdAt: new Date(),
        };

        // Log the action
        await db.insert(auditLogs).values({
          tenantId,
          adminId: ctx.user.id,
          adminName: ctx.user.email || 'System',
          adminEmail: ctx.user.email,
          action: 'settings_changed',
          targetType: 'system',
          details: JSON.stringify({
            type: 'validation_rule',
            action: input.id ? 'updated' : 'created',
            rule,
          }),
        });

        // Update in-memory cache
        const rules = rulesStore.get(tenantId) || [];
        const existingIndex = rules.findIndex(r => r.id === ruleId);
        if (existingIndex >= 0) {
          rules[existingIndex] = rule;
        } else {
          rules.push(rule);
        }
        rulesStore.set(tenantId, rules);

        return {
          success: true,
          message: input.id ? 'Rule updated successfully' : 'Rule created successfully',
          ruleId,
        };
      } catch (error) {
        console.error('Error saving validation rule:', error);
        return {
          success: false,
          message: 'Failed to save validation rule',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Delete a validation rule
   */
  deleteRule: protectedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error('Database connection failed');

        const tenantId = await getTenantIdFromUser(ctx.user.id);

        // Log the action
        await db.insert(auditLogs).values({
          tenantId,
          adminId: ctx.user.id,
          adminName: ctx.user.email || 'System',
          adminEmail: ctx.user.email,
          action: 'settings_changed',
          targetType: 'system',
          details: JSON.stringify({
            type: 'validation_rule',
            action: 'deleted',
            ruleId: input.ruleId,
          }),
        });

        // Update in-memory cache
        const rules = rulesStore.get(tenantId) || [];
        const filtered = rules.filter(r => r.id !== input.ruleId);
        rulesStore.set(tenantId, filtered);

        return {
          success: true,
          message: 'Rule deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting validation rule:', error);
        return {
          success: false,
          message: 'Failed to delete validation rule',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get validation statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new Error('Database connection failed');

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      const rules = rulesStore.get(tenantId) || [];
      const activeRules = rules.filter(r => r.isActive);

      const rulesByType = {
        required: rules.filter(r => r.type === 'required').length,
        format: rules.filter(r => r.type === 'format').length,
        range: rules.filter(r => r.type === 'range').length,
        pattern: rules.filter(r => r.type === 'pattern').length,
        custom: rules.filter(r => r.type === 'custom').length,
      };

      return {
        totalRules: rules.length,
        activeRules: activeRules.length,
        inactiveRules: rules.length - activeRules.length,
        rulesByType,
        lastModified: rules.length > 0 ? rules[rules.length - 1].createdAt : null,
      };
    } catch (error) {
      console.error('Error fetching validation statistics:', error);
      return {
        totalRules: 0,
        activeRules: 0,
        inactiveRules: 0,
        rulesByType: {
          required: 0,
          format: 0,
          range: 0,
          pattern: 0,
          custom: 0,
        },
        lastModified: null,
      };
    }
  }),

  /**
   * Validate data against active rules
   * Returns validation errors if any rules are violated
   */
  validateData: protectedProcedure
    .input(
      z.object({
        data: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const rules = rulesStore.get(tenantId) || [];
        const activeRules = rules.filter(r => r.isActive);
        const errors: Array<{ field: string; message: string; ruleId: string }> = [];

        // Apply each validation rule
        for (const rule of activeRules) {
          const fieldValue = input.data[rule.field];

          switch (rule.type) {
            case 'required':
              if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
                errors.push({
                  field: rule.field,
                  message: rule.errorMessage,
                  ruleId: rule.id,
                });
              }
              break;

            case 'range':
              if (fieldValue !== undefined && fieldValue !== null) {
                const numValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(fieldValue);
                const rangeValue = parseFloat(rule.value);
                if (rule.operator === 'greaterThan' && numValue <= rangeValue) {
                  errors.push({
                    field: rule.field,
                    message: rule.errorMessage,
                    ruleId: rule.id,
                  });
                } else if (rule.operator === 'lessThan' && numValue >= rangeValue) {
                  errors.push({
                    field: rule.field,
                    message: rule.errorMessage,
                    ruleId: rule.id,
                  });
                }
              }
              break;

            case 'format':
              if (fieldValue !== undefined && fieldValue !== null) {
                const strValue = String(fieldValue);
                // Simple date format check
                if (rule.value === 'YYYY-MM-DD') {
                  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                  if (!dateRegex.test(strValue)) {
                    errors.push({
                      field: rule.field,
                      message: rule.errorMessage,
                      ruleId: rule.id,
                    });
                  }
                }
              }
              break;

            case 'pattern':
              if (fieldValue !== undefined && fieldValue !== null) {
                try {
                  const regex = new RegExp(rule.value);
                  if (!regex.test(String(fieldValue))) {
                    errors.push({
                      field: rule.field,
                      message: rule.errorMessage,
                      ruleId: rule.id,
                    });
                  }
                } catch (e) {
                  console.error('Invalid regex pattern:', rule.value);
                }
              }
              break;

            case 'custom':
              // Custom rules would require custom logic
              // For now, skip
              break;
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          validatedAt: new Date(),
          rulesApplied: activeRules.length,
        };
      } catch (error) {
        console.error('Error validating data:', error);
        return {
          isValid: false,
          errors: [
            {
              field: 'system',
              message: 'Validation failed due to system error',
              ruleId: 'system-error',
            },
          ],
          validatedAt: new Date(),
          rulesApplied: 0,
        };
      }
    }),

  /**
   * Apply validation rules during sync - blocks invalid transactions
   */
  applyValidationDuringSyncSync: protectedProcedure
    .input(
      z.object({
        transactions: z.array(z.record(z.string(), z.any())),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = await getTenantIdFromUser(ctx.user.id);

        const rules = rulesStore.get(tenantId) || [];
        const activeRules = rules.filter(r => r.isActive);

        const results = {
          validTransactions: [] as any[],
          invalidTransactions: [] as Array<{ data: any; errors: Array<{ field: string; message: string }> }>,
          totalProcessed: input.transactions.length,
        };

        for (const transaction of input.transactions) {
          const errors: Array<{ field: string; message: string }> = [];

          // Apply each validation rule
          for (const rule of activeRules) {
            const fieldValue = transaction[rule.field];

            if (rule.type === 'required' && (!fieldValue || fieldValue === '')) {
              errors.push({
                field: rule.field,
                message: rule.errorMessage,
              });
            } else if (rule.type === 'range' && fieldValue !== undefined) {
              const numValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(fieldValue);
              const rangeValue = parseFloat(rule.value);
              if (rule.operator === 'greaterThan' && numValue <= rangeValue) {
                errors.push({
                  field: rule.field,
                  message: rule.errorMessage,
                });
              }
            }
          }

          if (errors.length === 0) {
            results.validTransactions.push(transaction);
          } else {
            results.invalidTransactions.push({ data: transaction, errors });
          }
        }

        return {
          success: true,
          ...results,
        };
      } catch (error) {
        console.error('Error applying validation during sync:', error);
        return {
          success: false,
          validTransactions: [],
          invalidTransactions: [],
          totalProcessed: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});
