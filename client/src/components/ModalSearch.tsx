import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

interface HighlightedTextProps {
  text: string;
  searchTerm: string;
}

/**
 * Highlights search term in text with yellow background
 */
export function HighlightedText({ text, searchTerm }: HighlightedTextProps) {
  if (!searchTerm || !text) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() 
          ? <mark key={i} className="bg-yellow-400/50 font-semibold">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

interface ModalSearchProps {
  placeholder?: string;
  onSearchChange: (searchTerm: string) => void;
  resultCount?: number;
  totalCount?: number;
}

/**
 * Reusable search input component for modals
 * Provides real-time search with result count display
 */
export function ModalSearch({
  placeholder = 'Search...',
  onSearchChange,
  resultCount,
  totalCount,
}: ModalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    onSearchChange(value);
  }, [onSearchChange]);

  const handleClear = useCallback(() => {
    setSearchTerm('');
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {resultCount !== undefined && totalCount !== undefined && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {resultCount} of {totalCount}
        </span>
      )}
    </div>
  );
}
