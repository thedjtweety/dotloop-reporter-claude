/**
 * Rate Limit Modal Component
 * Shows friendly "please wait" message when rate limit is hit
 * Displays estimated retry time and automatic retry countdown
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, Zap } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-yellow-500" />
            High Traffic Detected
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            We're experiencing high traffic. Your request is queued and will be processed shortly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Message */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Estimated wait time
                </p>
                <p className="text-2xl font-bold text-blue-400 mt-1">
                  {timeDisplay}
                </p>
              </div>
            </div>

            {queuedRequests > 0 && (
              <div className="flex items-center gap-2 text-sm text-slate-300 pt-2 border-t border-slate-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  {queuedRequests} request{queuedRequests > 1 ? 's' : ''} queued
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Processing queue</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress
              value={progress}
              className="h-2 bg-slate-700"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              ✓ Your request is safe and will be processed automatically
            </p>
            <p className="text-xs text-blue-200 mt-1">
              ✓ No need to refresh or resubmit
            </p>
            <p className="text-xs text-blue-200 mt-1">
              ✓ You'll be notified when processing is complete
            </p>
          </div>

          {/* Helpful Tips */}
          <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-slate-300">💡 While you wait:</p>
            <ul className="text-xs text-slate-400 space-y-1 ml-4">
              <li>• Review your CSV file for data quality</li>
              <li>• Check the Data Quality Tips section</li>
              <li>• Prepare your commission plan settings</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RateLimitModal;
