import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Trash2, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function DotloopConnectionStatus() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get connection status
  const connectionStatus = trpc.dotloopOAuth.getConnectionStatus.useQuery();
  const syncStatus = trpc.dotloopDataSync.getSyncStatus.useQuery();
  const syncStats = trpc.dotloopDataSync.getSyncStatistics.useQuery();

  // Mutations
  const revokeAccessMutation = trpc.dotloopOAuth.revokeAccess.useMutation();
  const syncTransactionsMutation = trpc.dotloopDataSync.syncTransactionsFromDotloop.useMutation();

  const handleRevoke = async () => {
    if (!confirm('Are you sure you want to disconnect from Dotloop?')) return;

    try {
      await revokeAccessMutation.mutateAsync({
        ipAddress: '0.0.0.0',
      });
      connectionStatus.refetch();
      syncStatus.refetch();
    } catch (error) {
      console.error('Failed to revoke access:', error);
    }
  };

  const handleSync = async () => {
    try {
      setIsRefreshing(true);
      await syncTransactionsMutation.mutateAsync({
        limit: 100,
      });
      syncStatus.refetch();
      syncStats.refetch();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!connectionStatus.data?.connected) {
    return null;
  }

  const status = connectionStatus.data;
  const sync = syncStatus.data;
  const stats = syncStats.data?.statistics;

  return (
    <div className="space-y-4">
      {/* Connection Status Card */}
      <Card className="p-4 border-l-4 border-l-green-500">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Connected to Dotloop</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {sync?.accountEmail || 'Dotloop Account'}
              </p>
              {status.expiresAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Token expires: {new Date(status.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRevoke}
            disabled={revokeAccessMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Sync Statistics */}
      {stats && (
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-3">Sync Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalTransactions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">From Dotloop</p>
              <p className="text-2xl font-bold text-green-600">{stats.dotloopTransactions}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-lg font-semibold text-foreground">
                ${(stats.totalVolume / 1000000).toFixed(1)}M
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Closed Deals</p>
              <p className="text-lg font-semibold text-foreground">{stats.closedTransactions}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Sync Actions */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-foreground">Data Sync</h4>
            {sync?.lastSync && (
              <p className="text-sm text-muted-foreground mt-1">
                Last synced: {new Date(sync.lastSync).toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={handleSync}
            disabled={isRefreshing || syncTransactionsMutation.isPending}
            size="sm"
          >
            {isRefreshing || syncTransactionsMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Info Message */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          Your Dotloop transactions are automatically synced. Click "Sync Now" to fetch the latest data.
        </p>
      </div>
    </div>
  );
}
