import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical, MessageSquare, Phone, Mail } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  totalVolume: string;
  pipelineStatus: string;
}

interface DraggablePipelineBoardProps {
  prospects: Prospect[];
  onStatusChange: (prospectId: string, newStatus: string) => Promise<void>;
}

const PIPELINE_STAGES = [
  { id: 'lead', label: 'Lead', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-orange-500' },
  { id: 'offer_extended', label: 'Offer Extended', color: 'bg-purple-500' },
  { id: 'onboarding', label: 'Onboarding', color: 'bg-green-500' },
];

export default function DraggablePipelineBoard({ prospects, onStatusChange }: DraggablePipelineBoardProps) {
  const [draggedProspect, setDraggedProspect] = useState<Prospect | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragStart = (e: React.DragEvent, prospect: Prospect) => {
    setDraggedProspect(prospect);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    
    if (!draggedProspect || draggedProspect.pipelineStatus === stageId) {
      setDraggedProspect(null);
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusChange(draggedProspect.id, stageId);
      setDraggedProspect(null);
    } catch (error) {
      console.error('Failed to update prospect status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const ProspectCard = ({ prospect }: { prospect: Prospect }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, prospect)}
      className="p-3 bg-muted rounded-lg border border-border hover:border-primary/50 cursor-move hover:shadow-md transition-all group"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{prospect.firstName} {prospect.lastName}</p>
          <p className="text-xs text-muted-foreground truncate">{prospect.email}</p>
          <p className="text-xs font-semibold text-primary mt-1">${(parseFloat(prospect.totalVolume) || 0).toLocaleString()}</p>
          
          {/* Contact icons */}
          <div className="flex gap-1 mt-2">
            {prospect.phone && (
              <div title={prospect.phone}>
                <Phone className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
            <div title={prospect.email}>
              <Mail className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {PIPELINE_STAGES.map(stage => {
        const stageProspects = prospects.filter(p => p.pipelineStatus === stage.id);
        
        return (
          <div
            key={stage.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
            className="bg-muted/30 rounded-lg p-4 min-h-[500px] border-2 border-dashed border-border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${stage.color}`} />
              <h3 className="font-semibold text-sm">{stage.label}</h3>
              <Badge variant="secondary" className="ml-auto">{stageProspects.length}</Badge>
            </div>

            <div className="space-y-3">
              {stageProspects.length > 0 ? (
                stageProspects.map(prospect => (
                  <ProspectCard key={prospect.id} prospect={prospect} />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Drag prospects here</p>
                </div>
              )}
            </div>

            {isUpdating && draggedProspect && (
              <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
