import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import BulkActionsBar from '@/components/BulkActionsBar';
import ExportButton from '@/components/ExportButton';
import Pagination from '@/components/Pagination';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Copy, Download } from 'lucide-react';

/**
 * Agents Page
 * 
 * Displays agents in a paginated table with search, bulk actions, and export.
 * Maintains sticky header while navigating through pages.
 */
export default function Agents() {
  const { agentMetrics } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Calculate pagination
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAgents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAgents, currentPage, itemsPerPage]);

  // Handle checkbox toggle
  const toggleAgent = (agentName: string) => {
    setSelectedIds(prev =>
      prev.includes(agentName)
        ? prev.filter(id => id !== agentName)
        : [...prev, agentName]
    );
  };

  // Handle select all on current page
  const toggleSelectAll = () => {
    const pageAgentNames = paginatedAgents.map(a => a.agentName);
    if (pageAgentNames.every(name => selectedIds.includes(name))) {
      setSelectedIds(prev => prev.filter(id => !pageAgentNames.includes(id)));
    } else {
      setSelectedIds(prev => [
        ...prev,
        ...pageAgentNames.filter(name => !prev.includes(name)),
      ]);
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

      {/* Content Area with Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Card className="m-6 border-0 shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                {/* Table Header */}
                <thead className="sticky top-0 z-10 bg-background border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <Checkbox
                        checked={
                          paginatedAgents.length > 0 &&
                          paginatedAgents.every(a => selectedIds.includes(a.agentName))
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Agent</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Deals</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Close %</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Avg Price</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Total GCI</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Co. Dollar</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Volume</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody className="divide-y divide-border">
                  {paginatedAgents.map((agent, idx) => {
                    const rowNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isSelected = selectedIds.includes(agent.agentName);

                    return (
                      <tr
                        key={agent.agentName}
                        className={`hover:bg-background/50 transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAgent(agent.agentName)}
                          />
                        </td>
                        <td className="px-4 py-3 text-foreground/70">{rowNumber}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold text-foreground">{agent.agentName}</p>
                            {agent.email && (
                              <p className="text-xs text-foreground/60">{agent.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground">{agent.transactionCount}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                            {((agent.closeRate || 0) * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          ${((agent.totalGCI || 0) / agent.transactionCount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                          ${(agent.totalGCI || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          ${(agent.averageCommission || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          ${((agent.totalGCI || 0) * 0.03).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button className="p-1 hover:bg-background rounded transition-colors" title="View details">
                              <Eye className="w-4 h-4 text-foreground/60 hover:text-foreground" />
                            </button>
                            <button className="p-1 hover:bg-background rounded transition-colors" title="Copy">
                              <Copy className="w-4 h-4 text-foreground/60 hover:text-foreground" />
                            </button>
                            <button className="p-1 hover:bg-background rounded transition-colors" title="Download">
                              <Download className="w-4 h-4 text-foreground/60 hover:text-foreground" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* No Results */}
            {paginatedAgents.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-foreground/70 mb-2">No agents match your search</p>
                  <p className="text-sm text-foreground/50">Try adjusting your search query</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Pagination */}
        {filteredAgents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAgents.length}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </div>
    </div>
  );
}
