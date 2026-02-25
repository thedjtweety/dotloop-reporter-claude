export interface Deduction {
  id: string;
  name: string; // e.g., "Tech Fee", "E&O Insurance"
  amount: number; // Fixed amount (e.g., 50)
  type: 'fixed' | 'percentage'; // Percentage of GCI or Fixed $
  frequency: 'per_transaction'; // For now, just per transaction
}

export interface CommissionTier {
  id: string;
  threshold: number; // YTD amount at which this tier starts (e.g., 0, 50000, 100000)
  splitPercentage: number; // Agent's share at this tier (e.g., 60 for 60/40)
  description: string; // e.g., "$0-$50K: 60/40"
}

export interface CommissionPlan {
  id: string;
  name: string;
  splitPercentage: number; // Agent's share (e.g., 80 for 80/20)
  capAmount: number; // Annual cap on Company Dollar (e.g., 20000)
  postCapSplit: number; // Agent's share after cap (usually 100)
  royaltyPercentage?: number; // Optional franchise fee (e.g., 6%)
  royaltyCap?: number; // Optional cap on royalty (e.g., 3000)
  deductions?: Deduction[]; // List of standard deductions
  tiers?: CommissionTier[]; // Sliding scale tiers (optional)
  useSliding?: boolean; // Whether to use tiered splits or flat split
}

export interface Team {
  id: string;
  name: string;
  leadAgent: string;
  teamSplitPercentage: number; // Percentage taken by team (e.g., 50%)
}

export interface AgentPlanAssignment {
  id: string;
  agentName: string;
  planId: string;
  teamId?: string; // Optional: link to a team
  startDate?: string; // Optional: when did they start this plan?
  anniversaryDate?: string; // "MM-DD" format (e.g., "03-15") for cap reset
}

export interface TransactionAdjustment {
  recordId: string; // Links to loopId
  agentName: string;
  description: string; // e.g., "Staging Fee"
  amount: number; // Positive = Deduction, Negative = Credit (or just assume deduction?)
  // Let's assume positive is a deduction from agent (cost), negative is a credit to agent.
  // Actually, let's keep it simple: "Expense" implies deduction.
}

// Default Plans
export const DEFAULT_PLANS: CommissionPlan[] = [
  {
    id: 'standard-80-20',
    name: 'Standard Capped (80/20)',
    splitPercentage: 80,
    capAmount: 18000,
    postCapSplit: 100,
  },
  {
    id: 'team-50-50',
    name: 'Team Member (50/50)',
    splitPercentage: 50,
    capAmount: 0, // No cap
    postCapSplit: 50,
  },
  {
    id: 'referral-only',
    name: 'Referral Only (90/10)',
    splitPercentage: 90,
    capAmount: 500,
    postCapSplit: 100,
  }
];

// Storage Keys
const PLANS_KEY = 'dotloop_commission_plans';
const ASSIGNMENTS_KEY = 'dotloop_agent_assignments';
const TEAMS_KEY = 'dotloop_teams';
const ADJUSTMENTS_KEY = 'dotloop_transaction_adjustments';

// Helpers
export function getCommissionPlans(): CommissionPlan[] {
  const stored = localStorage.getItem(PLANS_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_PLANS;
}

export function saveCommissionPlans(plans: CommissionPlan[]) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function getAgentAssignments(): AgentPlanAssignment[] {
  const stored = localStorage.getItem(ASSIGNMENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveAgentAssignments(assignments: AgentPlanAssignment[]) {
  try {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  } catch (error) {
    // Handle QuotaExceededError by clearing old data and retrying
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('[Commission Storage] localStorage quota exceeded, clearing old data...');
      // Clear demo data if it exists (largest data set)
      try {
        localStorage.removeItem('dotloop_demo_data');
        localStorage.removeItem('dotloop_recent_files');
        // Retry the save
        localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
        console.log('[Commission Storage] Successfully saved assignments after cleanup');
      } catch (retryError) {
        console.error('[Commission Storage] Failed to save assignments even after cleanup:', retryError);
        throw new Error('Failed to save assignments to localStorage');
      }
    } else {
      console.error('[Commission Storage] Error saving assignments:', error);
      throw new Error('Failed to save assignments to localStorage');
    }
  }
}

export function getTeams(): Team[] {
  const stored = localStorage.getItem(TEAMS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveTeams(teams: Team[]) {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
}

export function getTransactionAdjustments(): TransactionAdjustment[] {
  const stored = localStorage.getItem(ADJUSTMENTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveTransactionAdjustments(adjustments: TransactionAdjustment[]) {
  localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments));
}

export function getPlanForAgent(agentName: string): CommissionPlan | undefined {
  const assignments = getAgentAssignments();
  const plans = getCommissionPlans();
  
  const assignment = assignments.find(a => a.agentName === agentName);
  if (!assignment) return undefined;
  
  return plans.find(p => p.id === assignment.planId);
}
