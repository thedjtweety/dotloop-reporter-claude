import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

/**
 * Teams Page
 * 
 * Displays teams and their performance metrics.
 * Includes sticky header with search functionality.
 */
export default function Teams() {
  const { agentMetrics, teams } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState('');

  // Group agents by team and calculate team metrics
  const teamMetrics = useMemo(() => {
    const grouped: Record<string, typeof agentMetrics> = {};
    
    agentMetrics.forEach(agent => {
      const teamName = agent.agentName.split(' ')[0]; // Simple team grouping
      if (!grouped[teamName]) grouped[teamName] = [];
      grouped[teamName].push(agent);
    });

    return Object.entries(grouped)
      .map(([teamName, members]) => ({
        teamName,
        memberCount: members.length,
        totalTransactions: members.reduce((sum, m) => sum + m.totalTransactions, 0),
        totalGCI: members.reduce((sum, m) => sum + m.totalSalesVolume, 0),
        avgCloseRate: members.reduce((sum, m) => sum + m.closingRate, 0) / members.length
      }))
      .filter(team =>
        !searchQuery.trim() ||
        team.teamName.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [agentMetrics, searchQuery]);

  if (!agentMetrics || agentMetrics.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Teams"
          subtitle="Manage your team structure"
          onSearch={setSearchQuery}
          searchPlaceholder="Search teams..."
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-foreground/70 mb-2">No teams found</p>
            <p className="text-sm text-foreground/50">Upload data to see team metrics</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Teams"
        subtitle={`${teamMetrics.length} teams`}
        onSearch={setSearchQuery}
        searchPlaceholder="Search teams..."
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMetrics.map((team, idx) => (
            <Card key={idx} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Team Header */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-lg">{team.teamName}</h3>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    <Users className="w-3 h-3 mr-1" />
                    {team.memberCount} members
                  </Badge>
                </div>

                {/* Team Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background p-3 rounded-lg border border-border">
                    <p className="text-xs text-foreground/70 mb-1">Total Transactions</p>
                    <p className="text-2xl font-bold text-foreground">{team.totalTransactions}</p>
                  </div>
                  <div className="bg-background p-3 rounded-lg border border-border">
                    <p className="text-xs text-foreground/70 mb-1">Total GCI</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(team.totalGCI / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <div className="bg-background p-3 rounded-lg border border-border col-span-2">
                    <p className="text-xs text-foreground/70 mb-1">Avg Close Rate</p>
                    <p className="text-2xl font-bold text-foreground">
                      {(team.avgCloseRate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* No Results */}
        {teamMetrics.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-foreground/70 mb-2">No teams match your search</p>
              <p className="text-sm text-foreground/50">Try adjusting your search query</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
