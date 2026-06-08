import { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import { Zap, Clock, TrendingUp, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { DotloopRecord } from '@/lib/csvParser';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const AGENT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

function daysBetween(a: string, b: string): number | null {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  const d = Math.round((db.getTime() - da.getTime()) / 86400000);
  return d >= 0 && d < 3650 ? d : null;
}

function avg(arr: number[]): number {
  return arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
}

type SortField = 'agentName' | 'avgDaysToClose' | 'avgDaysUC' | 'avgDOM' | 'deals';
type SortDir = 'asc' | 'desc';

// ─── Stage funnel card ────────────────────────────────────────────────────────

function StageCard({
  label, avg: avgDays, description, color, isLast,
}: {
  label: string; avg: number; description: string; color: string; isLast: boolean;
}) {
  const intensity = Math.min(1, avgDays / 60);
  const barColor = avgDays > 45 ? '#ef4444' : avgDays > 30 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-stretch">
      <div className="flex-1 bg-background border border-border rounded-xl p-4">
        <p className="text-muted-foreground text-xs mb-1">{label}</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-bold tabular-nums" style={{ color: barColor }}>{avgDays}</span>
          <span className="text-muted-foreground text-sm pb-1">days avg</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-2">
          <div className="h-full rounded-full" style={{ width: `${intensity * 100}%`, background: barColor }} />
        </div>
        <p className="text-muted-foreground text-[11px]">{description}</p>
      </div>
      {!isLast && (
        <div className="flex items-center px-2 text-muted-foreground">
          <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VelocityPage() {
  const { filteredRecords, agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [sortField, setSortField] = useState<SortField>('avgDaysToClose');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // Only closed deals with dates
  const closed = useMemo(
    () => filteredRecords.filter(r => r.loopStatus === 'Closed' || r.loopStatus === 'Sold' && r.closingDate),
    [filteredRecords],
  );

  // Stage durations
  const stageDurations = useMemo(() => {
    const dom: number[] = [];      // days on market: listing → offer
    const uc: number[] = [];       // under contract: offer → closing
    const total: number[] = [];    // total: created → closing

    for (const r of closed) {
      const t = daysBetween(r.createdDate, r.closingDate);
      if (t !== null) total.push(t);

      const d = daysBetween(r.listingDate, r.offerDate);
      if (d !== null && d <= 365) dom.push(d);

      const u = daysBetween(r.offerDate, r.closingDate);
      if (u !== null && u <= 180) uc.push(u);
    }

    return { dom, uc, total };
  }, [closed]);

  // Monthly avg days-to-close trend
  const monthlyTrend = useMemo(() => {
    const buckets: Record<string, number[]> = {};
    for (const r of closed) {
      if (!r.closingDate || !r.createdDate) continue;
      const d = daysBetween(r.createdDate, r.closingDate);
      if (d === null) continue;
      const month = MONTH_LABELS[new Date(r.closingDate).getMonth()];
      if (!buckets[month]) buckets[month] = [];
      buckets[month].push(d);
    }
    return MONTH_LABELS
      .filter(m => buckets[m])
      .map(m => ({ month: m, avgDays: avg(buckets[m]), count: buckets[m].length }));
  }, [closed]);

  // DOM distribution histogram buckets: 0-14, 15-29, 30-59, 60-89, 90+
  const domBuckets = useMemo(() => {
    const b = [
      { label: '0–14d',  min: 0,   max: 15,  count: 0 },
      { label: '15–29d', min: 15,  max: 30,  count: 0 },
      { label: '30–59d', min: 30,  max: 60,  count: 0 },
      { label: '60–89d', min: 60,  max: 90,  count: 0 },
      { label: '90d+',   min: 90,  max: Infinity, count: 0 },
    ];
    for (const d of stageDurations.dom) {
      const bucket = b.find(bk => d >= bk.min && d < bk.max);
      if (bucket) bucket.count++;
    }
    return b;
  }, [stageDurations.dom]);

  // Agent velocity table (from agentMetrics + per-agent UC days)
  const agentUCDays = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const r of closed) {
      const u = daysBetween(r.offerDate, r.closingDate);
      if (u === null) continue;
      const agent = (r.agents || '').split(',')[0].trim();
      if (!agent) continue;
      if (!map[agent]) map[agent] = [];
      map[agent].push(u);
    }
    return map;
  }, [closed]);

  const agentDOMDays = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const r of closed) {
      const d = daysBetween(r.listingDate, r.offerDate);
      if (d === null || d > 365) continue;
      const agent = (r.agents || '').split(',')[0].trim();
      if (!agent) continue;
      if (!map[agent]) map[agent] = [];
      map[agent].push(d);
    }
    return map;
  }, [closed]);

  interface AgentRow {
    agentName: string;
    deals: number;
    avgDaysToClose: number;
    avgDaysUC: number;
    avgDOM: number;
    color: string;
  }

  const agentRows = useMemo<AgentRow[]>(() => {
    return agentMetrics
      .filter(a => a.closedDeals > 0)
      .map((a, i) => ({
        agentName: a.agentName,
        deals: a.closedDeals,
        avgDaysToClose: Math.round(a.averageDaysToClose),
        avgDaysUC: avg(agentUCDays[a.agentName] ?? []),
        avgDOM: avg(agentDOMDays[a.agentName] ?? []),
        color: AGENT_COLORS[i % AGENT_COLORS.length],
      }));
  }, [agentMetrics, agentUCDays, agentDOMDays]);

  const sortedAgents = useMemo(() => {
    return [...agentRows].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [agentRows, sortField, sortDir]);

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
  };

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-25 inline" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400 inline" /> : <ChevronDown className="w-3 h-3 text-emerald-400 inline" />;
  }

  const overallAvg     = avg(stageDurations.total);
  const overallDOM     = avg(stageDurations.dom);
  const overallUC      = avg(stageDurations.uc);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Velocity Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV with offer dates and closing dates to see pipeline stage durations and trends.
        </p>
        <button onClick={activateDemoMode} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
          Load Demo Data
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipeline Velocity</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {closed.length} closed deals analysed · how long each stage takes on average.
        </p>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Days to Close', value: `${overallAvg}d`, sub: 'Created → Closed',      icon: <Clock className="w-4 h-4 text-blue-400" />,    color: 'text-blue-400',    records: closed },
          { label: 'Avg Days on Market', value: `${overallDOM}d`, sub: 'Listing → Offer',       icon: <TrendingUp className="w-4 h-4 text-yellow-400" />, color: 'text-yellow-400', records: closed.filter(r => r.listingDate && r.offerDate) },
          { label: 'Avg Under Contract', value: `${overallUC}d`, sub: 'Offer → Close',          icon: <Zap className="w-4 h-4 text-emerald-400" />,   color: 'text-emerald-400', records: closed.filter(r => r.offerDate) },
          { label: 'Closed Deals',       value: closed.length,   sub: `${filteredRecords.length} total`, icon: <TrendingUp className="w-4 h-4 text-purple-400" />, color: 'text-purple-400', records: closed },
        ].map(k => (
          <div key={k.label} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors"
            onClick={() => setDrillTarget({ title: k.label, records: k.records })}>
            <div className="p-2 bg-secondary rounded-lg">{k.icon}</div>
            <div>
              <p className="text-muted-foreground text-xs">{k.label}</p>
              <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
              <p className="text-muted-foreground text-[10px] mt-0.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Stage pipeline */}
      <div className="bg-background border border-border rounded-xl p-5">
        <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">Stage Pipeline — Avg Duration</h2>
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-0 items-stretch">
          {[
            { label: 'On Market',      avg: overallDOM, description: 'Listing date → offer date',   color: '#3b82f6' },
            { label: 'Under Contract', avg: overallUC,  description: 'Offer date → closing date',   color: '#f59e0b' },
            { label: 'Total Pipeline', avg: overallAvg, description: 'Created → closed (end-to-end)', color: '#8b5cf6' },
          ].map((stage, i, arr) => (
            <StageCard key={stage.label} {...stage} isLast={i === arr.length - 1} />
          ))}
        </div>
      </div>

      {/* Monthly trend + DOM histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly trend */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">Avg Days to Close — Monthly</h2>
          {monthlyTrend.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                  formatter={(v: number) => [`${v} days`, 'Avg to Close']}
                />
                {overallAvg > 0 && (
                  <ReferenceLine y={overallAvg} stroke="#6b7280" strokeDasharray="4 4" label={{ value: `avg ${overallAvg}d`, fill: 'var(--muted-foreground)', fontSize: 10 }} />
                )}
                <Line type="monotone" dataKey="avgDays" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Not enough monthly data to trend.
            </div>
          )}
        </div>

        {/* DOM histogram */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">Days on Market — Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={domBuckets} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                formatter={(v: number) => [v, 'Deals']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer"
                onClick={(data) => {
                  const recs = closed.filter(r => {
                    const d = daysBetween(r.listingDate, r.offerDate);
                    return d !== null && d >= data.min && d < data.max;
                  });
                  setDrillTarget({ title: `Days on Market: ${data.label}`, records: recs });
                }}
              >
                {domBuckets.map((b, i) => (
                  <Cell key={i} fill={b.min >= 60 ? '#ef4444' : b.min >= 30 ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent velocity table */}
      {agentRows.length > 0 && (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Agent Velocity Ranking</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Lower days = faster. Sorted by {sortField}.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                  {(
                    [
                      { f: 'agentName' as SortField,      label: 'Agent',            right: false },
                      { f: 'deals' as SortField,          label: 'Closed Deals',     right: true  },
                      { f: 'avgDOM' as SortField,         label: 'Avg DOM',          right: true  },
                      { f: 'avgDaysUC' as SortField,      label: 'Avg UC Days',      right: true  },
                      { f: 'avgDaysToClose' as SortField, label: 'Avg Total (days)', right: true  },
                    ]
                  ).map(col => (
                    <th
                      key={col.f}
                      onClick={() => handleSort(col.f)}
                      className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${col.right ? 'text-right' : 'text-left'}`}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.right ? 'flex-row-reverse' : ''}`}>
                        {col.label} <SortIcon field={col.f} />
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium">Speed Bar</th>
                </tr>
              </thead>
              <tbody>
                {sortedAgents.map((a, i) => {
                  const maxDays = Math.max(...agentRows.map(r => r.avgDaysToClose), 1);
                  const barPct = (a.avgDaysToClose / maxDays) * 100;
                  const barColor = a.avgDaysToClose <= overallAvg * 0.8 ? '#10b981' : a.avgDaysToClose <= overallAvg ? '#f59e0b' : '#ef4444';
                  return (
                    <tr key={a.agentName} className="border-b border-border/60 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => setDrillTarget({ title: `${a.agentName} — Velocity`, records: closed.filter(r => (r.agents || '').includes(a.agentName)) })}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                          <span className="text-foreground font-medium">{a.agentName}</span>
                          {i === 0 && sortField === 'avgDaysToClose' && sortDir === 'asc' && (
                            <span className="text-[10px] font-bold text-emerald-400 px-1.5 py-0.5 bg-emerald-500/15 rounded-full">Fastest</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground tabular-nums">{a.deals}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={a.avgDOM > 45 ? 'text-red-400' : a.avgDOM > 30 ? 'text-yellow-400' : 'text-emerald-400'}>
                          {a.avgDOM > 0 ? `${a.avgDOM}d` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={a.avgDaysUC > 45 ? 'text-red-400' : a.avgDaysUC > 30 ? 'text-yellow-400' : 'text-emerald-400'}>
                          {a.avgDaysUC > 0 ? `${a.avgDaysUC}d` : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: barColor }}>
                        {a.avgDaysToClose > 0 ? `${a.avgDaysToClose}d` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-28 h-2 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: barColor }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
