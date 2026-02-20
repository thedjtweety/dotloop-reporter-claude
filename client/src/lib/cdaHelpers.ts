/**
 * CDA Generation Helpers
 * 
 * Functions to map transaction data from the dashboard to CDA form structure
 */

import { DotloopRecord } from './csvParser';

export interface CDAFormData {
  // Transaction Details
  propertyAddress: string;
  salePrice: number;
  totalCommissionRate: number;
  sellingSplitPercent: number;
  listingSplitPercent: number;
  
  // Selling Side
  sellingAgent1Name: string;
  sellingAgent1SplitPercent: number;
  sellingAgent2Name?: string;
  sellingAgent2SplitPercent?: number;
  sellingBrokerSplitPercent: number;
  sellingOtherAdjustments: Array<{ description: string; amount: number }>;
  
  // Listing Side
  listingAgent1Name: string;
  listingAgent1SplitPercent: number;
  listingAgent2Name?: string;
  listingAgent2SplitPercent?: number;
  listingBrokerSplitPercent: number;
  listingOtherAdjustments: Array<{ description: string; amount: number }>;
  
  // Referral
  referralPercent?: number;
  referralType?: 'selling' | 'listing';
  referralCompanyName?: string;
}

export interface CommissionPlan {
  id: string;
  name: string;
  agentSplitPercent: number;
  brokerSplitPercent: number;
  capAmount?: number;
  transactionFee?: number;
}

/**
 * Map a transaction record to CDA form data
 * 
 * @param transaction - The transaction record from the dashboard
 * @param commissionPlan - Optional commission plan to apply
 * @returns CDA form data ready for the CDA Builder
 */
export function mapTransactionToCDA(
  transaction: DotloopRecord,
  commissionPlan?: CommissionPlan
): CDAFormData {
  // Extract property address
  const propertyAddress = [
    transaction.address || transaction.streetAddress,
    transaction.city,
    transaction.state
  ].filter(Boolean).join(', ') || transaction.loopName || 'Unknown Address';
  
  // Get sale price (use salePrice or price)
  const salePrice = transaction.salePrice || transaction.price || 0;
  
  // Calculate commission rate from transaction data
  let totalCommissionRate = 6.0; // Default
  if (transaction.commissionRate && transaction.commissionRate > 0) {
    totalCommissionRate = transaction.commissionRate;
  } else if (transaction.commissionTotal && salePrice > 0) {
    totalCommissionRate = (transaction.commissionTotal / salePrice) * 100;
  }
  
  // Determine agent split percentages from commission plan or defaults
  const agentSplitPercent = commissionPlan?.agentSplitPercent || 80;
  const brokerSplitPercent = commissionPlan?.brokerSplitPercent || 20;
  
  // Get agent name (handle comma-separated multiple agents)
  let agentName = 'Agent Name';
  if (transaction.agents) {
    // If multiple agents, take the first one
    agentName = transaction.agents.split(',')[0].trim();
  } else if (transaction.createdBy) {
    agentName = transaction.createdBy;
  }
  
  // Determine if this is a selling or listing transaction
  const isSelling = transaction.transactionType?.toLowerCase().includes('sell') ||
                    transaction.transactionType?.toLowerCase().includes('buy');
  
  // Build CDA form data
  const cdaData: CDAFormData = {
    propertyAddress,
    salePrice,
    totalCommissionRate,
    sellingSplitPercent: 50,
    listingSplitPercent: 50,
    
    // Selling Side - populate if it's a selling transaction
    sellingAgent1Name: isSelling ? agentName : 'Selling Agent',
    sellingAgent1SplitPercent: agentSplitPercent,
    sellingBrokerSplitPercent: brokerSplitPercent,
    sellingOtherAdjustments: [],
    
    // Listing Side - populate if it's a listing transaction
    listingAgent1Name: !isSelling ? agentName : 'Listing Agent',
    listingAgent1SplitPercent: agentSplitPercent,
    listingBrokerSplitPercent: brokerSplitPercent,
    listingOtherAdjustments: [],
  };
  
  // Add transaction fee if present in commission plan
  if (commissionPlan?.transactionFee) {
    if (isSelling) {
      cdaData.sellingOtherAdjustments.push({
        description: 'Transaction Fee',
        amount: -commissionPlan.transactionFee
      });
    } else {
      cdaData.listingOtherAdjustments.push({
        description: 'Transaction Fee',
        amount: -commissionPlan.transactionFee
      });
    }
  }
  
  return cdaData;
}

/**
 * Encode CDA form data as URL parameters for navigation
 * 
 * @param cdaData - The CDA form data to encode
 * @returns URL-encoded query string
 */
export function encodeCDAData(cdaData: CDAFormData): string {
  return encodeURIComponent(JSON.stringify(cdaData));
}

/**
 * Decode CDA form data from URL parameters
 * 
 * @param encoded - The URL-encoded CDA data
 * @returns Decoded CDA form data
 */
export function decodeCDAData(encoded: string): CDAFormData | null {
  try {
    return JSON.parse(decodeURIComponent(encoded));
  } catch (error) {
    console.error('Failed to decode CDA data:', error);
    return null;
  }
}

/**
 * Get commission plan for an agent from localStorage
 * 
 * @param agentName - The agent's name
 * @returns Commission plan or undefined
 */
export function getCommissionPlanForAgent(agentName: string): CommissionPlan | undefined {
  try {
    // Get agent assignments from localStorage
    const assignmentsStr = localStorage.getItem('dotloop_agent_assignments');
    if (!assignmentsStr) return undefined;
    
    const assignments = JSON.parse(assignmentsStr);
    const agentAssignment = assignments.find((a: any) => a.agentName === agentName);
    
    if (!agentAssignment) return undefined;
    
    // Get commission plans from localStorage
    const plansStr = localStorage.getItem('dotloop_commission_plans');
    if (!plansStr) return undefined;
    
    const plans = JSON.parse(plansStr);
    const plan = plans.find((p: any) => p.id === agentAssignment.planId);
    
    if (!plan) return undefined;
    
    // Map commission plan to CDA format
    return {
      id: plan.id,
      name: plan.name,
      agentSplitPercent: plan.splitPercentage || 80,
      brokerSplitPercent: 100 - (plan.splitPercentage || 80),
      // Extract transaction fee from deductions if present
      transactionFee: plan.deductions?.find((d: any) => d.type === 'fixed')?.amount || 0,
    };
  } catch (error) {
    console.error('Error fetching commission plan:', error);
    return undefined;
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
