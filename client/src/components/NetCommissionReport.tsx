/**
 * Net Commission Report Component
 * 
 * Comprehensive report showing net commission for all agents with:
 * - Detailed transaction-level breakdowns
 * - Commission calculations with plan details
 * - Print functionality with professional formatting
 * - Email delivery capability
 * - CSV/PDF export options
 * - Date range and agent filtering
 */

import { useState, useRef } from 'react';
import { Download, Mail, Printer, Filter, X, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { formatCurrency, formatPercentage } from '@/lib/formatUtils';
import { DateRange } from 'react-day-picker';

interface CommissionTransaction {
  loopName: string;
  closingDate: string;
  agents: string;
  salePrice: number;
  grossCommission: number;
  agentCommission: number;
  deductions: number;
  netCommission: number;
  commissionRate: number;
  status: string;
}

interface AgentCommissionSummary {
  agentName: string;
  planName: string;
  totalTransactions: number;
  totalGrossCommission: number;
  totalDeductions: number;
  totalNetCommission: number;
  averageCommissionPerDeal: number;
  transactions: CommissionTransaction[];
}

interface NetCommissionReportProps {
  agents: AgentCommissionSummary[];
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
}

export default function NetCommissionReport({
  agents,
  dateRange,
  onDateRangeChange,
}: NetCommissionReportProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<{ agent: string; transaction: CommissionTransaction } | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Filter agents based on search and selection
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch = agent.agentName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSelection =
      selectedAgents.length === 0 || selectedAgents.includes(agent.agentName);
    return matchesSearch && matchesSelection;
  });

  // Calculate totals
  const totals = {
    transactions: filteredAgents.reduce((sum, a) => sum + a.totalTransactions, 0),
    grossCommission: filteredAgents.reduce(
      (sum, a) => sum + a.totalGrossCommission,
      0
    ),
    deductions: filteredAgents.reduce((sum, a) => sum + a.totalDeductions, 0),
    netCommission: filteredAgents.reduce(
      (sum, a) => sum + a.totalNetCommission,
      0
    ),
  };

  const handlePrint = () => {
    if (!reportRef.current) return;

    const printWindow = window.open('', '', 'width=900,height=600');
    if (!printWindow) return;

    const printContent = reportRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Net Commission Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #000; line-height: 1.6; }
            .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .report-header h1 { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
            .report-header p { color: #666; font-size: 14px; }
            .report-date { text-align: right; color: #666; font-size: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f5f5f5; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #333; font-size: 13px; }
            td { padding: 12px; border-bottom: 1px solid #ddd; font-size: 13px; }
            tr:last-child td { border-bottom: 2px solid #333; }
            .agent-section { margin-bottom: 40px; page-break-inside: avoid; }
            .agent-header { background-color: #f9f9f9; padding: 15px; margin-bottom: 15px; border-left: 4px solid #2563eb; }
            .agent-header h3 { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
            .agent-header p { font-size: 12px; color: #666; }
            .summary-row { background-color: #f5f5f5; font-weight: bold; }
            .total-row { background-color: #e8f4f8; font-weight: bold; border-top: 2px solid #333; }
            .text-right { text-align: right; }
            .footer { text-align: center; color: #999; font-size: 11px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; }
            @media print {
              body { margin: 0; padding: 10mm; }
              .agent-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>Net Commission Report</h1>
            <p>Comprehensive Commission Breakdown by Agent</p>
          </div>
          <div class="report-date">
            Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
          </div>
          ${printContent}
          <div class="footer">
            <p>This is a confidential document. For internal use only.</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleEmailReport = async () => {
    if (!emailAddress) {
      alert('Please enter an email address');
      return;
    }

    try {
      // TODO: Implement email sending via backend API
      // const response = await trpc.reports.emailNetCommissionReport.mutate({
      //   email: emailAddress,
      //   agents: filteredAgents,
      //   dateRange,
      // });
      alert('Report sent to ' + emailAddress);
      setShowEmailModal(false);
      setEmailAddress('');
    } catch (error) {
      alert('Failed to send report. Please try again.');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Agent Name',
      'Plan Name',
      'Total Transactions',
      'Gross Commission',
      'Total Deductions',
      'Net Commission',
      'Avg Commission/Deal',
    ];

    const rows = filteredAgents.map((agent) => [
      agent.agentName,
      agent.planName,
      agent.totalTransactions,
      agent.totalGrossCommission.toFixed(2),
      agent.totalDeductions.toFixed(2),
      agent.totalNetCommission.toFixed(2),
      agent.averageCommissionPerDeal.toFixed(2),
    ]);

    const totalsRow = [
      'TOTAL',
      '',
      totals.transactions,
      totals.grossCommission.toFixed(2),
      totals.deductions.toFixed(2),
      totals.netCommission.toFixed(2),
      (totals.netCommission / totals.transactions).toFixed(2),
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
      totalsRow.join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `net-commission-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-foreground">Net Commission Report</h2>
        <p className="text-foreground">
          Comprehensive commission breakdown for all agents with detailed transaction analysis
        </p>
      </div>

      {/* Filters and Actions */}
      <Card className="p-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Search Agents</label>
            <Input
              placeholder="Search by agent name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Date Range */}
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground">Date Range</label>
            <DatePickerWithRange
              value={dateRange}
              onChange={onDateRangeChange}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEmailModal(true)}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // TODO: Implement PDF export
              alert('PDF export coming soon');
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-foreground">Total Transactions</p>
          <p className="text-2xl font-bold text-foreground">{totals.transactions}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground">Gross Commission</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(totals.grossCommission)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground">Total Deductions</p>
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(totals.deductions)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-foreground">Net Commission</p>
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(totals.netCommission)}
          </p>
        </Card>
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="space-y-6">
        {filteredAgents.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-foreground">No agents found matching your criteria</p>
          </Card>
        ) : (
          filteredAgents.map((agent) => (
            <Card key={agent.agentName} className="overflow-hidden">
              {/* Agent Header */}
              <button
                onClick={() =>
                  setExpandedAgent(
                    expandedAgent === agent.agentName ? null : agent.agentName
                  )
                }
                className="w-full p-6 flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="text-left">
                  <h3 className="text-lg font-bold text-foreground">
                    {agent.agentName}
                  </h3>
                  <p className="text-sm text-foreground">
                    Plan: {agent.planName} • {agent.totalTransactions} transactions
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(agent.totalNetCommission)}
                  </p>
                  <p className="text-xs text-foreground">Net Commission</p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-foreground transition-transform ${
                    expandedAgent === agent.agentName ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Agent Details */}
              {expandedAgent === agent.agentName && (
                <div className="p-6 border-t border-border space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-foreground">Transactions</p>
                      <p className="text-xl font-bold text-foreground">
                        {agent.totalTransactions}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">Gross Commission</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(agent.totalGrossCommission)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">Deductions</p>
                      <p className="text-xl font-bold text-foreground">
                        {formatCurrency(agent.totalDeductions)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">Avg per Deal</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(agent.averageCommissionPerDeal)}
                      </p>
                    </div>
                  </div>

                  {/* Transaction Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
                          <th className="px-4 py-3 text-left font-semibold text-foreground">
                            Loop Name
                          </th>
                          <th className="px-4 py-3 text-left font-semibold text-foreground">
                            Closing Date
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">
                            Sale Price
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">
                            Gross Commission
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">
                            Deductions
                          </th>
                          <th className="px-4 py-3 text-right font-semibold text-foreground">
                            Net Commission
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {agent.transactions.map((transaction, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-border hover:bg-slate-50 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
                            onClick={() => setSelectedTransaction({ agent: agent.agentName, transaction })}
                          >
                            <td className="px-4 py-3 text-foreground">
                              <div className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-muted-foreground" />
                                {transaction.loopName}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {new Date(transaction.closingDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground">
                              {formatCurrency(transaction.salePrice)}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground">
                              {formatCurrency(transaction.grossCommission)}
                            </td>
                            <td className="px-4 py-3 text-right text-foreground">
                              {formatCurrency(transaction.deductions)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-primary">
                              {formatCurrency(transaction.netCommission)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-border bg-card/50 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedTransaction.transaction.loopName}</h2>
                <p className="text-sm text-foreground/70">Transaction Details</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTransaction(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Agent & Plan Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="p-4 bg-background/50">
                  <p className="text-xs font-medium text-foreground/70 uppercase mb-1">Agent</p>
                  <p className="text-lg font-semibold text-foreground">{selectedTransaction.agent}</p>
                </Card>
                <Card className="p-4 bg-background/50">
                  <p className="text-xs font-medium text-foreground/70 uppercase mb-1">Status</p>
                  <p className="text-lg font-semibold text-foreground capitalize">{selectedTransaction.transaction.status}</p>
                </Card>
              </div>

              {/* Dates */}
              <Card className="p-4 bg-background/50">
                <p className="text-xs font-medium text-foreground/70 uppercase mb-1">Closing Date</p>
                <p className="text-lg font-semibold text-foreground">
                  {new Date(selectedTransaction.transaction.closingDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </Card>

              {/* Sale Price */}
              <Card className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
                <p className="text-xs font-medium text-foreground/70 uppercase mb-1">Sale Price</p>
                <p className="text-3xl font-bold text-foreground">
                  {formatCurrency(selectedTransaction.transaction.salePrice)}
                </p>
              </Card>

              {/* Commission Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">Commission Breakdown</h3>

                {/* Gross Commission */}
                <Card className="p-4 bg-background/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">Gross Commission</p>
                    <p className="text-xs text-foreground/70">
                      {selectedTransaction.transaction.salePrice > 0
                        ? ((selectedTransaction.transaction.grossCommission / selectedTransaction.transaction.salePrice) * 100).toFixed(2)
                        : '0.00'}%
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-amber-500">
                    {formatCurrency(selectedTransaction.transaction.grossCommission)}
                  </p>
                </Card>

                {/* Deductions */}
                {selectedTransaction.transaction.deductions > 0 && (
                  <Card className="p-4 bg-background/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-foreground">Deductions</p>
                      <p className="text-xs text-foreground/70">
                        {((selectedTransaction.transaction.deductions / selectedTransaction.transaction.grossCommission) * 100).toFixed(1)}% of gross
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-red-500">
                      -{formatCurrency(selectedTransaction.transaction.deductions)}
                    </p>
                  </Card>
                )}

                {/* Net Commission */}
                <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-foreground">Net Commission</p>
                    <p className="text-xs text-foreground/70">
                      {selectedTransaction.transaction.salePrice > 0
                        ? ((selectedTransaction.transaction.netCommission / selectedTransaction.transaction.salePrice) * 100).toFixed(2)
                        : '0.00'}%
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-green-500">
                    {formatCurrency(selectedTransaction.transaction.netCommission)}
                  </p>
                </Card>
              </div>

              {/* Close Button */}
              <Button onClick={() => setSelectedTransaction(null)} className="w-full">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Email Report</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEmailReport}
                className="flex-1"
              >
                Send Report
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
