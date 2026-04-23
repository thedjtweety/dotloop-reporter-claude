import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { transactions } from "../../drizzle/schema";
import { getDb } from "../db";

export const goalsForecastingProceduresRouter = router({
  /**
   * Set agent goal
   */
  setAgentGoal: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        agentName: z.string(),
        goalType: z.enum(["volume", "commission", "transactions", "closingRate"]),
        targetValue: z.number(),
        period: z.enum(["monthly", "quarterly", "yearly"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement goal storage when table is created
      return {
        success: true,
        goalId: `goal_${Date.now()}`,
        message: `Goal set for ${input.agentName}: ${input.targetValue} ${input.goalType} by ${input.endDate}`,
      };
    }),

  /**
   * Get agent progress towards goal
   */
  getGoalProgress: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        agentName: z.string(),
        goalType: z.enum(["volume", "commission", "transactions", "closingRate"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, input.tenantId),
            gte(transactions.closingDate, input.startDate),
            lte(transactions.closingDate, input.endDate)
          )
        );

      // Filter for this agent
      const agentTransactions = txns.filter((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];
        return agents.includes(input.agentName);
      });

      let currentValue = 0;

      if (input.goalType === "volume") {
        currentValue = agentTransactions.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0);
      } else if (input.goalType === "commission") {
        currentValue = agentTransactions.reduce((sum, t) => sum + (t.commissionTotal || 0), 0);
      } else if (input.goalType === "transactions") {
        currentValue = agentTransactions.length;
      } else if (input.goalType === "closingRate") {
        const closed = agentTransactions.filter((t) =>
          t.loopStatus?.toLowerCase().includes("closed")
        ).length;
        currentValue = agentTransactions.length > 0 ? (closed / agentTransactions.length) * 100 : 0;
      }

      return {
        agentName: input.agentName,
        goalType: input.goalType,
        currentValue,
        period: {
          startDate: input.startDate,
          endDate: input.endDate,
        },
      };
    }),

  /**
   * Forecast future performance
   */
  forecastPerformance: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        agentName: z.string(),
        metric: z.enum(["volume", "commission", "transactions"]),
        historicalMonths: z.number().default(6),
        forecastMonths: z.number().default(3),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Get historical data
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - input.historicalMonths, 1);

      const txns = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, input.tenantId),
            gte(transactions.closingDate, sixMonthsAgo.toISOString().split("T")[0])
          )
        );

      // Filter for this agent
      const agentTransactions = txns.filter((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];
        return agents.includes(input.agentName);
      });

      // Group by month
      const monthlyData = new Map<string, number>();

      agentTransactions.forEach((t) => {
        const date = new Date(t.closingDate || new Date().toISOString());
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

        let value = 0;
        if (input.metric === "volume") {
          value = t.salePrice || t.price || 0;
        } else if (input.metric === "commission") {
          value = t.commissionTotal || 0;
        } else if (input.metric === "transactions") {
          value = 1;
        }

        monthlyData.set(month, (monthlyData.get(month) || 0) + value);
      });

      // Calculate average
      const values = Array.from(monthlyData.values());
      const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      // Simple linear regression for trend
      const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;

      // Generate forecast
      const forecast = [];
      for (let i = 1; i <= input.forecastMonths; i++) {
        const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const forecastValue = average + trend * i;

        forecast.push({
          month: `${forecastDate.getFullYear()}-${String(forecastDate.getMonth() + 1).padStart(2, "0")}`,
          forecastedValue: Math.max(0, Math.round(forecastValue)),
          confidence: Math.max(0.5, Math.min(0.95, 0.8 - (i * 0.1))), // Confidence decreases over time
        });
      }

      return {
        agentName: input.agentName,
        metric: input.metric,
        historical: {
          months: input.historicalMonths,
          average: Math.round(average),
          trend: Math.round(trend),
        },
        forecast,
      };
    }),

  /**
   * Create contest
   */
  createContest: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        contestName: z.string(),
        description: z.string().optional(),
        metric: z.enum(["volume", "commission", "transactions"]),
        startDate: z.string(),
        endDate: z.string(),
        prizes: z.array(
          z.object({
            rank: z.number(),
            prizeName: z.string(),
            prizeValue: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement contest storage when table is created
      return {
        success: true,
        contestId: `contest_${Date.now()}`,
        message: `Contest "${input.contestName}" created from ${input.startDate} to ${input.endDate}`,
      };
    }),

  /**
   * Get contest leaderboard
   */
  getContestLeaderboard: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        contestId: z.string(),
        metric: z.enum(["volume", "commission", "transactions"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, input.tenantId),
            gte(transactions.closingDate, input.startDate),
            lte(transactions.closingDate, input.endDate)
          )
        );

      // Group by agent
      const agentMetrics = new Map<
        string,
        {
          volume: number;
          commission: number;
          transactions: number;
        }
      >();

      txns.forEach((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];
        agents.forEach((agent: string) => {
          const current = agentMetrics.get(agent) || {
            volume: 0,
            commission: 0,
            transactions: 0,
          };

          current.volume += t.salePrice || t.price || 0;
          current.commission += t.commissionTotal || 0;
          current.transactions += 1;

          agentMetrics.set(agent, current);
        });
      });

      // Convert to leaderboard
      let leaderboard = Array.from(agentMetrics.entries()).map(([agent, metrics], index) => ({
        rank: index + 1,
        agent,
        volume: metrics.volume,
        commission: metrics.commission,
        transactions: metrics.transactions,
        score: input.metric === "volume" ? metrics.volume : input.metric === "commission" ? metrics.commission : metrics.transactions,
      }));

      // Sort by score
      leaderboard.sort((a, b) => b.score - a.score);

      // Update ranks
      leaderboard = leaderboard.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

      return leaderboard;
    }),

  /**
   * Get forecast insights
   */
  getForecastInsights: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        metric: z.enum(["volume", "commission", "transactions"]),
        forecastMonths: z.number().default(3),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db
        .select()
        .from(transactions)
        .where(eq(transactions.tenantId, input.tenantId));

      // Group by agent and calculate forecasts
      const agentForecasts = new Map<string, { average: number; trend: number; forecast: number }>();

      const agents = new Set<string>();
      txns.forEach((t) => {
        const txnAgents = t.agents ? JSON.parse(t.agents) : [];
        txnAgents.forEach((agent: string) => agents.add(agent));
      });

      // For each agent, calculate forecast
      agents.forEach((agent) => {
        const agentTxns = txns.filter((t) => {
          const txnAgents = t.agents ? JSON.parse(t.agents) : [];
          return txnAgents.includes(agent);
        });

        let values: number[] = [];

        if (input.metric === "volume") {
          values = agentTxns.map((t) => t.salePrice || t.price || 0);
        } else if (input.metric === "commission") {
          values = agentTxns.map((t) => t.commissionTotal || 0);
        } else if (input.metric === "transactions") {
          values = agentTxns.map(() => 1);
        }

        const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const trend = values.length > 1 ? (values[values.length - 1] - values[0]) / values.length : 0;
        const forecast = average + trend * input.forecastMonths;

        agentForecasts.set(agent, {
          average: Math.round(average),
          trend: Math.round(trend),
          forecast: Math.max(0, Math.round(forecast)),
        });
      });

      // Sort by forecast
      const sorted = Array.from(agentForecasts.entries())
        .sort((a, b) => b[1].forecast - a[1].forecast)
        .slice(0, 10);

      return {
        metric: input.metric,
        forecastMonths: input.forecastMonths,
        topForecasts: sorted.map(([agent, data]) => ({
          agent,
          ...data,
        })),
      };
    }),
});
