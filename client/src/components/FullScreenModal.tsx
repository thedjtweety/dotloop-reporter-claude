import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FullScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  subtitle?: string;
  showHeader?: boolean;
  headerActions?: ReactNode;
}

export default function FullScreenModal({
  isOpen,
  onClose,
  title,
  children,
  subtitle,
  showHeader = true,
  headerActions,
}: FullScreenModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      {showHeader && (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="container flex h-16 items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            
            <div className="flex items-center gap-4">
              {headerActions}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-10 w-10 rounded-full hover:bg-destructive/10"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 text-foreground" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container overflow-auto h-[calc(100vh-64px)]">
        {children}
      </div>

      {/* Keyboard shortcut: ESC to close */}
      <div
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        }}
        tabIndex={-1}
      />
    </div>
  );
}
