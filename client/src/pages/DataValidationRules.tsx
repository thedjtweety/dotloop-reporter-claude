import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Database } from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { DotloopRecord } from '@/lib/csvParser';

// ─── Fields to inspect ───────────────────────────────────────────────────────

interface FieldSpec {
  key: keyof DotloopRecord;
  label: string;
  validate?: (v: unknown) => boolean;
  critical?: boolean;
}

const FIELD_SPECS: FieldSpec[] = [
  { key: 'loopStatus',      label: 'Loop Status',       critical: true,  validate: v => typeof v === 'string' && v.length > 0 },
  { key: 'address',         label: 'Property Address',  critical: true,  validate: v => typeof v === 'string' && v.length > 3 },
  { key: 'agents',          label: 'Agent Name(s)',     critical: true,  validate: v => typeof v === 'string' && v.length > 0 },
  { key: 'salePrice',       label: 'Sale Price',        critical: true,  validate: v => typeof v === 'number' && v > 0 },
  { key: 'commissionTotal', label: 'Commission Total',  critical: true,  validate: v => typeof v === 'number' && v >= 0 },
  { key: 'closingDate',     label: 'Closing Date',      critical: false, validate: v => {
    if (!v || v === '') return false;
    const d = new Date(v as string);
    return !isNaN(d.getTime()) && d.getFullYear() >= 2000 && d.getFullYear() <= 2035;
  }},
  { key: 'leadSource',      label: 'Lead Source',       critical: false, validate: v => typeof v === 'string' && v.length > 0 },
  { key: 'companyDollar',   label: 'Company Dollar',    critical: false, validate: v => typeof v === 'number' && v >= 0 },
  { key: 'propertyType',    label: 'Property Type',     critical: false, validate: v => typeof v === 'string' && v.length > 0 },
  { key: 'city',            label: 'City',              critical: false, validate: v => typeof v === 'string' && v.length > 0 },
  { key: 'state',           label: 'State',             critical: false, validate: v => typeof v === 'string' && v.length >= 2 },
  { key: 'listingDate',     label: 'Listing Date',      critical: false, validate: v => {
    if (!v || v === '') return false;
    const d = new Date(v as string);
    return !isNaN(d.getTime()) && d.getFullYear() >= 2000;
  }},
  { key: 'price',           label: 'List Price',        critical: false, validate: v => typeof v === 'number' && v > 0 },
  { key: 'loopId',          label: 'Loop ID',           critical: false, validate: v => typeof v === 'string' && v.length > 0 },
];

// ─── Issue detector ───────────────────────────────────────────────────────────

interface IssueGroup {
  label: string;
  count: number;
  color: string;
  examples: string[];
}

function detectIssues(records: DotloopRecord[]): IssueGroup[] {
  if (!records.length) return [];

  const issues: IssueGroup[] = [];

  // Invalid prices (≤ 0 or > 50M for closed/active deals)
  const badPrices = records.filter(r =>
    (r.salePrice < 0 || (r.salePrice > 50_000_000 && r.loopStatus === 'Closed')) ||
    (r.price < 0)
  );
  if (badPrices.length)
    issues.push({ label: 'Invalid sale/list price', count: badPrices.length, color: '#ef4444', examples: badPrices.slice(0, 3).map(r => r.address || r.loopId) });

  // Missing closing date on closed deals
  const closedNoDates = records.filter(r => r.loopStatus === 'Closed' && !r.closingDate);
  if (closedNoDates.length)
    issues.push({ label: 'Closed deal — missing closing date', count: closedNoDates.length, color: '#ef4444', examples: closedNoDates.slice(0, 3).map(r => r.address || r.loopId) });

  // Future closing dates on closed deals
  const futureClose = records.filter(r => {
    if (r.loopStatus !== 'Closed' || !r.closingDate) return false;
    return new Date(r.closingDate) > new Date();
  });
  if (futureClose.length)
    issues.push({ label: 'Closed deal — closing date in future', count: futureClose.length, color: '#f59e0b', examples: futureClose.slice(0, 3).map(r => r.address || r.loopId) });

  // Commission > 15% of sale price (likely data error)
  const highComm = records.filter(r =>
    r.salePrice > 0 && r.commissionTotal > 0 &&
    (r.commissionTotal / r.salePrice) > 0.15
  );
  if (highComm.length)
    issues.push({ label: 'Commission > 15% of sale price', count: highComm.length, color: '#f97316', examples: highComm.slice(0, 3).map(r => r.address || r.loopId) });

  // Missing agent
  const noAgent = records.filter(r => !r.agents);
  if (noAgent.length)
    issues.push({ label: 'Missing agent name', count: noAgent.length, color: '#f59e0b', examples: noAgent.slice(0, 3).map(r => r.address || r.loopId) });

  // Duplicate addresses (same address, different loopId)
  const addressCount: Record<string, number> = {};
  for (const r of records) if (r.address) addressCount[r.address.toLowerCase()] = (addressCount[r.address.toLowerCase()] || 0) + 1;
  const dupAddresses = Object.entries(addressCount).filter(([, c]) => c > 1);
  if (dupAddresses.length)
    issues.push({
      label: 'Duplicate property address',
      count: dupAddresses.reduce((s, [, c]) => s + c, 0),
      color: '#8b5cf6',
      examples: dupAddresses.slice(0, 3).map(([addr]) => addr),
    });

  // Missing lead source
  const noSource = records.filter(r => !r.leadSource);
  if (noSource.length)
    issues.push({ label: 'Missing lead source', count: noSource.length, color: '#6b7280', examples: noSource.slice(0, 3).map(r => r.address || r.loopId) });

  return issues.sort((a, b) => b.count - a.count);
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{label} Quality</span>
    </div>
  );
}

// ─── Completeness bar ─────────────────────────────────────────────────────────

function CompletenessBar({ spec, records }: { spec: FieldSpec; records: DotloopRecord[] }) {
  const total = records.length;
  const filled = records.filter(r => {
    const v = r[spec.key];
    return spec.validate ? spec.validate(v) : v !== undefined && v !== null && v !== '' && v !== 0;
  }).length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-44 shrink-0">
        {spec.critical && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Critical field" />}
        <span className="text-foreground text-xs truncate">{spec.label}</span>
      </div>
      <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-foreground">
          {pct}%
        </span>
      </div>
      <span className="text-muted-foreground text-xs w-20 text-right tabular-nums shrink-0">
        {filled}/{total} rows
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DataValidationRules() {
  const { filteredRecords, hasData, activateDemoMode } = useTransactionData();

  const issues = useMemo(() => detectIssues(filteredRecords), [filteredRecords]);

  // Overall score: weighted average of critical field completeness
  const overallScore = useMemo(() => {
    if (!filteredRecords.length) return 0;
    const criticalSpecs = FIELD_SPECS.filter(s => s.critical);
    let totalPct = 0;
    for (const spec of criticalSpecs) {
      const filled = filteredRecords.filter(r => {
        const v = r[spec.key];
        return spec.validate ? spec.validate(v) : v !== undefined && v !== null && v !== '';
      }).length;
      totalPct += (filled / filteredRecords.length) * 100;
    }
    // Penalise each issue type
    const penalty = Math.min(30, issues.filter(i => ['#ef4444', '#f97316'].includes(i.color)).reduce((s, i) => s + Math.min(5, Math.ceil(i.count / filteredRecords.length * 100) / 2), 0));
    return Math.max(0, Math.round(totalPct / criticalSpecs.length - penalty));
  }, [filteredRecords, issues]);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center px-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Database className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-foreground text-xl font-semibold mb-2">No Data Loaded</h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Upload a CSV to see field completeness scores and data quality issues.
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

  const totalIssues = issues.reduce((s, i) => s + i.count, 0);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Data Quality</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Field completeness and validation issues across {filteredRecords.length} records.
        </p>
      </div>

      {/* Score + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Score ring */}
        <div className="bg-background border border-border rounded-xl p-6 flex flex-col items-center justify-center">
          <ScoreRing score={overallScore} />
        </div>

        {/* Summary KPIs */}
        <div className="lg:col-span-3 grid grid-cols-3 gap-4">
          {[
            {
              label: 'Total Records', value: filteredRecords.length,
              icon: <Database className="w-4 h-4 text-blue-400" />,
            },
            {
              label: 'Quality Issues', value: totalIssues,
              icon: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
            },
            {
              label: 'Critical Fields Complete',
              value: `${Math.round(
                FIELD_SPECS.filter(s => s.critical).reduce((sum, spec) => {
                  const filled = filteredRecords.filter(r => {
                    const v = r[spec.key];
                    return spec.validate ? spec.validate(v) : !!v;
                  }).length;
                  return sum + (filled / filteredRecords.length) * 100;
                }, 0) / FIELD_SPECS.filter(s => s.critical).length
              )}%`,
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
            },
          ].map(k => (
            <div key={k.label} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary rounded-lg">{k.icon}</div>
              <div>
                <p className="text-muted-foreground text-xs">{k.label}</p>
                <p className="text-foreground font-bold text-xl tabular-nums">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Field completeness */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Field Completeness</h2>
        </div>
        <p className="text-muted-foreground text-xs mb-4">
          <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Critical fields</span>
          {' '}— empty, zero, or invalid values are counted as missing.
        </p>
        <div className="space-y-2.5">
          {FIELD_SPECS.map(spec => (
            <CompletenessBar key={String(spec.key)} spec={spec} records={filteredRecords} />
          ))}
        </div>
      </div>

      {/* Validation issues */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">
            Validation Issues ({totalIssues})
          </h2>
        </div>

        {issues.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p className="text-foreground font-medium">No issues detected</p>
            <p className="text-muted-foreground text-sm">Your data looks clean.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {issues.map(issue => (
              <div key={issue.label} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors">
                <div className="p-2 rounded-lg shrink-0" style={{ background: issue.color + '20' }}>
                  <XCircle className="w-4 h-4" style={{ color: issue.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-medium text-sm">{issue.label}</p>
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: issue.color + '20', color: issue.color }}
                    >
                      {issue.count} record{issue.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {issue.examples.length > 0 && (
                    <p className="text-muted-foreground text-xs mt-1 truncate">
                      e.g. {issue.examples.filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                {/* Mini bar */}
                <div className="w-24 shrink-0">
                  <div className="h-1.5 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (issue.count / filteredRecords.length) * 100)}%`,
                        background: issue.color,
                      }}
                    />
                  </div>
                  <p className="text-muted-foreground text-[10px] text-right mt-0.5 tabular-nums">
                    {((issue.count / filteredRecords.length) * 100).toFixed(0)}% of rows
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
