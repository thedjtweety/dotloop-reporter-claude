import { useState, useEffect } from 'react';
import { 
  CommissionPlan, 
  Team,
  AgentPlanAssignment, 
  getCommissionPlans, 
  getTeams,
  getAgentAssignments, 
  saveAgentAssignments 
} from '@/lib/commission';
import { DotloopRecord } from '@/lib/csvParser';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import BulkPlanAssignment from './BulkPlanAssignment';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AgentAssignmentProps {
  records: DotloopRecord[]; // Used to extract unique agent names
  highlightAgent?: string; // Agent name to highlight/scroll to
  onAssignmentChange?: () => void; // Callback when assignment changes
}

export default function AgentAssignment({ records, highlightAgent, onAssignmentChange }: AgentAssignmentProps) {
  const [plans, setPlans] = useState<CommissionPlan[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<AgentPlanAssignment[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [recalculatingAgent, setRecalculatingAgent] = useState<string | null>(null);
  
  // Get the recalculation mutation
  const recalculateMutation = trpc.commissionRecalculation.recalculateForAgent.useMutation();
  
  // Fetch plans and teams from database
  const { data: dbPlans, isLoading: plansLoading, error: plansError } = trpc.commission.getPlans.useQuery(undefined, {
    retry: 1,
  });
  const { data: dbTeams, isLoading: teamsLoading, error: teamsError } = trpc.commission.getTeams.useQuery(undefined, {
    retry: 1,
  });
  
  // Log errors for debugging
  useEffect(() => {
    if (plansError) {
      console.error('[AgentAssignment] Error fetching plans:', plansError);
    }
    if (teamsError) {
      console.error('[AgentAssignment] Error fetching teams:', teamsError);
    }
  }, [plansError, teamsError]);

  useEffect(() => {
    // Use database plans if available, otherwise fall back to localStorage
    if (dbPlans && dbPlans.length > 0) {
      setPlans(dbPlans);
    } else {
      setPlans(getCommissionPlans());
    }
  }, [dbPlans]);

  useEffect(() => {
    // Use database teams if available, otherwise fall back to localStorage
    if (dbTeams && dbTeams.length > 0) {
      setTeams(dbTeams);
    } else {
      setTeams(getTeams());
    }
  }, [dbTeams]);

  useEffect(() => {
    setAssignments(getAgentAssignments());

    // Extract unique agents from records
    const uniqueAgents = new Set<string>();
    records.forEach(r => {
      if (r.agents) {
        r.agents.split(',').forEach(a => uniqueAgents.add(a.trim()));
      }
    });
    setAgents(Array.from(uniqueAgents).sort());
  }, [records]);

  useEffect(() => {
    if (highlightAgent) {
      setTimeout(() => {
        const element = document.querySelector(`[data-agent-row="${highlightAgent}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlight-agent');
          setTimeout(() => {
            element.classList.remove('highlight-agent');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightAgent]);

  const handleAssignPlan = async (agentName: string, planId: string) => {
    const existing = assignments.find(a => a.agentName === agentName);
    const newAssignments = assignments.filter(a => a.agentName !== agentName);
    
    if (planId !== 'none') {
      newAssignments.push({
        id: existing?.id || Math.random().toString(36).substr(2, 9),
        agentName,
        planId,
        teamId: existing?.teamId, // Preserve team
        startDate: existing?.startDate || new Date().toISOString().split('T')[0]
      });
    } else if (existing?.teamId) {
       // Keep assignment if team exists but plan removed? No, require plan for now.
       // Actually, let's allow partial assignment.
       newAssignments.push({
         id: existing.id,
         agentName,
         planId: 'none',
         teamId: existing.teamId
       });
    }
    setAssignments(newAssignments);
    saveAgentAssignments(newAssignments);
    
    // Trigger real-time commission recalculation
    if (planId !== 'none') {
      setRecalculatingAgent(agentName);
      try {
        const result = await recalculateMutation.mutateAsync({
          agentName,
        });
        
        if (result.success) {
          toast.success(`✓ Commission recalculated for ${agentName}: ${result.transactionCount} transactions, $${(result.totalCommission / 100).toFixed(2)} total`);
        } else {
          toast.error(result.error || 'Failed to recalculate commissions');
        }
      } catch (error) {
        console.error('Recalculation error:', error);
        toast.error('Failed to recalculate commissions');
      } finally {
        setRecalculatingAgent(null);
      }
    }
    
    // Dispatch custom event to notify other components (like leaderboard) of the change
    window.dispatchEvent(new CustomEvent('commission-assignment-updated'));
    onAssignmentChange?.();
  };

  const handleAssignTeam = (agentName: string, teamId: string) => {
    const existing = assignments.find(a => a.agentName === agentName);
    const newAssignments = assignments.filter(a => a.agentName !== agentName);
    
    const newTeamId = teamId === 'none' ? undefined : teamId;

    if (existing) {
      newAssignments.push({
        ...existing,
        teamId: newTeamId
      });
    } else if (newTeamId) {
      newAssignments.push({
        id: Math.random().toString(36).substr(2, 9),
        agentName,
        planId: 'none', // Placeholder
        teamId: newTeamId,
        startDate: new Date().toISOString().split('T')[0]
      });
    }
    setAssignments(newAssignments);
    saveAgentAssignments(newAssignments);
    // Dispatch custom event to notify other components of the change
    window.dispatchEvent(new CustomEvent('commission-assignment-updated'));
  };

  const handleAnniversaryChange = (agentName: string, date: string) => {
    const existing = assignments.find(a => a.agentName === agentName);
    const newAssignments = assignments.filter(a => a.agentName !== agentName);
    
    if (existing) {
      newAssignments.push({
        ...existing,
        anniversaryDate: date
      });
    } else {
      newAssignments.push({
        id: Math.random().toString(36).substr(2, 9),
        agentName,
        planId: 'none',
        anniversaryDate: date,
        startDate: new Date().toISOString().split('T')[0]
      });
    }
    setAssignments(newAssignments);
    saveAgentAssignments(newAssignments);
    // Dispatch custom event to notify other components of the change
    window.dispatchEvent(new CustomEvent('commission-assignment-updated'));
  };

  const getAgentPlanId = (agentName: string) => {
    return assignments.find(a => a.agentName === agentName)?.planId || 'none';
  };

  const getAgentTeamId = (agentName: string) => {
    return assignments.find(a => a.agentName === agentName)?.teamId || 'none';
  };

  const getAgentAnniversary = (agentName: string) => {
    return assignments.find(a => a.agentName === agentName)?.anniversaryDate || '';
  };

  const filteredAgents = agents.filter(a =>
    a.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Agent Assignments</h3>
          <p className="text-sm text-foreground">Assign commission plans to your agents.</p>
        </div>
        <div className="flex items-center gap-4">
          <BulkPlanAssignment
            agents={agents}
            assignments={assignments}
            onAssignmentComplete={setAssignments}
          />
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent Name</TableHead>
              <TableHead>Commission Plan</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Anniversary</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-foreground">
                  No agents found. Upload a CSV to populate this list.
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => {
                const currentPlanId = getAgentPlanId(agent);
                const currentTeamId = getAgentTeamId(agent);
                const currentPlan = plans.find(p => p.id === currentPlanId);
                const currentTeam = teams.find(t => t.id === currentTeamId);

                return (
                  <TableRow key={agent} data-agent-row={agent} className="transition-colors duration-300">
                    <TableCell className="font-medium">{agent}</TableCell>
                    <TableCell className="w-[250px]">
                      <Select
                        value={currentPlanId}
                        onValueChange={(val) => handleAssignPlan(agent, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Plan Assigned</SelectItem>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-[200px]">
                      <Select
                        value={currentTeamId}
                        onValueChange={(val) => handleAssignTeam(agent, val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Team</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-[150px]">
                      <Input 
                        type="text" 
                        placeholder="MM-DD" 
                        className="w-24"
                        value={getAgentAnniversary(agent)}
                        onChange={(e) => handleAnniversaryChange(agent, e.target.value)}
                        maxLength={5}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {currentPlan && (
                          <Badge variant="outline">
                            {currentPlan.splitPercentage}/{100 - currentPlan.splitPercentage}
                          </Badge>
                        )}
                        {currentPlan && currentPlan.capAmount > 0 && (
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                            ${currentPlan.capAmount / 1000}k Cap
                          </Badge>
                        )}
                        {currentTeam && (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-200">
                            Team: {currentTeam.teamSplitPercentage}%
                          </Badge>
                        )}
                        {!currentPlan && !currentTeam && (
                          <span className="text-sm text-foreground italic">--</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
