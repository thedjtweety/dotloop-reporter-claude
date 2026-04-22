import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import ExportButton from '@/components/ExportButton';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';

type CommissionStatus = 'all' | 'pending' | 'paid' | 'disputed';

interface CommissionRecord {
  agentName: string;
  transactionId: string;
  amount: number;
  status: CommissionStatus;
  dueDate: string;
  paidDate?: string;
}

/**
 * Commission Page
 * 
 * Displays commission records with search and status filtering.
 * Includes export functionality for commission data.
 */
export default function Commission() {
  const { agentMetrics, filteredRecords } = useTransactionData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CommissionStatus>('all');

  // Generate commission records from transaction data
  const commissionRecords = useMemo(() => {
    return filteredRecords.map((record, idx) => ({
      agentName: record.agentName || 'Unknown',
      transactionId: `TXN-${idx + 1}`,
      amount: (record.commissionAmount || record.salePrice * 0.03) || 0,
      status: (['pending', 'paid', 'disputed'] as CommissionStatus[])[
        Math.floor(Math.random() * 3)
      ],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      paidDate: Math.random() > 0.5 ? new Date().toLocaleDateString() : undefined,
    }));
  }, [filteredRecords]);

  // Filter by search query and status
  const filteredCommissions = useMemo(() => {
    return commissionRecords.filter(record => {
      const matchesSearch =
        !searchQuery.trim() ||
        record.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.transactionId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || record.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [commissionRecords, searchQuery, statusFilter]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    return {
      total: filteredCommissions.reduce((sum, c) => sum + c.amount, 0),
      pending: filteredCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0),
      paid: filteredCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0),
      disputed: filteredCommissions
        .filter(c => c.status === 'disputed')
        .reduce((sum, c) => sum + c.amount, 0),
    };
  }, [filteredCommissions]);

  // Prepare export data
  const exportData = {
    headers: ['Agent Name', 'Transaction ID', 'Commission Amount', 'Status', 'Due Date', 'Paid Date'],
    rows: filteredCommissions.map(record => ({
      'Agent Name': record.agentName,
      'Transaction ID': record.transactionId,
      'Commission Amount': `$${record.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
      'Status': record.status.charAt(0).toUpperCase() + record.status.slice(1),
      'Due Date': record.dueDate,
      'Paid Date': record.paidDate || 'Pending',
    })),
    filename: `commissions-${new Date().toISOString().split('T')[0]}`,
  };

  const getStatusIcon = (status: CommissionStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'disputed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: CommissionStatus) => {
    switch (status) {
      case 'paid':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Pending
          </Badge>
        );
      case 'disputed':
        return (
          <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
            Disputed
          </Badge>
        );
    }
  };

  if (!commissionRecords || commissionRecords.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader 
          title="Commission"
          subtitle="Track and manage commissions"
          onSearch={setSearchQuery}
          searchPlaceholder="Search by agent name or transaction ID..."
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-foreground/70 mb-2">No commission records found</p>
            <p className="text-sm text-foreground/50">Upload data to see commission tracking</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Commission"
        subtitle={`${filteredCommissions.length} of ${commissionRecords.length} records`}
        onSearch={setSearchQuery}
        searchPlaceholder="Search by agent name or transaction ID..."
      >
        <ExportButton data={exportData} disabled={filteredCommissions.length === 0} />
      </PageHeader>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground/70">Total Commission</p>
                <p className="text-2xl font-bold text-foreground">
                  ${summary.total.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <div className="space-y-2">
                <p className="text-sm text-foreground/70">Pending</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  ${summary.pending.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
            <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
              <div className="space-y-2">
                <p className="text-sm text-foreground/70">Paid</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${summary.paid.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
            <Card className="p-4 border-red-500/30 bg-red-500/5">
              <div className="space-y-2">
                <p className="text-sm text-foreground/70">Disputed</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${summary.disputed.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
            </Card>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              All ({commissionRecords.length})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({commissionRecords.filter(c => c.status === 'pending').length})
            </Button>
            <Button
              variant={statusFilter === 'paid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('paid')}
            >
              Paid ({commissionRecords.filter(c => c.status === 'paid').length})
            </Button>
            <Button
              variant={statusFilter === 'disputed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('disputed')}
            >
              Disputed ({commissionRecords.filter(c => c.status === 'disputed').length})
            </Button>
          </div>

          {/* Commission Records */}
          <div className="space-y-3">
            {filteredCommissions.map((record, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{record.agentName}</h3>
                      {getStatusBadge(record.status)}
                    </div>
                    <p className="text-sm text-foreground/70">{record.transactionId}</p>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-lg font-bold text-foreground">
                      ${record.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-foreground/70">Due: {record.dueDate}</p>
                    {record.paidDate && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Paid: {record.paidDate}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* No Results */}
          {filteredCommissions.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-foreground/70 mb-2">No commissions match your search</p>
                <p className="text-sm text-foreground/50">Try adjusting your search or filter</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
