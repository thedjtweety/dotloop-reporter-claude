import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  generateCommissionReport,
  generatePerformanceReport,
  generateFinancialReport,
  generatePDF,
  ReportConfig,
} from "../lib/reportGenerator";

export const reportingProceduresRouter = router({
  /**
   * Generate commission report
   */
  generateCommissionReport: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        title: z.string().optional(),
        filters: z
          .object({
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            agents: z.array(z.string()).optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const config: ReportConfig = {
        title: input.title || "Commission Report",
        reportType: "commission",
        metrics: ["totalVolume", "totalCommission", "averageCommission"],
        filters: input.filters,
      };

      const report = await generateCommissionReport(input.tenantId, config);
      return report;
    }),

  /**
   * Generate performance report
   */
  generatePerformanceReport: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const config: ReportConfig = {
        title: input.title || "Performance Report",
        reportType: "performance",
        metrics: ["transactions", "volume", "commission", "closingRate"],
      };

      const report = await generatePerformanceReport(input.tenantId, config);
      return report;
    }),

  /**
   * Generate financial report
   */
  generateFinancialReport: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const config: ReportConfig = {
        title: input.title || "Financial Report",
        reportType: "financial",
        metrics: ["monthlyVolume", "monthlyCommission", "monthlyTransactions"],
      };

      const report = await generateFinancialReport(input.tenantId, config);
      return report;
    }),

  /**
   * Generate PDF from report
   */
  generatePDF: protectedProcedure
    .input(
      z.object({
        reportData: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const pdfBuffer = await generatePDF(input.reportData);

      // In production, upload to S3 and return URL
      // For now, return base64
      return {
        success: true,
        pdfBase64: pdfBuffer.toString("base64"),
        fileName: `report_${Date.now()}.pdf`,
      };
    }),

  /**
   * Schedule report delivery
   */
  scheduleReport: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        reportType: z.enum(["commission", "performance", "financial"]),
        recipients: z.array(z.string().email()),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        dayOfWeek: z.number().optional(), // 0-6 for weekly
        dayOfMonth: z.number().optional(), // 1-31 for monthly
        time: z.string().optional(), // HH:MM format
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement scheduled report delivery
      // This would integrate with a job scheduler like node-cron or bull

      return {
        success: true,
        message: `Report scheduled for ${input.frequency} delivery to ${input.recipients.join(", ")}`,
        scheduleId: `schedule_${Date.now()}`,
      };
    }),

  /**
   * Get report templates
   */
  getTemplates: protectedProcedure.query(async () => {
    return [
      {
        id: "commission",
        name: "Commission Report",
        description: "Detailed commission breakdown by agent",
        metrics: ["totalVolume", "totalCommission", "averageCommission", "topAgent"],
      },
      {
        id: "performance",
        name: "Performance Report",
        description: "Agent performance metrics and rankings",
        metrics: ["transactions", "volume", "commission", "closingRate"],
      },
      {
        id: "financial",
        name: "Financial Report",
        description: "Monthly financial trends and analysis",
        metrics: ["monthlyVolume", "monthlyCommission", "monthlyTransactions"],
      },
      {
        id: "custom",
        name: "Custom Report",
        description: "Build your own report with selected metrics",
        metrics: [],
      },
    ];
  }),

  /**
   * Export report to CSV
   */
  exportToCSV: protectedProcedure
    .input(
      z.object({
        reportData: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const { reportData } = input;

      // Convert report data to CSV
      let csv = `${reportData.title}\nGenerated: ${reportData.generatedAt}\n\n`;

      // Add summary
      csv += "SUMMARY\n";
      csv += `Total Transactions,${reportData.summary.totalTransactions}\n`;
      csv += `Total Volume,$${(reportData.summary.totalVolume / 100).toFixed(2)}\n`;
      csv += `Total Commission,$${(reportData.summary.totalCommission / 100).toFixed(2)}\n`;
      csv += `Average Commission,$${(reportData.summary.averageCommission / 100).toFixed(2)}\n`;

      if (reportData.summary.topAgent) {
        csv += `Top Agent,${reportData.summary.topAgent.name}\n`;
        csv += `Top Agent Commission,$${(reportData.summary.topAgent.commission / 100).toFixed(2)}\n`;
      }

      csv += "\nDETAILS\n";

      // Add details based on report type
      if (reportData.reportType === "commission") {
        csv += "Agent,Volume,Commission\n";
        reportData.details.forEach((detail: any) => {
          csv += `${detail.agent},$${(detail.volume / 100).toFixed(2)},$${(detail.commission / 100).toFixed(2)}\n`;
        });
      } else if (reportData.reportType === "performance") {
        csv += "Agent,Transactions,Volume,Commission,Closing Rate\n";
        reportData.details.forEach((detail: any) => {
          csv += `${detail.agent},${detail.transactions},$${(detail.volume / 100).toFixed(2)},$${(detail.commission / 100).toFixed(2)},${detail.closingRate.toFixed(2)}%\n`;
        });
      } else if (reportData.reportType === "financial") {
        csv += "Month,Volume,Commission,Transactions\n";
        reportData.details.forEach((detail: any) => {
          csv += `${detail.month},$${(detail.volume / 100).toFixed(2)},$${(detail.commission / 100).toFixed(2)},${detail.transactions}\n`;
        });
      }

      return {
        success: true,
        csv,
        fileName: `report_${Date.now()}.csv`,
      };
    }),
});
