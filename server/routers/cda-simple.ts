import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { calculateCDA } from '../lib/cda-calculator';

/**
 * Simplified CDA Router
 * 
 * This router provides a streamlined CDA generation workflow:
 * 1. Takes minimal transaction data
 * 2. Auto-fills reasonable defaults
 * 3. Generates CDA immediately
 */

const simpleCDAInputSchema = z.object({
  // Required fields only
  propertyAddress: z.string(),
  salePrice: z.number().positive(),
  agentName: z.string(),
  commissionRate: z.number().positive().default(3), // Default 3%
  
  // Optional fields
  closingDate: z.string().optional(),
  mlsNumber: z.string().optional(),
  transactionType: z.enum(['listing', 'selling', 'both']).default('both'),
});

export const cdaSimpleRouter = router({
  /**
   * Generate CDA with auto-filled defaults
   * Takes minimal transaction data and creates a complete CDA
   */
  generateQuick: publicProcedure
    .input(simpleCDAInputSchema)
    .mutation(async ({ input }) => {
      // Auto-fill defaults for a complete CDA
      const cdaData = {
        propertyAddress: input.propertyAddress,
        salePrice: input.salePrice,
        totalCommissionRate: input.commissionRate,
        closingDate: input.closingDate,
        mlsNumber: input.mlsNumber,
        
        // Default: 50/50 split between listing and selling
        sellingSplitPercent: 50,
        listingSplitPercent: 50,
        
        // Selling side defaults
        sellingAgent1Name: input.transactionType === 'selling' || input.transactionType === 'both' ? input.agentName : 'N/A',
        sellingAgent1SplitPercent: 80, // Agent gets 80%
        sellingBrokerSplitPercent: 100, // Broker gets full commission before split
        sellingOtherAdjustments: [],
        
        // Listing side defaults
        listingAgent1Name: input.transactionType === 'listing' || input.transactionType === 'both' ? input.agentName : 'N/A',
        listingAgent1SplitPercent: 80, // Agent gets 80%
        listingBrokerSplitPercent: 100, // Broker gets full commission before split
        listingOtherAdjustments: [],
        
        // No referrals by default
        referralPercent: 0,
      };
      
      try {
        const result = calculateCDA(cdaData);
        
        return {
          success: true,
          calculation: result,
          cdaData, // Return the full data for editing if needed
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'CDA calculation failed',
          cdaData,
        };
      }
    }),
});
