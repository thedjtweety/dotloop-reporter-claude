import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Home, CheckCircle, Clock, Archive } from 'lucide-react';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, PolarAngleAxis, PolarRadiusAxis, RadarChart, Radar, PolarGrid
} from 'recharts';
import { DotloopRecord } from '@/lib/csvParser';
import { formatNumber } from '@/lib/formatUtils';
import { DateRange } from 'react-day-picker';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import TransactionDetailModal from '@/components/TransactionDetailModal';

interface InteractivePipelineChartProps {
  data: DotloopRecord[];
  onDrillDown?: (status: string, records: DotloopRecord[]) => void;
}

type VisualizationMode = 'funnel' | 'radial';

interface ConversionMetric {
  from: string;
  to: string;
  rate: number;
  count: number;
  benchmark?: number;
}

interface StageConfig {
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  badgeColor: string;
}

const PIPELINE_STAGES: Record<string, StageConfig> = {
  'Closed': {
    name: 'Closed',
    icon: <CheckCircle className="w-5 h-5" />,
    color: '#10b981',
    gradient: 'gradient-closed',
    badgeColor: 'market-badge-success',
  },
  'Active Listings': {
    name: 'Active Listings',
    icon: <Home className="w-5 h-5" />,
    color: '#3b82f6',
    gradient: 'gradient-active',
    badgeColor: 'market-badge-info',
  },
  'Under Contract': {
    name: 'Under Contract',
    icon: <Clock className="w-5 h-5" />,
    color: '#f59e0b',
    gradient: 'gradient-contract',
    badgeColor: 'market-badge-warning',
  },
  'Archived': {
    name: 'Archived',
    icon: <Archive className="w-5 h-5" />,
    color: '#ef4444',
    gradient: 'gradient-archived',
    badgeColor: 'market-badge-warning',
  },
};

const BENCHMARK_RATES: Record<string, number> = {
  'Active Listings to Under Contract': 35,
  'Under Contract to Closed': 85,
};

export default function InteractivePipelineChart({ data, onDrillDown }: InteractivePipelineChartProps) {
  const [mode, setMode] = useState<VisualizationMode>('funnel');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTransactions, setModalTransactions] = useState<DotloopRecord[]>([]);

  // Filter data by date range
  const filteredData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return data;
    
    return data.filter(record => {
      const date = record.closingDate ? new Date(record.closingDate) : null;
      if (!date) return true;
      return date >= (dateRange.from as Date) && date <= (dateRange.to as Date);
    });
  }, [data, dateRange]);

  // Calculate conversion metrics
  const conversionMetrics = React.useMemo(() => {
    const metrics: ConversionMetric[] = [];
    const stageOrder = ['Active Listings', 'Under Contract', 'Closed'];
    
    for (let i = 0; i < stageOrder.length - 1; i++) {
      const fromStage = stageOrder[i];
      const toStage = stageOrder[i + 1];
      
      const fromCount = filteredData.filter(r => {
        const status = r.loopStatus?.toLowerCase() || '';
        return status.includes(fromStage.toLowerCase().replace(' ', ''));
      }).length;
      
      const toCount = filteredData.filter(r => {
        const status = r.loopStatus?.toLowerCase() || '';
        return status.includes(toStage.toLowerCase().replace(' ', ''));
      }).length;
      
      if (fromCount > 0) {
        const key = `${fromStage} to ${toStage}`;
        metrics.push({
          from: fromStage,
          to: toStage,
          rate: (toCount / fromCount) * 100,
          count: toCount,
          benchmark: BENCHMARK_RATES[key],
        });
      }
    }
    
    return metrics;
  }, [filteredData]);

  const handleStageClick = (stageName: string) => {
    const filtered = filteredData.filter(record => {
      const status = record.loopStatus?.toLowerCase() || '';
      if (stageName === 'Closed') {
        return status.includes('closed') || status.includes('sold');
      } else if (stageName === 'Active Listings') {
        return status.includes('active');
      } else if (stageName === 'Under Contract') {
        return status.includes('contract') || status.includes('pending');
      } else if (stageName === 'Archived') {
        return status.includes('archived');
      }
      return false;
    });
    
    setSelectedStage(stageName);
    setModalTitle(stageName);
    setModalTransactions(filtered);
    setModalOpen(true);
    if (onDrillDown) {
      onDrillDown(stageName, filtered);
    }
  };

  // Calculate pipeline breakdown
  const pipelineData = React.useMemo(() => {
    const stages = {
      'Closed': 0,
      'Active Listings': 0,
      'Under Contract': 0,
      'Archived': 0,
    };

    filteredData.forEach((record) => {
      const status = (record.loopStatus || '').toLowerCase();
      if (status.includes('closed') || status.includes('sold')) {
        stages['Closed']++;
      } else if (status.includes('active')) {
        stages['Active Listings']++;
      } else if (status.includes('contract') || status.includes('pending')) {
        stages['Under Contract']++;
      } else if (status.includes('archived')) {
        stages['Archived']++;
      }
    });

    return [
      { name: 'Closed', value: stages['Closed'], color: PIPELINE_STAGES['Closed'].color },
      { name: 'Active Listings', value: stages['Active Listings'], color: PIPELINE_STAGES['Active Listings'].color },
      { name: 'Under Contract', value: stages['Under Contract'], color: PIPELINE_STAGES['Under Contract'].color },
      { name: 'Archived', value: stages['Archived'], color: PIPELINE_STAGES['Archived'].color },
    ];
  }, [filteredData]);

  const funnelData = React.useMemo(() => {
    return pipelineData.slice(0, 4);
  }, [pipelineData]);

  const totalTransactions = filteredData.length;

  const renderFunnelChart = () => {
    // Handle empty data
    if (funnelData.length === 0 || totalTransactions === 0) {
      return (
        <div className="w-full flex items-center justify-center p-8 text-foreground/70">
          No pipeline data available
        </div>
      );
    }
    
    const maxValue = Math.max(...funnelData.map(d => d.value), 1); // Ensure maxValue is at least 1
    const funnelHeight = 90;

    return (
      <div className="w-full flex flex-col justify-center items-center gap-6 p-8">
        {funnelData.map((item, index) => {
          const percentage = totalTransactions > 0 ? (item.value / maxValue) * 100 : 0;
          const stageConfig = PIPELINE_STAGES[item.name];
          const percentageOfTotal = totalTransactions > 0 ? (item.value / totalTransactions) * 100 : 0;

          return (
            <div key={index} className="w-full group">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <div className="property-icon" style={{ backgroundColor: item.color + '20', color: item.color }}>
                    {stageConfig.icon}
                  </div>
                  <span className="font-semibold text-foreground">{item.name}</span>
                </div>
                <span className="text-sm text-muted-foreground ml-auto">{item.value} deals</span>
              </div>
              
              <div
                className="relative transition-all duration-300 hover:shadow-xl rounded-xl cursor-pointer overflow-hidden"
                style={{
                  width: `${percentage}%`,
                  height: `${funnelHeight}px`,
                  background: `linear-gradient(135deg, ${item.color}dd 0%, ${item.color}aa 100%)`,
                  opacity: selectedStage === item.name ? 1 : 0.9,
                }}
                onClick={() => handleStageClick(item.name)}
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Content */}
                <div className="h-full flex flex-col items-center justify-center relative z-10">
                  <span className="font-bold text-white drop-shadow-lg text-lg">
                    {isNaN(percentageOfTotal) ? '0' : percentageOfTotal.toFixed(1)}%
                  </span>
                  <span className="text-white/90 text-xs drop-shadow-md">
                    of pipeline
                  </span>
                </div>

                {/* Hover tooltip */}
                <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-card border border-border p-3 rounded-lg shadow-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                  <p className="font-medium text-foreground">{percentageOfTotal.toFixed(1)}% of total</p>
                  <p className="text-xs text-muted-foreground">Click to view details</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderRadialBarChart = () => {
    const radarData = funnelData.map(item => ({
      name: item.name,
      value: item.value,
      fill: item.color,
    }));

    return (
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="name" stroke="#9CA3AF" />
            <PolarRadiusAxis stroke="#9CA3AF" />
            <Radar
              name="Deals"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.6}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              formatter={(value) => formatNumber(value as number)}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <>
      <Card className="h-full border-border/50 shadow-lg">
        <CardHeader className="border-b border-border/50 pb-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Home className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Pipeline Breakdown</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Market Penetration Analysis</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={mode === 'funnel' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('funnel')}
                  className="gap-2"
                >
                  Funnel
                </Button>
                <Button
                  variant={mode === 'radial' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMode('radial')}
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Radial
                </Button>
              </div>
            </div>

            {/* Date Range Picker */}
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />

            {/* Conversion Metrics with Benchmarks - Enhanced */}
            {conversionMetrics.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {conversionMetrics.map((metric, idx) => {
                  const isBelowBenchmark = metric.benchmark && metric.rate < metric.benchmark;
                  const isAboveBenchmark = metric.benchmark && metric.rate >= metric.benchmark;
                  const performanceGap = metric.benchmark ? metric.rate - metric.benchmark : 0;
                  
                  return (
                    <div 
                      key={idx} 
                      className="bg-card border border-border/50 rounded-lg p-4 hover:border-border transition-colors hover:shadow-md"
                    >
                      <p className="text-muted-foreground text-xs font-medium mb-2 uppercase tracking-wide">
                        {metric.from} → {metric.to}
                      </p>
                      <div className="flex items-end gap-3 mb-3">
                        <div>
                          <p className="font-bold text-2xl text-foreground">
                            {metric.rate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {metric.count} deals converted
                          </p>
                        </div>
                        {metric.benchmark && (
                          <div className="flex items-center gap-1 ml-auto">
                            {isAboveBenchmark ? (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20">
                                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  +{performanceGap.toFixed(0)}%
                                </span>
                              </div>
                            ) : isBelowBenchmark ? (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20">
                                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                                  {performanceGap.toFixed(0)}%
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      {metric.benchmark && (
                        <div className="pt-3 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">
                            Industry benchmark: <span className="font-semibold text-foreground">{metric.benchmark.toFixed(0)}%</span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total Transactions */}
            <div className="text-sm text-muted-foreground text-center pt-2">
              Analyzing <span className="font-semibold text-foreground">{totalTransactions}</span> transaction{totalTransactions !== 1 ? 's' : ''}
              {dateRange?.from && dateRange?.to && (
                <span className="block text-xs mt-1">
                  from {dateRange.from.toLocaleDateString()} to {dateRange.to.toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="w-full">
            {mode === 'funnel' ? renderFunnelChart() : renderRadialBarChart()}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        transactions={modalTransactions}
        fullScreen={true}
      />
    </>
  );
}
