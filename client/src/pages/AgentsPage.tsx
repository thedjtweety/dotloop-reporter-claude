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

// ─── Drill-down modal ─────────────────────────────────────────────────────────

function AgentDrillDown({
  agent, onClose, records,
}: { agent: EnrichedAgent; onClose: () => void; records: any[] }) {
  const { openCDA } = useCDAPanel();
  const [tab, setTab] = useState<'transactions' | 'stats'>('stats');

  const agentRecords = records.filter(r =>
    (r.agents || '').toLowerCase().includes(agent.agentName.toLowerCase())
  );
  const closedRecords = agentRecords.filter(r => r.loopStatus === 'Closed');
  const activeRecords = agentRecords.filter(r => r.loopStatus === 'Active' || r.loopStatus === 'Active Listing');
  const ucRecords = agentRecords.filter(r => r.loopStatus === 'Under Contract');

  const radarData = [
    { metric: 'Volume', value: Math.min((agent.totalSalesVolume / 2_000_000) * 100, 100) },
    { metric: 'GCI', value: Math.min((agent.totalCommission / 100_000) * 100, 100) },
    { metric: 'Deals', value: Math.min((agent.closedDeals / 20) * 100, 100) },
    { metric: 'Close %', value: agent.closingRate },
    { metric: 'Avg Price', value: Math.min((agent.averageSalesPrice / 1_500_000) * 100, 100) },
    { metric: 'Speed', value: Math.max(0, 100 - (agent.averageDaysToClose / 60) * 100) },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-background border-border text-foreground max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0"
              style={{ background: agent.color + '25', color: agent.color }}
            >
              {agent.initials}
            </div>
            <div>
              <DialogTitle className="text-foreground text-lg">{agent.agentName}</DialogTitle>
              <p className="text-muted-foreground text-sm">#{agent.rank} · {agentRecords.length} transactions</p>
            </div>
          </div>
        </DialogHeader>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-2">
          {[
            { label: 'Closed Deals', value: String(agent.closedDeals), color: 'text-emerald-400' },
            { label: 'Total GCI', value: compactCurrency(agent.totalCommission), color: 'text-emerald-400' },
            { label: 'Sales Volume', value: compactCurrency(agent.totalSalesVolume), color: 'text-blue-400' },
            { label: 'Avg Days', value: `${agent.averageDaysToClose.toFixed(0)}d`, color: 'text-yellow-400' },
          ].map(m => (
            <div key={m.label} className="bg-secondary rounded-lg p-3 text-center">
              <p className="text-muted-foreground text-xs mb-1">{m.label}</p>
              <p className={`font-bold text-lg ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Buy/sell split bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Buy Side ({agent.buySidePercentage.toFixed(0)}%)</span>
            <span>Sell Side ({agent.sellSidePercentage.toFixed(0)}%)</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${agent.buySidePercentage}%` }} />
            <div className="h-full bg-emerald-500 transition-all flex-1" />
          </div>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as 'transactions' | 'stats')} className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-secondary mb-3 w-fit">
            <TabsTrigger value="stats" className="text-xs">Performance</TabsTrigger>
            <TabsTrigger value="transactions" className="text-xs">Transactions ({agentRecords.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="flex-1">
            <div className="grid grid-cols-2 gap-4">
              {/* Radar */}
              <div>
                <p className="text-muted-foreground text-xs mb-2">Performance Radar</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar dataKey="value" stroke={agent.color} fill={agent.color} fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* Pipeline status */}
              <div>
                <p className="text-muted-foreground text-xs mb-2">Pipeline Status</p>
                <div className="space-y-2.5">
                  {[
                    { label: 'Closed', count: closedRecords.length, color: '#10b981', volume: closedRecords.reduce((s, r) => s + (r.salePrice || 0), 0) },
                    { label: 'Under Contract', count: ucRecords.length, color: '#f59e0b', volume: ucRecords.reduce((s, r) => s + (r.salePrice || 0), 0) },
                    { label: 'Active', count: activeRecords.length, color: '#3b82f6', volume: activeRecords.reduce((s, r) => s + (r.price || 0), 0) },
                    { label: 'Avg Days to Close', count: agent.averageDaysToClose, color: '#8b5cf6', volume: 0, suffix: 'd' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-foreground text-xs">{s.label}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm" style={{ color: s.color }}>
                          {s.suffix ? `${s.count.toFixed(0)}${s.suffix}` : s.count}
                        </span>
                        {s.volume > 0 && <p className="text-muted-foreground text-[10px]">{compactCurrency(s.volume)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="flex-1 min-h-0">
            <ScrollArea className="h-[280px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs">
                    <th className="text-left pb-2 pr-3">Loop / Address</th>
                    <th className="text-left pb-2 pr-3">Status</th>
                    <th className="text-right pb-2 pr-3">Price</th>
                    <th className="text-right pb-2 pr-3">Closing</th>
                    <th className="text-right pb-2 pr-3">GCI</th>
                    <th className="text-right pb-2">CDA</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRecords.slice(0, 50).map((r: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/50">
                      <td className="py-2 pr-3 text-foreground truncate max-w-[160px]">{r.address || r.loopName || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          r.loopStatus === 'Closed' ? 'bg-emerald-500/20 text-emerald-400' :
                          r.loopStatus === 'Under Contract' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-secondary text-muted-foreground'
                        }`}>{r.loopStatus || '—'}</span>
                      </td>
                      <td className="py-2 pr-3 text-right text-muted-foreground text-xs">{formatCurrency(r.salePrice || r.price || 0)}</td>
                      <td className="py-2 pr-3 text-right text-muted-foreground text-xs">{r.closingDate || '—'}</td>
                      <td className="py-2 pr-3 text-right text-emerald-400 text-xs">{formatCurrency(r.commissionTotal || 0)}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => openCDA(r, r.address || r.loopName || 'Transaction')}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-400/10"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
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
  const { openCDA, openCDAWithData } = useCDAPanel();

  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [drillDown, setDrillDown] = useState<EnrichedAgent | null>(null);
  const [chartMetric, setChartMetric] = useState<'totalCommission' | 'closedDeals' | 'totalSalesVolume'>('totalCommission');

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
          { label: 'Total Agents', value: enriched.length.toString(), icon: <Users className="w-4 h-4 text-blue-400" />, color: 'text-blue-400' },
          { label: 'Combined GCI', value: compactCurrency(totalGCI), icon: <DollarSign className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Avg Close Rate', value: `${avgCloseRate.toFixed(0)}%`, icon: <Target className="w-4 h-4 text-yellow-400" />, color: 'text-yellow-400' },
          { label: 'Avg Days to Close', value: `${avgDays.toFixed(0)}d`, icon: <Clock className="w-4 h-4 text-purple-400" />, color: 'text-purple-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
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
                  onClick={() => setDrillDown(agent)}
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
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
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
                      <span className="text-foreground font-medium">{agent.agentName}</span>
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
                        onClick={() => setDrillDown(agent)}
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
                          const closed = recs.filter(r => r.loopStatus === 'Closed');
                          const record = (closed.length > 0 ? closed : recs)
                            .sort((a, b) => new Date(b.closingDate || '').getTime() - new Date(a.closingDate || '').getTime())[0];
                          if (record) {
                            openCDA(record, `Agent: ${agent.agentName}`);
                          } else {
                            openCDAWithData({
                              propertyAddress: '',
                              salePrice: agent.averageSalesPrice,
                              sellerName: '',
                              totalCommissionRate: 3,
                              totalGrossCommission: agent.averageSalesPrice * 0.03,
                              sellingSplitPercent: 50,
                              listingSplitPercent: 50,
                              sellingGrossCommission: agent.averageSalesPrice * 0.015,
                              listingGrossCommission: agent.averageSalesPrice * 0.015,
                              sellingAgent1Name: agent.agentName,
                              sellingAgent1SplitPercent: 80,
                              sellingAgent1Commission: agent.averageSalesPrice * 0.015 * 0.8,
                              sellingBrokerSplitPercent: 20,
                              sellingBrokerageCommission: agent.averageSalesPrice * 0.015 * 0.2,
                              sellingCommissionAfterFees: agent.averageSalesPrice * 0.015 * 0.8,
                              listingAgent1Name: agent.agentName,
                              listingAgent1SplitPercent: 80,
                              listingAgent1Commission: agent.averageSalesPrice * 0.015 * 0.8,
                              listingBrokerSplitPercent: 20,
                              listingBrokerageCommission: agent.averageSalesPrice * 0.015 * 0.2,
                              listingCommissionAfterFees: agent.averageSalesPrice * 0.015 * 0.8,
                            }, `Agent: ${agent.agentName}`);
                          }
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

      {/* ── Drill-down ── */}
      {drillDown && (
        <AgentDrillDown
          agent={drillDown}
          onClose={() => setDrillDown(null)}
          records={filteredRecords}
        />
      )}
    </div>
  );
}
