import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { calculateCDA } from '../lib/cda-calculator';
import { generateCDAPDF } from '../lib/cdaPdfGenerator';

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

const CDADataSchema = z.object({
  propertyAddress: z.string(),
  mlsNumber: z.string().optional(),
  salePrice: z.number(),
  totalCommissionRate: z.number(),
  totalGrossCommission: z.number(),
  buyerName: z.string().optional(),
  buyerAddress: z.string().optional(),
  buyerPhone: z.string().optional(),
  buyerEmail: z.string().optional(),
  sellerName: z.string(),
  sellerAddress: z.string().optional(),
  sellerPhone: z.string().optional(),
  sellerEmail: z.string().optional(),
  closingDate: z.string().optional(),
  sellingSplitPercent: z.number(),
  listingSplitPercent: z.number(),
  sellingGrossCommission: z.number(),
  listingGrossCommission: z.number(),
  sellingCompanyName: z.string().optional(),
  sellingCompanyAddress: z.string().optional(),
  sellingAgent1Name: z.string(),
  sellingAgent1SplitPercent: z.number(),
  sellingAgent1Commission: z.number(),
  sellingAgent2Name: z.string().optional(),
  sellingAgent2SplitPercent: z.number().optional(),
  sellingAgent2Commission: z.number().optional(),
  sellingBrokerSplitPercent: z.number(),
  sellingBrokerageCommission: z.number(),
  sellingCommissionAfterFees: z.number(),
  listingCompanyName: z.string().optional(),
  listingCompanyAddress: z.string().optional(),
  listingAgent1Name: z.string(),
  listingAgent1SplitPercent: z.number(),
  listingAgent1Commission: z.number(),
  listingAgent2Name: z.string().optional(),
  listingAgent2SplitPercent: z.number().optional(),
  listingAgent2Commission: z.number().optional(),
  listingBrokerSplitPercent: z.number(),
  listingBrokerageCommission: z.number(),
  listingCommissionAfterFees: z.number(),
  referralCompanyName: z.string().optional(),
  referralPercent: z.number().optional(),
  referralType: z.enum(['selling', 'listing']).optional(),
  referralFee: z.number().optional(),
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

  /**
   * Generate PDF from CDA data
   * Takes complete CDA data and generates a professional PDF
   */
  generatePDF: publicProcedure
    .input(CDADataSchema)
    .mutation(async ({ input }) => {
      try {
        const pdfBuffer = await generateCDAPDF(input);
        
        // For now, return a base64 encoded string
        // In production, you'd upload to S3 and return the URL
        const base64 = pdfBuffer.toString('base64');
        const dataUrl = `data:application/pdf;base64,${base64}`;
        
        return {
          success: true,
          url: dataUrl,
          fileName: `CDA_${input.propertyAddress.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      } catch (error) {
        throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),
});
