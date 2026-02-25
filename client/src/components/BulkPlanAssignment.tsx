/**
 * Bulk Plan Assignment Component
 * Allows selecting multiple agents and assigning them to a commission plan at once
 */

import React, { useState, useMemo } from 'react';
import { CommissionPlan, AgentPlanAssignment, getCommissionPlans, saveAgentAssignments, saveCommissionPlans, ASSIGNMENTS_KEY } from '@/lib/commission';
import { getTemplates, getTemplateCategories, createPlanFromTemplate, getTemplateById } from '@/lib/commissionTemplates';
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
      let planId = selectedPlanId;
      
      // If a template was selected, convert it to a plan
      if (selectedTemplateId) {
        const template = getTemplateById(selectedTemplateId);
        if (!template) {
          throw new Error(`Template not found: ${selectedTemplateId}`);
        }
        
        // Create a new plan from the template with a unique ID
        const newPlanId = `plan-${template.id}-${Date.now()}`;
        const newPlan = createPlanFromTemplate(template, template.name, newPlanId);
        
        // Save the new plan to localStorage
        const allPlans = getCommissionPlans();
        allPlans.push(newPlan);
        saveCommissionPlans(allPlans);
        
        console.log('[BulkPlanAssignment] Created plan from template:', {
          templateId: selectedTemplateId,
          newPlanId,
          planName: template.name,
        });
        
        planId = newPlanId;
      }
      
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
        className="gap-2"
        disabled={agents.length === 0}
      >
        <Users className="w-4 h-4" />
        Bulk Assign Plans ({selectedAgents.size} selected)
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Assign Commission Plans</DialogTitle>
            <DialogDescription>
              Select agents and assign them to a commission plan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Agent Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Select Agents</h3>
                <Badge variant="secondary">
                  {selectedAgents.size} / {displayAgents.length}
                </Badge>
              </div>

              <Card className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {/* Select All checkbox */}
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <Checkbox
                      checked={selectedAgents.size === displayAgents.length && displayAgents.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                    />
                    <span className="text-sm font-medium text-foreground">Select All Agents</span>
                  </div>

                  {/* Agent list */}
                  {displayAgents.map((agent) => {
                    const assignment = assignments.find(a => a.agentName === agent);
                    const currentPlan = assignment ? plans.find(p => p.id === assignment.planId) : null;
                    
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

            {/* Plan Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Select Plan</h3>
              
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'plans' | 'templates')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="templates" className="gap-2">
                    <Zap className="w-4 h-4" />
                    Templates
                  </TabsTrigger>
                  <TabsTrigger value="plans">Custom Plans</TabsTrigger>
                </TabsList>

                {/* Templates Tab */}
                <TabsContent value="templates" className="space-y-3">
                  {categories.map((category) => {
                    const categoryTemplates = templates.filter(t => t.category === category.id);
                    if (categoryTemplates.length === 0) return null;

                    return (
                      <div key={category.id} className="space-y-2">
                        <h4 className="text-sm font-medium text-foreground">{category.label}</h4>
                        <div className="grid gap-2">
                          {categoryTemplates.map((template) => (
                            <Card
                              key={template.id}
                              className={`p-3 cursor-pointer transition-colors ${
                                selectedTemplateId === template.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-accent/50'
                              }`}
                              onClick={() => {
                                setSelectedTemplateId(template.id);
                                setSelectedPlanId('');
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-foreground">{template.name}</p>
                                  <p className="text-xs text-foreground/70">{template.description}</p>
                                </div>
                                {selectedTemplateId === template.id && (
                                  <Badge className="bg-primary">Selected</Badge>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                {/* Custom Plans Tab */}
                <TabsContent value="plans" className="space-y-3">
                  {plans.length === 0 ? (
                    <p className="text-sm text-foreground/70">No custom plans yet. Create one from a template first.</p>
                  ) : (
                    <div className="grid gap-2">
                      {plans.map((plan) => (
                        <Card
                          key={plan.id}
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedPlanId === plan.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-accent/50'
                          }`}
                          onClick={() => {
                            setSelectedPlanId(plan.id);
                            setSelectedTemplateId('');
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-foreground">{plan.name}</p>
                              <p className="text-xs text-foreground/70">
                                {plan.splitPercentage}% split
                                {plan.capAmount > 0 && `, ${plan.capAmount.toLocaleString()} cap`}
                              </p>
                            </div>
                            {selectedPlanId === plan.id && (
                              <Badge className="bg-primary">Selected</Badge>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignPlan}
              disabled={isLoading || selectedAgents.size === 0 || (!selectedPlanId && !selectedTemplateId)}
            >
              {isLoading ? 'Assigning...' : `Assign to ${selectedAgents.size} Agent(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
