import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { GitCompare, Search, ChevronDown } from 'lucide-react';

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ComparePage() {
  const ctx = useTransactionData();
  const agentMetrics = ctx.agentMetrics || [];
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = agentMetrics.filter(a =>
    a.agentName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAgent = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 4) {
        next.add(name);
      }
      return next;
    });
  };

  const selectedAgents = agentMetrics.filter(a => selected.has(a.agentName));

  const metrics = [
    { label: 'Total Deals', key: 'totalDeals', format: (v: number) => v.toString() },
    { label: 'Total GCI', key: 'totalCommission', format: formatCurrency },
    { label: 'Net Commission', key: 'netCommission', format: formatCurrency },
    { label: 'Avg Sale Price', key: 'avgSalePrice', format: formatCurrency },
    { label: 'Close Rate', key: 'closingRate', format: (v: number) => `${v.toFixed(1)}%` },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-emerald-400" />
            Agent Comparison
          </h1>
          <p className="text-gray-400 text-sm mt-1">Select 2-4 agents for comprehensive side-by-side analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">
            90 Days <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent selector */}
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-400 text-xs">👤</span>
            </div>
            <span className="text-white font-medium">Select Agents to Compare (2-4)</span>
          </div>
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search agents..."
              className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {filtered.map((agent, i) => {
              const isSelected = selected.has(agent.agentName);
              const color = COLORS[i % COLORS.length];
              return (
                <button
                  key={agent.agentName}
                  onClick={() => toggleAgent(agent.agentName)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isSelected ? 'bg-emerald-500/20 border border-emerald-500/40' : 'hover:bg-[#1a2332] border border-transparent'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: color + '33', color }}>
                    {getInitials(agent.agentName)}
                  </div>
                  <div className="text-left">
                    <div className="text-white text-sm font-medium">{agent.agentName}</div>
                    <div className="text-gray-400 text-xs">{agent.totalDeals} deals · {formatCurrency(agent.totalCommission)} GCI</div>
                  </div>
                  {isSelected && <div className="ml-auto w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                    <span className="text-white text-[10px]">✓</span>
                  </div>}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-500 text-sm">No agents found</div>
            )}
          </div>
        </div>

        {/* Comparison panel */}
        <div className="lg:col-span-2">
          {selectedAgents.length < 2 ? (
            <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-12 flex flex-col items-center justify-center h-full min-h-64">
              <div className="w-16 h-16 rounded-full bg-[#1a2332] flex items-center justify-center mb-4">
                <GitCompare className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-white font-medium mb-1">Select at least 2 agents</p>
              <p className="text-gray-400 text-sm">Pick agents above to see a detailed comparison</p>
            </div>
          ) : (
            <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#1e2d3d]">
                <h2 className="text-white font-semibold">Side-by-Side Comparison</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1e2d3d]">
                      <th className="px-4 py-3 text-left text-gray-400">Metric</th>
                      {selectedAgents.map((agent, i) => (
                        <th key={agent.agentName} className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: COLORS[i % COLORS.length] + '33', color: COLORS[i % COLORS.length] }}>
                              {getInitials(agent.agentName)}
                            </div>
                            <span className="text-white">{agent.agentName}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(metric => {
                      const values = selectedAgents.map(a => (a as any)[metric.key] ?? 0);
                      const maxVal = Math.max(...values);
                      return (
                        <tr key={metric.key} className="border-b border-[#1a2332] hover:bg-[#1a2332]/30">
                          <td className="px-4 py-3 text-gray-400">{metric.label}</td>
                          {selectedAgents.map((agent, i) => {
                            const val = (agent as any)[metric.key] ?? 0;
                            const isMax = val === maxVal && maxVal > 0;
                            return (
                              <td key={agent.agentName} className={`px-4 py-3 text-right font-medium ${isMax ? 'text-emerald-400' : 'text-gray-200'}`}>
                                {metric.format(val)}
                                {isMax && <span className="ml-1 text-[10px] text-emerald-500">▲</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
