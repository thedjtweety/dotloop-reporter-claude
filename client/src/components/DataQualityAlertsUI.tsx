import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle2, AlertTriangle, Bell, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function DataQualityAlertsUI() {
  const [isScanning, setIsScanning] = useState(false);

  // Mock data quality issues
  const qualityIssues = [
    {
      id: 1,
      type: 'missing_data',
      severity: 'high',
      description: 'Missing closing date for 5 transactions',
      count: 5,
      affected: ['Transaction #1001', 'Transaction #1002', 'Transaction #1003'],
    },
    {
      id: 2,
      type: 'invalid_value',
      severity: 'medium',
      description: 'Invalid commission rates detected',
      count: 3,
      affected: ['Agent: John Smith', 'Agent: Jane Doe'],
    },
    {
      id: 3,
      type: 'duplicate',
      severity: 'low',
      description: 'Potential duplicate transactions',
      count: 2,
      affected: ['Loop #5001', 'Loop #5002'],
    },
  ];

  // Mock alerts
  const alerts = [
    {
      id: 1,
      type: 'high_value_transaction',
      title: 'High-Value Transaction Detected',
      message: 'Transaction #1005: $2,500,000 - John Smith',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 2,
      type: 'unusual_commission',
      title: 'Unusual Commission Rate',
      message: 'Agent Jane Doe: 12% commission (average: 6%)',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      read: false,
    },
    {
      id: 3,
      type: 'data_sync',
      title: 'Dotloop Sync Completed',
      message: '45 transactions synced successfully',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      read: true,
    },
  ];

  const dataQualityMutation = trpc.dataQualityAlertsProcedures.runDataQualityCheck.useQuery({tenantId: 0}, {enabled: false}) as any;

  const handleScanQuality = async () => {
    try {
      setIsScanning(true);
      const result = await (dataQualityMutation as any).refetch();
      console.log('Quality check result:', result);
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <CheckCircle2 className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Data Quality & Alerts</h2>
          </div>

          <Button onClick={handleScanQuality} disabled={isScanning || (dataQualityMutation as any).isFetching} size="sm">
            {isScanning || (dataQualityMutation as any).isFetching ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              'Scan Quality'
            )}
          </Button>
        </div>

        <Tabs defaultValue="quality" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quality">Data Quality</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          {/* Data Quality Tab */}
          <TabsContent value="quality" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Issues</p>
                <p className="text-3xl font-bold text-foreground mt-2">{qualityIssues.length}</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">High Severity</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {qualityIssues.filter((i) => i.severity === 'high').length}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Data Completeness</p>
                <p className="text-3xl font-bold text-green-600 mt-2">98%</p>
              </Card>
            </div>

            {/* Quality Issues List */}
            <div className="space-y-3">
              {qualityIssues.map((issue) => (
                <Card key={issue.id} className={`p-4 border-l-4 ${getSeverityColor(issue.severity)}`}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{issue.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Affected: {issue.affected.join(', ')}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                        <Button variant="ghost" size="sm">
                          Fix
                        </Button>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-background rounded-full text-sm font-medium">
                        {issue.count} items
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900">
                Data quality issues are automatically detected during sync and manual scans. Click "Fix" to apply
                corrections.
              </p>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {alerts.filter((a) => !a.read).length} unread alerts
                </p>
              </div>
              <Button variant="outline" size="sm">
                Mark all as read
              </Button>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`p-4 border-l-4 ${
                    alert.read ? 'border-l-gray-300 bg-muted/30' : 'border-l-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Bell className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.read ? 'text-gray-400' : 'text-blue-600'}`} />
                    <div className="flex-1">
                      <p className={`font-semibold ${alert.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {alert.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {!alert.read && (
                      <Button variant="ghost" size="sm">
                        Mark as read
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Alert Settings */}
            <Card className="p-4 mt-6">
              <h3 className="font-semibold text-foreground mb-3">Alert Settings</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">High-value transactions ($1M+)</span>
                </label>
                <label className="flex items-center gap-3 p-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Unusual commission rates</span>
                </label>
                <label className="flex items-center gap-3 p-2">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Data quality issues</span>
                </label>
                <label className="flex items-center gap-3 p-2">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm">Daily summary reports</span>
                </label>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
