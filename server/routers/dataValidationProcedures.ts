/**
 * Data Validation Procedures
 * 
 * Handles data validation rules management
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { auditLogs } from '../../drizzle/schema';
import { getTenantIdFromUser } from '../lib/tenant-context';

export const dataValidationRouter = router({
  /**
   * Get all validation rules
   */
  getRules: protectedProcedure.query(async ({ ctx }) => {
    try {
      const tenantId = await getTenantIdFromUser(ctx.user.id);

      // Mock data - in a real implementation, this would query from database
      const rules = [
        {
          id: '1',
          field: 'loopName',
          type: 'required' as const,
          operator: 'exists',
          value: '',
          errorMessage: 'Loop name is required',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '2',
          field: 'loopStatus',
          type: 'required' as const,
          operator: 'exists',
          value: '',
          errorMessage: 'Loop status is required',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '3',
          field: 'price',
          type: 'range' as const,
          operator: 'greaterThan',
          value: '0',
          errorMessage: 'Price must be greater than 0',
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '4',
          field: 'closingDate',
          type: 'format' as const,
          operator: 'matches',
          value: 'YYYY-MM-DD',
          errorMessage: 'Closing date must be in YYYY-MM-DD format',
          isActive: true,
          createdAt: new Date(),
        },
      ];

      return rules;
    } catch (error) {
      console.error('Error fetching validation rules:', error);
      return [];
    }
  }),

  /**
   * Save a validation rule
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
            field: input.field,
            ruleType: input.type,
          }),
        });

        return {
          success: true,
          message: input.id ? 'Rule updated successfully' : 'Rule created successfully',
          ruleId: input.id || `rule-${Date.now()}`,
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
      const tenantId = await getTenantIdFromUser(ctx.user.id);

      // Mock data - in a real implementation, this would query from database
      return {
        totalRules: 4,
        activeRules: 4,
        inactiveRules: 0,
        rulesByType: {
          required: 2,
          format: 1,
          range: 1,
          pattern: 0,
          custom: 0,
        },
        lastModified: new Date(),
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
   * Validate data against rules
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

        // Mock validation - in a real implementation, this would apply all rules
        const errors: Array<{ field: string; message: string }> = [];

        // Check required fields
        if (!input.data.loopName) {
          errors.push({
            field: 'loopName',
            message: 'Loop name is required',
          });
        }

        if (!input.data.loopStatus) {
          errors.push({
            field: 'loopStatus',
            message: 'Loop status is required',
          });
        }

        // Check price range
        if (input.data.price && typeof input.data.price === 'number' && input.data.price <= 0) {
          errors.push({
            field: 'price',
            message: 'Price must be greater than 0',
          });
        }

        return {
          isValid: errors.length === 0,
          errors,
          validatedAt: new Date(),
        };
      } catch (error) {
        console.error('Error validating data:', error);
        return {
          isValid: false,
          errors: [
            {
              field: 'system',
              message: 'Validation failed due to system error',
            },
          ],
          validatedAt: new Date(),
        };
      }
    }),
});
