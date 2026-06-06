import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { Clock, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

export default function TimelinePage() {
  const { allRecords, agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [activeTab, setActiveTab] = useState<'lifecycle' | 'velocity' | 'bottlenecks' | 'agent'>('lifecycle');
  const [period, setPeriod] = useState('90d');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // Calculate days to close for each record
  const closedRecords = allRecords.filter(r => {
    const close = r.closingDate ? new Date(r.closingDate) : null;
    return close && !isNaN(close.getTime()) && (r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
  });

  // Days to close distribution
  const dtcBuckets = [
    { label: '0-15', min: 0, max: 15 },
    { label: '16-30', min: 16, max: 30 },
    { label: '31-45', min: 31, max: 45 },
    { label: '46-60', min: 46, max: 60 },
    { label: '61-90', min: 61, max: 90 },
    { label: '91-120', min: 91, max: 120 },
    { label: '120+', min: 120, max: Infinity },
  ];

  const dtcData = dtcBuckets.map(b => ({
    label: b.label,
    count: closedRecords.filter(r => {
      const close = new Date(r.closingDate!);
      const open = r.createdDate ? new Date(r.createdDate) : null;
      if (!open) return false;
      const days = (close.getTime() - open.getTime()) / (1000 * 60 * 60 * 24);
      return days >= b.min && days < b.max;
    }).length,
  }));

  const avgDaysToClose = (() => {
    const daysArr = closedRecords.map(r => {
      const close = new Date(r.closingDate!);
      const open = r.createdDate ? new Date(r.createdDate) : null;
      if (!open) return null;
      return (close.getTime() - open.getTime()) / (1000 * 60 * 60 * 24);
    }).filter((d): d is number => d !== null);
    return daysArr.length > 0 ? daysArr.reduce((s, d) => s + d, 0) / daysArr.length : 0;
  })();

  // Stage duration breakdown
  const stageDurations = [
    { stage: 'Listing to Contract', days: 18, color: '#10b981' },
    { stage: 'Contract to Inspection', days: 7, color: '#3b82f6' },
    { stage: 'Inspection to Appraisal', days: 5, color: '#f59e0b' },
    { stage: 'Appraisal to Clear to Close', days: 8, color: '#8b5cf6' },
    { stage: 'Clear to Close to Closing', days: 3, color: '#ef4444' },
  ];

  const totalStageDays = stageDurations.reduce((s, d) => s + d.days, 0);

  if (!hasData) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">No Timeline Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center mb-6">
          Upload a Dotloop CSV export to analyze transaction velocity and lifecycle stages.
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
            <Clock className="w-6 h-6 text-emerald-400" />
            Listing-to-Close Timeline
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Transaction velocity and lifecycle analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {(['30d', '60d', '90d', 'YTD', '1Y'] as const).map(p => (
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
          { label: 'Avg Days to Close', value: avgDaysToClose > 0 ? `${avgDaysToClose.toFixed(0)} days` : '—', sub: 'listing to close', color: 'text-emerald-400', records: closedRecords },
          { label: 'Closed Transactions', value: closedRecords.length.toString(), sub: 'in period', color: 'text-blue-400', records: closedRecords },
          { label: 'Fastest Close', value: (() => {
            const min = Math.min(...closedRecords.map(r => {
              const c = new Date(r.closingDate!);
              const o = r.createdDate ? new Date(r.createdDate) : null;
              if (!o) return Infinity;
              return (c.getTime() - o.getTime()) / (1000 * 60 * 60 * 24);
            }).filter(d => isFinite(d)));
            return isFinite(min) ? `${min.toFixed(0)} days` : '—';
          })(), sub: 'record', color: 'text-yellow-400', records: [...closedRecords].sort((a, b) => {
            const da = a.closingDate && a.createdDate ? (new Date(a.closingDate).getTime() - new Date(a.createdDate).getTime()) : Infinity;
            const db = b.closingDate && b.createdDate ? (new Date(b.closingDate).getTime() - new Date(b.createdDate).getTime()) : Infinity;
            return da - db;
          }) },
          { label: 'Active Transactions', value: allRecords.filter(r => !r.loopStatus?.toLowerCase().includes('closed') && !r.loopStatus?.toLowerCase().includes('sold')).length.toString(), sub: 'in pipeline', color: 'text-purple-400', records: allRecords.filter(r => !r.loopStatus?.toLowerCase().includes('closed') && !r.loopStatus?.toLowerCase().includes('sold')) },
        ].map(card => (
          <div key={card.label} className="bg-secondary border border-border rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setDrillTarget({ title: card.label, records: card.records })}>
            <div className="text-muted-foreground text-sm mb-1">{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-muted-foreground text-xs mt-1">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {[
          { key: 'lifecycle', label: 'Lifecycle Analysis' },
          { key: 'velocity', label: 'Deal Velocity' },
          { key: 'bottlenecks', label: 'Bottlenecks' },
          { key: 'agent', label: 'By Agent' },
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

      {activeTab === 'lifecycle' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stage breakdown */}
          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Average Stage Duration</h2>
            <div className="space-y-3">
              {stageDurations.map(stage => (
                <div key={stage.stage}>
                  <div className="flex justify-between mb-1">
                    <span className="text-foreground text-sm">{stage.stage}</span>
                    <span className="text-muted-foreground text-sm">{stage.days} days</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(stage.days / totalStageDays) * 100}%`, background: stage.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <span className="text-muted-foreground text-sm">Total Average</span>
              <span className="text-white font-semibold">{totalStageDays} days</span>
            </div>
          </div>

          {/* Days to close distribution */}
          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Days to Close Distribution</h2>
            {closedRecords.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Upload CSV with closed transactions</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dtcData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                  <XAxis dataKey="label" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0f1923', border: '1px solid #1e2d3d', borderRadius: 8 }} labelStyle={{ color: '#fff' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Transactions" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeTab === 'velocity' && (
        <div className="bg-secondary border border-border rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Monthly Deal Velocity (Deals Closed per Month)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={Array.from({ length: 12 }, (_, i) => {
                const month = new Date(0, i).toLocaleString('default', { month: 'short' });
                const recs = allRecords.filter(r => {
                  const d = r.closingDate ? new Date(r.closingDate) : null;
                  return d && d.getMonth() === i && (r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
                });
                const avgDays = (() => {
                  const daysArr = recs.map(r => {
                    const c = new Date(r.closingDate!);
                    const o = r.createdDate ? new Date(r.createdDate) : null;
                    if (!o) return null;
                    return (c.getTime() - o.getTime()) / (1000 * 60 * 60 * 24);
                  }).filter((d): d is number => d !== null);
                  return daysArr.length > 0 ? daysArr.reduce((s, d) => s + d, 0) / daysArr.length : 0;
                })();
                return { month, deals: recs.length, avgDays: Math.round(avgDays) };
              })}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }} />
              <Bar yAxisId="left" dataKey="deals" fill="#10b981" radius={[4, 4, 0, 0]} name="Deals Closed" />
              <Bar yAxisId="right" dataKey="avgDays" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Avg Days to Close" opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500 rounded inline-block" /> Deals Closed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded inline-block opacity-70" /> Avg Days to Close</span>
          </div>
        </div>
      )}

      {activeTab === 'bottlenecks' && (
        <div className="space-y-4">
          <div className="bg-secondary border border-border rounded-xl p-5">
            <h2 className="text-white font-semibold mb-2">Stage Duration Breakdown</h2>
            <p className="text-muted-foreground text-xs mb-4">Industry benchmarks for each transaction stage. Longer durations indicate potential bottlenecks.</p>
            <div className="space-y-4">
              {stageDurations.map(stage => (
                <div key={stage.stage}>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-200 text-sm">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">Benchmark: {stage.days} days</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        stage.days <= 7 ? 'bg-emerald-500/20 text-emerald-400' :
                        stage.days <= 14 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{stage.days <= 7 ? 'Fast' : stage.days <= 14 ? 'Normal' : 'Slow'}</span>
                    </div>
                  </div>
                  <div className="h-3 bg-secondary rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(stage.days / totalStageDays) * 100}%`, background: stage.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agent' && (
        <div className="bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-white font-semibold">Agent Transaction Velocity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs bg-secondary">
                  <th className="px-4 py-3 text-left">Agent</th>
                  <th className="px-4 py-3 text-right">Closed Deals</th>
                  <th className="px-4 py-3 text-right">Total Transactions</th>
                  <th className="px-4 py-3 text-right">Closing Rate</th>
                  <th className="px-4 py-3 text-right">Avg Sale Price</th>
                  <th className="px-4 py-3 text-right">Total GCI</th>
                </tr>
              </thead>
              <tbody>
                {agentMetrics.slice(0, 20).map(a => (
                  <tr key={a.agentName} className="border-b border-border hover:bg-secondary/30 cursor-pointer"
                    onClick={() => setDrillTarget({ title: `${a.agentName} — Transactions`, records: allRecords.filter(r => (r.agents || '').includes(a.agentName)) })}>
                    <td className="px-4 py-3 text-gray-200">{a.agentName}</td>
                    <td className="px-4 py-3 text-right text-emerald-400">{a.closedDeals}</td>
                    <td className="px-4 py-3 text-right text-foreground">{a.totalTransactions}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs font-medium ${
                        a.closingRate >= 70 ? 'text-emerald-400' :
                        a.closingRate >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>{a.closingRate.toFixed(0)}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{formatCurrency(a.averageSalesPrice)}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(a.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
