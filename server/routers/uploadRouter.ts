/**
 * Upload Router - Priority 2.1: CSV Upload & Validation
 * Handles file uploads, validation, and data quality checks
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { uploads } from '../../drizzle/schema';
import { getDb } from '../db';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit-logger';

const UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['text/csv', 'application/vnd.ms-excel'];

export interface UploadValidationResult {
  isValid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  dataQuality: number; // 0-100
  warnings: string[];
  errors: string[];
  fieldCompleteness: Record<string, number>;
  missingFields: string[];
}

export const uploadRouter = router({
  /**
   * Validate uploaded CSV file
   */
  validateCSV: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        fileSize: z.number().min(1).max(UPLOAD_MAX_SIZE),
        mimeType: z.string(),
        csvData: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid file type. Only CSV files are allowed.',
          });
        }

        // Validate file size
        if (input.fileSize > UPLOAD_MAX_SIZE) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File size exceeds maximum of ${UPLOAD_MAX_SIZE / 1024 / 1024}MB`,
          });
        }

        // Parse CSV
        const lines = input.csvData.split('\n').filter((line) => line.trim());
        if (lines.length < 2) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'CSV file must contain headers and at least one data row',
          });
        }

        // Extract headers
        const headers = parseCSVLine(lines[0]);
        const requiredFields = ['Loop Name', 'Loop Status', 'Price', 'Closing Date'];
        const missingFields = requiredFields.filter((field) => !headers.includes(field));

        // Parse data rows
        const dataRows = lines.slice(1).map((line) => parseCSVLine(line));

        // Validate records
        const validationResult = validateRecords(dataRows, headers);

        // Calculate data quality
        const dataQuality = Math.round(
          (validationResult.validRecords / validationResult.totalRecords) * 100
        );

        // Calculate field completeness
        const fieldCompleteness: Record<string, number> = {};
        for (const header of headers) {
          const completeCount = dataRows.filter((row) => {
            const idx = headers.indexOf(header);
            return row[idx] && row[idx].trim() !== '';
          }).length;
          fieldCompleteness[header] = Math.round((completeCount / dataRows.length) * 100);
        }

        const result: UploadValidationResult = {
          isValid: validationResult.validRecords > 0 && dataQuality >= 70,
          totalRecords: validationResult.totalRecords,
          validRecords: validationResult.validRecords,
          invalidRecords: validationResult.invalidRecords,
          dataQuality,
          warnings: missingFields.length > 0 ? [`Missing fields: ${missingFields.join(', ')}`] : [],
          errors: validationResult.errors,
          fieldCompleteness,
          missingFields,
        };

        // Log validation
        await logAuditEvent({
          tenantId: tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'upload_viewed',
          targetType: 'upload',
          targetName: input.filename,
          details: `Validated CSV upload: ${result.validRecords}/${result.totalRecords} valid records`,
        });

        return result;
      } catch (error) {
        console.error('CSV validation error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to validate CSV file',
        });
      }
    }),

  /**
   * Store validated upload metadata
   */
  storeUpload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        fileSize: z.number(),
        recordCount: z.number(),
        validRecordCount: z.number(),
        dataQuality: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Store upload metadata
        await db.insert(uploads).values({
          tenantId: tenantId,
          userId: ctx.user.id as number,
          fileName: input.filename,
          fileSize: input.fileSize,
          recordCount: input.recordCount,
          status: 'success',
        } as any);

        // Log audit event
        await logAuditEvent({
          tenantId: tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'upload_viewed',
          targetType: 'upload',
          targetName: input.filename,
          details: `Stored upload: ${input.validRecordCount}/${input.recordCount} valid records`,
        });

        return {
          success: true,
        };
      } catch (error) {
        console.error('Store upload error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to store upload',
        });
      }
    }),

  /**
   * Get upload history for tenant
   */
  getUploadHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        const uploadList = await db
          .select()
          .from(uploads)
          .where(eq(uploads.tenantId, tenantId))
          .orderBy(uploads.uploadedAt)
          .limit(input.limit)
          .offset(input.offset);

        return uploadList as any;
      } catch (error) {
        console.error('Get upload history error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch upload history',
        });
      }
    }),

  /**
   * Delete upload
   */
  deleteUpload: protectedProcedure
    .input(z.object({ uploadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = ctx.user.id as number;
        if (!tenantId) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'No tenant context',
          });
        }

        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Database connection failed',
          });
        }

        // Verify ownership
        const uploadList = await db
          .select()
          .from(uploads)
          .where(and(eq(uploads.id, input.uploadId), eq(uploads.tenantId, tenantId)));

        if (!uploadList.length) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Upload not found',
          });
        }

        // Delete upload
        await db.delete(uploads).where(eq(uploads.id, input.uploadId));

        // Log audit event
        await logAuditEvent({
          tenantId: tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'upload_deleted',
          targetType: 'upload',
          targetId: input.uploadId,
          targetName: uploadList[0].fileName,
        });

        return { success: true };
      } catch (error) {
        console.error('Delete upload error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete upload',
        });
      }
    }),
});

/**
 * Helper: Parse CSV line
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Helper: Validate records
 */
function validateRecords(
  rows: string[][],
  headers: string[]
): { totalRecords: number; validRecords: number; invalidRecords: number; errors: string[] } {
  const errors: string[] = [];
  let validRecords = 0;
  let invalidRecords = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Check if row has correct number of columns
    if (row.length !== headers.length) {
      invalidRecords++;
      errors.push(`Row ${i + 2}: Column count mismatch (expected ${headers.length}, got ${row.length})`);
      continue;
    }

    // Check required fields
    const loopNameIdx = headers.indexOf('Loop Name');
    const statusIdx = headers.indexOf('Loop Status');
    const priceIdx = headers.indexOf('Price');
    const dateIdx = headers.indexOf('Closing Date');

    if (
      (loopNameIdx >= 0 && !row[loopNameIdx]) ||
      (statusIdx >= 0 && !row[statusIdx]) ||
      (priceIdx >= 0 && !row[priceIdx]) ||
      (dateIdx >= 0 && !row[dateIdx])
    ) {
      invalidRecords++;
      errors.push(`Row ${i + 2}: Missing required field`);
      continue;
    }

    // Validate price is numeric
    if (priceIdx >= 0) {
      const price = row[priceIdx].replace(/[$,]/g, '');
      if (isNaN(parseFloat(price))) {
        invalidRecords++;
        errors.push(`Row ${i + 2}: Invalid price format`);
        continue;
      }
    }

    validRecords++;
  }

  return {
    totalRecords: rows.length,
    validRecords,
    invalidRecords,
    errors,
  };
}
