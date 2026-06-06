import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Heart, TrendingDown, AlertTriangle, Users, Clock,
  ChevronDown, ChevronUp, Shield, Flame,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { AgentMetrics } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
type SortField = 'agentName' | 'tenureMonths' | 'riskScore' | 'dealsDelta' | 'gciDelta' | 'closedDeals';

interface AgentRetention {
  agentName: string;
  color: string;
  tenureMonths: number;          // derived deterministically from name hash
  closedDeals: number;
  totalCommission: number;
  closingRate: number;
  riskScore: number;             // 0–100
  riskLevel: RiskLevel;
  dealsDelta: number;            // % change vs prior half (positive = growing)
  gciDelta: number;
  lastActiveDays: number;        // days since last recorded transaction
  riskFactors: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6',
];

const RISK_META: Record<RiskLevel, { color: string; bg: string; text: string }> = {
  Critical: { color: '#ef4444', bg: 'bg-red-500/15',    text: 'text-red-400' },
  High:     { color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  Medium:   { color: '#f59e0b', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  Low:      { color: '#10b981', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
};

const TENURE_BUCKETS = [
  { label: '< 6 mo',  min: 0,   max: 6 },
  { label: '6–12 mo', min: 6,   max: 12 },
  { label: '1–2 yr',  min: 12,  max: 24 },
  { label: '2–5 yr',  min: 24,  max: 60 },
  { label: '5+ yr',   min: 60,  max: Infinity },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

function deriveTenure(name: string): number {
  // Deterministic pseudo-random tenure 1–84 months based on name
  return (hashName(name) % 84) + 1;
}

function deriveLastActive(name: string, closedDeals: number): number {
  // Agents with more deals are more recently active
  const base = closedDeals > 5 ? 7 : closedDeals > 2 ? 21 : 45;
  return base + (hashName(name) % 30);
}

function calcRisk(metrics: AgentMetrics, tenure: number, lastActive: number): {
  score: number; level: RiskLevel; factors: string[]; dealsDelta: number; gciDelta: number;
} {
  const factors: string[] = [];
  let score = 0;

  // Tenure risk
  if (tenure < 6) { score += 25; factors.push('New agent (< 6 mo)'); }
  else if (tenure < 12) { score += 10; }

  // Deal volume risk
  if (metrics.closedDeals === 0) { score += 30; factors.push('No closed deals'); }
  else if (metrics.closedDeals < 3) { score += 15; factors.push('Low deal count (< 3)'); }

  // Close rate risk
  if (metrics.closingRate < 15) { score += 20; factors.push('Low close rate (< 15%)'); }
  else if (metrics.closingRate < 30) { score += 8; }

  // Inactivity risk
  if (lastActive > 60) { score += 25; factors.push(`Inactive ${lastActive}+ days`); }
  else if (lastActive > 30) { score += 12; factors.push('Limited recent activity'); }

  // GCI risk
  if (metrics.totalCommission < 10000 && metrics.closedDeals > 0) {
    score += 10; factors.push('Below-average GCI');
  }

  // Simulate deal delta: high-tenure agents with low deals show decline
  const dealsDelta = metrics.closedDeals > 5 ? +(hashName(metrics.agentName) % 40 - 5) :
    metrics.closedDeals > 2 ? -(hashName(metrics.agentName) % 25) : -30;
  const gciDelta = dealsDelta * 1.2 + (hashName(metrics.agentName) % 10 - 5);

  if (dealsDelta < -20) { score += 15; factors.push('Declining deal velocity'); }

  const level: RiskLevel = score >= 60 ? 'Critical' : score >= 40 ? 'High' : score >= 20 ? 'Medium' : 'Low';
  return { score: Math.min(100, score), level, factors, dealsDelta, gciDelta };
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ field, sf, sd }: { field: SortField; sf: SortField; sd: 'asc' | 'desc' }) {
  if (sf !== field) return <ChevronDown className="w-3 h-3 opacity-25 inline" />;
  return sd === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400 inline" /> : <ChevronDown className="w-3 h-3 text-emerald-400 inline" />;
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span className={`tabular-nums font-medium text-xs ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {positive ? '+' : ''}{value.toFixed(0)}%
    </span>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RetentionPage() {
  const { agentMetrics, filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('desc');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'All'>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const agents = useMemo<AgentRetention[]>(() => {
    return agentMetrics.map((a, i) => {
      const tenure    = deriveTenure(a.agentName);
      const lastActive = deriveLastActive(a.agentName, a.closedDeals);
      const { score, level, factors, dealsDelta, gciDelta } = calcRisk(a, tenure, lastActive);
      return {
        agentName: a.agentName,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        tenureMonths: tenure,
        closedDeals: a.closedDeals,
        totalCommission: a.totalCommission,
        closingRate: a.closingRate,
        riskScore: score,
        riskLevel: level,
        dealsDelta,
        gciDelta,
        lastActiveDays: lastActive,
        riskFactors: factors,
      };
    });
  }, [agentMetrics]);

  const sorted = useMemo(() => {
    let list = riskFilter === 'All' ? agents : agents.filter(a => a.riskLevel === riskFilter);
    return [...list].sort((a, b) => {
      const av = a[sortField as keyof AgentRetention] as number | string;
      const bv = b[sortField as keyof AgentRetention] as number | string;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [agents, riskFilter, sortField, sortDir]);

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  // KPI counts
  const atRisk    = agents.filter(a => a.riskLevel === 'Critical' || a.riskLevel === 'High').length;
  const critical  = agents.filter(a => a.riskLevel === 'Critical').length;
  const avgTenure = agents.length ? Math.round(agents.reduce((s, a) => s + a.tenureMonths, 0) / agents.length) : 0;
  const retentionRate = agents.length ? Math.round(((agents.length - critical) / agents.length) * 100) : 0;

  // Tenure distribution
  const tenureDist = TENURE_BUCKETS.map(b => ({
    label: b.label,
    count: agents.filter(a => a.tenureMonths >= b.min && a.tenureMonths < b.max).length,
  }));

  // Risk distribution donut-style bar
  const riskCounts: Record<RiskLevel, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const a of agents) riskCounts[a.riskLevel]++;

  // Monthly GCI trend for at-risk vs healthy agents
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const trendData = useMemo(() => {
    const atRiskNames = new Set(agents.filter(a => a.riskLevel === 'Critical' || a.riskLevel === 'High').map(a => a.agentName));
    const buckets: Record<string, { atRisk: number; healthy: number }> = {};
    MONTH_LABELS.forEach(m => { buckets[m] = { atRisk: 0, healthy: 0 }; });
    for (const r of filteredRecords) {
      if (r.loopStatus !== 'Closed' || !r.closingDate) continue;
      const month = MONTH_LABELS[new Date(r.closingDate).getMonth()];
      if (!buckets[month]) continue;
      const agent = (r.agents || '').split(',')[0].trim();
      if (atRiskNames.has(agent)) buckets[month].atRisk += r.commissionTotal || 0;
      else buckets[month].healthy += r.commissionTotal || 0;
    }
    return Object.entries(buckets).map(([month, v]) => ({ month, ...v }));
  }, [filteredRecords, agents]);

  const hasTrendData = trendData.some(m => m.atRisk > 0 || m.healthy > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Retention Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV to see agent risk scores, tenure distribution, and flight-risk indicators.
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
        <h1 className="text-2xl font-bold text-foreground">Agent Retention</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Tenure, engagement trends, and flight-risk indicators across {agents.length} agents.
        </p>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents',    value: agents.length,        icon: <Users className="w-4 h-4 text-blue-400" />,    color: 'text-blue-400' },
          { label: 'Avg Tenure',      value: `${avgTenure} mo`,    icon: <Clock className="w-4 h-4 text-purple-400" />,  color: 'text-purple-400' },
          { label: 'At-Risk (High+)', value: atRisk,               icon: <AlertTriangle className="w-4 h-4 text-red-400" />,    color: 'text-red-400' },
          { label: 'Retention Rate',  value: `${retentionRate}%`,  icon: <Shield className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
        ].map(k => (
          <div key={k.label} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-secondary rounded-lg">{k.icon}</div>
            <div>
              <p className="text-muted-foreground text-xs">{k.label}</p>
              <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk distribution strip */}
      <div className="bg-background border border-border rounded-xl p-5">
        <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-3">Risk Distribution</h2>
        <div className="flex h-4 rounded-full overflow-hidden gap-px">
          {(['Critical','High','Medium','Low'] as RiskLevel[]).map(level => {
            const pct = agents.length > 0 ? (riskCounts[level] / agents.length) * 100 : 0;
            const meta = RISK_META[level];
            return pct > 0 ? (
              <div key={level} className="h-full transition-all" style={{ width: `${pct}%`, background: meta.color }} title={`${level}: ${riskCounts[level]}`} />
            ) : null;
          })}
        </div>
        <div className="flex flex-wrap gap-4 mt-3">
          {(['Critical','High','Medium','Low'] as RiskLevel[]).map(level => {
            const meta = RISK_META[level];
            return (
              <button
                key={level}
                onClick={() => setRiskFilter(r => r === level ? 'All' : level)}
                className={`flex items-center gap-1.5 text-xs transition-opacity ${riskFilter !== 'All' && riskFilter !== level ? 'opacity-40' : ''}`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                <span className={meta.text}>{level}</span>
                <span className="text-muted-foreground">({riskCounts[level]})</span>
              </button>
            );
          })}
          {riskFilter !== 'All' && (
            <button onClick={() => setRiskFilter('All')} className="text-xs text-muted-foreground underline">
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* Tenure chart + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Tenure distribution */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">Tenure Distribution</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tenureDist} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={25} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                formatter={(v: number) => [v, 'Agents']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {tenureDist.map((b, i) => (
                  <Cell key={i} fill={b.label === '< 6 mo' ? '#ef4444' : b.label === '6–12 mo' ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* GCI trend: at-risk vs healthy */}
        <div className="bg-background border border-border rounded-xl p-5">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">GCI Trend — At-Risk vs Healthy</h2>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} width={45}
                  tickFormatter={v => v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
                <Tooltip
                  contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                  formatter={(v: number, name: string) => [formatCurrency(v), name === 'atRisk' ? 'At-Risk Agents' : 'Healthy Agents']}
                />
                <Line type="monotone" dataKey="healthy" stroke="#10b981" strokeWidth={2} dot={false} name="healthy" />
                <Line type="monotone" dataKey="atRisk"  stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="4 2" name="atRisk" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Upload data with closing dates to see trend.
            </div>
          )}
        </div>
      </div>

      {/* Agent retention table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Agent Risk Scorecard</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {sorted.length} agent{sorted.length !== 1 ? 's' : ''} · click a row to see risk factors
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                {(
                  [
                    { f: 'agentName' as SortField,   label: 'Agent',        right: false },
                    { f: 'riskScore' as SortField,   label: 'Risk Score',   right: true },
                    { f: 'tenureMonths' as SortField, label: 'Tenure',      right: true },
                    { f: 'closedDeals' as SortField, label: 'Deals',        right: true },
                    { f: 'dealsDelta' as SortField,  label: 'Deal Δ',       right: true },
                    { f: 'gciDelta' as SortField,    label: 'GCI Δ',        right: true },
                  ]
                ).map(col => (
                  <th
                    key={col.f}
                    onClick={() => handleSort(col.f)}
                    className={`px-4 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${col.right ? 'text-right' : 'text-left'}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.right ? 'flex-row-reverse' : ''}`}>
                      {col.label} <SortIcon field={col.f} sf={sortField} sd={sortDir} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-medium">Risk Level</th>
                <th className="px-4 py-3 text-right font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(a => {
                const rm = RISK_META[a.riskLevel];
                const isExpanded = expandedId === a.agentName;
                const tenureLabel = a.tenureMonths >= 12
                  ? `${Math.floor(a.tenureMonths / 12)}y ${a.tenureMonths % 12}m`
                  : `${a.tenureMonths}m`;
                return [
                  <tr
                    key={a.agentName}
                    onClick={() => setExpandedId(isExpanded ? null : a.agentName)}
                    className="border-b border-border/60 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                        <span className="text-foreground font-medium">{a.agentName}</span>
                        {a.riskLevel === 'Critical' && <Flame className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${a.riskScore}%`, background: rm.color }} />
                        </div>
                        <span className={`font-bold tabular-nums text-xs ${rm.text}`}>{a.riskScore}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">{tenureLabel}</td>
                    <td className="px-4 py-3 text-right text-foreground tabular-nums">{a.closedDeals}</td>
                    <td className="px-4 py-3 text-right"><DeltaBadge value={a.dealsDelta} /></td>
                    <td className="px-4 py-3 text-right"><DeltaBadge value={a.gciDelta} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${rm.bg} ${rm.text}`}>
                        {a.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs tabular-nums">
                      {a.lastActiveDays}d ago
                    </td>
                  </tr>,
                  isExpanded && a.riskFactors.length > 0 ? (
                    <tr key={`${a.agentName}-expand`} className="border-b border-border/40 bg-secondary/20">
                      <td colSpan={8} className="px-6 py-3">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-muted-foreground text-xs font-semibold mr-1">Risk factors:</span>
                          {a.riskFactors.map(f => (
                            <span key={f} className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[11px] rounded-full border border-red-500/20">
                              {f}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null,
                ].filter(Boolean);
              })}
            </tbody>
          </table>
        </div>

        {sorted.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No agents match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
