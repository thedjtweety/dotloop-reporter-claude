import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { transactions } from "../../drizzle/schema";
import { getDb } from "../db";

export const dataQualityAlertsProceduresRouter = router({
  /**
   * Run data quality check
   */
  runDataQualityCheck: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db.select().from(transactions).where(eq(transactions.tenantId, input.tenantId));

      const issues = {
        missingPrices: 0,
        missingClosingDates: 0,
        missingAgents: 0,
        invalidCommissions: 0,
        duplicateLoops: 0,
        futureClosingDates: 0,
      };

      const loopIds = new Set<string>();
      const now = new Date();

      txns.forEach((t) => {
        // Check for missing prices
        if (!t.salePrice && !t.price) {
          issues.missingPrices++;
        }

        // Check for missing closing dates
        if (!t.closingDate) {
          issues.missingClosingDates++;
        }

        // Check for missing agents
        if (!t.agents || JSON.parse(t.agents || "[]").length === 0) {
          issues.missingAgents++;
        }

        // Check for invalid commissions
        if ((t.commissionTotal || 0) < 0) {
          issues.invalidCommissions++;
        }

        // Check for duplicate loops
        if (loopIds.has(t.loopId || "")) {
          issues.duplicateLoops++;
        }
        loopIds.add(t.loopId || "");

        // Check for future closing dates
        if (t.closingDate && new Date(t.closingDate) > now) {
          issues.futureClosingDates++;
        }
      });

      const totalIssues = Object.values(issues).reduce((a, b) => a + b, 0);
      const qualityScore = txns.length > 0 ? ((txns.length - totalIssues) / txns.length) * 100 : 100;

      return {
        totalTransactions: txns.length,
        totalIssues,
        qualityScore: Math.round(qualityScore),
        issues,
        status: qualityScore >= 95 ? "excellent" : qualityScore >= 80 ? "good" : qualityScore >= 60 ? "fair" : "poor",
      };
    }),

  /**
   * Get data validation report
   */
  getDataValidationReport: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db.select().from(transactions).where(eq(transactions.tenantId, input.tenantId));

      const report = {
        totalRecords: txns.length,
        validRecords: 0,
        invalidRecords: 0,
        warnings: 0,
        errors: 0,
        details: [] as any[],
      };

      txns.forEach((t, index) => {
        const recordIssues = [];

        // Validate required fields
        if (!t.loopId) recordIssues.push("Missing Loop ID");
        if (!t.loopName) recordIssues.push("Missing Loop Name");
        if (!t.loopStatus) recordIssues.push("Missing Loop Status");
        if (!t.price && !t.salePrice) recordIssues.push("Missing Price");
        if (!t.closingDate) recordIssues.push("Missing Closing Date");
        if (!t.agents) recordIssues.push("Missing Agents");

        // Validate data types and ranges
        if (t.price && t.price < 0) recordIssues.push("Negative Price");
        if (t.salePrice && t.salePrice < 0) recordIssues.push("Negative Sale Price");
        if (t.commissionTotal && t.commissionTotal < 0) recordIssues.push("Negative Commission");
        if (t.commissionRate && (t.commissionRate < 0 || t.commissionRate > 100)) recordIssues.push("Invalid Commission Rate");

        if (recordIssues.length === 0) {
          report.validRecords++;
        } else {
          report.invalidRecords++;
          report.errors += recordIssues.length;

          if (recordIssues.length <= 2) {
            report.details.push({
              rowNumber: index + 1,
              loopId: t.loopId,
              issues: recordIssues,
            });
          }
        }
      });

      return report;
    }),

  /**
   * Create alert rule
   */
  createAlertRule: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        ruleName: z.string(),
        condition: z.enum(["volume_below", "commission_below", "closing_rate_below", "missing_data"]),
        threshold: z.number(),
        recipients: z.array(z.string().email()),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement alert rule storage when table is created
      return {
        success: true,
        ruleId: `alert_${Date.now()}`,
        message: `Alert rule "${input.ruleName}" created`,
      };
    }),

  /**
   * List alert rules
   */
  listAlertRules: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      // TODO: Implement alert rule retrieval when table is created
      return [];
    }),

  /**
   * Update alert rule
   */
  updateAlertRule: protectedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        ruleName: z.string().optional(),
        threshold: z.number().optional(),
        recipients: z.array(z.string().email()).optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement alert rule update when table is created
      return { success: true };
    }),

  /**
   * Delete alert rule
   */
  deleteAlertRule: protectedProcedure
    .input(z.object({ ruleId: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Implement alert rule deletion when table is created
      return { success: true };
    }),

  /**
   * Get recent alerts
   */
  getRecentAlerts: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      // TODO: Implement alert retrieval when table is created
      return [];
    }),

  /**
   * Check data consistency
   */
  checkDataConsistency: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db.select().from(transactions).where(eq(transactions.tenantId, input.tenantId));

      const consistency = {
        totalRecords: txns.length,
        consistencyScore: 100,
        issues: [] as string[],
      };

      // Check for orphaned records
      const loopIds = new Set<string>();
      txns.forEach((t) => {
        if (t.loopId) loopIds.add(t.loopId);
      });

      // Check for inconsistent agent assignments
      const agentLoopMap = new Map<string, Set<string>>();
      txns.forEach((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];
        agents.forEach((agent: string) => {
          if (!agentLoopMap.has(agent)) {
            agentLoopMap.set(agent, new Set());
          }
          agentLoopMap.get(agent)!.add(t.loopId || "");
        });
      });

      // Check for commission calculation consistency
      let commissionIssues = 0;
      txns.forEach((t) => {
        const expectedCommission = ((t.salePrice || t.price || 0) * (t.commissionRate || 0)) / 100;
        const actualCommission = t.commissionTotal || 0;

        // Allow 1% variance for rounding
        if (Math.abs(expectedCommission - actualCommission) > expectedCommission * 0.01) {
          commissionIssues++;
        }
      });

      if (commissionIssues > 0) {
        consistency.issues.push(`${commissionIssues} records have commission calculation discrepancies`);
        consistency.consistencyScore -= 10;
      }

      return consistency;
    }),

  /**
   * Export data quality report
   */
  exportDataQualityReport: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        format: z.enum(["csv", "json"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db.select().from(transactions).where(eq(transactions.tenantId, input.tenantId));

      const issues: any[] = [];

      txns.forEach((t, index) => {
        if (!t.loopId || !t.loopName || !t.loopStatus || (!t.price && !t.salePrice)) {
          issues.push({
            rowNumber: index + 1,
            loopId: t.loopId || "MISSING",
            loopName: t.loopName || "MISSING",
            issue: "Incomplete record",
          });
        }
      });

      if (input.format === "json") {
        return {
          format: "json",
          data: JSON.stringify(issues, null, 2),
          fileName: `data-quality-report-${Date.now()}.json`,
        };
      } else {
        let csv = "Row Number,Loop ID,Loop Name,Issue\n";
        issues.forEach((issue) => {
          csv += `${issue.rowNumber},"${issue.loopId}","${issue.loopName}","${issue.issue}"\n`;
        });

        return {
          format: "csv",
          data: csv,
          fileName: `data-quality-report-${Date.now()}.csv`,
        };
      }
    }),
});
