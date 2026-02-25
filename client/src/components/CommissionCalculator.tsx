/**
 * Commission Calculator Component
 * 
 * Provides UI for automatic commission calculation
 * - Loads transaction data from recent uploads
 * - Fetches commission plans and agent assignments
 * - Triggers calculation via tRPC API
 * - Displays results in formatted tables
 */

import { useState, useEffect } from 'react';
import { getCommissionPlans, getAgentAssignments, PLANS_KEY, ASSIGNMENTS_KEY } from '@/lib/commission';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Download, RefreshCw } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { getRecentFiles } from '@/lib/storage';
import ExportPDFButton from '@/components/ExportPDFButton';
import AgentCommissionSummary from '@/components/AgentCommissionSummary';
import CommissionVarianceReport from '@/components/CommissionVarianceReport';
// CSV upload is handled on the main Analytics page
import type { DotloopRecord } from '@/lib/csvParser';

interface CalculationResult {
  success: boolean;
  data: {
    breakdowns: any[];
    ytdSummaries: any[];
  };
  timestamp: string;
  transactionCount: number;
  agentCount: number;
}

export default function CommissionCalculator() {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [transactions, setTransactions] = useState<DotloopRecord[]>([]);
  const [hasData, setHasData] = useState(false);


  // Fetch data from tRPC with staleTime: 0 to ensure fresh data
  const { data: plans, isLoading: plansLoading, error: plansError, refetch: refetchPlans } = trpc.commission.getPlans.useQuery(undefined, { staleTime: 0 });
  const { data: teams, isLoading: teamsLoading, error: teamsError, refetch: refetchTeams } = trpc.commission.getTeams.useQuery(undefined, { staleTime: 0 });
  const { data: assignments, isLoading: assignmentsLoading, error: assignmentsError, refetch: refetchAssignments } = trpc.commission.getAssignments.useQuery(undefined, { staleTime: 0 });
  const calculateMutation = trpc.commission.calculate.useMutation();

  // Log query status for debugging
  useEffect(() => {
    if (plansError) console.error('Plans query error:', plansError);
    if (teamsError) console.error('Teams query error:', teamsError);
    if (assignmentsError) console.error('Assignments query error:', assignmentsError);
    console.log('Plans:', plans?.length || 0, 'Teams:', teams?.length || 0, 'Assignments:', assignments?.length || 0);
  }, [plans, teams, assignments, plansError, teamsError, assignmentsError]);

  // Refetch data once when component mounts to ensure latest plans and assignments
  useEffect(() => {
    refetchPlans();
    refetchTeams();
    refetchAssignments();
  }, []); // Empty dependency array - only run once on mount

  // Load recent transaction data on mount
  useEffect(() => {
    const loadRecentData = async () => {
      try {
        setLoading(true);
        
        // First check for demo data in localStorage
        const demoDataStr = localStorage.getItem('dotloop_demo_data');
        if (demoDataStr) {
          try {
            const demoData = JSON.parse(demoDataStr);
            if (demoData && demoData.length > 0) {
              setTransactions(demoData);
              setHasData(true);
              setError(null);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to parse demo data:', e);
          }
        }
        
        // Fall back to recent files
        const recentFiles = await getRecentFiles();
        if (recentFiles.length > 0) {
          const mostRecent = recentFiles[0];
          if (mostRecent.data && mostRecent.data.length > 0) {
            setTransactions(mostRecent.data);
            setHasData(true);
            setError(null);
          } else {
            setError('No transaction data found in recent uploads');
          }
        } else {
          setError('No recent uploads found. Please upload a Dotloop export first.');
        }
      } catch (err) {
        setError(`Failed to load transaction data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    loadRecentData();
  }, []);

  const handleCalculate = async () => {
    try {
      setCalculating(true);
      setError(null);

      // Refetch latest data before calculating
      const plansResult = await refetchPlans();
      const assignmentsResult = await refetchAssignments();

      // Validate data
      if (!transactions || transactions.length === 0) {
        setError('No transactions available to calculate. Please upload a Dotloop export first.');
        return;
      }

      // Fallback to localStorage if no plans from server (for demo mode)
      let currentPlans = plansResult?.data || [];
      if (currentPlans.length === 0) {
        try {
          currentPlans = getCommissionPlans();
          console.log('[CommissionCalculator] Using plans from localStorage:', currentPlans.length);
        } catch (e) {
          console.error('[CommissionCalculator] Failed to load plans:', e);
        }
      }

      // Fallback to localStorage if no assignments from server (for demo mode)
      let currentAssignments = assignmentsResult?.data || [];
      if (currentAssignments.length === 0) {
        try {
          currentAssignments = getAgentAssignments();
          console.log('[CommissionCalculator] Using assignments from localStorage:', currentAssignments.length);
        } catch (e) {
          console.error('[CommissionCalculator] Failed to load assignments:', e);
        }
      }

      if (!currentPlans || currentPlans.length === 0) {
        setError('No commission plans configured. Please create a plan in the Plans tab first.');
        return;
      }

      if (!currentAssignments || currentAssignments.length === 0) {
        setError('No agent assignments configured. Please assign agents to plans in the Agents tab first.');
        return;
      }

      // Transform transactions to match API schema
      const transactionInputs = transactions.map(t => ({
        id: t.loopId || `loop-${Math.random()}`,
        loopName: t.loopName || 'Unknown',
        closingDate: t.closingDate || new Date().toISOString().split('T')[0],
        agents: t.agents || '',
        salePrice: Number(t.salePrice) || 0,
        commissionRate: Number(t.commissionRate) || 0,
        buySidePercent: Number(t.buySidePercent) || 50,
        sellSidePercent: Number(t.sellSidePercent) || 50,
      }));

      // Call calculation API
      const response = await calculateMutation.mutateAsync({
        transactions: transactionInputs,
        planIds: currentPlans.map(p => p.id),
        teamIds: teams?.map(t => t.id) || [],
        agentAssignments: currentAssignments.map(a => ({
          id: a.id || Math.random().toString(36).substr(2, 9),
          agentName: a.agentName,
          planId: a.planId,
          teamId: a.teamId,
          startDate: a.startDate,
          anniversaryDate: a.anniversaryDate,
        })),
      });

      setResult(response as CalculationResult);
    } catch (err) {
      setError(`Calculation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCalculating(false);
    }
  };

  // Display summary stats
  const transactionCount = transactions.length;
  const agentCount = new Set(transactions.map(t => t.agents).join(',')).size;
  const planCount = (plans?.length || 0) + (result ? 0 : 0);

  return (
    <div className="space-y-6">
      {/* Commission Calculation Card */}
      <Card className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 border-blue-500 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Automatic Commission Calculation</h2>
            <p className="text-blue-100 mb-4">
              Calculate commissions automatically from your transaction data using configured plans and assignments.
            </p>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-blue-200">{transactionCount} Transactions</span>
              </div>
              <div>
                <span className="text-blue-200">{plans?.length || 0} Plans</span>
              </div>
              <div>
                <span className="text-blue-200">{agentCount} Agents</span>
              </div>
            </div>
          </div>
          <Button
            onClick={handleCalculate}
            disabled={calculating || !hasData}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            {calculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Calculate Commissions
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Calculation Status */}
      {result && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-900 mb-2">Calculation Complete</h3>
              <p className="text-sm text-green-700 mb-4">
                {new Date(result.timestamp).toLocaleString()}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-green-700 font-medium">Transactions Processed</p>
                  <p className="text-2xl font-bold text-green-900">{result.transactionCount}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Agents Calculated</p>
                  <p className="text-2xl font-bold text-green-900">{result.agentCount}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">Breakdowns Generated</p>
                  <p className="text-2xl font-bold text-green-900">{result.data.breakdowns.length}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700 font-medium">YTD Summaries</p>
                  <p className="text-2xl font-bold text-green-900">{result.data.ytdSummaries.length}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Results Tabs */}
      {result && (
        <div>
          <Tabs defaultValue="breakdowns" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="breakdowns">
                Commission Breakdowns ({result.data.breakdowns.length})
              </TabsTrigger>
              <TabsTrigger value="ytd">
                YTD Summaries ({result.data.ytdSummaries.length})
              </TabsTrigger>
              <TabsTrigger value="variance">Variance Report</TabsTrigger>
            </TabsList>

            <TabsContent value="breakdowns" className="space-y-4">
              {result.data.breakdowns.length > 0 ? (
                <AgentCommissionSummary breakdowns={result.data.breakdowns} />
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No commission breakdowns generated. Please ensure agents are assigned to commission plans.
                  </p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="ytd" className="space-y-4">
              {result.data.ytdSummaries.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold">Agent Name</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold">YTD Commission</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold">YTD Company Dollar</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold">Transactions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.ytdSummaries.map((summary: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-4 py-2 text-sm">{summary.agentName}</td>
                            <td className="px-4 py-2 text-right text-sm">
                              ${summary.totalAgentCommission?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              ${summary.totalCompanyDollar?.toFixed(2) || '0.00'}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">{summary.transactionCount || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No YTD summaries available.</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="variance" className="space-y-4">
              <CommissionVarianceReport
                records={transactions}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
