/**
 * Dotloop API Integration Router
 * Handles syncing data from Dotloop API
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { DotloopAPIClient } from '../lib/dotloop-client';
import { TRPCError } from '@trpc/server';
import { getValidOAuthToken } from '../lib/oauth-token-helper';
import { getTenantIdFromUser } from '../lib/tenant-context';

/**
 * Transform Dotloop loop data to DotloopRecord format
 */
function transformDotloopToRecord(loop: any, participants: any[] = []) {
  const agentNames = participants
    .filter((p: any) => p.role === 'LISTING_AGENT' || p.role === 'BUYING_AGENT')
    .map((p: any) => p.name)
    .join(', ');

  return {
    loopId: loop.loopId || '',
    loopName: loop.name || '',
    loopStatus: loop.status || '',
    loopViewUrl: loop.viewUrl || '',
    address: loop.address?.displayName || '',
    city: loop.address?.city || '',
    state: loop.address?.state || '',
    price: parseFloat(loop.listingPrice || 0),
    salePrice: parseFloat(loop.salePrice || 0),
    closingDate: loop.closingDate || null,
    listingDate: loop.listingDate || null,
    createdDate: loop.created || new Date().toISOString(),
    agents: agentNames,
    propertyType: loop.propertyType || '',
    bedrooms: parseInt(loop.bedrooms || 0),
    bathrooms: parseInt(loop.bathrooms || 0),
    squareFootage: parseInt(loop.squareFootage || 0),
    commissionRate: parseFloat(loop.commissionRate || 0),
    commissionTotal: parseFloat(loop.totalCommission || 0),
    leadSource: 'Dotloop API',
    transactionType: loop.transactionType || 'Unknown',
  };
}

export const dotloopApiRouter = router({
  /**
   * Get available Dotloop profiles
   */
  getProfiles: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user?.id) throw new Error('User not authenticated');
      const tenantId = await getTenantIdFromUser(ctx.user.id);
      
      // Get valid OAuth token (automatically refreshes if needed)
      const tokenData = await getValidOAuthToken(ctx.user.id, tenantId, 'dotloop');
      
      // Initialize Dotloop API client
      const client = new DotloopAPIClient(tokenData.accessToken);
      
      // Fetch profiles
      const profiles = await client.getProfiles();
      
      return profiles.map((profile: any) => ({
        id: profile.profileId,
        name: profile.name,
        email: profile.email,
        isDefault: profile.profileId === tokenData.profileId,
      }));
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch Dotloop profiles',
      });
    }
  }),

  /**
   * Sync loops from Dotloop
   */
  syncLoops: publicProcedure
    .input(
      z.object({
        profileId: z.string().min(1),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) throw new Error('User not authenticated');
        const tenantId = await getTenantIdFromUser(ctx.user.id);
        
        // Get valid OAuth token (automatically refreshes if needed)
        const tokenData = await getValidOAuthToken(ctx.user.id, tenantId, 'dotloop');
        
        // Initialize Dotloop API client
        const client = new DotloopAPIClient(tokenData.accessToken);
        
        // Fetch loops from Dotloop
        const loops = await client.getLoops(
          input.profileId,
          input.startDate,
          input.endDate
        );
        
        // Transform loops to DotloopRecord format
        const records = [];
        for (const loop of loops) {
          const participants = await client.getLoopParticipants(
            input.profileId,
            loop.loopId
          );
          records.push(transformDotloopToRecord(loop, participants));
        }
        
        // TODO: Save records to database
        // await saveRecordsToDatabase(ctx.user.id, tenantId, records);
        
        return {
          uploadId: `sync-${Date.now()}`,
          recordCount: records.length,
          message: `Successfully synced ${records.length} loops from Dotloop`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to sync loops from Dotloop',
        });
      }
    }),

  /**
   * Get sync status
   */
  getSyncStatus: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user?.id) throw new Error('User not authenticated');
      const tenantId = await getTenantIdFromUser(ctx.user.id);
      
      // Check if user has a valid Dotloop token
      let isConnected = false;
      try {
        await getValidOAuthToken(ctx.user.id, tenantId, 'dotloop');
        isConnected = true;
      } catch (error) {
        // Token not found or expired
        isConnected = false;
      }
      
      // TODO: Fetch last sync time from database
      // const lastSync = await getLastSyncTime(ctx.user.id, tenantId);
      
      return {
        isConnected,
        lastSync: null, // TODO: Implement
        nextSync: null, // TODO: Implement
        autoSyncEnabled: false, // TODO: Implement
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get sync status',
      });
    }
  }),

  /**
   * Enable/disable auto sync
   */
  setAutoSync: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return {
          autoSyncEnabled: input.enabled,
          message: input.enabled ? 'Auto sync enabled' : 'Auto sync disabled',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update auto sync setting',
        });
      }
    }),

  /**
   * Test Dotloop connection
   */
  testConnection: publicProcedure.query(async ({ ctx }) => {
    try {
      if (!ctx.user?.id) throw new Error('User not authenticated');
      const tenantId = await getTenantIdFromUser(ctx.user.id);
      
      // Get valid OAuth token (automatically refreshes if needed)
      const tokenData = await getValidOAuthToken(ctx.user.id, tenantId, 'dotloop');
      
      // Initialize Dotloop API client and test connection
      const client = new DotloopAPIClient(tokenData.accessToken);
      const profiles = await client.getProfiles();
      
      return {
        connected: true,
        message: `Successfully connected to Dotloop. Found ${profiles.length} profile(s).`,
        profileCount: profiles.length,
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to test Dotloop connection',
      });
    }
  }),

  /**
   * Get recently synced transactions
   * Used by the Chrome extension to retrieve synced data
   */
  getRecentSync: publicProcedure
    .input(z.object({
      profileId: z.string(),
      limit: z.number().default(100),
    }))
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user?.id) throw new Error('User not authenticated');
        const tenantId = await getTenantIdFromUser(ctx.user.id);
        const tokenData = await getValidOAuthToken(ctx.user.id, tenantId, 'dotloop');
        
        const client = new DotloopAPIClient(tokenData.accessToken);
        
        // Fetch loops
        const loops = await client.getLoops(input.profileId);
        
        // Transform to transaction format
        const transactions = [];
        for (const loop of loops.slice(0, input.limit)) {
          try {
            const participants = await client.getLoopParticipants(
              input.profileId,
              loop.loopId
            );
            transactions.push(transformDotloopToRecord(loop, participants));
          } catch (error) {
            console.error(`Failed to fetch participants for loop ${loop.loopId}:`, error);
            // Continue with next loop
          }
        }
        
        return {
          transactions,
          total: transactions.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch transactions',
        });
      }
    }),
});
