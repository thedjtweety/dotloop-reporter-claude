import { useState, useCallback } from 'react';
import { DotloopRecord, AgentMetrics } from '@/lib/csvParser';

export interface AgentDetailTarget {
  agentName: string;
  records: DotloopRecord[];
  metrics: AgentMetrics | null;
  rank: number;
}

export function useAgentDetail() {
  const [target, setTarget] = useState<AgentDetailTarget | null>(null);

  const open = useCallback((
    agentName: string,
    allRecords: DotloopRecord[],
    allMetrics: AgentMetrics[]
  ) => {
    const records = allRecords.filter(r => (r.agents || '').split(',').map(a => a.trim()).includes(agentName));
    const metrics = allMetrics.find(m => m.agentName === agentName) ?? null;
    const sorted = [...allMetrics].sort((a, b) => b.totalCommission - a.totalCommission);
    const rank = sorted.findIndex(m => m.agentName === agentName) + 1;
    setTarget({ agentName, records, metrics, rank });
  }, []);

  const close = useCallback(() => setTarget(null), []);

  return { agentTarget: target, openAgent: open, closeAgent: close };
}
