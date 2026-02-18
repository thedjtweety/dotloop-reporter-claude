import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardModernProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  status?: 'active' | 'pending' | 'closed' | 'archived';
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'highlight';
}

export default function MetricCardModern({
  title,
  value,
  icon,
  trend,
  status,
  onClick,
  className,
  variant = 'default',
}: MetricCardModernProps) {
  const statusStyles = {
    active: 'bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
    pending: 'bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
    closed: 'bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
    archived: 'bg-slate-500/10 border-slate-200 dark:border-slate-500/30',
  };

  const statusTextStyles = {
    active: 'text-emerald-600 dark:text-emerald-400',
    pending: 'text-amber-600 dark:text-amber-400',
    closed: 'text-blue-600 dark:text-blue-400',
    archived: 'text-slate-600 dark:text-slate-400',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'metric-card group',
        variant === 'highlight' && 'ring-2 ring-accent/50 bg-card/80',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Header with Icon and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="property-icon">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="metric-card-title">{title}</p>
          </div>
        </div>
        {status && (
          <div className={cn(
            'status-badge text-xs px-2 py-1 rounded-full border',
            statusStyles[status],
            statusTextStyles[status]
          )}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <p className="metric-card-value">{value}</p>
      </div>

      {/* Trend Indicator */}
      {trend && (
        <div className={cn(
          'metric-card-trend',
          trend.isPositive ? 'positive' : 'negative'
        )}>
          {trend.isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : trend.value !== 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          <span className="font-semibold">
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          {trend.label && (
            <span className="text-foreground/60 ml-1">{trend.label}</span>
          )}
        </div>
      )}

      {/* Hover Effect Indicator */}
      {onClick && (
        <div className="absolute inset-0 rounded-xl bg-accent/0 group-hover:bg-accent/5 transition-colors pointer-events-none" />
      )}
    </div>
  );
}
