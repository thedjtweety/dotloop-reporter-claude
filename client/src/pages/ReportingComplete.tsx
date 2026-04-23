// @ts-nocheck
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, FileText, Sheet, Clock, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReportingComplete() {
  const [selectedTemplate, setSelectedTemplate] = useState('commission');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState('30');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [scheduleEmails, setScheduleEmails] = useState('');

  // Fetch reports
  const { data: reports, isLoading: reportsLoading, refetch: refetchReports } = trpc.reporting.getReports.useQuery();
  const { data: agents } = trpc.reporting.getAgents.useQuery();
  const { data: schedules, refetch: refetchSchedules } = trpc.reporting.getSchedules.useQuery();

  // Generate report mutation
  const generateReportMutation = trpc.reporting.generateReport.useMutation({
    onSuccess: (data) => {
      if (selectedFormat === 'pdf') {
        const blob = new Blob([data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString()}.pdf`;
        a.click();
      } else {
        const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString()}.xlsx`;
        a.click();
      }
      toast.success('Report generated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate report');
    },
  });

  // Schedule report mutation
  const scheduleReportMutation = trpc.reporting.scheduleReport.useMutation({
    onSuccess: () => {
      toast.success('Report scheduled successfully');
      setIsScheduleDialogOpen(false);
      setScheduleName('');
      setScheduleFrequency('weekly');
      setScheduleEmails('');
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to schedule report');
    },
  });

  // Delete schedule mutation
  const deleteScheduleMutation = trpc.reporting.deleteSchedule.useMutation({
    onSuccess: () => {
      toast.success('Schedule deleted');
      refetchSchedules();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete schedule');
    },
  });

  const handleGenerateReport = () => {
    generateReportMutation.mutate({
      template: selectedTemplate as any,
      format: selectedFormat as any,
      dateRange: parseInt(dateRange),
      agentIds: selectedAgents.length > 0 ? selectedAgents : undefined,
    });
  };

  const handleScheduleReport = () => {
    if (!scheduleName || !scheduleEmails) {
      toast.error('Please fill in all fields');
      return;
    }
    scheduleReportMutation.mutate({
      name: scheduleName,
      template: selectedTemplate as any,
      frequency: scheduleFrequency as any,
      emails: scheduleEmails.split(',').map(e => e.trim()),
      agentIds: selectedAgents.length > 0 ? selectedAgents : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reporting</h1>
        <p className="text-foreground/70 mt-1">Generate and schedule reports</p>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="schedules">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        {/* Generate Report Tab */}
        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Report</CardTitle>
              <CardDescription>Generate a custom report with your preferred settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Report Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commission">Commission Report</SelectItem>
                    <SelectItem value="agent">Agent Performance</SelectItem>
                    <SelectItem value="financial">Financial Summary</SelectItem>
                    <SelectItem value="pipeline">Pipeline Analysis</SelectItem>
                    <SelectItem value="custom">Custom Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Export Format</label>
                <div className="flex gap-4">
                  <Button
                    variant={selectedFormat === 'pdf' ? 'default' : 'outline'}
                    onClick={() => setSelectedFormat('pdf')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button
                    variant={selectedFormat === 'excel' ? 'default' : 'outline'}
                    onClick={() => setSelectedFormat('excel')}
                  >
                    <Sheet className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Agents (Optional)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                  {agents?.map((agent: any) => (
                    <div key={agent.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedAgents.includes(agent.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAgents([...selectedAgents, agent.id]);
                          } else {
                            setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                          }
                        }}
                      />
                      <label className="text-sm cursor-pointer flex-1">{agent.name}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={handleGenerateReport} disabled={generateReportMutation.isPending}>
                  {generateReportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generate Report
                    </>
                  )}
                </Button>

                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Clock className="w-4 h-4 mr-2" />
                      Schedule Report
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Schedule Report</DialogTitle>
                      <DialogDescription>Set up automatic report generation and delivery</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Schedule Name</label>
                        <Input
                          placeholder="Weekly Commission Report"
                          value={scheduleName}
                          onChange={(e) => setScheduleName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Frequency</label>
                        <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Email Recipients</label>
                        <Input
                          placeholder="email1@example.com, email2@example.com"
                          value={scheduleEmails}
                          onChange={(e) => setScheduleEmails(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleScheduleReport} disabled={scheduleReportMutation.isPending}>
                          {scheduleReportMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Scheduling...
                            </>
                          ) : (
                            'Schedule'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="schedules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Reports</CardTitle>
              <CardDescription>Manage your automated report schedules</CardDescription>
            </CardHeader>
            <CardContent>
              {schedules && schedules.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Frequency</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedules.map((schedule: any) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">{schedule.name}</TableCell>
                          <TableCell className="capitalize">{schedule.frequency}</TableCell>
                          <TableCell>{schedule.emails.length} recipient(s)</TableCell>
                          <TableCell>
                            <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                              {schedule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteScheduleMutation.mutate({ scheduleId: schedule.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-foreground/70 py-8">No scheduled reports yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Report History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>View and download previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : reports && reports.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Generated</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report: any) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">{report.name}</TableCell>
                          <TableCell className="capitalize">{report.type}</TableCell>
                          <TableCell>{new Date(report.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>{(report.size / 1024).toFixed(2)} KB</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-foreground/70 py-8">No reports generated yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
