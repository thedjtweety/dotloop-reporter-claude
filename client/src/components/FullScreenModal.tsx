import { ReactNode, useEffect } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  subtitle?: string;
  showHeader?: boolean;
  headerActions?: ReactNode;
  onBack?: () => void;
  showBackButton?: boolean;
  breadcrumbs?: Array<{ label: string; onClick: () => void }>;
}

export default function FullScreenModal({
  isOpen,
  onClose,
  title,
  children,
  subtitle,
  showHeader = true,
  headerActions,
  onBack,
  showBackButton = false,
  breadcrumbs,
}: FullScreenModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Header */}
      {showHeader && (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container px-4 sm:px-6 lg:px-8 flex flex-col gap-3 py-3">
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      onClick={crumb.onClick}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </button>
                    {idx < breadcrumbs.length - 1 && (
                      <span className="text-muted-foreground">/</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Main Header Row */}
            <div className="flex h-14 items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {showBackButton && onBack && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                    className="h-10 w-10 rounded-full flex-shrink-0"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="h-5 w-5 text-foreground" />
                  </Button>
                )}
                <div className="flex-1 min-w-0">
                  <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-foreground truncate">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {/* Header Actions and Close Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {headerActions && (
                  <div className="hidden sm:flex items-center gap-2">
                    {headerActions}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 rounded-full hover:bg-destructive/10 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-foreground" />
                </Button>
              </div>
            </div>

            {/* Mobile Header Actions */}
            {headerActions && (
              <div className="flex sm:hidden items-center gap-2 pb-2">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="overflow-auto h-[calc(100vh-64px)] sm:h-[calc(100vh-80px)]">
        <div className="container px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
