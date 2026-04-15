import { useState, useMemo } from 'react';
import { Trophy, Plus, Calendar, Users, Target, Medal, Award, X } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Button } from '@/components/ui/button';

interface Contest {
  id: string;
  name: string;
  type: 'deals' | 'volume' | 'gci';
  status: 'active' | 'upcoming' | 'completed';
  startDate: string;
  endDate: string;
  prize: string;
  participants: number;
  description: string;
}

const SEED_CONTESTS: Contest[] = [
  { id: '1', name: 'Q2 Closer Challenge', type: 'deals', status: 'active', startDate: '2026-04-01', endDate: '2026-06-30', prize: '$2,500 Cash Bonus', participants: 0, description: 'Most closed deals in Q2 wins.' },
  { id: '2', name: 'Spring Volume Sprint', type: 'volume', status: 'active', startDate: '2026-03-01', endDate: '2026-05-31', prize: 'Luxury Weekend Getaway', participants: 0, description: 'Highest total sales volume in spring.' },
  { id: '3', name: 'GCI Grand Prix', type: 'gci', status: 'upcoming', startDate: '2026-07-01', endDate: '2026-09-30', prize: '$5,000 + Trophy', participants: 0, description: 'Top GCI earner in Q3 takes home the grand prize.' },
  { id: '4', name: 'New Year Kickoff', type: 'deals', status: 'completed', startDate: '2026-01-01', endDate: '2026-03-31', prize: '$1,500 Gift Card', participants: 0, description: 'Q1 deals competition.' },
];

const MEDAL_COLORS = ['#f59e0b', '#9ca3af', '#cd7f32'];

export default function ContestsPage() {
  const { agentMetrics, hasData, activateDemoMode } = useTransactionData();
  const [contests, setContests] = useState<Contest[]>(SEED_CONTESTS);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'upcoming' | 'completed' | 'create'>('active');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'deals' as Contest['type'],
    startDate: '',
    endDate: '',
    prize: '',
    description: '',
  });

  const activeContests = contests.filter(c => c.status === 'active');
  const upcomingContests = contests.filter(c => c.status === 'upcoming');
  const completedContests = contests.filter(c => c.status === 'completed');

  const getLeaderboard = (contest: Contest) => {
    return [...agentMetrics]
      .sort((a, b) =>
        contest.type === 'deals' ? b.closedDeals - a.closedDeals :
        contest.type === 'volume' ? b.totalSalesVolume - a.totalSalesVolume :
        b.totalCommission - a.totalCommission
      )
      .slice(0, 10);
  };

  const getLeaderValue = (a: any, type: Contest['type']) => {
    if (type === 'deals') return { label: `${a.closedDeals} deals`, raw: a.closedDeals };
    if (type === 'volume') return { label: formatCurrency(a.totalSalesVolume), raw: a.totalSalesVolume };
    return { label: formatCurrency(a.totalCommission), raw: a.totalCommission };
  };

  const handleCreate = () => {
    if (!form.name.trim()) return;
    const now = new Date();
    const start = form.startDate ? new Date(form.startDate) : now;
    const status: Contest['status'] = start > now ? 'upcoming' : 'active';
    setContests(prev => [...prev, {
      id: Date.now().toString(),
      name: form.name,
      type: form.type,
      status,
      startDate: form.startDate || now.toISOString().split('T')[0],
      endDate: form.endDate,
      prize: form.prize,
      participants: 0,
      description: form.description,
    }]);
    setForm({ name: '', type: 'deals', startDate: '', endDate: '', prize: '', description: '' });
    setShowCreate(false);
    setActiveTab('active');
  };

  const statusColor = (s: Contest['status']) =>
    s === 'active' ? 'text-emerald-400 bg-emerald-500/20' :
    s === 'upcoming' ? 'text-blue-400 bg-blue-500/20' :
    'text-gray-400 bg-gray-500/20';

  const typeIcon = (t: Contest['type']) =>
    t === 'deals' ? '#' : t === 'volume' ? '$' : '%';

  const displayContests = activeTab === 'active' ? activeContests :
    activeTab === 'upcoming' ? upcomingContests : completedContests;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Contests & Challenges
          </h1>
          <p className="text-gray-400 text-sm mt-1">Motivate agents with performance contests</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600 transition-colors"
        >
          <Plus className="w-4 h-4" /> Create Contest
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Active Contests', value: activeContests.length, color: 'text-emerald-400', icon: Trophy },
          { label: 'Upcoming', value: upcomingContests.length, color: 'text-blue-400', icon: Calendar },
          { label: 'Completed', value: completedContests.length, color: 'text-gray-400', icon: Target },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${card.color}`} />
                <span className="text-gray-400 text-sm">{card.label}</span>
              </div>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#1e2d3d]">
        {([
          { key: 'active', label: `Active (${activeContests.length})` },
          { key: 'upcoming', label: `Upcoming (${upcomingContests.length})` },
          { key: 'completed', label: `Completed (${completedContests.length})` },
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

      {/* Contest list */}
      {displayContests.length === 0 ? (
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-16 flex flex-col items-center justify-center">
          <Trophy className="w-12 h-12 text-gray-500 mb-4 opacity-30" />
          <p className="text-white font-medium mb-1">No {activeTab} contests</p>
          <p className="text-gray-400 text-sm mb-4">
            {activeTab === 'active' ? 'Create a contest to motivate your agents' : `No ${activeTab} contests found`}
          </p>
          {activeTab === 'active' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600"
            >
              <Plus className="w-4 h-4" /> Create Contest
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayContests.map(contest => (
            <div key={contest.id} className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-5 hover:border-yellow-500/30 transition-colors cursor-pointer" onClick={() => setSelectedContest(contest)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{contest.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(contest.status)}`}>
                      {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
                    </span>
                    <span className="text-gray-400 text-xs capitalize">{contest.type}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <span className="text-yellow-400 font-bold">{typeIcon(contest.type)}</span>
                </div>
              </div>
              {contest.description && (
                <p className="text-gray-400 text-sm mb-3">{contest.description}</p>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Prize</span>
                  <span className="text-yellow-400 font-medium">{contest.prize || 'TBD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Participants</span>
                  <span className="text-gray-200">{contest.participants}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Period</span>
                  <span className="text-gray-200 text-xs">{contest.startDate} → {contest.endDate || 'Ongoing'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contest Detail Modal */}
      {selectedContest && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedContest(null)}>
          <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d]">
              <div>
                <h2 className="text-white font-semibold text-lg">{selectedContest.name}</h2>
                <p className="text-gray-400 text-sm">{selectedContest.startDate} → {selectedContest.endDate}</p>
              </div>
              <button onClick={() => setSelectedContest(null)} className="text-gray-400 hover:text-gray-200"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a2332] rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Metric</div>
                  <div className="text-white font-medium capitalize">{selectedContest.type}</div>
                </div>
                <div className="bg-[#1a2332] rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Prize</div>
                  <div className="text-yellow-400 font-medium">{selectedContest.prize}</div>
                </div>
                <div className="bg-[#1a2332] rounded-lg p-3">
                  <div className="text-gray-400 text-xs mb-1">Participants</div>
                  <div className="text-white font-medium">{agentMetrics.length}</div>
                </div>
              </div>
              {hasData && agentMetrics.length > 0 ? (
                <div>
                  <h3 className="text-white font-semibold mb-3">Leaderboard</h3>
                  <div className="space-y-2">
                    {getLeaderboard(selectedContest).map((agent, i) => {
                      const { label, raw } = getLeaderValue(agent, selectedContest.type);
                      const maxRaw = getLeaderValue(getLeaderboard(selectedContest)[0], selectedContest.type).raw;
                      const pct = maxRaw > 0 ? (raw / maxRaw) * 100 : 0;
                      return (
                        <div key={agent.agentName} className="flex items-center gap-3">
                          <div className="w-6 text-center">
                            {i < 3 ? (
                              <span style={{ color: MEDAL_COLORS[i] }} className="text-sm font-bold">#{i+1}</span>
                            ) : (
                              <span className="text-gray-500 text-xs">#{i+1}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-gray-200 text-sm">{agent.agentName}</span>
                              <span className="text-gray-300 text-xs font-medium">{label}</span>
                            </div>
                            <div className="h-1.5 bg-[#1a2332] rounded-full">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : '#10b981' }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>Upload CSV data or load demo data to see the leaderboard</p>
                  <button onClick={() => { activateDemoMode(); setSelectedContest(null); }} className="mt-2 text-emerald-400 hover:text-emerald-300 text-sm">Load demo data →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-white font-semibold text-lg mb-4">Create Contest</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Contest Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Q2 Deals Challenge"
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as Contest['type'] }))}
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                >
                  <option value="deals">Most Deals</option>
                  <option value="volume">Highest Volume</option>
                  <option value="gci">Highest GCI</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">End Date</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Prize</label>
                <input
                  value={form.prize}
                  onChange={e => setForm(f => ({ ...f, prize: e.target.value }))}
                  placeholder="e.g. $500 bonus, gift card..."
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Contest rules and details..."
                  rows={2}
                  className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md border border-[#1e2d3d] text-gray-300 text-sm hover:bg-[#1a2332]">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 rounded-md bg-emerald-500 text-white text-sm hover:bg-emerald-600">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
