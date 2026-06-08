import { useState, useMemo, useEffect, Fragment, type ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Download, Search, X, ChevronRight, Copy, Check, ArrowLeft } from 'lucide-react';
import { DotloopRecord } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';

export interface DrillTarget {
  title: string;
  records: DotloopRecord[];
  subtitle?: string;
}

interface DrillDownModalProps {
  target: DrillTarget | null;
  onClose: () => void;
}

type SortField = 'address' | 'agents' | 'loopStatus' | 'closingDate' | 'salePrice' | 'commissionTotal';

const STATUS_CLASS: Record<string, string> = {
  'Closed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Under Contract': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Active': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Active Listing': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Archived': 'bg-secondary text-muted-foreground border-border',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] ?? 'bg-secondary text-muted-foreground border-border';
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{status || '—'}</span>;
}

function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  const d = Math.round((db.getTime() - da.getTime()) / 86400000);
  return d >= 0 ? d : null;
}

function downloadCSV(name: string, data: (string | number)[][]) {
  const csv = data.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function fmtDate(d?: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', opts ?? { month: 'short', day: '2-digit', year: 'numeric' });
}

export function DrillDownModal({ target, onClose }: DrillDownModalProps) {
  // Level 1 state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [agentFilter, setAgentFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'this-year' | 'last-90'
  const [sortField, setSortField] = useState<SortField>('closingDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('drilldown-pagesize');
    return saved ? parseInt(saved) : 25;
  });

  // Level 2 state
  const [selectedRecord, setSelectedRecord] = useState<DotloopRecord | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset to page 1 when filters change
  useEffect(() => setPage(1), [search, statusFilter, agentFilter, dateFilter, target]);

  // Reset level 2 when target changes
  useEffect(() => setSelectedRecord(null), [target]);

  // Persist page size
  useEffect(() => localStorage.setItem('drilldown-pagesize', String(pageSize)), [pageSize]);

  // Keyboard: Backspace goes back one level
  useEffect(() => {
    if (!target) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && selectedRecord && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSelectedRecord(null);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [target, selectedRecord]);

  const records = target?.records ?? [];

  const uniqueAgents = useMemo(() => {
    const names = new Set<string>();
    records.forEach(r => (r.agents || '').split(',').forEach(a => { if (a.trim()) names.add(a.trim()); }));
    return Array.from(names).sort();
  }, [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.address || '').toLowerCase().includes(q) ||
        (r.loopName || '').toLowerCase().includes(q) ||
        (r.agents || '').toLowerCase().includes(q) ||
        (r.loopStatus || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'All') list = list.filter(r => r.loopStatus === statusFilter);
    if (agentFilter !== 'All') list = list.filter(r => (r.agents || '').includes(agentFilter));
    if (dateFilter === 'this-year') {
      const y = new Date().getFullYear();
      list = list.filter(r => r.closingDate && new Date(r.closingDate).getFullYear() === y);
    } else if (dateFilter === 'last-90') {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
      list = list.filter(r => r.closingDate && new Date(r.closingDate) >= cutoff);
    }
    list = [...list].sort((a, b) => {
      let av: any = (a as any)[sortField] ?? '';
      let bv: any = (b as any)[sortField] ?? '';
      if (sortField === 'salePrice' || sortField === 'commissionTotal') {
        av = Number(av) || 0; bv = Number(bv) || 0;
      } else {
        av = String(av); bv = String(bv);
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [records, search, statusFilter, agentFilter, dateFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalVolume = records.reduce((s, r) => s + (r.salePrice || 0), 0);
  const totalGCI = records.reduce((s, r) => s + (r.commissionTotal || 0), 0);

  function exportAllCSV() {
    const headers = ['Address', 'Agent', 'Status', 'Closing Date', 'Sale Price', 'GCI', 'Company Dollar', 'Lead Source'];
    const rows = filtered.map(r => [
      r.address || r.loopName || '',
      r.agents || '',
      r.loopStatus || '',
      r.closingDate || '',
      r.salePrice ?? '',
      r.commissionTotal ?? '',
      r.companyDollar ?? '',
      r.leadSource || '',
    ]);
    downloadCSV('transactions', [headers, ...rows]);
  }

  function exportSingleCSV(r: DotloopRecord) {
    const headers = ['Address', 'Agent', 'Status', 'Closing Date', 'Sale Price', 'GCI', 'Company Dollar', 'Lead Source', 'Commission Rate', 'Earnest Money'];
    const rows = [[r.address || r.loopName || '', r.agents || '', r.loopStatus || '', r.closingDate || '', r.salePrice ?? '', r.commissionTotal ?? '', r.companyDollar ?? '', r.leadSource || '', r.commissionRate ?? '', r.earnestMoney ?? '']];
    downloadCSV('transaction-detail', [headers, ...rows]);
  }

  function copyAddress(r: DotloopRecord) {
    const text = r.address || r.loopName || '';
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  function SortIcon({ field: f }: { field: SortField }) {
    if (sortField !== f) return <span className="text-muted-foreground/30 ml-1">↕</span>;
    return <span className="text-emerald-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function clearFilters() {
    setSearch(''); setStatusFilter('All'); setAgentFilter('All'); setDateFilter('all');
  }

  if (!target) return null;

  const SORT_COLUMNS: { field: SortField; label: string; cls: string; minWidth: number }[] = [
    { field: 'address', label: 'Address', cls: 'text-left pl-6 pr-4 py-3', minWidth: 200 },
    { field: 'agents', label: 'Agent', cls: 'text-left pr-4 py-3', minWidth: 140 },
    { field: 'loopStatus', label: 'Status', cls: 'text-left pr-4 py-3', minWidth: 120 },
    { field: 'closingDate', label: 'Closing Date', cls: 'text-left pr-4 py-3', minWidth: 120 },
    { field: 'salePrice', label: 'Sale Price', cls: 'text-right pr-4 py-3', minWidth: 120 },
    { field: 'commissionTotal', label: 'GCI', cls: 'text-right pr-6 py-3', minWidth: 120 },
  ];

  // ---------- LEVEL 2 ----------
  function Level2View() {
    const r = selectedRecord!;
    const addr = r.address || r.loopName || '—';
    const domDays = daysBetween(r.listingDate, r.offerDate);
    const closeDays = daysBetween(r.listingDate, r.closingDate) ?? daysBetween(r.createdDate, r.closingDate);

    const financialRows: { label: string; value: string }[] = [];
    const pushFin = (label: string, num: number | undefined, fmt: (n: number) => string) => {
      if (num && num > 0) financialRows.push({ label, value: fmt(num) });
    };
    pushFin('List Price', r.price, formatCurrency);
    pushFin('Sale Price', r.salePrice, formatCurrency);
    pushFin('Commission Rate', r.commissionRate, n => `${n}%`);
    pushFin('GCI', r.commissionTotal, formatCurrency);
    pushFin('Listing Side', r.sellSideCommission, formatCurrency);
    pushFin('Buying Side', r.buySideCommission, formatCurrency);
    pushFin('Company Dollar', r.companyDollar, formatCurrency);
    pushFin('Earnest Money', r.earnestMoney, formatCurrency);
    pushFin('Referral %', r.referralPercentage, n => `${n}%`);
    if (r.referralSource) financialRows.push({ label: 'Referral Source', value: r.referralSource });

    const agentList = (r.agents || '').split(',').map(a => a.trim()).filter(Boolean);
    const tags: string[] = Array.isArray(r.tags) ? r.tags : [];

    const stages = [
      { label: 'Created', date: r.createdDate },
      { label: 'Listed', date: r.listingDate },
      { label: 'Under Contract', date: r.offerDate },
      { label: 'Closed', date: r.closingDate },
    ];

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* HEADER / breadcrumb */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0 gap-4">
          <div className="min-w-0">
            <button onClick={() => setSelectedRecord(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-1">
              <ArrowLeft className="w-3.5 h-3.5" /> {target!.title}
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium truncate max-w-[280px]">{addr}</span>
            </button>
            <h2 className="text-foreground font-bold text-base truncate">{addr}</h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => exportSingleCSV(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button onClick={() => copyAddress(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy Address'}
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="overflow-y-auto flex-1 min-h-0 px-6 py-4">
          {/* Property Info */}
          <Card title="Property Info">
            <div className="text-foreground font-semibold text-lg mb-1">{addr}</div>
            <div className="text-muted-foreground text-sm mb-3">{[r.city, r.state].filter(Boolean).join(', ') || '—'}</div>
            <Row label="Property Type" value={r.propertyType || '—'} />
            <Row label="Loop Name" value={r.loopName || '—'} />
            <Row label="Loop ID" value={r.loopId || '—'} />
          </Card>

          {/* Transaction Details */}
          <Card title="Transaction Details">
            <div className="flex justify-between items-center py-1.5 border-b border-border/40">
              <span className="text-muted-foreground text-xs">Status</span>
              <StatusBadge status={r.loopStatus || ''} />
            </div>
            <Row label="Listing Date" value={fmtDate(r.listingDate)} />
            <Row label="Offer / Contract Date" value={fmtDate(r.offerDate)} />
            <Row label="Closing Date" value={fmtDate(r.closingDate)} />
            <Row label="Days on Market" value={domDays != null ? `${domDays} days` : '—'} />
            <Row label="Days to Close" value={closeDays != null ? `${closeDays} days` : '—'} />
          </Card>

          {/* Financial Details */}
          {financialRows.length > 0 && (
            <Card title="Financial Details">
              {financialRows.map(f => <Row key={f.label} label={f.label} value={f.value} />)}
            </Card>
          )}

          {/* Agent Info */}
          <Card title="Agent Info">
            {agentList.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {agentList.map(a => <AgentChip key={a} name={a} />)}
              </div>
            ) : <div className="text-muted-foreground text-xs mb-3">No agents listed</div>}
            {r.buyerName && <Row label="Buyer" value={r.buyerName} />}
            {r.sellerName && <Row label="Seller" value={r.sellerName} />}
            <Row label="Lead Source" value={r.leadSource || '—'} />
          </Card>

          {/* Tags & Compliance */}
          {(tags.length > 0 || r.complianceStatus) && (
            <Card title="Tags & Compliance">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.map(t => <span key={t} className="px-2 py-0.5 rounded-full text-[11px] bg-secondary border border-border text-foreground">{t}</span>)}
                </div>
              )}
              {r.complianceStatus && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-muted-foreground text-xs">Compliance</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-secondary border-border text-foreground">{r.complianceStatus}</span>
                </div>
              )}
            </Card>
          )}

          {/* Timeline */}
          <Card title="Timeline">
            <div className="flex items-center pt-5 pb-1">
              {stages.map((stage, i) => (
                <Fragment key={stage.label}>
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${stage.date ? 'bg-emerald-500 border-emerald-500' : 'bg-secondary border-border'}`} />
                    <span className="text-[10px] text-muted-foreground mt-1 text-center">{stage.label}</span>
                    <span className="text-[10px] text-foreground mt-0.5 text-center">{stage.date ? fmtDate(stage.date, { month: 'short', day: 'numeric' }) : '—'}</span>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="flex-1 h-0.5 bg-border mx-1 relative">
                      {stage.date && stages[i + 1]?.date && (
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground whitespace-nowrap">
                          {daysBetween(stage.date, stages[i + 1].date)}d
                        </span>
                      )}
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </Card>
        </div>

        {/* STICKY ACTION BAR */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex items-center gap-2">
          <button onClick={() => setSelectedRecord(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to List
          </button>
          <div className="flex-1" />
          <button onClick={() => exportSingleCSV(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export as CSV
          </button>
          <button onClick={() => copyAddress(r)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy Address'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- LEVEL 1 ----------
  function Level1View() {
    return (
      <div className="flex flex-col h-full min-h-0">
        {/* HEADER */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="text-foreground font-bold text-base">{target!.title}</h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              {target!.subtitle ?? `${records.length} transaction${records.length !== 1 ? 's' : ''} · ${formatCurrency(totalVolume)} volume · ${formatCurrency(totalGCI)} GCI`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportAllCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="px-6 py-3 border-b border-border shrink-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by address, agent, or status…"
                className="w-full bg-secondary border border-border rounded-lg pl-8 pr-8 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none">
              {['All', 'Closed', 'Under Contract', 'Active', 'Active Listing', 'Archived'].map(s => <option key={s}>{s}</option>)}
            </select>
            {uniqueAgents.length > 0 && (
              <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none">
                <option value="All">All Agents</option>
                {uniqueAgents.map(a => <option key={a}>{a}</option>)}
              </select>
            )}
            <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none">
              <option value="all">All Time</option>
              <option value="this-year">This Year</option>
              <option value="last-90">Last 90 Days</option>
            </select>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {filtered.length !== records.length ? `${filtered.length} of ` : ''}{records.length} transaction{records.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-auto flex-1 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
              <p className="text-foreground font-medium mb-1">No transactions match your search</p>
              <button onClick={clearFilters} className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline">Clear filters</button>
            </div>
          ) : (
            <table className="w-full text-sm min-w-[640px]" style={{ minWidth: 760 }}>
              <thead className="sticky top-0 bg-background z-10 border-b border-border">
                <tr className="text-muted-foreground text-xs">
                  {SORT_COLUMNS.map(col => (
                    <th key={col.field} className={`${col.cls} font-medium cursor-pointer hover:text-foreground transition-colors select-none`}
                      style={{ minWidth: col.minWidth }}
                      onClick={() => handleSort(col.field)}>
                      {col.label}<SortIcon field={col.field} />
                    </th>
                  ))}
                  <th className="w-8 pr-4 py-3" style={{ minWidth: 40, width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {paginated.map((r, i) => (
                  <tr key={i}
                    className="border-b border-border/40 hover:bg-secondary/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedRecord(r)}>
                    <td className="pl-6 pr-4 py-3">
                      <span className="max-w-[180px] truncate block text-foreground font-medium text-xs" title={r.address || r.loopName || ''}>
                        {r.address || r.loopName || '—'}
                      </span>
                    </td>
                    <td className="pr-4 py-3 text-muted-foreground text-xs">{r.agents || '—'}</td>
                    <td className="pr-4 py-3"><StatusBadge status={r.loopStatus || ''} /></td>
                    <td className="pr-4 py-3 text-muted-foreground text-xs tabular-nums">{fmtDate(r.closingDate)}</td>
                    <td className="pr-4 py-3 text-right text-muted-foreground text-xs tabular-nums">
                      {r.salePrice ? formatCurrency(r.salePrice) : '—'}
                    </td>
                    <td className="pr-6 py-3 text-right text-emerald-400 text-xs tabular-nums font-medium">
                      {r.commissionTotal ? formatCurrency(r.commissionTotal) : '—'}
                    </td>
                    <td className="pr-4 py-3 text-right">
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* PAGINATION */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-border shrink-0 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span className="whitespace-nowrap">
              Showing {Math.min((safePage - 1) * pageSize + 1, filtered.length)}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <span>Show:</span>
              {[25, 50, 100].map(n => (
                <button key={n} onClick={() => { setPageSize(n); setPage(1); }}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${pageSize === n ? 'bg-emerald-500/20 text-emerald-400' : 'hover:text-foreground'}`}>
                  {n}
                </button>
              ))}
            </div>
            <button disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ‹
            </button>
            <span className="whitespace-nowrap">Page {safePage} of {totalPages}</span>
            <button disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              ›
            </button>
            {totalPages > 5 && (
              <div className="flex items-center gap-1">
                <span>Go to:</span>
                <input type="number" min={1} max={totalPages}
                  className="w-12 bg-secondary border border-border rounded px-1.5 py-0.5 text-xs text-foreground focus:outline-none focus:border-emerald-500 text-center"
                  onKeyDown={e => { if (e.key === 'Enter') { const v = parseInt((e.target as HTMLInputElement).value); if (v >= 1 && v <= totalPages) setPage(v); } }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={!!target} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] min-w-[800px] bg-background border border-border p-0 flex flex-col overflow-hidden" style={{ height: '90vh' }}>
        {selectedRecord ? <Level2View /> : <Level1View />}
      </DialogContent>
    </Dialog>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-secondary/40 border border-border rounded-xl p-4 mb-4">
      <h3 className="text-foreground font-semibold text-xs uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground text-xs font-medium text-right">{value}</span>
    </div>
  );
}

function AgentChip({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-secondary rounded-lg border border-border">
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <span className="text-emerald-400 text-[10px] font-bold">{initials}</span>
      </div>
      <span className="text-foreground text-xs">{name}</span>
    </div>
  );
}
