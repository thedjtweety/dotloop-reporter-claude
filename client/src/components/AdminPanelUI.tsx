import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Lock, Bell, Database, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function AdminPanelUI() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get system stats
  const systemStats = trpc.adminWebhooksProcedures.getSystemStats.useQuery({} as any);
  const auditLogs = trpc.adminWebhooksProcedures.getAuditLogs.useQuery({
    tenantId: 0,
    limit: 20,
  } as any);

  const handleRefreshStats = async () => {
    try {
      setIsRefreshing(true);
      await (systemStats as any).refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const stats = (systemStats.data as any);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
          </div>

          <Button onClick={handleRefreshStats} disabled={isRefreshing} size="sm">
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Stats'
            )}
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Audit Logs</p>
                <p className="text-3xl font-bold text-foreground mt-2">{stats?.totalAuditLogs || 0}</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Last Activity</p>
                <p className="text-lg font-semibold text-foreground mt-2">
                  {stats?.lastActivityAt ? new Date(stats.lastActivityAt).toLocaleString() : 'N/A'}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Top Actions</p>
                <div className="mt-2 space-y-1 text-sm">
                  {Object.entries(stats?.actionCounts || {}).slice(0, 3).map(([action, count]: any) => (
                    <div key={action} className="flex justify-between">
                      <span className="text-muted-foreground capitalize">{action}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-3xl font-bold text-green-600 mt-2">Healthy</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Database className="w-5 h-5" />
                Audit Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Logs</span>
                  <span className="font-medium">{stats?.totalAuditLogs || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Activity</span>
                  <span className="font-medium">{stats?.lastActivityAt ? new Date(stats.lastActivityAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4">
            <div className="space-y-2">
              {(auditLogs.data as any) && (auditLogs.data as any).length > 0 ? (auditLogs.data as any).map((log: any, index: number) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground capitalize">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.adminName} ({log.adminEmail})</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Card>
              )) : (
                <Card className="p-3">
                  <p className="text-sm text-muted-foreground">No audit logs found</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-4">Webhook Configuration</h3>
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-foreground">Transaction Updated</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered when a transaction is created or updated
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm">
                      Test
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-foreground">Commission Calculated</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered when commission is calculated
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm">
                      Test
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-foreground">Report Generated</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Triggered when a report is generated
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                    <Button variant="ghost" size="sm">
                      Test
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security Settings
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm font-medium">Require 2FA for admin users</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm font-medium">Enable IP whitelist</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm font-medium">Require password change every 90 days</span>
                </label>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm font-medium">Email alerts for high-value transactions</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm font-medium">Daily summary reports</span>
                </label>
                <label className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="text-sm font-medium">System maintenance notifications</span>
                </label>
              </div>
            </Card>

            <Button className="w-full">Save Settings</Button>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
