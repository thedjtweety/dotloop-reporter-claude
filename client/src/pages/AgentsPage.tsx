import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Trophy, Download, FileText, Eye, Search, X, ChevronUp, ChevronDown,
  Users, ClipboardList, Medal, TrendingUp, DollarSign, Clock, Target,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { useCDAPanel } from '@/contexts/CDAContext';
import { AgentMetrics } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { useAgentDetail } from '@/hooks/useAgentDetail';
import { storeCDAPrefill } from '@/lib/cdaPrefill';
import { useLocation } from 'wouter';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6',
];

type SortField =
  | 'agentName' | 'closedDeals' | 'totalSalesVolume' | 'totalCommission'
  | 'averageSalesPrice' | 'closingRate' | 'companyDollar' | 'averageDaysToClose';
type SortDir = 'asc' | 'desc';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function compactCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatCurrency(n);
}

type EnrichedAgent = AgentMetrics & { color: string; initials: string; rank: number };

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportAgentCSV(agents: EnrichedAgent[]) {
  const headers = [
    'Rank', 'Agent', 'Closed Deals', 'Close %', 'Avg Price',
    'Total GCI', 'Avg GCI', 'Co. Dollar', 'Total Volume',
    'Avg Days', 'Active', 'Under Contract', 'Buy Side %', 'Sell Side %',
  ];
  const rows = agents.map(a => [
    a.rank,
    a.agentName,
    a.closedDeals,
    `${a.closingRate.toFixed(1)}%`,
    formatCurrency(a.averageSalesPrice),
    formatCurrency(a.totalCommission),
    formatCurrency(a.averageCommission),
    formatCurrency(a.companyDollar),
    formatCurrency(a.totalSalesVolume),
    a.averageDaysToClose.toFixed(0),
    a.activeListings,
    a.underContract,
    `${a.buySidePercentage.toFixed(0)}%`,
    `${a.sellSidePercentage.toFixed(0)}%`,
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `agent-leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-25 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-emerald-400 inline" />
    : <ChevronDown className="w-3 h-3 text-emerald-400 inline" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { agentMetrics, filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const { agentTarget, openAgent, closeAgent } = useAgentDetail();
  const [, navigate] = useLocation();
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [chartMetric, setChartMetric] = useState<'totalCommission' | 'closedDeals' | 'totalSalesVolume'>('totalCommission');

  const showAgent = (name: string) => openAgent(name, filteredRecords, agentMetrics);
  const cdaForRecord = (r: any) => { storeCDAPrefill(r); navigate('/cda-builder'); };

  // Enrich with color, initials, rank (ranked by totalCommission desc)
  const enriched: EnrichedAgent[] = useMemo(() => {
    const ranked = [...agentMetrics].sort((a, b) => b.totalCommission - a.totalCommission);
    return ranked.map((a, i) => ({
      ...a,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
      initials: getInitials(a.agentName),
      rank: i + 1,
    }));
  }, [agentMetrics]);

  const filtered = useMemo(() =>
    search
      ? enriched.filter(a => a.agentName.toLowerCase().includes(search.toLowerCase()))
      : enriched,
  [enriched, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortField as keyof EnrichedAgent] as number | string;
      const bv = b[sortField as keyof EnrichedAgent] as number | string;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filtered, sortField, sortDir]);

  const top3 = useMemo(() => enriched.slice(0, 3), [enriched]);

  const chartData = sorted.slice(0, 10).map(a => ({
    name: a.agentName.split(' ')[0],
    fullName: a.agentName,
    value: a[chartMetric] as number,
    color: a.color,
  }));

  // Summary KPIs
  const totalGCI = enriched.reduce((s, a) => s + a.totalCommission, 0);
  const avgDeals = enriched.length > 0 ? enriched.reduce((s, a) => s + a.closedDeals, 0) / enriched.length : 0;
  const avgCloseRate = enriched.length > 0 ? enriched.reduce((s, a) => s + a.closingRate, 0) / enriched.length : 0;
  const avgDays = enriched.length > 0 ? enriched.reduce((s, a) => s + a.averageDaysToClose, 0) / enriched.length : 0;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (name: string) =>
    setSelectedAgents(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  // ── Empty state ─────────────────────────────────────────────────────────────

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Agent Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV export from Dotloop to see agent performance rankings, GCI, and pipeline activity.
        </p>
        <Button onClick={activateDemoMode} className="bg-emerald-500 hover:bg-emerald-600 text-white">
          Load Demo Data
        </Button>
      </div>
    );
  }

  // ── Podium arrangement: 2nd left, 1st center, 3rd right ─────────────────────
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const PODIUM_META = [
    { label: '2nd', medalColor: 'text-slate-400', border: 'border-border', height: 'h-20', pos: 'pt-4' },
    { label: '1st', medalColor: 'text-yellow-400', border: 'border-yellow-500/50', height: 'h-28', pos: 'pt-0' },
    { label: '3rd', medalColor: 'text-orange-400', border: 'border-orange-500/30', height: 'h-16', pos: 'pt-6' },
  ];

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agent Leaderboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{enriched.length} agents · {filteredRecords.length} transactions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportAgentCSV(sorted)}
          className="border-border text-muted-foreground hover:text-foreground"
        >
          <Download className="w-4 h-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* ── KPI bar ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: enriched.length.toString(), icon: <Users className="w-4 h-4 text-blue-400" />, color: 'text-blue-400', records: filteredRecords },
          { label: 'Combined GCI', value: compactCurrency(totalGCI), icon: <DollarSign className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400', records: filteredRecords.filter(r => (r.commissionTotal || 0) > 0) },
          { label: 'Avg Close Rate', value: `${avgCloseRate.toFixed(0)}%`, icon: <Target className="w-4 h-4 text-yellow-400" />, color: 'text-yellow-400', records: filteredRecords.filter(r => r.loopStatus === 'Closed' || r.loopStatus === 'Sold') },
          { label: 'Avg Days to Close', value: `${avgDays.toFixed(0)}d`, icon: <Clock className="w-4 h-4 text-purple-400" />, color: 'text-purple-400', records: filteredRecords.filter(r => r.loopStatus === 'Closed' || r.loopStatus === 'Sold') },
        ].map(kpi => (
          <div key={kpi.label}
            onClick={() => setDrillTarget({ title: kpi.label, records: kpi.records })}
            className="bg-background border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/60 transition-colors">
            <div className="p-2 rounded-lg bg-secondary">{kpi.icon}</div>
            <div>
              <p className="text-muted-foreground text-xs">{kpi.label}</p>
              <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Podium ── */}
      {top3.length >= 2 && (
        <div className="bg-background border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Top Performers</h2>
          </div>
          <div className="flex items-end justify-center gap-4">
            {podiumOrder.map((agent, i) => {
              const meta = PODIUM_META[i];
              return (
                <div
                  key={agent.agentName}
                  onClick={() => showAgent(agent.agentName)}
                  className={`flex-1 max-w-[220px] cursor-pointer group`}
                >
                  <div className={`bg-secondary border ${meta.border} rounded-xl p-4 text-center ${meta.pos} transition-all hover:scale-[1.02] hover:shadow-lg`}>
                    <Medal className={`w-5 h-5 mx-auto mb-2 ${meta.medalColor}`} />
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2"
                      style={{ background: agent.color + '25', color: agent.color }}
                    >
                      {agent.initials}
                    </div>
                    <p className="text-foreground font-semibold text-sm leading-tight mb-1">{agent.agentName}</p>
                    <p className="text-emerald-400 font-bold text-base">{compactCurrency(agent.totalCommission)}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{agent.closedDeals} deals · {agent.closingRate.toFixed(0)}% close</p>
                    <div className="flex justify-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="text-blue-400">{compactCurrency(agent.totalSalesVolume)}</span>
                    </div>
                  </div>
                  <div className={`${meta.height} bg-secondary/50 rounded-b-lg border border-t-0 ${meta.border} flex items-center justify-center`}>
                    <span className={`font-bold text-sm ${meta.medalColor}`}>{meta.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bar chart ── */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Performance Chart — Top 10</h2>
          <div className="flex gap-1">
            {([
              { key: 'totalCommission' as const,  label: 'GCI' },
              { key: 'closedDeals' as const,       label: 'Deals' },
              { key: 'totalSalesVolume' as const,  label: 'Volume' },
            ]).map(m => (
              <button
                key={m.key}
                onClick={() => setChartMetric(m.key)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  chartMetric === m.key
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => chartMetric === 'closedDeals' ? String(v) : compactCurrency(v)}
              width={55}
            />
            <Tooltip
              contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
              formatter={(v: number) =>
                chartMetric === 'closedDeals' ? [v, 'Deals'] : [formatCurrency(v), chartMetric === 'totalCommission' ? 'GCI' : 'Volume']
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} cursor="pointer"
              onClick={(data: any) => { if (data?.fullName) showAgent(data.fullName); }}>
              {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Table ── */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">
            All Agents ({filtered.length})
          </h2>
          <div className="flex items-center gap-2">
            {selectedAgents.size > 0 && (
              <span className="px-2 py-1 bg-emerald-500/15 text-emerald-400 text-xs rounded-md font-medium">
                {selectedAgents.size} selected
              </span>
            )}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents…"
                className="bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 w-44"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                <th className="w-9 px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={e => setSelectedAgents(e.target.checked ? new Set(sorted.map(a => a.agentName)) : new Set())}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-3 text-left w-8 font-medium">#</th>
                {(
                  [
                    { field: 'agentName' as SortField, label: 'Agent', right: false },
                    { field: 'closedDeals' as SortField, label: 'Deals', right: true },
                    { field: 'closingRate' as SortField, label: 'Close %', right: true },
                    { field: 'averageSalesPrice' as SortField, label: 'Avg Price', right: true },
                    { field: 'totalCommission' as SortField, label: 'Total GCI', right: true },
                    { field: 'companyDollar' as SortField, label: 'Co. Dollar', right: true },
                    { field: 'totalSalesVolume' as SortField, label: 'Volume', right: true },
                    { field: 'averageDaysToClose' as SortField, label: 'Avg Days', right: true },
                  ] as const
                ).map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className={`px-3 py-3 font-medium cursor-pointer select-none hover:text-foreground transition-colors ${col.right ? 'text-right' : 'text-left'}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.right ? 'flex-row-reverse' : ''}`}>
                      {col.label}
                      <SortIcon field={col.field} sortField={sortField} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-medium">Split</th>
                <th className="px-3 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, idx) => (
                <tr
                  key={agent.agentName}
                  className="border-b border-border/60 hover:bg-secondary/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedAgents.has(agent.agentName)}
                      onChange={() => toggleSelect(agent.agentName)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs tabular-nums">{idx + 1}</td>
                  {/* Agent name */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: agent.color + '25', color: agent.color }}
                      >
                        {agent.initials}
                      </div>
                      <span onClick={() => showAgent(agent.agentName)} className="text-foreground font-medium hover:text-blue-400 hover:underline cursor-pointer">{agent.agentName}</span>
                      {agent.rank <= 3 && (
                        <span className={`text-[10px] font-bold ${agent.rank === 1 ? 'text-yellow-400' : agent.rank === 2 ? 'text-slate-400' : 'text-orange-400'}`}>
                          #{agent.rank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-foreground tabular-nums">{agent.closedDeals}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      agent.closingRate >= 40 ? 'bg-emerald-500/15 text-emerald-400' :
                      agent.closingRate >= 20 ? 'bg-yellow-500/15 text-yellow-400' :
                      'bg-red-500/15 text-red-400'
                    }`}>
                      {agent.closingRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{compactCurrency(agent.averageSalesPrice)}</td>
                  <td className="px-3 py-3 text-right text-emerald-400 font-medium tabular-nums">{compactCurrency(agent.totalCommission)}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{compactCurrency(agent.companyDollar)}</td>
                  <td className="px-3 py-3 text-right text-blue-400 tabular-nums">{compactCurrency(agent.totalSalesVolume)}</td>
                  <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{agent.averageDaysToClose.toFixed(0)}d</td>
                  {/* Buy/sell mini bar */}
                  <td className="px-3 py-3">
                    <div className="w-16">
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-border">
                        <div className="h-full bg-blue-500" style={{ width: `${agent.buySidePercentage}%` }} />
                        <div className="h-full bg-emerald-500 flex-1" />
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                        <span>B</span><span>S</span>
                      </div>
                    </div>
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                      <button
                        onClick={() => showAgent(agent.agentName)}
                        className="p-1.5 rounded hover:bg-secondary hover:text-foreground transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          const recs = filteredRecords.filter(r =>
                            (r.agents || '').toLowerCase().includes(agent.agentName.toLowerCase())
                          );
                          const closed = recs.filter(r => r.loopStatus === 'Closed' || r.loopStatus === 'Sold');
                          const record = (closed.length > 0 ? closed : recs)
                            .sort((a, b) => new Date(b.closingDate || '').getTime() - new Date(a.closingDate || '').getTime())[0];
                          if (record) cdaForRecord(record);
                          else navigate('/cda-builder');
                        }}
                        className="p-1.5 rounded hover:bg-secondary hover:text-blue-400 transition-colors"
                        title="Open CDA"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => exportAgentCSV([agent])}
                        className="p-1.5 rounded hover:bg-secondary hover:text-foreground transition-colors"
                        title="Export row"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No agents match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* ── Agent detail ── */}
      <AgentDetailModal target={agentTarget} onClose={closeAgent} onCDA={cdaForRecord} />
      {/* ── KPI drill-down ── */}
      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
