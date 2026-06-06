import { useState, useMemo } from 'react';
import {
  UserPlus, Mail, Phone, MessageSquare, ChevronDown, Search, Plus, X,
  TrendingUp, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'Lead' | 'Contacted' | 'Interviewing' | 'Offer Extended' | 'Onboarding' | 'Hired';

interface Candidate {
  id: string;
  name: string;
  source: string;
  stage: Stage;
  email: string;
  phone: string;
  currentBrokerage: string;
  ytdGCI: number;
  addedDate: string;
  notes: string;
}

// ─── Static seed data ─────────────────────────────────────────────────────────

const SEED_CANDIDATES: Candidate[] = [
  { id: '1', name: 'Sarah Chen',      source: 'Referral',    stage: 'Lead',          email: 'schen@email.com',    phone: '555-1001', currentBrokerage: 'RE/MAX', ytdGCI: 82000,  addedDate: '2026-05-10', notes: '' },
  { id: '2', name: 'Marcus Webb',     source: 'LinkedIn',    stage: 'Lead',          email: 'mwebb@email.com',    phone: '555-1002', currentBrokerage: 'KW',     ytdGCI: 65000,  addedDate: '2026-05-14', notes: '' },
  { id: '3', name: 'Priya Nair',      source: 'Cold Outreach', stage: 'Lead',        email: 'pnair@email.com',    phone: '555-1003', currentBrokerage: 'C21',    ytdGCI: 45000,  addedDate: '2026-05-18', notes: '' },
  { id: '4', name: 'James Ortega',    source: 'Referral',    stage: 'Contacted',     email: 'jortega@email.com',  phone: '555-1004', currentBrokerage: 'eXp',    ytdGCI: 120000, addedDate: '2026-05-03', notes: 'Ready to switch Q3' },
  { id: '5', name: 'Dana Reyes',      source: 'Job Board',   stage: 'Contacted',     email: 'dreyes@email.com',   phone: '555-1005', currentBrokerage: 'Compass', ytdGCI: 95000, addedDate: '2026-05-07', notes: '' },
  { id: '6', name: 'Tyler Brooks',    source: 'LinkedIn',    stage: 'Contacted',     email: 'tbrooks@email.com',  phone: '555-1006', currentBrokerage: 'KW',     ytdGCI: 58000,  addedDate: '2026-05-12', notes: 'Follow up June 15' },
  { id: '7', name: 'Monique Laval',   source: 'Referral',    stage: 'Interviewing',  email: 'mlaval@email.com',   phone: '555-1007', currentBrokerage: 'RE/MAX', ytdGCI: 145000, addedDate: '2026-04-22', notes: 'Very interested in cap' },
  { id: '8', name: 'Kevin Park',      source: 'Career Fair', stage: 'Interviewing',  email: 'kpark@email.com',    phone: '555-1008', currentBrokerage: 'eXp',    ytdGCI: 72000,  addedDate: '2026-04-28', notes: '' },
  { id: '9', name: 'Alicia Fontaine', source: 'Referral',    stage: 'Offer Extended',email: 'afontaine@email.com',phone: '555-1009', currentBrokerage: 'Berkshire', ytdGCI: 190000, addedDate: '2026-04-10', notes: 'Counter offer pending' },
  { id: '10', name: 'Robert Hsu',     source: 'LinkedIn',    stage: 'Onboarding',    email: 'rhsu@email.com',     phone: '555-1010', currentBrokerage: '—',      ytdGCI: 0,       addedDate: '2026-03-28', notes: 'Starting July 1' },
  { id: '11', name: 'Camille Troy',   source: 'Referral',    stage: 'Hired',         email: 'ctroy@email.com',    phone: '555-1011', currentBrokerage: '—',      ytdGCI: 0,       addedDate: '2026-02-15', notes: 'Active since March' },
  { id: '12', name: 'Noah Singh',     source: 'Job Board',   stage: 'Hired',         email: 'nsingh@email.com',   phone: '555-1012', currentBrokerage: '—',      ytdGCI: 0,       addedDate: '2026-01-20', notes: '2 closed deals' },
];

const STAGES: Stage[] = ['Lead', 'Contacted', 'Interviewing', 'Offer Extended', 'Onboarding', 'Hired'];

const STAGE_META: Record<Stage, { color: string; bg: string; textColor: string }> = {
  'Lead':          { color: '#6b7280', bg: 'bg-gray-500/10',    textColor: 'text-gray-400' },
  'Contacted':     { color: '#3b82f6', bg: 'bg-blue-500/10',    textColor: 'text-blue-400' },
  'Interviewing':  { color: '#f59e0b', bg: 'bg-yellow-500/10',  textColor: 'text-yellow-400' },
  'Offer Extended':{ color: '#f97316', bg: 'bg-orange-500/10',  textColor: 'text-orange-400' },
  'Onboarding':    { color: '#8b5cf6', bg: 'bg-purple-500/10',  textColor: 'text-purple-400' },
  'Hired':         { color: '#10b981', bg: 'bg-emerald-500/10', textColor: 'text-emerald-400' },
};

const SOURCE_COLORS: Record<string, string> = {
  Referral: '#10b981', LinkedIn: '#3b82f6', 'Cold Outreach': '#f59e0b',
  'Job Board': '#8b5cf6', 'Career Fair': '#ef4444',
};

// ─── Funnel bar row ───────────────────────────────────────────────────────────

function FunnelBar({ stage, count, total }: { stage: Stage; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const meta = STAGE_META[stage];
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-xs w-28 shrink-0">{stage}</span>
      <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: meta.color }}
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-foreground">
          {count}
        </span>
      </div>
      <span className="text-muted-foreground text-xs w-10 text-right tabular-nums">{pct.toFixed(0)}%</span>
    </div>
  );
}

// ─── Candidate card ───────────────────────────────────────────────────────────

function CandidateCard({ candidate, onChange, onRemove }: {
  candidate: Candidate;
  onChange: (id: string, stage: Stage) => void;
  onRemove: (id: string) => void;
}) {
  const meta = STAGE_META[candidate.stage];
  const initials = candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const srcColor = SOURCE_COLORS[candidate.source] ?? '#6b7280';

  return (
    <div className="bg-background border border-border rounded-lg p-3 text-sm hover:border-border/80 transition-all">
      {/* Name + remove */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: srcColor + '25', color: srcColor }}
          >
            {initials}
          </div>
          <div>
            <p className="text-foreground font-medium leading-tight">{candidate.name}</p>
            <p className="text-muted-foreground text-[10px]">{candidate.currentBrokerage}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(candidate.id)}
          className="text-muted-foreground hover:text-red-400 p-0.5 shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Source badge */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span
          className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
          style={{ background: srcColor + '20', color: srcColor }}
        >
          {candidate.source}
        </span>
        {candidate.ytdGCI > 0 && (
          <span className="text-muted-foreground text-[10px]">YTD ${(candidate.ytdGCI / 1000).toFixed(0)}K</span>
        )}
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-1 mb-2.5">
        <a href={`mailto:${candidate.email}`} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-blue-400 transition-colors">
          <Mail className="w-3.5 h-3.5" />
        </a>
        <a href={`tel:${candidate.phone}`} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-emerald-400 transition-colors">
          <Phone className="w-3.5 h-3.5" />
        </a>
        <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-purple-400 transition-colors">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <span className="flex-1" />
        {candidate.notes && (
          <span className="text-muted-foreground text-[10px] italic truncate max-w-[80px]">{candidate.notes}</span>
        )}
      </div>

      {/* Stage dropdown */}
      <div className="relative">
        <select
          value={candidate.stage}
          onChange={e => onChange(candidate.id, e.target.value as Stage)}
          className={`w-full text-[11px] font-medium rounded-md px-2 py-1 border-0 cursor-pointer appearance-none pr-6 ${meta.bg} ${meta.textColor}`}
        >
          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <ChevronDown className={`w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none ${meta.textColor}`} />
      </div>
    </div>
  );
}

// ─── Add candidate dialog ─────────────────────────────────────────────────────

function AddCandidatePanel({ onAdd, onClose }: { onAdd: (c: Candidate) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('Referral');
  const [stage, setStage] = useState<Stage>('Lead');
  const [email, setEmail] = useState('');
  const [brokerage, setBrokerage] = useState('');

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      id: `new-${Date.now()}`,
      name: name.trim(),
      source,
      stage,
      email,
      phone: '',
      currentBrokerage: brokerage,
      ytdGCI: 0,
      addedDate: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    onClose();
  };

  const fieldCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500';

  return (
    <div className="bg-background border border-border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-foreground font-semibold text-sm">Add Candidate</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      <input className={fieldCls} placeholder="Full name *" value={name} onChange={e => setName(e.target.value)} />
      <input className={fieldCls} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className={fieldCls} placeholder="Current brokerage" value={brokerage} onChange={e => setBrokerage(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <select value={source} onChange={e => setSource(e.target.value)} className={fieldCls}>
          {Object.keys(SOURCE_COLORS).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={stage} onChange={e => setStage(e.target.value as Stage)} className={fieldCls}>
          {STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <Button onClick={submit} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm h-8">
        Add Candidate
      </Button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RecruitingPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(SEED_CANDIDATES);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const stageChange = (id: string, stage: Stage) =>
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage } : c));
  const removeCandidate = (id: string) =>
    setCandidates(prev => prev.filter(c => c.id !== id));
  const addCandidate = (c: Candidate) =>
    setCandidates(prev => [...prev, c]);

  const filtered = useMemo(() =>
    search
      ? candidates.filter(c =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.source.toLowerCase().includes(search.toLowerCase()) ||
          c.currentBrokerage.toLowerCase().includes(search.toLowerCase())
        )
      : candidates,
  [candidates, search]);

  const stageCounts = useMemo(() =>
    Object.fromEntries(STAGES.map(s => [s, candidates.filter(c => c.stage === s).length])) as Record<Stage, number>,
  [candidates]);

  const conversionRate = candidates.length > 0
    ? ((stageCounts['Hired'] / candidates.length) * 100).toFixed(0)
    : '0';

  // Calculate avg days in pipeline for hired (mock: based on addedDate vs now)
  const avgDays = useMemo(() => {
    const hired = candidates.filter(c => c.stage === 'Hired');
    if (!hired.length) return 0;
    const now = new Date();
    const total = hired.reduce((s, c) => s + Math.floor((now.getTime() - new Date(c.addedDate).getTime()) / 86400000), 0);
    return Math.round(total / hired.length);
  }, [candidates]);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recruiting Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{candidates.length} candidates · {conversionRate}% hire rate</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidates…"
              className="bg-secondary border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 w-44"
            />
          </div>
          <Button size="sm" onClick={() => setShowAdd(v => !v)} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {/* Add panel */}
      {showAdd && <AddCandidatePanel onAdd={addCandidate} onClose={() => setShowAdd(false)} />}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Pipeline', value: candidates.length, icon: <Users className="w-4 h-4 text-blue-400" /> },
          { label: 'Active (non-Lead)', value: candidates.filter(c => c.stage !== 'Lead').length, icon: <TrendingUp className="w-4 h-4 text-yellow-400" /> },
          { label: 'Hired YTD', value: stageCounts['Hired'], icon: <UserPlus className="w-4 h-4 text-emerald-400" /> },
          { label: 'Avg Days to Hire', value: avgDays > 0 ? `${avgDays}d` : '—', icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
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

      {/* Conversion funnel */}
      <div className="bg-background border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-foreground font-semibold text-sm uppercase tracking-wide">Conversion Funnel</h2>
        </div>
        <div className="space-y-2.5">
          {STAGES.map(stage => (
            <FunnelBar key={stage} stage={stage} count={stageCounts[stage]} total={candidates.length} />
          ))}
        </div>
      </div>

      {/* Kanban board */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 220}px` }}>
          {STAGES.map(stage => {
            const meta = STAGE_META[stage];
            const stageCandidates = filtered.filter(c => c.stage === stage);
            return (
              <div key={stage} className="w-52 shrink-0">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${meta.bg}`}>
                  <span className={`text-xs font-semibold ${meta.textColor}`}>{stage}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.textColor}`}>
                    {stageCandidates.length}
                  </span>
                </div>
                {/* Cards */}
                <div className="bg-secondary/40 border border-t-0 border-border rounded-b-lg p-2 space-y-2 min-h-[300px]">
                  {stageCandidates.map(c => (
                    <CandidateCard key={c.id} candidate={c} onChange={stageChange} onRemove={removeCandidate} />
                  ))}
                  {stageCandidates.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-xs">No candidates</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
