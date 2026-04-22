/**
 * Manage Dotloop Connections Page
 * 
 * Settings page for managing multiple Dotloop account connections.
 * Allows users to:
 * - View all connected accounts
 * - Add new connections
 * - Rename connections
 * - Set primary connection
 * - Enable/disable connections
 * - Delete connections
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Star, 
  StarOff, 
  CheckCircle, 
  XCircle,
  Loader2,
  Link as LinkIcon 
} from 'lucide-react';
import { toast } from 'sonner';

export default function ManageDotloopConnections() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [newConnectionName, setNewConnectionName] = useState('');

  // Queries
  const { data: connections, isLoading, refetch } = trpc.dotloopConnections.listConnections.useQuery();
  const { data: activeConnection } = trpc.dotloopConnections.getActiveConnection.useQuery();

  // Mutations
  const updateMutation = trpc.dotloopConnections.updateConnection.useMutation({
    onSuccess: () => {
      toast.success('Connection updated successfully');
      refetch();
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update connection');
    },
  });

  const setPrimaryMutation = trpc.dotloopConnections.setPrimaryConnection.useMutation({
    onSuccess: () => {
      toast.success('Primary connection updated');
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to set primary connection');
    },
  });

  const deleteMutation = trpc.dotloopConnections.deleteConnection.useMutation({
    onSuccess: () => {
      toast.success('Connection deleted successfully');
      refetch();
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete connection');
    },
  });

  const handleEdit = (connection: any): void => {
    setSelectedConnection(connection);
    setNewConnectionName(connection.connectionName || connection.dotloopAccountEmail || '');
    setEditDialogOpen(true);
  };

  const handleDelete = (connection: any) => {
    setSelectedConnection(connection);
    setDeleteDialogOpen(true);
  };

  const handleToggleActive = (connection: any) => {
    updateMutation.mutate({
      connectionId: connection.id,
      isActive: connection.isActive === 1 ? 0 : 1,
    });
  };

  const handleSetPrimary = (connection: any) => {
    setPrimaryMutation.mutate({ connectionId: connection.id });
  };

  const handleSaveEdit = () => {
    if (!selectedConnection) return;
    
    updateMutation.mutate({
      connectionId: selectedConnection.id,
      connectionName: newConnectionName,
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedConnection) return;
    
    deleteMutation.mutate({ connectionId: selectedConnection.id });
  };

  const handleAddConnection = () => {
    // Redirect to OAuth flow
    window.location.href = '/api/dotloop-oauth/authorize';
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dotloop Connections</h1>
            <p className="text-muted-foreground mt-2">
              Manage your connected Dotloop accounts
            </p>
          </div>
          <Button onClick={handleAddConnection}>
            <Plus className="w-4 h-4 mr-2" />
            Add Connection
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              You can connect multiple Dotloop accounts and switch between them
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!connections || connections.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your first Dotloop account to get started
                </p>
                <Button onClick={handleAddConnection}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Primary</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection: any) => {
                    const isActive = activeConnection?.id === connection.id;
                    const displayName = connection.connectionName || connection.dotloopAccountEmail || `Connection ${connection.id}`;
                    
                    return (
                      <TableRow key={connection.id}>
                        <TableCell className="font-medium">
                          {displayName}
                          {isActive && (
                            <Badge variant="secondary" className="ml-2">
                              Current
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{connection.dotloopAccountEmail || '-'}</TableCell>
                        <TableCell>
                          {connection.isActive === 1 ? (
                            <Badge variant="default">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {connection.isPrimary === 1 ? (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetPrimary(connection)}
                              disabled={setPrimaryMutation.isPending}
                            >
                              <StarOff className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(connection)}
                            disabled={updateMutation.isPending}
                          >
                            {connection.isActive === 1 ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(connection)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(connection)}
                              disabled={connections.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Connection</DialogTitle>
            <DialogDescription>
              Update the name for this Dotloop connection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="connectionName">Connection Name</Label>
              <Input
                id="connectionName"
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                placeholder="e.g., Personal Account, Work Account"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Connection?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your Dotloop account and revoke access tokens.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete Connection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
