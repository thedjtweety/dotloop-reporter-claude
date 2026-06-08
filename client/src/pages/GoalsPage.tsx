import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { useCDAPanel } from '@/contexts/CDAContext';
import { formatCurrency } from '@/lib/formatUtils';
import { Target, Plus, Search, ChevronDown, ChevronUp, TrendingDown, TrendingUp, ClipboardList } from 'lucide-react';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';
import { AgentDetailModal } from '@/components/AgentDetailModal';
import { useAgentDetail } from '@/hooks/useAgentDetail';

interface AgentGoal {
  agentName: string;
  gciCurrent: number;
  gciTarget: number;
  volCurrent: number;
  volTarget: number;
  dealsCurrent: number;
  dealsTarget: number;
  status: 'ahead' | 'on-track' | 'behind';
  projectedGCI: number;
}

const YEAR = new Date().getFullYear();
const YEAR_PROGRESS = (() => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
})();

export default function GoalsPage() {
  const ctx = useTransactionData();
  const agentMetrics = ctx.agentMetrics || [];
  const filteredRecords = ctx.filteredRecords || [];
  const { openCDA } = useCDAPanel();
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(YEAR);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const { agentTarget, openAgent, closeAgent } = useAgentDetail();

  // Build goals from agent metrics with simulated targets
  const goals: AgentGoal[] = agentMetrics.map(a => {
    const gciTarget = a.totalCommission * 4.5; // simulate annual target
    const volTarget = a.averageSalesPrice * a.closedDeals * 4.5;
    const dealsTarget = Math.round(a.closedDeals * 4.5);
    const pct = a.totalCommission / (gciTarget || 1);
    const status: AgentGoal['status'] = pct > YEAR_PROGRESS / 100 + 0.05 ? 'ahead' : pct < YEAR_PROGRESS / 100 - 0.05 ? 'behind' : 'on-track';
    return {
      agentName: a.agentName,
      gciCurrent: a.totalCommission,
      gciTarget,
      volCurrent: a.averageSalesPrice * a.closedDeals,
      volTarget,
      dealsCurrent: a.closedDeals,
      dealsTarget,
      status,
      projectedGCI: a.totalCommission * (12 / (new Date().getMonth() + 1)),
    };
  });

  const filtered = goals.filter(g => g.agentName.toLowerCase().includes(search.toLowerCase()));
  const ahead = goals.filter(g => g.status === 'ahead').length;
  const onTrack = goals.filter(g => g.status === 'on-track').length;
  const behind = goals.filter(g => g.status === 'behind').length;
  const totalGCITarget = goals.reduce((s, g) => s + g.gciTarget, 0);
  const totalGCIEarned = goals.reduce((s, g) => s + g.gciCurrent, 0);

  const toggleExpand = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const statusColor = (s: AgentGoal['status']) =>
    s === 'ahead' ? 'text-emerald-400 bg-emerald-500/20' :
    s === 'on-track' ? 'text-blue-400 bg-blue-500/20' :
    'text-red-400 bg-red-500/20';

  const statusLabel = (s: AgentGoal['status']) =>
    s === 'ahead' ? 'Ahead' : s === 'on-track' ? 'On Track' : 'Behind';

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-emerald-400" />
            Agent Goals
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{year} · {goals.length} agents with goals · {YEAR_PROGRESS}% through the year</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none"
          >
            {[2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600">
            <Plus className="w-4 h-4" /> Set Goal
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Goals Set', value: goals.length, color: 'text-foreground', icon: '◎', records: filteredRecords },
          { label: 'Ahead of Pace', value: ahead, color: 'text-emerald-400', icon: '↗', records: filteredRecords.filter(r => goals.find(g => g.status === 'ahead' && (r.agents || '').includes(g.agentName))) },
          { label: 'On Track', value: onTrack, color: 'text-blue-400', icon: '—', records: filteredRecords.filter(r => goals.find(g => g.status === 'on-track' && (r.agents || '').includes(g.agentName))) },
          { label: 'Behind Pace', value: behind, color: 'text-red-400', icon: '↘', records: filteredRecords.filter(r => goals.find(g => g.status === 'behind' && (r.agents || '').includes(g.agentName))) },
        ].map(card => (
          <div key={card.label} className="bg-secondary border border-border rounded-xl p-4 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setDrillTarget({ title: card.label, records: card.records })}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${card.color}`}>{card.icon}</span>
              <span className="text-muted-foreground text-sm">{card.label}</span>
            </div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Brokerage goal progress */}
      <div className="bg-secondary border border-border rounded-xl p-5 mb-6">
        <h2 className="text-foreground font-semibold mb-4 flex items-center gap-2">
          <span className="text-muted-foreground">📊</span> Brokerage Goal Progress
        </h2>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <div className="text-muted-foreground text-sm mb-1">Total GCI Target</div>
            <div className="text-foreground text-2xl font-bold">{formatCurrency(totalGCITarget)}</div>
            <div className="text-muted-foreground text-xs mb-2">{formatCurrency(totalGCIEarned)} earned</div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (totalGCIEarned / (totalGCITarget || 1)) * 100).toFixed(1)}%` }}
              />
            </div>
            <div className="text-muted-foreground text-xs mt-1">{((totalGCIEarned / (totalGCITarget || 1)) * 100).toFixed(0)}%</div>
          </div>
          <div>
            <div className="text-muted-foreground text-sm mb-1">Year Progress</div>
            <div className="text-foreground text-2xl font-bold">{YEAR_PROGRESS}%</div>
            <div className="text-muted-foreground text-xs mb-2">Calendar year</div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${YEAR_PROGRESS}%` }} />
            </div>
            <div className="text-muted-foreground text-xs mt-1">{YEAR_PROGRESS}%</div>
          </div>
        </div>
      </div>

      {/* Agent goals list */}
      <div className="bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-foreground font-semibold">Agent Goals</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="bg-secondary border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-48"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{agentMetrics.length === 0 ? 'Upload a CSV to see agent goals.' : 'No agents found.'}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2332]">
            {filtered.map(goal => {
              const gciPct = Math.min(100, (goal.gciCurrent / (goal.gciTarget || 1)) * 100);
              const isExpanded = expanded.has(goal.agentName);
              return (
                <div key={goal.agentName} className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleExpand(goal.agentName)}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground font-medium">{goal.agentName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(goal.status)}`}>
                            {statusLabel(goal.status)}
                          </span>
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5 flex items-center gap-3">
                          <span>$ GCI: {formatCurrency(goal.gciCurrent)} / {formatCurrency(goal.gciTarget)}</span>
                          <span>📊 Vol: {formatCurrency(goal.volCurrent)} / {formatCurrency(goal.volTarget)}</span>
                          <span># Deals: {goal.dealsCurrent} / {goal.dealsTarget}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-muted-foreground text-xs">GCI</div>
                        <div className="w-32 h-1.5 bg-secondary rounded-full mt-1">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gciPct}%` }} />
                        </div>
                        <div className="text-muted-foreground text-xs mt-0.5">{gciPct.toFixed(0)}%</div>
                      </div>
                      <div className="text-right">
                        {goal.status === 'behind' ? (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        )}
                        <div className="text-muted-foreground text-xs">{formatCurrency(goal.projectedGCI)} proj.</div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const agentRecords = filteredRecords.filter(r =>
                            (r.agents || '').toLowerCase().includes(goal.agentName.toLowerCase())
                          );
                          const closed = agentRecords.filter(r => r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
                          const record = (closed.length > 0 ? closed : agentRecords).sort((a, b) => new Date(b.closingDate || '').getTime() - new Date(a.closingDate || '').getTime())[0];
                          if (record) openCDA(record, `Goals: ${goal.agentName}`);
                        }}
                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded transition-colors"
                        title="Open CDA Builder"
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <button
                        className="mb-3 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors"
                        onClick={(e) => { e.stopPropagation(); setDrillTarget({ title: `${goal.agentName} — Transactions`, records: filteredRecords.filter(r => (r.agents || '').includes(goal.agentName)) }); }}
                      >View Deals</button>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'GCI Progress', current: goal.gciCurrent, target: goal.gciTarget, format: formatCurrency },
                        { label: 'Volume Progress', current: goal.volCurrent, target: goal.volTarget, format: formatCurrency },
                        { label: 'Deals Progress', current: goal.dealsCurrent, target: goal.dealsTarget, format: (v: number) => v.toString() },
                      ].map(m => {
                        const pct = Math.min(100, (m.current / (m.target || 1)) * 100);
                        return (
                          <div key={m.label} className="bg-secondary rounded-lg p-3">
                            <div className="text-muted-foreground text-xs mb-1">{m.label}</div>
                            <div className="text-foreground font-medium">{m.format(m.current)}</div>
                            <div className="text-muted-foreground text-xs">of {m.format(m.target)}</div>
                            <div className="h-1.5 bg-secondary rounded-full mt-2">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="text-muted-foreground text-xs mt-1">{pct.toFixed(0)}%</div>
                          </div>
                        );
                      })}
                    </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} onAgentClick={(name) => openAgent(name, filteredRecords, agentMetrics)} />
      <AgentDetailModal target={agentTarget} onClose={closeAgent} />
    </div>
  );
}
