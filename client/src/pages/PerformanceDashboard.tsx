// @ts-nocheck
/**
 * Performance Metrics Dashboard - Admin Only
 * Shows aggregate upload statistics, processing times, and bottleneck analysis
 */

import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Activity, Clock, Database, TrendingUp, AlertCircle, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PerformanceDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch all performance data
  const { data: stats } = trpc.performance.getStats.useQuery();
  const { data: fileSizeDistribution } = trpc.performance.getFileSizeDistribution.useQuery();
  const { data: timeTrends } = trpc.performance.getTimeTrends.useQuery({ days: 30 });
  const { data: bottlenecks } = trpc.performance.getBottlenecks.useQuery();
  const { data: successRates } = trpc.performance.getSuccessRates.useQuery({ days: 30 });
  const { data: recordDistribution } = trpc.performance.getRecordDistribution.useQuery();
  const { data: userPerformance } = trpc.performance.getUserPerformance.useQuery();

  // Redirect if not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You must be an administrator to access the Performance Dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatBytes = (bytes: number | null | undefined) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (ms: number | null | undefined) => {
    if (!ms) return '0ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-display font-bold text-foreground">
                Performance Metrics Dashboard
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Uploads</CardDescription>
              <CardTitle className="text-3xl">{stats?.totalUploads || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {stats?.successfulUploads || 0} successful, {stats?.failedUploads || 0} failed
              </p>
              <p className="text-xs text-green-600 mt-1">
                {stats?.totalUploads ? ((stats.successfulUploads / stats.totalUploads) * 100).toFixed(1) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Processing Time</CardDescription>
              <CardTitle className="text-3xl">{formatTime(stats?.avgTotalTime)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                Max: {formatTime(stats?.maxTotalTime)}
              </p>
              <div className="text-xs text-foreground mt-1 space-y-0.5">
                <div>Validation: {formatTime(stats?.avgValidationTime)}</div>
                <div>Parsing: {formatTime(stats?.avgParsingTime)}</div>
                <div>Upload: {formatTime(stats?.avgUploadTime)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg File Size</CardDescription>
              <CardTitle className="text-3xl">{formatBytes(stats?.avgFileSize)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                Max: {formatBytes(stats?.maxFileSize)}
              </p>
              <p className="text-xs text-foreground mt-1">
                Total records processed: {(stats?.totalRecords || 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System Health</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {stats?.totalUploads && stats.successfulUploads / stats.totalUploads >= 0.95 ? 'Excellent' : 'Good'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                All systems operational
              </p>
              <p className="text-xs text-foreground mt-1">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Different Views */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Time Trends</TabsTrigger>
            <TabsTrigger value="distribution">File Distribution</TabsTrigger>
            <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
            <TabsTrigger value="success">Success Rates</TabsTrigger>
            <TabsTrigger value="users">User Performance</TabsTrigger>
          </TabsList>

          {/* Time Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Processing Time Trends (Last 30 Days)
                </CardTitle>
                <CardDescription>
                  Average processing times for each stage over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={timeTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgValidationTime" stroke="#3b82f6" name="Validation" />
                    <Line type="monotone" dataKey="avgParsingTime" stroke="#10b981" name="Parsing" />
                    <Line type="monotone" dataKey="avgUploadTime" stroke="#f59e0b" name="Upload" />
                    <Line type="monotone" dataKey="avgTotalTime" stroke="#ef4444" name="Total" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Volume Trend</CardTitle>
                <CardDescription>Number of uploads per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeTrends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="uploadCount" fill="#3b82f6" name="Uploads" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* File Distribution Tab */}
          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>File Size Distribution</CardTitle>
                  <CardDescription>Number of uploads by file size range</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={fileSizeDistribution || []}
                        dataKey="count"
                        nameKey="sizeRange"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {(fileSizeDistribution || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Record Count Distribution</CardTitle>
                  <CardDescription>Number of uploads by record count range</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={recordDistribution || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="recordRange" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" name="Uploads" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Processing Time by File Size</CardTitle>
                <CardDescription>Average processing time for each file size range</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={fileSizeDistribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sizeRange" />
                    <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="avgTime" fill="#f59e0b" name="Avg Time" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bottlenecks Tab */}
          <TabsContent value="bottlenecks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Top 20 Slowest Uploads
                </CardTitle>
                <CardDescription>
                  Identify which uploads took the longest and which stage was the bottleneck
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(bottlenecks || []).map((upload) => (
                    <div key={upload.uploadId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{upload.fileName}</p>
                          <p className="text-sm text-foreground">
                            {upload.recordCount.toLocaleString()} records • {formatBytes(upload.fileSize)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatTime(upload.totalTimeMs)}</p>
                          <p className="text-xs text-foreground">
                            {new Date(upload.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Validation ({upload.stagePercentages.validation}%)</span>
                          <span>{formatTime(upload.validationTimeMs)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${upload.stagePercentages.validation}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>Parsing ({upload.stagePercentages.parsing}%)</span>
                          <span>{formatTime(upload.parsingTimeMs)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${upload.stagePercentages.parsing}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-sm">
                          <span>Upload ({upload.stagePercentages.upload}%)</span>
                          <span>{formatTime(upload.uploadTimeMs)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full"
                            style={{ width: `${upload.stagePercentages.upload}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">
                          Bottleneck: <span className="text-red-600 capitalize">{upload.slowestStage}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Success Rates Tab */}
          <TabsContent value="success" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Success/Failure Rates (Last 30 Days)</CardTitle>
                <CardDescription>Daily upload success and failure rates</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={successRates || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="successRate" stroke="#10b981" name="Success Rate (%)" strokeWidth={2} />
                    <Line type="monotone" dataKey="failureRate" stroke="#ef4444" name="Failure Rate (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Upload Volume</CardTitle>
                <CardDescription>Total, successful, and failed uploads per day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={successRates || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="successful" fill="#10b981" name="Successful" />
                    <Bar dataKey="failed" fill="#ef4444" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Performance Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Performance Metrics
                </CardTitle>
                <CardDescription>
                  Performance statistics for each user
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">User</th>
                        <th className="text-right p-2">Uploads</th>
                        <th className="text-right p-2">Avg File Size</th>
                        <th className="text-right p-2">Avg Time</th>
                        <th className="text-right p-2">Total Records</th>
                        <th className="text-right p-2">Success Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                     {(userPerformance || []).map((user: any) => (
                       <tr key={user.name} className="border-b hover:bg-muted/50">
                          <td className="p-2">
                            <div>
                              <p className="font-medium">{user.userName || 'Unknown'}</p>
                              <p className="text-xs text-foreground">{user.userEmail}</p>
                            </div>
                          </td>
                          <td className="text-right p-2">{user.totalUploads}</td>
                          <td className="text-right p-2">{formatBytes(user.avgFileSize)}</td>
                          <td className="text-right p-2">{formatTime(user.avgTotalTime)}</td>
                          <td className="text-right p-2">{Number(user.totalRecords).toLocaleString()}</td>
                          <td className="text-right p-2">
                            <span className={`font-medium ${
                              Number(user.successRate) >= 95 ? 'text-green-600' :
                              Number(user.successRate) >= 80 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {Number(user.successRate).toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
