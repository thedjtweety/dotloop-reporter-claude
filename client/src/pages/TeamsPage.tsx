import { useState } from 'react';
import { UsersRound, Plus, Search, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';

interface Team {
  id: string;
  name: string;
  members: number;
  volume: number;
  gci: number;
  deals: number;
}

const DEMO_TEAMS: Team[] = [];

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>(DEMO_TEAMS);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'manage' | 'comparison'>('leaderboard');
  const [period, setPeriod] = useState('90d');
  const [sortMetric, setSortMetric] = useState('GCI');
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');

  const totalTeams = teams.length;
  const totalVolume = teams.reduce((s, t) => s + t.volume, 0);
  const totalGCI = teams.reduce((s, t) => s + t.gci, 0);
  const totalDeals = teams.reduce((s, t) => s + t.deals, 0);

  const filtered = teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleCreateTeam = () => {
    if (!newTeamName.trim()) return;
    setTeams(prev => [...prev, {
      id: Date.now().toString(),
      name: newTeamName.trim(),
      members: 0,
      volume: 0,
      gci: 0,
      deals: 0,
    }]);
    setNewTeamName('');
    setShowNewTeam(false);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UsersRound className="w-6 h-6 text-emerald-400" />
            Teams & Offices
          </h1>
          <p className="text-gray-400 text-sm mt-1">Manage teams and analyze group performance</p>
        </div>
        <div className="flex items-center gap-2">
          {(['30d', '60d', '90d', 'YTD', '1Y'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                period === p ? 'bg-emerald-500 text-white' : 'border border-[#1e2d3d] text-gray-400 hover:bg-[#1a2332]'
              }`}
            >{p}</button>
          ))}
          <button
            onClick={() => setShowNewTeam(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Team
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Teams', value: totalTeams.toString(), sub: `${teams.reduce((s, t) => s + t.members, 0)} members`, icon: '👥', color: 'text-blue-400' },
          { label: 'Total Volume', value: formatCurrency(totalVolume), sub: '', icon: '$', color: 'text-emerald-400' },
          { label: 'Total GCI', value: formatCurrency(totalGCI), sub: '', icon: '↗', color: 'text-purple-400' },
          { label: 'Total Deals', value: totalDeals.toString(), sub: '', icon: '◎', color: 'text-orange-400' },
        ].map(card => (
          <div key={card.label} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-lg ${card.color}`}>{card.icon}</span>
              <span className="text-gray-400 text-sm">{card.label}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            {card.sub && <div className="text-gray-500 text-xs mt-1">{card.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#1e2d3d]">
        {(['leaderboard', 'manage', 'comparison'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >{tab === 'manage' ? 'Manage Teams' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={sortMetric}
          onChange={e => setSortMetric(e.target.value)}
          className="bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
        >
          <option>GCI</option>
          <option>Volume</option>
          <option>Deals</option>
        </select>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-16 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-[#1a2332] flex items-center justify-center mb-4">
            <UsersRound className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-white font-medium mb-1">No teams yet</p>
          <p className="text-gray-400 text-sm mb-4">Create teams to start tracking group performance</p>
          <button
            onClick={() => setShowNewTeam(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(team => (
            <div key={team.id} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4 hover:border-emerald-500/40 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{team.name}</h3>
                <span className="text-gray-400 text-xs">{team.members} members</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-gray-400 text-xs">Volume</div>
                  <div className="text-emerald-400 font-medium text-sm">{formatCurrency(team.volume)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">GCI</div>
                  <div className="text-blue-400 font-medium text-sm">{formatCurrency(team.gci)}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs">Deals</div>
                  <div className="text-white font-medium text-sm">{team.deals}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Team Modal */}
      {showNewTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-6 w-full max-w-md">
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
              <button onClick={() => setShowNewTeam(false)} className="px-4 py-2 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">Cancel</button>
              <button onClick={handleCreateTeam} className="px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
