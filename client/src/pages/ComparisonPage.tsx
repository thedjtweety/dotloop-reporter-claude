/**
 * ComparisonPage
 *
 * Side-by-side comparison of two datasets with metrics, charts, and analysis
 */

import { useTransactionData } from '@/contexts/TransactionDataContext';
import { useLocation } from 'wouter';
import { ArrowLeft, BarChart3, TrendingUp, Users, DollarSign, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatCurrency, formatNumber, formatPercentage } from '@/lib/formatUtils';

export default function ComparisonPage() {
  const [, setLocation] = useLocation();
  const {
    filteredRecords,
    metrics,
    agentMetrics,
    activeDataSetName,
    comparisonDataSet,
    comparisonStatistics,
  } = useTransactionData();

  if (!metrics || !comparisonDataSet) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div className="text-center py-12">
            <p className="text-foreground/70">
              Load two datasets to compare. Go to Dashboard and enable Comparison Mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Prepare comparison data
  const comparisonMetrics = [
    {
      label: 'Transactions',
      primary: filteredRecords.length,
      secondary: comparisonDataSet.filteredRecords.length,
      change: ((comparisonDataSet.filteredRecords.length - filteredRecords.length) / filteredRecords.length) * 100,
    },
    {
      label: 'Total GCI',
      primary: metrics.totalGCI,
      secondary: comparisonDataSet.metrics?.totalGCI ?? 0,
      change: (((comparisonDataSet.metrics?.totalGCI ?? 0) - metrics.totalGCI) / metrics.totalGCI) * 100,
      format: 'currency',
    },
    {
      label: 'Average Deal Size',
      primary: metrics.totalGCI / filteredRecords.length,
      secondary: (comparisonDataSet.metrics?.totalGCI ?? 0) / comparisonDataSet.filteredRecords.length,
      change: (((comparisonDataSet.metrics?.totalGCI ?? 0) / comparisonDataSet.filteredRecords.length) - (metrics.totalGCI / filteredRecords.length)) / (metrics.totalGCI / filteredRecords.length) * 100,
      format: 'currency',
    },
    {
      label: 'Close Rate',
      primary: metrics.closeRate,
      secondary: comparisonDataSet.metrics?.closeRate ?? 0,
      change: ((comparisonDataSet.metrics?.closeRate ?? 0) - metrics.closeRate) * 100,
      format: 'percentage',
    },
  ];

  // Prepare agent comparison data (top 5 agents by GCI)
  const topAgentsPrimary = agentMetrics
    .sort((a, b) => (b.totalGCI || 0) - (a.totalGCI || 0))
    .slice(0, 5);

  const topAgentsComparison = (comparisonDataSet.agentMetrics || [])
    .sort((a, b) => (b.totalGCI || 0) - (a.totalGCI || 0))
    .slice(0, 5);

  const agentComparisonData = topAgentsPrimary.map((agent) => {
    const comparisonAgent = topAgentsComparison.find((a) => a.agentName === agent.agentName);
    return {
      name: agent.agentName,
      primary: agent.totalGCI || 0,
      secondary: comparisonAgent?.totalGCI || 0,
    };
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => setLocation('/')}
              className="mb-4 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Dataset Comparison</h1>
            <p className="text-foreground/70 mt-2">
              Compare metrics between {activeDataSetName} and {comparisonDataSet.name}
            </p>
          </div>
        </div>

        {/* Comparison Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {comparisonMetrics.map((metric) => (
            <Card key={metric.label} className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-foreground/70">{metric.label}</p>
                  <div
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      metric.change > 0
                        ? 'bg-green-500/20 text-green-400'
                        : metric.change < 0
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-foreground/50 mb-1">Primary</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      {metric.format === 'currency'
                        ? formatCurrency(metric.primary)
                        : metric.format === 'percentage'
                        ? formatPercentage(metric.primary)
                        : formatNumber(metric.primary)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50 mb-1">Comparison</p>
                    <p className="text-lg font-semibold text-blue-400">
                      {metric.format === 'currency'
                        ? formatCurrency(metric.secondary)
                        : metric.format === 'percentage'
                        ? formatPercentage(metric.secondary)
                        : formatNumber(metric.secondary)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dataset 1 Summary */}
          <Card className="p-6 border-l-4 border-l-emerald-500">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              {activeDataSetName}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Transactions</span>
                <span className="font-semibold text-foreground">{filteredRecords.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Total GCI</span>
                <span className="font-semibold text-foreground">{formatCurrency(metrics.totalGCI)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Avg Deal Size</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(metrics.totalGCI / filteredRecords.length)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Close Rate</span>
                <span className="font-semibold text-foreground">{formatPercentage(metrics.closeRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Active Agents</span>
                <span className="font-semibold text-foreground">{agentMetrics.length}</span>
              </div>
            </div>
          </Card>

          {/* Dataset 2 Summary */}
          <Card className="p-6 border-l-4 border-l-blue-500">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              {comparisonDataSet.name}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Transactions</span>
                <span className="font-semibold text-foreground">{comparisonDataSet.filteredRecords.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Total GCI</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(comparisonDataSet.metrics?.totalGCI ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Avg Deal Size</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(
                    (comparisonDataSet.metrics?.totalGCI ?? 0) / comparisonDataSet.filteredRecords.length
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Close Rate</span>
                <span className="font-semibold text-foreground">
                  {formatPercentage(comparisonDataSet.metrics?.closeRate ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground/70">Active Agents</span>
                <span className="font-semibold text-foreground">{comparisonDataSet.agentMetrics?.length ?? 0}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Agent Comparison Chart */}
        {agentComparisonData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Top Agents - GCI Comparison
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #1e2d3d' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="primary" fill="#10b981" name={activeDataSetName} />
                <Bar dataKey="secondary" fill="#3b82f6" name={comparisonDataSet.name} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Transaction Volume Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Metrics Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <p className="text-xs text-foreground/70 mb-2">Primary Dataset</p>
              <p className="text-2xl font-bold text-emerald-400">{activeDataSetName}</p>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-xs text-foreground/70 mb-2">Comparison Dataset</p>
              <p className="text-2xl font-bold text-blue-400">{comparisonDataSet.name}</p>
            </div>
            <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-xs text-foreground/70 mb-2">Transaction Difference</p>
              <p className="text-2xl font-bold text-purple-400">
                {comparisonDataSet.filteredRecords.length - filteredRecords.length > 0 ? '+' : ''}
                {comparisonDataSet.filteredRecords.length - filteredRecords.length}
              </p>
            </div>
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-xs text-foreground/70 mb-2">GCI Difference</p>
              <p className="text-2xl font-bold text-amber-400">
                {formatCurrency((comparisonDataSet.metrics?.totalGCI ?? 0) - metrics.totalGCI)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
