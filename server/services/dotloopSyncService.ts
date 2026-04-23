import { transactions, oauthTokens } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';

/**
 * Dotloop Sync Service
 * Handles fetching transactions from Dotloop API and syncing to database
 */

interface DotloopTransaction {
  id: string;
  loop_name: string;
  loop_status: string;
  price?: number;
  closing_date?: string;
  buyer_agent?: string;
  seller_agent?: string;
  property_address?: string;
  property_city?: string;
  property_state?: string;
  transaction_type?: string;
  [key: string]: any;
}

export interface SyncResult {
  success: boolean;
  transactionsFetched: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  errors: string[];
  duration: number;
  lastSyncTime?: string;
}

export class DotloopSyncService {
  private apiBase = 'https://api-gateway.dotloop.com/public/v2';
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  /**
   * Sync transactions for a specific user from Dotloop API
   */
  async syncUserTransactions(userId: number, tenantId: number): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let transactionsFetched = 0;
    let transactionsCreated = 0;
    let transactionsUpdated = 0;

    try {
      const db = await getDb();

      if (!db) {
        throw new Error('Database connection failed');
      }

      // Get user's OAuth token
      const token = await (db.query as any).oauthTokens.findFirst({
        where: and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, 'dotloop')
        ),
      });

      if (!token || !token.accessToken) {
        throw new Error('No Dotloop OAuth token found for user');
      }

      // Fetch transactions from Dotloop API
      const dotloopTransactions = await this.fetchTransactionsFromAPI(
        token.accessToken,
        token.accountId || ''
      );

      transactionsFetched = dotloopTransactions.length;

      // Create a dummy upload for these synced transactions
      const uploadId = 0; // Placeholder

      // Process each transaction
      for (const dotloopTx of dotloopTransactions) {
        try {
          const processed = this.processTransaction(dotloopTx, userId, tenantId, uploadId);

          // Check if transaction already exists
          const existing = await (db.query as any).transactions.findFirst({
            where: and(
              eq(transactions.userId, userId),
              eq(transactions.loopId, dotloopTx.id)
            ),
          });

          if (existing) {
            // Update existing transaction
            await db
              .update(transactions)
              .set({
                ...processed,
              })
              .where(eq(transactions.id, existing.id));

            transactionsUpdated++;
          } else {
            // Create new transaction
            await db.insert(transactions).values({
              ...processed,
              loopId: dotloopTx.id as any,
            } as any);

            transactionsCreated++;
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Failed to process transaction ${dotloopTx.id}: ${errorMsg}`);
        }
      }

      const duration = Date.now() - startTime;
      const lastSyncTime = new Date().toISOString();

      return {
        success: true,
        transactionsFetched,
        transactionsCreated,
        transactionsUpdated,
        errors,
        duration,
        lastSyncTime,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      errors.push(errorMsg);
      const duration = Date.now() - startTime;

      return {
        success: false,
        transactionsFetched: 0,
        transactionsCreated: 0,
        transactionsUpdated: 0,
        errors,
        duration,
      };
    }
  }

  /**
   * Fetch transactions from Dotloop API with retry logic
   */
  private async fetchTransactionsFromAPI(
    accessToken: string,
    accountId: string
  ): Promise<DotloopTransaction[]> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(
          `${this.apiBase}/accounts/${accountId}/loops`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `API error: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        return data.loops || [];
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Retry with exponential backoff
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError || new Error('Failed to fetch transactions from Dotloop');
  }

  /**
   * Process Dotloop transaction into our schema
   */
  private processTransaction(
    dotloopTx: DotloopTransaction,
    userId: number,
    tenantId: number,
    uploadId: number
  ): any {
    return {
      userId,
      tenantId,
      uploadId,
      loopName: dotloopTx.loop_name,
      loopStatus: dotloopTx.loop_status,
      price: dotloopTx.price ? Math.round(parseFloat(String(dotloopTx.price))) : null,
      closingDate: dotloopTx.closing_date ? String(dotloopTx.closing_date) : null,
      address: dotloopTx.property_address || null,
      city: dotloopTx.property_city || null,
      state: dotloopTx.property_state || null,
      propertyType: dotloopTx.transaction_type || null,
      agents: [dotloopTx.buyer_agent, dotloopTx.seller_agent]
        .filter(Boolean)
        .join(', ') || null,
    };
  }

  /**
   * Manual sync trigger
   */
  async manualSync(userId: number, tenantId: number): Promise<SyncResult> {
    return this.syncUserTransactions(userId, tenantId);
  }
}

export const dotloopSyncService = new DotloopSyncService();
