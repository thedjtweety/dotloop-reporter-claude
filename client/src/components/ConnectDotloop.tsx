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
        <Card className="relative overflow-hidden p-0 border-dashed border-2 border-border hover:border-border/80 transition-all duration-300" style={{
          backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663283621115/gtMbYvvduSqhsHRvj39YWw/dotloop-office-bg-fVKzMWLQvtaL58mYpAMTqq.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}>
          {/* Frosted glass overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-md pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[600px] text-white">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Link2 className="w-10 h-10 text-white" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h3 className="text-3xl font-bold text-white">
                Connect to Dotloop
              </h3>
              <p className="text-white/90 text-base max-w-sm leading-relaxed">
                Automatically sync your transaction data in real-time. No more manual CSV uploads—your reports update automatically every night.
              </p>
            </div>

            {/* Features */}
            <div className="w-full space-y-4 py-6">
              <div className="flex items-center justify-center gap-3 text-sm group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-400/30 flex items-center justify-center group-hover:bg-emerald-400/50 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                </div>
                <span className="text-white/90">Automatic sync every night</span>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-400/30 flex items-center justify-center group-hover:bg-cyan-400/50 transition-colors">
                  <Shield className="w-5 h-5 text-cyan-200" />
                </div>
                <span className="text-white/90">Secure read-only access</span>
              </div>

              <div className="flex items-center justify-center gap-3 text-sm group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-400/30 flex items-center justify-center group-hover:bg-emerald-400/50 transition-colors">
                  <Zap className="w-5 h-5 text-emerald-200" />
                </div>
                <span className="text-white/90">Real-time transaction updates</span>
              </div>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={handleOpenDialog}
              size="lg" 
              className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold shadow-lg transition-all duration-300"
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

            {/* Trust indicator */}
            <p className="text-xs text-white/60 pt-2">
              🔒 Your credentials are encrypted and never stored in plain text
            </p>
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
