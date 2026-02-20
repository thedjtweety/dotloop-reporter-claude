/**
 * CDA (Commission Disbursement Authorization) Calculation Engine
 * 
 * This module handles all commission calculations for CDA generation.
 * All calculations are performed with precision to avoid floating-point errors.
 * 
 * Calculation Flow:
 * 1. Gross Commission = Sale Price × Commission Rate
 * 2. Split Between Sides (Selling/Listing)
 * 3. Referral Deductions (if applicable)
 * 4. Company/Agent Split
 * 5. Other Adjustments (+/- fees)
 * 6. Final Validation (sum of all disbursements = gross commission)
 */

export interface CDATransactionData {
  // Property & Transaction Details
  propertyAddress: string;
  mlsNumber?: string;
  salePrice: number;
  closingDate?: string;
  
  // Buyer/Seller Info
  buyerName?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  sellerName?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  loanType?: string;
  
  // Commission Data
  totalCommissionRate: number; // e.g., 4.5 for 4.5%
  sellingSplitPercent?: number; // e.g., 50 for 50% (defaults to 50)
  listingSplitPercent?: number; // e.g., 50 for 50% (defaults to 50)
  
  // Referral Data
  referralCompanyName?: string;
  referralPercent?: number; // e.g., 25 for 25%
  referralType?: 'listing' | 'selling'; // Which side pays the referral
  referralContact?: string;
  referralEmail?: string;
  referralPhone?: string;
  
  // Selling Company Data
  sellingCompanyName?: string;
  sellingCompanyAddress?: string;
  sellingCompanySplitPercent?: number; // e.g., 20 for 20% to company
  
  // Selling Agent Data
  sellingAgent1Name?: string;
  sellingAgent1SplitPercent?: number; // e.g., 80 for 80% to agent
  sellingAgent2Name?: string;
  sellingAgent2SplitPercent?: number;
  
  // Listing Company Data
  listingCompanyName?: string;
  listingCompanyAddress?: string;
  listingCompanySplitPercent?: number;
  
  // Listing Agent Data
  listingAgent1Name?: string;
  listingAgent1SplitPercent?: number;
  listingAgent2Name?: string;
  listingAgent2SplitPercent?: number;
  
  // Brokerage Data
  sellingBrokerName?: string;
  sellingBrokerSplitPercent?: number; // Defaults to 100%
  listingBrokerName?: string;
  listingBrokerSplitPercent?: number; // Defaults to 100%
  
  // Other Adjustments
  sellingOtherAdjustments?: Array<{ description: string; amount: number }>; // Positive or negative
  listingOtherAdjustments?: Array<{ description: string; amount: number }>;
  
  // Title Company
  titleCompanyName?: string;
  closingOfficerName?: string;
  acceptanceDate?: string;
  
  // Additional
  requestedBy?: string;
  additionalNotes?: string;
}

export interface CDACalculationResult {
  // Summary
  grossCommission: number;
  salePrice: number;
  commissionRate: number;
  
  // Selling Side
  sellingGrossCommission: number;
  sellingCommissionBeforeFees: number;
  sellingReferralFee: number;
  sellingOtherAdjustmentsTotal: number;
  sellingCommissionAfterFees: number;
  sellingAgent1Commission: number;
  sellingAgent2Commission: number;
  sellingBrokerageCommission: number;
  
  // Listing Side
  listingGrossCommission: number;
  listingCommissionBeforeFees: number;
  listingReferralFee: number;
  listingOtherAdjustmentsTotal: number;
  listingCommissionAfterFees: number;
  listingAgent1Commission: number;
  listingAgent2Commission: number;
  listingBrokerageCommission: number;
  
  // Validation
  isValid: boolean;
  validationErrors: string[];
  
  // Breakdown (for transparency)
  breakdown: {
    selling: {
      splitPercent: number;
      grossCommission: number;
      referralFee: number;
      otherAdjustments: Array<{ description: string; amount: number }>;
      commissionAfterFees: number;
      agent1: { name?: string; splitPercent: number; commission: number };
      agent2: { name?: string; splitPercent: number; commission: number };
      brokerage: { name?: string; splitPercent: number; commission: number };
    };
    listing: {
      splitPercent: number;
      grossCommission: number;
      referralFee: number;
      otherAdjustments: Array<{ description: string; amount: number }>;
      commissionAfterFees: number;
      agent1: { name?: string; splitPercent: number; commission: number };
      agent2: { name?: string; splitPercent: number; commission: number };
      brokerage: { name?: string; splitPercent: number; commission: number };
    };
  };
}

/**
 * Round to 2 decimal places to avoid floating-point errors
 */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate CDA commission breakdown with full validation
 */
export function calculateCDA(data: CDATransactionData): CDACalculationResult {
  const errors: string[] = [];
  
  // Step 1: Calculate Gross Commission
  const grossCommission = round(data.salePrice * (data.totalCommissionRate / 100));
  
  // Step 2: Split Between Selling and Listing Sides
  const sellingSplitPercent = data.sellingSplitPercent ?? 50;
  const listingSplitPercent = data.listingSplitPercent ?? 50;
  
  // Validate: Selling + Listing = 100%
  if (sellingSplitPercent + listingSplitPercent !== 100) {
    errors.push(`Selling split (${sellingSplitPercent}%) + Listing split (${listingSplitPercent}%) must equal 100%`);
  }
  
  const sellingGrossCommission = round(grossCommission * (sellingSplitPercent / 100));
  const listingGrossCommission = round(grossCommission * (listingSplitPercent / 100));
  
  // Step 3: Calculate Referral Fees
  let sellingReferralFee = 0;
  let listingReferralFee = 0;
  
  if (data.referralPercent && data.referralPercent > 0) {
    if (data.referralType === 'selling') {
      sellingReferralFee = round(sellingGrossCommission * (data.referralPercent / 100));
    } else if (data.referralType === 'listing') {
      listingReferralFee = round(listingGrossCommission * (data.referralPercent / 100));
    }
  }
  
  // Step 4: Calculate Other Adjustments
  const sellingOtherAdjustmentsTotal = round(
    (data.sellingOtherAdjustments || []).reduce((sum, adj) => sum + adj.amount, 0)
  );
  const listingOtherAdjustmentsTotal = round(
    (data.listingOtherAdjustments || []).reduce((sum, adj) => sum + adj.amount, 0)
  );
  
  // Step 5: Commission After Fees
  const sellingCommissionBeforeFees = sellingGrossCommission;
  const sellingCommissionAfterFees = round(
    sellingCommissionBeforeFees - sellingReferralFee + sellingOtherAdjustmentsTotal
  );
  
  const listingCommissionBeforeFees = listingGrossCommission;
  const listingCommissionAfterFees = round(
    listingCommissionBeforeFees - listingReferralFee + listingOtherAdjustmentsTotal
  );
  
  // Step 6: Calculate Agent Splits (Selling Side)
  const sellingAgent1SplitPercent = data.sellingAgent1SplitPercent ?? 0;
  const sellingAgent2SplitPercent = data.sellingAgent2SplitPercent ?? 0;
  const sellingBrokerSplitPercent = data.sellingBrokerSplitPercent ?? 100;
  
  // Validate: Agent1 + Agent2 + Broker = 100% (if agents exist)
  if (sellingAgent1SplitPercent > 0 || sellingAgent2SplitPercent > 0) {
    const totalSellingSplit = sellingAgent1SplitPercent + sellingAgent2SplitPercent + sellingBrokerSplitPercent;
    if (Math.abs(totalSellingSplit - 100) > 0.01) {
      errors.push(`Selling side: Agent 1 (${sellingAgent1SplitPercent}%) + Agent 2 (${sellingAgent2SplitPercent}%) + Broker (${sellingBrokerSplitPercent}%) must equal 100%`);
    }
  }
  
  const sellingAgent1Commission = round(sellingCommissionAfterFees * (sellingAgent1SplitPercent / 100));
  const sellingAgent2Commission = round(sellingCommissionAfterFees * (sellingAgent2SplitPercent / 100));
  const sellingBrokerageCommission = round(sellingCommissionAfterFees * (sellingBrokerSplitPercent / 100));
  
  // Step 7: Calculate Agent Splits (Listing Side)
  const listingAgent1SplitPercent = data.listingAgent1SplitPercent ?? 0;
  const listingAgent2SplitPercent = data.listingAgent2SplitPercent ?? 0;
  const listingBrokerSplitPercent = data.listingBrokerSplitPercent ?? 100;
  
  // Validate: Agent1 + Agent2 + Broker = 100% (if agents exist)
  if (listingAgent1SplitPercent > 0 || listingAgent2SplitPercent > 0) {
    const totalListingSplit = listingAgent1SplitPercent + listingAgent2SplitPercent + listingBrokerSplitPercent;
    if (Math.abs(totalListingSplit - 100) > 0.01) {
      errors.push(`Listing side: Agent 1 (${listingAgent1SplitPercent}%) + Agent 2 (${listingAgent2SplitPercent}%) + Broker (${listingBrokerSplitPercent}%) must equal 100%`);
    }
  }
  
  const listingAgent1Commission = round(listingCommissionAfterFees * (listingAgent1SplitPercent / 100));
  const listingAgent2Commission = round(listingCommissionAfterFees * (listingAgent2SplitPercent / 100));
  const listingBrokerageCommission = round(listingCommissionAfterFees * (listingBrokerSplitPercent / 100));
  
  // Step 8: Final Validation - Sum of all disbursements = Gross Commission
  const totalDisbursed = round(
    sellingAgent1Commission +
    sellingAgent2Commission +
    sellingBrokerageCommission +
    listingAgent1Commission +
    listingAgent2Commission +
    listingBrokerageCommission +
    sellingReferralFee +
    listingReferralFee
  );
  
  const expectedTotal = round(grossCommission + sellingOtherAdjustmentsTotal + listingOtherAdjustmentsTotal);
  
  // Allow 0.02 tolerance for rounding errors (multiple calculations compound)
  if (Math.abs(totalDisbursed - expectedTotal) > 0.02) {
    errors.push(`Total disbursed ($${totalDisbursed.toFixed(2)}) does not match expected total ($${expectedTotal.toFixed(2)})`);
  }
  
  return {
    // Summary
    grossCommission,
    salePrice: data.salePrice,
    commissionRate: data.totalCommissionRate,
    
    // Selling Side
    sellingGrossCommission,
    sellingCommissionBeforeFees,
    sellingReferralFee,
    sellingOtherAdjustmentsTotal,
    sellingCommissionAfterFees,
    sellingAgent1Commission,
    sellingAgent2Commission,
    sellingBrokerageCommission,
    
    // Listing Side
    listingGrossCommission,
    listingCommissionBeforeFees,
    listingReferralFee,
    listingOtherAdjustmentsTotal,
    listingCommissionAfterFees,
    listingAgent1Commission,
    listingAgent2Commission,
    listingBrokerageCommission,
    
    // Validation
    isValid: errors.length === 0,
    validationErrors: errors,
    
    // Breakdown
    breakdown: {
      selling: {
        splitPercent: sellingSplitPercent,
        grossCommission: sellingGrossCommission,
        referralFee: sellingReferralFee,
        otherAdjustments: data.sellingOtherAdjustments || [],
        commissionAfterFees: sellingCommissionAfterFees,
        agent1: {
          name: data.sellingAgent1Name,
          splitPercent: sellingAgent1SplitPercent,
          commission: sellingAgent1Commission,
        },
        agent2: {
          name: data.sellingAgent2Name,
          splitPercent: sellingAgent2SplitPercent,
          commission: sellingAgent2Commission,
        },
        brokerage: {
          name: data.sellingBrokerName,
          splitPercent: sellingBrokerSplitPercent,
          commission: sellingBrokerageCommission,
        },
      },
      listing: {
        splitPercent: listingSplitPercent,
        grossCommission: listingGrossCommission,
        referralFee: listingReferralFee,
        otherAdjustments: data.listingOtherAdjustments || [],
        commissionAfterFees: listingCommissionAfterFees,
        agent1: {
          name: data.listingAgent1Name,
          splitPercent: listingAgent1SplitPercent,
          commission: listingAgent1Commission,
        },
        agent2: {
          name: data.listingAgent2Name,
          splitPercent: listingAgent2SplitPercent,
          commission: listingAgent2Commission,
        },
        brokerage: {
          name: data.listingBrokerName,
          splitPercent: listingBrokerSplitPercent,
          commission: listingBrokerageCommission,
        },
      },
    },
  };
}

/**
 * Validate CDA calculation data before processing
 */
export function validateCDAData(data: CDATransactionData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.propertyAddress || data.propertyAddress.trim() === '') {
    errors.push('Property address is required');
  }
  
  if (!data.salePrice || data.salePrice <= 0) {
    errors.push('Sale price must be greater than 0');
  }
  
  if (!data.totalCommissionRate || data.totalCommissionRate <= 0) {
    errors.push('Commission rate must be greater than 0');
  }
  
  // Validate percentages
  if (data.sellingSplitPercent !== undefined && (data.sellingSplitPercent < 0 || data.sellingSplitPercent > 100)) {
    errors.push('Selling split percent must be between 0 and 100');
  }
  
  if (data.listingSplitPercent !== undefined && (data.listingSplitPercent < 0 || data.listingSplitPercent > 100)) {
    errors.push('Listing split percent must be between 0 and 100');
  }
  
  if (data.referralPercent !== undefined && (data.referralPercent < 0 || data.referralPercent > 100)) {
    errors.push('Referral percent must be between 0 and 100');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
