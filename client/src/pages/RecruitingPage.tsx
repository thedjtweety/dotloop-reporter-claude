import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AlertCircle, Users, Clock, TrendingUp, Search, Upload, AlertTriangle } from 'lucide-react';
import { parseMarketViewBrokerCSV, validateMarketViewBrokerCSV } from '@/lib/marketViewBrokerParser';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ProspectDetailModal from '@/components/ProspectDetailModal';

export default function RecruitingPage() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Queries
  const pipelineStats = trpc.recruiting.getPipelineStats.useQuery();
  const conversionFunnel = trpc.recruiting.getConversionFunnel.useQuery();
  const prospects = trpc.recruiting.getProspects.useQuery({ search: searchQuery });
  const retentionRisk = trpc.recruiting.getRetentionRisk.useQuery();

  // Mutations
  const importProspects = trpc.recruiting.importProspects.useMutation();
  const updateProspectStatus = trpc.recruiting.updateProspectStatus.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) return;

    setIsImporting(true);
    try {
      const csvText = await csvFile.text();
      const validation = validateMarketViewBrokerCSV(csvText);

      if (!validation.valid) {
        alert(`CSV validation failed: ${validation.errors.join(', ')}`);
        setIsImporting(false);
        return;
      }

      const { prospects: parsedProspects, errors } = parseMarketViewBrokerCSV(csvText);

      if (errors.length > 0) {
        console.warn('CSV parsing warnings:', errors);
      }

      await importProspects.mutateAsync({
        prospects: parsedProspects,
        fileName: csvFile.name,
      });

      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      prospects.refetch();
      pipelineStats.refetch();
    } catch (error) {
      alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleStatusChange = async (prospectId: string, newStatus: string) => {
    try {
      await updateProspectStatus.mutateAsync({
        prospectId,
        newStatus: newStatus as any,
      });
      prospects.refetch();
      conversionFunnel.refetch();
      pipelineStats.refetch();
    } catch (error) {
      alert(`Status update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-blue-100 text-blue-800',
      contacted: 'bg-cyan-100 text-cyan-800',
      interviewing: 'bg-orange-100 text-orange-800',
      offer_extended: 'bg-purple-100 text-purple-800',
      onboarding: 'bg-green-100 text-green-800',
      hired: 'bg-emerald-100 text-emerald-800',
      declined: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Recruiting</h1>
            <p className="text-lg text-muted-foreground">Agent pipeline, prospects & retention risk</p>
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Users className="w-4 h-4 mr-2" />
            Add Candidate
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Pipeline</p>
                <p className="text-3xl font-bold text-foreground">{pipelineStats.data?.inPipeline || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-purple-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offers Pending</p>
                <p className="text-3xl font-bold text-foreground">{pipelineStats.data?.offersPending || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-green-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recent Hires (90d)</p>
                <p className="text-3xl font-bold text-foreground">{pipelineStats.data?.recentHires || 0}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="border-l-4 border-l-orange-500 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">MVB Prospects</p>
                <p className="text-3xl font-bold text-foreground">{pipelineStats.data?.mvbProspects || 0}</p>
              </div>
              <Search className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="prospects">Prospects</TabsTrigger>
            <TabsTrigger value="retention">Retention Risk</TabsTrigger>
          </TabsList>

          {/* Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Conversion Funnel
              </h3>

              <div className="space-y-4">
                {conversionFunnel.data && (
                  <>
                    {['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding'].map((stage, idx) => {
                      const stageKey = stage as keyof typeof conversionFunnel.data;
                      const value = conversionFunnel.data[stageKey] || 0;
                      const maxValue = conversionFunnel.data.lead || 1;
                      const percentage = (value / maxValue) * 100;
                      const colors = ['bg-blue-500', 'bg-cyan-500', 'bg-orange-500', 'bg-purple-500', 'bg-green-500'];

                      return (
                        <div key={stage}>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium capitalize">{stage.replace('_', ' ')}</span>
                            <span className="text-sm font-bold">{value}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                            <div
                              className={`${colors[idx]} h-full flex items-center justify-center text-white text-sm font-bold transition-all`}
                              style={{ width: `${percentage}%` }}
                            >
                              {percentage > 10 && `${Math.round(percentage)}%`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </Card>

            {/* Pipeline Prospects by Stage */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['lead', 'contacted', 'interviewing', 'offer_extended', 'onboarding'].map(stage => (
                <Card key={stage} className="p-4">
                  <h4 className="font-semibold mb-4 capitalize text-sm">{stage.replace('_', ' ')}</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {prospects.data
                      ?.filter((p: any) => p.pipelineStatus === stage)
                      .map((prospect: any) => (
                        <div
                          key={prospect.id}
                          className="p-2 bg-muted rounded text-sm hover:bg-muted/80 transition cursor-pointer"
                          onClick={() => {
                            setSelectedProspect(prospect);
                            setIsDetailModalOpen(true);
                          }}
                        >
                          <p className="font-medium">{prospect.firstName} {prospect.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{prospect.email}</p>
                        </div>
                      ))}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Prospects Tab */}
          <TabsContent value="prospects" className="space-y-6">
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Import agent production data from Market View Broker CSV exports. A <a href="#" className="underline font-semibold">Market View Broker subscription</a> from ShowingTime is required to access this data.
              </AlertDescription>
            </Alert>

            {/* CSV Upload */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import CSV
              </h3>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-2"
                  >
                    Select CSV File
                  </Button>
                  {csvFile && (
                    <p className="text-sm text-muted-foreground">Selected: <span className="font-semibold">{csvFile.name}</span></p>
                  )}
                </div>

                <Button
                  onClick={handleImportCSV}
                  disabled={!csvFile || isImporting}
                  className="w-full"
                  size="lg"
                >
                  {isImporting ? 'Importing...' : 'Import Prospects'}
                </Button>
              </div>
            </Card>

            {/* Search */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, office, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Prospects List */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Imported Prospects</h3>

              {prospects.isLoading ? (
                <p className="text-muted-foreground">Loading prospects...</p>
              ) : prospects.data && prospects.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Name</th>
                        <th className="text-left py-3 px-4 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 font-semibold">Office</th>
                        <th className="text-left py-3 px-4 font-semibold">Volume</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prospects.data.map((prospect: any) => (
                        <tr key={prospect.id} className="border-b hover:bg-muted/50 transition">
                          <td className="py-3 px-4 font-medium">{prospect.firstName} {prospect.lastName}</td>
                          <td className="py-3 px-4 text-xs">{prospect.email}</td>
                          <td className="py-3 px-4">{prospect.office || '-'}</td>
                          <td className="py-3 px-4">${(parseFloat(prospect.totalVolume) || 0).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(prospect.pipelineStatus)}>
                              {prospect.pipelineStatus.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={prospect.pipelineStatus}
                              onChange={(e) => handleStatusChange(prospect.id, e.target.value)}
                              className="text-xs border rounded px-2 py-1 bg-background"
                            >
                              <option value="lead">Lead</option>
                              <option value="contacted">Contacted</option>
                              <option value="interviewing">Interviewing</option>
                              <option value="offer_extended">Offer Extended</option>
                              <option value="onboarding">Onboarding</option>
                              <option value="hired">Hired</option>
                              <option value="declined">Declined</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground font-medium">No prospects imported yet</p>
                  <p className="text-sm text-muted-foreground">Upload a Market View Broker CSV to get started</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Retention Risk Tab */}
          <TabsContent value="retention" className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Agent Retention Risk (90-day vs prior 90-day comparison)
              </h3>

              {retentionRisk.isLoading ? (
                <p className="text-muted-foreground">Loading retention risk data...</p>
              ) : retentionRisk.data && retentionRisk.data.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">Agent</th>
                        <th className="text-right py-3 px-4 font-semibold">Prior Deals</th>
                        <th className="text-right py-3 px-4 font-semibold">Recent Deals</th>
                        <th className="text-right py-3 px-4 font-semibold">Change</th>
                        <th className="text-right py-3 px-4 font-semibold">Prior Volume</th>
                        <th className="text-right py-3 px-4 font-semibold">Recent Volume</th>
                        <th className="text-right py-3 px-4 font-semibold">Volume Change</th>
                        <th className="text-center py-3 px-4 font-semibold">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retentionRisk.data.map((agent: any) => (
                        <tr key={agent.id} className="border-b hover:bg-muted/50 transition">
                          <td className="py-3 px-4 font-medium">{agent.agentName}</td>
                          <td className="py-3 px-4 text-right">{agent.priorDeals}</td>
                          <td className="py-3 px-4 text-right">{agent.recentDeals}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${parseFloat(agent.dealChangePercent) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {parseFloat(agent.dealChangePercent).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-right">${(parseFloat(agent.priorVolume) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                          <td className="py-3 px-4 text-right">${(parseFloat(agent.recentVolume) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${parseFloat(agent.volumeChangePercent) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {parseFloat(agent.volumeChangePercent).toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={getRiskColor(agent.riskLevel)}>
                              {agent.riskLevel}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                  <p className="text-muted-foreground font-medium">No retention risk data available</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Prospect Detail Modal */}
        <ProspectDetailModal
          prospect={selectedProspect}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedProspect(null);
          }}
          onStatusChange={async (prospectId: string, newStatus: string) => {
            await updateProspectStatus.mutateAsync({
              prospectId,
              newStatus: newStatus as 'lead' | 'contacted' | 'interviewing' | 'offer_extended' | 'onboarding' | 'hired' | 'declined',
            });
            prospects.refetch();
          }}
        />
      </div>
    </div>
  );
}
