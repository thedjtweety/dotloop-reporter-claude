import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { commissionPlans, agentAssignments, transactions } from "../../drizzle/schema";
import { getDb } from "../db";
import {
  calculateAgentCommission,
  COMMISSION_TEMPLATES,
  parseTiers,
  parseDeductions,
} from "../lib/commissionCalculator";

export const commissionProceduresRouter = router({
  /**
   * Create commission plan from template
   */
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateKey: z.enum([
          "standard_50_50",
          "high_volume_60_40",
          "new_agent_70_30",
          "tiered_performance",
          "capped_with_royalty",
        ]),
        tenantId: z.number(),
        customName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const template = COMMISSION_TEMPLATES[input.templateKey as keyof typeof COMMISSION_TEMPLATES];
      if (!template) {
        throw new Error(`Template ${input.templateKey} not found`);
      }

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(commissionPlans).values({
        id: planId,
        tenantId: input.tenantId,
        name: input.customName || template.name,
        description: template.description,
        splitPercentage: template.splitPercentage,
        capAmount: template.capAmount,
        postCapSplit: template.postCapSplit,
        deductions: template.deductions,
        tiers: template.tiers,
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true, planId };
    }),

  /**
   * Bulk assign agents to commission plan
   */
  bulkAssignAgents: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        agentNames: z.array(z.string()),
        tenantId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const assignments = input.agentNames.map((agentName) => ({
        id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: input.tenantId,
        agentName,
        planId: input.planId,
        teamId: null,
        anniversaryDate: null,
        startDate: new Date().toISOString().split("T")[0],
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Delete existing assignments for these agents
      for (const agentName of input.agentNames) {
        await db
          .delete(agentAssignments)
          .where(
            and(
              eq(agentAssignments.tenantId, input.tenantId),
              eq(agentAssignments.agentName, agentName)
            )
          );
      }

      // Insert new assignments
      await db.insert(agentAssignments).values(assignments);

      return { success: true, assignedCount: assignments.length };
    }),

  /**
   * Calculate commission for agent
   */
  calculateAgentCommission: protectedProcedure
    .input(
      z.object({
        agentName: z.string(),
        planId: z.string(),
        tenantId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get commission plan
      const [plan] = await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.id, input.planId));

      if (!plan) {
        throw new Error("Commission plan not found");
      }

      // Get agent transactions
      const agentTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, input.tenantId),
            // This is a simplified filter - in reality would need to parse agents JSON
          )
        );

      // Filter transactions for this agent
      const relevantTransactions = agentTransactions.filter((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];
        return agents.includes(input.agentName);
      });

      // Calculate commission
      const result = calculateAgentCommission(
        relevantTransactions.map((t) => ({
          price: t.price || 0,
          salePrice: t.salePrice || 0,
        })),
        {
          splitPercentage: plan.splitPercentage,
          capAmount: plan.capAmount,
          postCapSplit: plan.postCapSplit,
          tiers: plan.tiers,
          deductions: plan.deductions,
        }
      );

      return {
        ...result,
        agentName: input.agentName,
      };
    }),

  /**
   * Get all commission plans for tenant
   */
  listPlans: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      return await db
        .select()
        .from(commissionPlans)
        .where(eq(commissionPlans.tenantId, input.tenantId));
    }),

  /**
   * Get commission templates
   */
  getTemplates: protectedProcedure.query(async () => {
    return Object.entries(COMMISSION_TEMPLATES).map(([key, template]) => ({
      key,
      ...template,
    }));
  }),

  /**
   * Update commission plan
   */
  updatePlan: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        planName: z.string().optional(),
        splitPercentage: z.number().optional(),
        capAmount: z.number().optional(),
        postCapSplit: z.number().optional(),
        deductions: z.string().optional(),
        tiers: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const updates: any = {
        updatedAt: new Date().toISOString(),
      };

      if (input.planName) updates.name = input.planName;
      if (input.splitPercentage !== undefined) updates.splitPercentage = input.splitPercentage;
      if (input.capAmount !== undefined) updates.capAmount = input.capAmount;
      if (input.postCapSplit !== undefined) updates.postCapSplit = input.postCapSplit;
      if (input.deductions !== undefined) updates.deductions = input.deductions;
      if (input.tiers !== undefined) updates.tiers = input.tiers;

      await db.update(commissionPlans).set(updates).where(eq(commissionPlans.id, input.planId));

      return { success: true };
    }),

  /**
   * Delete commission plan
   */
  deletePlan: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db.delete(commissionPlans).where(eq(commissionPlans.id, input.planId));

      return { success: true };
    }),
});
