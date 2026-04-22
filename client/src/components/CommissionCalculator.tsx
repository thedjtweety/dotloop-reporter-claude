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
  }, []);

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

      // Use data from server
      const currentPlans = plansResult?.data || [];
      const currentAssignments = assignmentsResult?.data || [];

      if (!currentPlans || currentPlans.length === 0) {
        setError('No commission plans configured. Please set up commission plans in the Commission Plans Manager.');
        return;
      }

      if (!currentAssignments || currentAssignments.length === 0) {
        setError('No agent assignments configured. Please assign agents to commission plans.');
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
      });

      if (response.success) {
        setResult({
          success: true,
          data: response.data,
          timestamp: new Date().toISOString(),
          transactionCount: transactions.length,
          agentCount: new Set(transactions.map(t => t.agentName)).size,
        });
      } else {
        setError('Calculation failed. Please check your data and try again.');
      }
    } catch (err) {
      setError(`Calculation error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Commission calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Commission Calculator</h2>
        <p className="text-foreground/70 mt-1">Calculate commissions based on your transaction data and commission plans</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">Transactions Loaded</p>
            <p className="text-2xl font-bold text-foreground">{transactions.length}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">Commission Plans</p>
            <p className="text-2xl font-bold text-foreground">{plans?.length || 0}</p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">Agent Assignments</p>
            <p className="text-2xl font-bold text-foreground">{assignments?.length || 0}</p>
          </div>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Calculate Button */}
      <Button
        onClick={handleCalculate}
        disabled={!hasData || calculating || plansLoading || assignmentsLoading}
        size="lg"
        className="w-full"
      >
        {calculating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <RefreshCw className="mr-2 h-4 w-4" />
            Calculate Commissions
          </>
        )}
      </Button>

      {/* Results */}
      {result && (
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="variance">Variance</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Calculation Status</span>
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Complete
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Timestamp</span>
                  <span className="font-mono text-sm">{new Date(result.timestamp).toLocaleString()}</span>
                </div>
              </div>
            </Card>
            {result.data && <AgentCommissionSummary data={result.data} />}
          </TabsContent>

          <TabsContent value="breakdown">
            {result.data && <AgentCommissionSummary data={result.data} detailed />}
          </TabsContent>

          <TabsContent value="variance">
            {result.data && <CommissionVarianceReport data={result.data} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
