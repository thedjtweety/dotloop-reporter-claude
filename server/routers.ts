import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { eq } from 'drizzle-orm';
import { uploads } from '../drizzle/schema';
import { validateTransactionBatch } from './transactionValidator';
import { adminRouter } from './adminRouter';
import { performanceRouter } from './performanceRouter';
import { auditLogRouter } from './auditLogRouter';
import { dotloopOAuthRouter } from './dotloopOAuthRouter';
import { dotloopApiRouter } from './routers/dotloop-api';
import { dotloopConnectionsRouter } from './routers/dotloop-connections';
import { tenantSettingsRouter } from './tenantSettingsRouter';
import { commissionRouter } from './commissionRouter';
import { commissionRecalculationRouter } from './routers/commission-recalculation';
import { cdaRouter } from './routers/cda';
import { cdaSimpleRouter } from './routers/cda-simple';
// import { tierHistoryRouter } from './tierHistoryRouter'; // Removed: tierHistory table was dropped in migration
// Note: tierHistoryRouter.ts file contains imports of the removed tierHistory table
import { seedRouter } from './seedRouter';
import { healthRouter } from './healthRouter';
import {
  createUpload,
  getUserUploads,
  getUploadById,
  createTransactions,
  getTransactionsByUploadId,
  getUserTransactions,
  deleteUpload,
} from "./uploadDb";
// InsertTransaction is now inferred in uploadDb.ts

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  uploads: router({
    // Get all uploads for the current user
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserUploads(ctx.user.id);
    }),

    // Create a new upload with transactions
    create: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          transactions: z.array(z.any()),
          fileSize: z.number().optional(),
          validationTimeMs: z.number().optional(),
          parsingTimeMs: z.number().optional(),
          uploadTimeMs: z.number().optional(),
          totalTimeMs: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const uploadStartTime = Date.now();
        
        // Get tenant context
        const { getTenantIdFromUser } = await import('./lib/tenant-context');
        const tenantId = await getTenantIdFromUser(ctx.user.id);
        
        // Create upload record
        const uploadId = await createUpload({
          tenantId,
          userId: ctx.user.id,
          fileName: input.fileName,
          recordCount: input.transactions.length,
          fileSize: input.fileSize ?? null,
          validationTimeMs: input.validationTimeMs ?? null,
          parsingTimeMs: input.parsingTimeMs ?? null,
          uploadTimeMs: input.uploadTimeMs ?? null, // Will be calculated after transaction insert
          totalTimeMs: input.totalTimeMs ?? null,
          status: 'success',
        });

        // Prepare transactions for bulk insert
        const transactionsToInsert = input.transactions.map((t: any) => ({
          tenantId,
          uploadId,
          userId: ctx.user.id,
          loopId: t.loopId || null,
          loopViewUrl: t.loopViewUrl || null,
          loopName: t.loopName || null,
          loopStatus: t.loopStatus || null,
          createdDate: t.createdDate || null,
          closingDate: t.closingDate || null,
          listingDate: t.listingDate || null,
          offerDate: t.offerDate || null,
          address: t.address || null,
          price: t.price || 0,
          propertyType: t.propertyType || null,
          bedrooms: t.bedrooms || 0,
          bathrooms: t.bathrooms || 0,
          squareFootage: t.squareFootage || 0,
          city: t.city || null,
          state: t.state || null,
          county: t.county || null,
          leadSource: t.leadSource || null,
          agents: t.agents || null,
          createdBy: t.createdBy || null,
          earnestMoney: t.earnestMoney || 0,
          salePrice: t.salePrice || 0,
          commissionRate: t.commissionRate || 0,
          commissionTotal: t.commissionTotal || 0,
          buySideCommission: t.buySideCommission || 0,
          sellSideCommission: t.sellSideCommission || 0,
          companyDollar: t.companyDollar || 0,
          referralSource: t.referralSource || null,
          referralPercentage: t.referralPercentage || 0,
          complianceStatus: t.complianceStatus || null,
          tags: t.tags ? JSON.stringify(t.tags) : null,
          originalPrice: t.originalPrice || 0,
          yearBuilt: t.yearBuilt || 0,
          lotSize: t.lotSize || 0,
          subdivision: t.subdivision || null,
        }));

        // Validate transactions before insertion
        const validationResult = validateTransactionBatch(transactionsToInsert);
        if (!validationResult.valid && validationResult.errors) {
          // If validation fails, delete the upload record to keep database clean
          const db = await import('./db').then(m => m.getDb());
          if (db) {
            await db.delete(uploads).where(eq(uploads.id, uploadId));
          }
          
          const errorSummary = validationResult.errors.slice(0, 5).join('; ');
          const moreErrors = validationResult.errors.length > 5 ? ` (and ${validationResult.errors.length - 5} more errors)` : '';
          throw new Error(`Data validation failed: ${errorSummary}${moreErrors}`);
        }

        // Bulk insert transactions
        try {
          await createTransactions(validationResult.validData || transactionsToInsert);
        } catch (error) {
          // If transaction insertion fails, delete the upload record to keep database clean
          const db = await import('./db').then(m => m.getDb());
          if (db) {
            await db.delete(uploads).where(eq(uploads.id, uploadId));
          }
          
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('Transaction insertion failed:', errorMsg);
          throw new Error(
            `Failed to save transaction data: ${errorMsg}. ` +
            `This typically happens with very large files. Please try uploading a smaller CSV file or contact support.`
          );
        }

        return { uploadId, recordCount: input.transactions.length };
      }),

    // Get transactions for a specific upload
    getTransactions: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const dbTransactions = await getTransactionsByUploadId(
          input.uploadId,
          ctx.user.id
        );

        // Convert back to DotloopRecord format
        return dbTransactions.map((t) => ({
          loopId: t.loopId || "",
          loopViewUrl: t.loopViewUrl || "",
          loopName: t.loopName || "",
          loopStatus: t.loopStatus || "",
          createdDate: t.createdDate || "",
          closingDate: t.closingDate || "",
          listingDate: t.listingDate || "",
          offerDate: t.offerDate || "",
          address: t.address || "",
          price: t.price || 0,
          propertyType: t.propertyType || "",
          bedrooms: t.bedrooms || 0,
          bathrooms: t.bathrooms || 0,
          squareFootage: t.squareFootage || 0,
          city: t.city || "",
          state: t.state || "",
          county: t.county || "",
          leadSource: t.leadSource || "",
          agents: t.agents || "",
          createdBy: t.createdBy || "",
          earnestMoney: t.earnestMoney || 0,
          salePrice: t.salePrice || 0,
          commissionRate: t.commissionRate || 0,
          commissionTotal: t.commissionTotal || 0,
          buySideCommission: t.buySideCommission || 0,
          sellSideCommission: t.sellSideCommission || 0,
          companyDollar: t.companyDollar || 0,
          referralSource: t.referralSource || "",
          referralPercentage: t.referralPercentage || 0,
          complianceStatus: t.complianceStatus || "",
          tags: t.tags ? JSON.parse(t.tags) : [],
          originalPrice: t.originalPrice || 0,
          yearBuilt: t.yearBuilt || 0,
          lotSize: t.lotSize || 0,
          subdivision: t.subdivision || "",
        }));
      }),

    // Delete an upload
    delete: protectedProcedure
      .input(z.object({ uploadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteUpload(input.uploadId, ctx.user.id);
        return { success: true };
      }),
  }),

  admin: adminRouter,
  performance: performanceRouter,
  auditLogs: auditLogRouter,
  dotloopOAuth: dotloopOAuthRouter,
  dotloopApi: dotloopApiRouter,
  dotloopConnections: dotloopConnectionsRouter,
  tenantSettings: tenantSettingsRouter,
  commission: commissionRouter,
  commissionRecalculation: commissionRecalculationRouter,
  // tierHistory: tierHistoryRouter, // Removed: tierHistory table was dropped in migration
  cda: cdaRouter,
  cdaSimple: cdaSimpleRouter,
  seed: seedRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
