import { useState, useEffect } from 'react';
import { DotloopRecord } from '@/lib/csvParser';
import { calculateCommissionAudit, AgentYTD, AuditResult } from '@/lib/commissionCalculator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, XCircle, FileText, PlusCircle } from 'lucide-react';
import { TransactionAdjustment, getTransactionAdjustments, saveTransactionAdjustments } from '@/lib/commission';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FullScreenModal from '@/components/FullScreenModal';
import { Button } from '@/components/ui/button';
import CommissionStatement from './CommissionStatement';
import ExpenseSummaryReport from './ExpenseSummaryReport';

interface CommissionAuditReportProps {
  records: DotloopRecord[];
}

export default function CommissionAuditReport({ records }: CommissionAuditReportProps) {
  const [ytdStats, setYtdStats] = useState<AgentYTD[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
  
  // Adjustment State
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentTarget, setAdjustmentTarget] = useState<{recordId: string, agentName: string} | null>(null);
  const [newAdjustment, setNewAdjustment] = useState({ description: '', amount: 0 });

  useEffect(() => {
    if (records.length > 0) {
      const { ytdStats, auditResults } = calculateCommissionAudit(records);
      
      // Filter YTD stats to only show agents present in the current records
      const activeAgents = new Set(records.map(r => r.agentName));
      const filteredYtdStats = ytdStats.filter(stat => activeAgents.has(stat.agentName));
      
      setYtdStats(filteredYtdStats);
      setAuditResults(auditResults);
    }
  }, [records, isAdjustmentOpen]); // Re-calc when dialog closes (and adjustments saved)

  const openAdjustmentDialog = (recordId: string, agentName: string) => {
    setAdjustmentTarget({ recordId, agentName });
    setNewAdjustment({ description: '', amount: 0 });
    setIsAdjustmentOpen(true);
  };

  const saveAdjustment = () => {
    if (!adjustmentTarget || !newAdjustment.description || !newAdjustment.amount) return;
    
    const adjustments = getTransactionAdjustments();
    const newAdj: TransactionAdjustment = {
      recordId: adjustmentTarget.recordId,
      agentName: adjustmentTarget.agentName,
      description: newAdjustment.description,
      amount: Number(newAdjustment.amount)
    };
    
    saveTransactionAdjustments([...adjustments, newAdj]);
    setIsAdjustmentOpen(false);
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ytd" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="ytd">YTD Cap Tracker</TabsTrigger>
          <TabsTrigger value="audit">Commission Audit Log</TabsTrigger>
          <TabsTrigger value="expenses">Expense Report</TabsTrigger>
        </TabsList>

        <TabsContent value="ytd" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ytdStats.map((stat) => (
              <Card key={stat.agentName} className={stat.isCapped ? "border-emerald-500/50 bg-emerald-50/10" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{stat.agentName}</CardTitle>
                      <CardDescription>{stat.planName} {stat.teamName ? `• ${stat.teamName}` : ''}</CardDescription>
                    </div>
                    {stat.isCapped && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">CAPPED</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">Company Dollar Paid</span>
                      <span className="font-medium">{formatCurrency(stat.ytdCompanyDollar)}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-foreground">
                        <span>Progress to Cap</span>
                        <span>{stat.percentToCap.toFixed(1)}%</span>
                      </div>
                      <Progress value={stat.percentToCap} className="h-2" indicatorClassName={stat.isCapped ? "bg-emerald-500" : ""} />
                      <div className="flex justify-between text-xs text-foreground pt-1">
                        <span>$0</span>
                        <span>Cap: {formatCurrency(stat.capAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {ytdStats.length === 0 && (
              <div className="col-span-full text-center py-12 text-foreground">
                No agent data found. Ensure agents are assigned to plans in Settings.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Audit Log</CardTitle>
              <CardDescription>
                Comparing calculated splits (based on your rules) vs. actual CSV data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Loop Name</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Actual Co. $</TableHead>
                      <TableHead className="text-right">Expected Co. $</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditResults.map((res, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="whitespace-nowrap">{res.closingDate}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={res.loopName}>{res.loopName}</TableCell>
                        <TableCell>{res.agentName}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(res.actualCompanyDollar)}</TableCell>
                        <TableCell className="text-right font-mono text-foreground">{formatCurrency(res.expectedCompanyDollar)}</TableCell>
                        <TableCell className={`text-right font-mono font-medium ${
                          res.status === 'match' ? 'text-foreground' : 
                          res.status === 'underpaid' ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {res.difference > 0 ? '+' : ''}{formatCurrency(res.difference)}
                        </TableCell>
                        <TableCell>
                          {res.status === 'match' && <Badge variant="outline" className="text-foreground"><CheckCircle2 className="w-3 h-3 mr-1"/> Match</Badge>}
                          {res.status === 'underpaid' && <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Broker +</Badge>}
                          {res.status === 'overpaid' && <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"><AlertCircle className="w-3 h-3 mr-1"/> Check</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-foreground max-w-[200px] truncate" title={res.notes}>
                          {res.notes}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {res.snapshot && (
                              <Button variant="ghost" size="icon" onClick={() => setSelectedAudit(res)} title="View Statement">
                                <FileText className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openAdjustmentDialog(res.recordId, res.agentName)} title="Add Adjustment">
                              <PlusCircle className="h-4 w-4 text-orange-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseSummaryReport records={records} />
        </TabsContent>
      </Tabs>

      {selectedAudit && (
        <CommissionStatement 
          auditResult={selectedAudit} 
          onClose={() => setSelectedAudit(null)} 
        />
      )}

      <FullScreenModal
        isOpen={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        title="Add Transaction Adjustment"
        subtitle={`Add a one-off expense or credit for ${adjustmentTarget?.agentName}`}
        headerActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAdjustmentOpen(false)}>Cancel</Button>
            <Button onClick={saveAdjustment}>Save Adjustment</Button>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto py-12">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                placeholder="e.g. Staging Fee, Bonus"
                value={newAdjustment.description}
                onChange={(e) => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Positive for Deduction, Negative for Credit"
                value={newAdjustment.amount}
                onChange={(e) => setNewAdjustment({ ...newAdjustment, amount: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Positive value = Deduction (Cost to Agent). Negative value = Credit (Payment to Agent).</p>
            </div>
          </div>
        </div>
      </FullScreenModal>
    </div>
  );
}
