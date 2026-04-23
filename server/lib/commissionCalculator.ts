import { transactions, commissionPlans, agentAssignments } from "../../drizzle/schema";

export interface CommissionTier {
  minVolume: number;
  maxVolume?: number;
  splitPercentage: number;
}

export interface CommissionDeduction {
  name: string;
  type: "fixed" | "percentage";
  amount: number;
}

export interface CommissionResult {
  agentName: string;
  totalVolume: number;
  transactionCount: number;
  grossCommission: number;
  appliedTier?: CommissionTier;
  capApplied: boolean;
  postCapAmount: number;
  deductions: CommissionDeduction[];
  totalDeductions: number;
  netCommission: number;
}

/**
 * Parse commission plan tiers from JSON
 */
export function parseTiers(tiersJson: string | null): CommissionTier[] {
  if (!tiersJson) return [];
  try {
    return JSON.parse(tiersJson);
  } catch {
    return [];
  }
}

/**
 * Parse deductions from JSON
 */
export function parseDeductions(deductionsJson: string | null): CommissionDeduction[] {
  if (!deductionsJson) return [];
  try {
    return JSON.parse(deductionsJson);
  } catch {
    return [];
  }
}

/**
 * Find applicable tier based on volume
 */
export function findApplicableTier(volume: number, tiers: CommissionTier[]): CommissionTier | null {
  if (tiers.length === 0) return null;

  // Sort tiers by minVolume descending
  const sortedTiers = [...tiers].sort((a, b) => b.minVolume - a.minVolume);

  for (const tier of sortedTiers) {
    if (volume >= tier.minVolume) {
      if (!tier.maxVolume || volume <= tier.maxVolume) {
        return tier;
      }
    }
  }

  return null;
}

/**
 * Calculate commission for a single transaction
 */
export function calculateTransactionCommission(
  transactionAmount: number,
  splitPercentage: number
): number {
  return Math.round((transactionAmount * splitPercentage) / 100);
}

/**
 * Calculate total deductions
 */
export function calculateDeductions(
  grossCommission: number,
  deductions: CommissionDeduction[]
): { deductions: CommissionDeduction[]; total: number } {
  const appliedDeductions: CommissionDeduction[] = [];
  let totalDeductions = 0;

  for (const deduction of deductions) {
    let amount = deduction.amount;

    if (deduction.type === "percentage") {
      amount = Math.round((grossCommission * deduction.amount) / 100);
    }

    appliedDeductions.push({
      ...deduction,
      amount,
    });

    totalDeductions += amount;
  }

  return {
    deductions: appliedDeductions,
    total: Math.min(totalDeductions, grossCommission), // Can't deduct more than gross
  };
}

/**
 * Calculate commission with all rules applied
 */
export function calculateAgentCommission(
  agentTransactions: Array<{ price: number; salePrice: number }>,
  plan: {
    splitPercentage: number;
    capAmount: number;
    postCapSplit: number;
    tiers: string | null;
    deductions: string | null;
  }
): CommissionResult {
  const tiers = parseTiers(plan.tiers);
  const deductionsConfig = parseDeductions(plan.deductions);

  // Calculate total volume
  const totalVolume = agentTransactions.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0);

  // Find applicable tier
  const applicableTier = findApplicableTier(totalVolume, tiers);
  const splitPercentage = applicableTier?.splitPercentage || plan.splitPercentage;

  // Calculate gross commission
  const grossCommission = agentTransactions.reduce((sum, t) => {
    return sum + calculateTransactionCommission(t.salePrice || t.price || 0, splitPercentage);
  }, 0);

  // Apply cap
  let postCapAmount = grossCommission;
  let capApplied = false;

  if (plan.capAmount > 0 && grossCommission > plan.capAmount) {
    capApplied = true;
    const amountOverCap = grossCommission - plan.capAmount;
    const postCapCommission = Math.round((amountOverCap * plan.postCapSplit) / 100);
    postCapAmount = plan.capAmount + postCapCommission;
  }

  // Calculate deductions
  const { deductions: appliedDeductions, total: totalDeductions } = calculateDeductions(
    postCapAmount,
    deductionsConfig
  );

  // Calculate net commission
  const netCommission = Math.max(0, postCapAmount - totalDeductions);

  return {
    agentName: "",
    totalVolume,
    transactionCount: agentTransactions.length,
    grossCommission,
    ...(applicableTier && { appliedTier: applicableTier }),
    capApplied,
    postCapAmount,
    deductions: appliedDeductions,
    totalDeductions,
    netCommission,
  };
}

/**
 * Pre-built commission plan templates
 */
export const COMMISSION_TEMPLATES = {
  standard_50_50: {
    name: "Standard 50/50",
    description: "Equal split between broker and agent",
    splitPercentage: 50,
    capAmount: 0,
    postCapSplit: 50,
    deductions: null,
    tiers: null,
  },
  high_volume_60_40: {
    name: "High Volume 60/40",
    description: "60% to agent for high volume producers",
    splitPercentage: 60,
    capAmount: 0,
    postCapSplit: 60,
    deductions: null,
    tiers: null,
  },
  new_agent_70_30: {
    name: "New Agent 70/30",
    description: "70% to agent to attract new talent",
    splitPercentage: 70,
    capAmount: 0,
    postCapSplit: 70,
    deductions: null,
    tiers: null,
  },
  tiered_performance: {
    name: "Tiered Performance",
    description: "Split increases with volume",
    splitPercentage: 50,
    capAmount: 0,
    postCapSplit: 50,
    deductions: null,
    tiers: JSON.stringify([
      { minVolume: 0, maxVolume: 500000, splitPercentage: 50 },
      { minVolume: 500000, maxVolume: 1000000, splitPercentage: 55 },
      { minVolume: 1000000, splitPercentage: 60 },
    ]),
  },
  capped_with_royalty: {
    name: "Capped with Royalty",
    description: "Commission capped at $5000 with 5% royalty on overages",
    splitPercentage: 50,
    capAmount: 500000, // $5000 in cents
    postCapSplit: 5,
    deductions: JSON.stringify([
      { name: "Royalty Fee", type: "percentage", amount: 5 },
    ]),
    tiers: null,
  },
};
