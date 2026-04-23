/**
 * Connection Status Indicator
 * 
 * Displays Dotloop connection status with options to disconnect/reconnect
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Link2, Unlink2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export function ConnectionStatusIndicator() {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get connection status with real-time auto-refresh every 30 seconds
  const { data: status, isLoading, refetch } = trpc.connectionStatus.getStatus.useQuery(undefined, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Get sync status for additional context
  const { data: syncStatus } = trpc.syncHistory.getSyncStatus.useQuery(undefined, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Disconnect mutation
  const disconnectMutation = trpc.connectionStatus.disconnect.useMutation({
    onSuccess: () => {
      setShowDisconnectDialog(false);
      refetch();
    },
  });

  // Get reconnect URL
  const { data: reconnectData } = trpc.connectionStatus.getReconnectUrl.useQuery();

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const handleReconnect = () => {
    if (reconnectData?.url) {
      window.location.href = reconnectData.url;
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 bg-gray-400 rounded-full animate-pulse" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        {status.isConnected ? (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Connected
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title="Refresh connection status"
              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDisconnectDialog(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Unlink2 className="w-4 h-4 mr-1" />
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Not Connected
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReconnectDialog(true)}
              className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
            >
              <Link2 className="w-4 h-4 mr-1" />
              Connect
            </Button>
          </>
        )}
      </div>

      {/* Connection Status Info */}
      {status.isConnected && syncStatus && (
        <div className="text-xs text-muted-foreground mt-2">
          {syncStatus.lastSyncTime ? (
            <>
              Last sync: {new Date(syncStatus.lastSyncTime).toLocaleString()}
            </>
          ) : (
            'Never synced'
          )}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Dotloop?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your Dotloop account. You can reconnect anytime. CSV uploads will still work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnectMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reconnect Confirmation Dialog */}
      <AlertDialog open={showReconnectDialog} onOpenChange={setShowReconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reconnect to Dotloop?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be redirected to Dotloop to authorize the connection. Your data will sync automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReconnect}
              className="bg-cyan-600 hover:bg-cyan-700"
            >
              Reconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
