/**
 * Net Commission Report Page
 * 
 * Main page for viewing, filtering, printing, and emailing net commission reports
 * for all agents with detailed transaction-level breakdowns
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Download, Mail, Printer, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NetCommissionReport from '@/components/NetCommissionReport';
import { DateRange } from 'react-day-picker';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { calculateAgentMetrics } from '@/lib/csvParser';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { useAgentDetail } from '@/hooks/useAgentDetail';

interface AgentCommissionSummary {
  agentName: string;
  planName: string;
  totalTransactions: number;
  totalGrossCommission: number;
  totalDeductions: number;
  totalNetCommission: number;
  averageCommissionPerDeal: number;
  transactions: any[];
}

export default function NetCommissionReportPage() {
  const [, setLocation] = useLocation();
  const { allRecords, agentMetrics, commissionPlans, agentAssignments, hasData } = useTransactionData();
  const { agentTarget, openAgent, closeAgent } = useAgentDetail();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [agents, setAgents] = useState<AgentCommissionSummary[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentCommissionSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Generate report when data is available
  useEffect(() => {
    if (!hasData) {
      setAgents([]);
      setFilteredAgents([]);
      return;
    }

    // Generate commission report from transaction data
    setIsLoading(true);
    try {
      const agentSummaries = new Map<string, AgentCommissionSummary>();

      // Filter transactions by date range if provided
      let filteredTransactions = allRecords;
      if (dateRange?.from || dateRange?.to) {
        const fromDate = dateRange.from ? new Date(dateRange.from) : new Date('1900-01-01');
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date('2099-12-31');

        filteredTransactions = filteredTransactions.filter(t => {
          const closingDate = new Date(t.closingDate);
          return closingDate >= fromDate && closingDate <= toDate;
        });
      }

      // Calculate commissions for each transaction and agent
      for (const transaction of filteredTransactions) {
        const agents = transaction.agents.split(',').map(a => a.trim());
        const totalGCI = (transaction.salePrice || 0) * ((transaction.commissionRate || 0) / 100);

        for (const agentName of agents) {
          if (!agentName) continue;

          // Get agent's commission plan
          const assignment = agentAssignments.find(a => a.agentName === agentName);
          const planName = assignment?.planName || 'Default Plan';

          // Get commission plan details
          const plan = commissionPlans.find(p => p.name === planName);
          const splitPercentage = plan?.splitPercentage || 50;

          // Calculate agent's commission
          const agentCommission = totalGCI * (splitPercentage / 100);
          const deductions = plan?.deductions?.reduce((sum, d) => {
            if (d.type === 'fixed') return sum + d.amount;
            return sum + (agentCommission * (d.amount / 100));
          }, 0) || 0;

          const netCommission = agentCommission - deductions;

          // Create or update agent summary
          const key = `${agentName}-${planName}`;
          if (!agentSummaries.has(key)) {
            agentSummaries.set(key, {
              agentName,
              planName,
              totalTransactions: 0,
              totalGrossCommission: 0,
              totalDeductions: 0,
              totalNetCommission: 0,
              averageCommissionPerDeal: 0,
              transactions: [],
            });
          }

          const summary = agentSummaries.get(key)!;
          summary.totalTransactions += 1;
          summary.totalGrossCommission += agentCommission;
          summary.totalDeductions += deductions;
          summary.totalNetCommission += netCommission;
          summary.transactions.push({
            loopName: transaction.loopName,
            salePrice: transaction.salePrice,
            commission: agentCommission,
            deductions,
            net: netCommission,
            closingDate: transaction.closingDate,
            status: transaction.loopStatus,
          });
        }
      }

      // Calculate averages
      const reportAgents = Array.from(agentSummaries.values())
        .map(agent => ({
          ...agent,
          averageCommissionPerDeal:
            agent.totalTransactions > 0
              ? agent.totalNetCommission / agent.totalTransactions
              : 0,
        }))
        .sort((a, b) => b.totalNetCommission - a.totalNetCommission);

      setAgents(reportAgents);
      setFilteredAgents(reportAgents);
      setSelectedAgent('all');
    } catch (error) {
      console.error('Error generating net commission report:', error);
      setAgents([]);
      setFilteredAgents([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasData, allRecords, agentAssignments, commissionPlans, dateRange]);

  const handleAgentFilterChange = (agentName: string) => {
    setSelectedAgent(agentName);
    if (agentName === 'all') {
      setFilteredAgents(agents);
    } else {
      setFilteredAgents(agents.filter(a => a.agentName === agentName));
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    // TODO: Implement email functionality
    alert('Email functionality coming soon!');
  };

  const handleExport = () => {
    // Generate CSV
    const headers = ['Agent Name', 'Plan Name', 'Total Transactions', 'Gross Commission', 'Deductions', 'Net Commission', 'Avg per Deal'];
    const rows = filteredAgents.map(agent => [
      agent.agentName,
      agent.planName,
      agent.totalTransactions,
      agent.totalGrossCommission.toFixed(2),
      agent.totalDeductions.toFixed(2),
      agent.totalNetCommission.toFixed(2),
      agent.averageCommissionPerDeal.toFixed(2),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `net-commission-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    setLocation('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Net Commission Report
              </h1>
              <p className="text-xs text-foreground hidden sm:block">
                {hasData ? `${filteredAgents.length} of ${agents.length} agents • ${allRecords.length} transactions` : 'No data available'}
              </p>
            </div>
          </div>

          {/* Agent Filter Dropdown */}
          {hasData && agents.length > 0 && (
            <div className="flex items-center gap-2 mr-4">
              <label className="text-sm font-medium text-foreground hidden sm:block">Filter:</label>
              <Select value={selectedAgent} onValueChange={handleAgentFilterChange}>
                <SelectTrigger className="w-40 hidden sm:flex">
                  <SelectValue placeholder="Select agent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Agents ({agents.length})</SelectItem>
                  {agents.map(agent => (
                    <SelectItem key={agent.agentName} value={agent.agentName}>
                      {agent.agentName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {hasData && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="hidden sm:flex"
                  title="Print report"
                >
                  <Printer className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmail}
                  className="hidden sm:flex"
                  title="Email report"
                >
                  <Mail className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="hidden sm:flex"
                  title="Export as CSV"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {!hasData ? (
          <Card className="p-12 text-center border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Data Available
            </h2>
            <p className="text-muted-foreground mb-6">
              Please upload a CSV file or load demo data to view the net commission report.
            </p>
            <Button onClick={handleClose}>
              Go Back to Dashboard
            </Button>
          </Card>
        ) : isLoading ? (
          <Card className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground mt-4">Generating report...</p>
          </Card>
        ) : filteredAgents.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No Agents Found
            </h2>
            <p className="text-muted-foreground">
              No agents match the selected filter. Try adjusting your filters.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Agents</p>
                <p className="text-2xl font-bold text-foreground mt-2">{filteredAgents.length}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Transactions</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {filteredAgents.reduce((sum, a) => sum + a.totalTransactions, 0)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Gross Commission</p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  ${filteredAgents.reduce((sum, a) => sum + a.totalGrossCommission, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase">Total Net Commission</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  ${filteredAgents.reduce((sum, a) => sum + a.totalNetCommission, 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </Card>
            </div>

            {/* Report Table */}
            <NetCommissionReport agents={filteredAgents} onAgentClick={(name) => openAgent(name, allRecords, agentMetrics)} />
          </div>
        )}
      </main>
      <AgentDetailModal target={agentTarget} onClose={closeAgent} />
    </div>
  );
}
