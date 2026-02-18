/**
 * Chart Animation Utilities
 * Provides reusable animation patterns for all Recharts visualizations
 */

export const chartAnimationConfig = {
  entrance: {
    duration: 600,
    easing: 'ease-out' as const,
  },
  bar: {
    animationBegin: 0,
    animationDuration: 800,
    animationEasing: 'ease-out' as const,
  },
  line: {
    animationBegin: 0,
    animationDuration: 1000,
    animationEasing: 'ease-out' as const,
  },
  area: {
    animationBegin: 0,
    animationDuration: 1000,
    animationEasing: 'ease-out' as const,
  },
};

export const chartTooltipConfig = {
  cursor: { fill: 'rgba(16, 185, 129, 0.1)' },
  contentStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
  },
};

export const chartGridConfig = {
  strokeDasharray: '3 3',
  stroke: '#e5e7eb',
  opacity: 0.3,
};

/**
 * Apply entrance animation to a chart container
 */
export function applyChartEntrance(element: HTMLElement | null, duration = 600) {
  if (!element) return;
  
  element.style.opacity = '0';
  element.style.transform = 'translateY(20px)';
  
  requestAnimationFrame(() => {
    if (element) {
      element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }
  });
}

/**
 * Create hover effect for chart bars/areas
 */
export function createHoverOpacity(hoveredItem: string | null, currentItem: string): number {
  return hoveredItem === null || hoveredItem === currentItem ? 1 : 0.5;
}

/**
 * Chart color palette
 */
export const chartColors = {
  primary: '#1e3a5f',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
};

/**
 * Create gradient definitions for charts
 */
export function createGradientDef(id: string, color: string, opacity1 = 0.9, opacity2 = 0.6) {
  return {
    id,
    color,
    opacity1,
    opacity2,
  };
}
