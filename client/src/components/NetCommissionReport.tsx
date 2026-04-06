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
 * - Bulk transaction selection and actions
 */

import { useState, useRef } from 'react';
import { Download, Mail, Printer, Filter, X, ChevronDown, Eye, Tag, Share2 } from 'lucide-react';
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
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [exportTemplate, setExportTemplate] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set([
    'agentName', 'loopName', 'closingDate', 'salePrice', 'grossCommission', 'deductions', 'netCommission'
  ]));
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

  // Toggle transaction selection
  const toggleTransactionSelection = (agentName: string, loopName: string) => {
    const key = `${agentName}|${loopName}`;
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedTransactions(newSelected);
  };

  // Select all transactions for an agent
  const selectAllAgentTransactions = (agentName: string, transactions: CommissionTransaction[]) => {
    const newSelected = new Set(selectedTransactions);
    transactions.forEach((t) => {
      const key = `${agentName}|${t.loopName}`;
      newSelected.add(key);
    });
    setSelectedTransactions(newSelected);
  };

  // Deselect all transactions for an agent
  const deselectAllAgentTransactions = (agentName: string, transactions: CommissionTransaction[]) => {
    const newSelected = new Set(selectedTransactions);
    transactions.forEach((t) => {
      const key = `${agentName}|${t.loopName}`;
      newSelected.delete(key);
    });
    setSelectedTransactions(newSelected);
  };

  // Get selected transactions data
  const getSelectedTransactionsData = () => {
    const selected: Array<{ agent: string; transaction: CommissionTransaction }> = [];
    filteredAgents.forEach((agent) => {
      agent.transactions.forEach((transaction) => {
        const key = `${agent.agentName}|${transaction.loopName}`;
        if (selectedTransactions.has(key)) {
          selected.push({ agent: agent.agentName, transaction });
        }
      });
    });
    return selected;
  };

  // Export selected transactions as CSV
  const handleExportSelectedCSV = () => {
    const selected = getSelectedTransactionsData();
    if (selected.length === 0) {
      alert('No transactions selected');
      return;
    }

    const headers = [
      'Agent Name',
      'Loop Name',
      'Closing Date',
      'Sale Price',
      'Gross Commission',
      'Deductions',
      'Net Commission',
      'Commission Rate',
    ];

    const rows = selected.map((item) => [
      item.agent,
      item.transaction.loopName,
      new Date(item.transaction.closingDate).toISOString().split('T')[0],
      (item.transaction.salePrice ?? 0).toFixed(2),
      (item.transaction.grossCommission ?? 0).toFixed(2),
      (item.transaction.deductions ?? 0).toFixed(2),
      (item.transaction.netCommission ?? 0).toFixed(2),
      ((item.transaction.commissionRate ?? 0) * 100).toFixed(2) + '%',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedTransactions(new Set());
    setBulkActionMode(false);
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
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .summary { margin: 20px 0; }
            .summary-item { display: inline-block; margin-right: 40px; }
            h2 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Net Commission Report</h1>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'Agent Name',
      'Plan',
      'Transactions',
      'Gross Commission',
      'Deductions',
      'Net Commission',
      'Avg per Deal',
    ];

    const rows = filteredAgents.map((agent) => [
      agent.agentName,
      agent.planName,
      agent.totalTransactions,
      (agent.totalGrossCommission ?? 0).toFixed(2),
      (agent.totalDeductions ?? 0).toFixed(2),
      (agent.totalNetCommission ?? 0).toFixed(2),
      (agent.averageCommissionPerDeal ?? 0).toFixed(2),
    ]);

    const totalsRow = [
      'TOTAL',
      '',
      totals.transactions,
      (totals.grossCommission ?? 0).toFixed(2),
      (totals.deductions ?? 0).toFixed(2),
      (totals.netCommission ?? 0).toFixed(2),
      totals.transactions > 0 ? ((totals.netCommission ?? 0) / totals.transactions).toFixed(2) : '0.00',
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

      {/* Bulk Actions Toolbar */}
      {bulkActionMode && selectedTransactions.size > 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">
                {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSelectedCSV}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert('Tag functionality coming soon')}
                className="gap-2"
              >
                <Tag className="h-4 w-4" />
                Tag
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => alert('Reassign functionality coming soon')}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Reassign
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSelections}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

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
                          <th className="px-4 py-3 text-left font-semibold text-foreground w-8">
                            <input
                              type="checkbox"
                              checked={agent.transactions.every((t) =>
                                selectedTransactions.has(`${agent.agentName}|${t.loopName}`)
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  selectAllAgentTransactions(agent.agentName, agent.transactions);
                                  setBulkActionMode(true);
                                } else {
                                  deselectAllAgentTransactions(agent.agentName, agent.transactions);
                                }
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </th>
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
                        {agent.transactions.map((transaction, idx) => {
                          const isSelected = selectedTransactions.has(`${agent.agentName}|${transaction.loopName}`);
                          return (
                            <tr
                              key={idx}
                              className={`border-b border-border hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors ${
                                isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <td className="px-4 py-3 text-foreground w-8">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    toggleTransactionSelection(agent.agentName, transaction.loopName);
                                    setBulkActionMode(true);
                                  }}
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              <td 
                                className="px-4 py-3 text-foreground cursor-pointer" 
                                onClick={() => setSelectedTransaction({ agent: agent.agentName, transaction })}
                              >
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Email Report</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-foreground hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Input
              type="email"
              placeholder="Enter email address"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              className="mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  alert(`Email would be sent to: ${emailAddress}`);
                  setShowEmailModal(false);
                  setEmailAddress('');
                }}
                className="flex-1"
              >
                Send
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 p-6 border-b border-border bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedTransaction.transaction.loopName}
                </h3>
                <p className="text-sm text-foreground">
                  Agent: {selectedTransaction.agent}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-foreground hover:text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground">Closing Date</p>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(selectedTransaction.transaction.closingDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-foreground">Status</p>
                  <p className="text-lg font-semibold text-foreground">
                    {selectedTransaction.transaction.status}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-semibold text-foreground mb-4">Commission Breakdown</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Sale Price</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(selectedTransaction.transaction.salePrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Commission Rate</span>
                    <span className="font-semibold text-foreground">
                      {formatPercentage(selectedTransaction.transaction.commissionRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <span className="text-foreground">Gross Commission</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(selectedTransaction.transaction.grossCommission)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">Deductions</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(selectedTransaction.transaction.deductions)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <span className="font-semibold text-foreground">Net Commission</span>
                    <span className="font-bold text-lg text-primary">
                      {formatCurrency(selectedTransaction.transaction.netCommission)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
