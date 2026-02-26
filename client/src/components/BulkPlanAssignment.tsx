/**
 * Bulk Plan Assignment Component
 * Allows selecting multiple agents and assigning them to a commission plan at once
 */

import React, { useState, useMemo } from 'react';
import { AgentPlanAssignment } from '@/lib/commission';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface BulkPlanAssignmentProps {
  agents: string[];
  assignments: AgentPlanAssignment[];
  onAssignmentComplete: (assignments: AgentPlanAssignment[]) => void;
}

export default function BulkPlanAssignment({
  agents,
  assignments,
  onAssignmentComplete,
}: BulkPlanAssignmentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch plans from database using tRPC
  const { data: plans = [] } = trpc.commission.getPlans.useQuery();
  
  // Fetch assignments from database
  const { data: dbAssignments = [] } = trpc.commission.getAssignments.useQuery();
  
  // Create mutation for saving assignments
  const saveAssignmentsMutation = trpc.commission.saveAssignments.useMutation();

  const handleSelectAgent = (agentName: string, checked: boolean) => {
    const newSelected = new Set(selectedAgents);
    if (checked) {
      newSelected.add(agentName);
    } else {
      newSelected.delete(agentName);
    }
    setSelectedAgents(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAgents(new Set(agents));
    } else {
      setSelectedAgents(new Set());
    }
  };

  const handleAssignPlan = async () => {
    if (selectedAgents.size === 0) {
      toast.error('Please select at least one agent');
      return;
    }

    if (!selectedPlanId) {
      toast.error('Please select a plan');
      return;
    }

    setIsLoading(true);

    try {
      // Create new assignments - remove old assignments for selected agents
      const newAssignments = dbAssignments.filter(
        a => !selectedAgents.has(a.agentName)
      );

      // Add new assignments for selected agents
      selectedAgents.forEach(agentName => {
        newAssignments.push({
          id: `${agentName}-${selectedPlanId}-${Date.now()}`,
          agentName,
          planId: selectedPlanId,
          startDate: new Date().toISOString().split('T')[0],
        });
      });

      // Save assignments to database using tRPC
      await saveAssignmentsMutation.mutateAsync(newAssignments);

      console.log('[BulkPlanAssignment] Assignments saved successfully');

      // Update parent component state
      onAssignmentComplete(newAssignments);

      toast.success(`Successfully assigned ${selectedAgents.size} agent(s) to plan`);
      
      // Reset modal state
      setIsOpen(false);
      setSelectedAgents(new Set());
      setSelectedPlanId('');
    } catch (error) {
      console.error('[BulkPlanAssignment] Error assigning plans:', error);
      toast.error('Failed to assign plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="gap-2"
        disabled={agents.length === 0}
      >
        <Users className="w-4 h-4" />
        Bulk Assign Plans ({selectedAgents.size} selected)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Assign Commission Plans</DialogTitle>
            <DialogDescription>
              Select agents and assign them to a commission plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Plan Selection - Show First */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Select Commission Plan</h3>
              
              {plans.length === 0 ? (
                <Card className="p-4 text-center text-foreground/70">
                  No commission plans available. Create a plan in the Plans tab first.
                </Card>
              ) : (
                <div className="grid gap-2">
                  {plans.map((plan) => (
                    <Card
                      key={plan.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedPlanId === plan.id.toString()
                          ? 'bg-primary/10 border-primary border-2'
                          : 'hover:bg-accent/50 border border-border'
                      }`}
                      onClick={() => setSelectedPlanId(plan.id.toString())}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{plan.name}</p>
                          <p className="text-sm text-foreground/70 mt-1">
                            {plan.splitPercentage}% / {100 - plan.splitPercentage}% 
                            {plan.capAmount ? ` • Cap: $${plan.capAmount.toLocaleString()}` : ' • No Cap'}
                          </p>
                        </div>
                        {selectedPlanId === plan.id.toString() && (
                          <Badge className="bg-primary">Selected</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Agent Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Select Agents</h3>
                <Badge variant="secondary">
                  {selectedAgents.size} / {agents.length}
                </Badge>
              </div>

              <Card className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {/* Select All checkbox */}
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Checkbox
                      checked={selectedAgents.size === agents.length && agents.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <span className="text-sm font-medium text-foreground">Select All Agents</span>
                  </div>

                  {/* Agent list */}
                  {agents.map((agent) => {
                    const assignment = dbAssignments.find(a => a.agentName === agent);
                    const currentPlan = assignment ? plans.find(p => p.id === parseInt(assignment.planId)) : null;
                    
                    return (
                      <div key={agent} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAgents.has(agent)}
                          onCheckedChange={(checked) => handleSelectAgent(agent, checked as boolean)}
                        />
                        <span className="text-sm text-foreground flex-1">{agent}</span>
                        {currentPlan && (
                          <Badge variant="outline" className="text-xs">
                            {currentPlan.name}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={isLoading || selectedAgents.size === 0 || !selectedPlanId}
            >
              {isLoading ? 'Assigning...' : `Assign to ${selectedAgents.size} Agent(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
