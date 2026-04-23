import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, PieChart, TrendingUp } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function AnalyticsDashboardUI() {
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year'>('month');

  // Mock data for charts
  const volumeData = [
    { period: 'Week 1', volume: 1200000, commission: 72000 },
    { period: 'Week 2', volume: 1500000, commission: 90000 },
    { period: 'Week 3', volume: 1800000, commission: 108000 },
    { period: 'Week 4', volume: 2100000, commission: 126000 },
  ];

  const agentLeaderboard = [
    { rank: 1, name: 'Agent 1', volume: 5000000, commission: 300000, closingRate: 95 },
    { rank: 2, name: 'Agent 2', volume: 4200000, commission: 252000, closingRate: 88 },
    { rank: 3, name: 'Agent 3', volume: 3800000, commission: 228000, closingRate: 82 },
    { rank: 4, name: 'Agent 4', volume: 3200000, commission: 192000, closingRate: 78 },
    { rank: 5, name: 'Agent 5', volume: 2800000, commission: 168000, closingRate: 75 },
  ];

  const pipelineData = [
    { status: 'Active', count: 45, percentage: 35 },
    { status: 'Contract', count: 38, percentage: 30 },
    { status: 'Closed', count: 40, percentage: 31 },
    { status: 'Archived', count: 5, percentage: 4 },
  ];

  const geographicData = [
    { location: 'California', transactions: 50, volume: 5000000, percentage: 25 },
    { location: 'Texas', transactions: 40, volume: 4000000, percentage: 20 },
    { location: 'Florida', transactions: 35, volume: 3500000, percentage: 17.5 },
    { location: 'New York', transactions: 30, volume: 3000000, percentage: 15 },
    { location: 'Other', transactions: 45, volume: 4500000, percentage: 22.5 },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Analytics Dashboard</h2>
          </div>

          <div className="flex gap-2">
            {(['month', 'quarter', 'year'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="geographic">Geographic</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-3xl font-bold text-foreground mt-2">$6.6M</p>
                <p className="text-xs text-green-600 mt-2">↑ 12% from last period</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-3xl font-bold text-foreground mt-2">$396K</p>
                <p className="text-xs text-green-600 mt-2">↑ 12% from last period</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Closing Rate</p>
                <p className="text-3xl font-bold text-foreground mt-2">82%</p>
                <p className="text-xs text-green-600 mt-2">↑ 3% from last period</p>
              </Card>

              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Avg Days to Close</p>
                <p className="text-3xl font-bold text-foreground mt-2">28</p>
                <p className="text-xs text-red-600 mt-2">↑ 2 days from last period</p>
              </Card>
            </div>

            {/* Volume Trend Chart */}
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                Volume & Commission Trend
              </h3>
              <div className="space-y-4">
                {volumeData.map((data) => (
                  <div key={data.period}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{data.period}</span>
                      <span className="text-sm text-muted-foreground">
                        ${(data.volume / 1000000).toFixed(1)}M / ${(data.commission / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="flex gap-2 h-8">
                      <div
                        className="bg-blue-500 rounded"
                        style={{ width: `${(data.volume / 2100000) * 100}%` }}
                      />
                      <div
                        className="bg-green-500 rounded"
                        style={{ width: `${(data.commission / 126000) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Agent Leaderboard
              </h3>
              <div className="space-y-3">
                {agentLeaderboard.map((agent) => (
                  <div key={agent.rank} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {agent.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${(agent.volume / 1000000).toFixed(1)}M volume • {agent.closingRate}% closing rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${(agent.commission / 1000).toFixed(0)}K
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline">
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Pipeline Distribution
              </h3>
              <div className="space-y-3">
                {pipelineData.map((item) => (
                  <div key={item.status}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{item.status}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Geographic Tab */}
          <TabsContent value="geographic">
            <Card className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Geographic Distribution</h3>
              <div className="space-y-3">
                {geographicData.map((item) => (
                  <div key={item.location} className="p-3 bg-muted rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-foreground">{item.location}</span>
                      <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                      <span>{item.transactions} transactions</span>
                      <span>${(item.volume / 1000000).toFixed(1)}M volume</span>
                    </div>
                    <div className="w-full h-2 bg-background rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-green-600"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
