/**
 * Commission Plan Warning Component
 * Displays a friendly warning when an agent doesn't have a commission plan assigned
 * Includes a button to navigate to the Agent Assignments tab in Commission Management
 */

import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommissionPlanWarningProps {
  agentName: string;
  compact?: boolean;
  onNavigateToAssignments?: () => void;
  planName?: string; // Plan name when assigned
}

export default function CommissionPlanWarning({ agentName, compact = false, onNavigateToAssignments, planName }: CommissionPlanWarningProps) {
  const handleNavigateToAssignments = () => {
    if (onNavigateToAssignments) {
      onNavigateToAssignments();
    }
  };

  if (compact) {
    if (planName) {
      // Show assigned plan in green
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
          <span className="text-lg">✓</span>
          <span className="font-medium">{planName}</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>No plan assigned</span>
        <Button
          onClick={handleNavigateToAssignments}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
        >
          Assign Now
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            🤔 Commission plan not assigned
          </h3>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            {agentName} needs a commission plan assigned to show accurate numbers. Without a plan, commission calculations may not reflect your brokerage's actual structure.
          </p>
          <div className="mt-3">
            <Button
              onClick={handleNavigateToAssignments}
              variant="outline"
              size="sm"
              className="bg-white dark:bg-slate-900 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              Go to Agent Assignments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
