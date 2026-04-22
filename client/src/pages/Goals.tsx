import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, TrendingUp } from 'lucide-react';

/**
 * Goals Page
 * 
 * Displays agent goals and progress tracking.
 * Includes sticky header with search functionality.
 */
export default function Goals() {
  const { agentMetrics } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter agents and calculate goal progress
  const agentGoals = useMemo(() => {
    const goals = agentMetrics.map(agent => {
      const monthlyGCIGoal = 50000; // Example goal
      const monthlyTransactionGoal = 5;
      const gciProgress = ((agent.totalGCI || 0) / monthlyGCIGoal) * 100;
      const transactionProgress = (agent.transactionCount / monthlyTransactionGoal) * 100;

      return {
        agentName: agent.agentName,
        email: agent.email,
        monthlyGCIGoal,
        currentGCI: agent.totalGCI || 0,
        gciProgress: Math.min(gciProgress, 100),
        monthlyTransactionGoal,
        currentTransactions: agent.transactionCount,
        transactionProgress: Math.min(transactionProgress, 100),
        gciMet: (agent.totalGCI || 0) >= monthlyGCIGoal,
        transactionsMet: agent.transactionCount >= monthlyTransactionGoal,
      };
    }).filter(goal =>
      !searchQuery.trim() ||
      goal.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return goals;
  }, [agentMetrics, searchQuery]);

  if (!agentMetrics || agentMetrics.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Goals"
          subtitle="Track agent performance goals"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by agent name..."
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-foreground/70 mb-2">No goals found</p>
            <p className="text-sm text-foreground/50">Upload data to see goal tracking</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Goals"
        subtitle={`${agentGoals.filter(g => g.gciMet && g.transactionsMet).length} of ${agentGoals.length} agents on track`}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by agent name..."
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {agentGoals.map((goal, idx) => (
            <Card key={idx} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Agent Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{goal.agentName}</h3>
                    {goal.email && (
                      <p className="text-sm text-foreground/70">{goal.email}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {goal.gciMet && (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <Target className="w-3 h-3 mr-1" />
                        GCI Met
                      </Badge>
                    )}
                    {goal.transactionsMet && (
                      <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Trans Met
                      </Badge>
                    )}
                  </div>
                </div>

                {/* GCI Goal */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Monthly GCI Goal</span>
                    <span className="font-semibold text-foreground">
                      ${goal.currentGCI.toLocaleString()} / ${goal.monthlyGCIGoal.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2 border border-border overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        goal.gciMet ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${goal.gciProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground/70">{goal.gciProgress.toFixed(0)}% complete</p>
                </div>

                {/* Transaction Goal */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/70">Monthly Transactions</span>
                    <span className="font-semibold text-foreground">
                      {goal.currentTransactions} / {goal.monthlyTransactionGoal}
                    </span>
                  </div>
                  <div className="w-full bg-background rounded-full h-2 border border-border overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        goal.transactionsMet ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${goal.transactionProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground/70">{goal.transactionProgress.toFixed(0)}% complete</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {agentGoals.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-foreground/70 mb-2">No goals match your search</p>
              <p className="text-sm text-foreground/50">Try adjusting your search query</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
