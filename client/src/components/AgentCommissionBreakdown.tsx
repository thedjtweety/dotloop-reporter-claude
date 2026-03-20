/**
 * Agent Commission Breakdown Component
 * Displays detailed commission analysis with charts and metrics
 * Shows buy-side vs sell-side, commission by property type, trends, etc.
 */

import React, { useMemo, useState } from 'react';
import { AgentMetrics, DotloopRecord } from '@/lib/csvParser';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CommissionPlanWarning from './CommissionPlanWarning';
import { calculatePlanBasedCommission } from '@/lib/commissionRecalculator';
import { getPlanForAgent } from '@/lib/commission';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { formatCurrency, formatPercentage } from '@/lib/formatUtils';
import { DollarSign, TrendingUp, Percent, Calendar } from 'lucide-react';
import { ModalSearch } from './ModalSearch';

interface AgentCommissionBreakdownProps {
  agent: AgentMetrics;
  transactions: DotloopRecord[];
  hasCommissionPlan?: boolean;
  showRecalculated?: boolean;
}

export default function AgentCommissionBreakdown({
  agent,
  transactions,
  hasCommissionPlan = true,
  showRecalculated = false,
}: AgentCommissionBreakdownProps) {
  const [searchTerm, setSearchTerm] = useState('');
  // Filter transactions for this agent
  const agentTransactions = useMemo(() => {
    return transactions.filter(t => {
      const agents = t.agents ? t.agents.split(',').map(a => a.trim()) : [];
      return agents.includes(agent.agentName);
    });
  }, [agent.agentName, transactions]);

  // Get plan and calculate recalculated commission
  const plan = useMemo(() => getPlanForAgent(agent.agentName), [agent.agentName]);
  const recalculatedMetrics = useMemo(() => {
    if (!plan || !showRecalculated) return null;
    return calculatePlanBasedCommission(agentTransactions, plan);
  }, [plan, agentTransactions, showRecalculated]);

  // Commission breakdown by side
  const commissionBySide = useMemo(() => {
    const buySide = agent.buySideCommission || 0;
    const sellSide = agent.sellSideCommission || 0;
    const total = buySide + sellSide;
    return [
      {
        name: 'Buy-Side',
        value: buySide,
        percentage: total > 0 ? ((buySide / total) * 100).toFixed(1) : 0,
      },
      {
        name: 'Sell-Side',
        value: sellSide,
        percentage: total > 0 ? ((sellSide / total) * 100).toFixed(1) : 0,
      },
    ];
  }, [agent.buySideCommission, agent.sellSideCommission]);

  // Commission by property type (filtered by search)
  const commissionByPropertyType = useMemo(() => {
    const breakdown: Record<string, number> = {};
    agentTransactions.forEach(t => {
      const type = t.propertyType || 'Unknown';
      breakdown[type] = (breakdown[type] || 0) + (t.commissionTotal || 0);
    });
    let results = Object.entries(breakdown)
      .map(([type, commission]) => ({
        type,
        commission,
      }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 6); // Top 6 property types
    
    // Filter by search term
    if (searchTerm) {
      results = results.filter(item => 
        item.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return results;
  }, [agentTransactions, searchTerm]);

  // Commission by transaction status (filtered by search)
  const commissionByStatus = useMemo(() => {
    const breakdown: Record<string, number> = {};
    agentTransactions.forEach(t => {
      const status = t.loopStatus || 'Unknown';
      breakdown[status] = (breakdown[status] || 0) + (t.commissionTotal || 0);
    });
    let results = Object.entries(breakdown).map(([status, commission]) => ({
      status,
      commission,
    }));
    
    // Filter by search term
    if (searchTerm) {
      results = results.filter(item => 
        item.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return results;
  }, [agentTransactions, searchTerm]);

  // Commission timeline (by month)
  const commissionTimeline = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    agentTransactions.forEach(t => {
      const date = new Date(t.closingDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + (t.commissionTotal || 0);
    });
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, commission]) => ({
        month,
        commission,
      }));
  }, [agentTransactions]);

  // Average commission per deal
  const avgCommissionPerDeal = useMemo(() => {
    return agentTransactions.length > 0
      ? agent.totalCommission / agentTransactions.length
      : 0;
  }, [agent.totalCommission, agentTransactions.length]);

  // Commission efficiency (commission as % of sale price)
  const commissionEfficiency = useMemo(() => {
    const totalSalePrice = agentTransactions.reduce(
      (sum, t) => sum + (t.salePrice || 0),
      0
    );
    return totalSalePrice > 0
      ? ((agent.totalCommission / totalSalePrice) * 100).toFixed(2)
      : 0;
  }, [agent.totalCommission, agentTransactions]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="mb-4">
        <ModalSearch
          placeholder="Search by property type or status..."
          onSearchChange={setSearchTerm}
          resultCount={commissionByPropertyType.length + commissionByStatus.length}
          totalCount={agentTransactions.length}
        />
      </div>

      {/* Commission Plan Warning */}
      {!hasCommissionPlan && (
        <CommissionPlanWarning agentName={agent.agentName} />
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                Total Commission
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(agent.totalCommission)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                Avg per Deal
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(avgCommissionPerDeal)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                Commission Rate
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {commissionEfficiency}%
              </p>
            </div>
            <Percent className="w-8 h-8 text-amber-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wide">
                Total Deals
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {agentTransactions.length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Commission Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Commission Split
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={commissionBySide}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {commissionBySide.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {commissionBySide.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[idx] }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Commission by Status */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Commission by Status
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={commissionByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="status"
                tick={{ fill: '#888', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#888', fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="commission" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Commission by Property Type */}
      {commissionByPropertyType.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Commission by Property Type
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={commissionByPropertyType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="type"
                tick={{ fill: '#888', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: '#888', fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="commission" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Commission Timeline */}
      {commissionTimeline.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Commission Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={commissionTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#888', fontSize: 12 }}
              />
              <YAxis tick={{ fill: '#888', fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="commission"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
