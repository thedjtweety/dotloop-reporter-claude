import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

/**
 * PageHeader Component
 * 
 * Sticky header that stays visible while scrolling through page content.
 * Includes title, subtitle, and optional search functionality.
 * 
 * Usage:
 * ```tsx
 * <PageHeader 
 *   title="Agents"
 *   subtitle="Manage your team"
 *   onSearch={(query) => setSearchQuery(query)}
 *   searchPlaceholder="Search by name or email..."
 * />
 * ```
 */
export default function PageHeader({
  title,
  subtitle,
  onSearch,
  searchPlaceholder = 'Search...',
  children,
}: PageHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  }, [onSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    onSearch?.('');
  }, [onSearch]);

  return (
    <div className="sticky top-0 z-10 bg-background border-b border-border shadow-sm">
      <div className="px-6 py-4 space-y-4">
        {/* Title Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-foreground/70 mt-1">{subtitle}</p>
          )}
        </div>

        {/* Search and Controls Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search Bar */}
          {onSearch && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Additional Controls */}
          {children && (
            <div className="flex gap-2 w-full sm:w-auto">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
