import { useState, useMemo } from 'react';
import { UserPlus, Plus, Search, ChevronDown, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Stage = 'prospect' | 'contacted' | 'interview' | 'offer' | 'hired' | 'rejected';

interface Prospect {
  id: string;
  name: string;
  source: string;
  stage: Stage;
  gciPotential: number;
  notes: string;
  addedDate: string;
  lastContact: string;
}

const STAGE_COLORS: Record<Stage, string> = {
  prospect: 'text-gray-400 bg-gray-500/20',
  contacted: 'text-blue-400 bg-blue-500/20',
  interview: 'text-yellow-400 bg-yellow-500/20',
  offer: 'text-purple-400 bg-purple-500/20',
  hired: 'text-emerald-400 bg-emerald-500/20',
  rejected: 'text-red-400 bg-red-500/20',
};

const STAGES: Stage[] = ['prospect', 'contacted', 'interview', 'offer', 'hired', 'rejected'];

export default function RecruitingPage() {
  const { agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'retention' | 'analytics'>('pipeline');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<Stage | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', source: '', gciPotential: '', notes: '' });

  const filtered = prospects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === 'all' || p.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = prospects.filter(p => p.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  const handleAdd = () => {
    if (!form.name.trim()) return;
    setProspects(prev => [...prev, {
      id: Date.now().toString(),
      name: form.name,
      source: form.source || 'Direct',
      stage: 'prospect',
      gciPotential: parseFloat(form.gciPotential) || 0,
      notes: form.notes,
      addedDate: new Date().toISOString().split('T')[0],
      lastContact: new Date().toISOString().split('T')[0],
    }]);
    setForm({ name: '', source: '', gciPotential: '', notes: '' });
    setShowAdd(false);
  };

  const updateStage = (id: string, stage: Stage) => {
    setProspects(prev => prev.map(p => p.id === id ? { ...p, stage } : p));
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-emerald-400" />
            Recruiting Pipeline
          </h1>
          <p className="text-gray-400 text-sm mt-1">Track agent prospects and retention risks</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600"
        >
          <Plus className="w-4 h-4" /> Add Prospect
        </button>
      </div>

      {/* Stage summary */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {STAGES.map(stage => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
            className={`bg-[#0f1923] border rounded-xl p-3 text-center transition-colors ${
              stageFilter === stage ? 'border-emerald-500/40' : 'border-[#1e2d3d] hover:border-[#2a3d50]'
            }`}
          >
            <div className={`text-2xl font-bold ${stageFilter === stage ? 'text-emerald-400' : 'text-white'}`}>
              {stageCounts[stage]}
            </div>
            <div className="text-gray-400 text-xs capitalize mt-1">{stage}</div>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#1e2d3d]">
        {([
          { key: 'pipeline', label: 'Recruiting Pipeline' },
          { key: 'retention', label: 'Retention Risk' },
          { key: 'analytics', label: 'Analytics' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 -mb-px ${
              activeTab === tab.key ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >{tab.label}</button>
        ))}
      </div>

      {activeTab === 'pipeline' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search prospects..."
                className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-16 flex flex-col items-center justify-center">
              <UserPlus className="w-12 h-12 text-gray-500 mb-4 opacity-30" />
              <p className="text-white font-medium mb-1">No prospects yet</p>
              <p className="text-gray-400 text-sm mb-4">Add agent prospects to track your recruiting pipeline</p>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4" /> Add Prospect
              </button>
            </div>
          ) : (
            <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e2d3d] text-gray-400">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Stage</th>
                    <th className="px-4 py-3 text-right">GCI Potential</th>
                    <th className="px-4 py-3 text-left">Added</th>
                    <th className="px-4 py-3 text-left">Last Contact</th>
                    <th className="px-4 py-3 text-left">Notes</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-[#1a2332] hover:bg-[#1a2332]/50">
                      <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-gray-400">{p.source}</td>
                      <td className="px-4 py-3">
                        <select
                          value={p.stage}
                          onChange={e => updateStage(p.id, e.target.value as Stage)}
                          className={`px-2 py-0.5 rounded text-xs font-medium bg-transparent border-0 focus:outline-none cursor-pointer ${STAGE_COLORS[p.stage]}`}
                        >
                          {STAGES.map(s => (
                            <option key={s} value={s} className="bg-[#0f1923] text-gray-200 capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-400">{p.gciPotential ? formatCurrency(p.gciPotential) : '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.addedDate}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{p.lastContact}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-[200px] truncate">{p.notes || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setProspects(prev => prev.filter(x => x.id !== p.id))}
                          className="text-red-400 hover:text-red-300 text-xs"
                        >Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'retention' && (
        <div className="space-y-4">
          {!hasData ? (
            <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-12 flex flex-col items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-yellow-400 mb-3 opacity-60" />
              <p className="text-white font-medium mb-1">Retention Risk Analysis</p>
              <p className="text-gray-400 text-sm mb-4">Upload CSV data or load demo data to identify agents at risk</p>
              <button onClick={activateDemoMode} className="px-4 py-2 rounded bg-emerald-500 text-white text-sm hover:bg-emerald-600">Load Demo Data</button>
            </div>
          ) : (
            <>
              <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">Agent Retention Risk Score</h2>
                <p className="text-gray-400 text-xs mb-4">Agents with low closing rates or below-average GCI may be at risk. Consider proactive engagement.</p>
                <div className="space-y-3">
                  {agentMetrics
                    .map(a => ({
                      ...a,
                      riskScore: Math.round(
                        (a.closingRate < 30 ? 40 : a.closingRate < 50 ? 20 : 0) +
                        (a.closedDeals < 3 ? 30 : a.closedDeals < 6 ? 15 : 0) +
                        (a.totalCommission < 10000 ? 30 : a.totalCommission < 25000 ? 15 : 0)
                      ),
                    }))
                    .sort((a, b) => b.riskScore - a.riskScore)
                    .slice(0, 15)
                    .map(a => (
                      <div key={a.agentName} className="flex items-center gap-3">
                        <div className="w-32 text-gray-300 text-sm truncate">{a.agentName}</div>
                        <div className="flex-1 h-2 bg-[#1a2332] rounded-full">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${a.riskScore}%`,
                              background: a.riskScore >= 60 ? '#ef4444' : a.riskScore >= 30 ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                        <div className="w-16 text-right">
                          <span className={`text-xs font-medium ${
                            a.riskScore >= 60 ? 'text-red-400' : a.riskScore >= 30 ? 'text-yellow-400' : 'text-emerald-400'
                          }`}>
                            {a.riskScore >= 60 ? 'High' : a.riskScore >= 30 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                        <div className="w-20 text-right text-gray-400 text-xs">{a.closedDeals} deals</div>
                      </div>
                    ))
                  }
                </div>
              </div>
              <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">GCI Distribution (Retention Indicator)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agentMetrics.slice(0, 15).map(a => ({ name: a.agentName.split(' ')[0], gci: a.totalCommission })).sort((a, b) => b.gci - a.gci)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }} formatter={(v: number) => [formatCurrency(v), 'GCI']} />
                    <Bar dataKey="gci" radius={[4, 4, 0, 0]}>
                      {agentMetrics.slice(0, 15).map((_, i) => <Cell key={i} fill={i < 3 ? '#10b981' : i < 8 ? '#3b82f6' : '#ef4444'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-gray-500 text-xs mt-2">Red bars indicate agents in the bottom tier — higher retention risk</p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-8 flex flex-col items-center justify-center min-h-64">
          <UserPlus className="w-10 h-10 text-gray-500 mb-3 opacity-30" />
          <p className="text-white font-medium mb-1">Recruiting Analytics</p>
          <p className="text-gray-400 text-sm">Add prospects to see conversion rates and pipeline analytics</p>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-4">Add Prospect</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Agent name"
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Source</label>
                <input
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="e.g. Referral, LinkedIn, Job board"
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">GCI Potential</label>
                <input
                  type="number"
                  value={form.gciPotential}
                  onChange={e => setForm(f => ({ ...f, gciPotential: e.target.value }))}
                  placeholder="Estimated annual GCI"
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">Cancel</button>
              <button onClick={handleAdd} className="px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
