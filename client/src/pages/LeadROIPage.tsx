import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp, Target, BarChart2 } from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';

// ─── Mock spend data (no spend field in CSV) ─────────────────────────────────

const SPEND_BY_SOURCE: Record<string, number> = {
  Referral:      0,
  Zillow:        18000,
  Realtor:       14400,
  'Open House':  2400,
  LinkedIn:      6000,
  'Cold Outreach': 3600,
  Social:        9600,
  Other:         4800,
  Unknown:       0,
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compactCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LeadROIPage() {
  const { filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const [highlightSource, setHighlightSource] = useState<string | null>(null);

  // Aggregate GCI by source
  const bySource = useMemo(() => {
    const map: Record<string, { gci: number; deals: number; volume: number }> = {};
    for (const r of filteredRecords) {
      if (r.loopStatus !== 'Closed') continue;
      const src = r.leadSource || 'Unknown';
      if (!map[src]) map[src] = { gci: 0, deals: 0, volume: 0 };
      map[src].gci += r.commissionTotal || 0;
      map[src].deals += 1;
      map[src].volume += r.salePrice || 0;
    }
    return Object.entries(map)
      .map(([source, d]) => ({
        source,
        gci: d.gci,
        deals: d.deals,
        volume: d.volume,
        spend: SPEND_BY_SOURCE[source] ?? 0,
        roi: d.gci > 0 && (SPEND_BY_SOURCE[source] ?? 0) > 0
          ? d.gci / (SPEND_BY_SOURCE[source] ?? 1)
          : d.gci > 0 ? Infinity : 0,
        costPerDeal: d.deals > 0 && (SPEND_BY_SOURCE[source] ?? 0) > 0
          ? (SPEND_BY_SOURCE[source] ?? 0) / d.deals
          : 0,
      }))
      .sort((a, b) => b.gci - a.gci);
  }, [filteredRecords]);

  // GCI over time by top-4 sources
  const top4Sources = bySource.slice(0, 4).map(s => s.source);
  const gciByMonth = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (let m = 0; m < 12; m++) map[MONTH_LABELS[m]] = Object.fromEntries(top4Sources.map(s => [s, 0]));
    for (const r of filteredRecords) {
      if (r.loopStatus !== 'Closed' || !r.closingDate) continue;
      const month = new Date(r.closingDate).getMonth();
      const src = r.leadSource || 'Unknown';
      if (!top4Sources.includes(src)) continue;
      const label = MONTH_LABELS[month];
      if (!map[label]) continue;
      map[label][src] = (map[label][src] ?? 0) + (r.commissionTotal || 0);
    }
    return Object.entries(map).map(([month, vals]) => ({ month, ...vals }));
  }, [filteredRecords, top4Sources]);

  // Summary KPIs
  const totalGCI = bySource.reduce((s, r) => s + r.gci, 0);
  const totalSpend = bySource.reduce((s, r) => s + r.spend, 0);
  const totalDeals = bySource.reduce((s, r) => s + r.deals, 0);
  const overallROI = totalSpend > 0 ? totalGCI / totalSpend : 0;
  const costPerDeal = totalDeals > 0 && totalSpend > 0 ? totalSpend / totalDeals : 0;

  const SOURCE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <BarChart2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Lead ROI Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV with a Lead Source column to see ROI analysis per channel.
        </p>
        <button
          onClick={activateDemoMode}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
        >
          Load Demo Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lead Source ROI</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Return on investment by lead channel — GCI generated vs. marketing spend.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'GCI Generated', value: compactCurrency(totalGCI),
            sub: `${totalDeals} closed deals`,
            icon: <DollarSign className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400',
          },
          {
            label: 'Total Lead Spend', value: compactCurrency(totalSpend),
            sub: 'Tracked sources only',
            icon: <DollarSign className="w-4 h-4 text-red-400" />, color: 'text-red-400',
          },
          {
            label: 'ROI Multiplier', value: totalSpend > 0 ? `${overallROI.toFixed(0)}x` : '∞',
            sub: 'GCI ÷ spend',
            icon: <TrendingUp className="w-4 h-4 text-yellow-400" />, color: 'text-yellow-400',
          },
          {
            label: 'Cost per Closed Deal', value: costPerDeal > 0 ? compactCurrency(costPerDeal) : '—',
            sub: 'Paid sources only',
            icon: <Target className="w-4 h-4 text-blue-400" />, color: 'text-blue-400',
          },
        ].map(k => (
          <div key={k.label} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">{k.icon}</div>
            <div>
              <p className="text-muted-foreground text-xs">{k.label}</p>
              <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* GCI vs Cost grouped bar chart */}
      <div className="bg-background border border-border rounded-xl p-5">
        <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">GCI vs. Spend by Source</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={bySource} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="source"
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => compactCurrency(v)} width={55}
            />
            <Tooltip
              contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
              formatter={(v: number, name: string) => [formatCurrency(v), name === 'gci' ? 'GCI' : 'Spend']}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
            <Bar dataKey="gci" name="GCI" fill="#10b981" radius={[3, 3, 0, 0]} />
            <Bar dataKey="spend" name="Spend" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* GCI by source over time — line chart */}
      {gciByMonth.some(m => top4Sources.some(s => ((m as unknown) as Record<string, number>)[s] > 0)) && (
        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">GCI by Source — Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={gciByMonth} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                axisLine={false} tickLine={false}
                tickFormatter={v => compactCurrency(v)} width={55}
              />
              <Tooltip
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }} />
              {top4Sources.map((src, i) => (
                <Line
                  key={src}
                  type="monotone"
                  dataKey={src}
                  stroke={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Source breakdown table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Source Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-3 py-3 text-right">Deals</th>
                <th className="px-3 py-3 text-right">GCI</th>
                <th className="px-3 py-3 text-right">Spend</th>
                <th className="px-3 py-3 text-right">ROI</th>
                <th className="px-3 py-3 text-right">Cost / Deal</th>
                <th className="px-4 py-3 text-left">GCI Share</th>
              </tr>
            </thead>
            <tbody>
              {bySource.map((row, i) => {
                const sharePct = totalGCI > 0 ? (row.gci / totalGCI) * 100 : 0;
                const isInfROI = row.roi === Infinity;
                return (
                  <tr
                    key={row.source}
                    className="border-b border-border/60 hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => setHighlightSource(h => h === row.source ? null : row.source)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                        />
                        <span className={`font-medium ${highlightSource === row.source ? 'text-emerald-400' : 'text-foreground'}`}>
                          {row.source}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-foreground tabular-nums">{row.deals}</td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-medium tabular-nums">{compactCurrency(row.gci)}</td>
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                      {row.spend > 0 ? compactCurrency(row.spend) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className={`font-medium ${isInfROI ? 'text-emerald-400' : row.roi >= 10 ? 'text-emerald-400' : row.roi >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {isInfROI ? '∞' : row.roi > 0 ? `${row.roi.toFixed(0)}x` : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">
                      {row.costPerDeal > 0 ? compactCurrency(row.costPerDeal) : <span className="opacity-50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${sharePct}%`, background: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                          />
                        </div>
                        <span className="text-muted-foreground text-xs tabular-nums w-8 text-right">
                          {sharePct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
