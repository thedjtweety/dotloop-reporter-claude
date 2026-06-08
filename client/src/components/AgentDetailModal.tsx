import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { DotloopRecord } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';
import { AgentDetailTarget } from '@/hooks/useAgentDetail';
import { CDAButton } from '@/components/CDAButton';

const AGENT_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6',
];

interface AgentDetailModalProps {
  target: AgentDetailTarget | null;
  onClose: () => void;
  onCDA?: (record: DotloopRecord) => void;
}

function isClosed(r: DotloopRecord) {
  return r.loopStatus === 'Closed' || r.loopStatus === 'Sold';
}
function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  const d = Math.round((db.getTime() - da.getTime()) / 86400000);
  return d >= 0 ? d : null;
}
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}
function fmtDate(d?: string): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

const STATUS_CLASS: Record<string, string> = {
  'Closed': 'bg-emerald-500/20 text-emerald-400',
  'Sold': 'bg-emerald-500/20 text-emerald-400',
  'Under Contract': 'bg-yellow-500/20 text-yellow-400',
  'Active': 'bg-blue-500/20 text-blue-400',
  'Active Listing': 'bg-blue-500/20 text-blue-400',
};

const PAGE_SIZE = 25;

export function AgentDetailModal({ target, onClose, onCDA }: AgentDetailModalProps) {
  const [tab, setTab] = useState<'performance' | 'transactions'>('performance');
  const [page, setPage] = useState(1);

  const monthlyGCI = useMemo(() => {
    if (!target) return [];
    const map: Record<string, number> = {};
    target.records.forEach(r => {
      if (!r.closingDate) return;
      const d = new Date(r.closingDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + (r.commissionTotal || 0);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, gci]) => ({
      month: month.slice(5),
      gci,
    }));
  }, [target]);

  const stats = useMemo(() => {
    if (!target) return { closed: 0, gci: 0, volume: 0, avgDays: 0, avgPerDeal: 0, companyDollar: 0 };
    const recs = target.records;
    const closedRecs = recs.filter(isClosed);
    const gci = recs.reduce((s, r) => s + (r.commissionTotal || 0), 0);
    const volume = recs.reduce((s, r) => s + (r.salePrice || 0), 0);
    const companyDollar = recs.reduce((s, r) => s + (r.companyDollar || 0), 0);
    const daysList = closedRecs.map(r => daysBetween(r.createdDate, r.closingDate)).filter((d): d is number => d != null);
    const avgDays = daysList.length ? daysList.reduce((s, d) => s + d, 0) / daysList.length : 0;
    return {
      closed: closedRecs.length,
      gci,
      volume,
      avgDays,
      avgPerDeal: closedRecs.length ? gci / closedRecs.length : 0,
      companyDollar,
    };
  }, [target]);

  if (!target) return null;

  const color = AGENT_COLORS[(target.rank - 1 + AGENT_COLORS.length) % AGENT_COLORS.length];
  const buyPct = target.metrics?.buySidePercentage ?? 0;
  const sellPct = target.metrics?.sellSidePercentage ?? (100 - buyPct);

  const totalPages = Math.max(1, Math.ceil(target.records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = target.records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <Dialog open={!!target} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-none bg-background border border-border p-0 flex flex-col overflow-hidden"
        style={{ width: '90vw', maxWidth: '90vw', height: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
              style={{ background: color + '25', color }}
            >
              {getInitials(target.agentName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-foreground">{target.agentName}</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400">
                  #{target.rank} by GCI
                </span>
              </div>
              <p className="text-muted-foreground text-sm">{target.records.length} transactions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-6 py-4 shrink-0">
          {[
            { label: 'Closed Deals', value: String(stats.closed), color: 'text-emerald-400' },
            { label: 'Total GCI', value: formatCurrency(stats.gci), color: 'text-emerald-400' },
            { label: 'Sales Volume', value: formatCurrency(stats.volume), color: 'text-blue-400' },
            { label: 'Avg Days to Close', value: `${stats.avgDays.toFixed(0)}d`, color: 'text-yellow-400' },
          ].map(k => (
            <div key={k.label} className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">{k.label}</p>
              <p className={`font-bold text-lg ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Buy/sell split */}
        <div className="px-6 pb-3 shrink-0">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Buy Side ({buyPct.toFixed(0)}%)</span>
            <span>Sell Side ({sellPct.toFixed(0)}%)</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
            <div className="h-full bg-blue-500" style={{ width: `${buyPct}%` }} />
            <div className="h-full bg-emerald-500 flex-1" />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 shrink-0 border-b border-border">
          <div className="flex gap-1">
            {([
              { key: 'performance' as const, label: 'Performance' },
              { key: 'transactions' as const, label: `Transactions (${target.records.length})` },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {tab === 'performance' ? (
            <div className="h-full overflow-y-auto px-6 py-4 space-y-6">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-3 font-semibold">Monthly GCI</p>
                {monthlyGCI.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyGCI} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={55}
                        tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`} />
                      <Tooltip
                        contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                        formatter={(v: number) => [formatCurrency(v), 'GCI']}
                      />
                      <Bar dataKey="gci" fill={color} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">No closing-date data available.</p>
                )}
              </div>

              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-3 font-semibold">Commission Stats</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Commission', value: formatCurrency(stats.gci) },
                    { label: 'Avg per Deal', value: formatCurrency(stats.avgPerDeal) },
                    { label: 'Company Dollar', value: formatCurrency(stats.companyDollar) },
                  ].map(s => (
                    <div key={s.label} className="bg-secondary/40 border border-border rounded-lg p-3">
                      <p className="text-muted-foreground text-xs mb-1">{s.label}</p>
                      <p className="text-foreground font-bold">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col min-h-0">
              <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background z-10 border-b border-border">
                    <tr className="text-muted-foreground text-xs">
                      <th className="text-left pl-6 pr-4 py-3 font-medium">Address</th>
                      <th className="text-left pr-4 py-3 font-medium">Status</th>
                      <th className="text-left pr-4 py-3 font-medium">Closing Date</th>
                      <th className="text-right pr-4 py-3 font-medium">Sale Price</th>
                      <th className="text-right pr-4 py-3 font-medium">GCI</th>
                      <th className="pr-6 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((r, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-secondary/40 transition-colors">
                        <td className="pl-6 pr-4 py-3 text-foreground text-xs font-medium truncate max-w-[260px]">
                          {r.address || r.loopName || '—'}
                        </td>
                        <td className="pr-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[r.loopStatus] ?? 'bg-secondary text-muted-foreground'}`}>
                            {r.loopStatus || '—'}
                          </span>
                        </td>
                        <td className="pr-4 py-3 text-muted-foreground text-xs tabular-nums">{fmtDate(r.closingDate)}</td>
                        <td className="pr-4 py-3 text-right text-muted-foreground text-xs tabular-nums">
                          {r.salePrice ? formatCurrency(r.salePrice) : '—'}
                        </td>
                        <td className="pr-4 py-3 text-right text-emerald-400 text-xs tabular-nums font-medium">
                          {r.commissionTotal ? formatCurrency(r.commissionTotal) : '—'}
                        </td>
                        <td className="pr-6 py-3" onClick={e => e.stopPropagation()}>
                          {onCDA
                            ? <button
                                onClick={() => onCDA(r)}
                                title="Build CDA for this transaction"
                                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors"
                              >CDA</button>
                            : <CDAButton record={r} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {target.records.length > PAGE_SIZE && (
                <div className="px-6 py-3 border-t border-border shrink-0 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, target.records.length)} of {target.records.length}
                  </span>
                  <div className="flex-1" />
                  <button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="px-2 py-1 rounded border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center">
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span>Page {safePage} of {totalPages}</span>
                  <button disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="px-2 py-1 rounded border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
