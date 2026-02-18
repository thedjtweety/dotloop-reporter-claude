/**
 * TabAnimation Component
 * Provides smooth fade-in and slide-up animations for tab content transitions
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabAnimationProps {
  children: ReactNode;
  isVisible: boolean;
  duration?: number;
  className?: string;
}

export default function TabAnimation({
  children,
  isVisible,
  duration = 400,
  className,
}: TabAnimationProps) {
  return (
    <div
      className={cn(
        'transition-all',
        isVisible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none',
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
}
