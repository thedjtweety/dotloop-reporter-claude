/**
 * Agent Details Panel Component
 * Displays transaction-level details and performance history for an agent
 * Design: Clean, organized panel with transaction list and metrics
 */

import { useState } from 'react';
import { AgentMetrics } from '@/lib/csvParser';
import { DotloopRecord } from '@/lib/csvParser';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, List } from 'lucide-react';
import TransactionTable from './TransactionTable';
import AgentOnePager from './AgentOnePager';
import { ModalSearch } from './ModalSearch';

interface AgentDetailsPanelProps {
  agent: AgentMetrics;
  transactions: DotloopRecord[];
}

export default function AgentDetailsPanel({
  agent,
  transactions,
}: AgentDetailsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Guard against undefined transactions
  if (!transactions || !agent) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No agent data available</p>
      </Card>
    );
  }

  // Filter transactions for this agent
  const agentTransactions = transactions.filter(t => {
    const agents = t.agents ? t.agents.split(',').map(a => a.trim()) : [];
    return agents.includes(agent.agentName);
  });

  // Filter transactions based on search term
  const filteredTransactions = agentTransactions.filter(t => 
    t.loopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.loopStatus.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.transactionType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group transactions by status
  const transactionsByStatus = {
    closed: agentTransactions.filter(t => t.loopStatus === 'Closed'),
    active: agentTransactions.filter(t => t.loopStatus === 'Active Listing'),
    underContract: agentTransactions.filter(t => t.loopStatus === 'Under Contract'),
    archived: agentTransactions.filter(t => t.loopStatus === 'Archived'),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header Section */}
      <div className="flex-none pb-4 border-b border-border mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            {/* Agent name is handled by the parent SheetTitle, so we just show the Print button here */}
          </div>
          <AgentOnePager agent={agent} />
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center gap-4 mb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Transactions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Search Bar - Only visible in Transactions tab */}
          {activeTab === 'transactions' && (
            <div className="mb-4">
              <ModalSearch
                placeholder="Search transactions by address, status, or type..."
                onSearchChange={setSearchTerm}
                resultCount={filteredTransactions.length}
                totalCount={agentTransactions.length}
              />
            </div>
          )}

          {/* Scrollable Content Section */}
          <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: 'calc(100vh - 280px)' }}>
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 border-l-4 border-l-primary">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Total Deals
                  </div>
                  <div className="text-3xl font-bold text-foreground">
                    {agentTransactions.length}
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-emerald-500">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Closed
                  </div>
                  <div className="text-3xl font-bold text-emerald-600">
                    {transactionsByStatus.closed.length}
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-blue-500">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Active
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {transactionsByStatus.active.length}
                  </div>
                </Card>
                <Card className="p-4 border-l-4 border-l-amber-500">
                  <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                    Pending
                  </div>
                  <div className="text-3xl font-bold text-amber-600">
                    {transactionsByStatus.underContract.length}
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <Card className="p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Financial Performance</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Total GCI</span>
                      <span className="text-lg font-bold text-primary">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agent.totalCommission)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Avg Sale Price</span>
                      <span className="text-lg font-bold">
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(agent.averageSalesPrice)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium">Closing Rate</span>
                      <Badge variant={agent.closingRate >= 50 ? "default" : "secondary"}>
                        {agent.closingRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transactions" className="mt-0">
              <Card className="border-none shadow-none">
                <div className="mb-2 text-sm text-foreground">
                  Showing {filteredTransactions.length} of {agentTransactions.length} transactions
                </div>
                <TransactionTable transactions={filteredTransactions} limit={100} />
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
