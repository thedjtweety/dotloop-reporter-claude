import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FullScreenModal from '@/components/FullScreenModal';
import { Link2, CheckCircle2, Shield, Zap, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useSearchParams } from 'wouter';

interface ConnectDotloopProps {
  variant?: 'button' | 'card';
  onConnect?: () => void;
  onSuccess?: () => void;
}

export default function ConnectDotloop({ variant = 'button', onConnect, onSuccess }: ConnectDotloopProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Get authorization URL
  const getAuthUrlQuery = trpc.dotloopOAuth.getAuthorizationUrl.useQuery(
    { state: undefined },
    { enabled: false }
  );

  // Handle OAuth callback
  const handleCallbackMutation = trpc.dotloopOAuth.handleCallback.useMutation();

  // Check for OAuth callback on mount
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(r => r.json())
        .then(d => d.ip)
        .catch(() => '0.0.0.0');

      const result = await handleCallbackMutation.mutateAsync({
        code,
        state,
        ipAddress,
        userAgent: navigator.userAgent,
      });

      if (result.success) {
        setShowDialog(false);
        onSuccess?.();
        // Refresh the page to show new data
        window.location.href = '/';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to Dotloop';
      setError(errorMessage);
      console.error('[ConnectDotloop] OAuth callback error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get authorization URL
      const { data } = await getAuthUrlQuery.refetch();
      
      if (data?.url) {
        // Redirect to Dotloop OAuth
        window.location.href = data.url;
      } else {
        setError('Failed to get authorization URL');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate OAuth flow';
      setError(errorMessage);
      console.error('[ConnectDotloop] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    setError(null);
  };

  const handleClose = () => {
    setShowDialog(false);
    setError(null);
  };

  const modalContent = (
    <div className="max-w-2xl mx-auto py-12">
      <div className="space-y-6">
        {error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-medium">Error: {error}</p>
            <Button 
              onClick={handleClose}
              variant="outline" 
              size="sm" 
              className="mt-4"
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <p className="text-lg text-muted-foreground">
              Click the button below to securely connect your Dotloop account. You'll be redirected to Dotloop to authorize access to your transaction data.
            </p>
            <div className="bg-muted p-6 rounded-lg space-y-4">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Automatic Sync</p>
                  <p className="text-sm text-muted-foreground">Your data updates every night automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Secure Connection</p>
                  <p className="text-sm text-muted-foreground">Read-only access to your Dotloop data</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Zap className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-foreground">Real-time Updates</p>
                  <p className="text-sm text-muted-foreground">Reports reflect your latest transactions</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleConnect}
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5 mr-2" />
                  Connect to Dotloop
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <>
        <Card className="p-8 border-dashed border-2 border-border bg-card/50 hover:bg-card/80 transition-colors">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-foreground">
                Connect to Dotloop
              </h3>
              <p className="text-foreground/70 text-base max-w-sm">
                Automatically sync your transaction data in real-time. No more manual CSV uploads—your reports update automatically every night.
              </p>
            </div>
            <div className="w-full space-y-3 py-4">
              <div className="flex items-center justify-center gap-3 text-sm">
                <CheckCircle2 className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">Automatic sync every night</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Shield className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">Secure read-only access</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-sm">
                <Zap className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-foreground">Real-time updates</span>
              </div>
            </div>
            <Button 
              onClick={handleOpenDialog}
              size="lg" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5 mr-2" />
                  Login to Dotloop
                </>
              )}
            </Button>
          </div>
        </Card>

        <FullScreenModal
          isOpen={showDialog}
          onClose={handleClose}
          title="Connect to Dotloop"
          headerActions={
            <Button onClick={handleClose} variant="outline">Close</Button>
          }
        >
          {modalContent}
        </FullScreenModal>
      </>
    );
  }

  return (
    <>
      <Button 
        onClick={handleOpenDialog}
        variant="outline" 
        className="gap-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            Login to Dotloop
          </>
        )}
      </Button>

      <FullScreenModal
        isOpen={showDialog}
        onClose={handleClose}
        title="Connect to Dotloop"
        headerActions={
          <Button onClick={handleClose} variant="outline">Close</Button>
        }
      >
        {modalContent}
      </FullScreenModal>
    </>
  );
}
