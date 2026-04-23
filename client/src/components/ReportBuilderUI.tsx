import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Mail, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function ReportBuilderUI() {
  const [reportType, setReportType] = useState<'commission' | 'performance' | 'financial'>('commission');
  const [reportTitle, setReportTitle] = useState('Commission Report');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'totalVolume',
    'totalCommission',
    'closingRate',
  ]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReportMutation = trpc.reportingProcedures.generateCommissionReport.useMutation();
  const trpcUtils = trpc.useUtils();

  const metricsOptions = {
    commission: [
      { id: 'totalVolume', label: 'Total Volume' },
      { id: 'totalCommission', label: 'Total Commission' },
      { id: 'averageCommission', label: 'Average Commission' },
      { id: 'commissionRate', label: 'Commission Rate' },
    ],
    performance: [
      { id: 'closingRate', label: 'Closing Rate' },
      { id: 'daysToClose', label: 'Days to Close' },
      { id: 'activeListings', label: 'Active Listings' },
      { id: 'contractedListings', label: 'Contracted Listings' },
    ],
    financial: [
      { id: 'totalVolume', label: 'Total Volume' },
      { id: 'totalCommission', label: 'Total Commission' },
      { id: 'netRevenue', label: 'Net Revenue' },
      { id: 'profitMargin', label: 'Profit Margin' },
    ],
  };

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId) ? prev.filter((m) => m !== metricId) : [...prev, metricId]
    );
  };

  const handleGenerateReport = async () => {
    try {
      setIsGenerating(true);
      await generateReportMutation.mutateAsync({
        tenantId: 0, // Will be set by server context
        title: reportTitle,
        filters: {},
      });
      // Refresh reports list
      await trpcUtils.reportingProcedures.invalidate();
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Report Builder</h2>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Report Title</label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Enter report title"
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Report Type</label>
              <div className="space-y-2 mt-2">
                {(['commission', 'performance', 'financial'] as const).map((type) => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportType"
                      value={type}
                      checked={reportType === type}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium capitalize">{type} Report</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {reportType === 'commission' &&
                  'Commission reports show total volume, commissions, and agent performance.'}
                {reportType === 'performance' &&
                  'Performance reports track closing rates, days to close, and listing status.'}
                {reportType === 'financial' &&
                  'Financial reports display revenue, commissions, and profit margins.'}
              </p>
            </div>
          </TabsContent>

          {/* Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metricsOptions[reportType].map((metric) => (
                <label key={metric.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted">
                  <Checkbox
                    checked={selectedMetrics.includes(metric.id)}
                    onCheckedChange={() => handleMetricToggle(metric.id)}
                  />
                  <span className="text-sm font-medium">{metric.label}</span>
                </label>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Selected {selectedMetrics.length} metric{selectedMetrics.length !== 1 ? 's' : ''}
            </p>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Card className="p-4 bg-muted">
              <h3 className="font-semibold text-foreground mb-3">{reportTitle}</h3>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">Type:</span> {reportType}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Metrics:</span> {selectedMetrics.join(', ')}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">Generated:</span> {new Date().toLocaleString()}
                </p>
              </div>
            </Card>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                This is a preview of your report. Click "Generate Report" to create the final version.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || generateReportMutation.isPending}
            size="lg"
            className="flex-1"
          >
            {isGenerating || generateReportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>

          <Button variant="outline" size="lg">
            <Mail className="w-4 h-4 mr-2" />
            Email Report
          </Button>
        </div>
      </Card>
    </div>
  );
}
