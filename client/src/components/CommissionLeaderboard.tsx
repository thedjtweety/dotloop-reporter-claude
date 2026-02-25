/**
 * Commission Leaderboard Component
 * Displays real-time calculated commissions for all agents based on assigned plans
 * Features: Real commission calculations, bulk recalculation, progress tracking
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowUpDown,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatNumber } from '@/lib/formatUtils';

type SortField = 'totalCommission' | 'transactionCount' | 'agentName';

export default function CommissionLeaderboard() {
  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isRecalculatingAll, setIsRecalculatingAll] = useState(false);

  // Fetch commission summary for all agents
  const commissionSummaryQuery = trpc.commissionRecalculation.getAllAgentCommissionSummaries.useQuery(
    {},
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Bulk recalculation mutation
  const recalculateAllMutation = trpc.commissionRecalculation.recalculateAll.useMutation({
    onSuccess: () => {
      // Refetch commission summary after recalculation
      commissionSummaryQuery.refetch();
    },
  });

  const handleRecalculateAll = async () => {
    setIsRecalculatingAll(true);
    try {
      await recalculateAllMutation.mutateAsync();
    } finally {
      setIsRecalculatingAll(false);
    }
  };

  // Sort agents
  const sortedAgents = (commissionSummaryQuery.data?.summaries || []).sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortableHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors sticky top-0 bg-muted/30 z-10"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown
          className={`w-4 h-4 transition-opacity ${
            sortField === field ? 'opacity-100' : 'opacity-30'
          }`}
        />
      </div>
    </TableHead>
  );

  if (commissionSummaryQuery.isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-2 text-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading commission data...
        </div>
      </Card>
    );
  }

  if (commissionSummaryQuery.isError) {
    return (
      <Card className="p-8">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load commission data</span>
        </div>
      </Card>
    );
  }

  const data = commissionSummaryQuery.data;
  const totalCommission = sortedAgents.reduce((sum, a) => sum + (a.totalCommission || 0), 0);
  const totalAgents = sortedAgents.length;
  const hasAssignedAgents = sortedAgents.filter((a) => a.status === 'calculated').length > 0;

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Header Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground">
                Commission Summary
              </h2>
              <p className="text-sm text-foreground/70">
                Real-time commission calculations based on assigned plans
              </p>
            </div>
          </div>
          <Button
            onClick={handleRecalculateAll}
            disabled={isRecalculatingAll || recalculateAllMutation.isPending}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {isRecalculatingAll || recalculateAllMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Recalculate All
              </>
            )}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-foreground/70 mb-1">Total Agents</div>
            <div className="text-2xl font-bold text-foreground">
              {totalAgents}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-foreground/70 mb-1">Assigned Plans</div>
            <div className="text-2xl font-bold text-foreground">
              {sortedAgents.filter((a) => a.status === 'calculated').length}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="text-sm text-foreground/70 mb-1">Total Commission</div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalCommission)}
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 sticky top-0 z-20">
              <TableHead className="w-12 text-center font-display font-semibold">
                Rank
              </TableHead>
              <SortableHeader field="agentName" label="Agent Name" />
              <SortableHeader field="totalCommission" label="Total Commission" />
              <SortableHeader field="transactionCount" label="Transactions" />
              <TableHead className="font-display font-semibold">Plan Name</TableHead>
              <TableHead className="font-display font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAgents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-foreground/70">
                  No agents found
                </TableCell>
              </TableRow>
            ) : (
              sortedAgents.map((agent, index) => (
                <TableRow
                  key={agent.agentName}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="text-center font-display font-semibold text-primary">
                    #{index + 1}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {agent.agentName}
                  </TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {formatCurrency(agent.totalCommission)}
                  </TableCell>
                  <TableCell className="text-center font-medium text-foreground">
                    {formatNumber(agent.transactionCount)}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {agent.planName}
                  </TableCell>
                  <TableCell>
                    {agent.status === 'calculated' ? (
                      <Badge className="gap-1 bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30">
                        <CheckCircle className="w-3 h-3" />
                        Calculated
                      </Badge>
                    ) : agent.status === 'no_plan_assigned' ? (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        No Plan
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {agent.status || 'Unknown'}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Info */}
      {hasAssignedAgents && (
        <div className="p-4 border-t border-border bg-muted/30 text-sm text-foreground/70">
          Showing {sortedAgents.filter((a) => a.status === 'calculated').length} agents with calculated
          commissions. Click "Recalculate All" to update commission calculations.
        </div>
      )}
    </Card>
  );
}
