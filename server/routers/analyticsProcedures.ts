import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { transactions } from "../../drizzle/schema";
import { getDb } from "../db";

export const analyticsProceduresRouter = router({
  /**
   * Get year-over-year comparison
   */
  getYearOverYearComparison: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        currentYear: z.number(),
        previousYear: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const currentYearTxns = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, input.tenantId),
            gte(transactions.closingDate, `${input.currentYear}-01-01`),
            lte(transactions.closingDate, `${input.currentYear}-12-31`)
          )
        );

      const previousYearTxns = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.tenantId, input.tenantId),
            gte(transactions.closingDate, `${input.previousYear}-01-01`),
            lte(transactions.closingDate, `${input.previousYear}-12-31`)
          )
        );

      const currentMetrics = calculateMetrics(currentYearTxns);
      const previousMetrics = calculateMetrics(previousYearTxns);

      return {
        currentYear: {
          year: input.currentYear,
          ...currentMetrics,
        },
        previousYear: {
          year: input.previousYear,
          ...previousMetrics,
        },
        comparison: {
          volumeChange: currentMetrics.totalVolume - previousMetrics.totalVolume,
          volumeChangePercent:
            previousMetrics.totalVolume > 0
              ? ((currentMetrics.totalVolume - previousMetrics.totalVolume) /
                  previousMetrics.totalVolume) *
                100
              : 0,
          commissionChange:
            currentMetrics.totalCommission - previousMetrics.totalCommission,
          commissionChangePercent:
            previousMetrics.totalCommission > 0
              ? ((currentMetrics.totalCommission - previousMetrics.totalCommission) /
                  previousMetrics.totalCommission) *
                100
              : 0,
          transactionChange:
            currentMetrics.totalTransactions - previousMetrics.totalTransactions,
        },
      };
    }),

  /**
   * Get agent leaderboard
   */
  getAgentLeaderboard: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        metric: z.enum(["commission", "volume", "transactions", "closingRate"]),
        limit: z.number().default(10),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      let whereConditions: any = eq(transactions.tenantId, input.tenantId);

      if (input.startDate && input.endDate) {
        whereConditions = and(
          eq(transactions.tenantId, input.tenantId),
          gte(transactions.closingDate, input.startDate),
          lte(transactions.closingDate, input.endDate)
        );
      }

      const txns = await db.select().from(transactions).where(whereConditions);

      // Group by agent
      const agentMetrics = new Map<
        string,
        {
          transactions: number;
          volume: number;
          commission: number;
          closed: number;
        }
      >();

      txns.forEach((t) => {
        const agents = t.agents ? JSON.parse(t.agents) : [];
        agents.forEach((agent: string) => {
          const current = agentMetrics.get(agent) || {
            transactions: 0,
            volume: 0,
            commission: 0,
            closed: 0,
          };

          current.transactions += 1;
          current.volume += t.salePrice || t.price || 0;
          current.commission += t.commissionTotal || 0;

          if (t.loopStatus?.toLowerCase().includes("closed")) {
            current.closed += 1;
          }

          agentMetrics.set(agent, current);
        });
      });

      // Convert to array and sort
      let leaderboard = Array.from(agentMetrics.entries()).map(([agent, metrics]) => ({
        agent,
        ...metrics,
        closingRate: metrics.transactions > 0 ? (metrics.closed / metrics.transactions) * 100 : 0,
      }));

      // Sort by metric
      if (input.metric === "commission") {
        leaderboard.sort((a, b) => b.commission - a.commission);
      } else if (input.metric === "volume") {
        leaderboard.sort((a, b) => b.volume - a.volume);
      } else if (input.metric === "transactions") {
        leaderboard.sort((a, b) => b.transactions - a.transactions);
      } else if (input.metric === "closingRate") {
        leaderboard.sort((a, b) => b.closingRate - a.closingRate);
      }

      return leaderboard.slice(0, input.limit);
    }),

  /**
   * Get geographic analysis
   */
  getGeographicAnalysis: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        groupBy: z.enum(["state", "county", "city"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db
        .select()
        .from(transactions)
        .where(eq(transactions.tenantId, input.tenantId));

      const locationMetrics = new Map<
        string,
        {
          transactions: number;
          volume: number;
          commission: number;
        }
      >();

      txns.forEach((t) => {
        let location = "";
        if (input.groupBy === "state") {
          location = t.state || "Unknown";
        } else if (input.groupBy === "county") {
          location = t.county || "Unknown";
        } else if (input.groupBy === "city") {
          location = t.city || "Unknown";
        }

        const current = locationMetrics.get(location) || {
          transactions: 0,
          volume: 0,
          commission: 0,
        };

        current.transactions += 1;
        current.volume += t.salePrice || t.price || 0;
        current.commission += t.commissionTotal || 0;

        locationMetrics.set(location, current);
      });

      return Array.from(locationMetrics.entries())
        .map(([location, metrics]) => ({
          location,
          transactions: metrics.transactions,
          volume: metrics.volume,
          commission: metrics.commission,
        }))
        .sort((a, b) => b.volume - a.volume);
    }),

  /**
   * Get market insights
   */
  getMarketInsights: protectedProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const txns = await db
        .select()
        .from(transactions)
        .where(eq(transactions.tenantId, input.tenantId));

      const metrics = calculateMetrics(txns);

      // Calculate additional insights
      const propertyTypes = new Map<string, number>();
      const leadSources = new Map<string, number>();

      txns.forEach((t) => {
        if (t.propertyType) {
          propertyTypes.set(t.propertyType, (propertyTypes.get(t.propertyType) || 0) + 1);
        }
        if (t.leadSource) {
          leadSources.set(t.leadSource, (leadSources.get(t.leadSource) || 0) + 1);
        }
      });

      return {
        ...metrics,
        topPropertyTypes: Array.from(propertyTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count })),
        topLeadSources: Array.from(leadSources.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([source, count]) => ({ source, count })),
      };
    }),

  /**
   * Get trend data
   */
  getTrendData: protectedProcedure
    .input(
      z.object({
        tenantId: z.number(),
        metric: z.enum(["volume", "commission", "transactions"]),
        period: z.enum(["daily", "weekly", "monthly", "quarterly"]),
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

      const trendData = new Map<string, { volume: number; commission: number; transactions: number }>();

      txns.forEach((t) => {
        let period = "";
        const date = new Date(t.closingDate || new Date().toISOString());

        if (input.period === "daily") {
          period = date.toISOString().split("T")[0];
        } else if (input.period === "weekly") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().split("T")[0];
        } else if (input.period === "monthly") {
          period = date.toISOString().substring(0, 7);
        } else if (input.period === "quarterly") {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          period = `${date.getFullYear()}-Q${quarter}`;
        }

        const current = trendData.get(period) || {
          volume: 0,
          commission: 0,
          transactions: 0,
        };

        current.volume += t.salePrice || t.price || 0;
        current.commission += t.commissionTotal || 0;
        current.transactions += 1;

        trendData.set(period, current);
      });

      return Array.from(trendData.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([period, data]) => ({
          period,
          volume: data.volume,
          commission: data.commission,
          transactions: data.transactions,
        }));
    }),
});

/**
 * Helper function to calculate metrics
 */
function calculateMetrics(txns: any[]) {
  return {
    totalTransactions: txns.length,
    totalVolume: txns.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0),
    totalCommission: txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0),
    averageCommission: txns.length > 0 ? txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0) / txns.length : 0,
    averageVolume: txns.length > 0 ? txns.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0) / txns.length : 0,
    closedTransactions: txns.filter((t) => t.loopStatus?.toLowerCase().includes("closed")).length,
    closingRate: txns.length > 0 ? (txns.filter((t) => t.loopStatus?.toLowerCase().includes("closed")).length / txns.length) * 100 : 0,
  };
}
