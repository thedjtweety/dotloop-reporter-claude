/**
 * AgentsPage - Full Agent Leaderboard with Podium, Sortable Table, Bar Chart, and Drill-Down
 */
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Trophy, Download, FileText, Eye, Search, X, ChevronUp, ChevronDown, Users, ClipboardList,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { useCDAPanel } from '@/contexts/CDAContext';
import { AgentMetrics } from '@/lib/csvParser';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const AGENT_COLORS = [
  '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6',
];

type SortField = 'agentName'|'closedDeals'|'totalSalesVolume'|'totalCommission'|'averageSalesPrice'|'closingRate'|'companyDollar';
type SortDir = 'asc'|'desc';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[#1a2332] flex items-center justify-center mb-4">
        <Users className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-white text-lg font-semibold mb-2">No Agent Data</h3>
      <p className="text-gray-400 text-sm max-w-sm mb-6">
        Upload a CSV file from the Dashboard to see agent performance metrics, or try the demo mode.
      </p>
      <Button onClick={onDemo} className="bg-emerald-500 hover:bg-emerald-600 text-white">
        Load Demo Data
      </Button>
    </div>
  );
}

type EnrichedAgent = AgentMetrics & { color: string; initials: string };

function AgentDrillDown({ agent, onClose, records }: { agent: EnrichedAgent; onClose: () => void; records: any[] }) {
  const { openCDA } = useCDAPanel();
  const agentRecords = records.filter(r =>
    (r.agents || '').toLowerCase().includes(agent.agentName.toLowerCase())
  );
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d1117] border border-[#1e2d3d] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ background: agent.color + '33', color: agent.color }}>
              {agent.initials}
            </div>
            <div>
              <div className="text-white font-semibold">{agent.agentName}</div>
              <div className="text-gray-400 text-sm">{agentRecords.length} transactions</div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-4 gap-4 p-6 border-b border-[#1e2d3d]">
          {[
            { label: 'Closed Deals', value: String(agent.closedDeals), color: 'text-emerald-400' },
            { label: 'Total GCI', value: formatCurrency(agent.totalCommission), color: 'text-emerald-400' },
            { label: 'Sales Volume', value: formatCurrency(agent.totalSalesVolume), color: 'text-blue-400' },
            { label: 'Avg Price', value: formatCurrency(agent.averageSalesPrice), color: 'text-purple-400' },
          ].map(m => (
            <div key={m.label} className="bg-[#1a2332] rounded-lg p-3">
              <div className="text-gray-400 text-xs mb-1">{m.label}</div>
              <div className={`font-bold text-lg ${m.color}`}>{m.value}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2d3d] text-gray-400 text-xs">
                <th className="text-left pb-2">Loop Name</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-right pb-2">Price</th>
                <th className="text-right pb-2">Closing Date</th>
                <th className="text-right pb-2">Commission</th>
                <th className="text-right pb-2">CDA</th>
              </tr>
            </thead>
            <tbody>
              {agentRecords.slice(0, 50).map((r: any, i: number) => (
                <tr key={i} className="border-b border-[#1a2332] hover:bg-[#1a2332]/50">
                  <td className="py-2 text-gray-200 truncate max-w-[200px]">{r.loopName || r.address || '—'}</td>
                  <td className="py-2"><Badge variant="outline" className="text-[10px]">{r.loopStatus || '—'}</Badge></td>
                  <td className="py-2 text-right text-gray-300">{formatCurrency(r.salePrice || r.price || 0)}</td>
                  <td className="py-2 text-right text-gray-400">{r.closingDate || '—'}</td>
                  <td className="py-2 text-right text-emerald-400">{formatCurrency(r.commissionTotal || 0)}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => openCDA(r, r.address || r.loopName || 'Transaction')}
                      className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded hover:bg-blue-400/10"
                      title="Open CDA Builder"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { agentMetrics, filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const { openCDA, openCDAWithData } = useCDAPanel();
  const [sortField, setSortField] = useState<SortField>('totalCommission');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [search, setSearch] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [drillDown, setDrillDown] = useState<EnrichedAgent | null>(null);
  const [chartMetric, setChartMetric] = useState<'totalCommission'|'closedDeals'|'totalSalesVolume'>('totalCommission');

  const enriched: EnrichedAgent[] = useMemo(() =>
    agentMetrics.map((a, i) => ({
      ...a,
      color: AGENT_COLORS[i % AGENT_COLORS.length],
      initials: getInitials(a.agentName),
    })),
    [agentMetrics]
  );

  const filtered = useMemo(() => {
    if (!search) return enriched;
    return enriched.filter(a => a.agentName.toLowerCase().includes(search.toLowerCase()));
  }, [enriched, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = (a as any)[sortField];
      const bv = (b as any)[sortField];
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [filtered, sortField, sortDir]);

  const top3 = useMemo(() => [...enriched].sort((a, b) => b.totalCommission - a.totalCommission).slice(0, 3), [enriched]);
  const chartData = sorted.slice(0, 10).map(a => ({
    name: a.agentName.split(' ')[0],
    value: (a as any)[chartMetric] as number,
    color: a.color,
  }));

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (name: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-emerald-400" /> : <ChevronDown className="w-3 h-3 text-emerald-400" />;
  };

  if (!hasData) return <div className="p-6"><EmptyState onDemo={activateDemoMode} /></div>;

  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;
  const podiumLabels = ['#2', '#1', '#3'];
  const podiumBorders = ['border-[#1e2d3d]', 'border-yellow-500/40', 'border-orange-500/40'];
  const podiumLabelColors = ['text-gray-400', 'text-yellow-400', 'text-orange-400'];

  return (
    <div className="p-6 space-y-6 min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Leaderboard</h1>
          <p className="text-gray-400 text-sm mt-1">{agentMetrics.length} agents · {filteredRecords.length} transactions</p>
        </div>
        <Button variant="outline" size="sm" className="border-[#1e2d3d] text-gray-300 hover:text-white bg-transparent">
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Podium */}
      {top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {podiumOrder.map((agent, i) => (
            <div key={agent.agentName}
              className={`bg-[#0f1923] border ${podiumBorders[i]} rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-[#1a2332] transition-colors`}
              onClick={() => setDrillDown(agent)}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: agent.color + '33', color: agent.color }}>
                {agent.initials}
              </div>
              <div>
                <div className={`text-xs font-medium ${podiumLabelColors[i]}`}>{podiumLabels[i]}</div>
                <div className="text-white font-semibold">{agent.agentName}</div>
                <div className="text-emerald-400 font-bold">{formatCurrency(agent.totalCommission)}</div>
                <div className="text-gray-400 text-xs">{agent.closedDeals} deals · {formatCurrency(agent.averageSalesPrice)} avg</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-semibold">Performance Chart (Top 10)</h2>
          </div>
          <div className="flex gap-1">
            {([
              { key: 'totalCommission' as const, label: 'GCI' },
              { key: 'closedDeals' as const, label: 'Deals' },
              { key: 'totalSalesVolume' as const, label: 'Volume' },
            ]).map(m => (
              <button key={m.key} onClick={() => setChartMetric(m.key)}
                className={`px-3 py-1 rounded text-xs transition-colors ${chartMetric === m.key ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
            <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={v => chartMetric === 'closedDeals' ? String(v) : `$${(v/1000).toFixed(0)}k`} />
            <Tooltip contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }} labelStyle={{ color: '#fff' }}
              formatter={(v: number) => chartMetric === 'closedDeals' ? [v, 'Deals'] : [formatCurrency(v), chartMetric === 'totalCommission' ? 'GCI' : 'Volume']} />
            <Bar dataKey="value" radius={[4,4,0,0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2d3d]">
          <h2 className="text-white font-semibold">All Agents ({filtered.length})</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents..."
                className="bg-[#1a2332] border border-[#1e2d3d] rounded-md pl-8 pr-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 w-48" />
            </div>
            {selectedAgents.size > 0 && (
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded">{selectedAgents.size} selected</span>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1e2d3d] text-gray-400 text-xs bg-[#0a0f16]">
                <th className="w-8 px-4 py-3">
                  <input type="checkbox" onChange={e => setSelectedAgents(e.target.checked ? new Set(sorted.map(a => a.agentName)) : new Set())} className="rounded" />
                </th>
                <th className="px-3 py-3 text-left w-8">#</th>
                <th className="px-3 py-3 text-left cursor-pointer hover:text-white" onClick={() => handleSort('agentName')}>
                  <span className="flex items-center gap-1">Agent <SortIcon field="agentName" /></span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('closedDeals')}>
                  <span className="flex items-center justify-end gap-1">Deals <SortIcon field="closedDeals" /></span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('closingRate')}>
                  <span className="flex items-center justify-end gap-1">Close % <SortIcon field="closingRate" /></span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('averageSalesPrice')}>
                  <span className="flex items-center justify-end gap-1">Avg Price <SortIcon field="averageSalesPrice" /></span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalCommission')}>
                  <span className="flex items-center justify-end gap-1">Total GCI <SortIcon field="totalCommission" /></span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('companyDollar')}>
                  <span className="flex items-center justify-end gap-1">Co. Dollar <SortIcon field="companyDollar" /></span>
                </th>
                <th className="px-3 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('totalSalesVolume')}>
                  <span className="flex items-center justify-end gap-1">Volume <SortIcon field="totalSalesVolume" /></span>
                </th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, idx) => (
                <tr key={agent.agentName} className="border-b border-[#1a2332] hover:bg-[#1a2332]/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedAgents.has(agent.agentName)} onChange={() => toggleSelect(agent.agentName)} className="rounded" />
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs">{idx + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: agent.color + '33', color: agent.color }}>
                        {agent.initials}
                      </div>
                      <span className="text-white font-medium">{agent.agentName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-200">{agent.closedDeals}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${agent.closingRate >= 40 ? 'bg-emerald-500/20 text-emerald-400' : agent.closingRate >= 20 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                      {agent.closingRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-200">{formatCurrency(agent.averageSalesPrice)}</td>
                  <td className="px-3 py-3 text-right text-emerald-400 font-medium">{formatCurrency(agent.totalCommission)}</td>
                  <td className="px-3 py-3 text-right text-gray-200">{formatCurrency(agent.companyDollar)}</td>
                  <td className="px-3 py-3 text-right text-blue-400">{formatCurrency(agent.totalSalesVolume)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 text-gray-400">
                      <button onClick={() => setDrillDown(agent)} className="hover:text-white transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                      <button
                        className="hover:text-blue-400 transition-colors"
                        title="Open CDA Builder"
                        onClick={() => {
                          const agentRecords = filteredRecords.filter(r =>
                            (r.agents || '').toLowerCase().includes(agent.agentName.toLowerCase())
                          );
                          const closed = agentRecords.filter(r => r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
                          const record = (closed.length > 0 ? closed : agentRecords).sort((a, b) => new Date(b.closingDate || '').getTime() - new Date(a.closingDate || '').getTime())[0];
                          if (record) {
                            openCDA(record, `Agent: ${agent.agentName}`);
                          } else {
                            openCDAWithData({
                              propertyAddress: '',
                              salePrice: agent.averageSalesPrice,
                              sellerName: '',
                              totalCommissionRate: 3,
                              totalGrossCommission: agent.averageSalesPrice * 0.03,
                              sellingSplitPercent: 50,
                              listingSplitPercent: 50,
                              sellingGrossCommission: agent.averageSalesPrice * 0.015,
                              listingGrossCommission: agent.averageSalesPrice * 0.015,
                              sellingAgent1Name: agent.agentName,
                              sellingAgent1SplitPercent: 80,
                              sellingAgent1Commission: agent.averageSalesPrice * 0.015 * 0.8,
                              sellingBrokerSplitPercent: 20,
                              sellingBrokerageCommission: agent.averageSalesPrice * 0.015 * 0.2,
                              sellingCommissionAfterFees: agent.averageSalesPrice * 0.015 * 0.8,
                              listingAgent1Name: agent.agentName,
                              listingAgent1SplitPercent: 80,
                              listingAgent1Commission: agent.averageSalesPrice * 0.015 * 0.8,
                              listingBrokerSplitPercent: 20,
                              listingBrokerageCommission: agent.averageSalesPrice * 0.015 * 0.2,
                              listingCommissionAfterFees: agent.averageSalesPrice * 0.015 * 0.8,
                            }, `Agent: ${agent.agentName}`);
                          }
                        }}
                      >
                        <ClipboardList className="w-4 h-4" />
                      </button>
                      <button className="hover:text-white transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && <div className="text-center py-12 text-gray-500">No agents match your search.</div>}
      </div>

      {drillDown && <AgentDrillDown agent={drillDown} onClose={() => setDrillDown(null)} records={filteredRecords} />}
    </div>
  );
}
