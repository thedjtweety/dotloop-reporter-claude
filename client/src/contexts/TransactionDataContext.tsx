/**
 * TransactionDataContext
 * 
 * Provides transaction data, agent metrics, and commission plans across the entire application
 * Allows Net Commission Report and other pages to access data uploaded/processed on Home page
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DotloopRecord, DashboardMetrics, AgentMetrics } from '@/lib/csvParser';

interface CommissionPlan {
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

interface AgentAssignment {
  agentName: string;
  planId: string;
  planName: string;
}

interface TransactionDataContextType {
  // Transaction data
  allRecords: DotloopRecord[];
  filteredRecords: DotloopRecord[];
  metrics: DashboardMetrics | null;
  agentMetrics: AgentMetrics[];
  
  // Commission data
  commissionPlans: CommissionPlan[];
  agentAssignments: AgentAssignment[];
  
  // Actions
  setTransactionData: (data: {
    allRecords: DotloopRecord[];
    filteredRecords: DotloopRecord[];
    metrics: DashboardMetrics | null;
    agentMetrics: AgentMetrics[];
  }) => void;
  
  setCommissionData: (data: {
    plans: CommissionPlan[];
    assignments: AgentAssignment[];
  }) => void;
  
  clearTransactionData: () => void;
  
  // Helpers
  hasData: boolean;
}

const TransactionDataContext = createContext<TransactionDataContextType | undefined>(undefined);

export function TransactionDataProvider({ children }: { children: ReactNode }) {
  const [allRecords, setAllRecords] = useState<DotloopRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DotloopRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [commissionPlans, setCommissionPlans] = useState<CommissionPlan[]>([]);
  const [agentAssignments, setAgentAssignments] = useState<AgentAssignment[]>([]);

  const value: TransactionDataContextType = {
    allRecords,
    filteredRecords,
    metrics,
    agentMetrics,
    commissionPlans,
    agentAssignments,
    
    setTransactionData: (data) => {
      setAllRecords(data.allRecords);
      setFilteredRecords(data.filteredRecords);
      setMetrics(data.metrics);
      setAgentMetrics(data.agentMetrics);
    },
    
    setCommissionData: (data) => {
      setCommissionPlans(data.plans);
      setAgentAssignments(data.assignments);
    },
    
    clearTransactionData: () => {
      setAllRecords([]);
      setFilteredRecords([]);
      setMetrics(null);
      setAgentMetrics([]);
      setCommissionPlans([]);
      setAgentAssignments([]);
    },
    
    hasData: allRecords.length > 0,
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
