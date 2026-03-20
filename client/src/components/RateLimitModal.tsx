/**
 * Rate Limit Modal Component
 * Shows friendly "please wait" message when rate limit is hit
 * Displays estimated retry time and automatic retry countdown
 */

import React, { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import FullScreenModal from '@/components/FullScreenModal';

export interface RateLimitModalProps {
  isOpen: boolean;
  retryAfterMs: number;
  queuedRequests: number;
  onClose?: () => void;
}

export const RateLimitModal: React.FC<RateLimitModalProps> = ({
  isOpen,
  retryAfterMs,
  queuedRequests,
  onClose,
}) => {
  const [remainingMs, setRemainingMs] = useState(retryAfterMs);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, retryAfterMs - elapsed);
      setRemainingMs(remaining);
      setProgress((remaining / retryAfterMs) * 100);

      if (remaining === 0) {
        clearInterval(interval);
        // Auto-close after showing completion
        setTimeout(() => {
          onClose?.();
        }, 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, retryAfterMs, onClose]);

  const seconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const displaySeconds = seconds % 60;

  const timeDisplay =
    minutes > 0
      ? `${minutes}m ${displaySeconds}s`
      : `${displaySeconds}s`;

  return (
    <FullScreenModal
      isOpen={isOpen}
      onClose={onClose || (() => {})}
      title="High Traffic Detected"
      subtitle="We're experiencing high traffic. Your request is queued and will be processed shortly."
    >
      <div className="max-w-2xl mx-auto py-12">
        <div className="space-y-6">
          {/* Status Message */}
          <div className="bg-muted border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <Clock className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  Estimated wait time
                </p>
                <p className="text-4xl font-bold text-primary mt-2">
                  {timeDisplay}
                </p>
              </div>
            </div>

            {queuedRequests > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t border-border">
                <Zap className="w-4 h-4 flex-shrink-0" />
                <span>
                  {queuedRequests} request{queuedRequests > 1 ? 's' : ''} queued
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing queue</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              className="h-3"
            />
          </div>

          {/* Info Box */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 space-y-3">
            <p className="text-sm text-primary font-medium">
              ✓ Your request is safe and will be processed automatically
            </p>
            <p className="text-sm text-primary">
              ✓ No need to refresh or resubmit
            </p>
            <p className="text-sm text-primary">
              ✓ You'll be notified when processing is complete
            </p>
          </div>

          {/* Helpful Tips */}
          <div className="bg-muted rounded-lg p-6 space-y-4">
            <p className="text-sm font-medium text-foreground">💡 While you wait:</p>
            <ul className="text-sm text-muted-foreground space-y-2 ml-4">
              <li>• Review your CSV file for data quality</li>
              <li>• Check the Data Quality Tips section</li>
              <li>• Prepare your commission plan settings</li>
            </ul>
          </div>
        </div>
      </div>
    </FullScreenModal>
  );
};

export default RateLimitModal;
