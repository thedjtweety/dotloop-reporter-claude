/**
 * Manage Dotloop Connections Page
 * 
 * Placeholder for managing multiple Dotloop account connections.
 * This feature is currently under development.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function ManageDotloopConnections() {
  return (
    <div className="space-y-6">
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <AlertCircle className="h-5 w-5" />
            Feature Coming Soon
          </CardTitle>
          <CardDescription className="text-yellow-800">
            Multiple Dotloop account management is under development
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-yellow-800">
            Currently, you can manage a single Dotloop connection through the main OAuth flow. 
            Support for managing multiple Dotloop accounts will be available in a future update.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
