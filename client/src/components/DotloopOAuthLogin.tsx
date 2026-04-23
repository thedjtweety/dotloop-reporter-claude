import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import type { QueryObserverResult } from '@tanstack/react-query';

export function DotloopOAuthLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthUrlQuery = trpc.dotloopOAuth.getAuthorizationUrl.useQuery(
    { state: `state_${Date.now()}` },
    { enabled: false, retry: false }
  ) as any;

  const handleDotloopLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get authorization URL
      const result = await getAuthUrlQuery.refetch() as any;
      if (!result?.data?.url) throw new Error('Failed to get authorization URL');

      // Redirect to Dotloop authorization
      window.location.href = result.data.url;
    } catch (err) {
      console.error('Dotloop login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate Dotloop login');
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 border-2 border-dashed">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Connect to Dotloop</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sync your Dotloop transactions directly for real-time data
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button
          onClick={handleDotloopLogin}
          disabled={isLoading}
          size="lg"
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
              Login with Dotloop
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You'll be redirected to Dotloop to authorize access to your account
        </p>
      </div>
    </Card>
  );
}
