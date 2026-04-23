import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { auditLogs, platformAdminLogs } from "../../drizzle/schema";
import { and } from "drizzle-orm";
import { getDb } from "../db";

export const adminWebhooksProceduresRouter = router({
  /**
   * Get audit logs
   */
  getAuditLogs: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
        action: z.string().optional(),
        adminId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      let whereConditions: any = eq(auditLogs.tenantId, input.tenantId);

      if (input.action && input.adminId) {
        whereConditions = and(
          eq(auditLogs.tenantId, input.tenantId),
          eq(auditLogs.action, input.action as any),
          eq(auditLogs.adminId, input.adminId)
        );
      } else if (input.action) {
        whereConditions = and(
          eq(auditLogs.tenantId, input.tenantId),
          eq(auditLogs.action, input.action as any)
        );
      } else if (input.adminId) {
        whereConditions = and(
          eq(auditLogs.tenantId, input.tenantId),
          eq(auditLogs.adminId, input.adminId)
        );
      }

      // Note: This is simplified - actual implementation would use proper pagination
      const logs = await db.select().from(auditLogs).where(whereConditions);

      return logs.slice(input.offset, input.offset + input.limit);
    }),

  /**
   * Log admin action
   */
  logAdminAction: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        adminId: z.number(),
        adminName: z.string(),
        adminEmail: z.string().optional(),
        action: z.string(),
        targetType: z.string().optional(),
        targetId: z.number().optional(),
        targetName: z.string().optional(),
        details: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db.insert(auditLogs).values({
        tenantId: input.tenantId,
        adminId: input.adminId,
        adminName: input.adminName,
        adminEmail: input.adminEmail,
        action: input.action as any,
        targetType: input.targetType as any,
        targetId: input.targetId,
        targetName: input.targetName,
        details: input.details,
        ipAddress: "0.0.0.0", // Would be extracted from request in real implementation
        userAgent: "Unknown", // Would be extracted from request in real implementation
        createdAt: new Date().toISOString(),
      });

      return { success: true };
    }),

  /**
   * Get platform admin logs
   */
  getPlatformAdminLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const logs = await db.select().from(platformAdminLogs);

      return logs.slice(input.offset, input.offset + input.limit);
    }),

  /**
   * Create webhook
   */
  createWebhook: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        url: z.string().url(),
        events: z.array(z.string()),
        active: z.boolean().default(true),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement webhook storage when table is created
      return {
        success: true,
        webhookId: `webhook_${Date.now()}`,
        message: `Webhook created for events: ${input.events.join(", ")}`,
      };
    }),

  /**
   * List webhooks
   */
  listWebhooks: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      // TODO: Implement webhook retrieval when table is created
      return [];
    }),

  /**
   * Update webhook
   */
  updateWebhook: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        active: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement webhook update when table is created
      return { success: true };
    }),

  /**
   * Delete webhook
   */
  deleteWebhook: protectedProcedure
    .input(z.object({ webhookId: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Implement webhook deletion when table is created
      return { success: true };
    }),

  /**
   * Get webhook deliveries
   */
  getWebhookDeliveries: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implement webhook delivery retrieval when table is created
      return [];
    }),

  /**
   * Retry webhook delivery
   */
  retryWebhookDelivery: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Implement webhook delivery retry when table is created
      return { success: true };
    }),

  /**
   * Get system stats
   */
  getSystemStats: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const logs = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, input.tenantId));

      // Count by action
      const actionCounts = new Map<string, number>();
      logs.forEach((log) => {
        actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
      });

      return {
        totalAuditLogs: logs.length,
        actionCounts: Object.fromEntries(actionCounts),
        lastActivityAt: logs.length > 0 ? logs[logs.length - 1].createdAt : null,
      };
    }),

  /**
   * Export audit logs
   */
  exportAuditLogs: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        format: z.enum(["csv", "json"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const logs = await db.select().from(auditLogs).where(eq(auditLogs.tenantId, input.tenantId));

      if (input.format === "json") {
        return {
          format: "json",
          data: JSON.stringify(logs, null, 2),
          fileName: `audit-logs-${Date.now()}.json`,
        };
      } else {
        // CSV format
        let csv = "Timestamp,Admin,Action,Target Type,Target ID,Target Name,Details\n";
        logs.forEach((log) => {
          csv += `"${log.createdAt}","${log.adminName}","${log.action}","${log.targetType || ""}","${log.targetId || ""}","${log.targetName || ""}","${(log.details || "").replace(/"/g, '""')}"\n`;
        });

        return {
          format: "csv",
          data: csv,
          fileName: `audit-logs-${Date.now()}.csv`,
        };
      }
    }),
});
