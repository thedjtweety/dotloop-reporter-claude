import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Agents Page
 * 
 * Displays all agents with their performance metrics.
 * Includes sticky header with search functionality.
 */
export default function Agents() {
  const { agentMetrics, filteredRecords } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter agents by search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agentMetrics;
    
    const query = searchQuery.toLowerCase();
    return agentMetrics.filter(agent =>
      agent.agentName.toLowerCase().includes(query) ||
      agent.email?.toLowerCase().includes(query) ||
      agent.phone?.toLowerCase().includes(query)
    );
  }, [agentMetrics, searchQuery]);

  if (!agentMetrics || agentMetrics.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Agents"
          subtitle="Manage and view your team members"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name, email, or phone..."
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-foreground/70 mb-2">No agents found</p>
            <p className="text-sm text-foreground/50">Upload data to see agent metrics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Agents"
        subtitle={`${filteredAgents.length} of ${agentMetrics.length} agents`}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by name, email, or phone..."
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent, idx) => (
            <Card key={idx} className="p-4 hover:shadow-lg transition-shadow">
              <div className="space-y-3">
                {/* Agent Name */}
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{agent.agentName}</h3>
                  {agent.email && (
                    <p className="text-sm text-foreground/70">{agent.email}</p>
                  )}
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-background p-2 rounded">
                    <p className="text-xs text-foreground/70">Transactions</p>
                    <p className="text-lg font-bold text-foreground">{agent.transactionCount}</p>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <p className="text-xs text-foreground/70">Total GCI</p>
                    <p className="text-lg font-bold text-foreground">
                      ${(agent.totalGCI || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <p className="text-xs text-foreground/70">Avg Commission</p>
                    <p className="text-lg font-bold text-foreground">
                      ${(agent.averageCommission || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-background p-2 rounded">
                    <p className="text-xs text-foreground/70">Close Rate</p>
                    <p className="text-lg font-bold text-foreground">
                      {((agent.closeRate || 0) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex gap-2">
                  {agent.transactionCount > 0 && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {filteredAgents.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-foreground/70 mb-2">No agents match your search</p>
              <p className="text-sm text-foreground/50">Try adjusting your search query</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
