/**
 * Commission Plan Simulator Modal
 * Clean, professional interface for testing different commission structures
 */

import { useState, useMemo } from 'react';
import FullScreenModal from './FullScreenModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercentage } from '@/lib/formatUtils';
import {
  CommissionPlan,
  comparePlans,
  COMMISSION_PLAN_TEMPLATES,
  formatCommissionPlan,
} from '@/lib/commissionSimulationUtils';
import { ForecastedDeal } from '@/lib/projectionUtils';
import { TrendingUp, TrendingDown, Download, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CommissionPlanSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  deals: ForecastedDeal[];
  currentPlan: CommissionPlan;
  timeframe?: '30' | '60' | '90';
}

export default function CommissionPlanSimulator({
  isOpen,
  onClose,
  deals,
  currentPlan,
  timeframe = '30',
}: CommissionPlanSimulatorProps) {
  // Simulated plan state
  const [simulatedPlan, setSimulatedPlan] = useState<CommissionPlan>({
    id: 'simulated',
    name: 'Simulated Plan',
    agentSplit: 70,
    companySplit: 30,
    brokerageFee: 0,
    deskFee: 0,
    transactionFee: 0,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('comparison');

  // Calculate comparison
  const comparison = useMemo(() => {
    return comparePlans(deals, currentPlan, simulatedPlan, timeframe);
  }, [deals, currentPlan, simulatedPlan, timeframe]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = COMMISSION_PLAN_TEMPLATES[templateId];
    if (template) {
      setSimulatedPlan(template);
      setSelectedTemplate(templateId);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.text('Commission Plan Comparison', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Summary section
    doc.setFontSize(12);
    doc.text('Plan Comparison Summary', 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    const summaryData = [
      ['Metric', 'Current Plan', 'Simulated Plan', 'Difference'],
      [
        'Agent Earnings',
        formatCurrency(comparison.currentEarnings.agentTotal),
        formatCurrency(comparison.simulatedEarnings.agentTotal),
        formatCurrency(comparison.impact.agentDifference),
      ],
      [
        'Company Earnings',
        formatCurrency(comparison.currentEarnings.companyTotal),
        formatCurrency(comparison.simulatedEarnings.companyTotal),
        formatCurrency(comparison.impact.companyDifference),
      ],
      [
        'Agent % Change',
        '-',
        '-',
        `${formatPercentage(comparison.impact.agentPercentChange)}`,
      ],
    ];

    autoTable(doc, {
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: yPosition,
      margin: 20,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Agent breakdown section
    doc.setFontSize(12);
    doc.text('Agent-Level Impact', 20, yPosition);
    yPosition += 8;

    const agentData = comparison.impact.agentsByImpact.map((agent) => [
      agent.agent,
      formatCurrency(agent.currentEarnings),
      formatCurrency(agent.simulatedEarnings),
      formatCurrency(agent.difference),
      `${formatPercentage(agent.percentChange)}`,
    ]);

    autoTable(doc, {
      head: [['Agent', 'Current', 'Simulated', 'Difference', '% Change']],
      body: agentData,
      startY: yPosition,
      margin: 20,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    // Footer
    doc.setFontSize(8);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      20,
      pageHeight - 10
    );

    doc.save('commission-plan-comparison.pdf');
  };

  // Export to CSV
  const handleExportCSV = () => {
    const rows: string[][] = [];

    // Header
    rows.push(['Commission Plan Comparison']);
    rows.push(['Generated', new Date().toLocaleString()]);
    rows.push([]);

    // Summary
    rows.push(['Summary']);
    rows.push(['Metric', 'Current Plan', 'Simulated Plan', 'Difference']);
    rows.push([
      'Agent Earnings',
      formatCurrency(comparison.currentEarnings.agentTotal),
      formatCurrency(comparison.simulatedEarnings.agentTotal),
      formatCurrency(comparison.impact.agentDifference),
    ]);
    rows.push([
      'Company Earnings',
      formatCurrency(comparison.currentEarnings.companyTotal),
      formatCurrency(comparison.simulatedEarnings.companyTotal),
      formatCurrency(comparison.impact.companyDifference),
    ]);
    rows.push([]);

    // Agent breakdown
    rows.push(['Agent-Level Impact']);
    rows.push(['Agent', 'Current Earnings', 'Simulated Earnings', 'Difference', '% Change']);
    comparison.impact.agentsByImpact.forEach((agent) => {
      rows.push([
        agent.agent,
        formatCurrency(agent.currentEarnings),
        formatCurrency(agent.simulatedEarnings),
        formatCurrency(agent.difference),
        `${formatPercentage(agent.percentChange)}`,
      ]);
    });

    // Convert to CSV
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'commission-plan-comparison.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose}
      title="Commission Plan Simulator"
      subtitle="Test different commission structures and see the impact on earnings"
    >

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="setup">Plan Setup</TabsTrigger>
            <TabsTrigger value="agents">Agent Impact</TabsTrigger>
          </TabsList>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-6">
              {/* Current Plan */}
              <Card className="border-border/50 bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                  <CardDescription>{formatCommissionPlan(currentPlan)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Agent Earnings:</span>
                      <span className="font-semibold">
                        {formatCurrency(comparison.currentEarnings.agentTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Company Earnings:</span>
                      <span className="font-semibold">
                        {formatCurrency(comparison.currentEarnings.companyTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Total Commission:</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          comparison.currentEarnings.agentTotal +
                            comparison.currentEarnings.companyTotal
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Simulated Plan */}
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardHeader>
                  <CardTitle className="text-lg">Simulated Plan</CardTitle>
                  <CardDescription>{formatCommissionPlan(simulatedPlan)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Agent Earnings:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(comparison.simulatedEarnings.agentTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Company Earnings:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(comparison.simulatedEarnings.companyTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Total Commission:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(
                          comparison.simulatedEarnings.agentTotal +
                            comparison.simulatedEarnings.companyTotal
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Impact Summary */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Agent Earnings Impact:</span>
                      <div className="flex items-center gap-2">
                        {comparison.impact.agentDifference >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span
                          className={`font-semibold ${
                            comparison.impact.agentDifference >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(comparison.impact.agentDifference)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Percentage Change:</span>
                      <span
                        className={`font-semibold ${
                          comparison.impact.agentPercentChange >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatPercentage(comparison.impact.agentPercentChange)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Company Earnings Impact:</span>
                      <div className="flex items-center gap-2">
                        {comparison.impact.companyDifference >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span
                          className={`font-semibold ${
                            comparison.impact.companyDifference >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(comparison.impact.companyDifference)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground/70">Percentage Change:</span>
                      <span
                        className={`font-semibold ${
                          comparison.impact.companyPercentChange >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {formatPercentage(comparison.impact.companyPercentChange)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export buttons */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </TabsContent>

          {/* Plan Setup Tab */}
          <TabsContent value="setup" className="space-y-6">
            {/* Templates */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quick Templates</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(COMMISSION_PLAN_TEMPLATES).map(([key, template]) => (
                  <Button
                    key={key}
                    variant={selectedTemplate === key ? 'default' : 'outline'}
                    onClick={() => handleTemplateSelect(key)}
                    className="justify-start"
                  >
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Plan Configuration */}
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Custom Plan Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Agent/Company Split */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Agent Split: {simulatedPlan.agentSplit}%</Label>
                    <span className="text-sm text-foreground/70">
                      Company: {simulatedPlan.companySplit}%
                    </span>
                  </div>
                  <Slider
                    value={[simulatedPlan.agentSplit]}
                    onValueChange={(value) => {
                      const agentSplit = value[0];
                      setSimulatedPlan({
                        ...simulatedPlan,
                        agentSplit,
                        companySplit: 100 - agentSplit,
                      });
                      setSelectedTemplate('');
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Transaction Fee */}
                <div className="space-y-3">
                  <Label htmlFor="transactionFee">Transaction Fee (per deal)</Label>
                  <Input
                    id="transactionFee"
                    type="number"
                    min="0"
                    step="5"
                    value={simulatedPlan.transactionFee || 0}
                    onChange={(e) => {
                      setSimulatedPlan({
                        ...simulatedPlan,
                        transactionFee: parseFloat(e.target.value) || 0,
                      });
                      setSelectedTemplate('');
                    }}
                    placeholder="$0"
                  />
                </div>

                {/* Desk Fee */}
                <div className="space-y-3">
                  <Label htmlFor="deskFee">Monthly Desk Fee (per agent)</Label>
                  <Input
                    id="deskFee"
                    type="number"
                    min="0"
                    step="50"
                    value={simulatedPlan.deskFee || 0}
                    onChange={(e) => {
                      setSimulatedPlan({
                        ...simulatedPlan,
                        deskFee: parseFloat(e.target.value) || 0,
                      });
                      setSelectedTemplate('');
                    }}
                    placeholder="$0"
                  />
                </div>

                {/* Brokerage Fee */}
                <div className="space-y-3">
                  <Label htmlFor="brokerageFee">Brokerage Fee (% of company dollar)</Label>
                  <Input
                    id="brokerageFee"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={simulatedPlan.brokerageFee || 0}
                    onChange={(e) => {
                      setSimulatedPlan({
                        ...simulatedPlan,
                        brokerageFee: parseFloat(e.target.value) || 0,
                      });
                      setSelectedTemplate('');
                    }}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Agent Impact Tab */}
          <TabsContent value="agents">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-lg">Agent-Level Breakdown</CardTitle>
                <CardDescription>Impact of simulated plan on each agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Simulated</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                        <TableHead className="text-right">% Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.impact.agentsByImpact.map((agent) => (
                        <TableRow key={agent.agent}>
                          <TableCell className="font-medium">{agent.agent}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(agent.currentEarnings)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(agent.simulatedEarnings)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={agent.difference >= 0 ? 'default' : 'destructive'}
                              className={
                                agent.difference >= 0
                                  ? 'bg-emerald-600 hover:bg-emerald-700'
                                  : 'bg-red-600 hover:bg-red-700'
                              }
                            >
                              {formatCurrency(agent.difference)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                agent.percentChange >= 0
                                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                  : 'text-red-600 dark:text-red-400 font-semibold'
                              }
                            >
                              {formatPercentage(agent.percentChange)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer buttons */}
        <div className="flex gap-3 justify-end pt-6 border-t border-border/50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onClose}>
            <Save className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
    </FullScreenModal>
  );
}
