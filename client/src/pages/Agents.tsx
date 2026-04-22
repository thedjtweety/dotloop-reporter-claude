import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import BulkActionsBar from '@/components/BulkActionsBar';
import ExportButton from '@/components/ExportButton';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TrendingUp } from 'lucide-react';

/**
 * Agents Page
 * 
 * Displays all agents with their performance metrics.
 * Includes sticky header with search, bulk actions, and export functionality.
 */
export default function Agents() {
  const { agentMetrics } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  // Handle checkbox toggle
  const toggleAgent = (agentName: string) => {
    setSelectedIds(prev =>
      prev.includes(agentName)
        ? prev.filter(id => id !== agentName)
        : [...prev, agentName]
    );
  };

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAgents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAgents.map(a => a.agentName));
    }
  };

  // Prepare export data
  const exportData = {
    headers: ['Agent Name', 'Email', 'Transactions', 'Total GCI', 'Avg Commission', 'Close Rate'],
    rows: filteredAgents.map(agent => ({
      'Agent Name': agent.agentName,
      'Email': agent.email || 'N/A',
      'Transactions': agent.transactionCount,
      'Total GCI': `$${(agent.totalGCI || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'Avg Commission': `$${(agent.averageCommission || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      'Close Rate': `${((agent.closeRate || 0) * 100).toFixed(1)}%`,
    })),
    filename: `agents-${new Date().toISOString().split('T')[0]}`,
  };

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
      >
        <ExportButton data={exportData} disabled={filteredAgents.length === 0} />
      </PageHeader>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        onBulkEmail={(ids) => console.log('Email to:', ids)}
        onBulkRoleChange={(ids, role) => console.log('Change role to:', role, 'for:', ids)}
        onBulkCommissionAdjust={(ids, amount) => console.log('Adjust commission by:', amount, 'for:', ids)}
      />

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {/* Select All Checkbox */}
          {filteredAgents.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg">
              <Checkbox
                checked={selectedIds.length === filteredAgents.length && filteredAgents.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-foreground/70">
                {selectedIds.length === 0 ? 'Select all' : `${selectedIds.length} selected`}
              </span>
            </div>
          )}

          {/* Agent Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.agentName}
                className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
                  selectedIds.includes(agent.agentName)
                    ? 'ring-2 ring-primary bg-primary/5'
                    : ''
                }`}
                onClick={() => toggleAgent(agent.agentName)}
              >
                <div className="space-y-3">
                  {/* Checkbox and Name */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.includes(agent.agentName)}
                      onCheckedChange={() => toggleAgent(agent.agentName)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{agent.agentName}</h3>
                      {agent.email && (
                        <p className="text-sm text-foreground/70">{agent.email}</p>
                      )}
                    </div>
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
    </div>
  );
}
