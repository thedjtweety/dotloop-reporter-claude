// @ts-nocheck
import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Edit2, Trash2, Mail, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamManagementComplete() {
  const { user } = useAuth();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');
  const [editRole, setEditRole] = useState('member');

  // Fetch team members
  const { data: members, isLoading, refetch } = trpc.teamManagement.listMembers.useQuery();

  // Add member mutation
  const addMemberMutation = trpc.teamManagement.addMember.useMutation({
    onSuccess: () => {
      toast.success('Team member added successfully');
      setIsAddDialogOpen(false);
      setNewMemberEmail('');
      setNewMemberRole('member');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add team member');
    },
  });

  // Update member mutation
  const updateMemberMutation = trpc.teamManagement.updateMember.useMutation({
    onSuccess: () => {
      toast.success('Team member updated successfully');
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update team member');
    },
  });

  // Remove member mutation
  const removeMemberMutation = trpc.teamManagement.removeMember.useMutation({
    onSuccess: () => {
      toast.success('Team member removed successfully');
      setIsRemoveDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove team member');
    },
  });

  const handleAddMember = () => {
    if (!newMemberEmail) {
      toast.error('Please enter an email address');
      return;
    }
    addMemberMutation.mutate({
      email: newMemberEmail,
      role: newMemberRole as any,
    });
  };

  const handleUpdateMember = () => {
    if (!selectedMember) return;
    updateMemberMutation.mutate({
      memberId: selectedMember.id,
      role: editRole as any,
    });
  };

  const handleRemoveMember = () => {
    if (!selectedMember) return;
    removeMemberMutation.mutate({
      memberId: selectedMember.id,
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500';
      case 'broker':
        return 'bg-blue-500';
      case 'member':
        return 'bg-green-500';
      case 'agent':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-foreground/70 mt-1">Manage team members and their roles</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>Invite a new team member to your organization</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email Address</label>
                <Input
                  type="email"
                  placeholder="member@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Role</label>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {members?.length || 0} member{members?.length !== 1 ? 's' : ''} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name || 'Pending'}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Badge className={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(member.status)}
                          <span className="capitalize">{member.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog open={isEditDialogOpen && selectedMember?.id === member.id} onOpenChange={setIsEditDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMember(member);
                                  setEditRole(member.role);
                                }}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Team Member</DialogTitle>
                                <DialogDescription>Update {member.email}'s role</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">Role</label>
                                  <Select value={editRole} onValueChange={setEditRole}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="member">Member</SelectItem>
                                      <SelectItem value="broker">Broker</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateMember} disabled={updateMemberMutation.isPending}>
                                    {updateMemberMutation.isPending ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      'Update Role'
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog open={isRemoveDialogOpen && selectedMember?.id === member.id} onOpenChange={setIsRemoveDialogOpen}>
                            <AlertDialog>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedMember(member)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialog>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.email}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRemoveMember} disabled={removeMemberMutation.isPending}>
                                  {removeMemberMutation.isPending ? 'Removing...' : 'Remove'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-foreground/70">No team members yet</p>
              <Button className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Member
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
