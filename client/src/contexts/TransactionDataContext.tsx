// @ts-nocheck
/**
 * TransactionDataContext
 *
 * Provides transaction data, agent metrics, commission plans, and global sidebar filters
 * across the entire application. All pages read from filteredRecords which respects
 * the active date range and team filter set in the sidebar.
 *
 * Supports comparison mode: load a second dataset to compare metrics side-by-side.
 */
import React, { createContext, useContext, useState, useEffect, useRef, useMemo, ReactNode } from 'react';
import { DotloopRecord, DashboardMetrics, AgentMetrics, calculateMetrics, calculateAgentMetrics } from '@/lib/csvParser';
import { generateSampleData } from '@/lib/sampleData';
import supabase from '@/lib/supabase';

export interface CommissionPlan {
  id: string;
  name: string;
  splitPercentage: number;
  capAmount?: number;
  postCapSplit?: number;
  deductions?: Array<{ type: 'fixed' | 'percentage'; amount: number }>;
  royaltyPercentage?: number;
  royaltyCap?: number;
  useSliding?: boolean;
  tiers?: Array<{ threshold: number; percentage: number }>;
}

export interface AgentAssignment {
  agentName: string;
  planId: string;
  planName: string;
}

export interface DateRangeFilter {
  from: Date | undefined;
  to: Date | undefined;
  label: string;
}

export interface TeamFilter {
  teamId: string;
  teamName: string;
}

export interface ComparisonDataSet {
  allRecords: DotloopRecord[];
  filteredRecords: DotloopRecord[];
  metrics: DashboardMetrics | null;
  agentMetrics: AgentMetrics[];
  name: string;
}

interface TransactionDataContextType {
  // Primary dataset
  allRecords: DotloopRecord[];
  filteredRecords: DotloopRecord[];
  metrics: DashboardMetrics | null;
  agentMetrics: AgentMetrics[];
  commissionPlans: CommissionPlan[];
  agentAssignments: AgentAssignment[];
  dateFilter: DateRangeFilter;
  teamFilter: TeamFilter;
  setDateFilter: (filter: DateRangeFilter) => void;
  setTeamFilter: (filter: TeamFilter) => void;
  isDemoMode: boolean;
  activeDataSetName: string; // 'Demo Data' or CSV file name
  activateDemoMode: () => void;
  setTransactionData: (data: {
    allRecords: DotloopRecord[];
    filteredRecords: DotloopRecord[];
    metrics: DashboardMetrics | null;
    agentMetrics: AgentMetrics[];
    isDemoMode?: boolean;
    fileName?: string;
  }) => void;
  setCommissionData: (data: {
    plans: CommissionPlan[];
    assignments: AgentAssignment[];
  }) => void;
  clearTransactionData: () => void;
  // Re-fetch live loops from /api/loops (Supabase). Used after a Dotloop
  // sync-profile switch + sync to refresh allRecords/metrics with new data.
  reloadDotloopLoops: () => Promise<void>;
  hasData: boolean;
  teams: string[];
  dataStatistics: {
    transactionCount: number;
    totalGCI: number;
    closeRate: number;
  };

  // Comparison mode
  comparisonMode: boolean;
  comparisonDataSet: ComparisonDataSet | null;
  setComparisonDataSet: (data: {
    allRecords: DotloopRecord[];
    metrics: DashboardMetrics | null;
    agentMetrics: AgentMetrics[];
    fileName: string;
  } | null) => void;
  toggleComparisonMode: () => void;
  clearComparisonData: () => void;
  comparisonStatistics: {
    transactionCount: number;
    totalGCI: number;
    closeRate: number;
  };
}

const TransactionDataContext = createContext<TransactionDataContextType | undefined>(undefined);

const DEFAULT_DATE_FILTER: DateRangeFilter = { from: undefined, to: undefined, label: 'All Data' };
const DEFAULT_TEAM_FILTER: TeamFilter = { teamId: 'all', teamName: 'All Teams' };

function applyFilters(
  records: DotloopRecord[],
  dateFilter: DateRangeFilter,
  teamFilter: TeamFilter
): DotloopRecord[] {
  let result = records;
  if (dateFilter.from || dateFilter.to) {
    result = result.filter((r) => {
      const dateStr = r.closingDate || r.createdDate || r.listingDate;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      if (dateFilter.from && d < dateFilter.from) return false;
      if (dateFilter.to && d > dateFilter.to) return false;
      return true;
    });
  }
  if (teamFilter.teamId !== 'all') {
    result = result.filter((r) => {
      const agents = (r.agents || '').toLowerCase();
      return agents.includes(teamFilter.teamName.toLowerCase());
    });
  }
  return result;
}

export function TransactionDataProvider({ children }: { children: ReactNode }) {
  const [allRecords, setAllRecords] = useState<DotloopRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlan[]>([]);
  const [agentAssignments, setAgentAssignments] = useState<AgentAssignment[]>([]);
  const [dateFilter, setDateFilterState] = useState<DateRangeFilter>(DEFAULT_DATE_FILTER);
  const [teamFilter, setTeamFilterState] = useState<TeamFilter>(DEFAULT_TEAM_FILTER);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeDataSetName, setActiveDataSetName] = useState('');

  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonDataSet, setComparisonDataSetState] = useState<ComparisonDataSet | null>(null);

  // Track whether metrics were set externally (e.g., from Home.tsx with commission plans applied)
  // When true, skip auto-recalculation so commission-plan-applied metrics are preserved
  const externalMetricsRef = useRef(false);

  // Auto-load loops from Supabase when user is authenticated.
  // Also exposed via context as `reloadDotloopLoops` so other parts of the app
  // (e.g. Settings > Dotloop Connections after switching sync profile) can
  // force a refresh once a new sync completes.
  const loadFromSupabase = useRef(async (cancelledRef?: { current: boolean }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return; // Not authenticated — CSV/demo mode only

      const res = await fetch('/api/loops', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok || cancelledRef?.current) return;

      const body = await res.json() as { records?: DotloopRecord[] };
      const records = body.records ?? [];
      if (cancelledRef?.current) return;
      // On initial mount with no live data yet, don't overwrite CSV/demo data
      // with an empty set. On explicit reload (profile switch), always apply
      // the latest result — including an empty set if the new profile has 0 loops.
      if (records.length === 0 && cancelledRef !== undefined) return;

      externalMetricsRef.current = false;
      setAllRecords(records);
      setMetrics(calculateMetrics(records));
      setAgentMetrics(calculateAgentMetrics(records));
      setIsDemoMode(false);
      setActiveDataSetName('Live Dotloop Data');
    } catch {
      // Silently ignore — app works without Supabase
    }
  });

  useEffect(() => {
    const cancelledRef = { current: false };
    void loadFromSupabase.current(cancelledRef);
    return () => { cancelledRef.current = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredRecords = useMemo(
    () => applyFilters(allRecords, dateFilter, teamFilter),
    [allRecords, dateFilter, teamFilter]
  );

  // Auto-recalculate metrics when filters change, but only if metrics weren't set externally
  useEffect(() => {
    if (allRecords.length === 0) return;
    if (externalMetricsRef.current) {
      // Reset flag after first filter change so subsequent filter changes recalculate
      // But don't recalculate this time - preserve the externally set metrics
      externalMetricsRef.current = false;
      return;
    }
    setMetrics(calculateMetrics(filteredRecords));
    setAgentMetrics(calculateAgentMetrics(filteredRecords));
  }, [filteredRecords]); // eslint-disable-line react-hooks/exhaustive-deps

  const teams = useMemo(() => {
    const names = new Set<string>();
    allRecords.forEach((r) => {
      if (r.agents) {
        r.agents.split(',').forEach((a) => {
          const trimmed = a.trim();
          if (trimmed) names.add(trimmed);
        });
      }
    });
    return Array.from(names).sort();
  }, [allRecords]);

  const comparisonStatistics = useMemo(() => {
    if (!comparisonDataSet) {
      return { transactionCount: 0, totalGCI: 0, closeRate: 0 };
    }
    return {
      transactionCount: comparisonDataSet.filteredRecords.length,
      totalGCI: comparisonDataSet.metrics?.totalCommission ?? 0,
      closeRate: comparisonDataSet.metrics?.closingRate ?? 0,
    };
  }, [comparisonDataSet]);

  const value: TransactionDataContextType = {
    allRecords,
    filteredRecords,
    metrics,
    agentMetrics,
    commissionPlans,
    agentAssignments,
    dateFilter,
    teamFilter,
    setDateFilter: setDateFilterState,
    setTeamFilter: setTeamFilterState,
    isDemoMode,
    activeDataSetName,
    activateDemoMode: () => {
      const demo = generateSampleData(200);
      externalMetricsRef.current = false; // Allow auto-recalculation for simple demo
      setAllRecords(demo);
      setMetrics(calculateMetrics(demo));
      setAgentMetrics(calculateAgentMetrics(demo));
      setIsDemoMode(true);
      setActiveDataSetName('Demo Data');
    },
    setTransactionData: (data) => {
      // Mark metrics as externally set to prevent useEffect from overwriting them
      externalMetricsRef.current = true;
      setAllRecords(data.allRecords);
      setMetrics(data.metrics);
      setAgentMetrics(data.agentMetrics);
      if (data.isDemoMode !== undefined) {
        setIsDemoMode(data.isDemoMode);
      }
      if (data.fileName) {
        setActiveDataSetName(data.fileName);
      } else if (data.isDemoMode) {
        setActiveDataSetName('Demo Data');
      }
    },
    setCommissionData: (data) => {
      setCommissionPlans(data.plans);
      setAgentAssignments(data.assignments);
    },
    clearTransactionData: () => {
      externalMetricsRef.current = false;
      setAllRecords([]);
      setMetrics(null);
      setAgentMetrics([]);
      setCommissionPlans([]);
      setAgentAssignments([]);
      setIsDemoMode(false);
      setActiveDataSetName('');
      setDateFilterState(DEFAULT_DATE_FILTER);
      setTeamFilterState(DEFAULT_TEAM_FILTER);
    },
    reloadDotloopLoops: () => loadFromSupabase.current(),
    hasData: allRecords.length > 0,
    teams,
    dataStatistics: {
      transactionCount: filteredRecords.length,
      totalGCI: metrics?.totalCommission ?? 0,
      closeRate: metrics?.closingRate ?? 0,
    },

    // Comparison mode
    comparisonMode,
    comparisonDataSet,
    setComparisonDataSet: (data) => {
      if (data === null) {
        setComparisonDataSetState(null);
      } else {
        const filtered = applyFilters(data.allRecords, dateFilter, teamFilter);
        setComparisonDataSetState({
          allRecords: data.allRecords,
          filteredRecords: filtered,
          metrics: data.metrics,
          agentMetrics: data.agentMetrics,
          name: data.fileName,
        });
      }
    },
    toggleComparisonMode: () => {
      setComparisonMode((prev) => !prev);
    },
    clearComparisonData: () => {
      setComparisonDataSetState(null);
      setComparisonMode(false);
    },
    comparisonStatistics,
  };

  return (
    <TransactionDataContext.Provider value={value}>
      {children}
    </TransactionDataContext.Provider>
  );
}

export function useTransactionData() {
  const context = useContext(TransactionDataContext);
  if (context === undefined) {
    throw new Error('useTransactionData must be used within a TransactionDataProvider');
  }
  return context;
}
