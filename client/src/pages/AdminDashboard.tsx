import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  FileText, 
  Shield, 
  Trash2, 
  BarChart3,
  ArrowLeft,
  AlertTriangle,
  Database,
  Activity,
  FileSearch,
  UserCog
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useLocation } from 'wouter';
import RecentActivity from '@/components/RecentActivity';

export default function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  const [roleChangeUserId, setRoleChangeUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'broker' | 'agent' | 'viewer'>('viewer');

  const { data: stats, isLoading: statsLoading } = trpc.admin.getStats.useQuery();
  const { data: users, refetch: refetchUsers } = trpc.admin.listUsers.useQuery({ limit: 50, offset: 0 });
  const { data: uploads, refetch: refetchUploads } = trpc.admin.listAllUploads.useQuery({ limit: 50, offset: 0 });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      refetchUsers();
      refetchUploads();
      setDeleteUserId(null);
    },
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      refetchUsers();
      setRoleChangeUserId(null);
    },
  });

  // Redirect if not admin
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-foreground mb-6">
            You need admin privileges to access this page.
          </p>
          <Button onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-display font-bold text-foreground">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setLocation('/roles')}>
              <UserCog className="w-4 h-4 mr-2" />
              Roles
            </Button>
            <Button variant="outline" onClick={() => setLocation('/audit-log')}>
              <FileSearch className="w-4 h-4 mr-2" />
              Audit Log
            </Button>
            <Button variant="outline" onClick={() => setLocation('/performance')}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Performance Metrics
            </Button>
            <Button variant="outline" onClick={() => setLocation('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Total Users</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {statsLoading ? '...' : stats?.users.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Admin Users</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {statsLoading ? '...' : stats?.users.admins || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-accent" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Total Uploads</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {statsLoading ? '...' : stats?.uploads.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Total Records</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  {statsLoading ? '...' : stats?.uploads.totalRecords.toLocaleString() || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity Widget */}
        <div className="mb-8">
          <RecentActivity />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="uploads">
              <Activity className="w-4 h-4 mr-2" />
              Upload Activity
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">All Users</h3>
                <p className="text-sm text-foreground mt-1">
                  Manage user accounts and permissions
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Uploads</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || 'Unknown'}</TableCell>
                        <TableCell className="text-foreground">{u.email || 'No email'}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.uploadCount}</TableCell>
                        <TableCell className="text-foreground text-sm">
                          {formatDistanceToNow(new Date(u.lastSignedIn), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRoleChangeUserId(u.id);
                                setNewRole(u.role === 'admin' ? 'viewer' : 'admin');
                              }}
                            >
                              <Shield className="w-3 h-3 mr-1" />
                              {u.role === 'admin' ? 'Demote' : 'Promote'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteUserId(u.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Uploads Tab */}
          <TabsContent value="uploads">
            <Card>
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Recent Uploads</h3>
                <p className="text-sm text-foreground mt-1">
                  View all CSV uploads across all users
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploads?.map((upload) => (
                      <TableRow key={upload.id}>
                        <TableCell className="font-medium">{upload.fileName}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{upload.userName || 'Unknown'}</p>
                            <p className="text-xs text-foreground">{upload.userEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>{upload.recordCount.toLocaleString()}</TableCell>
                        <TableCell className="text-foreground text-sm">
                          {formatDistanceToNow(new Date(upload.uploadedAt), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteUserId !== null} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user and all their uploads. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteUserId) {
                  deleteUserMutation.mutate({ userId: deleteUserId });
                }
              }}
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation */}
      <AlertDialog open={roleChangeUserId !== null} onOpenChange={() => setRoleChangeUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the user's role to <strong>{newRole}</strong>. 
              {newRole === 'admin' && ' They will have full access to the admin dashboard.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (roleChangeUserId) {
                  updateRoleMutation.mutate({ userId: roleChangeUserId, role: newRole });
                }
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
