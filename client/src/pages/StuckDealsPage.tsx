import { useState, useMemo } from 'react';
import { useSettings } from '@/hooks/useSettings';
import {
  AlertTriangle, ChevronUp, ChevronDown, Search, X,
  TrendingDown, Clock, AlertCircle, Filter,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { DotloopRecord } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortField = 'address' | 'daysInStage' | 'salePrice' | 'agentName' | 'risk';
type SortDir = 'asc' | 'desc';
type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
type StageFilter = 'All' | 'Active' | 'Under Contract' | 'Active Listing';

// ─── Derived type ─────────────────────────────────────────────────────────────

interface StuckDeal {
  record: DotloopRecord;
  daysInStage: number;
  agentName: string;
  risk: RiskLevel;
  riskScore: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────


function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

function calcRisk(days: number, threshold: number, status: string): { level: RiskLevel; score: number } {
  const ratio = threshold > 0 ? days / threshold : 0;
  if (days >= threshold * 2 || (status === 'Under Contract' && days >= 60)) return { level: 'Critical', score: 4 };
  if (ratio >= 1.5) return { level: 'High', score: 3 };
  if (ratio >= 1.0) return { level: 'Medium', score: 2 };
  return { level: 'Low', score: 1 };
}

const RISK_META: Record<RiskLevel, { color: string; bg: string; text: string }> = {
  Critical: { color: '#ef4444', bg: 'bg-red-500/15',    text: 'text-red-400' },
  High:     { color: '#f97316', bg: 'bg-orange-500/15', text: 'text-orange-400' },
  Medium:   { color: '#f59e0b', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  Low:      { color: '#6b7280', bg: 'bg-gray-500/15',   text: 'text-muted-foreground' },
};

const STAGE_META: Record<string, { bg: string; text: string }> = {
  'Active Listing': { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'Active':         { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'Under Contract': { bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
};

function SortIcon({ field, sf, sd }: { field: SortField; sf: SortField; sd: SortDir }) {
  if (sf !== field) return <ChevronDown className="w-3 h-3 opacity-25 inline" />;
  return sd === 'asc'
    ? <ChevronUp className="w-3 h-3 text-emerald-400 inline" />
    : <ChevronDown className="w-3 h-3 text-emerald-400 inline" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StuckDealsPage() {
  const { filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const { settings } = useSettings();
  const STUCK_DAYS: Record<string, number> = {
    'Active Listing': 60,
    'Active': 60,
    'Under Contract': settings.alerts.stuckDealEnabled ? settings.alerts.stuckDealDays : 30,
  };
  const [sortField, setSortField] = useState<SortField>('daysInStage');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('All');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'All'>('All');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  // Derive stuck deals — any Active or Under Contract record past the threshold
  const stuckDeals = useMemo<StuckDeal[]>(() => {
    const results: StuckDeal[] = [];
    const now = Date.now();
    for (const r of filteredRecords) {
      const status = r.loopStatus || '';
      const threshold = STUCK_DAYS[status];
      if (threshold === undefined) continue;
      const refDate = r.offerDate || r.listingDate || r.createdDate;
      if (!refDate) continue;
      const days = Math.floor((now - new Date(refDate).getTime()) / 86400000);
      if (days < 0) continue;
      const { level, score } = calcRisk(days, threshold, status);
      const agentName = (r.agents || r.createdBy || '—').split(',')[0].trim();
      results.push({ record: r, daysInStage: days, agentName, risk: level, riskScore: score });
    }
    return results;
  }, [filteredRecords]);

  const filtered = useMemo(() => {
    let list = stuckDeals;
    if (stageFilter !== 'All') list = list.filter(d => d.record.loopStatus === stageFilter);
    if (riskFilter !== 'All') list = list.filter(d => d.risk === riskFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        (d.record.address || '').toLowerCase().includes(q) ||
        d.agentName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortField) {
        case 'address':     av = a.record.address ?? ''; bv = b.record.address ?? ''; break;
        case 'daysInStage': av = a.daysInStage; bv = b.daysInStage; break;
        case 'salePrice':   av = a.record.salePrice || a.record.price || 0; bv = b.record.salePrice || b.record.price || 0; break;
        case 'agentName':   av = a.agentName; bv = b.agentName; break;
        case 'risk':        av = a.riskScore; bv = b.riskScore; break;
        default:            av = 0; bv = 0;
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? av - (bv as number) : (bv as number) - av;
    });
  }, [stuckDeals, stageFilter, riskFilter, search, sortField, sortDir]);

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  // KPI counts
  const critical   = stuckDeals.filter(d => d.risk === 'Critical').length;
  const high       = stuckDeals.filter(d => d.risk === 'High').length;
  const stuckVol   = stuckDeals.reduce((s, d) => s + (d.record.salePrice || d.record.price || 0), 0);
  const overdueUC  = stuckDeals.filter(d => d.record.loopStatus === 'Under Contract' && d.daysInStage > 45).length;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Transaction Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV to identify deals that have been stuck in a stage longer than expected.
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
        <h1 className="text-2xl font-bold text-foreground">Stuck Deals</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Active and under-contract deals past their expected stage duration.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Stuck Deals', value: stuckDeals.length,
            icon: <AlertTriangle className="w-4 h-4 text-red-400" />, color: 'text-red-400',
            records: stuckDeals.map(d => d.record),
          },
          {
            label: 'Stuck Volume', value: formatCurrency(stuckVol).replace('$', '$').replace('.00', ''),
            icon: <TrendingDown className="w-4 h-4 text-orange-400" />, color: 'text-orange-400',
            records: [...stuckDeals].sort((a, b) => (b.record.salePrice || 0) - (a.record.salePrice || 0)).map(d => d.record),
          },
          {
            label: 'Overdue Under Contract', value: overdueUC,
            icon: <Clock className="w-4 h-4 text-yellow-400" />, color: 'text-yellow-400',
            records: stuckDeals.filter(d => d.record.loopStatus === 'Under Contract' && d.daysInStage > 45).map(d => d.record),
          },
          {
            label: 'Critical + High Risk', value: critical + high,
            icon: <AlertCircle className="w-4 h-4 text-red-400" />, color: 'text-red-400',
            records: stuckDeals.filter(d => d.risk === 'Critical' || d.risk === 'High').map(d => d.record),
          },
        ].map(k => (
          <div key={k.label} onClick={() => setDrillTarget({ title: k.label, records: k.records })} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="p-2 bg-secondary rounded-lg">{k.icon}</div>
            <div>
              <p className="text-muted-foreground text-xs">{k.label}</p>
              <p className={`text-xl font-bold tabular-nums ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk summary bar */}
      <div className="flex gap-2 flex-wrap">
        {(['All', 'Critical', 'High', 'Medium', 'Low'] as const).map(r => {
          const cnt = r === 'All' ? stuckDeals.length : stuckDeals.filter(d => d.risk === r).length;
          const meta = r !== 'All' ? RISK_META[r] : null;
          const active = riskFilter === r;
          return (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? meta ? `${meta.bg} ${meta.text} border-transparent` : 'bg-secondary text-foreground border-transparent'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {r} {cnt > 0 && <span className="ml-1 opacity-70">({cnt})</span>}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
          <span className="text-foreground font-semibold text-sm flex-1">
            {filtered.length} deal{filtered.length !== 1 ? 's' : ''} shown
          </span>

          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value as StageFilter)}
            className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Stages</option>
            <option value="Active">Active</option>
            <option value="Active Listing">Active Listing</option>
            <option value="Under Contract">Under Contract</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search deals…"
              className="bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 w-44"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                {(
                  [
                    { field: 'address' as SortField,     label: 'Loop / Address', right: false },
                    { field: 'risk' as SortField,        label: 'Risk',           right: false },
                    { field: null,                        label: 'Stage',          right: false },
                    { field: null,                        label: 'Type',           right: false },
                    { field: 'agentName' as SortField,   label: 'Agent',          right: false },
                    { field: 'salePrice' as SortField,   label: 'Value',          right: true  },
                    { field: 'daysInStage' as SortField, label: 'Days In Stage',  right: true  },
                  ] as { field: SortField | null; label: string; right: boolean }[]
                ).map(col => (
                  <th
                    key={col.label}
                    onClick={() => col.field && handleSort(col.field)}
                    className={`px-3 py-3 font-medium ${col.field ? 'cursor-pointer hover:text-foreground' : ''} ${col.right ? 'text-right' : 'text-left'}`}
                  >
                    <span className={`inline-flex items-center gap-1 ${col.right ? 'flex-row-reverse' : ''}`}>
                      {col.label}
                      {col.field && <SortIcon field={col.field} sf={sortField} sd={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const r = d.record;
                const riskMeta = RISK_META[d.risk];
                const stageMeta = STAGE_META[r.loopStatus] ?? { bg: 'bg-secondary', text: 'text-muted-foreground' };
                const value = r.salePrice || r.price || 0;
                const threshold = STUCK_DAYS[r.loopStatus] ?? 30;
                const overBy = Math.max(0, d.daysInStage - threshold);
                return (
                  <tr key={i} onClick={() => setDrillTarget({ title: r.address || r.loopName || "Deal Detail", records: [r] })} className="border-b border-border/60 hover:bg-secondary/30 transition-colors cursor-pointer">
                    {/* Address */}
                    <td className="px-3 py-3 max-w-[200px]">
                      <p className="text-foreground truncate font-medium">{r.address || r.loopName || r.loopId}</p>
                      <p className="text-muted-foreground text-[10px]">{r.city}{r.state ? `, ${r.state}` : ''}</p>
                    </td>
                    {/* Risk */}
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${riskMeta.bg} ${riskMeta.text}`}>
                        {d.risk}
                      </span>
                    </td>
                    {/* Stage */}
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${stageMeta.bg} ${stageMeta.text}`}>
                        {r.loopStatus}
                      </span>
                    </td>
                    {/* Type */}
                    <td className="px-3 py-3 text-muted-foreground text-xs">{r.propertyType || '—'}</td>
                    {/* Agent */}
                    <td className="px-3 py-3 text-foreground text-xs">{d.agentName}</td>
                    {/* Value */}
                    <td className="px-3 py-3 text-right text-foreground tabular-nums">{value > 0 ? formatCurrency(value) : '—'}</td>
                    {/* Days in stage */}
                    <td className="px-3 py-3 text-right">
                      <span className={`font-bold tabular-nums ${riskMeta.text}`}>{d.daysInStage}d</span>
                      {overBy > 0 && (
                        <p className="text-muted-foreground text-[10px]">+{overBy}d over</p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-muted-foreground text-sm">
                    {stuckDeals.length === 0
                      ? 'No stuck deals found. All active deals are within expected stage durations.'
                      : 'No deals match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
