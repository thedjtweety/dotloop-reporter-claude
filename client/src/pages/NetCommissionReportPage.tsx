/**
 * Net Commission Report Page
 * 
 * Main page for viewing, filtering, printing, and emailing net commission reports
 * for all agents with detailed transaction-level breakdowns
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Download, Mail, Printer, X } from 'lucide-react';
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
import { useAuth } from '@/_core/hooks/useAuth';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { calculateAgentMetrics } from '@/lib/csvParser';

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
  const { isAuthenticated } = useAuth();
  const { allRecords, agentMetrics, commissionPlans, agentAssignments, hasData } = useTransactionData();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [agents, setAgents] = useState<AgentCommissionSummary[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<AgentCommissionSummary[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Generate report when data is available
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
      return;
    }

    if (!hasData) {
      setAgents([]);
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
        const gciPerAgent = totalGCI / agents.length;

        for (const agentName of agents) {
          // Find agent assignment
          const assignment = agentAssignments.find(a => a.agentName === agentName);
          const planName = assignment?.planName || 'No Plan Assigned';

          // Calculate agent commission
          let agentCommission = gciPerAgent;
          let deductions = 0;

          if (assignment) {
            // Find the plan details
            const plan = commissionPlans.find(p => p.id === assignment.planId);
            if (plan) {
              // Apply split percentage
              agentCommission = gciPerAgent * (plan.splitPercentage / 100);

              // Apply deductions
              if (plan.deductions && plan.deductions.length > 0) {
                for (const deduction of plan.deductions) {
                  if (deduction.type === 'fixed') {
                    deductions += deduction.amount;
                  } else if (deduction.type === 'percentage') {
                    deductions += gciPerAgent * (deduction.amount / 100);
                  }
                }
              }
            }
          }

          // Add or update agent summary
          if (!agentSummaries.has(agentName)) {
            agentSummaries.set(agentName, {
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

          const summary = agentSummaries.get(agentName)!;
          summary.totalTransactions += 1;
          summary.totalGrossCommission += gciPerAgent;
          summary.totalDeductions += deductions;
          summary.totalNetCommission += agentCommission - deductions;
          summary.transactions.push({
            ...transaction,
            agentCommission,
            deductions,
            netCommission: agentCommission - deductions,
          });
        }
      }

      // Convert map to sorted array
      const reportAgents = Array.from(agentSummaries.values())
        .map(summary => ({
          ...summary,
          averageCommissionPerDeal: summary.totalTransactions > 0 
            ? summary.totalNetCommission / summary.totalTransactions 
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
  }, [isAuthenticated, setLocation, hasData, allRecords, agentAssignments, commissionPlans, dateRange]);

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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-foreground mb-4">Please log in to view the Net Commission Report</p>
          <Button onClick={() => setLocation('/')}>
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

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
                  className="hidden sm:flex gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmail}
                  className="hidden sm:flex gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="hidden sm:flex gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="ml-2"
              title="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container py-8">
        {!hasData ? (
          <Card className="p-8 text-center">
            <p className="text-foreground mb-4">No data available. Please upload a CSV file first.</p>
            <Button onClick={() => setLocation('/')}>
              Go to Dashboard
            </Button>
          </Card>
        ) : (
          <NetCommissionReport
            agents={agents}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
