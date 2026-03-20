/**
 * Seed Data Button Component
 * 
 * Provides UI trigger to seed sample commission plans and agent assignments
 * into the database for testing and demonstration purposes.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import FullScreenModal from '@/components/FullScreenModal';

interface SeedDataButtonProps {
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export default function SeedDataButton({
  onSuccess,
  variant = 'outline',
  size = 'default',
}: SeedDataButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const seedMutation = trpc.seed.seedSampleData.useMutation();
  const clearMutation = trpc.seed.clearSampleData.useMutation();

  const handleSeed = async () => {
    try {
      setIsLoading(true);
      await seedMutation.mutateAsync();
      toast.success('Sample data seeded successfully! 3 plans and 10 agents created.');
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to seed data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      setIsLoading(true);
      await clearMutation.mutateAsync();
      toast.success('Sample data cleared successfully!');
      setIsClearOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error(`Failed to clear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant={variant}
          size={size}
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          Seed Sample Data
        </Button>
        <Button
          variant="ghost"
          size={size}
          onClick={() => setIsClearOpen(true)}
          disabled={isLoading}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Clear
        </Button>
      </div>

      {/* Seed Data Confirmation Modal */}
      <FullScreenModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Seed Sample Data?"
        subtitle="This will create 3 sample commission plans and 10 sample agents with assignments."
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSeed}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Seeding...
                </>
              ) : (
                'Seed Data'
              )}
            </Button>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto py-12">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">Sample Plans:</h3>
              <ul className="space-y-3 text-foreground">
                <li className="flex gap-3">
                  <span className="text-primary font-semibold">•</span>
                  <div>
                    <strong>Standard:</strong> 80/20 split with $18K cap
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-semibold">•</span>
                  <div>
                    <strong>Aggressive:</strong> 90/10 split with $25K cap (sliding scale)
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-primary font-semibold">•</span>
                  <div>
                    <strong>Conservative:</strong> 70/30 split with $12K cap
                  </div>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Sample Agents:</h3>
              <p className="text-muted-foreground">
                10 agents will be created and assigned to plans with various anniversary dates for testing YTD calculations.
              </p>
            </div>
          </div>
        </div>
      </FullScreenModal>

      {/* Clear Data Confirmation Modal */}
      <FullScreenModal
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        title="Clear Sample Data?"
        subtitle="This will delete all sample commission plans and agent assignments. This action cannot be undone."
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsClearOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleClear}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Clearing...
                </>
              ) : (
                'Clear Data'
              )}
            </Button>
          </div>
        }
      >
        <div className="max-w-2xl mx-auto py-12 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center space-y-6">
            <p className="text-lg text-muted-foreground">
              Are you sure you want to clear all sample data? This action cannot be undone.
            </p>
          </div>
        </div>
      </FullScreenModal>
    </>
  );
}
