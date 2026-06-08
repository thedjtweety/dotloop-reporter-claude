import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { MapPin, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export default function MarketPage() {
  const { allRecords, hasData, activateDemoMode } = useTransactionData();
  const [activeTab, setActiveTab] = useState<'geographic' | 'seasonal' | 'property' | 'pricing'>('geographic');
  const [period, setPeriod] = useState('YTD');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // Geographic breakdown
  const stateMap: Record<string, { count: number; volume: number; gci: number }> = {};
  allRecords.forEach(r => {
    const state = r.state || 'Unknown';
    if (!stateMap[state]) stateMap[state] = { count: 0, volume: 0, gci: 0 };
    stateMap[state].count++;
    stateMap[state].volume += r.salePrice || r.price || 0;
    stateMap[state].gci += r.commissionTotal || 0;
  });
  const stateData = Object.entries(stateMap)
    .map(([state, d]) => ({ state, ...d, avgPrice: d.count > 0 ? d.volume / d.count : 0 }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);

  // Property type breakdown
  const propMap: Record<string, number> = {};
  allRecords.forEach(r => {
    const t = r.transactionType || r.propertyType || 'Unknown';
    propMap[t] = (propMap[t] || 0) + 1;
  });
  const propData = Object.entries(propMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Seasonal data
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(0, i).toLocaleString('default', { month: 'short' });
    const recs = allRecords.filter(r => {
      const d = r.closingDate ? new Date(r.closingDate) : null;
      return d && d.getMonth() === i;
    });
    return {
      month,
      deals: recs.length,
      volume: recs.reduce((s, r) => s + (r.salePrice || r.price || 0), 0),
      avgPrice: recs.length > 0 ? recs.reduce((s, r) => s + (r.salePrice || r.price || 0), 0) / recs.length : 0,
    };
  });

  // Price distribution
  const priceRanges = [
    { label: '<$200K', min: 0, max: 200000 },
    { label: '$200K-$400K', min: 200000, max: 400000 },
    { label: '$400K-$600K', min: 400000, max: 600000 },
    { label: '$600K-$800K', min: 600000, max: 800000 },
    { label: '$800K-$1M', min: 800000, max: 1000000 },
    { label: '>$1M', min: 1000000, max: Infinity },
  ];
  const priceData = priceRanges.map(r => ({
    label: r.label,
    min: r.min,
    max: r.max,
    count: allRecords.filter(rec => {
      const p = rec.salePrice || rec.price || 0;
      return p >= r.min && p < r.max;
    }).length,
  }));

  const totalVolume = allRecords.reduce((s, r) => s + (r.salePrice || r.price || 0), 0);
  const totalDeals = allRecords.length;
  const avgPrice = totalDeals > 0 ? totalVolume / totalDeals : 0;
  const topState = stateData[0];

  if (!hasData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-lg font-semibold mb-2">No Market Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
          Upload a Dotloop CSV export to analyze geographic, seasonal, and property type market trends.
        </p>
        <button onClick={activateDemoMode} className="px-4 py-2 rounded bg-emerald-500 text-white text-sm hover:bg-emerald-600">
          Load Demo Data
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-400" />
            Market Insights
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Geographic, seasonal, and property type analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {(['30d', '90d', 'YTD', '1Y', 'All'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                period === p ? 'bg-emerald-500 text-white' : 'border border-border text-muted-foreground hover:bg-secondary'
              }`}
            >{p}</button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Volume', value: formatCurrency(totalVolume), sub: `${totalDeals} transactions`, color: 'text-emerald-400', records: allRecords },
          { label: 'Avg Sale Price', value: formatCurrency(avgPrice), sub: 'per transaction', color: 'text-blue-400', records: allRecords.filter(r => r.loopStatus === 'Closed' || r.loopStatus === 'Sold') },
          { label: 'Markets Active', value: Object.keys(stateMap).length.toString(), sub: 'states/regions', color: 'text-purple-400', records: allRecords },
          { label: 'Top Market', value: topState?.state || '—', sub: topState ? formatCurrency(topState.volume) : '', color: 'text-orange-400', records: topState ? allRecords.filter(r => r.state === topState.state) : [] },
        ].map(card => (
          <div key={card.label} className="bg-secondary border border-border rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setDrillTarget({ title: card.label, records: card.records })}>
            <div className="text-muted-foreground text-sm mb-1">{card.label}</div>
            <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-muted-foreground text-xs mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {[
          { key: 'geographic', label: 'Geographic' },
          { key: 'seasonal', label: 'Seasonal Trends' },
          { key: 'property', label: 'Property Types' },
          { key: 'pricing', label: 'Price Distribution' },
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

      {/* Geographic tab */}
      {activeTab === 'geographic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-foreground font-semibold mb-4">Volume by State/Region</h2>
            {stateData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Upload CSV to see geographic data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" horizontal={false} />
                  <XAxis type="number" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="state" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(v: any) => [formatCurrency(v), 'Volume']}
                  />
                  <Bar dataKey="volume" fill="#10b981" radius={[0, 4, 4, 0]} cursor="pointer"
                    onClick={(data) => setDrillTarget({ title: `${data.state} — Transactions`, records: allRecords.filter(r => r.state === data.state) })} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-foreground font-semibold mb-4">Top Markets</h2>
            {stateData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No data available</div>
            ) : (
              <div className="space-y-3">
                {stateData.map((d, i) => (
                  <div key={d.state} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setDrillTarget({ title: `${d.state} — Transactions`, records: allRecords.filter(r => r.state === d.state) })}>
                    <span className="text-muted-foreground text-sm w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-200 text-sm">{d.state}</span>
                        <span className="text-muted-foreground text-xs">{d.count} deals · {formatCurrency(d.avgPrice)} avg</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(d.volume / (stateData[0]?.volume || 1)) * 100}%`,
                            background: COLORS[i % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-emerald-400 text-sm font-medium w-24 text-right">{formatCurrency(d.volume)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seasonal tab */}
      {activeTab === 'seasonal' && (
        <div className="bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold mb-4">Monthly Deal Volume</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="month" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="deals" fill="#10b981" radius={[4, 4, 0, 0]} name="Deals" cursor="pointer"
                onClick={(data: any) => setDrillTarget({ title: `${data.month} — Transactions`, records: allRecords.filter(r => { const d = r.closingDate ? new Date(r.closingDate) : null; return d && d.toLocaleString('default', { month: 'short' }) === data.month; }) })} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Property types tab */}
      {activeTab === 'property' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-foreground font-semibold mb-4">Property Type Distribution</h2>
            {propData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Upload CSV to see property data</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={propData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {propData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-foreground font-semibold mb-4">Breakdown</h2>
            <div className="space-y-3">
              {propData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setDrillTarget({ title: `${d.name} — Transactions`, records: allRecords.filter(r => (r.transactionType || r.propertyType || 'Unknown') === d.name) })}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-200 text-sm">{d.name}</span>
                      <span className="text-muted-foreground text-sm">{d.value} deals</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full">
                      <div className="h-full rounded-full" style={{ width: `${(d.value / (propData[0]?.value || 1)) * 100}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Price distribution tab */}
      {activeTab === 'pricing' && (
        <div className="bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold mb-4">Price Range Distribution</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={priceData} margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="label" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Deals" cursor="pointer"
                onClick={(data: any) => setDrillTarget({ title: `${data.label} — Transactions`, records: allRecords.filter(rec => { const p = rec.salePrice || rec.price || 0; return p >= data.min && p < data.max; }) })} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
