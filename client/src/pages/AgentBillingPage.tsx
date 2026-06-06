import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  DollarSign, Download, Search, X, ChevronDown, ChevronUp,
  CheckCircle2, Clock, AlertTriangle, Plus, Receipt,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'paid' | 'pending' | 'overdue';
type FeeType = 'desk_fee' | 'eo_insurance' | 'transaction_fee' | 'training' | 'tech' | 'other';

interface Invoice {
  id: string;
  agentName: string;
  feeType: FeeType;
  amount: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
  description: string;
}

// ─── Fee constants ────────────────────────────────────────────────────────────

const FEE_LABELS: Record<FeeType, string> = {
  desk_fee:        'Desk Fee',
  eo_insurance:    'E&O Insurance',
  transaction_fee: 'Transaction Fee',
  training:        'Training',
  tech:            'Tech Fee',
  other:           'Other',
};

const MONTHLY_FEES: Record<FeeType, number> = {
  desk_fee:     500,
  eo_insurance: 45,
  transaction_fee: 0, // per-deal
  training:     0,
  tech:         75,
  other:        0,
};

const TRANSACTION_FEE_AMOUNT = 200; // per closed deal

// ─── Invoice status meta ─────────────────────────────────────────────────────

const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  paid:    { label: 'Paid',    color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: CheckCircle2 },
  pending: { label: 'Pending', color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  icon: Clock },
  overdue: { label: 'Overdue', color: 'text-red-400',     bg: 'bg-red-500/15',     icon: AlertTriangle },
};

const AGENT_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function compactCurrency(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function generateInvoices(agentNames: string[], dealsPerAgent: Record<string, number>): Invoice[] {
  const invoices: Invoice[] = [];
  const months = ['2026-03', '2026-04', '2026-05', '2026-06'];
  const statuses: InvoiceStatus[] = ['paid', 'paid', 'paid', 'pending'];

  agentNames.slice(0, 12).forEach((name, ai) => {
    months.forEach((month, mi) => {
      const status = mi === 3 ? (ai % 3 === 0 ? 'overdue' : 'pending') : 'paid';
      const dueDate = `${month}-01`;
      const issuedDate = `${month}-01`;

      // Desk fee
      invoices.push({
        id: `${name}-desk-${month}`,
        agentName: name,
        feeType: 'desk_fee',
        amount: MONTHLY_FEES.desk_fee,
        status,
        dueDate,
        issuedDate,
        description: `Monthly desk fee — ${month}`,
      });

      // E&O
      invoices.push({
        id: `${name}-eo-${month}`,
        agentName: name,
        feeType: 'eo_insurance',
        amount: MONTHLY_FEES.eo_insurance,
        status: mi === 3 ? 'pending' : 'paid',
        dueDate,
        issuedDate,
        description: `E&O insurance — ${month}`,
      });

      // Tech fee
      invoices.push({
        id: `${name}-tech-${month}`,
        agentName: name,
        feeType: 'tech',
        amount: MONTHLY_FEES.tech,
        status: mi === 3 ? 'pending' : 'paid',
        dueDate,
        issuedDate,
        description: `Technology fee — ${month}`,
      });
    });

    // Transaction fees for closed deals
    const deals = dealsPerAgent[name] ?? 0;
    for (let d = 0; d < Math.min(deals, 6); d++) {
      invoices.push({
        id: `${name}-txn-${d}`,
        agentName: name,
        feeType: 'transaction_fee',
        amount: TRANSACTION_FEE_AMOUNT,
        status: d < deals - 1 ? 'paid' : 'pending',
        dueDate: '2026-06-30',
        issuedDate: '2026-06-01',
        description: `Transaction fee — deal #${d + 1}`,
      });
    }
  });

  return invoices;
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

type AgentSortField = 'agentName' | 'totalBilled' | 'totalPaid' | 'totalPending' | 'deals';

function SortIcon({ field, sf, sd }: { field: AgentSortField; sf: AgentSortField; sd: 'asc' | 'desc' }) {
  if (sf !== field) return <ChevronDown className="w-3 h-3 opacity-25 inline" />;
  return sd === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400 inline" /> : <ChevronDown className="w-3 h-3 text-emerald-400 inline" />;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AgentBillingPage() {
  const { agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [feeFilter, setFeeFilter]     = useState<FeeType | 'all'>('all');
  const [sortField, setSortField]     = useState<AgentSortField>('totalBilled');
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab]     = useState<'summary' | 'invoices'>('summary');

  const agentNames = useMemo(() => agentMetrics.map(a => a.agentName), [agentMetrics]);
  const dealsPerAgent = useMemo(
    () => Object.fromEntries(agentMetrics.map(a => [a.agentName, a.closedDeals])),
    [agentMetrics],
  );

  // Generate invoices from agent data
  const allInvoices = useMemo(
    () => generateInvoices(agentNames, dealsPerAgent),
    [agentNames, dealsPerAgent],
  );

  // Per-agent summary
  interface AgentBillRow {
    agentName: string;
    color: string;
    deals: number;
    totalBilled: number;
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    feeBreakdown: Record<FeeType, number>;
  }

  const agentSummaries = useMemo<AgentBillRow[]>(() => {
    return agentNames.slice(0, 12).map((name, i) => {
      const inv = allInvoices.filter(iv => iv.agentName === name);
      const totalBilled  = inv.reduce((s, iv) => s + iv.amount, 0);
      const totalPaid    = inv.filter(iv => iv.status === 'paid').reduce((s, iv) => s + iv.amount, 0);
      const totalPending = inv.filter(iv => iv.status === 'pending').reduce((s, iv) => s + iv.amount, 0);
      const totalOverdue = inv.filter(iv => iv.status === 'overdue').reduce((s, iv) => s + iv.amount, 0);
      const feeBreakdown = {} as Record<FeeType, number>;
      for (const key of Object.keys(FEE_LABELS) as FeeType[]) {
        feeBreakdown[key] = inv.filter(iv => iv.feeType === key).reduce((s, iv) => s + iv.amount, 0);
      }
      return {
        agentName: name,
        color: AGENT_COLORS[i % AGENT_COLORS.length],
        deals: dealsPerAgent[name] ?? 0,
        totalBilled, totalPaid, totalPending, totalOverdue,
        feeBreakdown,
      };
    });
  }, [agentNames, allInvoices, dealsPerAgent]);

  const sortedSummaries = useMemo(() => {
    return [...agentSummaries].sort((a, b) => {
      const av = a[sortField], bv = b[sortField];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [agentSummaries, sortField, sortDir]);

  const handleSort = (f: AgentSortField) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  // Invoice filters
  const filteredInvoices = useMemo(() => {
    let list = allInvoices;
    if (statusFilter !== 'all') list = list.filter(iv => iv.status === statusFilter);
    if (feeFilter !== 'all')    list = list.filter(iv => iv.feeType === feeFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(iv => iv.agentName.toLowerCase().includes(q) || iv.description.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [allInvoices, statusFilter, feeFilter, search]);

  // Overall KPIs
  const grandTotal   = agentSummaries.reduce((s, a) => s + a.totalBilled, 0);
  const grandPaid    = agentSummaries.reduce((s, a) => s + a.totalPaid, 0);
  const grandPending = agentSummaries.reduce((s, a) => s + a.totalPending, 0);
  const grandOverdue = agentSummaries.reduce((s, a) => s + a.totalOverdue, 0);

  // Chart data — billed by agent (top 8)
  const chartData = sortedSummaries.slice(0, 8).map(a => ({
    name: a.agentName.split(' ')[0],
    paid: a.totalPaid,
    pending: a.totalPending + a.totalOverdue,
    color: a.color,
  }));

  // Export invoices CSV
  const exportCSV = () => {
    const headers = ['Agent', 'Fee Type', 'Amount', 'Status', 'Due Date', 'Issued', 'Description'];
    const rows = filteredInvoices.map(iv => [
      iv.agentName, FEE_LABELS[iv.feeType], formatCurrency(iv.amount),
      iv.status, iv.dueDate, iv.issuedDate, iv.description,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'agent-billing.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Receipt className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Billing Data</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV to generate billing estimates from agent activity.
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
          <h1 className="text-2xl font-bold text-foreground">Agent Billing</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Desk fees, E&O, transaction fees, and monthly invoices.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 border border-border text-muted-foreground hover:text-foreground rounded-lg text-sm transition-colors"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Billed',   value: compactCurrency(grandTotal),   icon: <DollarSign className="w-4 h-4 text-blue-400" />,    color: 'text-blue-400' },
          { label: 'Collected',      value: compactCurrency(grandPaid),    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, color: 'text-emerald-400' },
          { label: 'Pending',        value: compactCurrency(grandPending), icon: <Clock className="w-4 h-4 text-yellow-400" />,       color: 'text-yellow-400' },
          { label: 'Overdue',        value: compactCurrency(grandOverdue), icon: <AlertTriangle className="w-4 h-4 text-red-400" />,  color: 'text-red-400' },
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

      {/* Stacked bar chart */}
      <div className="bg-background border border-border rounded-xl p-5">
        <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide mb-4">Billing by Agent — Paid vs Outstanding</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => compactCurrency(v)} width={50} />
            <Tooltip
              contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
              formatter={(v: number, name: string) => [formatCurrency(v), name === 'paid' ? 'Paid' : 'Outstanding']}
            />
            <Bar dataKey="paid" name="paid" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="pending" name="pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabs: Summary / Invoices */}
      <div className="flex gap-1 bg-secondary p-1 rounded-lg w-fit">
        {(['summary', 'invoices'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'summary' ? 'Agent Summary' : `Invoices (${allInvoices.length})`}
          </button>
        ))}
      </div>

      {/* Summary table */}
      {activeTab === 'summary' && (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40 text-muted-foreground text-xs">
                  {(
                    [
                      { f: 'agentName' as AgentSortField,   label: 'Agent',       right: false },
                      { f: 'deals' as AgentSortField,       label: 'Deals',       right: true },
                      { f: 'totalBilled' as AgentSortField, label: 'Total Billed',right: true },
                      { f: 'totalPaid' as AgentSortField,   label: 'Paid',        right: true },
                      { f: 'totalPending' as AgentSortField,label: 'Pending',     right: true },
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
                  <th className="px-4 py-3 text-left font-medium">Fee Breakdown</th>
                  <th className="px-4 py-3 text-left font-medium">Collection %</th>
                </tr>
              </thead>
              <tbody>
                {sortedSummaries.map(a => {
                  const collectPct = a.totalBilled > 0 ? (a.totalPaid / a.totalBilled) * 100 : 0;
                  const hasOverdue = a.totalOverdue > 0;
                  return (
                    <tr key={a.agentName} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                          <span className="text-foreground font-medium">{a.agentName}</span>
                          {hasOverdue && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground tabular-nums">{a.deals}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{compactCurrency(a.totalBilled)}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 tabular-nums">{compactCurrency(a.totalPaid)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span className={hasOverdue ? 'text-red-400' : 'text-yellow-400'}>
                          {compactCurrency(a.totalPending + a.totalOverdue)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* Fee type mini breakdown */}
                        <div className="flex gap-1 flex-wrap">
                          {(Object.keys(FEE_LABELS) as FeeType[])
                            .filter(k => a.feeBreakdown[k] > 0)
                            .map(k => (
                              <span key={k} className="px-1.5 py-0.5 bg-secondary text-muted-foreground text-[10px] rounded">
                                {FEE_LABELS[k].split(' ')[0]} {compactCurrency(a.feeBreakdown[k])}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${collectPct}%`, background: collectPct >= 80 ? '#10b981' : '#f59e0b' }}
                            />
                          </div>
                          <span className={`text-xs tabular-nums ${collectPct >= 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                            {collectPct.toFixed(0)}%
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
      )}

      {/* Invoice list */}
      {activeTab === 'invoices' && (
        <div className="bg-background border border-border rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-border">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
              className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={feeFilter}
              onChange={e => setFeeFilter(e.target.value as FeeType | 'all')}
              className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Fee Types</option>
              {(Object.keys(FEE_LABELS) as FeeType[]).map(f => <option key={f} value={f}>{FEE_LABELS[f]}</option>)}
            </select>
            <div className="flex-1" />
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agent / desc…"
                className="bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 w-48"
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
                  <th className="px-4 py-3 text-left font-medium">Agent</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Fee Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 100).map(iv => {
                  const sm = INVOICE_STATUS_META[iv.status];
                  const Icon = sm.icon;
                  return (
                    <tr key={iv.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{iv.agentName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{iv.description}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-secondary text-muted-foreground text-[10px] rounded">
                          {FEE_LABELS[iv.feeType]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                        {formatCurrency(iv.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[11px] font-semibold ${sm.bg} ${sm.color}`}>
                          <Icon className="w-2.5 h-2.5" /> {sm.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs tabular-nums">{iv.dueDate}</td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      No invoices match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length > 100 && (
            <div className="px-5 py-3 border-t border-border text-muted-foreground text-xs text-center">
              Showing 100 of {filteredInvoices.length} invoices. Export CSV for full list.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
