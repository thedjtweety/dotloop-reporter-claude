import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { teams, userTeamMembers, transactions } from "../../drizzle/schema";
import { getDb } from "../db";


export const teamManagementProceduresRouter = router({
  /**
   * Create team
   */
  createTeam: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        teamName: z.string(),
        description: z.string().optional(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(teams).values({
        id: teamId,
        tenantId: input.tenantId,
        name: input.teamName,
        leadAgent: input.leadId?.toString() || "",
        teamSplitPercentage: 50, // Default 50/50 split
        description: input.description,
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return { success: true, teamId };
    }),

  /**
   * Add team member
   */
  addTeamMember: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        userId: z.number(),
        role: z.enum(["owner", "editor", "viewer"]).default("viewer"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const result = await db.insert(userTeamMembers).values({
        userTeamId: input.teamId,
        userId: input.userId,
        role: input.role,
        addedAt: new Date().toISOString(),
        addedBy: ctx.user.id,
      });

      return { success: true, memberId: (result as any).insertId };
    }),

  /**
   * Get team performance
   */
  getTeamPerformance: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        tenantId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get team info
      const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId.toString()));

      if (!team) {
        throw new Error("Team not found");
      }

      // Get team members
      const members = await db
        .select()
        .from(userTeamMembers)
        .where(eq(userTeamMembers.userTeamId, input.teamId));

      // Get transactions for team members
      const txns = await db
        .select()
        .from(transactions)
        .where(eq(transactions.tenantId, input.tenantId));

      // Calculate team metrics
      let totalVolume = 0;
      let totalCommission = 0;
      let totalTransactions = 0;
      let closedTransactions = 0;

      const memberMetrics = new Map<number, { volume: number; commission: number; transactions: number }>();

      txns.forEach((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];

        // Check if any team member is involved
        members.forEach((member) => {
          if (agents.includes(member.userId.toString())) {
            const current = memberMetrics.get(member.userId) || {
              volume: 0,
              commission: 0,
              transactions: 0,
            };

            current.volume += t.salePrice || t.price || 0;
            current.commission += t.commissionTotal || 0;
            current.transactions += 1;

            memberMetrics.set(member.userId, current);

            totalVolume += t.salePrice || t.price || 0;
            totalCommission += t.commissionTotal || 0;
            totalTransactions += 1;

            if (t.loopStatus?.toLowerCase().includes("closed")) {
              closedTransactions += 1;
            }
          }
        });
      });

      return {
        team,
        memberCount: members.length,
        metrics: {
          totalVolume,
          totalCommission,
          totalTransactions,
          closedTransactions,
          closingRate: totalTransactions > 0 ? (closedTransactions / totalTransactions) * 100 : 0,
        },
        members: members.map((m) => ({
          ...m,
          metrics: memberMetrics.get(m.userId) || { volume: 0, commission: 0, transactions: 0 },
        })),
      };
    }),

  /**
   * List all teams
   */
  listTeams: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      return await db.select().from(teams).where(eq(teams.tenantId, input.tenantId));
    }),

  /**
   * Update team
   */
  updateTeam: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        teamName: z.string().optional(),
        description: z.string().optional(),
        leadId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const updates: any = {
        updatedAt: new Date().toISOString(),
      };

          if (input.teamName) updates.name = input.teamName;
      if (input.description) updates.description = input.description;
      if (input.leadId) updates.leadAgent = input.leadId.toString();

      await db.update(teams).set(updates).where(eq(teams.id, input.teamId.toString()));

      return { success: true };
    }),

  /**
   * Remove team member
   */
  removeTeamMember: protectedProcedure
    .input(
      z.object({
        memberId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db.delete(userTeamMembers).where(eq(userTeamMembers.id, input.memberId));

      return { success: true };
    }),

  /**
   * Delete team
   */
  deleteTeam: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Delete team members first
      await db.delete(userTeamMembers).where(eq(userTeamMembers.userTeamId, input.teamId));

      // Delete team
      await db.delete(teams).where(eq(teams.id, input.teamId.toString()));

      return { success: true };
    }),
});
