import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { TrendingUp, Search, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const CURRENT_YEAR = new Date().getFullYear();
const ALL_YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

interface YearData {
  year: number;
  volume: number;
  gci: number;
  deals: number;
  avgPrice: number;
}

export default function TrendsPage() {
  const ctx = useTransactionData();
  const allRecords = ctx.allRecords || [];
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set([2024, 2025, 2026]));
  const [activeTab, setActiveTab] = useState<'year' | 'monthly' | 'quarterly' | 'agent' | 'compare'>('year');
  const [metric, setMetric] = useState<'volume' | 'gci' | 'deals' | 'avgPrice' | 'companyDollar'>('volume');
  const [agentFilter, setAgentFilter] = useState('');

  // Build year data from records
  const yearDataMap: Record<number, YearData> = {};
  allRecords.forEach(r => {
    const date = r.closingDate ? new Date(r.closingDate) : null;
    if (!date || isNaN(date.getTime())) return;
    const y = date.getFullYear();
    if (!yearDataMap[y]) yearDataMap[y] = { year: y, volume: 0, gci: 0, deals: 0, avgPrice: 0 };
    yearDataMap[y].volume += r.salePrice || r.price || 0;
    yearDataMap[y].gci += r.commissionTotal || 0;
    yearDataMap[y].deals += 1;
  });
  Object.values(yearDataMap).forEach(d => {
    d.avgPrice = d.deals > 0 ? d.volume / d.deals : 0;
  });

  const yearDataArr = ALL_YEARS.map(y => yearDataMap[y] || { year: y, volume: 0, gci: 0, deals: 0, avgPrice: 0 });
  const selectedData = yearDataArr.filter(d => selectedYears.has(d.year));

  const toggleYear = (y: number) => {
    setSelectedYears(prev => {
      const next = new Set(prev);
      if (next.has(y)) { if (next.size > 1) next.delete(y); } else next.add(y);
      return next;
    });
  };

  const getPctChange = (curr: number, prev: number) => {
    if (!prev) return null;
    return ((curr - prev) / prev * 100).toFixed(1);
  };

  const metricLabel: Record<typeof metric, string> = {
    volume: 'Volume',
    gci: 'GCI',
    deals: 'Deals',
    avgPrice: 'Avg Price',
    companyDollar: 'Company $',
  };

  const formatMetric = (v: number) => {
    if (metric === 'deals') return v.toString();
    return formatCurrency(v);
  };

  const chartData = selectedData.map(d => ({
    year: d.year.toString(),
    value: (d as any)[metric] ?? 0,
  }));

  // Monthly overlay data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(0, i).toLocaleString('default', { month: 'short' });
    const entry: any = { month };
    selectedYears.forEach(y => {
      const recs = allRecords.filter(r => {
        const d = r.closingDate ? new Date(r.closingDate) : null;
        return d && d.getFullYear() === y && d.getMonth() === i;
      });
      entry[y] = recs.reduce((s, r) => s + ((r as any)[metric === 'volume' ? 'salePrice' : metric === 'gci' ? 'commissionTotal' : 'salePrice'] || 0), 0);
    });
    return entry;
  });

  const YEAR_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Multi-Year Trends
          </h1>
          <p className="text-gray-400 text-sm mt-1">Year-over-year performance comparison</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">
            Saved Views
          </button>
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-sm mr-1">Years:</span>
            {ALL_YEARS.map(y => (
              <button
                key={y}
                onClick={() => toggleYear(y)}
                className={`px-2.5 py-1 rounded text-sm transition-colors ${
                  selectedYears.has(y) ? 'bg-emerald-500 text-white' : 'border border-[#1e2d3d] text-gray-400 hover:bg-[#1a2332]'
                }`}
              >{y}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              placeholder="Filter by agent..."
              className="bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-40"
            />
          </div>
          <button className="px-3 py-1.5 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600">Apply</button>
        </div>
      </div>

      {/* Year summary cards */}
      <div className="flex gap-4 mb-6 overflow-x-auto pb-1">
        {selectedData.map((d, i) => {
          const prev = selectedData[i - 1];
          const pct = prev ? getPctChange(d.volume, prev.volume) : null;
          return (
            <div key={d.year} className={`bg-[#0f1923] border rounded-xl p-4 min-w-[180px] ${
              pct && parseFloat(pct) > 0 ? 'border-emerald-500/30' : pct && parseFloat(pct) < 0 ? 'border-red-500/30' : 'border-[#1e2d3d]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-bold text-lg">{d.year}</span>
                {pct && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    parseFloat(pct) > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {parseFloat(pct) > 0 ? '↗' : '↘'} {Math.abs(parseFloat(pct))}%
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Volume</span><span className="text-gray-200">{formatCurrency(d.volume)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">GCI</span><span className="text-gray-200">{formatCurrency(d.gci)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Deals</span><span className="text-gray-200">{d.deals}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Avg Price</span><span className="text-gray-200">{formatCurrency(d.avgPrice)}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#1e2d3d]">
        {[
          { key: 'year', label: 'Year Comparison' },
          { key: 'monthly', label: 'Monthly Overlay' },
          { key: 'quarterly', label: 'Quarterly Summary' },
          { key: 'agent', label: 'Agent Trends' },
          { key: 'compare', label: 'Compare Periods' },
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

      {/* Metric selector */}
      <div className="flex items-center gap-2 mb-4">
        {(['volume', 'gci', 'deals', 'avgPrice', 'companyDollar'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              metric === m ? 'bg-emerald-500 text-white' : 'border border-[#1e2d3d] text-gray-400 hover:bg-[#1a2332]'
            }`}
          >
            {m === 'volume' ? '$ ' : m === 'gci' ? '$ ' : m === 'deals' ? '# ' : m === 'avgPrice' ? '🏠 ' : '🏢 '}
            {metricLabel[m]}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-400 text-sm hover:bg-[#1a2332]">
          <MessageSquare className="w-4 h-4" /> Add Annotation
        </button>
      </div>

      {/* Chart */}
      <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">
          {activeTab === 'monthly' ? 'Monthly Overlay' : `Year-over-Year ${metricLabel[metric]}`}
        </h2>
        {activeTab === 'year' && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="year" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={v => metric === 'deals' ? v : `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(v: any) => [formatMetric(v), metricLabel[metric]]}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        {activeTab === 'monthly' && (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="month" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} tickFormatter={v => metric === 'deals' ? v : `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
              {Array.from(selectedYears).map((y, i) => (
                <Line key={y} type="monotone" dataKey={y} stroke={YEAR_COLORS[i % YEAR_COLORS.length]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
        {(activeTab === 'quarterly' || activeTab === 'agent' || activeTab === 'compare') && (
          <div className="text-center py-16 text-gray-500">
            <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Upload CSV data to see {activeTab} analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
