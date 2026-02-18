/**
 * PerformanceBadge Component
 * Displays data freshness timestamp and processing speed indicators
 */

import { Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceBadgeProps {
  lastUpdated?: Date;
  processingTimeMs?: number;
  isLoading?: boolean;
  className?: string;
}

/**
 * Format time difference to human-readable format
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export default function PerformanceBadge({
  lastUpdated,
  processingTimeMs,
  isLoading = false,
  className,
}: PerformanceBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700',
        className
      )}
    >
      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {isLoading ? 'Updating...' : formatTimeAgo(lastUpdated)}
          </span>
        </div>
      )}

      {/* Processing Speed */}
      {processingTimeMs !== undefined && (
        <>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-600" />
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              {processingTimeMs}ms
            </span>
          </div>
        </>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="ml-auto">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
      )}
    </div>
  );
}
