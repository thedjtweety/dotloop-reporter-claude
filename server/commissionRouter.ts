/**
 * Commission Router - tRPC procedures for commission calculations
 * 
 * Provides backend API for:
 * - Automatic commission calculations
 * - Commission plan management
 * - Team management
 * - Agent assignments
 */

import { protectedProcedure, protectedProcedureWithErrorHandling, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  calculateCommissions,
  calculateTransactionCommission,
  type CommissionPlan,
  type Team,
  type AgentPlanAssignment,
  type TransactionInput,
  type CommissionBreakdown,
  type AgentYTDSummary,
} from "./lib/commission-calculator";
import {
  generateReportHTML,
  type PDFReportData,
  type PDFReportOptions,
} from "./lib/pdf-generator";
import {
  commissionPlans,
  teams,
  agentAssignments,
} from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

// Zod schemas for input validation
const TransactionInputSchema = z.object({
  id: z.string(),
  loopName: z.string(),
  closingDate: z.string(),
  agents: z.string(),
  salePrice: z.number(),
  commissionRate: z.number(),
  buySidePercent: z.number().optional().default(50),
  sellSidePercent: z.number().optional().default(50),
});

const DeductionSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  type: z.enum(["fixed", "percentage"]),
  frequency: z.literal("per_transaction"),
});

const CommissionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  splitPercentage: z.number(),
  capAmount: z.number(),
  postCapSplit: z.number(),
  deductions: z.array(DeductionSchema).optional().default([]),
  royaltyPercentage: z.number().optional(),
  royaltyCap: z.number().optional(),
  description: z.string().optional(),
  useSliding: z.boolean().optional().default(false),
  tiers: z.array(z.object({
    id: z.string(),
    threshold: z.number(),
    splitPercentage: z.number(),
    description: z.string(),
  })).optional(),
});

const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  leadAgent: z.string(),
  teamSplitPercentage: z.number(),
}).strict();

const AgentAssignmentSchema = z.object({
  id: z.string(), // Required for database insert
  agentName: z.string(),
  planId: z.string(),
  teamId: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  anniversaryDate: z.string().nullable().optional(),
});

// Preprocess to convert null to undefined for database compatibility
const AgentAssignmentSchemaProcessed = AgentAssignmentSchema.transform((data) => ({
  ...data,
  teamId: data.teamId ?? undefined,
  startDate: data.startDate ?? undefined,
  anniversaryDate: data.anniversaryDate ?? undefined,
}));

export const commissionRouter = router({
  /**
   * Calculate commissions for a set of transactions
   * 
   * Input:
   * - transactions: Array of transaction data
   * - planIds: Array of commission plan IDs to use (fetches from DB)
   * - teamIds: Array of team IDs to use (fetches from DB)
   * - agentAssignments: Array of agent-to-plan assignments
   * 
   * Output:
   * - breakdowns: Detailed commission breakdown per transaction per agent
   * - ytdSummaries: Year-to-date summary per agent
   * - timestamp: When calculation was performed
   */
  calculate: protectedProcedure
    .input(
      z.object({
        transactions: z.array(TransactionInputSchema),
        planIds: z.array(z.string()).optional(),
        teamIds: z.array(z.string()).optional(),
        agentAssignments: z.array(AgentAssignmentSchemaProcessed),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }
        
        // Fetch commission plans from database
        let plans: CommissionPlan[] = [];
        if (input.planIds && input.planIds.length > 0) {
          const dbPlans = await db
            .select()
            .from(commissionPlans)
            .where(eq(commissionPlans.tenantId, ctx.user.tenantId));
          
          plans = dbPlans
            .filter((p: any) => input.planIds!.includes(p.id))
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              splitPercentage: p.splitPercentage,
              capAmount: p.capAmount,
              postCapSplit: p.postCapSplit,
              deductions: p.deductions ? JSON.parse(p.deductions as string) : undefined,
              royaltyPercentage: p.royaltyPercentage,
              royaltyCap: p.royaltyCap,
              useSliding: p.useSliding === 1,
              tiers: p.tiers ? JSON.parse(p.tiers as string) : undefined,
            } as CommissionPlan));
        }

        // Fetch teams from database
        let teamsList: Team[] = [];
        if (input.teamIds && input.teamIds.length > 0) {
          const dbTeams = await db
            .select()
            .from(teams)
            .where(eq(teams.tenantId, ctx.user.tenantId));
          
          teamsList = dbTeams
            .filter((t: any) => input.teamIds!.includes(t.id))
            .map((t: any) => ({
              id: t.id,
              name: t.name,
              leadAgent: t.leadAgent,
              teamSplitPercentage: t.teamSplitPercentage,
            } as Team));
        }

        // Calculate commissions
        const result = calculateCommissions(
          input.transactions as TransactionInput[],
          plans as CommissionPlan[],
          teamsList as Team[],
          input.agentAssignments as AgentPlanAssignment[]
        );

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
          transactionCount: input.transactions.length,
          agentCount: input.agentAssignments.length,
        };
      } catch (error) {
        console.error("Commission calculation error:", error);
        throw new Error(
          `Failed to calculate commissions: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get all commission plans
   */
  getPlans: publicProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection not available");
      }
      
      const plansData = await db
        .select()
        .from(commissionPlans);

      return plansData.map((p: any) => ({
        id: p.id,
        name: p.name,
        splitPercentage: p.splitPercentage,
        capAmount: p.capAmount,
        postCapSplit: p.postCapSplit,
        deductions: p.deductions ? JSON.parse(p.deductions as string) : undefined,
        royaltyPercentage: p.royaltyPercentage,
        royaltyCap: p.royaltyCap,
        useSliding: p.useSliding === 1,
      } as CommissionPlan));
    } catch (error) {
      throw new Error(`Failed to fetch commission plans: ${error instanceof Error ? error.message : String(error)}`);
    }
  }),

  /**
   * Get all teams for the current tenant
   */
  getTeams: publicProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection not available");
      }
      
      // Public procedure - return all teams
      const teamsList = await db
        .select()
        .from(teams);
      
      return teamsList.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
      }));
    } catch (error) {
      console.error("Error fetching teams:", error);
      throw new Error("Failed to fetch teams");
    }
  }),

  /**
   * Get all agent assignments
   */
  getAssignments: publicProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        throw new Error("Database connection not available");
      }
      
      // Public procedure - return all assignments
      const assignmentsList = await db
        .select()
        .from(agentAssignments);

      return assignmentsList.map((a: any) => ({
        id: a.id,
        agentName: a.agentName,
        planId: a.planId,
        teamId: a.teamId,
        startDate: a.startDate,
        anniversaryDate: a.anniversaryDate,
      } as AgentPlanAssignment));
    } catch (error) {
      console.error("Error fetching agent assignments:", error);
      throw new Error("Failed to fetch agent assignments");
    }
  }),

  /**
   * Calculate commission for a single transaction
   * Useful for quick calculations or testing
   */
  calculateSingle: protectedProcedure
    .input(
      z.object({
        transaction: TransactionInputSchema,
        agentName: z.string(),
        plan: CommissionPlanSchema,
        team: TeamSchema.optional(),
        ytdCompanyDollar: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const breakdown = calculateTransactionCommission(
          input.transaction,
          input.agentName,
          input.plan as CommissionPlan,
          input.team as Team | undefined,
          input.ytdCompanyDollar
        );

        return {
          success: true,
          data: breakdown,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("Single transaction calculation error:", error);
        throw new Error(
          `Failed to calculate transaction commission: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Validate commission data before calculation
   * Returns any errors or warnings
   */
  validate: protectedProcedure
    .input(
      z.object({
        transactions: z.array(TransactionInputSchema),
        plans: z.array(CommissionPlanSchema),
        assignments: z.array(AgentAssignmentSchema),
      })
    )
    .query(({ input }) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check for empty data
      if (input.transactions.length === 0) {
        errors.push("No transactions provided");
      }

      if (input.plans.length === 0) {
        errors.push("No commission plans provided");
      }

      if (input.assignments.length === 0) {
        errors.push("No agent assignments provided");
      }

      // Check for missing agents in assignments
      const assignedAgents = new Set(input.assignments.map(a => a.agentName));
      const transactionAgents = new Set<string>();
      
      input.transactions.forEach(t => {
        t.agents.split(",").forEach(agent => {
          const trimmed = agent.trim();
          transactionAgents.add(trimmed);
          if (!assignedAgents.has(trimmed)) {
            warnings.push(`Agent "${trimmed}" has no commission plan assigned`);
          }
        });
      });

      // Check for missing plans
      const planIds = new Set(input.plans.map(p => p.id));
      input.assignments.forEach(a => {
        if (!planIds.has(a.planId)) {
          errors.push(`Commission plan "${a.planId}" not found for agent "${a.agentName}"`);
        }
      });

      // Check for invalid cap amounts
      input.plans.forEach(p => {
        if (p.capAmount < 0) {
          errors.push(`Plan "${p.name}" has negative cap amount`);
        }
        if (p.splitPercentage < 0 || p.splitPercentage > 100) {
          errors.push(`Plan "${p.name}" has invalid split percentage`);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        transactionCount: input.transactions.length,
        agentCount: transactionAgents.size,
        planCount: input.plans.length,
      };
    }),

  /**
   * Save a commission plan to the database
   */
  savePlan: publicProcedure
    .input(CommissionPlanSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        // Check if plan exists
        const existing = await db
          .select()
          .from(commissionPlans)
          .where(eq(commissionPlans.id, input.id))
          .limit(1);

        if (existing.length > 0) {
          // Update existing plan
          await db
            .update(commissionPlans)
            .set({
              name: input.name,
              splitPercentage: input.splitPercentage,
              capAmount: input.capAmount,
              postCapSplit: input.postCapSplit,
              royaltyPercentage: input.royaltyPercentage,
              royaltyCap: input.royaltyCap,
              description: input.description,
              deductions: JSON.stringify(input.deductions),
              useSliding: input.useSliding ? 1 : 0,
              tiers: input.tiers ? JSON.stringify(input.tiers) : null,
            })
            .where(eq(commissionPlans.id, input.id));
        } else {
          // Insert new plan
          await db.insert(commissionPlans).values({
            id: input.id,
            tenantId: null,
            name: input.name,
            splitPercentage: input.splitPercentage,
            capAmount: input.capAmount,
            postCapSplit: input.postCapSplit,
            royaltyPercentage: input.royaltyPercentage,
            royaltyCap: input.royaltyCap,
            description: input.description,
            deductions: JSON.stringify(input.deductions),
            useSliding: input.useSliding ? 1 : 0,
            tiers: input.tiers ? JSON.stringify(input.tiers) : null,
          });
        }

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Save plan error:", error);
        throw new Error(
          `Failed to save commission plan: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Delete a commission plan from the database
   */
  deletePlan: publicProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: planId }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        // Delete the plan
        await db
          .delete(commissionPlans)
          .where(eq(commissionPlans.id, planId));

        return { success: true };
      } catch (error) {
        console.error("Delete plan error:", error);
        throw new Error(
          `Failed to delete commission plan: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

   /**
   * Save an agent assignment to the database
   */
  saveAssignment: publicProcedure
    .input(AgentAssignmentSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }
        
        // Ensure id is a string (not undefined)
        const assignmentId = input.id || nanoid();
        
        // Check if assignment exists
        const existing = await db
          .select()
          .from(agentAssignments)
          .where(eq(agentAssignments.id, assignmentId))
          .limit(1);

        if (existing.length > 0) {
          // Update existing assignment
          await db
            .update(agentAssignments)
            .set({
              agentName: input.agentName,
              planId: input.planId,
              teamId: input.teamId,
              anniversaryDate: input.anniversaryDate,
            })
            .where(eq(agentAssignments.id, assignmentId));
        } else {
          // Insert new assignment
          await db.insert(agentAssignments).values({
            id: assignmentId,
            tenantId: null,
            agentName: input.agentName,
            planId: input.planId,
            teamId: input.teamId,
            anniversaryDate: input.anniversaryDate,
          });
        }

        return { success: true, id: input.id };
      } catch (error) {
        console.error("Save assignment error:", error);
        throw new Error(
          `Failed to save agent assignment: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Delete an agent assignment from the database
   */
  deleteAssignment: publicProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: assignmentId }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }

        // Delete the assignment
        await db
          .delete(agentAssignments)
          .where(eq(agentAssignments.id, assignmentId));

        return { success: true };
      } catch (error) {
        console.error("Delete assignment error:", error);
        throw new Error(
          `Failed to delete agent assignment: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Bulk save agent assignments to the database
   */
  saveAssignments: publicProcedure
    .input(z.array(AgentAssignmentSchema))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new Error("Database connection not available");
        }
        
        // Get tenantId from authenticated user, or use default for demo
        const tenantId = ctx.user?.tenantId || 1; // Default to tenant 1 for demo/unauthenticated users
        
        const results: any[] = [];
        const assignments = input;
        
        // Get all agent names from the assignments
        const agentNames = assignments.map(a => a.agentName);
        
        // Delete existing assignments for these agents (due to unique constraint on tenantId + agentName)
        if (agentNames.length > 0) {
          await db
            .delete(agentAssignments)
            .where(
              and(
                eq(agentAssignments.tenantId, tenantId),
                inArray(agentAssignments.agentName, agentNames)
              )
            );
        }
        
        // Insert new assignments
        for (const assignment of assignments) {
          const assignmentId = assignment.id || `${assignment.agentName}-${assignment.planId}-${Date.now()}`;
          
          await db.insert(agentAssignments).values({
            id: assignmentId,
            tenantId: tenantId,
            agentName: assignment.agentName,
            planId: assignment.planId,
            teamId: assignment.teamId,
            anniversaryDate: assignment.anniversaryDate,
          });
          
          results.push({ agentName: assignment.agentName, id: assignmentId, success: true });
        }
        
        return { success: true, saved: results.length, results };
      } catch (error) {
        console.error("Bulk save assignments error:", error);
        throw new Error(
          `Failed to save agent assignments: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  exportPDF: publicProcedure
    .input(
      z.object({
        breakdowns: z.array(z.any()),
        ytdSummaries: z.array(z.any()),
        brokerageName: z.string().optional(),
        reportTitle: z.string().optional().default('Commission Report'),
        options: z.object({
          includeTransactionDetails: z.boolean().optional().default(true),
          includeAgentSummaries: z.boolean().optional().default(true),
          groupByAgent: z.boolean().optional().default(true),
          pageSize: z.enum(['letter', 'a4']).optional().default('letter'),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const reportData: PDFReportData = {
          breakdowns: input.breakdowns as CommissionBreakdown[],
          ytdSummaries: input.ytdSummaries as AgentYTDSummary[],
          generatedDate: new Date().toISOString(),
          brokerageName: input.brokerageName,
          reportTitle: input.reportTitle,
        };

        const options: PDFReportOptions = input.options || {};

        const html = generateReportHTML(reportData, options);

        const timestamp = new Date().toISOString().split('T')[0];
        const fileName = `commission-report-${timestamp}.pdf`;

        return {
          success: true,
          html,
          fileName,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("PDF export error:", error);
        throw new Error(
          `Failed to generate PDF report: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});

export type CommissionRouter = typeof commissionRouter;
