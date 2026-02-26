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

// Default Plans - DEPRECATED: Use database plans instead
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

// ============================================================================
// STORAGE KEYS - DEPRECATED: No longer used, kept for backwards compatibility
// ============================================================================
export const PLANS_KEY = 'dotloop_commission_plans';
export const ASSIGNMENTS_KEY = 'dotloop_agent_assignments';
export const TEAMS_KEY = 'dotloop_teams';
export const ADJUSTMENTS_KEY = 'dotloop_transaction_adjustments';

// ============================================================================
// STORAGE FUNCTIONS - NOW DATABASE-ONLY (localStorage removed)
// ============================================================================

/**
 * Get commission plans - DEPRECATED
 * Components should use tRPC: trpc.commission.getPlans.useQuery()
 */
export function getCommissionPlans(): CommissionPlan[] {
  console.warn('[Commission Storage] getCommissionPlans() is deprecated. Use tRPC instead.');
  return [];
}

/**
 * Save commission plans - DEPRECATED
 * Components should use tRPC: trpc.commission.savePlan.useMutation()
 */
export function saveCommissionPlans(plans: CommissionPlan[]): void {
  console.warn('[Commission Storage] saveCommissionPlans() is deprecated. Use tRPC instead.');
}

// ============================================================================
// STORAGE FUNCTIONS - Agent Assignments - DATABASE ONLY
// ============================================================================

/**
 * Get agent assignments - DEPRECATED
 * Components should use tRPC: trpc.commission.getAssignments.useQuery()
 */
export function getAgentAssignments(): AgentPlanAssignment[] {
  console.warn('[Commission Storage] getAgentAssignments() is deprecated. Use tRPC instead.');
  return [];
}

/**
 * Save agent assignments - DEPRECATED
 * Components should use tRPC: trpc.commission.saveAssignments.useMutation()
 */
export function saveAgentAssignments(assignments: AgentPlanAssignment[]): void {
  console.warn('[Commission Storage] saveAgentAssignments() is deprecated. Use tRPC instead.');
}

// ============================================================================
// STORAGE FUNCTIONS - Teams - DATABASE ONLY
// ============================================================================

/**
 * Get teams - DEPRECATED
 * Components should use tRPC: trpc.commission.getTeams.useQuery()
 */
export function getTeams(): Team[] {
  console.warn('[Commission Storage] getTeams() is deprecated. Use tRPC instead.');
  return [];
}

/**
 * Save teams - DEPRECATED
 * Components should use tRPC: trpc.commission.saveTeam.useMutation()
 */
export function saveTeams(teams: Team[]): void {
  console.warn('[Commission Storage] saveTeams() is deprecated. Use tRPC instead.');
}

// ============================================================================
// STORAGE FUNCTIONS - Transaction Adjustments - DATABASE ONLY
// ============================================================================

/**
 * Get transaction adjustments - DEPRECATED
 * Components should use tRPC: trpc.commission.getAdjustments.useQuery()
 */
export function getTransactionAdjustments(): TransactionAdjustment[] {
  console.warn('[Commission Storage] getTransactionAdjustments() is deprecated. Use tRPC instead.');
  return [];
}

/**
 * Save transaction adjustments - DEPRECATED
 * Components should use tRPC: trpc.commission.saveAdjustment.useMutation()
 */
export function saveTransactionAdjustments(adjustments: TransactionAdjustment[]): void {
  console.warn('[Commission Storage] saveTransactionAdjustments() is deprecated. Use tRPC instead.');
}

// ============================================================================
// HELPER FUNCTIONS - Query and Lookup (for backwards compatibility)
// ============================================================================

/**
 * Get the commission plan for a specific agent
 * DEPRECATED: Use tRPC queries instead
 */
export function getPlanForAgent(agentName: string): CommissionPlan | undefined {
  console.warn('[Commission Storage] getPlanForAgent() is deprecated. Use tRPC instead.');
  return undefined;
}

/**
 * Get all assignments with their plan details
 * DEPRECATED: Use tRPC queries instead
 */
export function getAssignmentsWithPlans(): (AgentPlanAssignment & { planName: string; planDetails: CommissionPlan | undefined })[] {
  console.warn('[Commission Storage] getAssignmentsWithPlans() is deprecated. Use tRPC instead.');
  return [];
}

/**
 * Check if an agent has an assignment
 * DEPRECATED: Use tRPC queries instead
 */
export function hasAssignment(agentName: string): boolean {
  console.warn('[Commission Storage] hasAssignment() is deprecated. Use tRPC instead.');
  return false;
}

/**
 * Get assignment for a specific agent
 * DEPRECATED: Use tRPC queries instead
 */
export function getAssignmentForAgent(agentName: string): AgentPlanAssignment | undefined {
  console.warn('[Commission Storage] getAssignmentForAgent() is deprecated. Use tRPC instead.');
  return undefined;
}

/**
 * Get all agents that have assignments
 * DEPRECATED: Use tRPC queries instead
 */
export function getAssignedAgents(): string[] {
  console.warn('[Commission Storage] getAssignedAgents() is deprecated. Use tRPC instead.');
  return [];
}

/**
 * Verify commission storage is working correctly
 * DEPRECATED: Use tRPC health checks instead
 */
export function verifyCommissionStorage(): { valid: boolean; errors: string[] } {
  return {
    valid: true,
    errors: [],
  };
}
