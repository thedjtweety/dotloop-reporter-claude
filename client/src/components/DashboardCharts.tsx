/**
 * Dashboard Charts Component - Priority 2.4: Interactive Charts & Drill-Down
 * Comprehensive visualization of dashboard metrics with drill-down capability
 */

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ChevronDown, Download, Maximize2 } from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
  [key: string]: any;
}

interface PipelineData {
  status: string;
  count: number;
  percentage: number;
  volume: number;
}

interface AgentData {
  agentName: string;
  totalTransactions: number;
  closedTransactions: number;
  closingRate: number;
  totalVolume: number;
  averagePrice: number;
  totalCommission: number;
  daysToClose: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export interface DashboardChartsProps {
  pipelineData: PipelineData[];
  agentMetrics: AgentData[];
  financialData: {
    totalVolume: number;
    totalCommission: number;
    buySideCommission: number;
    sellSideCommission: number;
    companyDollar: number;
  };
  onDrillDown?: (type: string, data: any) => void;
}

export function DashboardCharts({
  pipelineData,
  agentMetrics,
  financialData,
  onDrillDown,
}: DashboardChartsProps) {
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);

  // Prepare commission breakdown data
  const commissionBreakdown = [
    { name: 'Buy Side', value: financialData.buySideCommission },
    { name: 'Sell Side', value: financialData.sellSideCommission },
    { name: 'Company Dollar', value: financialData.companyDollar },
  ];

  // Prepare agent performance data
  const topAgents = agentMetrics.slice(0, 10);

  // Prepare volume trend data (mock - would be real in production)
  const volumeTrendData = [
    { month: 'Jan', volume: 1200000, commission: 36000 },
    { month: 'Feb', volume: 1900000, commission: 57000 },
    { month: 'Mar', volume: 1600000, commission: 48000 },
    { month: 'Apr', volume: 2100000, commission: 63000 },
    { month: 'May', volume: 1800000, commission: 54000 },
    { month: 'Jun', volume: 2400000, commission: 72000 },
  ];

  const ChartContainer = ({ title, children, onExpand }: any) => (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:border-border transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onExpand(title)}
          className="h-8 w-8 p-0"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="w-full h-80">{children}</div>
    </Card>
  );

  const ExpandedChartDialog = ({ title, children }: any) => (
    <Dialog open={expandedChart === title} onOpenChange={() => setExpandedChart(null)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="w-full h-[600px]">{children}</div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Pipeline Status Chart */}
      <ChartContainer
        title="Pipeline Status Breakdown"
        onExpand={setExpandedChart}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pipelineData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="count"
              onClick={(entry) => onDrillDown?.('pipeline', entry)}
            >
              {pipelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `${value} transactions`}
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ExpandedChartDialog title="Pipeline Status Breakdown">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pipelineData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name} (${percentage}%)`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
            >
              {pipelineData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${value} transactions`} />
          </PieChart>
        </ResponsiveContainer>
      </ExpandedChartDialog>

      {/* Commission Breakdown Chart */}
      <ChartContainer
        title="Commission Breakdown"
        onExpand={setExpandedChart}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={commissionBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
            />
            <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ExpandedChartDialog title="Commission Breakdown">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={commissionBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
            />
            <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartDialog>

      {/* Volume Trend Chart */}
      <ChartContainer
        title="Sales Volume & Commission Trend"
        onExpand={setExpandedChart}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={volumeTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              yAxisId="left"
            />
            <Line
              type="monotone"
              dataKey="commission"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
              yAxisId="right"
            />
            <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" />
            <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ExpandedChartDialog title="Sales Volume & Commission Trend">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={volumeTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
            <YAxis stroke="rgba(255,255,255,0.5)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="volume"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 6 }}
              activeDot={{ r: 8 }}
              yAxisId="left"
            />
            <Line
              type="monotone"
              dataKey="commission"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 6 }}
              activeDot={{ r: 8 }}
              yAxisId="right"
            />
            <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" />
            <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.5)" />
          </LineChart>
        </ResponsiveContainer>
      </ExpandedChartDialog>

      {/* Agent Performance Chart */}
      <ChartContainer
        title="Top 10 Agents by Volume"
        onExpand={setExpandedChart}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topAgents}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
            <YAxis dataKey="agentName" type="category" stroke="rgba(255,255,255,0.5)" width={190} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
            />
            <Bar dataKey="totalVolume" fill="#3b82f6" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ExpandedChartDialog title="Top 10 Agents by Volume">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={topAgents}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
            <YAxis dataKey="agentName" type="category" stroke="rgba(255,255,255,0.5)" width={190} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              formatter={(value: number) => `$${(value / 1000000).toFixed(2)}M`}
            />
            <Bar dataKey="totalVolume" fill="#3b82f6" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ExpandedChartDialog>

      {/* Closing Rate vs Days to Close */}
      <ChartContainer
        title="Closing Rate vs Days to Close"
        onExpand={setExpandedChart}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              type="number"
              dataKey="closingRate"
              name="Closing Rate %"
              stroke="rgba(255,255,255,0.5)"
            />
            <YAxis
              type="number"
              dataKey="daysToClose"
              name="Days to Close"
              stroke="rgba(255,255,255,0.5)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Scatter name="Agents" data={agentMetrics} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ExpandedChartDialog title="Closing Rate vs Days to Close">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              type="number"
              dataKey="closingRate"
              name="Closing Rate %"
              stroke="rgba(255,255,255,0.5)"
            />
            <YAxis
              type="number"
              dataKey="daysToClose"
              name="Days to Close"
              stroke="rgba(255,255,255,0.5)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <Scatter name="Agents" data={agentMetrics} fill="#10b981" />
          </ScatterChart>
        </ResponsiveContainer>
      </ExpandedChartDialog>
    </div>
  );
}
