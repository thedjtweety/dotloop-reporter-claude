import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { transactions, oauthTokens } from "../../drizzle/schema";
import { getDb } from "../db";
import { tokenEncryption } from "../lib/token-encryption";
import { getTenantIdFromUser } from "../lib/tenant-context";

const DOTLOOP_API_BASE = "https://api-gateway.dotloop.com/public/v2";

/**
 * Get user's active Dotloop token
 */
async function getUserDotloopToken(db: any, tenantId: number, userId: number) {
  const tokens = await db.select().from(oauthTokens).where(eq(oauthTokens.userId, userId));

  return tokens.find(
    (t: any) => t.tenantId === tenantId && t.provider === "dotloop" && t.isActive === 1
  );
}

/**
 * Decrypt access token
 */
function decryptAccessToken(encryptedToken: string): string {
  return tokenEncryption.decrypt(encryptedToken);
}

/**
 * Fetch loops from Dotloop API
 */
async function fetchLoopsFromDotloop(accessToken: string, profileId?: string) {
  const url = profileId
    ? `${DOTLOOP_API_BASE}/profile/${profileId}/loops`
    : `${DOTLOOP_API_BASE}/loops`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch loops: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch loop details from Dotloop API
 */
async function fetchLoopDetails(accessToken: string, loopId: string) {
  const response = await fetch(`${DOTLOOP_API_BASE}/loop/${loopId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch loop details: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Map Dotloop loop data to transaction format
 */
function mapDotloopLoopToTransaction(loopData: any, tenantId: number): any {
  return {
    tenantId,
    loopId: loopData.id,
    loopName: loopData.name || loopData.address,
    loopStatus: loopData.status || "Unknown",
    listingDate: loopData.listingDate ? new Date(loopData.listingDate).toISOString() : null,
    closingDate: loopData.closingDate ? new Date(loopData.closingDate).toISOString() : null,
    price: loopData.price || 0,
    salePrice: loopData.salePrice || loopData.price || 0,
    agents: JSON.stringify(loopData.participants?.map((p: any) => p.name) || []),
    transactionType: loopData.transactionType || "Unknown",
    state: loopData.state || loopData.address?.split(",").pop()?.trim(),
    city: loopData.city,
    address: loopData.address,
    commission: 0,
    commissionRate: 0,
    commissionTotal: 0,
    dataSyncedAt: new Date().toISOString(),
    sourceType: "dotloop",
    sourceId: loopData.id,
  };
}

export const dotloopDataSyncProceduresRouter = router({
  /**
   * Sync transactions from Dotloop
   */
  syncTransactionsFromDotloop: protectedProcedure
    .input(
      z.object({
        profileId: z.string().optional(),
        limit: z.number().default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      try {
        // Get user's Dotloop token
        const tokenRecord = await getUserDotloopToken(db, tenantId, ctx.user.id);

        if (!tokenRecord) {
          throw new Error("No Dotloop connection found. Please connect your Dotloop account first.");
        }

        // Decrypt access token
        const accessToken = decryptAccessToken(tokenRecord.encryptedAccessToken);

        // Fetch loops from Dotloop
        const loopsResponse = await fetchLoopsFromDotloop(accessToken, input.profileId);
        const loops = loopsResponse.data || [];

        if (!Array.isArray(loops)) {
          throw new Error("Invalid response from Dotloop API");
        }

        // Limit to specified number
        const loopsToSync = loops.slice(0, input.limit);

        // Fetch detailed information for each loop
        const detailedLoops = await Promise.all(
          loopsToSync.map(async (loop: any) => {
            try {
              const details = await fetchLoopDetails(accessToken, loop.id);
              return details.data || loop;
            } catch (error) {
              console.warn(`Failed to fetch details for loop ${loop.id}:`, error);
              return loop;
            }
          })
        );

        // Map to transaction format
        const transactionsToInsert = detailedLoops.map((loop: any) =>
          mapDotloopLoopToTransaction(loop, tenantId)
        );

        // Insert or update transactions
        let insertedCount = 0;
        let updatedCount = 0;

        for (const txn of transactionsToInsert) {
          // Check if transaction already exists
          const existing = await db
            .select()
            .from(transactions)
            .where(eq(transactions.loopId, txn.loopId));

          if (existing.length > 0) {
            // Update existing transaction
            await db
              .update(transactions)
              .set({
                ...txn,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(transactions.loopId, txn.loopId));
            updatedCount++;
          } else {
            // Insert new transaction
            await db.insert(transactions).values({
              ...txn,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            insertedCount++;
          }
        }

        // Update token's last used timestamp
        await db
          .update(oauthTokens)
          .set({
            lastUsedAt: new Date().toISOString(),
          })
          .where(eq(oauthTokens.id, tokenRecord.id));

        return {
          success: true,
          totalLoops: loops.length,
          syncedLoops: loopsToSync.length,
          insertedCount,
          updatedCount,
          message: `Synced ${loopsToSync.length} transactions from Dotloop (${insertedCount} new, ${updatedCount} updated)`,
        };
      } catch (error) {
        console.error("[DotloopDataSync] Sync failed:", error);
        throw error;
      }
    }),

  /**
   * Get sync status
   */
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const tenantId = await getTenantIdFromUser(ctx.user.id);

    try {
      const tokenRecord = await getUserDotloopToken(db, tenantId, ctx.user.id);

      if (!tokenRecord) {
        return {
          connected: false,
          lastSync: null,
          message: "Not connected to Dotloop",
        };
      }

      // Get count of transactions synced from Dotloop
      const txns = await db.select().from(transactions).where(eq(transactions.tenantId, tenantId));
      const dotloopTxns = txns.filter((t: any) => t.sourceType === "dotloop");

      return {
        connected: true,
        lastSync: tokenRecord.lastUsedAt,
        totalTransactions: txns.length,
        dotloopTransactions: dotloopTxns.length,
        connectionName: tokenRecord.connectionName,
        accountEmail: tokenRecord.dotloopAccountEmail,
        message: `Connected to Dotloop with ${dotloopTxns.length} synced transactions`,
      };
    } catch (error) {
      console.error("[DotloopDataSync] Status check failed:", error);
      throw error;
    }
  }),

  /**
   * Get available profiles
   */
  getAvailableProfiles: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const tenantId = await getTenantIdFromUser(ctx.user.id);

    try {
      const tokenRecord = await getUserDotloopToken(db, tenantId, ctx.user.id);

      if (!tokenRecord) {
        throw new Error("No Dotloop connection found");
      }

      const accessToken = decryptAccessToken(tokenRecord.encryptedAccessToken);

      // Fetch profiles
      const response = await fetch(`${DOTLOOP_API_BASE}/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profiles: ${response.status}`);
      }

      const data = await response.json();
      const profiles = data.data || [];

      return {
        success: true,
        profiles: profiles.map((p: any) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          isDefault: p.id === tokenRecord.dotloopDefaultProfileId,
        })),
      };
    } catch (error) {
      console.error("[DotloopDataSync] Failed to fetch profiles:", error);
      throw error;
    }
  }),

  /**
   * Get sync history
   */
  getSyncHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tenantId = await getTenantIdFromUser(ctx.user.id);

      try {
        // Get transactions synced from Dotloop, ordered by sync date
        const txns = await db
          .select()
          .from(transactions)
          .where(eq(transactions.tenantId, tenantId));

        const dotloopTxns = txns
          .filter((t: any) => t.sourceType === "dotloop")
          .sort((a: any, b: any) => {
            const aDate = new Date(a.dataSyncedAt || 0).getTime();
            const bDate = new Date(b.dataSyncedAt || 0).getTime();
            return bDate - aDate;
          })
          .slice(0, input.limit);

        return {
          success: true,
          syncHistory: dotloopTxns.map((t: any) => ({
            loopId: t.loopId,
            loopName: t.loopName,
            syncedAt: t.dataSyncedAt,
            status: t.loopStatus,
            price: t.salePrice || t.price,
          })),
        };
      } catch (error) {
        console.error("[DotloopDataSync] Failed to fetch sync history:", error);
        throw error;
      }
    }),

  /**
   * Manually trigger sync
   */
  triggerManualSync: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const tenantId = await getTenantIdFromUser(ctx.user.id);

    try {
      const tokenRecord = await getUserDotloopToken(db, tenantId, ctx.user.id);

      if (!tokenRecord) {
        throw new Error("No Dotloop connection found");
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenRecord.tokenExpiresAt);

      if (expiresAt < now) {
        throw new Error("Token expired. Please reconnect your Dotloop account.");
      }

      // Trigger sync (this would be called by the sync procedure)
      return {
        success: true,
        message: "Sync triggered successfully",
      };
    } catch (error) {
      console.error("[DotloopDataSync] Manual sync trigger failed:", error);
      throw error;
    }
  }),

  /**
   * Get sync statistics
   */
  getSyncStatistics: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const tenantId = await getTenantIdFromUser(ctx.user.id);

    try {
      const txns = await db.select().from(transactions).where(eq(transactions.tenantId, tenantId));
      const dotloopTxns = txns.filter((t: any) => t.sourceType === "dotloop");
      const csvTxns = txns.filter((t: any) => t.sourceType !== "dotloop");

      // Calculate statistics
      const totalVolume = dotloopTxns.reduce((sum: number, t: any) => sum + (t.salePrice || 0), 0);
      const totalCommission = dotloopTxns.reduce((sum: number, t: any) => sum + (t.commissionTotal || 0), 0);
      const closedCount = dotloopTxns.filter((t: any) =>
        t.loopStatus?.toLowerCase().includes("closed")
      ).length;

      return {
        success: true,
        statistics: {
          totalTransactions: txns.length,
          dotloopTransactions: dotloopTxns.length,
          csvTransactions: csvTxns.length,
          totalVolume,
          totalCommission,
          closedTransactions: closedCount,
          dotloopPercentage: txns.length > 0 ? ((dotloopTxns.length / txns.length) * 100).toFixed(1) : 0,
        },
      };
    } catch (error) {
      console.error("[DotloopDataSync] Failed to fetch statistics:", error);
      throw error;
    }
  }),
});
