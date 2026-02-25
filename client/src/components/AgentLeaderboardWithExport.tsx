/**
 * Agent Leaderboard Component with Export Functionality
 * Displays agent performance metrics with pagination, search, filters, and export options
 * Design: Professional data table with sorting, filtering, and navigation controls
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AgentMetrics } from '@/lib/csvParser';
import { exportAgentAsCSV, exportAgentAsPDF, exportAllAgentsAsCSV } from '@/lib/exportReports';
import { getAgentAssignments } from '@/lib/commission';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, TrendingUp, Download, FileText, Sheet as SheetIcon, Medal, Trophy, Eye, Search, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import AgentCommissionModal from './AgentCommissionModal';
import AgentDetailsPanel from './AgentDetailsPanel';
import AgentCommissionBreakdown from './AgentCommissionBreakdown';
import CommissionPlanWarning from './CommissionPlanWarning';
import { DotloopRecord } from '@/lib/csvParser';
import WinnersPodium from './WinnersPodium';
import { formatCurrency, formatPercentage } from '@/lib/formatUtils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import AgentComparisonBars from './AgentComparisonBars';
import { BarChart3 } from 'lucide-react';

interface AgentLeaderboardProps {
  agents: AgentMetrics[];
  records?: DotloopRecord[];
  agentAssignments?: Array<{ agentName: string; planId: string; planName?: string }>;
  onNavigateToAssignAgent?: (agentName: string) => void;
  onAgentDrillDown?: (agentName: string, transactions: DotloopRecord[]) => void;
}

type SortField = keyof AgentMetrics;
type FilterType = 'all' | 'top10' | 'bottom10';

const ITEMS_PER_PAGE = 10;

export default function AgentLeaderboardWithExport({ agents, records = [], agentAssignments = [], onNavigateToAssignAgent, onAgentDrillDown }: AgentLeaderboardProps) {
  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [exportingAgent, setExportingAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentMetrics | null>(null);
  const [commissionBreakdownAgent, setCommissionBreakdownAgent] = useState<AgentMetrics | null>(null);
  const [showPodium, setShowPodium] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'table' | 'bars'>('table');
  const [localAssignments, setLocalAssignments] = useState(getAgentAssignments());

  // Refresh assignments from localStorage when component mounts
  useEffect(() => {
    const assignments = getAgentAssignments();
    setLocalAssignments(assignments);
  }, []); // Empty dependency array - only run on mount

  // Check if financial data exists
  const hasFinancialData = agents.some(a => a.totalCommission > 0 || a.companyDollar > 0);

  // Listen for storage changes to update assignments in real-time
  useEffect(() => {
    const handleStorageChange = () => {
      setLocalAssignments(getAgentAssignments());
    };

    // Listen for custom event when assignments change in the same tab
    const handleAssignmentUpdate = () => {
      setLocalAssignments(getAgentAssignments());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('commission-assignment-updated', handleAssignmentUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('commission-assignment-updated', handleAssignmentUpdate);
    };
  }, []);



  // Helper to check if agent has commission plan assigned
  // First check localStorage, then fall back to prop
  // A plan is considered assigned if the planId is not 'none' and not empty
  const agentHasCommissionPlan = (agentName: string) => {
    const hasLocalAssignment = localAssignments.some(a => a.agentName === agentName && a.planId && a.planId !== 'none');
    const hasPropAssignment = agentAssignments.some(a => a.agentName === agentName && a.planId && a.planId !== 'none');
    return hasLocalAssignment || hasPropAssignment;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  const handleExportPDF = async (agent: AgentMetrics) => {
    setExportingAgent(agent.agentName);
    try {
      await exportAgentAsPDF(agent);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingAgent(null);
    }
  };

  const handleExportCSV = async (agent: AgentMetrics) => {
    setExportingAgent(agent.agentName);
    try {
      await exportAgentAsCSV(agent);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingAgent(null);
    }
  };

  const handleExportAllCSV = async () => {
    setExportingAgent('all');
    try {
      await exportAllAgentsAsCSV(agents);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingAgent(null);
    }
  };

  // Filter agents
  const filteredAgents = useMemo(() => {
    let result = agents.filter(a =>
      a.agentName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterType === 'top10') {
      result = result.slice(0, 10);
    } else if (filterType === 'bottom10') {
      result = result.slice(-10);
    }

    return result;
  }, [agents, searchQuery, filterType]);

  // Sort agents
  const sortedAgents = useMemo(() => {
    const sorted = [...filteredAgents].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    return sorted;
  }, [filteredAgents, sortField, sortDirection]);

  // Paginate
  const paginatedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAgents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAgents, currentPage]);

  const totalPages = Math.ceil(sortedAgents.length / ITEMS_PER_PAGE);

  return (
    <Card className="p-6 bg-card border border-border">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display font-bold text-foreground">
            Agent Performance Leaderboard
          </h2>
          <Button
            onClick={handleExportAllCSV}
            disabled={exportingAgent === 'all'}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            {exportingAgent === 'all' ? 'Exporting...' : 'Export All'}
          </Button>
        </div>

        {/* Podium */}
        {showPodium && agents.length >= 3 && (
          <div className="mb-6">
            <WinnersPodium agents={agents} transactions={records} />
            <button
              onClick={() => setShowPodium(false)}
              className="text-xs text-foreground/60 hover:text-foreground mt-2 transition-colors"
            >
              Hide podium
            </button>
          </div>
        )}

        {!showPodium && (
          <button
            onClick={() => setShowPodium(true)}
            className="text-xs text-foreground/60 hover:text-foreground mb-4 transition-colors"
          >
            Show podium
          </button>
        )}

        {/* Search and Filter */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground/40" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilterType('all');
                setCurrentPage(1);
              }}
            >
              All
            </Button>
            <Button
              variant={filterType === 'top10' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilterType('top10');
                setCurrentPage(1);
              }}
            >
              <Trophy className="w-4 h-4 mr-1" />
              Top 10
            </Button>
            <Button
              variant={filterType === 'bottom10' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setFilterType('bottom10');
                setCurrentPage(1);
              }}
            >
              Bottom 10
            </Button>
            <Button
              variant={viewMode === 'bars' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode(viewMode === 'table' ? 'bars' : 'table')}
              title="Toggle between table and bar chart view"
            >
              <BarChart3 className="w-4 h-4 mr-1" />
              {viewMode === 'table' ? 'View as Bars' : 'View as Table'}
            </Button>
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-foreground/60">
          Showing {paginatedAgents.length} of {sortedAgents.length} agents
        </p>
      </div>

      {/* View Mode Conditional Rendering */}
      {viewMode === 'table' ? (
        <>
      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border hover:bg-transparent">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead className="cursor-pointer hover:text-foreground" onClick={() => handleSort('agentName')}>
                <div className="flex items-center gap-2">
                  Agent Name
                  {sortField === 'agentName' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('totalTransactions')}>
                <div className="flex items-center justify-end gap-2">
                  Deals
                  {sortField === 'totalTransactions' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('closingRate')}>
                <div className="flex items-center justify-end gap-2">
                  Close Rate
                  {sortField === 'closingRate' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('averageSalesPrice')}>
                <div className="flex items-center justify-end gap-2">
                  Avg Price
                  {sortField === 'averageSalesPrice' && (
                    <ArrowUpDown className="w-4 h-4" />
                  )}
                </div>
              </TableHead>
              {hasFinancialData && (
                <>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('totalCommission')}>
                    <div className="flex items-center justify-end gap-2">
                      Total GCI
                      {sortField === 'totalCommission' && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('companyDollar')}>
                    <div className="flex items-center justify-end gap-2">
                      Company Dollar
                      {sortField === 'companyDollar' && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-foreground" onClick={() => handleSort('buySidePercentage')}>
                    <div className="flex items-center justify-end gap-2">
                      Buy %
                      {sortField === 'buySidePercentage' && (
                        <ArrowUpDown className="w-4 h-4" />
                      )}
                    </div>
                  </TableHead>
                </>
              )}
              <TableHead className="sticky right-0 bg-card text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedAgents.map((agent, index) => (
              <TableRow key={agent.agentName} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <TableCell className="text-center font-semibold text-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {agent.agentName
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <span
                        className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                        onClick={() => {
                          const agentTransactions = records.filter(
                            r => r.agents?.includes(agent.agentName)
                          );
                          onAgentDrillDown?.(agent.agentName, agentTransactions);
                        }}
                        title="Click to view agent's transactions"
                      >
                        {agent.agentName}
                      </span>
                      {!agentHasCommissionPlan(agent.agentName) && (
                        <CommissionPlanWarning 
                          agentName={agent.agentName} 
                          compact={true}
                          onNavigateToAssignments={() => onNavigateToAssignAgent?.(agent.agentName)}
                        />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right text-foreground font-semibold">
                  {agent.totalTransactions}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={agent.closingRate >= 50 ? 'default' : agent.closingRate >= 40 ? 'secondary' : 'outline'}
                    className="text-foreground"
                  >
                    {agent.closingRate.toFixed(1)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-foreground">
                  {formatCurrency(agent.averageSalesPrice)}
                </TableCell>
                {hasFinancialData && (
                  <>
                    <TableCell className="text-right text-foreground font-semibold">
                      {formatCurrency(agent.totalCommission)}
                    </TableCell>
                    <TableCell className="text-right text-foreground">
                      {formatCurrency(agent.companyDollar)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPercentage(agent.buySidePercentage)}
                    </TableCell>
                  </>
                )}
                <TableCell className="sticky right-0 bg-card shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  <div className="flex justify-center gap-1">
                    <Button
                      onClick={() => setCommissionBreakdownAgent(agent)}
                      variant="ghost"
                      size="sm"
                      title="View commission breakdown"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => setSelectedAgent(agent)}
                      variant="ghost"
                      size="sm"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleExportPDF(agent)}
                      variant="ghost"
                      size="sm"
                      disabled={exportingAgent === agent.agentName}
                      title="Export as PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleExportCSV(agent)}
                      variant="ghost"
                      size="sm"
                      disabled={exportingAgent === agent.agentName}
                      title="Export as Excel"
                    >
                      <SheetIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <Button
              key={page}
              onClick={() => setCurrentPage(page)}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              className="w-10"
            >
              {page}
            </Button>
          ))}
          <Button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
        </>
      ) : (
        <>
      {/* Bars View */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Total Commission</h3>
            <AgentComparisonBars
              agents={sortedAgents}
              metric="totalCommission"
              onAgentClick={(agent) => setCommissionBreakdownAgent(agent)}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Total Transactions</h3>
            <AgentComparisonBars
              agents={sortedAgents}
              metric="totalTransactions"
              onAgentClick={(agent) => setSelectedAgent(agent)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Closing Rate</h3>
            <AgentComparisonBars
              agents={sortedAgents}
              metric="closingRate"
              maxValue={100}
              onAgentClick={(agent) => setSelectedAgent(agent)}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">Avg Days to Close</h3>
            <AgentComparisonBars
              agents={sortedAgents}
              metric="averageDaysToClose"
              onAgentClick={(agent) => setSelectedAgent(agent)}
            />
          </div>
        </div>
      </div>
        </>
      )}

      {/* Commission Breakdown Full-Screen Modal */}
      {commissionBreakdownAgent && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0">
          <div className="w-screen h-screen max-w-none bg-background rounded-none flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-8 py-6 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  {commissionBreakdownAgent.agentName}
                </h2>
                <p className="text-sm text-foreground/60 mt-1">Commission Analysis</p>
              </div>
              <button
                onClick={() => setCommissionBreakdownAgent(null)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-6 h-6 text-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-8 py-8 max-w-7xl mx-auto">
                <AgentCommissionBreakdown 
                  agent={commissionBreakdownAgent} 
                  transactions={records}
                  hasCommissionPlan={agentHasCommissionPlan(commissionBreakdownAgent.agentName)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Details Full-Screen Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background w-full h-[95vh] md:h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">{selectedAgent.agentName}</h2>
              <button onClick={() => setSelectedAgent(null)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-6 h-6 text-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <AgentDetailsPanel agent={selectedAgent} transactions={records} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
