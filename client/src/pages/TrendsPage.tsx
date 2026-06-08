import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { TrendingUp, Search, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

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
  const { allRecords, agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set([2024, 2025, 2026]));
  const [activeTab, setActiveTab] = useState<'year' | 'monthly' | 'quarterly' | 'agent' | 'compare'>('year');
  const [metric, setMetric] = useState<'volume' | 'gci' | 'deals' | 'avgPrice' | 'companyDollar'>('volume');
  const [agentFilter, setAgentFilter] = useState('');
  const [drillTarget, setDrillTarget] = useState<{ title: string; records: any[]; subtitle?: string } | null>(null);

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

  if (!hasData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">No Trend Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
          Upload a Dotloop CSV export to analyze multi-year performance trends, or try demo mode.
        </p>
        <button onClick={activateDemoMode} className="px-4 py-2 rounded bg-emerald-500 text-white text-sm hover:bg-emerald-600">
          Load Demo Data
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            Multi-Year Trends
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Year-over-year performance comparison</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-foreground text-sm hover:bg-secondary">
            Saved Views
          </button>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm mr-1">Years:</span>
            {ALL_YEARS.map(y => (
              <button
                key={y}
                onClick={() => toggleYear(y)}
                className={`px-2.5 py-1 rounded text-sm transition-colors ${
                  selectedYears.has(y) ? 'bg-emerald-500 text-white' : 'border border-border text-muted-foreground hover:bg-secondary'
                }`}
              >{y}</button>
            ))}
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              placeholder="Filter by agent..."
              className="bg-secondary border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-40"
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
            <div key={d.year} className={`bg-secondary border rounded-xl p-4 min-w-[180px] cursor-pointer hover:opacity-80 transition-opacity ${
              pct && parseFloat(pct) > 0 ? 'border-emerald-500/30' : pct && parseFloat(pct) < 0 ? 'border-red-500/30' : 'border-border'
            }`}
            onClick={() => {
              const recs = allRecords.filter(r => {
                const date = r.closingDate ? new Date(r.closingDate) : null;
                return date && !isNaN(date.getTime()) && date.getFullYear() === d.year;
              });
              setDrillTarget({ title: `${d.year} Transactions`, records: recs });
            }}
          >
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
                <div className="flex justify-between"><span className="text-muted-foreground">Volume</span><span className="text-gray-200">{formatCurrency(d.volume)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">GCI</span><span className="text-gray-200">{formatCurrency(d.gci)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Deals</span><span className="text-gray-200">{d.deals}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Avg Price</span><span className="text-gray-200">{formatCurrency(d.avgPrice)}</span></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
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
              activeTab === tab.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-muted-foreground hover:text-gray-200'
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
              metric === m ? 'bg-emerald-500 text-white' : 'border border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            {m === 'volume' ? '$ ' : m === 'gci' ? '$ ' : m === 'deals' ? '# ' : m === 'avgPrice' ? '🏠 ' : '🏢 '}
            {metricLabel[m]}
          </button>
        ))}
        <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-muted-foreground text-sm hover:bg-secondary">
          <MessageSquare className="w-4 h-4" /> Add Annotation
        </button>
      </div>

      {/* Chart */}
      <div className="bg-secondary border border-border rounded-xl p-5">
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
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} cursor="pointer"
                onClick={(data: any) => {
                  const y = parseInt(data.year);
                  setDrillTarget({ title: `${data.year} Transactions`, records: allRecords.filter(r => { const d = r.closingDate ? new Date(r.closingDate) : null; return d && d.getFullYear() === y; }) });
                }} />
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
        {activeTab === 'quarterly' && (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={[1, 2, 3, 4].map(q => {
                const entry: any = { quarter: `Q${q}` };
                Array.from(selectedYears).forEach(y => {
                  const recs = allRecords.filter(r => {
                    const d = r.closingDate ? new Date(r.closingDate) : null;
                    if (!d || d.getFullYear() !== y) return false;
                    const m = d.getMonth();
                    return Math.floor(m / 3) + 1 === q;
                  });
                  entry[`${y}`] = metric === 'deals' ? recs.length :
                    recs.reduce((s, r) => s + ((metric === 'gci' ? r.commissionTotal : r.salePrice || r.price) || 0), 0);
                });
                return entry;
              })}
              margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="quarter" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => metric === 'deals' ? v : `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }} />
              {Array.from(selectedYears).map((y, i) => (
                <Bar key={y} dataKey={`${y}`} fill={YEAR_COLORS[i % YEAR_COLORS.length]} radius={[4, 4, 0, 0]} name={`${y}`} cursor="pointer"
                  onClick={(data: any) => {
                    const q = parseInt(String(data.quarter).replace('Q', ''));
                    setDrillTarget({ title: `${y} ${data.quarter} Transactions`, records: allRecords.filter(r => { const d = r.closingDate ? new Date(r.closingDate) : null; return d && d.getFullYear() === y && Math.floor(d.getMonth() / 3) + 1 === q; }) });
                  }} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {activeTab === 'agent' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="py-3 text-left">Agent</th>
                  {Array.from(selectedYears).sort().map(y => (
                    <th key={y} className="py-3 text-right">{y} GCI</th>
                  ))}
                  <th className="py-3 text-right">YoY Change</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.slice(0, 20).map(a => {
                  const gciByYear: Record<number, number> = {};
                  Array.from(selectedYears).forEach(y => {
                    const recs = allRecords.filter(r => {
                      const d = r.closingDate ? new Date(r.closingDate) : null;
                      return d && d.getFullYear() === y && (r.agentName === a.agentName || r.listingAgent === a.agentName || r.buyerAgent === a.agentName);
                    });
                    gciByYear[y] = recs.reduce((s, r) => s + (r.commissionTotal || 0), 0);
                  });
                  const years = Array.from(selectedYears).sort();
                  const last = gciByYear[years[years.length - 1]] || 0;
                  const prev = gciByYear[years[years.length - 2]] || 0;
                  const pct = prev > 0 ? ((last - prev) / prev * 100).toFixed(1) : null;
                  return (
                    <tr key={a.agentName} className="border-b border-border hover:bg-secondary/30 cursor-pointer"
                      onClick={() => {
                        const recs = allRecords.filter(r => r.agentName === a.agentName || r.listingAgent === a.agentName || r.buyerAgent === a.agentName || (r.agents || '').includes(a.agentName));
                        setDrillTarget({ title: `${a.agentName} — All Transactions`, records: recs });
                      }}>
                      <td className="py-3 text-gray-200">{a.agentName}</td>
                      {years.map(y => (
                        <td key={y} className="py-3 text-right text-foreground">{formatCurrency(gciByYear[y] || 0)}</td>
                      ))}
                      <td className="py-3 text-right">
                        {pct ? (
                          <span className={`text-xs font-medium ${parseFloat(pct) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {parseFloat(pct) >= 0 ? '+' : ''}{pct}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'compare' && (
          <div className="grid grid-cols-2 gap-6">
            {Array.from(selectedYears).sort().slice(-2).map((y, i, arr) => {
              const data = yearDataMap[y] || { year: y, volume: 0, gci: 0, deals: 0, avgPrice: 0 };
              const prevData = i > 0 ? (yearDataMap[arr[i-1]] || { volume: 0, gci: 0, deals: 0, avgPrice: 0 }) : null;
              return (
                <div key={y} className="space-y-3">
                  <h3 className="text-white font-semibold text-lg">{y}</h3>
                  {[['Volume', data.volume, prevData?.volume], ['GCI', data.gci, prevData?.gci], ['Deals', data.deals, prevData?.deals], ['Avg Price', data.avgPrice, prevData?.avgPrice]].map(([label, val, pval]) => {
                    const pct = pval && (pval as number) > 0 ? (((val as number) - (pval as number)) / (pval as number) * 100).toFixed(1) : null;
                    return (
                      <div key={label as string} className="bg-secondary rounded-lg p-3">
                        <div className="text-muted-foreground text-xs mb-1">{label as string}</div>
                        <div className="text-white font-bold">{label === 'Deals' ? val : formatCurrency(val as number)}</div>
                        {pct && <div className={`text-xs mt-1 ${parseFloat(pct) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{parseFloat(pct) >= 0 ? '+' : ''}{pct}% vs {arr[i-1]}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
