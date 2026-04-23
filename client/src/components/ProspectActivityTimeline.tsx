import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquare, Phone, Mail, Calendar, Plus, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Activity {
  id: string;
  activityType: 'note' | 'call' | 'email' | 'meeting' | 'offer' | 'status_change';
  title: string;
  description?: string;
  notes?: string;
  contactDate?: string;
  duration?: number;
  offerAmount?: string;
  offerStatus?: string;
  createdAt: string;
  createdBy?: string;
}

interface ProspectActivityTimelineProps {
  prospectId: string;
  activities?: Activity[];
  isLoading?: boolean;
}

const ACTIVITY_ICONS = {
  note: MessageSquare,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  offer: MessageSquare,
  status_change: MessageSquare,
};

const ACTIVITY_COLORS = {
  note: 'bg-blue-100 text-blue-800 border-blue-300',
  call: 'bg-green-100 text-green-800 border-green-300',
  email: 'bg-purple-100 text-purple-800 border-purple-300',
  meeting: 'bg-orange-100 text-orange-800 border-orange-300',
  offer: 'bg-red-100 text-red-800 border-red-300',
  status_change: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function ProspectActivityTimeline({ prospectId, activities = [], isLoading = false }: ProspectActivityTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [activityType, setActivityType] = useState<'note' | 'call' | 'email' | 'meeting' | 'offer'>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactDate, setContactDate] = useState('');
  const [duration, setDuration] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addActivity = trpc.recruiting.addProspectActivity.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addActivity.mutateAsync({
        prospectId,
        activityType,
        title,
        description: description || undefined,
        contactDate: contactDate || undefined,
        duration: duration ? parseInt(duration) : undefined,
        offerAmount: offerAmount || undefined,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setContactDate('');
      setDuration('');
      setOfferAmount('');
      setActivityType('note');
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add activity:', error);
      alert('Failed to add activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity Timeline</h3>
        <Button
          onClick={() => setShowForm(!showForm)}
          size="sm"
          variant={showForm ? 'outline' : 'default'}
        >
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'Add Activity'}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-primary/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Activity Type</label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value as any)}
                  className="w-full mt-1 border rounded px-3 py-2 text-sm bg-background"
                >
                  <option value="note">Note</option>
                  <option value="call">Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="offer">Offer</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Activity title"
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about this activity..."
                className="mt-1 min-h-24"
              />
            </div>

            {(activityType === 'call' || activityType === 'meeting') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Contact Date</label>
                  <Input
                    type="datetime-local"
                    value={contactDate}
                    onChange={(e) => setContactDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {activityType === 'offer' && (
              <div>
                <label className="text-sm font-medium">Offer Amount</label>
                <Input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title}>
                {isSubmitting ? 'Adding...' : 'Add Activity'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity, idx) => {
            const Icon = ACTIVITY_ICONS[activity.activityType];
            const colorClass = ACTIVITY_COLORS[activity.activityType];

            return (
              <div key={activity.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full border-2 ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {idx < activities.length - 1 && <div className="w-1 h-12 bg-border mt-2" />}
                </div>

                <div className="flex-1 pb-4">
                  <Card className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm">{activity.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge className={colorClass}>
                        {activity.activityType.replace('_', ' ')}
                      </Badge>
                    </div>

                    {activity.description && (
                      <p className="text-sm text-foreground mb-2">{activity.description}</p>
                    )}

                    {activity.notes && (
                      <div className="bg-muted/50 p-2 rounded text-sm mb-2">
                        <p className="text-muted-foreground">{activity.notes}</p>
                      </div>
                    )}

                    {activity.duration && (
                      <p className="text-xs text-muted-foreground">Duration: {activity.duration} minutes</p>
                    )}

                    {activity.offerAmount && (
                      <div className="mt-2 text-sm">
                        <p className="font-semibold">Offer: ${parseFloat(activity.offerAmount).toLocaleString()}</p>
                        {activity.offerStatus && (
                          <Badge variant="outline" className="mt-1">{activity.offerStatus}</Badge>
                        )}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No activities yet. Add one to get started!</p>
        </div>
      )}
    </div>
  );
}
