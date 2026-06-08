import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { useAgentDetail } from '@/hooks/useAgentDetail';
import {
  FileText, AlertCircle, TrendingUp, Users, Clock, X,
  DollarSign, BarChart2, Activity, CheckCircle2, Trophy,
  ArrowUpRight, ArrowDownRight, Minus, Target, Home,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActionItem {
  id: string;
  type: string;
  typeColor: string;
  age: string;
  title: string;
  description: string;
  agent: string;
  icon: React.ReactNode;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const ACTION_ITEMS: ActionItem[] = [
  {
    id: '1',
    type: 'CDA Review',
    typeColor: '#f59e0b',
    age: '2h',
    title: '3 Disbursements Awaiting Signature',
    description: 'Net commission disbursements pending broker signature before wire.',
    agent: 'Sarah M., James K., Priya N.',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: '2',
    type: 'Compliance',
    typeColor: '#ef4444',
    age: '1d',
    title: 'Missing Seller Disclosure',
    description: '1234 Maple Ave — seller disclosure not uploaded. Closing in 6 days.',
    agent: 'Marcus L.',
    icon: <AlertCircle className="w-4 h-4" />,
  },
  {
    id: '3',
    type: 'Cap Conversation',
    typeColor: '#10b981',
    age: '3d',
    title: 'Agent Passed Annual Cap',
    description: 'Agent hit $25,000 GCI cap. Post-cap splits now apply.',
    agent: 'Jordan T.',
    icon: <TrendingUp className="w-4 h-4" />,
  },
  {
    id: '4',
    type: 'Stuck Deal',
    typeColor: '#8b5cf6',
    age: '47d',
    title: '88 Pearl Street — 47 Days Stale',
    description: 'Under contract 47 days with no status update. Follow up needed.',
    agent: 'Angela B.',
    icon: <Clock className="w-4 h-4" />,
  },
  {
    id: '5',
    type: 'Recruit Follow-Up',
    typeColor: '#06b6d4',
    age: '5d',
    title: 'Offer Expires Friday',
    description: 'Recruiting offer to top-producing agent expires end of week.',
    agent: 'Chris D. (prospect)',
    icon: <Users className="w-4 h-4" />,
  },
];

const MARKET_PULSE = [
  { label: 'Median DOM', value: '28d', trend: '-3d', up: true, sub: 'Days on market' },
  { label: 'Median Price', value: '$1.04M', trend: '+2.1%', up: true, sub: 'Vs. last month' },
  { label: 'Active Listings', value: '412', trend: '-8.4%', up: false, sub: 'Market inventory' },
];

const RECRUITING_STAGES = [
  { label: 'Sourced', count: 42, pct: 100, color: '#3b82f6' },
  { label: 'Interviewed', count: 18, pct: 43, color: '#8b5cf6' },
  { label: 'Offer Sent', count: 7, pct: 17, color: '#f59e0b' },
  { label: 'Joined', count: 3, pct: 7, color: '#10b981' },
];

const COMPLIANCE_ISSUES = [
  { label: 'Missing disclosure', count: 8, color: '#ef4444' },
  { label: 'Awaiting CDA approval', count: 3, color: '#f59e0b' },
  { label: 'Stale 30d+', count: 3, color: '#8b5cf6' },
];

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekStrip(): Date[] {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function compactCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatCurrency(n);
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <h2 className="text-foreground font-semibold text-xs tracking-widest uppercase">{children}</h2>
      {sub && <span className="text-muted-foreground text-xs">{sub}</span>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { filteredRecords, metrics, agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const { agentTarget, openAgent, closeAgent } = useAgentDetail();

  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [projectedTab, setProjectedTab] = useState<'30' | '60' | '90'>('30');
  const [riskAdjust, setRiskAdjust] = useState([80]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleActions = ACTION_ITEMS.filter(a => !dismissed.has(a.id));

  // ── Metrics from context ──
  const totalTx      = metrics?.totalTransactions ?? 0;
  const totalVolume  = metrics?.totalSalesVolume ?? 0;
  const closingRate  = metrics?.closingRate ?? 0;
  const totalGCI     = metrics?.totalCommission ?? 0;
  const closed       = metrics?.closed ?? 0;
  const active       = metrics?.activeListings ?? 0;
  const underContract = metrics?.underContract ?? 0;
  const archived     = metrics?.archived ?? 0;
  const companyDollar = metrics?.totalCompanyDollar ?? 0;
  const avgGCI       = totalTx > 0 ? totalGCI / totalTx : 0;

  // ── Q2 goal coverage ──
  const now = new Date();
  const q2Start = new Date(now.getFullYear(), 3, 1);
  const q2End   = new Date(now.getFullYear(), 5, 30);

  const q2Closed = useMemo(() =>
    filteredRecords
      .filter(r => {
        if (r.loopStatus !== 'Closed') return false;
        const d = r.closingDate ? new Date(r.closingDate) : null;
        return d && d >= q2Start && d <= q2End;
      })
      .reduce((s, r) => s + (r.commissionTotal || 0), 0),
  [filteredRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  const pipelineGCI = useMemo(() =>
    filteredRecords
      .filter(r => r.loopStatus === 'Under Contract')
      .reduce((s, r) => s + (r.commissionTotal || 0), 0),
  [filteredRecords]);

  const q2Target     = Math.max(q2Closed + pipelineGCI, 100) * 1.25;
  const forecastEOQ  = q2Closed + pipelineGCI * (riskAdjust[0] / 100);
  const closedPct    = Math.min((q2Closed / q2Target) * 100, 100);
  const pipelinePct  = Math.min((pipelineGCI / q2Target) * 100, 100 - closedPct);
  const gapPct       = Math.max(100 - closedPct - pipelinePct, 0);

  // ── Closing this week ──
  const weekDays = useMemo(() => {
    const strip = getWeekStrip();
    const today = new Date();
    return strip.map((day, i) => {
      const dayRecs = filteredRecords.filter(r => {
        const d = r.closingDate ? new Date(r.closingDate) : null;
        return d && !isNaN(d.getTime()) && isSameDay(d, day);
      });
      const volume = dayRecs.reduce((s, r) => s + (r.salePrice || r.price || 0), 0);
      return { label: DAY_LABELS[i], day, count: dayRecs.length, volume, isToday: isSameDay(day, today) };
    });
  }, [filteredRecords]);

  const maxDayCount = Math.max(...weekDays.map(d => d.count), 1);

  // ── Pipeline breakdown ──
  const pipelineBreakdown = useMemo(() => [
    {
      label: 'Sold / Closed', count: closed, color: '#10b981',
      filter: (s: string) => s === 'Closed',
      volume: filteredRecords.filter(r => r.loopStatus === 'Closed').reduce((s, r) => s + (r.salePrice || 0), 0),
    },
    {
      label: 'Active Listings', count: active, color: '#3b82f6',
      filter: (s: string) => s === 'Active' || s === 'Active Listing',
      volume: filteredRecords.filter(r => r.loopStatus === 'Active' || r.loopStatus === 'Active Listing').reduce((s, r) => s + (r.price || 0), 0),
    },
    {
      label: 'Under Contract', count: underContract, color: '#f59e0b',
      filter: (s: string) => s === 'Under Contract',
      volume: filteredRecords.filter(r => r.loopStatus === 'Under Contract').reduce((s, r) => s + (r.salePrice || r.price || 0), 0),
    },
    {
      label: 'Archived', count: archived, color: '#64748b',
      filter: (s: string) => s === 'Archived',
      volume: 0,
    },
  ], [filteredRecords, closed, active, underContract, archived]);

  // ── Projected to close ──
  const ucVolume = useMemo(() =>
    filteredRecords.filter(r => r.loopStatus === 'Under Contract').reduce((s, r) => s + (r.salePrice || r.price || 0), 0),
  [filteredRecords]);

  const projected = {
    deals:   { '30': Math.round(underContract * 0.4), '60': Math.round(underContract * 0.7), '90': Math.round(underContract * 0.9) },
    revenue: { '30': ucVolume * 0.4, '60': ucVolume * 0.7, '90': ucVolume * 0.9 },
  };

  // ── AI insights ──
  const aiInsights = useMemo(() => {
    const topAgent = [...agentMetrics].sort((a, b) => b.closedDeals - a.closedDeals)[0];
    return [
      {
        icon: <Trophy className="w-5 h-5" />,
        color: '#f59e0b', bg: 'bg-yellow-500/10',
        tag: 'Top Performer', tagCls: 'bg-yellow-500/20 text-yellow-400 border-0',
        title: topAgent
          ? `${topAgent.agentName} leads with ${topAgent.closedDeals} closed deals`
          : 'Load data to see top performer',
        body: topAgent
          ? `${compactCurrency(topAgent.totalSalesVolume)} total volume · ${topAgent.closingRate.toFixed(0)}% close rate`
          : 'Upload a CSV to unlock agent insights.',
      },
      {
        icon: <TrendingUp className="w-5 h-5" />,
        color: '#10b981', bg: 'bg-emerald-500/10',
        tag: 'Trend', tagCls: 'bg-emerald-500/20 text-emerald-400 border-0',
        title: underContract > closed
          ? 'Pipeline building ahead of closings'
          : 'Closings outpacing pipeline — refill soon',
        body: `${underContract} under contract vs ${closed} closed · ${closingRate.toFixed(0)}% historical close rate`,
      },
      {
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: '#3b82f6', bg: 'bg-blue-500/10',
        tag: 'Status', tagCls: 'bg-blue-500/20 text-blue-400 border-0',
        title: 'No anomalies detected',
        body: `All ${totalTx} transactions look clean. File compliance at 92%.`,
      },
    ];
  }, [agentMetrics, closed, underContract, closingRate, totalTx]);

  // ── Activity row ──
  const activityNow = [
    { label: 'Appointments',        value: 14, trend: +3,  icon: <Users className="w-4 h-4 text-blue-400" /> },
    { label: 'Showings logged',     value: 23, trend: +5,  icon: <Home className="w-4 h-4 text-emerald-400" /> },
    { label: 'New leads',           value: 11, trend: -2,  icon: <Activity className="w-4 h-4 text-yellow-400" /> },
    { label: 'Listings going live', value: 3,  trend: 0,   icon: <BarChart2 className="w-4 h-4 text-purple-400" /> },
    { label: 'Open houses Sat/Sun', value: 8,  trend: +1,  icon: <Target className="w-4 h-4 text-cyan-400" /> },
  ];

  // ─── Empty state ─────────────────────────────────────────────────────────────

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <BarChart2 className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Data Loaded</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV export from Dotloop, or load demo data to explore the dashboard.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation('/upload')}>
            Upload CSV
          </Button>
          <Button onClick={activateDemoMode} className="bg-emerald-500 hover:bg-emerald-600 text-white">
            Load Demo Data
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-1 pb-8">

      {/* ── 1. ACTION QUEUE ── */}
      <section>
        <SectionLabel sub={`${visibleActions.length} items`}>Action Queue</SectionLabel>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {visibleActions.map(item => (
            <div
              key={item.id}
              className="flex-none w-60 bg-background border border-border rounded-xl p-4 cursor-pointer hover:border-border transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg" style={{ background: item.typeColor + '20', color: item.typeColor }}>
                    {item.icon}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: item.typeColor }}>{item.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{item.age}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setDismissed(prev => new Set([...prev, item.id])); }}
                    className="text-muted-foreground hover:text-muted-foreground ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <p className="text-foreground text-sm font-semibold leading-snug mb-1">{item.title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed mb-2 line-clamp-2">{item.description}</p>
              <p className="text-muted-foreground text-xs">{item.agent}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. GOAL & PIPELINE COVERAGE ── */}
      <section className="bg-background border border-border rounded-xl p-5">
        <SectionLabel>Goal &amp; Pipeline Coverage</SectionLabel>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
          {[
            { label: 'Closed Q2 GCI',  value: compactCurrency(q2Closed),   sub: 'Year to date' },
            { label: 'Pipeline GCI',   value: compactCurrency(pipelineGCI), sub: 'Under contract' },
            { label: 'Q2 Target',      value: compactCurrency(q2Target),    sub: 'Brokerage goal' },
            { label: 'Forecast EOQ',   value: compactCurrency(forecastEOQ), sub: `${riskAdjust[0]}% conversion` },
          ].map(m => (
            <div key={m.label}>
              <p className="text-muted-foreground text-xs mb-1">{m.label}</p>
              <p className="text-foreground text-xl font-bold tabular-nums">{m.value}</p>
              <p className="text-muted-foreground text-xs">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Coverage bar */}
        <div className="mb-5">
          <div className="flex h-4 rounded-full overflow-hidden bg-secondary">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${closedPct}%` }} />
            <div className="h-full bg-blue-500/70 transition-all" style={{ width: `${pipelinePct}%` }} />
            {gapPct > 0 && <div className="h-full flex-1 bg-secondary" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #ef444433 4px, #ef444433 8px)' }} />}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Closed ({closedPct.toFixed(0)}%)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Projected ({pipelinePct.toFixed(0)}%)</span>
            {gapPct > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500/60 inline-block" />Gap ({gapPct.toFixed(0)}%)</span>}
          </div>
        </div>

        {/* Pipeline funnel */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Active',         count: active,        volume: filteredRecords.filter(r => r.loopStatus === 'Active' || r.loopStatus === 'Active Listing').reduce((s, r) => s + (r.price || 0), 0), color: 'text-blue-400' },
            { label: 'Under Contract', count: underContract, volume: filteredRecords.filter(r => r.loopStatus === 'Under Contract').reduce((s, r) => s + (r.salePrice || 0), 0), color: 'text-yellow-400' },
            { label: 'Closed',         count: closed,        volume: filteredRecords.filter(r => r.loopStatus === 'Closed').reduce((s, r) => s + (r.salePrice || 0), 0), color: 'text-emerald-400' },
          ].map(f => (
            <div key={f.label} className="flex-1 min-w-[100px] bg-secondary rounded-lg px-4 py-3 text-center">
              <p className={`text-2xl font-bold tabular-nums ${f.color}`}>{f.count}</p>
              <p className="text-foreground text-xs font-medium mt-0.5">{f.label}</p>
              <p className="text-muted-foreground text-xs mt-0.5">{compactCurrency(f.volume)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. FOUR METRIC CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Transactions',
            value: totalTx.toString(),
            sub: `${closed} closed · ${active} active`,
            icon: <FileText className="w-5 h-5 text-blue-400" />,
            border: 'border-blue-500/25',
            drill: { title: 'All Transactions', records: filteredRecords },
          },
          {
            label: 'Total Sales Volume',
            value: compactCurrency(totalVolume),
            sub: `Avg ${compactCurrency(totalVolume / Math.max(closed, 1))} / deal`,
            icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
            border: 'border-emerald-500/25',
            drill: { title: 'Closed by Volume', records: filteredRecords.filter(r => r.loopStatus === 'Closed') },
          },
          {
            label: 'Closing Rate',
            value: `${closingRate.toFixed(0)}%`,
            sub: `${closed} of ${totalTx} transactions`,
            icon: <Target className="w-5 h-5 text-yellow-400" />,
            border: 'border-yellow-500/25',
            drill: { title: 'Closed Deals', records: filteredRecords.filter(r => r.loopStatus === 'Closed') },
          },
          {
            label: 'Pipeline Status',
            value: `${underContract + active}`,
            sub: `${underContract} UC · ${active} active`,
            icon: <Activity className="w-5 h-5 text-purple-400" />,
            border: 'border-purple-500/25',
            drill: {
              title: 'Active Pipeline',
              records: filteredRecords.filter(r => r.loopStatus === 'Under Contract' || r.loopStatus === 'Active' || r.loopStatus === 'Active Listing'),
            },
          },
        ].map(card => (
          <div
            key={card.label}
            onClick={() => setDrillTarget(card.drill)}
            className={`bg-background border ${card.border} rounded-xl p-5 cursor-pointer hover:bg-secondary transition-colors`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground text-xs font-medium">{card.label}</span>
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums mb-1">{card.value}</p>
            <p className="text-muted-foreground text-xs">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 4. PIPELINE BREAKDOWN + PROJECTED TO CLOSE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pipeline Breakdown */}
        <div className="bg-background border border-border rounded-xl p-5">
          <SectionLabel>Pipeline Breakdown</SectionLabel>
          <div className="space-y-1">
            {pipelineBreakdown.map(item => (
              <div
                key={item.label}
                onClick={() => setDrillTarget({
                  title: item.label,
                  records: filteredRecords.filter(r => item.filter(r.loopStatus || '')),
                })}
                className="flex items-center justify-between border-l-4 pl-3 py-2.5 rounded-r-lg hover:bg-secondary cursor-pointer transition-colors"
                style={{ borderLeftColor: item.color }}
              >
                <div>
                  <p className="text-foreground text-sm font-medium">{item.label}</p>
                  <p className="text-muted-foreground text-xs">{item.volume > 0 ? compactCurrency(item.volume) : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-foreground font-bold tabular-nums">{item.count}</p>
                  <p className="text-muted-foreground text-xs">{((item.count / Math.max(totalTx, 1)) * 100).toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projected to Close */}
        <div className="bg-background border border-border rounded-xl p-5">
          <SectionLabel>Projected to Close</SectionLabel>
          <Tabs value={projectedTab} onValueChange={v => setProjectedTab(v as '30' | '60' | '90')}>
            <TabsList className="bg-secondary mb-4 h-8">
              {(['30', '60', '90'] as const).map(t => (
                <TabsTrigger key={t} value={t} className="data-[state=active]:bg-secondary data-[state=active]:text-white text-muted-foreground text-xs h-full">
                  {t}d
                </TabsTrigger>
              ))}
            </TabsList>
            {(['30', '60', '90'] as const).map(t => (
              <TabsContent key={t} value={t}>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Projected Deals',   value: projected.deals[t].toString(),      color: 'text-blue-400' },
                    { label: 'Projected Revenue', value: compactCurrency(projected.revenue[t]), color: 'text-emerald-400' },
                    { label: 'Close Rate',         value: `${closingRate.toFixed(0)}%`,        color: 'text-yellow-400' },
                  ].map(m => (
                    <div key={m.label} className="bg-secondary rounded-lg p-3 text-center">
                      <p className={`text-xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
                      <p className="text-muted-foreground text-xs mt-1 leading-tight">{m.label}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-muted-foreground text-xs">Commission Risk Adjustment</p>
              <p className="text-foreground text-xs font-semibold tabular-nums">{riskAdjust[0]}%</p>
            </div>
            <Slider value={riskAdjust} onValueChange={setRiskAdjust} min={50} max={100} step={5} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>Conservative (50%)</span>
              <span>Optimistic (100%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. CLOSING THIS WEEK ── */}
      <section className="bg-background border border-border rounded-xl p-5">
        <SectionLabel>Closing This Week</SectionLabel>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div
              key={day.label}
              className={`rounded-xl p-3 text-center transition-colors ${
                day.isToday
                  ? 'bg-blue-600/15 border border-blue-500/40'
                  : 'bg-secondary border border-transparent'
              }`}
            >
              <p className={`text-xs font-semibold mb-2 ${day.isToday ? 'text-blue-400' : 'text-muted-foreground'}`}>
                {day.label}
              </p>
              {/* Mini bar */}
              <div className="flex justify-center items-end h-9 mb-2">
                <div
                  className={`w-5 rounded-t-sm transition-all ${day.isToday ? 'bg-blue-500' : 'bg-secondary'}`}
                  style={{ height: `${Math.max((day.count / maxDayCount) * 100, 8)}%` }}
                />
              </div>
              <p className={`text-xl font-bold tabular-nums ${day.isToday ? 'text-blue-300' : 'text-foreground'}`}>
                {day.count}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {day.volume > 0 ? compactCurrency(day.volume) : '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. THREE-COLUMN ROW ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Activity Right Now */}
        <div className="bg-background border border-border rounded-xl p-5">
          <SectionLabel>Activity Right Now</SectionLabel>
          <div className="space-y-3">
            {activityNow.map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-foreground text-sm">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-bold tabular-nums">{item.value}</span>
                  <span className={`text-xs flex items-center ${
                    item.trend > 0 ? 'text-emerald-400' : item.trend < 0 ? 'text-red-400' : 'text-muted-foreground'
                  }`}>
                    {item.trend > 0
                      ? <ArrowUpRight className="w-3 h-3" />
                      : item.trend < 0
                      ? <ArrowDownRight className="w-3 h-3" />
                      : <Minus className="w-3 h-3" />
                    }
                    {item.trend !== 0 && Math.abs(item.trend)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Recruiting Funnel */}
        <div className="bg-background border border-border rounded-xl p-5">
          <SectionLabel>Agent Recruiting Funnel</SectionLabel>
          <div className="space-y-4">
            {RECRUITING_STAGES.map(stage => (
              <div key={stage.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-foreground text-sm">{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold text-sm tabular-nums">{stage.count}</span>
                    <span className="text-muted-foreground text-xs tabular-nums w-8 text-right">{stage.pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stage.pct}%`, background: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* File Compliance */}
        <div className="bg-background border border-border rounded-xl p-5">
          <SectionLabel>File Compliance</SectionLabel>
          <div className="flex items-center gap-4 mb-5">
            {/* SVG ring */}
            <div className="relative flex-none w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1a2332" strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.5"
                  strokeDasharray="92 8" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs">92%</span>
            </div>
            <div>
              <p className="text-foreground font-bold text-2xl tabular-nums">92%</p>
              <p className="text-muted-foreground text-xs">Compliance score</p>
              <p className="text-emerald-400 text-xs mt-0.5">↑ 3% vs last month</p>
            </div>
          </div>
          <div className="space-y-2">
            {COMPLIANCE_ISSUES.map(issue => (
              <div key={issue.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-none" style={{ background: issue.color }} />
                  <span className="text-foreground text-xs">{issue.label}</span>
                </div>
                <span className="font-bold text-sm tabular-nums" style={{ color: issue.color }}>{issue.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 7. MARKET PULSE ── */}
      <section>
        <SectionLabel>Market Pulse</SectionLabel>
        <div className="grid grid-cols-3 gap-4">
          {MARKET_PULSE.map(item => (
            <div key={item.label} className="bg-background border border-border rounded-xl p-5">
              <p className="text-muted-foreground text-xs mb-2">{item.label}</p>
              <p className="text-foreground text-2xl font-bold tabular-nums mb-1">{item.value}</p>
              <p className="text-muted-foreground text-xs mb-2">{item.sub}</p>
              <span className={`flex items-center gap-1 text-xs font-medium ${item.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {item.trend}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 8. BROKERAGE HEALTH ── */}
      <section className="bg-background border border-border rounded-xl p-5">
        <SectionLabel>Brokerage Health</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Net to Brokerage', value: compactCurrency(companyDollar),           sub: 'Company dollar YTD', color: 'text-emerald-400' },
            { label: 'Avg GCI per Deal',  value: compactCurrency(avgGCI),                  sub: `Based on ${totalTx} deals`,   color: 'text-blue-400' },
            { label: 'Caps Collected',    value: compactCurrency(totalGCI * 0.08),          sub: 'Est. from GCI',         color: 'text-yellow-400' },
            { label: 'Agent Retention',   value: '96%',                                     sub: '1 agent lost YTD',      color: 'text-purple-400' },
          ].map(m => (
            <div key={m.label}>
              <p className="text-muted-foreground text-xs mb-1">{m.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${m.color}`}>{m.value}</p>
              <p className="text-muted-foreground text-xs mt-1">{m.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 9. AI INSIGHTS ── */}
      <section>
        <SectionLabel>AI Insights</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {aiInsights.map((insight, i) => (
            <div key={i} className="bg-background border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${insight.bg} flex-none`} style={{ color: insight.color }}>
                  {insight.icon}
                </div>
                <Badge className={`text-xs ${insight.tagCls}`}>{insight.tag}</Badge>
              </div>
              <p className="text-foreground text-sm font-semibold mb-1.5 leading-snug">{insight.title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{insight.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Drill-down modal ── */}
      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} onAgentClick={(name) => openAgent(name, filteredRecords, agentMetrics)} />
      <AgentDetailModal target={agentTarget} onClose={closeAgent} />
    </div>
  );
}
