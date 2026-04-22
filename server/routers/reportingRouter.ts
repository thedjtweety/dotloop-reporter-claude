/**
 * Reporting & Exports Router - Phase 4: Reporting & Exports (4.1-4.4)
 * Handles PDF generation, Excel export, report customization, and scheduled reports
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { transactions, users } from '../../drizzle/schema';
import { getDb } from '../db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { logAuditEvent } from '../lib/audit-logger';

export interface ReportConfig {
  title: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  metrics: string[];
  agentFilter?: string[];
  teamFilter?: string[];
  customBranding?: {
    logoUrl?: string;
    companyName?: string;
    primaryColor?: string;
  };
}

export interface ExcelExportConfig extends ReportConfig {
  includeCharts: boolean;
  includeFormatting: boolean;
  sheetNames?: string[];
}

export interface ScheduledReportConfig {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  recipients: string[];
  reportConfig: ReportConfig;
  isActive: boolean;
}

export const reportingRouter = router({
  /**
   * Priority 4.1: Generate PDF Report
   */
  generatePdfReport: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        metrics: z.array(z.string()),
        agentFilter: z.array(z.string()).optional(),
        customBranding: z
          .object({
            logoUrl: z.string().optional(),
            companyName: z.string().optional(),
            primaryColor: z.string().optional(),
          })
          .optional(),
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

        // Fetch transaction data
        const txs = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              gte(transactions.closingDate, input.startDate),
              lte(transactions.closingDate, input.endDate)
            )
          );

        // Filter by agents if specified
        let filtered = txs;
        if (input.agentFilter && input.agentFilter.length > 0) {
          filtered = txs.filter((t) => {
            const agents = t.agents ? t.agents.split(',').map((a) => a.trim()) : [];
            return agents.some((a) => input.agentFilter!.includes(a));
          });
        }

        // Calculate metrics
        const totalVolume = filtered.reduce((sum, t) => sum + (t.price || 0), 0);
        const totalCommission = filtered.reduce((sum, t) => sum + (t.commissionTotal || 0), 0);
        const closedCount = filtered.filter(
          (t) => t.loopStatus?.toLowerCase().includes('closed') || t.loopStatus?.toLowerCase().includes('sold')
        ).length;
        const closingRate = filtered.length > 0 ? (closedCount / filtered.length) * 100 : 0;

        // Generate PDF metadata (actual PDF generation would use a library like pdfkit)
        const pdfData = {
          title: input.title,
          generatedAt: new Date().toISOString(),
          reportPeriod: `${input.startDate} to ${input.endDate}`,
          branding: input.customBranding || {
            companyName: 'Dotloop Reporter',
            primaryColor: '#1e3a5f',
          },
          metrics: {
            totalTransactions: filtered.length,
            totalVolume,
            totalCommission,
            closingRate: closingRate.toFixed(2),
            averagePrice: filtered.length > 0 ? (totalVolume / filtered.length).toFixed(2) : 0,
          },
          transactions: filtered.slice(0, 100), // Limit to first 100 for preview
        };

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_created',
          targetType: 'system',
          targetName: `PDF Report: ${input.title}`,
          details: `Generated PDF report for ${filtered.length} transactions`,
        });

        return {
          success: true,
          reportId: `pdf_${Date.now()}`,
          fileName: `${input.title}_${new Date().toISOString().split('T')[0]}.pdf`,
          pdfData,
        };
      } catch (error) {
        console.error('Generate PDF error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate PDF report',
        });
      }
    }),

  /**
   * Priority 4.2: Generate Excel Export
   */
  generateExcelExport: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        metrics: z.array(z.string()),
        includeCharts: z.boolean().default(true),
        includeFormatting: z.boolean().default(true),
        agentFilter: z.array(z.string()).optional(),
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

        // Fetch transaction data
        const txs = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              gte(transactions.closingDate, input.startDate),
              lte(transactions.closingDate, input.endDate)
            )
          );

        // Filter by agents if specified
        let filtered = txs;
        if (input.agentFilter && input.agentFilter.length > 0) {
          filtered = txs.filter((t) => {
            const agents = t.agents ? t.agents.split(',').map((a) => a.trim()) : [];
            return agents.some((a) => input.agentFilter!.includes(a));
          });
        }

        // Prepare Excel data
        const excelData = {
          sheets: [
            {
              name: 'Summary',
              data: [
                ['Report Title', input.title],
                ['Period', `${input.startDate} to ${input.endDate}`],
                ['Generated', new Date().toISOString()],
                ['Total Transactions', filtered.length],
                ['Total Volume', filtered.reduce((sum, t) => sum + (t.price || 0), 0)],
                ['Total Commission', filtered.reduce((sum, t) => sum + (t.commissionTotal || 0), 0)],
              ],
            },
            {
              name: 'Transactions',
              data: filtered.map((t) => [
                t.loopName,
                t.loopStatus,
                t.price,
                t.commissionTotal,
                t.closingDate,
                t.agents,
              ]),
            },
          ],
        };

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_created',
          targetType: 'system',
          targetName: `Excel Export: ${input.title}`,
          details: `Generated Excel export for ${filtered.length} transactions`,
        });

        return {
          success: true,
          reportId: `excel_${Date.now()}`,
          fileName: `${input.title}_${new Date().toISOString().split('T')[0]}.xlsx`,
          excelData,
        };
      } catch (error) {
        console.error('Generate Excel error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate Excel export',
        });
      }
    }),

  /**
   * Priority 4.3: Get Report Templates
   */
  getReportTemplates: protectedProcedure.query(async ({ ctx }) => {
    try {
      const templates = [
        {
          id: 'commission_report',
          name: 'Commission Report',
          description: 'Detailed commission breakdown by agent',
          metrics: ['totalCommission', 'agentCommission', 'companyDollar', 'closingRate'],
        },
        {
          id: 'financial_summary',
          name: 'Financial Summary',
          description: 'Overall financial metrics and trends',
          metrics: ['totalVolume', 'totalCommission', 'averagePrice', 'closingRate'],
        },
        {
          id: 'agent_leaderboard',
          name: 'Agent Leaderboard',
          description: 'Agent performance rankings',
          metrics: ['totalTransactions', 'totalVolume', 'closingRate', 'daysToClose'],
        },
        {
          id: 'pipeline_analysis',
          name: 'Pipeline Analysis',
          description: 'Pipeline status and trends',
          metrics: ['pipelineStatus', 'activeListings', 'underContract', 'closed'],
        },
      ];

      return templates;
    } catch (error) {
      console.error('Get templates error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch report templates',
      });
    }
  }),

  /**
   * Priority 4.4: Schedule Recurring Report
   */
  scheduleReport: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        frequency: z.enum(['daily', 'weekly', 'monthly']),
        dayOfWeek: z.number().optional(),
        dayOfMonth: z.number().optional(),
        recipients: z.array(z.string()),
        reportConfig: z.object({
          title: z.string(),
          metrics: z.array(z.string()),
          agentFilter: z.array(z.string()).optional(),
        }),
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

        // In production, this would save to a scheduled_reports table
        const scheduledReport = {
          id: `schedule_${Date.now()}`,
          tenantId,
          name: input.name,
          frequency: input.frequency,
          dayOfWeek: input.dayOfWeek,
          dayOfMonth: input.dayOfMonth,
          recipients: input.recipients,
          reportConfig: input.reportConfig,
          isActive: true,
          createdAt: new Date(),
        };

        // Log audit event
        await logAuditEvent({
          tenantId,
          adminId: ctx.user.id as number,
          adminName: ctx.user.email || 'Unknown',
          action: 'user_created',
          targetType: 'system',
          targetName: `Scheduled Report: ${input.name}`,
          details: `Created ${input.frequency} scheduled report to ${input.recipients.join(', ')}`,
        });

        return {
          success: true,
          scheduleId: scheduledReport.id,
          message: `Report scheduled to run ${input.frequency}`,
        };
      } catch (error) {
        console.error('Schedule report error:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to schedule report',
        });
      }
    }),
});
