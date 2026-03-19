/**
 * Agent Leaderboard Component with Export Functionality
 * Displays agent performance metrics with pagination, search, filters, and export options
 * Design: Professional data table with sorting, filtering, and navigation controls
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AgentMetrics } from '@/lib/csvParser';
import { exportAgentAsCSV, exportAgentAsPDF, exportAllAgentsAsCSV } from '@/lib/exportReports';
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
import { trpc } from '@/lib/trpc';

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

export default function AgentLeaderboardWithExport({ agents = [], records = [], agentAssignments = [], onNavigateToAssignAgent, onAgentDrillDown }: AgentLeaderboardProps) {
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
  const [localAssignments, setLocalAssignments] = useState<Array<{agentName: string; planId?: string; planName?: string}>>([]);

  // Fetch assignments from database via tRPC
  const { data: dbAssignments, refetch: refetchAssignments } = trpc.commission.getAssignments.useQuery();

  // Sync database assignments with local state
  useEffect(() => {
    if (dbAssignments) {
      setLocalAssignments(dbAssignments);
    }
  }, [dbAssignments]);

  // Check if financial data exists
  const hasFinancialData = agents.some(a => a.totalCommission > 0 || a.companyDollar > 0);

  // Listen for custom event when assignments change in the same tab
  useEffect(() => {
    const handleAssignmentUpdate = () => {
      // Refetch assignments from database
      refetchAssignments?.();
    };

    window.addEventListener('commission-assignment-updated', handleAssignmentUpdate);
    
    return () => {
      window.removeEventListener('commission-assignment-updated', handleAssignmentUpdate);
    };
  }, [refetchAssignments]);



  // Helper to check if agent has commission plan assigned
  // First check database assignments, then fall back to prop
  // A plan is considered assigned if the planId is not 'none' and not empty
  const agentHasCommissionPlan = (agentName: string) => {
    const hasLocalAssignment = localAssignments.some(a => a.agentName === agentName && a.planId && a.planId !== 'none');
    const hasPropAssignment = agentAssignments.some(a => a.agentName === agentName && a.planId && a.planId !== 'none');
    return hasLocalAssignment || hasPropAssignment;
  };

  const getAgentPlanName = (agentName: string) => {
    const localAssignment = localAssignments.find(a => a.agentName === agentName);
    if (localAssignment?.planName) return localAssignment.planName;
    const propAssignment = agentAssignments.find(a => a.agentName === agentName);
    return propAssignment?.planName;
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

  // Computed values with memoization
  const filteredAgents = useMemo(() => {
    if (!agents || agents.length === 0) return [];
    return agents.filter(agent =>
      agent.agentName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agents, searchQuery, localAssignments]);

  const sortedAgents = useMemo(() => {
    const sorted = [...filteredAgents].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    if (filterType === 'top10') {
      return sorted.slice(0, 10);
    } else if (filterType === 'bottom10') {
      return sorted.slice(-10);
    }

    return sorted;
  }, [filteredAgents, sortField, sortDirection, filterType, localAssignments]);

  const paginatedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedAgents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedAgents, currentPage, localAssignments]);

  const totalPages = Math.ceil(sortedAgents.length / ITEMS_PER_PAGE);

  const topThreeAgents = useMemo(() => {
    return [...agents]
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 3);
  }, [agents]);

  return (
    <div className="space-y-6">
      {/* Winners Podium */}
      {showPodium && topThreeAgents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              Agent Performance Leaderboard
            </h2>
            <Button
              onClick={() => setShowPodium(false)}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
            >
              Hide podium
            </Button>
          </div>
          <WinnersPodium agents={topThreeAgents} />
        </div>
      )}

      {/* Leaderboard Table */}
      <Card className="p-6 border border-border bg-card/50">
        <div className="space-y-4">
          {/* Header with controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 bg-background border-border"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setFilterType('all');
                  setCurrentPage(1);
                }}
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                className={filterType === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              >
                All
              </Button>
              <Button
                onClick={() => {
                  setFilterType('top10');
                  setCurrentPage(1);
                }}
                variant={filterType === 'top10' ? 'default' : 'outline'}
                size="sm"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Top 10
              </Button>
              <Button
                onClick={() => {
                  setFilterType('bottom10');
                  setCurrentPage(1);
                }}
                variant={filterType === 'bottom10' ? 'default' : 'outline'}
                size="sm"
              >
                Bottom 10
              </Button>
              <Button
                onClick={() => setViewMode(viewMode === 'table' ? 'bars' : 'table')}
                variant="outline"
                size="sm"
                title="Toggle between table and bar chart view"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {paginatedAgents.length} of {sortedAgents.length} agents
          </div>

          {/* View Mode Toggle */}
          {viewMode === 'bars' ? (
            <AgentComparisonBars agents={sortedAgents} />
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-foreground font-semibold">#</TableHead>
                      <TableHead className="text-foreground font-semibold">Agent Name</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">Deals</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">Close Rate</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">Avg Price</TableHead>
                      {hasFinancialData && (
                        <>
                          <TableHead className="text-right text-foreground font-semibold">Total GCI</TableHead>
                          <TableHead className="text-right text-foreground font-semibold">Company Dollar</TableHead>
                        </>
                      )}
                      <TableHead className="text-right text-foreground font-semibold">Buy %</TableHead>
                      <TableHead className="text-right text-foreground font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAgents.map((agent, idx) => (
                      <TableRow key={agent.agentName} className="border-border hover:bg-accent/50 transition-colors">
                        <TableCell className="font-semibold text-foreground">
                          {((currentPage - 1) * ITEMS_PER_PAGE) + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
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
                              {!agentHasCommissionPlan(agent.agentName) ? (
                                <CommissionPlanWarning 
                                  agentName={agent.agentName} 
                                  compact={true}
                                  onNavigateToAssignments={() => onNavigateToAssignAgent?.(agent.agentName)}
                                />
                              ) : (
                                <CommissionPlanWarning 
                                  agentName={agent.agentName} 
                                  compact={true}
                                  planName={getAgentPlanName(agent.agentName)}
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
                          </>
                        )}
                        <TableCell className="text-right text-foreground">
                          {formatPercentage(agent.buySidePercent || 50)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              onClick={() => setCommissionBreakdownAgent(agent)}
                              variant="ghost"
                              size="sm"
                              title="View commission breakdown"
                              className="h-8 w-8 p-0"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => setSelectedAgent(agent)}
                              variant="ghost"
                              size="sm"
                              title="View details"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleExportPDF(agent)}
                              variant="ghost"
                              size="sm"
                              disabled={exportingAgent === agent.agentName}
                              title="Export as PDF"
                              className="h-8 w-8 p-0"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleExportCSV(agent)}
                              variant="ghost"
                              size="sm"
                              disabled={exportingAgent === agent.agentName}
                              title="Export as Excel"
                              className="h-8 w-8 p-0"
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
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Modals */}
      {selectedAgent && (
        <Sheet open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
          <SheetContent className="w-full sm:w-[700px] bg-background border-border">
            <SheetHeader>
              <SheetTitle className="text-foreground">{selectedAgent.agentName} - Agent Details</SheetTitle>
            </SheetHeader>
            <AgentDetailsPanel
              agent={selectedAgent}
              transactions={records}
            />
          </SheetContent>
        </Sheet>
      )}

      {commissionBreakdownAgent && (
        <Sheet open={!!commissionBreakdownAgent} onOpenChange={() => setCommissionBreakdownAgent(null)}>
          <SheetContent className="w-full sm:w-[600px] bg-background border-border">
            <SheetHeader>
              <SheetTitle className="text-foreground">{commissionBreakdownAgent.agentName} - Commission Breakdown</SheetTitle>
            </SheetHeader>
            <AgentCommissionBreakdown agent={commissionBreakdownAgent} transactions={records} />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
