import { useState } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { Search, Download, Printer, GitCompare, Eye, FileText, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';

interface AgentRow {
  name: string;
  initials: string;
  color: string;
  plan: string;
  deals: number;
  closeRate: number;
  avgPrice: number;
  totalGCI: number;
  companyDollar: number;
  netCommission: number;
  buyPct: number;
  capped: boolean;
}

const COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#14b8a6','#a3e635'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function AgentsPage() {
  const ctx = useTransactionData();
  const agentMetrics = ctx.agentMetrics || [];
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string>('totalGCI');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());

  const agents: AgentRow[] = agentMetrics.map((a, i) => ({
    name: a.agentName,
    initials: getInitials(a.agentName),
    color: COLORS[i % COLORS.length],
    plan: a.planName || 'Standard',
    deals: a.totalDeals,
    closeRate: a.closingRate,
    avgPrice: a.avgSalePrice,
    totalGCI: a.totalCommission,
    companyDollar: a.totalCommission * 0.25,
    netCommission: a.netCommission ?? a.totalCommission * 0.75,
    buyPct: 0,
    capped: (a.netCommission ?? 0) > 0,
  }));

  const filtered = agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    const av = (a as any)[sortField] ?? 0;
    const bv = (b as any)[sortField] ?? 0;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const top3 = [...agents].sort((a, b) => b.totalGCI - a.totalGCI).slice(0, 3);
  const [first, second, third] = [top3[1], top3[0], top3[2]];

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-emerald-400" /> : <ChevronUp className="w-3 h-3 text-emerald-400" />;
  };

  const toggleSelect = (name: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const totalAgents = agents.length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-emerald-400" />
            Agent Leaderboard
          </h1>
          <p className="text-gray-400 text-sm mt-1">{totalAgents} agents · Ranked by total GCI</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332] transition-colors">
            <FileText className="w-4 h-4" /> Saved Views
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332] transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332] transition-colors">
            <Printer className="w-4 h-4" /> Print Dashboard
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332] transition-colors">
            <GitCompare className="w-4 h-4" /> Compare
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332] transition-colors">
            90 Days <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* #2 */}
          <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: second?.color + '33', color: second?.color }}>
              {second?.initials}
            </div>
            <div>
              <div className="text-gray-400 text-xs">#2</div>
              <div className="text-white font-semibold">{second?.name}</div>
              <div className="text-emerald-400 font-bold">{formatCurrency(second?.totalGCI ?? 0)}</div>
              <div className="text-gray-400 text-xs">{second?.deals} deals · {formatCurrency(second?.avgPrice ?? 0)} avg</div>
            </div>
          </div>
          {/* #1 */}
          <div className="bg-[#0f1923] border border-yellow-500/40 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: first?.color + '33', color: first?.color }}>
              {first?.initials}
            </div>
            <div>
              <div className="text-yellow-400 text-xs">#1</div>
              <div className="text-white font-semibold">{first?.name}</div>
              <div className="text-emerald-400 font-bold">{formatCurrency(first?.totalGCI ?? 0)}</div>
              <div className="text-gray-400 text-xs">{first?.deals} deals · {formatCurrency(first?.avgPrice ?? 0)} avg</div>
            </div>
          </div>
          {/* #3 */}
          <div className="bg-[#0f1923] border border-orange-500/40 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: third?.color + '33', color: third?.color }}>
              {third?.initials}
            </div>
            <div>
              <div className="text-orange-400 text-xs">#3</div>
              <div className="text-white font-semibold">{third?.name}</div>
              <div className="text-emerald-400 font-bold">{formatCurrency(third?.totalGCI ?? 0)}</div>
              <div className="text-gray-400 text-xs">{third?.deals} deals · {formatCurrency(third?.avgPrice ?? 0)} avg</div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl overflow-hidden">
        {/* Table header controls */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d3d]">
          <span className="text-gray-300 text-sm">Showing {filtered.length} of {totalAgents} agents</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search agents..."
                className="bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-48"
              />
            </div>
            <select className="bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none">
              <option>All Agents</option>
            </select>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No agent data available. Upload a CSV file to see agents.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2d3d] text-gray-400">
                  <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded" /></th>
                  <th className="px-3 py-3 text-left w-8">#</th>
                  <th className="px-3 py-3 text-left">Agent Name</th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('deals')}>
                    <span className="flex items-center justify-end gap-1">Deals <SortIcon field="deals" /></span>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('closeRate')}>
                    <span className="flex items-center justify-end gap-1">Close Rate <SortIcon field="closeRate" /></span>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('avgPrice')}>
                    <span className="flex items-center justify-end gap-1">Avg Price <SortIcon field="avgPrice" /></span>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalGCI')}>
                    <span className="flex items-center justify-end gap-1">Total GCI <SortIcon field="totalGCI" /></span>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('companyDollar')}>
                    <span className="flex items-center justify-end gap-1">Company Dollar <SortIcon field="companyDollar" /></span>
                  </th>
                  <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('netCommission')}>
                    <span className="flex items-center justify-end gap-1">Net Commission <SortIcon field="netCommission" /></span>
                  </th>
                  <th className="px-3 py-3 text-right">Buy %</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((agent, idx) => (
                  <tr key={agent.name} className="border-b border-[#1a2332] hover:bg-[#1a2332]/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedAgents.has(agent.name)}
                        onChange={() => toggleSelect(agent.name)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-3 py-3 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: agent.color + '33', color: agent.color }}>
                          {agent.initials}
                        </div>
                        <div>
                          <div className="text-white font-medium">{agent.name}</div>
                          <div className="text-gray-500 text-xs flex items-center gap-1">
                            <span className="text-yellow-400">$</span> {agent.plan}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-200">{agent.deals}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        agent.closeRate >= 40 ? 'bg-emerald-500/20 text-emerald-400' :
                        agent.closeRate >= 20 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {agent.closeRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-200">{formatCurrency(agent.avgPrice)}</td>
                    <td className="px-3 py-3 text-right text-emerald-400 font-medium">{formatCurrency(agent.totalGCI)}</td>
                    <td className="px-3 py-3 text-right text-gray-200">{formatCurrency(agent.companyDollar)}</td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-blue-400 font-medium">{formatCurrency(agent.netCommission)}</span>
                      {agent.capped && (
                        <span className="ml-1 px-1 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] rounded">CAP</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-400">0%</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 text-gray-400">
                        <button className="hover:text-white transition-colors" title="Report"><FileText className="w-4 h-4" /></button>
                        <button className="hover:text-white transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                        <button className="hover:text-white transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Fix missing import
function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
