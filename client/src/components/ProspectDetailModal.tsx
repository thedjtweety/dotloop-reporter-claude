import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Phone, MapPin, Calendar, TrendingUp, X, ChevronRight } from 'lucide-react';
import ProspectActivityTimeline from './ProspectActivityTimeline';
import { trpc } from '@/lib/trpc';

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone?: string;
  mobilePhone?: string;
  office?: string;
  agentAddress?: string;
  officeLocation?: string;
  totalVolume?: string;
  totalUnits?: number;
  pipelineStatus: string;
  createdAt?: string;
}

interface Activity {
  id: string;
  prospectId: string;
  activityType: 'note' | 'call' | 'email' | 'meeting' | 'offer' | 'status_change';
  title: string;
  description: string | null;
  notes: string | null;
  contactDate?: string;
  duration?: number | null;
  createdAt: string;
}

interface ProspectDetailModalProps {
  prospect: Prospect | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (prospectId: string, newStatus: string) => Promise<void>;
}

const PIPELINE_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-orange-500' },
  { id: 'offer_extended', label: 'Offer Extended', color: 'bg-purple-500' },
  { id: 'onboarding', label: 'Onboarding', color: 'bg-green-500' },
];

export default function ProspectDetailModal({
  prospect,
  isOpen,
  onClose,
  onStatusChange,
}: ProspectDetailModalProps) {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const activities = trpc.recruiting.getProspectActivities.useQuery(
    { prospectId: prospect?.id || '' },
    { enabled: isOpen && !!prospect?.id }
  );

  if (!prospect) return null;

  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === prospect.pipelineStatus);
  const currentStage = PIPELINE_STAGES[currentStageIndex];

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await onStatusChange(prospect.id, newStatus);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {prospect.firstName} {prospect.lastName}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Prospect in {currentStage?.label || 'Unknown'} stage
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Activity</TabsTrigger>
            <TabsTrigger value="actions">Quick Actions</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            {/* Contact Information */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">
                      {prospect.email}
                    </a>
                  </div>
                </div>

                {prospect.primaryPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Primary Phone</p>
                      <a href={`tel:${prospect.primaryPhone}`} className="text-primary hover:underline">
                        {prospect.primaryPhone}
                      </a>
                    </div>
                  </div>
                )}

                {prospect.mobilePhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mobile Phone</p>
                      <a href={`tel:${prospect.mobilePhone}`} className="text-primary hover:underline">
                        {prospect.mobilePhone}
                      </a>
                    </div>
                  </div>
                )}

                {prospect.office && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Office</p>
                      <p className="font-medium">{prospect.office}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Production Data */}
            {(prospect.totalVolume || prospect.totalUnits) && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Production Data
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {prospect.totalVolume && (
                    <div>
                      <p className="text-sm text-muted-foreground">Total Volume</p>
                      <p className="text-2xl font-bold text-primary">
                        ${(parseFloat(prospect.totalVolume) || 0).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {prospect.totalUnits && (
                    <div>
                      <p className="text-sm text-muted-foreground">Total Units</p>
                      <p className="text-2xl font-bold text-primary">{prospect.totalUnits}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Pipeline Status */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Pipeline Status</h3>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${currentStage?.color}`} />
                <span className="font-medium">{currentStage?.label}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {PIPELINE_STAGES.map((stage) => (
                  <Button
                    key={stage.id}
                    variant={prospect.pipelineStatus === stage.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleStatusChange(stage.id)}
                    disabled={isUpdatingStatus}
                  >
                    {stage.label}
                  </Button>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* TIMELINE TAB */}
          <TabsContent value="timeline" className="space-y-4">
            <ProspectActivityTimeline
              prospectId={prospect.id}
              activities={(activities.data as any) || []}
              isLoading={activities.isLoading}
            />
          </TabsContent>

          {/* QUICK ACTIONS TAB */}
          <TabsContent value="actions" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {/* Contact Actions */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Contact</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`mailto:${prospect.email}`)}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Email
                    </Button>
                    {prospect.primaryPhone && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`tel:${prospect.primaryPhone}`)}
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status Actions */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Move to Stage</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PIPELINE_STAGES.map((stage) => (
                      prospect.pipelineStatus !== stage.id && (
                        <Button
                          key={stage.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(stage.id)}
                          disabled={isUpdatingStatus}
                          className="justify-start"
                        >
                          <ChevronRight className="w-4 h-4 mr-2" />
                          {stage.label}
                        </Button>
                      )
                    ))}
                  </div>
                </div>

                {/* Export Actions */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Export</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const data = JSON.stringify(prospect, null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${prospect.firstName}-${prospect.lastName}.json`;
                      a.click();
                    }}
                  >
                    Download Prospect Data
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
