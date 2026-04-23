import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: 'agent' | 'manager' | 'admin';
  joinDate: string;
  performance: {
    volume: number;
    commission: number;
    closingRate: number;
  };
}

export function TeamManagementUI() {
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'owner' | 'editor' | 'viewer'>('editor');

  // Mock team members
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john@example.com',
      role: 'manager',
      joinDate: '2023-01-15',
      performance: { volume: 5000000, commission: 300000, closingRate: 95 },
    },
    {
      id: 2,
      name: 'Jane Doe',
      email: 'jane@example.com',
      role: 'agent',
      joinDate: '2023-06-20',
      performance: { volume: 4200000, commission: 252000, closingRate: 88 },
    },
    {
      id: 3,
      name: 'Bob Johnson',
      email: 'bob@example.com',
      role: 'agent',
      joinDate: '2023-08-10',
      performance: { volume: 3800000, commission: 228000, closingRate: 82 },
    },
  ];

  const addTeamMemberMutation = trpc.teamManagementProcedures.addTeamMember.useMutation() as any;
  const trpcUtils = trpc.useUtils();
  const removeTeamMemberMutation = trpc.teamManagementProcedures.removeTeamMember.useMutation() as any;

  const handleAddMember = async () => {
    if (!newMemberEmail) return;

    try {
      // Note: In production, you'd need to look up the userId from the email first
      // For now, we'll use a placeholder
      await addTeamMemberMutation.mutateAsync({
        email: newMemberEmail,
        role: newMemberRole as any,
      });
      setNewMemberEmail('');
      setIsAddingMember(false);
      // Refresh team members list
      await trpcUtils.teamManagementProcedures.invalidate();
    } catch (error) {
      console.error('Failed to add team member:', error);
    } finally {
      // Re-enable form
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      await removeTeamMemberMutation.mutateAsync({
        memberId,
      });
      await trpcUtils.teamManagementProcedures.invalidate();
    } catch (error) {
      console.error('Failed to remove team member:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Team Management</h2>
          </div>

          <Button onClick={() => setIsAddingMember(!isAddingMember)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>

        {/* Add Member Form */}
        {isAddingMember && (
          <Card className="p-4 mb-6 bg-muted border-dashed">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="agent@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as 'owner' | 'editor' | 'viewer')}
                  className="w-full mt-2 px-3 py-2 border rounded-md bg-background text-foreground"
                >
                  <option value="editor">Editor (Agent)</option>
                  <option value="owner">Owner (Manager)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleAddMember}
                  disabled={!newMemberEmail || addTeamMemberMutation.isPending}
                  size="sm"
                >
                  {addTeamMemberMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </Button>
                <Button
                  onClick={() => setIsAddingMember(false)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Team Members List */}
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <Card key={member.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="font-semibold text-primary">
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Role</p>
                      <p className="font-medium text-foreground capitalize">{member.role}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className="font-medium text-foreground">
                        ${(member.performance.volume / 1000000).toFixed(1)}M
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="font-medium text-foreground">
                        ${(member.performance.commission / 1000).toFixed(0)}K
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Closing Rate</p>
                      <p className="font-medium text-foreground">{member.performance.closingRate}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={removeTeamMemberMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
