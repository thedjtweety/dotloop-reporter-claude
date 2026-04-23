import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, RefreshCw, Zap } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface SyncStatus {
  lastSyncTime?: string;
  transactionCount: number;
  syncErrors: string[];
  isSyncing: boolean;
  lastSyncDuration?: number;
}

export function SyncStatusDashboard() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    transactionCount: 0,
    syncErrors: [],
    isSyncing: false,
  });

  // Fetch sync status
  const { data: lastSync } = trpc.dotloopDataSync.getSyncStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Manual sync mutation
  const { mutate: manualSync, isPending: isSyncing } = trpc.dotloopDataSync.triggerManualSync.useMutation({
    onSuccess: (result: any) => {
      setSyncStatus({
        lastSyncTime: result.lastSyncTime,
        transactionCount: result.transactionsFetched,
        syncErrors: result.errors,
        isSyncing: false,
        lastSyncDuration: result.duration,
      });
    },
    onError: (error: any) => {
      setSyncStatus(prev => ({
        ...prev,
        syncErrors: [error.message],
        isSyncing: false,
      }));
    },
  });

  useEffect(() => {
    if (lastSync && lastSync.connected) {
      setSyncStatus({
        lastSyncTime: lastSync.lastSync || undefined,
        transactionCount: lastSync.dotloopTransactions || 0,
        syncErrors: [],
        isSyncing: false,
      });
    }
  }, [lastSync]);

  const handleManualSync = () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    manualSync();
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Last Sync */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Last Sync</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {formatTime(syncStatus.lastSyncTime)}
            </div>
            {syncStatus.lastSyncDuration && (
              <div className="text-xs text-slate-500">
                Duration: {(syncStatus.lastSyncDuration / 1000).toFixed(2)}s
              </div>
            )}
          </div>

          {/* Transaction Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Zap className="w-4 h-4" />
              <span>Transactions</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              {syncStatus.transactionCount}
            </div>
            <div className="text-xs text-slate-500">
              synced from Dotloop
            </div>
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              {syncStatus.isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : syncStatus.syncErrors.length === 0 ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span>Status</span>
            </div>
            <div className={`text-2xl font-bold ${
              syncStatus.isSyncing ? 'text-blue-400' :
              syncStatus.syncErrors.length === 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {syncStatus.isSyncing ? 'Syncing...' :
               syncStatus.syncErrors.length === 0 ? 'Healthy' : 'Errors'}
            </div>
          </div>
        </div>
      </Card>

      {/* Errors */}
      {syncStatus.syncErrors && syncStatus.syncErrors.length > 0 && (
        <Card className="p-4 bg-red-950/20 border-red-900/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-300 mb-2">Sync Errors</h3>
              <ul className="space-y-1">
                {syncStatus.syncErrors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-200">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Manual Sync Button */}
      <Button
        onClick={handleManualSync}
        disabled={isSyncing || syncStatus.isSyncing}
        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-2 rounded-lg transition-all"
      >
        {isSyncing || syncStatus.isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Manual Sync Now
          </>
        )}
      </Button>

      {/* Info */}
      <Card className="p-4 bg-slate-900/50 border-slate-700">
        <p className="text-sm text-slate-400">
          💡 <strong>Tip:</strong> Transactions are automatically synced every night at midnight. 
          Use the button above to manually trigger a sync anytime.
        </p>
      </Card>
    </div>
  );
}
