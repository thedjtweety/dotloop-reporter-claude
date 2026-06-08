import { useState, useMemo } from 'react';
import {
  DollarSign, FileText, Copy, Edit2, Trash2, Plus, Calculator,
  FileCheck, TrendingUp, Users, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import AgentAssignment from '@/components/AgentAssignment';
import CommissionAuditReport from '@/components/CommissionAuditReport';
import CommissionCalculator from '@/components/CommissionCalculator';
import { formatCurrency } from '@/lib/formatUtils';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { useAgentDetail } from '@/hooks/useAgentDetail';

// ─── Plan data ────────────────────────────────────────────────────────────────

interface CommissionPlan {
  id: string;
  name: string;
  agentSplit: number;
  brokerageSplit: number;
  cap: number;
  color: string;
  badge: string;
  description: string;
  perks: string[];
}

const DEFAULT_PLANS: CommissionPlan[] = [
  {
    id: 'new-agent',
    name: 'New Agent',
    agentSplit: 50,
    brokerageSplit: 50,
    cap: 15000,
    color: '#3b82f6',
    badge: 'Starter',
    description: 'Ideal for agents in their first 1–2 years.',
    perks: ['Mentorship program', 'Training resources', 'Lead sharing'],
  },
  {
    id: 'standard',
    name: 'Standard',
    agentSplit: 70,
    brokerageSplit: 30,
    cap: 20000,
    color: '#10b981',
    badge: 'Most Popular',
    description: 'The go-to plan for established agents.',
    perks: ['Marketing support', 'CRM access', 'Transaction support'],
  },
  {
    id: 'top-producer',
    name: 'Top Producer',
    agentSplit: 85,
    brokerageSplit: 15,
    cap: 25000,
    color: '#f59e0b',
    badge: 'Premium',
    description: 'Rewarding high-volume agents with maximum earnings.',
    perks: ['Priority support', 'Listing promotion', 'Concierge closing'],
  },
  {
    id: 'team-lead',
    name: 'Team Lead',
    agentSplit: 80,
    brokerageSplit: 20,
    cap: 22000,
    color: '#8b5cf6',
    badge: 'Leadership',
    description: 'For agents who manage and recruit their own team.',
    perks: ['Override commissions', 'Team training tools', 'Co-op marketing'],
  },
];

// ─── What-If calculator ───────────────────────────────────────────────────────

function WhatIfCalculator({ plans }: { plans: CommissionPlan[] }) {
  const [salePrice, setSalePrice] = useState(500000);
  const [commissionRate, setCommissionRate] = useState(3);
  const [planId, setPlanId] = useState(plans[1]?.id ?? '');
  const [ytdGCI, setYtdGCI] = useState(0);

  const plan = plans.find(p => p.id === planId) ?? plans[0];
  const grossCommission = (salePrice * commissionRate) / 100;
  const remainingToCap = Math.max(0, plan.cap - ytdGCI);
  const brokerageFromDeal = Math.min(grossCommission * (plan.brokerageSplit / 100), remainingToCap);
  const agentNet = grossCommission - brokerageFromDeal;
  const progressPct = Math.min(100, (ytdGCI / plan.cap) * 100);
  const postCapAgent = grossCommission * (plan.agentSplit / 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Inputs */}
      <div className="space-y-5">
        <div>
          <label className="text-muted-foreground text-xs mb-1.5 block">Commission Plan</label>
          <select
            value={planId}
            onChange={e => setPlanId(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm"
          >
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.agentSplit}/{p.brokerageSplit}, ${(p.cap/1000).toFixed(0)}K cap)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-muted-foreground text-xs mb-1.5 block">Sale Price: {formatCurrency(salePrice)}</label>
          <input
            type="range" min={100000} max={5000000} step={10000}
            value={salePrice} onChange={e => setSalePrice(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>$100K</span><span>$5M</span>
          </div>
        </div>
        <div>
          <label className="text-muted-foreground text-xs mb-1.5 block">Commission Rate: {commissionRate.toFixed(1)}%</label>
          <input
            type="range" min={1} max={6} step={0.25}
            value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>1%</span><span>6%</span>
          </div>
        </div>
        <div>
          <label className="text-muted-foreground text-xs mb-1.5 block">YTD Company Dollar Paid: {formatCurrency(ytdGCI)}</label>
          <input
            type="range" min={0} max={plan?.cap ?? 25000} step={500}
            value={ytdGCI} onChange={e => setYtdGCI(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
            <span>$0</span><span>{formatCurrency(plan?.cap ?? 0)}</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Cap progress */}
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Cap Progress ({plan?.name})</span>
            <span className="text-foreground font-semibold">{progressPct.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-muted-foreground text-xs mt-1.5">{formatCurrency(ytdGCI)} of {formatCurrency(plan?.cap ?? 0)} cap</p>
        </div>

        {/* This deal breakdown */}
        <div className="bg-secondary rounded-xl p-4 space-y-3">
          <p className="text-foreground text-sm font-semibold">This Deal Breakdown</p>
          {[
            { label: 'Gross Commission', value: grossCommission, color: 'text-foreground' },
            { label: `Brokerage (${plan?.brokerageSplit}% to cap)`, value: brokerageFromDeal, color: 'text-red-400' },
            { label: 'Agent Net (this deal)', value: agentNet, color: 'text-emerald-400', bold: true },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className={`${row.color} ${row.bold ? 'font-bold text-base' : ''} tabular-nums`}>
                {formatCurrency(row.value)}
              </span>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">If cap already hit</span>
            <span className="text-yellow-400 font-medium tabular-nums">{formatCurrency(postCapAgent)}</span>
          </div>
        </div>

        {/* Summary callout */}
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: plan?.color + '40', background: plan?.color + '10' }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: plan?.color }} />
          <p className="text-sm" style={{ color: plan?.color }}>
            {progressPct >= 100
              ? `Cap hit — agent earns ${plan?.agentSplit}% on all remaining deals this year.`
              : `${formatCurrency(remainingToCap)} left to cap. Agent nets ${formatCurrency(agentNet)} from this deal.`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onEdit, onCopy, onDelete }: {
  plan: CommissionPlan;
  onEdit: (p: CommissionPlan) => void;
  onCopy: (p: CommissionPlan) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-background border border-border rounded-xl p-5 flex flex-col gap-3 hover:border-opacity-80 transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-foreground font-semibold text-base">{plan.name}</span>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: plan.color + '20', color: plan.color }}
            >
              {plan.badge}
            </span>
          </div>
          <p className="text-muted-foreground text-xs">{plan.description}</p>
        </div>
        <div className="flex gap-1 shrink-0 ml-3">
          <button onClick={() => onEdit(plan)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onCopy(plan)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(plan.id)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Split visual */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Agent {plan.agentSplit}%</span>
          <span className="text-muted-foreground">Brokerage {plan.brokerageSplit}%</span>
        </div>
        <div className="flex h-2.5 rounded-full overflow-hidden">
          <div className="h-full rounded-l-full transition-all" style={{ width: `${plan.agentSplit}%`, background: plan.color }} />
          <div className="h-full rounded-r-full bg-border flex-1" />
        </div>
      </div>

      {/* Cap */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Annual Cap</span>
        <span className="font-bold text-foreground tabular-nums">{formatCurrency(plan.cap)}</span>
      </div>

      {/* Perks */}
      <div className="flex flex-wrap gap-1.5 mt-1">
        {plan.perks.map(p => (
          <span key={p} className="px-2 py-0.5 bg-secondary text-muted-foreground text-[10px] rounded-full">{p}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CommissionManagement() {
  const [, setLocation] = useLocation();
  const { filteredRecords, agentMetrics, hasData } = useTransactionData();
  const { agentTarget, openAgent, closeAgent } = useAgentDetail();
  const [plans, setPlans] = useState<CommissionPlan[]>(DEFAULT_PLANS);
  const [activeTab, setActiveTab] = useState('plans');
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);

  const totalGCI = useMemo(() => filteredRecords.reduce((s, r) => s + (r.commissionTotal || 0), 0), [filteredRecords]);
  const totalCompanyDollar = useMemo(() => filteredRecords.reduce((s, r) => s + (r.companyDollar || 0), 0), [filteredRecords]);
  const totalClosed = useMemo(() => filteredRecords.filter(r => r.loopStatus === 'Closed').length, [filteredRecords]);

  const handleDelete = (id: string) => setPlans(prev => prev.filter(p => p.id !== id));
  const handleCopy = (plan: CommissionPlan) =>
    setPlans(prev => [...prev, { ...plan, id: `${plan.id}-copy-${Date.now()}`, name: `${plan.name} (Copy)`, badge: 'Custom' }]);
  const handleEdit = (_plan: CommissionPlan) => {
    // In a full implementation this would open a dialog; for now, a toast-like no-op
  };

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Commission Management</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Plans, assignments, calculations, and audits in one place.</p>
        </div>
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Net commission report banner */}
      <button
        onClick={() => setLocation('/net-commission-report')}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-left hover:bg-emerald-500/15 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-emerald-300 font-semibold text-sm">Net Commission Report</p>
            <p className="text-emerald-400/70 text-xs">Full breakdown of gross → agent net → company dollar for every closed deal</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* KPI strip */}
      {hasData && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total GCI', value: formatCurrency(totalGCI), icon: <DollarSign className="w-4 h-4 text-emerald-400" />, records: filteredRecords.filter(r => (r.commissionTotal || 0) > 0) },
            { label: 'Company Dollar', value: formatCurrency(totalCompanyDollar), icon: <TrendingUp className="w-4 h-4 text-blue-400" />, records: filteredRecords.filter(r => (r.companyDollar || 0) > 0) },
            { label: 'Closed Deals', value: String(totalClosed), icon: <CheckCircle2 className="w-4 h-4 text-purple-400" />, records: filteredRecords.filter(r => r.loopStatus === 'Closed') },
          ].map(k => (
            <div key={k.label} onClick={() => setDrillTarget({ title: k.label, records: k.records })} className="bg-background border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors">
              <div className="p-2 bg-secondary rounded-lg">{k.icon}</div>
              <div>
                <p className="text-muted-foreground text-xs">{k.label}</p>
                <p className="text-foreground font-bold text-lg tabular-nums">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="plans" className="gap-1.5"><DollarSign className="w-3.5 h-3.5" />Plans</TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5"><Users className="w-3.5 h-3.5" />Agents</TabsTrigger>
          <TabsTrigger value="calculate" className="gap-1.5"><Calculator className="w-3.5 h-3.5" />Calculate</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><FileCheck className="w-3.5 h-3.5" />Audit</TabsTrigger>
          <TabsTrigger value="whatif" className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" />What-If</TabsTrigger>
        </TabsList>

        {/* Plans */}
        <TabsContent value="plans" className="mt-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map(plan => (
              <PlanCard key={plan.id} plan={plan} onEdit={handleEdit} onCopy={handleCopy} onDelete={handleDelete} />
            ))}
          </div>
        </TabsContent>

        {/* Agents */}
        <TabsContent value="agents" className="mt-5">
          <div className="bg-background border border-border rounded-xl p-6">
            <h3 className="text-foreground font-semibold mb-4">Agent Plan Assignments</h3>
            <AgentAssignment records={filteredRecords} />
          </div>
        </TabsContent>

        {/* Calculate */}
        <TabsContent value="calculate" className="mt-5">
          <div className="bg-background border border-border rounded-xl p-6">
            <h3 className="text-foreground font-semibold mb-4">Commission Calculator</h3>
            <CommissionCalculator />
          </div>
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit" className="mt-5">
          <div className="bg-background border border-border rounded-xl p-6">
            <h3 className="text-foreground font-semibold mb-1">Commission Audit</h3>
            <p className="text-muted-foreground text-sm mb-5">Verify commission calculations against uploaded data.</p>
            {hasData ? (
              <CommissionAuditReport records={filteredRecords} />
            ) : (
              <div className="text-center py-16">
                <FileCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Upload transaction data to run audits.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* What-If */}
        <TabsContent value="whatif" className="mt-5">
          <div className="bg-background border border-border rounded-xl p-6">
            <h3 className="text-foreground font-semibold mb-1">What-If Scenario Builder</h3>
            <p className="text-muted-foreground text-sm mb-6">Adjust a deal's parameters to see how commission splits out under each plan.</p>
            <WhatIfCalculator plans={plans} />
          </div>
        </TabsContent>
      </Tabs>

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} onAgentClick={(name) => openAgent(name, filteredRecords, agentMetrics)} />
      <AgentDetailModal target={agentTarget} onClose={closeAgent} />
    </div>
  );
}
