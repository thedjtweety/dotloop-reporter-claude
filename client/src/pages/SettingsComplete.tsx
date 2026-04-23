// @ts-nocheck
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Upload, Download, Trash2, Key, Webhook } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsComplete() {
  const [logoPreview, setLogoPreview] = useState(null);
  const [colorScheme, setColorScheme] = useState('auto');
  const [dataRetention, setDataRetention] = useState('90');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  // Mutations
  const uploadLogoMutation = trpc.settings.uploadLogo.useMutation({
    onSuccess: () => {
      toast.success('Logo uploaded successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to upload logo');
    },
  });

  const updateColorSchemeMutation = trpc.settings.updateColorScheme.useMutation({
    onSuccess: () => {
      toast.success('Color scheme updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update color scheme');
    },
  });

  const updateDataRetentionMutation = trpc.settings.updateDataRetention.useMutation({
    onSuccess: () => {
      toast.success('Data retention setting updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update data retention');
    },
  });

  const exportDataMutation = trpc.settings.exportData.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${new Date().toISOString()}.json`;
      a.click();
      toast.success('Data exported successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to export data');
    },
  });

  const resetDataMutation = trpc.settings.resetData.useMutation({
    onSuccess: () => {
      toast.success('All data has been reset');
      setIsResetDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reset data');
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const preview = event.target?.result;
      setLogoPreview(preview);
      uploadLogoMutation.mutate({ file: preview as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-foreground/70 mt-1">Configure your application preferences</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="api">API & Webhooks</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Upload your company logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-contain" />
                )}
                <div>
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <Button asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Logo
                      </span>
                    </Button>
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadLogoMutation.isPending}
                    className="hidden"
                  />
                  <p className="text-sm text-foreground/70 mt-2">PNG, JPG, or SVG. Max 5MB.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Color Scheme</CardTitle>
              <CardDescription>Choose your preferred color theme</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={colorScheme} onValueChange={(value) => {
                setColorScheme(value);
                updateColorSchemeMutation.mutate({ scheme: value });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Tab */}
        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention</CardTitle>
              <CardDescription>How long to keep historical data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={dataRetention} onValueChange={(value) => {
                setDataRetention(value);
                updateDataRetentionMutation.mutate({ days: parseInt(value) });
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">180 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="0">Keep forever</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-foreground/70">Data older than the selected period will be automatically deleted.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Data</CardTitle>
              <CardDescription>Download all your data as JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => exportDataMutation.mutate()} disabled={exportDataMutation.isPending}>
                {exportDataMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </>
                )}
              </Button>
              <p className="text-sm text-foreground/70 mt-2">This will download all your data including transactions, commissions, and team information.</p>
            </CardContent>
          </Card>

          <Card className="border-red-500/50">
            <CardHeader>
              <CardTitle className="text-red-500">Reset Data</CardTitle>
              <CardDescription>Permanently delete all data</CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Data
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all your data including transactions, commissions, and team information. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetDataMutation.mutate()} disabled={resetDataMutation.isPending}>
                      {resetDataMutation.isPending ? 'Resetting...' : 'Reset'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-sm text-foreground/70 mt-2">Warning: This action is irreversible.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API & Webhooks Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API keys for integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground/70">Your API key is used to authenticate requests to the Dotloop Reporter API.</p>
                <div className="bg-slate-900 p-3 rounded font-mono text-sm break-all">
                  sk_live_••••••••••••••••••••••••••••••••
                </div>
                <Button variant="outline" size="sm">
                  <Key className="w-4 h-4 mr-2" />
                  Regenerate Key
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Configure webhooks for real-time events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-foreground/70">Webhooks allow you to receive real-time notifications about events in your account.</p>
                <Button>
                  <Webhook className="w-4 h-4 mr-2" />
                  Add Webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
