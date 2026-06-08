/**
 * ComparePage - Side-by-side agent comparison with bar charts and radar chart
 */
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { GitCompare, Plus, X, Users } from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { formatCurrency } from '@/lib/formatUtils';
import { Button } from '@/components/ui/button';
import { TxDrillModal, DrillTarget } from '@/components/TxDrillModal';

const COMPARE_COLORS = ['#10b981', '#3b82f6', '#f59e0b'];

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function EmptyState({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
        <GitCompare className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-white text-lg font-semibold mb-2">No Data to Compare</h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Upload a CSV file from the Dashboard to compare agent performance, or try the demo mode.
      </p>
      <Button onClick={onDemo} className="bg-emerald-500 hover:bg-emerald-600 text-white">
        Load Demo Data
      </Button>
    </div>
  );
}

export default function ComparePage() {
  const { agentMetrics, filteredRecords, hasData, activateDemoMode } = useTransactionData();
  const [selected, setSelected] = useState<string[]>([]);
  const [drillTarget, setDrillTarget] = useState<DrillTarget | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const agentNames = useMemo(() => agentMetrics.map(a => a.agentName), [agentMetrics]);

  const filteredNames = useMemo(() =>
    agentNames.filter(n =>
      !selected.includes(n) &&
      n.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [agentNames, selected, searchTerm]
  );

  const selectedAgents = useMemo(() =>
    selected
      .map((name, i) => {
        const metrics = agentMetrics.find(a => a.agentName === name);
        return { name, metrics, color: COMPARE_COLORS[i % COMPARE_COLORS.length], initials: getInitials(name) };
      })
      .filter(a => a.metrics != null),
    [selected, agentMetrics]
  );

  const addAgent = (name: string) => {
    if (selected.length < 3) {
      setSelected(prev => [...prev, name]);
      setShowDropdown(false);
      setSearchTerm('');
    }
  };

  const removeAgent = (name: string) => setSelected(prev => prev.filter(n => n !== name));

  if (!hasData) return <div className="p-6"><EmptyState onDemo={activateDemoMode} /></div>;

  const comparisonMetrics = [
    { key: 'totalCommission', label: 'Total GCI', format: formatCurrency },
    { key: 'closedDeals', label: 'Closed Deals', format: (v: number) => String(v) },
    { key: 'averageSalesPrice', label: 'Avg Sale Price', format: formatCurrency },
    { key: 'totalSalesVolume', label: 'Sales Volume', format: formatCurrency },
    { key: 'closingRate', label: 'Close Rate', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'companyDollar', label: 'Company Dollar', format: formatCurrency },
  ];

  // Radar chart normalization
  const radarKeys = ['closedDeals', 'totalCommission', 'averageSalesPrice', 'closingRate', 'totalSalesVolume'];
  const radarLabels: Record<string, string> = {
    closedDeals: 'Deals', totalCommission: 'GCI', averageSalesPrice: 'Avg Price',
    closingRate: 'Close %', totalSalesVolume: 'Volume',
  };
  const maxValues: Record<string, number> = {};
  radarKeys.forEach(k => {
    maxValues[k] = Math.max(...agentMetrics.map(a => (a as any)[k] ?? 0), 1);
  });
  const radarData = radarKeys.map(k => {
    const entry: any = { subject: radarLabels[k] };
    selectedAgents.forEach(a => {
      entry[a.name] = Math.round(((a.metrics as any)[k] / maxValues[k]) * 100);
    });
    return entry;
  });

  const barCharts = [
    {
      key: 'totalCommission', label: 'GCI Comparison',
      fmt: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      tooltip: formatCurrency,
    },
    {
      key: 'closedDeals', label: 'Closed Deals',
      fmt: (v: number) => String(v),
      tooltip: (v: number) => String(v),
    },
    {
      key: 'averageSalesPrice', label: 'Average Sale Price',
      fmt: (v: number) => `$${(v / 1000).toFixed(0)}k`,
      tooltip: formatCurrency,
    },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen bg-background text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Comparison</h1>
          <p className="text-muted-foreground text-sm mt-1">Compare up to 3 agents side by side</p>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="bg-secondary border border-border rounded-xl p-6">
        <h2 className="text-white font-semibold mb-4">Select Agents to Compare</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {selectedAgents.map(a => (
            <div
              key={a.name}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ borderColor: a.color + '66', background: a.color + '11' }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: a.color + '33', color: a.color }}
              >
                {a.initials}
              </div>
              <span className="text-white text-sm font-medium">{a.name}</span>
              <button onClick={() => removeAgent(a.name)} className="text-muted-foreground hover:text-red-400 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {selected.length < 3 && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border text-muted-foreground hover:border-emerald-500/50 hover:text-emerald-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Agent</span>
              </button>
              {showDropdown && (
                <div className="absolute left-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-2xl w-64">
                  <div className="p-2 border-b border-border">
                    <input
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Search agents..."
                      className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredNames.length === 0 && (
                      <div className="px-3 py-3 text-muted-foreground text-sm">No agents found</div>
                    )}
                    {filteredNames.map(name => (
                      <button
                        key={name}
                        onClick={() => addAgent(name)}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary hover:text-white transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400">
                          {getInitials(name)}
                        </div>
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selected.length === 0 && (
            <p className="text-muted-foreground text-sm">Select at least 2 agents to compare</p>
          )}
        </div>
      </div>

      {selectedAgents.length >= 2 && (
        <>
          {/* Summary Cards */}
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${selectedAgents.length}, 1fr)` }}
          >
            {selectedAgents.map(a => (
              <div
                key={a.name}
                className="bg-secondary border rounded-xl p-5 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ borderColor: a.color + '44' }}
                onClick={() => setDrillTarget({ title: `${a.name} — Transactions`, records: filteredRecords.filter(r => (r.agents || '').includes(a.name)) })}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    style={{ background: a.color + '33', color: a.color }}
                  >
                    {a.initials}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{a.name}</div>
                    <div className="text-xs" style={{ color: a.color }}>
                      {a.metrics!.closedDeals} closed deals
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {comparisonMetrics.map(m => (
                    <div key={m.key} className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">{m.label}</span>
                      <span className="text-white text-sm font-medium">
                        {m.format((a.metrics as any)[m.key] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bar Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {barCharts.map(chart => {
              const chartData = [{
                name: chart.label,
                ...Object.fromEntries(
                  selectedAgents.map(a => [a.name, (a.metrics as any)[chart.key] ?? 0])
                ),
              }];
              return (
                <div key={chart.key} className="bg-secondary border border-border rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-4">{chart.label}</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e2d3d" />
                      <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={chart.fmt}
                      />
                      <Tooltip
                        contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }}
                        formatter={(v: number) => [chart.tooltip(v), '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                      {selectedAgents.map(a => (
                        <Bar key={a.name} dataKey={a.name} fill={a.color} radius={[4, 4, 0, 0]} cursor="pointer"
                          onClick={() => setDrillTarget({ title: `${a.name} — Transactions`, records: filteredRecords.filter(r => (r.agents || '').includes(a.name)) })} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}

            {/* Radar Chart */}
            <div className="bg-secondary border border-border rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Overall Performance (Normalized)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e2d3d" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 9 }} />
                  {selectedAgents.map(a => (
                    <Radar
                      key={a.name}
                      name={a.name}
                      dataKey={a.name}
                      stroke={a.color}
                      fill={a.color}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                  <Tooltip
                    contentStyle={{ background: '#0d1117', border: '1px solid #1e2d3d', borderRadius: 8 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-white font-semibold">Detailed Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs bg-secondary">
                    <th className="px-4 py-3 text-left">Metric</th>
                    {selectedAgents.map(a => (
                      <th key={a.name} className="px-4 py-3 text-right" style={{ color: a.color }}>
                        {a.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonMetrics.map(m => {
                    const values = selectedAgents.map(a => (a.metrics as any)[m.key] ?? 0);
                    const maxVal = Math.max(...values);
                    return (
                      <tr key={m.key} className="border-b border-border hover:bg-secondary/30">
                        <td className="px-4 py-3 text-foreground">{m.label}</td>
                        {selectedAgents.map((a, i) => {
                          const val = values[i];
                          const isMax = val === maxVal && maxVal > 0;
                          return (
                            <td key={a.name} className="px-4 py-3 text-right">
                              <span
                                className={isMax ? 'font-bold' : ''}
                                style={{ color: isMax ? a.color : '#9ca3af' }}
                              >
                                {m.format(val)}
                                {isMax && <span className="ml-1 text-[10px]">▲</span>}
                              </span>
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
        </>
      )}

      {selectedAgents.length === 1 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Add one more agent to start comparing</p>
        </div>
      )}

      <TxDrillModal target={drillTarget} onClose={() => setDrillTarget(null)} />
    </div>
  );
}
