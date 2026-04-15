import { useState, useMemo } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { BarChart3, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ForecastingPage() {
  const { allRecords, metrics, agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [scenario, setScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate');
  const [period, setPeriod] = useState('Q4');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'revenue' | 'agent' | 'market'>('pipeline');

  const currentMonth = new Date().getMonth();

  // Build monthly actuals from records
  const monthlyActuals = MONTHS.map((m, i) => {
    const recs = allRecords.filter(r => {
      const d = r.closingDate ? new Date(r.closingDate) : null;
      return d && d.getMonth() === i && d.getFullYear() === new Date().getFullYear();
    });
    return {
      month: m,
      actual: recs.reduce((s, r) => s + (r.commissionTotal || 0), 0),
      deals: recs.length,
      volume: recs.reduce((s, r) => s + (r.salePrice || r.price || 0), 0),
    };
  });

  const avgMonthlyGCI = monthlyActuals.slice(0, currentMonth + 1).reduce((s, m) => s + m.actual, 0) / Math.max(1, currentMonth + 1);
  const multipliers = { conservative: 0.85, moderate: 1.0, optimistic: 1.2 };
  const mult = multipliers[scenario];

  const forecastData = MONTHS.map((m, i) => ({
    month: m,
    actual: i <= currentMonth ? monthlyActuals[i].actual : null,
    forecast: i > currentMonth ? avgMonthlyGCI * mult : null,
    deals: i <= currentMonth ? monthlyActuals[i].deals : null,
    forecastDeals: i > currentMonth ? Math.round((monthlyActuals.slice(0, currentMonth + 1).reduce((s, m) => s + m.deals, 0) / Math.max(1, currentMonth + 1)) * mult) : null,
  }));

  const projectedAnnualGCI = monthlyActuals.slice(0, currentMonth + 1).reduce((s, m) => s + m.actual, 0) +
    MONTHS.slice(currentMonth + 1).length * avgMonthlyGCI * mult;
  const earnedGCI = monthlyActuals.slice(0, currentMonth + 1).reduce((s, m) => s + m.actual, 0);
  const remainingMonths = 11 - currentMonth;

  // Pipeline stages from records
  const pipelineStages = [
    { stage: 'Active', count: allRecords.filter(r => r.loopStatus?.toLowerCase().includes('active')).length, color: '#10b981' },
    { stage: 'Under Contract', count: allRecords.filter(r => r.loopStatus?.toLowerCase().includes('contract') || r.loopStatus?.toLowerCase().includes('pending')).length, color: '#3b82f6' },
    { stage: 'Closing Soon', count: allRecords.filter(r => {
      const d = r.closingDate ? new Date(r.closingDate) : null;
      if (!d) return false;
      const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).length, color: '#f59e0b' },
    { stage: 'Closed', count: allRecords.filter(r => r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold')).length, color: '#8b5cf6' },
  ];

  if (!hasData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="w-16 h-16 rounded-full bg-[#1a2332] flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">No Data for Forecasting</h3>
        <p className="text-gray-400 text-sm max-w-sm text-center mb-6">
          Upload a CSV file from the Dashboard to generate revenue forecasts, or try the demo mode.
        </p>
        <Button onClick={activateDemoMode} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          Load Demo Data
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" />
            Pipeline Forecasting
          </h1>
          <p className="text-gray-400 text-sm mt-1">AI-powered revenue and deal projections</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={scenario}
            onChange={e => setScenario(e.target.value as any)}
            className="bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
          >
            <option value="conservative">Conservative (-15%)</option>
            <option value="moderate">Moderate (Baseline)</option>
            <option value="optimistic">Optimistic (+20%)</option>
          </select>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">
            {period} <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Projected Annual GCI', value: formatCurrency(projectedAnnualGCI), sub: `${scenario} scenario`, icon: '📈', color: 'text-emerald-400' },
          { label: 'GCI Earned YTD', value: formatCurrency(earnedGCI), sub: `${currentMonth + 1} months`, icon: '$', color: 'text-blue-400' },
          { label: 'Remaining Months', value: remainingMonths.toString(), sub: 'to year end', icon: '📅', color: 'text-purple-400' },
          { label: 'Active Pipeline', value: pipelineStages[0].count + pipelineStages[1].count, sub: 'deals in progress', icon: '◎', color: 'text-orange-400' },
        ].map(card => (
          <div key={card.label} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-gray-400 text-sm">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-gray-500 text-xs mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#1e2d3d]">
        {[
          { key: 'pipeline', label: 'Pipeline Forecast' },
          { key: 'revenue', label: 'Revenue Forecast' },
          { key: 'agent', label: 'Agent Projections' },
          { key: 'market', label: 'Market Conditions' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {/* Pipeline stages */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {pipelineStages.map(stage => (
          <div key={stage.stage} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
              <span className="text-gray-400 text-sm">{stage.stage}</span>
            </div>
            <div className="text-2xl font-bold text-white">{stage.count}</div>
            <div className="text-gray-500 text-xs mt-1">transactions</div>
          </div>
        ))}
      </div>

      {/* Agent Projections Tab */}
      {activeTab === 'agent' && (
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#1e2d3d]">
            <h2 className="text-white font-semibold">Agent GCI Projections ({scenario})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2d3d] text-gray-400 text-xs bg-[#0a0f16]">
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">YTD GCI</th>
                  <th className="px-4 py-3 text-right">Projected Annual</th>
                  <th className="px-4 py-3 text-right">Deals YTD</th>
                  <th className="px-4 py-3 text-right">Proj. Deals</th>
                  <th className="px-4 py-3 text-right">Trend</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.slice(0, 20).map(a => {
                  const projGCI = a.totalCommission * (12 / Math.max(1, new Date().getMonth() + 1)) * multipliers[scenario];
                  const projDeals = Math.round(a.closedDeals * (12 / Math.max(1, new Date().getMonth() + 1)) * multipliers[scenario]);
                  return (
                    <tr key={a.agentName} className="border-b border-[#1a2332] hover:bg-[#1a2332]/30">
                      <td className="px-4 py-3 text-gray-200">{a.agentName}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(a.totalCommission)}</td>
                      <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(projGCI)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{a.closedDeals}</td>
                      <td className="px-4 py-3 text-right text-blue-400">{projDeals}</td>
                      <td className="px-4 py-3 text-right">
                        {scenario === 'optimistic' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400 ml-auto" />
                        ) : scenario === 'conservative' ? (
                          <TrendingDown className="w-4 h-4 text-red-400 ml-auto" />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forecast chart */}
      <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">
            {activeTab === 'pipeline' ? 'Monthly GCI Forecast' : activeTab === 'revenue' ? 'Revenue Forecast' : 'Projections'}
          </h2>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Actual</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block border-dashed border-t border-blue-500" /> Forecast</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={forecastData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
            <XAxis dataKey="month" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
            <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              formatter={(v: any) => [formatCurrency(v), '']}
            />
            <ReferenceLine x={MONTHS[currentMonth]} stroke="#4b5563" strokeDasharray="4 4" label={{ value: 'Today', fill: '#9ca3af', fontSize: 11 }} />
            <Bar dataKey="actual" fill="#10b981" radius={[4, 4, 0, 0]} name="Actual" />
            <Bar dataKey="forecast" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Forecast" opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
