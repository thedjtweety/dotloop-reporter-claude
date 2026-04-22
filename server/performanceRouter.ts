import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { uploads, users } from "../drizzle/schema";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { z } from "zod";

/**
 * Admin middleware - ensures user has admin role
 */
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return next({ ctx });
});

export const performanceRouter = router({
  /**
   * Get aggregate performance statistics
   */
  getStats: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get overall statistics
    const stats = await db
      .select({
        totalUploads: sql<number>`COUNT(*)`,
        successfulUploads: sql<number>`SUM(CASE WHEN ${uploads.status} = 'success' THEN 1 ELSE 0 END)`,
        failedUploads: sql<number>`SUM(CASE WHEN ${uploads.status} = 'failed' THEN 1 ELSE 0 END)`,
        avgFileSize: sql<number>`AVG(${uploads.fileSize})`,
        avgValidationTime: sql<number>`AVG(${uploads.validationTimeMs})`,
        avgParsingTime: sql<number>`AVG(${uploads.parsingTimeMs})`,
        avgUploadTime: sql<number>`AVG(${uploads.uploadTimeMs})`,
        avgTotalTime: sql<number>`AVG(${uploads.totalTimeMs})`,
        maxFileSize: sql<number>`MAX(${uploads.fileSize})`,
        maxTotalTime: sql<number>`MAX(${uploads.totalTimeMs})`,
        totalRecords: sql<number>`SUM(${uploads.recordCount})`,
      })
      .from(uploads)
      .where(sql`${uploads.fileSize} IS NOT NULL`); // Only count uploads with metrics

    return stats[0];
  }),

  /**
   * Get file size distribution
   */
  getFileSizeDistribution: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Use a subquery to avoid GROUP BY issues
    const result = await db.execute(sql`
      SELECT 
        CASE
          WHEN fileSize < 1048576 THEN '< 1 MB'
          WHEN fileSize < 5242880 THEN '1-5 MB'
          WHEN fileSize < 10485760 THEN '5-10 MB'
          WHEN fileSize < 52428800 THEN '10-50 MB'
          ELSE '> 50 MB'
        END as sizeRange,
        COUNT(*) as count,
        AVG(totalTimeMs) as avgTime
      FROM uploads
      WHERE fileSize IS NOT NULL
      GROUP BY sizeRange
    `);

    return result[0] as any as Array<{ sizeRange: string; count: number; avgTime: number }>;
  }),

  /**
   * Get processing time trends over time
   */
  getTimeTrends: adminProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      const result = await db.execute(sql`
        SELECT 
          DATE(uploadedAt) as date,
          COUNT(*) as uploadCount,
          AVG(validationTimeMs) as avgValidationTime,
          AVG(parsingTimeMs) as avgParsingTime,
          AVG(uploadTimeMs) as avgUploadTime,
          AVG(totalTimeMs) as avgTotalTime,
          AVG(fileSize) as avgFileSize
        FROM uploads
        WHERE uploadedAt >= ${cutoffDate.toISOString().slice(0, 19).replace('T', ' ')}
          AND fileSize IS NOT NULL
        GROUP BY DATE(uploadedAt)
        ORDER BY DATE(uploadedAt)
      `);

      return result[0] as any;
    }),

  /**
   * Get bottleneck analysis - identify slowest stages
   */
  getBottlenecks: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const bottlenecks = await db
      .select({
        uploadId: uploads.id,
        fileName: uploads.fileName,
        fileSize: uploads.fileSize,
        recordCount: uploads.recordCount,
        validationTimeMs: uploads.validationTimeMs,
        parsingTimeMs: uploads.parsingTimeMs,
        uploadTimeMs: uploads.uploadTimeMs,
        totalTimeMs: uploads.totalTimeMs,
        uploadedAt: uploads.uploadedAt,
      })
      .from(uploads)
      .where(sql`${uploads.totalTimeMs} IS NOT NULL`)
      .orderBy(desc(uploads.totalTimeMs))
      .limit(20); // Top 20 slowest uploads

    // Calculate which stage was the bottleneck for each upload
    return bottlenecks.map((upload) => {
      const stages = {
        validation: upload.validationTimeMs || 0,
        parsing: upload.parsingTimeMs || 0,
        upload: upload.uploadTimeMs || 0,
      };

      const slowestStage = Object.entries(stages).reduce((max, [stage, time]) =>
        time > stages[max as keyof typeof stages] ? stage : max
      , 'validation');

      return {
        ...upload,
        slowestStage,
        stagePercentages: {
          validation: ((stages.validation / (upload.totalTimeMs || 1)) * 100).toFixed(1),
          parsing: ((stages.parsing / (upload.totalTimeMs || 1)) * 100).toFixed(1),
          upload: ((stages.upload / (upload.totalTimeMs || 1)) * 100).toFixed(1),
        },
      };
    });
  }),

  /**
   * Get success/failure rates
   */
  getSuccessRates: adminProcedure
    .input(
      z.object({
        days: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - input.days);

      const result = await db.execute(sql`
        SELECT 
          DATE(uploadedAt) as date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial
        FROM uploads
        WHERE uploadedAt >= ${cutoffDate.toISOString().slice(0, 19).replace('T', ' ')}
        GROUP BY DATE(uploadedAt)
        ORDER BY DATE(uploadedAt)
      `);

      const rates = (result as any) as Array<{ date: any; total: number; successful: number; failed: number; partial: number }>;
      return rates.map((rate) => ({
        date: String(rate.date),
        total: rate.total,
        successful: rate.successful,
        failed: rate.failed,
        partial: rate.partial,
        successRate: ((rate.successful / rate.total) * 100).toFixed(1),
        failureRate: ((rate.failed / rate.total) * 100).toFixed(1),
      }));
    }),

  /**
   * Get record count distribution
   */
  getRecordDistribution: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const result = await db.execute(sql`
      SELECT 
        CASE
          WHEN recordCount < 100 THEN '< 100'
          WHEN recordCount < 500 THEN '100-500'
          WHEN recordCount < 1000 THEN '500-1K'
          WHEN recordCount < 5000 THEN '1K-5K'
          WHEN recordCount < 10000 THEN '5K-10K'
          ELSE '> 10K'
        END as recordRange,
        COUNT(*) as count,
        AVG(totalTimeMs) as avgTime,
        AVG(fileSize) as avgFileSize
      FROM uploads
      WHERE fileSize IS NOT NULL
      GROUP BY recordRange
    `);

    return result[0] as any as Array<{ recordRange: string; count: number; avgTime: number; avgFileSize: number }>;
  }),

  /**
   * Get user-specific performance metrics
   */
  getUserPerformance: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const userPerformance = await db
      .select({
        userId: uploads.userId,
        userName: sql<string>`MAX(${users.name})`,
        userEmail: sql<string>`MAX(${users.email})`,
        totalUploads: sql<number>`COUNT(*)`,
        avgFileSize: sql<number>`AVG(${uploads.fileSize})`,
        avgTotalTime: sql<number>`AVG(${uploads.totalTimeMs})`,
        totalRecords: sql<number>`SUM(${uploads.recordCount})`,
        successRate: sql<number>`
          (SUM(CASE WHEN ${uploads.status} = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
        `,
      })
      .from(uploads)
      .leftJoin(users, eq(uploads.userId, users.id))
      .where(sql`${uploads.fileSize} IS NOT NULL`)
      .groupBy(uploads.userId)
      .orderBy(desc(sql`COUNT(*)`));

    return userPerformance;
  }),
});
