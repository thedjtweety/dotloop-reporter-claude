import { useState } from 'react';
import { X, Mail, UserCheck, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface BulkActionsBarProps {
  selectedCount: number;
  onClear: () => void;
  onBulkEmail?: (agentIds: string[]) => void;
  onBulkRoleChange?: (agentIds: string[], newRole: 'admin' | 'user') => void;
  onBulkCommissionAdjust?: (agentIds: string[], adjustment: number) => void;
  selectedIds: string[];
}

/**
 * BulkActionsBar Component
 * 
 * Displays action bar when agents are selected.
 * Provides bulk operations like email, role assignment, and commission adjustments.
 */
export default function BulkActionsBar({
  selectedCount,
  onClear,
  onBulkEmail,
  onBulkRoleChange,
  onBulkCommissionAdjust,
  selectedIds,
}: BulkActionsBarProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showCommissionDialog, setShowCommissionDialog] = useState(false);
  const [commissionAdjustment, setCommissionAdjustment] = useState('0');

  if (selectedCount === 0) return null;

  const handleRoleChange = (newRole: 'admin' | 'user') => {
    onBulkRoleChange?.(selectedIds, newRole);
    setShowRoleDialog(false);
  };

  const handleCommissionAdjust = () => {
    const adjustment = parseFloat(commissionAdjustment);
    if (!isNaN(adjustment)) {
      onBulkCommissionAdjust?.(selectedIds, adjustment);
      setCommissionAdjustment('0');
      setShowCommissionDialog(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-20 bg-primary/10 border-b border-primary/20 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-foreground">
            {selectedCount} selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Bulk Email */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onBulkEmail?.(selectedIds)}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            Email
          </Button>

          {/* Bulk Role Change */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRoleDialog(true)}
            className="gap-2"
          >
            <UserCheck className="w-4 h-4" />
            Role
          </Button>

          {/* Bulk Commission Adjust */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCommissionDialog(true)}
            className="gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Commission
          </Button>

          {/* Clear Selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            className="gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Role Change Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Role</AlertDialogTitle>
            <AlertDialogDescription>
              Select the new role for {selectedCount} selected agent{selectedCount !== 1 ? 's' : ''}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleRoleChange('user')}
              className="flex-1"
            >
              Regular User
            </Button>
            <Button
              variant="outline"
              onClick={() => handleRoleChange('admin')}
              className="flex-1"
            >
              Admin
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Commission Adjustment Dialog */}
      <AlertDialog open={showCommissionDialog} onOpenChange={setShowCommissionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adjust Commission</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the commission adjustment amount for {selectedCount} selected agent{selectedCount !== 1 ? 's' : ''}.
              Use positive numbers to increase, negative to decrease.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="number"
            value={commissionAdjustment}
            onChange={(e) => setCommissionAdjustment(e.target.value)}
            placeholder="Enter adjustment amount"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCommissionAdjust}>
              Apply Adjustment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
