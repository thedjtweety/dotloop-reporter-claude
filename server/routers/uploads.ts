import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { uploads, transactions } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Upload History & Comparison Router
 * 
 * Handles:
 * - Retrieving upload history for a tenant
 * - Comparing two uploads side-by-side
 * - Calculating transaction differences
 * - Re-using data from previous uploads
 */

export const uploadsRouter = router({
  /**
   * Get all uploads for the current tenant
   * Returns upload metadata and transaction counts
   */
  getHistory: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: 'Database connection failed',
            uploads: [],
          };
        }

        // Get all uploads for this tenant, ordered by most recent first
        const uploadList = await db
          .select()
          .from(uploads)
          .where(eq(uploads.tenantId, ctx.user.tenantId))
          .orderBy(desc(uploads.uploadedAt))
          .limit(100);

        // Enrich with transaction counts
        const enrichedUploads = await Promise.all(
          uploadList.map(async (upload) => {
            const [transactionData] = await db
              .select({ count: uploads.recordCount })
              .from(transactions)
              .where(eq(transactions.uploadId, upload.id))
              .limit(1);

            return {
              ...upload,
              transactionCount: transactionData?.count || upload.recordCount || 0,
              uploadedAtFormatted: new Date(upload.uploadedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          })
        );

        return {
          success: true,
          uploads: enrichedUploads,
        };
      } catch (error) {
        console.error('[Upload History Error]', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retrieve upload history',
          uploads: [],
        };
      }
    }),

  /**
   * Get detailed transaction data for a specific upload
   */
  getUploadTransactions: protectedProcedure
    .input(z.object({ uploadId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: 'Database connection failed',
            transactions: [],
          };
        }

        // Verify upload belongs to this tenant
        const [upload] = await db
          .select()
          .from(uploads)
          .where(
            and(
              eq(uploads.id, input.uploadId),
              eq(uploads.tenantId, ctx.user.tenantId)
            )
          )
          .limit(1);

        if (!upload) {
          return {
            success: false,
            error: 'Upload not found',
            transactions: [],
          };
        }

        // Get all transactions for this upload
        const transactionList = await db
          .select()
          .from(transactions)
          .where(eq(transactions.uploadId, input.uploadId));

        return {
          success: true,
          upload,
          transactions: transactionList,
          transactionCount: transactionList.length,
        };
      } catch (error) {
        console.error('[Get Upload Transactions Error]', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to retrieve transactions',
          transactions: [],
        };
      }
    }),

  /**
   * Compare two uploads and return differences
   */
  compareUploads: protectedProcedure
    .input(
      z.object({
        uploadId1: z.number().describe('First upload ID (older)'),
        uploadId2: z.number().describe('Second upload ID (newer)'),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: 'Database connection failed',
            comparison: null,
          };
        }

        // Verify both uploads belong to this tenant
        const [upload1, upload2] = await Promise.all([
          db
            .select()
            .from(uploads)
            .where(
              and(
                eq(uploads.id, input.uploadId1),
                eq(uploads.tenantId, ctx.user.tenantId)
              )
            )
            .then((results) => results[0]),
          db
            .select()
            .from(uploads)
            .where(
              and(
                eq(uploads.id, input.uploadId2),
                eq(uploads.tenantId, ctx.user.tenantId)
              )
            )
            .then((results) => results[0]),
        ]);

        if (!upload1 || !upload2) {
          return {
            success: false,
            error: 'One or both uploads not found',
            comparison: null,
          };
        }

        // Get transactions for both uploads
        const [transactions1, transactions2] = await Promise.all([
          db
            .select()
            .from(transactions)
            .where(eq(transactions.uploadId, input.uploadId1)),
          db
            .select()
            .from(transactions)
            .where(eq(transactions.uploadId, input.uploadId2)),
        ]);

        // Create maps for easy lookup
        const map1 = new Map(transactions1.map((t) => [t.loopId || t.address, t]));
        const map2 = new Map(transactions2.map((t) => [t.loopId || t.address, t]));

        // Calculate differences
        const newTransactions: typeof transactions2 = [];
        const deletedTransactions: typeof transactions1 = [];
        const modifiedTransactions: Array<{
          before: typeof transactions1[0];
          after: typeof transactions2[0];
          changedFields: string[];
        }> = [];

        // Find new and modified transactions
        Array.from(map2.entries()).forEach(([key, trans2]) => {
          const trans1 = map1.get(key);
          if (!trans1) {
            newTransactions.push(trans2);
          } else {
            // Check if modified
            const modified = JSON.stringify(trans1) !== JSON.stringify(trans2);
            if (modified) {
              modifiedTransactions.push({
                before: trans1,
                after: trans2,
                changedFields: findChangedFields(trans1, trans2),
              });
            }
          }
        });

        // Find deleted transactions
        Array.from(map1.entries()).forEach(([key, trans1]) => {
          if (!map2.has(key)) {
            deletedTransactions.push(trans1);
          }
        });

        return {
          success: true,
          comparison: {
            upload1: {
              id: upload1.id,
              fileName: upload1.fileName,
              uploadedAt: upload1.uploadedAt,
              recordCount: upload1.recordCount,
            },
            upload2: {
              id: upload2.id,
              fileName: upload2.fileName,
              uploadedAt: upload2.uploadedAt,
              recordCount: upload2.recordCount,
            },
            statistics: {
              totalTransactions1: transactions1.length,
              totalTransactions2: transactions2.length,
              newCount: newTransactions.length,
              deletedCount: deletedTransactions.length,
              modifiedCount: modifiedTransactions.length,
              unchangedCount:
                transactions1.length -
                deletedTransactions.length -
                modifiedTransactions.length,
            },
            newTransactions,
            deletedTransactions,
            modifiedTransactions,
          },
        };
      } catch (error) {
        console.error('[Compare Uploads Error]', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to compare uploads',
          comparison: null,
        };
      }
    }),

  /**
   * Re-use data from a previous upload
   * Loads all transactions from a previous upload into the current session
   */
  reuseUpload: protectedProcedure
    .input(z.object({ uploadId: z.number() }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: 'Database connection failed',
            transactions: [],
          };
        }

        // Verify upload belongs to this tenant
        const [upload] = await db
          .select()
          .from(uploads)
          .where(
            and(
              eq(uploads.id, input.uploadId),
              eq(uploads.tenantId, ctx.user.tenantId)
            )
          )
          .limit(1);

        if (!upload) {
          return {
            success: false,
            error: 'Upload not found',
            transactions: [],
          };
        }

        // Get all transactions for this upload
        const transactionList = await db
          .select()
          .from(transactions)
          .where(eq(transactions.uploadId, input.uploadId));

        return {
          success: true,
          message: `Loaded ${transactionList.length} transactions from "${upload.fileName}"`,
          upload: {
            id: upload.id,
            fileName: upload.fileName,
            uploadedAt: upload.uploadedAt,
            recordCount: upload.recordCount,
          },
          transactions: transactionList,
          transactionCount: transactionList.length,
        };
      } catch (error) {
        console.error('[Re-use Upload Error]', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to re-use upload',
          transactions: [],
        };
      }
    }),
});

/**
 * Helper function to find which fields changed between two transaction records
 */
function findChangedFields(before: any, after: any): string[] {
  const changed: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  Array.from(keys).forEach((key) => {
    if (before[key] !== after[key]) {
      changed.push(key);
    }
  })

  return changed;
}
