import { useMemo, useState } from 'react';
import { DotloopRecord } from '@/lib/csvParser';
import { analyzeDataHealth, HealthIssue } from '@/lib/dataHealth';
import { analyzeFieldCompleteness } from '@/lib/fieldCompletenessAnalysis';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DrillDownModal from './LegacyTransactionDrillModal';

interface DataHealthCheckProps {
  records: DotloopRecord[];
}

export default function DataHealthCheck({ records }: DataHealthCheckProps) {
  const report = useMemo(() => analyzeDataHealth(records), [records]);
  const completenessReport = useMemo(() => analyzeFieldCompleteness(records), [records]);
  const [selectedIssue, setSelectedIssue] = useState<HealthIssue | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const handleFixClick = (issue: HealthIssue) => {
    setSelectedIssue(issue);
  };

  const filteredRecords = useMemo(() => {
    if (!selectedIssue) return [];
    return records.filter(selectedIssue.filter);
  }, [selectedIssue, records]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Overall Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-4xl font-bold ${getScoreColor(report.score)}`}>
                {report.score}%
              </span>
              {report.score >= 90 ? (
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              ) : report.score >= 70 ? (
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
            </div>
            <Progress value={report.score} className="h-2" indicatorClassName={getScoreProgressColor(report.score)} />
            <p className="text-xs text-foreground mt-2">
              Based on completeness of critical fields
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-foreground">{report.totalRecords}</div>
                <div className="text-xs text-foreground">Total Records Analyzed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{report.issues.length}</div>
                <div className="text-xs text-foreground">Issues Detected</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
               {report.issues.filter(i => i.type === 'critical').length > 0 && (
                 <Badge variant="destructive" className="flex items-center gap-1">
                   <AlertCircle className="h-3 w-3" /> 
                   {report.issues.filter(i => i.type === 'critical').length} Critical Issues
                 </Badge>
               )}
               {report.issues.filter(i => i.type === 'warning').length > 0 && (
                 <Badge variant="secondary" className="flex items-center gap-1 text-amber-500 bg-amber-500/10 border-amber-500/20">
                   <AlertTriangle className="h-3 w-3" />
                   {report.issues.filter(i => i.type === 'warning').length} Warnings
                 </Badge>
               )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Field Completeness Breakdown */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Field Completeness</CardTitle>
          <CardDescription>
            Data quality breakdown by field. Green indicates excellent (90%+), yellow indicates good (70-89%), red indicates needs attention (&lt;70%).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completenessReport.fields.map((field) => {
              const getFieldColor = (status: string) => {
                if (status === 'excellent') return 'bg-emerald-500';
                if (status === 'good') return 'bg-amber-500';
                if (status === 'warning') return 'bg-orange-500';
                return 'bg-red-500';
              };

              const getFieldTextColor = (status: string) => {
                if (status === 'excellent') return 'text-emerald-500';
                if (status === 'good') return 'text-amber-500';
                if (status === 'warning') return 'text-orange-500';
                return 'text-red-500';
              };

              return (
                <div key={field.fieldName} className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground text-sm">{field.displayName}</h4>
                    <span className={`text-lg font-bold ${getFieldTextColor(field.status)}`}>
                      {field.completenessPercentage}%
                    </span>
                  </div>
                  <Progress 
                    value={field.completenessPercentage} 
                    className="h-2" 
                    indicatorClassName={getFieldColor(field.status)}
                  />
                  <p className="text-xs text-foreground mt-2">
                    {field.completedRecords} of {field.totalRecords} records
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Issues List */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
          <CardDescription>
            Fix these issues to improve report accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.issues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
              <h3 className="text-lg font-medium text-foreground">All Clear!</h3>
              <p className="text-foreground max-w-sm mt-2">
                Your data looks great. All critical and recommended fields are populated.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {report.issues.map((issue) => (
                <div key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border bg-muted/30 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {issue.type === 'critical' ? (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5">Critical</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 text-amber-500 bg-amber-500/10 border-amber-500/20">Warning</Badge>
                      )}
                      <h4 className="font-medium text-foreground">{issue.title}</h4>
                    </div>
                    <p className="text-sm text-foreground">{issue.description}</p>
                    <p className="text-xs font-medium text-foreground">Impact: {issue.impact}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="shrink-0 gap-2"
                    onClick={() => handleFixClick(issue)}
                  >
                    View {issue.affectedCount} Records <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drill Down Modal for Fixing Issues */}
      {selectedIssue && (
        <DrillDownModal
          isOpen={!!selectedIssue}
          onClose={() => setSelectedIssue(null)}
          title={`Fix: ${selectedIssue.title}`}
          transactions={filteredRecords}
        />
      )}
    </div>
  );
}
