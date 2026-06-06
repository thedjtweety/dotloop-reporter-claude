import { useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, Download, RefreshCw, Settings2,
  DollarSign, FileText, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, X, Search,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { DotloopRecord } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportStatus = 'pending' | 'exported' | 'error';
type ExportFormat = 'csv' | 'iif' | 'journal';
type ActiveTab = 'transactions' | 'mapping' | 'settings';

interface QBTransaction {
  record: DotloopRecord;
  status: ExportStatus;
  exportedAt: string | null;
  qbClass: string;
  agentName: string;
  grossCommission: number;
  companyDollar: number;
  agentPayout: number;
}

// ─── QB account mapping ───────────────────────────────────────────────────────

interface AccountMapping {
  id: string;
  dotloopField: string;
  qbAccount: string;
  qbClass: string;
  direction: 'income' | 'expense' | 'liability';
}

const DEFAULT_MAPPINGS: AccountMapping[] = [
  { id: '1', dotloopField: 'Gross Commission (GCI)',    qbAccount: '4000 · Commission Income',         qbClass: 'Real Estate Sales', direction: 'income' },
  { id: '2', dotloopField: 'Company Dollar',            qbAccount: '4010 · Brokerage Fee Income',      qbClass: 'Brokerage Ops',     direction: 'income' },
  { id: '3', dotloopField: 'Agent Payout',              qbAccount: '5000 · Agent Commission Expense',  qbClass: 'Agent Splits',      direction: 'expense' },
  { id: '4', dotloopField: 'Buy-Side Commission',       qbAccount: '4001 · Buy Side Commission',       qbClass: 'Real Estate Sales', direction: 'income' },
  { id: '5', dotloopField: 'Sell-Side Commission',      qbAccount: '4002 · Sell Side Commission',      qbClass: 'Real Estate Sales', direction: 'income' },
  { id: '6', dotloopField: 'Referral Fee',              qbAccount: '5010 · Referral Fees Paid',        qbClass: 'Referrals',         direction: 'expense' },
  { id: '7', dotloopField: 'Transaction Fee (Agent)',   qbAccount: '5020 · Transaction Fees',          qbClass: 'Agent Billing',     direction: 'expense' },
  { id: '8', dotloopField: 'E&O Insurance (Agent)',     qbAccount: '5030 · E&O Insurance Collected',   qbClass: 'Agent Billing',     direction: 'income' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compactCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function hashRecord(r: DotloopRecord): number {
  const str = r.loopId + r.address + r.closingDate;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

// ─── IIF export generator ─────────────────────────────────────────────────────

function generateIIF(txns: QBTransaction[]): string {
  const header = '!TRNS\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n!SPL\tTRNSTYPE\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO\n!ENDTRNS\n';
  const lines = txns.map(t => {
    const date = t.record.closingDate || '';
    const name = t.record.address || t.record.loopName || '';
    return [
      `TRNS\tGENERAL JOURNAL\t${date}\t4000 · Commission Income\t${name}\t${t.grossCommission.toFixed(2)}\tGCI`,
      `SPL\tGENERAL JOURNAL\t${date}\t5000 · Agent Commission Expense\t${t.agentName}\t-${t.agentPayout.toFixed(2)}\tAgent payout`,
      `SPL\tGENERAL JOURNAL\t${date}\t4010 · Brokerage Fee Income\t${name}\t-${t.companyDollar.toFixed(2)}\tCompany dollar`,
      'ENDTRNS',
    ].join('\n');
  });
  return header + lines.join('\n');
}

function generateJournalCSV(txns: QBTransaction[]): string {
  const headers = ['Date','Account','Debit','Credit','Name','Memo','Class'];
  const rows: string[][] = [];
  for (const t of txns) {
    const date = t.record.closingDate || '';
    const name = t.record.address || t.record.loopName || '';
    rows.push([date, '4000 · Commission Income', '', t.grossCommission.toFixed(2), name, 'GCI', 'Real Estate Sales']);
    rows.push([date, '5000 · Agent Commission Expense', t.agentPayout.toFixed(2), '', t.agentName, 'Agent payout', 'Agent Splits']);
    if (t.companyDollar > 0)
      rows.push([date, '4010 · Brokerage Fee Income', '', t.companyDollar.toFixed(2), name, 'Company dollar', 'Brokerage Ops']);
  }
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}

function generateSimpleCSV(txns: QBTransaction[]): string {
  const headers = ['Date','Address','Agent','Gross Commission','Company Dollar','Agent Payout','Status'];
  const rows = txns.map(t => [
    t.record.closingDate || '',
    t.record.address || '',
    t.agentName,
    formatCurrency(t.grossCommission),
    formatCurrency(t.companyDollar),
    formatCurrency(t.agentPayout),
    t.status,
  ]);
  return [headers, ...rows].map(r => r.join(',')).join('\n');
}

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

type SortField = 'address' | 'agentName' | 'closingDate' | 'grossCommission' | 'companyDollar';

function SortIcon({ field, sf, sd }: { field: SortField; sf: SortField; sd: 'asc' | 'desc' }) {
  if (sf !== field) return <ChevronDown className="w-3 h-3 opacity-25 inline" />;
  return sd === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400 inline" /> : <ChevronDown className="w-3 h-3 text-emerald-400 inline" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QuickBooksPage() {
  const { filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const [mappings, setMappings]       = useState<AccountMapping[]>(DEFAULT_MAPPINGS);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [activeTab, setActiveTab]     = useState<ActiveTab>('transactions');
  const [sortField, setSortField]     = useState<SortField>('closingDate');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [exportedIds, setExportedIds] = useState<Set<string>>(new Set());
  const [lastSync, setLastSync]       = useState<string | null>(null);

  // Only closed deals with commission data
  const transactions = useMemo<QBTransaction[]>(() => {
    return filteredRecords
      .filter(r => r.loopStatus === 'Closed' && (r.commissionTotal > 0 || r.companyDollar > 0))
      .map(r => {
        const agentName = (r.agents || r.createdBy || 'Unknown').split(',')[0].trim();
        const gross = r.commissionTotal || 0;
        const coD   = r.companyDollar || 0;
        const hash  = hashRecord(r);
        return {
          record: r,
          status: exportedIds.has(r.loopId) ? 'exported' : 'pending',
          exportedAt: exportedIds.has(r.loopId) ? lastSync : null,
          qbClass: 'Real Estate Sales',
          agentName,
          grossCommission: gross,
          companyDollar: coD,
          agentPayout: Math.max(0, gross - coD),
        };
      });
  }, [filteredRecords, exportedIds, lastSync]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.record.address || '').toLowerCase().includes(q) ||
        t.agentName.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sortField) {
        case 'address':         av = a.record.address || ''; bv = b.record.address || ''; break;
        case 'agentName':       av = a.agentName; bv = b.agentName; break;
        case 'closingDate':     av = a.record.closingDate || ''; bv = b.record.closingDate || ''; break;
        case 'grossCommission': av = a.grossCommission; bv = b.grossCommission; break;
        case 'companyDollar':   av = a.companyDollar; bv = b.companyDollar; break;
        default: av = ''; bv = '';
      }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [transactions, search, sortField, sortDir]);

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectAll = () =>
    setSelected(filtered.every(t => selected.has(t.record.loopId)) ? new Set() : new Set(filtered.map(t => t.record.loopId)));

  const toExport = selected.size > 0
    ? filtered.filter(t => selected.has(t.record.loopId))
    : filtered.filter(t => t.status === 'pending');

  const runExport = () => {
    if (toExport.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    if (exportFormat === 'iif') {
      downloadText(generateIIF(toExport), `qb-export-${date}.iif`);
    } else if (exportFormat === 'journal') {
      downloadText(generateJournalCSV(toExport), `qb-journal-${date}.csv`);
    } else {
      downloadText(generateSimpleCSV(toExport), `qb-transactions-${date}.csv`);
    }
    setExportedIds(prev => { const n = new Set(prev); toExport.forEach(t => n.add(t.record.loopId)); return n; });
    setLastSync(new Date().toLocaleString());
    setSelected(new Set());
  };

  // KPIs
  const pending   = transactions.filter(t => t.status === 'pending').length;
  const exported  = transactions.filter(t => t.status === 'exported').length;
  const totalGross = transactions.reduce((s, t) => s + t.grossCommission, 0);
  const totalCoD   = transactions.reduce((s, t) => s + t.companyDollar, 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <RefreshCw className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Data to Export</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV with closed transactions to generate QuickBooks exports.
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QuickBooks Sync</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Export commission disbursements and brokerage income to QuickBooks.
            {lastSync && <span className="ml-2 text-emerald-400">Last sync: {lastSync}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value as ExportFormat)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none"
          >
            <option value="csv">Simple CSV</option>
            <option value="journal">Journal Entry CSV</option>
            <option value="iif">QuickBooks IIF</option>
          </select>
          <button
            onClick={runExport}
            disabled={toExport.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export {toExport.length > 0 ? `(${toExport.length})` : ''}
          </button>
        </div>
      </div>

      {/* Format description banner */}
      <div className="flex items-start gap-3 px-4 py-3 bg-secondary rounded-xl border border-border text-sm">
        <FileText className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          {exportFormat === 'iif' && (
            <span className="text-foreground"><span className="font-semibold text-blue-400">QuickBooks IIF</span> — Import directly via <em>File → Utilities → Import → IIF Files</em> in QuickBooks Desktop. Creates journal entries per transaction.</span>
          )}
          {exportFormat === 'journal' && (
            <span className="text-foreground"><span className="font-semibold text-blue-400">Journal Entry CSV</span> — Debit/credit rows per transaction. Import via QuickBooks Online <em>→ Accountant → Journal Entries → Import</em>.</span>
          )}
          {exportFormat === 'csv' && (
            <span className="text-foreground"><span className="font-semibold text-blue-400">Simple CSV</span> — One row per transaction. Use with QuickBooks Online bank feed import or manual entry.</span>
          )}
        </div>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pending Export', value: pending,               icon: <Clock className="w-4 h-4 text-yellow-400" />,   color: 'text-yellow-400' },
          { label: 'Exported',       value: exported,              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Total GCI',      value: compactCurrency(totalGross), icon: <DollarSign className="w-4 h-4 text-blue-400" />, color: 'text-blue-400' },
          { label: 'Company Dollar', value: compactCurrency(totalCoD),   icon: <DollarSign className="w-4 h-4 text-purple-400" />, color: 'text-purple-400' },
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

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
        {(['transactions', 'mapping', 'settings'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'transactions' ? `Transactions (${transactions.length})` : tab === 'mapping' ? 'Account Mapping' : 'Settings'}
          </button>
        ))}
      </div>

      {/* Transactions tab */}
      {activeTab === 'transactions' && (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
            <span className="text-foreground font-semibold text-sm flex-1">
              {selected.size > 0
                ? `${selected.size} selected`
                : `${filtered.length} transactions`}
            </span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
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
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" onChange={selectAll} checked={filtered.length > 0 && filtered.every(t => selected.has(t.record.loopId))} className="rounded" />
                  </th>
                  {(
                    [
                      { f: 'closingDate' as SortField,     label: 'Close Date',  right: false },
                      { f: 'address' as SortField,         label: 'Property',    right: false },
                      { f: 'agentName' as SortField,       label: 'Agent',       right: false },
                      { f: 'grossCommission' as SortField, label: 'Gross GCI',   right: true },
                      { f: 'companyDollar' as SortField,   label: 'Co. Dollar',  right: true },
                    ]
                  ).map(col => (
                    <th
                      key={col.f}
                      onClick={() => handleSort(col.f)}
                      className={`px-3 py-3 font-medium cursor-pointer hover:text-foreground transition-colors ${col.right ? 'text-right' : 'text-left'}`}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.right ? 'flex-row-reverse' : ''}`}>
                        {col.label} <SortIcon field={col.f} sf={sortField} sd={sortDir} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-medium">Agent Payout</th>
                  <th className="px-3 py-3 text-left font-medium">QB Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.record.loopId} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(t.record.loopId)} onChange={() => toggleSelect(t.record.loopId)} className="rounded" />
                    </td>
                    <td className="px-3 py-3 text-muted-foreground text-xs tabular-nums">{t.record.closingDate || '—'}</td>
                    <td className="px-3 py-3 text-foreground font-medium max-w-[180px] truncate">{t.record.address || t.record.loopName || '—'}</td>
                    <td className="px-3 py-3 text-muted-foreground">{t.agentName}</td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-medium tabular-nums">{formatCurrency(t.grossCommission)}</td>
                    <td className="px-3 py-3 text-right text-blue-400 tabular-nums">{formatCurrency(t.companyDollar)}</td>
                    <td className="px-3 py-3 text-right text-foreground tabular-nums">{formatCurrency(t.agentPayout)}</td>
                    <td className="px-3 py-3">
                      {t.status === 'exported' ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 rounded-full text-[11px] font-semibold w-fit">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Exported
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-full text-[11px] font-semibold w-fit">
                          <Clock className="w-2.5 h-2.5" /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                      No transactions match the current search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account mapping tab */}
      {activeTab === 'mapping' && (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-foreground font-semibold text-sm">QuickBooks Account Mapping</h2>
            <p className="text-muted-foreground text-xs mt-0.5">Map Dotloop fields to your QuickBooks chart of accounts.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                <th className="px-4 py-3 text-left font-medium">Dotloop Field</th>
                <th className="px-4 py-3 text-left font-medium">
                  <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> QB Account</span>
                </th>
                <th className="px-4 py-3 text-left font-medium">Class</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map(m => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="px-4 py-3 text-foreground font-medium">{m.dotloopField}</td>
                  <td className="px-4 py-3">
                    <input
                      value={m.qbAccount}
                      onChange={e => setMappings(prev => prev.map(mp => mp.id === m.id ? { ...mp, qbAccount: e.target.value } : mp))}
                      className="bg-secondary border border-border rounded px-2 py-1 text-foreground text-xs w-full max-w-[260px] focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={m.qbClass}
                      onChange={e => setMappings(prev => prev.map(mp => mp.id === m.id ? { ...mp, qbClass: e.target.value } : mp))}
                      className="bg-secondary border border-border rounded px-2 py-1 text-foreground text-xs w-full max-w-[160px] focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      m.direction === 'income'  ? 'bg-emerald-500/15 text-emerald-400' :
                      m.direction === 'expense' ? 'bg-red-500/15 text-red-400' :
                      'bg-blue-500/15 text-blue-400'
                    }`}>
                      {m.direction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-4 border-t border-border">
            <p className="text-muted-foreground text-xs">
              Account names must match exactly what appears in your QuickBooks chart of accounts.
              Changes are saved locally in this session.
            </p>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === 'settings' && (
        <div className="bg-background border border-border rounded-xl p-6 space-y-6">
          <div>
            <h3 className="text-foreground font-semibold mb-1">Export Format</h3>
            <p className="text-muted-foreground text-xs mb-4">Choose the format that matches your QuickBooks version.</p>
            <div className="space-y-3">
              {(
                [
                  { id: 'csv' as ExportFormat, label: 'Simple CSV', desc: 'One row per transaction. Works with QB Online bank feed or manual import.' },
                  { id: 'journal' as ExportFormat, label: 'Journal Entry CSV', desc: 'Debit/credit rows per transaction. Best for QB Online accountant import.' },
                  { id: 'iif' as ExportFormat, label: 'QuickBooks IIF', desc: 'Native QB Desktop format. Import via File → Utilities → Import → IIF Files.' },
                ] as { id: ExportFormat; label: string; desc: string }[]
              ).map(f => (
                <label key={f.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  exportFormat === f.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border hover:border-border/80'
                }`}>
                  <input
                    type="radio"
                    name="exportFormat"
                    value={f.id}
                    checked={exportFormat === f.id}
                    onChange={() => setExportFormat(f.id)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <p className={`font-medium text-sm ${exportFormat === f.id ? 'text-emerald-400' : 'text-foreground'}`}>{f.label}</p>
                    <p className="text-muted-foreground text-xs mt-0.5">{f.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-foreground font-semibold mb-1">QuickBooks Online Integration</h3>
            <p className="text-muted-foreground text-xs mb-4">Direct API sync to QuickBooks Online — coming soon.</p>
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-lg border border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shrink-0" />
              <span className="text-muted-foreground text-sm">Not connected · OAuth integration planned</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
