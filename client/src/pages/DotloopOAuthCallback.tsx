import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

/**
 * OAuth Callback Page
 * Handles the redirect from Dotloop after user authorizes
 */
export default function DotloopOAuthCallback() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);

  const handleCallbackMutation = trpc.dotloopOAuth.handleCallback.useMutation();

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get query parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const errorParam = params.get('error');
        const errorDescription = params.get('error_description');

        // Handle OAuth errors
        if (errorParam) {
          throw new Error(`OAuth Error: ${errorParam} - ${errorDescription || 'Unknown error'}`);
        }

        // Validate required parameters
        if (!code || !state) {
          throw new Error('Missing required OAuth parameters (code or state)');
        }

        // Get IP address for audit logging
        const ipAddress = await fetch('https://api.ipify.org?format=json')
          .then(r => r.json())
          .then(d => d.ip)
          .catch(() => '0.0.0.0');

        // Call the callback handler
        const result = await handleCallbackMutation.mutateAsync({
          code,
          state,
          ipAddress,
          userAgent: navigator.userAgent,
        });

        if (result.success) {
          // Success - redirect to home
          setLocation('/');
        } else {
          throw new Error('Failed to process OAuth callback');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process OAuth callback';
        setError(errorMessage);
        console.error('[DotloopOAuthCallback] Error:', err);
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [setLocation, handleCallbackMutation]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Connection Failed</h1>
            <p className="text-muted-foreground">
              We encountered an error while connecting to Dotloop
            </p>
          </div>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive font-mono break-words">
              {error}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setLocation('/')}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Connecting to Dotloop...</h1>
            <p className="text-muted-foreground">Please wait while we complete your connection</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
