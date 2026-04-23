/**
 * Sync History & Logs Page
 * 
 * Displays the history of all Dotloop sync operations with detailed logs
 */

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Clock, Download, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SyncLog {
  id: string;
  timestamp: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  transactionsFetched: number;
  transactionsCreated: number;
  transactionsUpdated: number;
  duration: number;
  error?: string;
  details?: string | null;
}

export default function SyncHistoryAndLogs() {
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<SyncLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch sync history from backend
  const { data: syncHistory, refetch } = trpc.syncHistory.getLogs.useQuery(undefined, {
    enabled: true,
  });

  // Manual sync mutation
  const manualSyncMutation = trpc.syncHistory.triggerManualSync.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  useEffect(() => {
    if (syncHistory) {
      setSyncLogs(syncHistory);
    }
  }, [syncHistory]);

  const handleManualSync = async () => {
    setIsLoading(true);
    try {
      await manualSyncMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Running
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sync History & Logs
          </h1>
          <p className="text-foreground/70 mt-2">
            View all Dotloop synchronization operations and their results
          </p>
        </div>
        <Button
          onClick={handleManualSync}
          disabled={isLoading || manualSyncMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Syncing...' : 'Manual Sync'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Total Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{syncLogs.length}</div>
            <p className="text-xs text-foreground/70 mt-1">All-time sync operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {syncLogs.filter(l => l.status === 'completed').length}
            </div>
            <p className="text-xs text-foreground/70 mt-1">
              {syncLogs.length > 0
                ? `${((syncLogs.filter(l => l.status === 'completed').length / syncLogs.length) * 100).toFixed(0)}% success rate`
                : 'No syncs yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {syncLogs.filter(l => l.status === 'failed').length}
            </div>
            <p className="text-xs text-foreground/70 mt-1">Sync errors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-foreground">Total Synced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {syncLogs
                .filter(l => l.status === 'completed')
                .reduce((sum, l) => sum + l.transactionsFetched, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-foreground/70 mt-1">Transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Operations</CardTitle>
          <CardDescription>
            Complete history of all Dotloop synchronization operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Fetched</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-foreground/70">
                      No sync history available. Click "Manual Sync" to start.
                    </TableCell>
                  </TableRow>
                ) : (
                  syncLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-accent/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">
                        <div className="font-medium">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                        <div className="text-xs text-foreground/70">
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-foreground font-medium">
                        {log.transactionsFetched}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        {log.transactionsCreated}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {log.transactionsUpdated}
                      </TableCell>
                      <TableCell className="text-right text-foreground">
                        {formatDuration(log.duration)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync Operation Details</DialogTitle>
            <DialogDescription>
              {selectedLog && new Date(selectedLog.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6">
              {/* Status Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-foreground/70 mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedLog.status)}
                    {getStatusBadge(selectedLog.status)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-foreground/70 mb-1">Duration</p>
                  <p className="font-medium text-foreground">{formatDuration(selectedLog.duration)}</p>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Transaction Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
                    <p className="text-xs text-foreground/70">Fetched</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedLog.transactionsFetched}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg dark:bg-emerald-950">
                    <p className="text-xs text-foreground/70">Created</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedLog.transactionsCreated}
                    </p>
                  </div>
                  <div className="p-3 bg-cyan-50 rounded-lg dark:bg-cyan-950">
                    <p className="text-xs text-foreground/70">Updated</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {selectedLog.transactionsUpdated}
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {selectedLog.error && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Error Details</h4>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 font-mono">
                      {selectedLog.error}
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {selectedLog.details && (
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">Additional Details</h4>
                  <div className="p-3 bg-slate-50 rounded-lg dark:bg-slate-900">
                    <p className="text-sm text-foreground font-mono whitespace-pre-wrap">
                      {selectedLog.details}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const csv = [
                      ['Sync Operation Details'],
                      ['Timestamp', new Date(selectedLog.timestamp).toLocaleString()],
                      ['Status', selectedLog.status],
                      ['Duration', formatDuration(selectedLog.duration)],
                      ['Transactions Fetched', selectedLog.transactionsFetched],
                      ['Transactions Created', selectedLog.transactionsCreated],
                      ['Transactions Updated', selectedLog.transactionsUpdated],
                      selectedLog.error ? ['Error', selectedLog.error] : null,
                    ]
                      .filter(Boolean)
                      .map(row => (row as string[]).join(','))
                      .join('\n');

                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sync-log-${new Date(selectedLog.timestamp).getTime()}.csv`;
                    a.click();
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
