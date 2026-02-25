/**
 * Bulk Plan Assignment Component
 * Allows selecting multiple agents and assigning them to a commission plan at once
 */

import React, { useState, useMemo } from 'react';
import { CommissionPlan, AgentPlanAssignment, getCommissionPlans, saveAgentAssignments, ASSIGNMENTS_KEY } from '@/lib/commission';
import { getTemplates, getTemplateCategories, createPlanFromTemplate } from '@/lib/commissionTemplates';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Zap } from 'lucide-react';
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'plans' | 'templates'>('templates');
  const [isLoading, setIsLoading] = useState(false);

  const plans = useMemo(() => getCommissionPlans(), []);
  const templates = useMemo(() => getTemplates(), []);
  const categories = useMemo(() => getTemplateCategories(), []);

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

    if (!selectedPlanId && !selectedTemplateId) {
      toast.error('Please select a plan or template');
      return;
    }

    setIsLoading(true);

    try {
      const planId = selectedPlanId || selectedTemplateId;
      
      // Create new assignments array - remove old assignments for selected agents
      const newAssignments = assignments.filter(
        a => !selectedAgents.has(a.agentName)
      );

      // Add new assignments for selected agents
      selectedAgents.forEach(agentName => {
        newAssignments.push({
          id: `${agentName}-${planId}-${Date.now()}`,
          agentName,
          planId,
          startDate: new Date().toISOString().split('T')[0],
        });
      });

      console.log('[BulkPlanAssignment] Saving assignments:', {
        count: newAssignments.length,
        selectedCount: selectedAgents.size,
        planId,
      });

      // Save to localStorage
      saveAgentAssignments(newAssignments);

      // Verify save was successful using correct key
      const saved = localStorage.getItem(ASSIGNMENTS_KEY);
      if (!saved) {
        throw new Error('Failed to verify assignments were saved to localStorage');
      }
      
      // Double-check by parsing the saved data
      const savedAssignments = JSON.parse(saved);
      if (!Array.isArray(savedAssignments) || savedAssignments.length === 0) {
        throw new Error('Saved assignments data is invalid or empty');
      }

      console.log('[BulkPlanAssignment] Assignments saved successfully');

      // Update parent component state
      onAssignmentComplete(newAssignments);

      toast.success(`Successfully assigned ${selectedAgents.size} agent(s) to plan`);
      
      // Reset modal state
      setIsOpen(false);
      setSelectedAgents(new Set());
      setSelectedPlanId('');
      setSelectedTemplateId('');
    } catch (error) {
      console.error('[BulkPlanAssignment] Error assigning plans:', error);
      toast.error('Failed to assign plans. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show all agents - allow editing/reassigning plans to any agent
  const displayAgents = agents;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="gap-2"
      >
        <Users className="w-4 h-4" />
        Bulk Assign Plans
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Assign Commission Plans</DialogTitle>
            <DialogDescription>
              Select multiple agents and assign them to a plan or template at once
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'plans' | 'templates')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="templates" className="gap-2">
                <Zap className="w-4 h-4" />
                Templates
              </TabsTrigger>
              <TabsTrigger value="plans">Existing Plans</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {categories.map(category => {
                  const categoryTemplates = templates.filter(t => t.category === category.id);
                  if (categoryTemplates.length === 0) return null;

                  return (
                    <div key={category.id} className="space-y-2">
                      <h4 className="font-semibold text-sm text-muted-foreground">{category.label}</h4>
                      <div className="space-y-2 pl-2">
                        {categoryTemplates.map(template => (
                          <label
                            key={template.id}
                            className="flex items-start gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                          >
                            <input
                              type="radio"
                              name="template"
                              value={template.id}
                              checked={selectedTemplateId === template.id}
                              onChange={(e) => {
                                setSelectedTemplateId(e.target.value);
                                setSelectedPlanId('');
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{template.name}</p>
                              <p className="text-xs text-muted-foreground">{template.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="plans" className="space-y-4">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {plans.map(plan => (
                  <label
                    key={plan.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="plan"
                      value={plan.id}
                      checked={selectedPlanId === plan.id}
                      onChange={(e) => {
                        setSelectedPlanId(e.target.value);
                        setSelectedTemplateId('');
                      }}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{plan.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {plan.splitPercentage}% split
                        {plan.capAmount > 0 && ` • $${plan.capAmount.toLocaleString()} cap`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Select Agents</h4>
              <Badge variant="outline">{selectedAgents.size} selected</Badge>
            </div>

            <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
              <Checkbox
                checked={selectedAgents.size === displayAgents.length && displayAgents.length > 0}
                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
              />
              <span className="text-sm font-medium">Select All Agents</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {displayAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No agents available
                </p>
              ) : (
                displayAgents.map(agent => {
                  const currentAssignment = assignments.find(a => a.agentName === agent);
                  return (
                    <label key={agent} className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <Checkbox
                        checked={selectedAgents.has(agent)}
                        onCheckedChange={(checked) => handleSelectAgent(agent, checked as boolean)}
                      />
                      <div className="flex-1">
                        <span className="text-sm">{agent}</span>
                        {currentAssignment && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Current: {currentAssignment.planId})
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={selectedAgents.size === 0 || (!selectedPlanId && !selectedTemplateId) || isLoading}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Assigning...
                </>
              ) : selectedAgents.size > 0 ? (
                `Assign to ${selectedAgents.size} Agent${selectedAgents.size !== 1 ? 's' : ''}`
              ) : (
                'Select agents to assign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
