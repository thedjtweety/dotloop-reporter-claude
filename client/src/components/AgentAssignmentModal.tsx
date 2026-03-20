/**
 * Agent Assignment Modal Component
 * Allows users to assign agents to transactions during CSV upload
 * Includes option to skip agent assignment
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Users, SkipForward } from 'lucide-react';
import FullScreenModal from '@/components/FullScreenModal';

interface Agent {
  id: string;
  name: string;
  email?: string;
}

interface AgentAssignmentModalProps {
  isOpen: boolean;
  agents: Agent[];
  onConfirm: (selectedAgentIds: string[]) => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export default function AgentAssignmentModal({
  isOpen,
  agents,
  onConfirm,
  onSkip,
  isLoading = false,
}: AgentAssignmentModalProps) {
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  const handleToggleAgent = (agentId: string) => {
    const newSelected = new Set(selectedAgents);
    if (newSelected.has(agentId)) {
      newSelected.delete(agentId);
    } else {
      newSelected.add(agentId);
    }
    setSelectedAgents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedAgents.size === agents.length) {
      setSelectedAgents(new Set());
    } else {
      setSelectedAgents(new Set(agents.map(a => a.id)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedAgents));
    setSelectedAgents(new Set());
  };

  const handleSkip = () => {
    setSelectedAgents(new Set());
    onSkip();
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={handleSkip}
      title="Assign Agents to Transactions"
      subtitle="Select which agents should be assigned to the transactions in this upload. You can skip this step if you prefer to assign agents later."
    >
      <div className="space-y-4 py-8 pb-24">
        {agents.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">No agents available. Create agents in the Commission Management section first.</p>
          </Card>
        ) : (
          <>
            {/* Select All Option */}
            <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox
                  checked={selectedAgents.size === agents.length}
                  onCheckedChange={handleSelectAll}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Select All Agents</p>
                  <p className="text-sm text-foreground/70">
                    {selectedAgents.size} of {agents.length} selected
                  </p>
                </div>
              </label>
            </Card>

            {/* Individual Agent Options */}
            <div className="space-y-2">
              {agents.map((agent) => (
                <Card
                  key={agent.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selectedAgents.has(agent.id)
                      ? 'bg-emerald-500/20 border-emerald-500/50'
                      : 'hover:bg-slate-900/50'
                  }`}
                  onClick={() => handleToggleAgent(agent.id)}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedAgents.has(agent.id)}
                      onCheckedChange={() => handleToggleAgent(agent.id)}
                      className="w-5 h-5"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{agent.name}</p>
                      {agent.email && (
                        <p className="text-sm text-foreground/70">{agent.email}</p>
                      )}
                    </div>
                  </label>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fixed Footer with Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex gap-3 justify-between py-4">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Skip for Now
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedAgents.size === 0}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isLoading ? 'Processing...' : `Assign ${selectedAgents.size} Agent${selectedAgents.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </FullScreenModal>
  );
}
