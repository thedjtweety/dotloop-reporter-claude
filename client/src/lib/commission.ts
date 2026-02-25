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

// ============================================================================
// STORAGE KEYS - EXPORTED for use across all components
// CRITICAL: All components must use these exact keys for localStorage access
// ============================================================================
export const PLANS_KEY = 'dotloop_commission_plans';
export const ASSIGNMENTS_KEY = 'dotloop_agent_assignments';
export const TEAMS_KEY = 'dotloop_teams';
export const ADJUSTMENTS_KEY = 'dotloop_transaction_adjustments';

// ============================================================================
// STORAGE FUNCTIONS - Commission Plans
// ============================================================================
export function getCommissionPlans(): CommissionPlan[] {
  try {
    const stored = localStorage.getItem(PLANS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PLANS;
  } catch (error) {
    console.error('[Commission Storage] Error loading plans:', error);
    return DEFAULT_PLANS;
  }
}

export function saveCommissionPlans(plans: CommissionPlan[]): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    console.log('[Commission Storage] Plans saved successfully:', plans.length);
  } catch (error) {
    console.error('[Commission Storage] Error saving plans:', error);
    throw new Error('Failed to save commission plans');
  }
}

// ============================================================================
// STORAGE FUNCTIONS - Agent Assignments
// CRITICAL: This is the most important function - used by bulk assign and calculations
// ============================================================================
export function getAgentAssignments(): AgentPlanAssignment[] {
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_KEY);
    const assignments = stored ? JSON.parse(stored) : [];
    console.log('[Commission Storage] Loaded assignments:', assignments.length);
    return assignments;
  } catch (error) {
    console.error('[Commission Storage] Error loading assignments:', error);
    return [];
  }
}

export function saveAgentAssignments(assignments: AgentPlanAssignment[]): void {
  try {
    console.log('[Commission Storage] Saving assignments:', assignments.length);
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
    
    // CRITICAL: Verify save was successful by reading back
    const verified = localStorage.getItem(ASSIGNMENTS_KEY);
    if (!verified) {
      throw new Error('Verification failed: assignments not found after save');
    }
    
    console.log('[Commission Storage] Assignments saved and verified successfully');
  } catch (error) {
    // Handle QuotaExceededError by clearing old data and retrying
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('[Commission Storage] localStorage quota exceeded, clearing old data...');
      try {
        localStorage.removeItem('dotloop_demo_data');
        localStorage.removeItem('dotloop_recent_files');
        localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
        
        // Verify after cleanup
        const verified = localStorage.getItem(ASSIGNMENTS_KEY);
        if (!verified) {
          throw new Error('Verification failed after cleanup');
        }
        
        console.log('[Commission Storage] Successfully saved assignments after cleanup');
      } catch (retryError) {
        console.error('[Commission Storage] Failed to save assignments even after cleanup:', retryError);
        throw new Error('Failed to save assignments to localStorage (quota exceeded)');
      }
    } else {
      console.error('[Commission Storage] Error saving assignments:', error);
      throw new Error('Failed to save assignments to localStorage');
    }
  }
}

// ============================================================================
// STORAGE FUNCTIONS - Teams
// ============================================================================
export function getTeams(): Team[] {
  try {
    const stored = localStorage.getItem(TEAMS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Commission Storage] Error loading teams:', error);
    return [];
  }
}

export function saveTeams(teams: Team[]): void {
  try {
    localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  } catch (error) {
    console.error('[Commission Storage] Error saving teams:', error);
    throw new Error('Failed to save teams');
  }
}

// ============================================================================
// STORAGE FUNCTIONS - Transaction Adjustments
// ============================================================================
export function getTransactionAdjustments(): TransactionAdjustment[] {
  try {
    const stored = localStorage.getItem(ADJUSTMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Commission Storage] Error loading adjustments:', error);
    return [];
  }
}

export function saveTransactionAdjustments(adjustments: TransactionAdjustment[]): void {
  try {
    localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments));
  } catch (error) {
    console.error('[Commission Storage] Error saving adjustments:', error);
    throw new Error('Failed to save adjustments');
  }
}

// ============================================================================
// HELPER FUNCTIONS - Query and Lookup
// ============================================================================

/**
 * Get the commission plan for a specific agent
 * CRITICAL: Used by commission calculator and CDA generator
 */
export function getPlanForAgent(agentName: string): CommissionPlan | undefined {
  const assignments = getAgentAssignments();
  const plans = getCommissionPlans();
  
  const assignment = assignments.find(a => a.agentName === agentName);
  if (!assignment) {
    console.warn(`[Commission Storage] No assignment found for agent: ${agentName}`);
    return undefined;
  }
  
  const plan = plans.find(p => p.id === assignment.planId);
  if (!plan) {
    console.warn(`[Commission Storage] No plan found for planId: ${assignment.planId}`);
    return undefined;
  }
  
  return plan;
}

/**
 * Get all assignments with their plan details
 * CRITICAL: Used by bulk assign modal and agent leaderboard
 */
export function getAssignmentsWithPlans(): (AgentPlanAssignment & { planName: string; planDetails: CommissionPlan | undefined })[] {
  const assignments = getAgentAssignments();
  const plans = getCommissionPlans();
  
  return assignments.map(assignment => {
    const plan = plans.find(p => p.id === assignment.planId);
    return {
      ...assignment,
      planName: plan?.name || 'Unknown Plan',
      planDetails: plan,
    };
  });
}

/**
 * Check if an agent has an assignment
 */
export function hasAssignment(agentName: string): boolean {
  const assignments = getAgentAssignments();
  return assignments.some(a => a.agentName === agentName);
}

/**
 * Get assignment for a specific agent
 */
export function getAssignmentForAgent(agentName: string): AgentPlanAssignment | undefined {
  const assignments = getAgentAssignments();
  return assignments.find(a => a.agentName === agentName);
}

/**
 * Get all agents that have assignments
 */
export function getAssignedAgents(): string[] {
  const assignments = getAgentAssignments();
  return assignments.map(a => a.agentName);
}

/**
 * Verify commission storage is working correctly
 * CRITICAL: Run this before generating reports or CDA
 */
export function verifyCommissionStorage(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    // Check plans
    const plans = getCommissionPlans();
    if (!plans || plans.length === 0) {
      errors.push('No commission plans found');
    }
    
    // Check assignments
    const assignments = getAgentAssignments();
    if (!assignments || !Array.isArray(assignments)) {
      errors.push('Assignments data is invalid');
    }
    
    // Verify all assignments reference valid plans
    assignments.forEach(assignment => {
      const plan = plans.find(p => p.id === assignment.planId);
      if (!plan) {
        errors.push(`Assignment for ${assignment.agentName} references invalid plan: ${assignment.planId}`);
      }
    });
    
    // Verify localStorage keys exist
    const plansStored = localStorage.getItem(PLANS_KEY);
    const assignmentsStored = localStorage.getItem(ASSIGNMENTS_KEY);
    
    if (!plansStored) {
      errors.push('Plans not found in localStorage');
    }
    if (!assignmentsStored) {
      errors.push('Assignments not found in localStorage');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Storage verification failed: ${error}`],
    };
  }
}
