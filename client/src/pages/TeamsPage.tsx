/**
 * TeamsPage - Team performance breakdown with real data from context
 */
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { Users, TrendingUp, DollarSign, Home, ChevronDown, ChevronUp, Plus, Search } from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';

const TEAM_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1a2332] flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-white text-lg font-semibold mb-2">No Team Data</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        Upload a CSV file from the Dashboard to see team performance, or try the demo mode.
      </p>
      <Button onClick={onDemo} className="bg-emerald-500 hover:bg-emerald-600 text-white">
        Load Demo Data
      </Button>
    </div>
  );
}

interface TeamData {
  name: string;
  agentNames: string[];
  totalGCI: number;
  totalVolume: number;
  closedDeals: number;
  avgPrice: number;
  color: string;
}

export default function TeamsPage() {
  const { agentMetrics, filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'totalGCI' | 'closedDeals' | 'totalVolume'>('totalGCI');
  const [search, setSearch] = useState('');
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [customTeams, setCustomTeams] = useState<TeamData[]>([]);

  // Auto-group agents into teams by first letter of last name (demo grouping)
  const autoTeams: TeamData[] = useMemo(() => {
    if (agentMetrics.length === 0) return [];
    const groups: Record<string, string[]> = {};
    agentMetrics.forEach(a => {
      const parts = a.agentName.split(' ');
      const key = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() : a.agentName[0]?.toUpperCase();
      const groupKey = `Team ${key || 'Other'}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(a.agentName);
    });
    return Object.entries(groups).slice(0, 6).map(([name, agentNames], i) => {
      const teamAgents = agentMetrics.filter(a => agentNames.includes(a.agentName));
      return {
        name,
        agentNames,
        totalGCI: teamAgents.reduce((s, a) => s + a.totalCommission, 0),
        totalVolume: teamAgents.reduce((s, a) => s + a.totalSalesVolume, 0),
        closedDeals: teamAgents.reduce((s, a) => s + a.closedDeals, 0),
        avgPrice: teamAgents.length > 0
          ? teamAgents.reduce((s, a) => s + a.averageSalesPrice, 0) / teamAgents.length
          : 0,
        color: TEAM_COLORS[i % TEAM_COLORS.length],
      };
    });
  }, [agentMetrics]);

  const allTeams = [...autoTeams, ...customTeams];

  const sorted = useMemo(() =>
    [...allTeams]
      .filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b[sortBy] - a[sortBy]),
    [allTeams, sortBy, search]
  );

  const totalGCI = allTeams.reduce((s, t) => s + t.totalGCI, 0);
  const totalDeals = allTeams.reduce((s, t) => s + t.closedDeals, 0);
  const totalVolume = allTeams.reduce((s, t) => s + t.totalVolume, 0);

  const pieData = sorted.map(t => ({ name: t.name, value: t.totalGCI, color: t.color }));

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    setCustomTeams(prev => [...prev, {
      name: newTeamName.trim(),
      agentNames: [],
      totalGCI: 0,
      totalVolume: 0,
      closedDeals: 0,
      avgPrice: 0,
      color: TEAM_COLORS[prev.length % TEAM_COLORS.length],
    }]);
    setNewTeamName('');
    setShowNewTeam(false);
  };

  if (!hasData) return <div className="p-6"><EmptyState onDemo={activateDemoMode} /></div>;

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Teams & Offices</h1>
          <p className="text-gray-400 text-sm mt-1">
            {allTeams.length} teams · {filteredRecords.length} total transactions
          </p>
        </div>
        <Button
          onClick={() => setShowNewTeam(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Team
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total GCI', value: formatCurrency(totalGCI), icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Closed Deals', value: String(totalDeals), icon: Home, color: 'text-blue-400' },
          { label: 'Sales Volume', value: formatCurrency(totalVolume), icon: TrendingUp, color: 'text-purple-400' },
        ].map(m => (
          <div key={m.label} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`w-4 h-4 ${m.color}`} />
              <span className="text-gray-400 text-sm">{m.label}</span>
            </div>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Performance by Team</h2>
            <div className="flex gap-1">
              {(['totalGCI', 'closedDeals', 'totalVolume'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    sortBy === k ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {k === 'totalGCI' ? 'GCI' : k === 'closedDeals' ? 'Deals' : 'Volume'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sorted} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => sortBy === 'closedDeals' ? String(v) : `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }}
                formatter={(v: number) => sortBy === 'closedDeals' ? [v, 'Deals'] : [formatCurrency(v), '']}
              />
              <Bar dataKey={sortBy} radius={[4, 4, 0, 0]}>
                {sorted.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">GCI Distribution</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }}
                formatter={(v: number) => [formatCurrency(v), 'GCI']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams..."
          className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Team Cards */}
      <div className="space-y-3">
        {sorted.map(team => {
          const isExpanded = expandedTeam === team.name;
          const teamAgentMetrics = agentMetrics.filter(a => team.agentNames.includes(a.agentName));
          const share = totalGCI > 0 ? (team.totalGCI / totalGCI) * 100 : 0;

          return (
            <div key={team.name} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-[#1a2332]/50 transition-colors"
                onClick={() => setExpandedTeam(isExpanded ? null : team.name)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: team.color }} />
                  <div>
                    <div className="text-white font-semibold">{team.name}</div>
                    <div className="text-gray-400 text-xs">{team.agentNames.length} agents</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold">{formatCurrency(team.totalGCI)}</div>
                    <div className="text-gray-500 text-xs">{share.toFixed(1)}% of total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{team.closedDeals}</div>
                    <div className="text-gray-500 text-xs">deals</div>
                  </div>
                  <div className="text-right">
                    <div className="text-blue-400 font-medium">{formatCurrency(team.totalVolume)}</div>
                    <div className="text-gray-500 text-xs">volume</div>
                  </div>
                  <div className="w-24 bg-[#1a2332] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full" style={{ width: `${share}%`, background: team.color }} />
                  </div>
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[#1e2d3d] px-6 py-4">
                  {teamAgentMetrics.length === 0 ? (
                    <p className="text-gray-500 text-sm">No agents assigned to this team yet.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400 text-xs border-b border-[#1e2d3d]">
                          <th className="text-left pb-2">Agent</th>
                          <th className="text-right pb-2">Deals</th>
                          <th className="text-right pb-2">GCI</th>
                          <th className="text-right pb-2">Volume</th>
                          <th className="text-right pb-2">Avg Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamAgentMetrics.map(a => (
                          <tr key={a.agentName} className="border-b border-[#1a2332] hover:bg-[#1a2332]/30">
                            <td className="py-2 text-gray-200">{a.agentName}</td>
                            <td className="py-2 text-right text-gray-300">{a.closedDeals}</td>
                            <td className="py-2 text-right text-emerald-400">{formatCurrency(a.totalCommission)}</td>
                            <td className="py-2 text-right text-blue-400">{formatCurrency(a.totalSalesVolume)}</td>
                            <td className="py-2 text-right text-gray-300">{formatCurrency(a.averageSalesPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Team Modal */}
      {showNewTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewTeam(false)}>
          <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-semibold text-lg mb-4">Create New Team</h2>
            <input
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              placeholder="Team name..."
              className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 mb-4"
              onKeyDown={e => e.key === 'Enter' && handleCreateTeam()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNewTeam(false)} className="px-4 py-2 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">
                Cancel
              </button>
              <button onClick={handleCreateTeam} className="px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
