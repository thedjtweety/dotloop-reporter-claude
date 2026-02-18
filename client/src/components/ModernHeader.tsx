import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { ModeToggle } from '@/components/ModeToggle';
import { Button } from '@/components/ui/button';
import { Calendar, LogOut, Settings, Menu, X, Zap } from 'lucide-react';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { DateRange } from 'react-day-picker';

interface ModernHeaderProps {
  dateRange?: DateRange;
  setDateRange?: (range: DateRange | undefined) => void;
  title?: string;
  onDemoClick?: () => void;
  isDemoLoading?: boolean;
}

export default function ModernHeader({ dateRange, setDateRange, title = 'Dotloop Reporter', onDemoClick, isDemoLoading }: ModernHeaderProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-card/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10">
              <span className="text-lg font-bold text-accent">D</span>
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
              <p className="text-xs text-foreground/60">Real Estate Analytics</p>
            </div>
          </div>

          {/* Center: Date Range Picker (Desktop Only) */}
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xs">
            <Calendar className="w-4 h-4 text-foreground/60" />
            {setDateRange && <DatePickerWithRange date={dateRange} setDate={setDateRange} />}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Demo Button */}
            {onDemoClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDemoClick}
                disabled={isDemoLoading}
                className="hidden sm:flex items-center gap-2 text-foreground/70 hover:text-foreground"
              >
                <Zap className="w-4 h-4" />
                {isDemoLoading ? 'Loading...' : 'Try Demo'}
              </Button>
            )}

            {/* Theme Toggle */}
            <ModeToggle />

            {/* User Menu (Desktop) */}
            <div className="hidden sm:flex items-center gap-2">
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-foreground hidden md:inline truncate max-w-[100px]">
                    {user.email?.split('@')[0]}
                  </span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-foreground/70 hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Date Picker */}
        <div className="lg:hidden border-t border-border/50 px-4 py-3 bg-card/50">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-foreground/60 flex-shrink-0" />
            {setDateRange && <DatePickerWithRange date={dateRange} setDate={setDateRange} />}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 top-20 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
          <div className="container py-4 space-y-3">
            {user && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  <p className="text-xs text-foreground/60">Signed in</p>
                </div>
              </div>
            )}

            {onDemoClick && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={onDemoClick}
                disabled={isDemoLoading}
              >
                <Zap className="w-4 h-4 mr-2" />
                {isDemoLoading ? 'Loading Demo...' : 'Try Demo'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
