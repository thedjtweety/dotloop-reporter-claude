import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { calculateCDA } from '../lib/cda-calculator';
import { getDb } from '../db';
import { commissionPlans, agentAssignments } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Fixed CDA Router
 * 
 * Handles CDA generation with proper error messages when commission plan is missing.
 * This endpoint requires that the agent has a commission plan assigned.
 */

const fixedCDAInputSchema = z.object({
  // Transaction data (required)
  propertyAddress: z.string().min(1, 'Property address is required'),
  salePrice: z.number().positive('Sale price must be positive'),
  agentName: z.string().min(1, 'Agent name is required'),
  closingDate: z.string().optional(),
  mlsNumber: z.string().optional(),
  transactionType: z.enum(['listing', 'selling', 'both']).default('both'),
});

export const cdaFixedRouter = router({
  /**
   * Generate CDA from transaction data
   * Automatically fetches commission plan for the agent
   * Returns helpful error if plan is not assigned
   */
  generateFromTransaction: publicProcedure
    .input(fixedCDAInputSchema)
    .mutation(async ({ input }) => {
      try {
        // Step 1: Get database connection
        const db = await getDb();
        if (!db) {
          return {
            success: false,
            error: 'Database connection failed. Please try again.',
            requiresPlanAssignment: false,
          };
        }

        // Step 2: Find agent's commission plan assignment
        // Use case-insensitive search and trim whitespace
        const trimmedAgentName = input.agentName.trim();
        // Fetch all assignments and do case-insensitive matching in JavaScript
        const allAssignments = await db
          .select()
          .from(agentAssignments);
        
        const assignment = allAssignments.find(a => 
          a.agentName.toLowerCase() === trimmedAgentName.toLowerCase()
        );

        if (!assignment) {
          return {
            success: false,
            error: `Agent "${input.agentName}" does not have a commission plan assigned. Please assign a commission plan first.`,
            requiresPlanAssignment: true,
            agentName: input.agentName,
          };
        }

        // Step 3: Fetch the commission plan
        const [plan] = await db
          .select()
          .from(commissionPlans)
          .where(eq(commissionPlans.id, assignment.planId))
          .limit(1);

        if (!plan) {
          return {
            success: false,
            error: `Commission plan not found for agent "${input.agentName}". Please contact support.`,
            requiresPlanAssignment: false,
          };
        }

        // Step 4: Build CDA data using commission plan
        const agentSplitPercent = plan.splitPercentage;
        const brokerSplitPercent = 100 - agentSplitPercent;

        const cdaData = {
          propertyAddress: input.propertyAddress,
          salePrice: input.salePrice,
          totalCommissionRate: 3, // Default 3% - can be customized if needed
          closingDate: input.closingDate,
          mlsNumber: input.mlsNumber,

          // Default: 50/50 split between listing and selling
          sellingSplitPercent: 50,
          listingSplitPercent: 50,

          // Selling side - use plan split
          sellingAgent1Name:
            input.transactionType === 'selling' || input.transactionType === 'both'
              ? input.agentName
              : 'N/A',
          sellingAgent1SplitPercent: agentSplitPercent,
          sellingBrokerSplitPercent: brokerSplitPercent,
          sellingOtherAdjustments: [],

          // Listing side - use plan split
          listingAgent1Name:
            input.transactionType === 'listing' || input.transactionType === 'both'
              ? input.agentName
              : 'N/A',
          listingAgent1SplitPercent: agentSplitPercent,
          listingBrokerSplitPercent: brokerSplitPercent,
          listingOtherAdjustments: [],

          // No referrals by default
          referralPercent: 0,
        };

        // Step 5: Calculate CDA
        const result = calculateCDA(cdaData);

        if (!result.isValid) {
          return {
            success: false,
            error: `CDA calculation failed: ${result.validationErrors.join(', ')}`,
            requiresPlanAssignment: false,
            calculation: result,
          };
        }

        // Step 6: Return successful result
        return {
          success: true,
          calculation: result,
          cdaData,
          planName: plan.name,
          agentName: input.agentName,
          requiresPlanAssignment: false,
        };
      } catch (error) {
        console.error('[CDA Generation Error]', error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred during CDA generation',
          requiresPlanAssignment: false,
        };
      }
    }),

  /**
   * Check if agent has a commission plan assigned
   * Used to validate before attempting CDA generation
   */
  checkAgentPlan: publicProcedure
    .input(z.object({ agentName: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            hasAssignment: false,
            error: 'Database connection failed',
          };
        }

        const trimmedAgentName = input.agentName.trim();
        const [assignment] = await db
          .select()
          .from(agentAssignments)
          .where(ilike(agentAssignments.agentName, trimmedAgentName))
          .limit(1);

        if (!assignment) {
          return {
            hasAssignment: false,
            agentName: input.agentName,
          };
        }

        // Fetch plan details
        const [plan] = await db
          .select()
          .from(commissionPlans)
          .where(eq(commissionPlans.id, assignment.planId))
          .limit(1);

        return {
          hasAssignment: true,
          planId: assignment.planId,
          planName: plan?.name || 'Unknown Plan',
          splitPercentage: plan?.splitPercentage || 0,
        };
      } catch (error) {
        return {
          hasAssignment: false,
          error: error instanceof Error ? error.message : 'Failed to check agent plan',
        };
      }
    }),
});
