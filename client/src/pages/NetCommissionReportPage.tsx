/**
 * Net Commission Report Page
 * 
 * Main page for viewing, filtering, printing, and emailing net commission reports
 * for all agents with detailed transaction-level breakdowns
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import NetCommissionReport from '@/components/NetCommissionReport';
import { DateRange } from 'react-day-picker';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface AgentCommissionSummary {
  agentName: string;
  planName: string;
  totalTransactions: number;
  totalGrossCommission: number;
  totalDeductions: number;
  totalNetCommission: number;
  averageCommissionPerDeal: number;
  transactions: any[];
}

export default function NetCommissionReportPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [agents, setAgents] = useState<AgentCommissionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get all records from Home page state or fetch from API
  const allRecordsQuery = trpc.useQuery(['getAllRecords'], {
    enabled: isAuthenticated,
  });

  // Generate report when data is available
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/');
      return;
    }

    // For now, show empty state
    // In production, this would fetch real data from the backend
    setAgents([]);
  }, [isAuthenticated, setLocation]);

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    // Regenerate report with new date range
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <p className="text-foreground mb-4">Please log in to view the Net Commission Report</p>
          <Button onClick={() => setLocation('/')}>
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Net Commission Report
              </h1>
              <p className="text-xs text-foreground hidden sm:block">
                Comprehensive commission breakdown for all agents
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-foreground">Loading report data...</p>
          </Card>
        ) : agents.length === 0 ? (
          <Card className="p-8 text-center space-y-4">
            <p className="text-foreground text-lg font-semibold">
              No Data Available
            </p>
            <p className="text-foreground">
              Upload a CSV file on the home page to generate a net commission report for all agents.
            </p>
            <Button onClick={() => setLocation('/')}>
              Upload Data
            </Button>
          </Card>
        ) : (
          <NetCommissionReport
            agents={agents}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        )}
      </main>
    </div>
  );
}
