import { useRef, useState, useEffect } from 'react';
import { Download, Printer, Search, ExternalLink } from 'lucide-react';
import { DotloopRecord } from '@/lib/csvParser';
import TransactionTable from './TransactionTable';
import TransactionInfoModal from './TransactionInfoModal';
import { exportAsCSV, exportAsExcel, openPrintDialog, exportFilteredToCSV, exportFilteredToExcel } from '@/lib/exportUtils';
import { filterAndSortTransactions, DrillDownFilters, SortState, getUniqueValues } from '@/lib/filterUtils';
import { openMultipleInDotloop } from '@/lib/dotloopUtils';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import BulkActionsToolbar from './BulkActionsToolbar';
import FavoritesSelector from './FavoritesSelector';
import BookmarkManager from './BookmarkManager';
import { saveBookmark, getBookmarks, FilterBookmark } from '@/lib/bookmarkUtils';
import FullScreenModal from '@/components/FullScreenModal';
import { Button } from '@/components/ui/button';

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  transactions: DotloopRecord[];
  onSortChange?: (sortState: SortState | null) => void;
}

export default function DrillDownModal({
  isOpen,
  onClose,
  title,
  transactions,
  onSortChange,
}: DrillDownModalProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [filters, setFilters] = useState<DrillDownFilters>(() => {
    const saved = localStorage.getItem('drillDownFilters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { searchQuery: '', status: 'All', agent: 'All' };
      }
    }
    return { searchQuery: '', status: 'All', agent: 'All' };
  });
  const [sortState, setSortState] = useState<SortState | null>(() => {
    const saved = localStorage.getItem('drillDownSortState');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkName, setBookmarkName] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<DotloopRecord | null>(null);
  const [showTransactionInfo, setShowTransactionInfo] = useState(false);

  const handleTransactionClick = (transaction: DotloopRecord) => {
    setSelectedTransaction(transaction);
    setShowTransactionInfo(true);
  };

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('drillDownFilters', JSON.stringify(filters));
  }, [filters]);

  // Persist sort state to localStorage
  useEffect(() => {
    if (sortState) {
      localStorage.setItem('drillDownSortState', JSON.stringify(sortState));
    } else {
      localStorage.removeItem('drillDownSortState');
    }
  }, [sortState]);

  // Get unique values for filters
  const uniqueStatuses = ['All', ...getUniqueValues(transactions, 'status')];
  const uniqueAgents = ['All', ...getUniqueValues(transactions, 'agentName')];

  // Apply filters and sorting
  const filteredTransactions = filterAndSortTransactions(transactions, filters, sortState);

  // Get selected transaction records
  const selectedTransactionRecords = Array.from(selectedRecords).map(index => filteredTransactions[index]);

  // Sync scrollbar with table scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    const scrollbar = scrollbarRef.current;
    const thumb = scrollbarThumbRef.current;

    if (!container || !scrollbar || !thumb) return;

    const updateScrollbar = () => {
      const scrollPercentage = container.scrollLeft / (container.scrollWidth - container.clientWidth);
      const thumbWidth = (container.clientWidth / container.scrollWidth) * scrollbar.clientWidth;
      thumb.style.width = `${thumbWidth}px`;
      thumb.style.left = `${scrollPercentage * (scrollbar.clientWidth - thumbWidth)}px`;
    };

    container.addEventListener('scroll', updateScrollbar);
    updateScrollbar();

    return () => container.removeEventListener('scroll', updateScrollbar);
  }, [filteredTransactions]);

  // Handle scrollbar thumb drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const scrollbar = scrollbarRef.current;
      const container = scrollContainerRef.current;
      if (!scrollbar || !container) return;

      const scrollbarRect = scrollbar.getBoundingClientRect();
      const thumbWidth = scrollbarThumbRef.current?.clientWidth || 0;
      const maxLeft = scrollbar.clientWidth - thumbWidth;
      const newLeft = Math.max(0, Math.min(maxLeft, e.clientX - scrollbarRect.left));
      const scrollPercentage = newLeft / maxLeft;
      container.scrollLeft = scrollPercentage * (container.scrollWidth - container.clientWidth);
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <>
      <FullScreenModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        subtitle={`Showing ${filteredTransactions.length} of ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
        headerActions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFilteredToCSV(filteredTransactions, title, bookmarkName || undefined)}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFilteredToExcel(filteredTransactions, title, bookmarkName || undefined)}
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openPrintDialog({ title, records: filteredTransactions })}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {filteredTransactions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openMultipleInDotloop(filteredTransactions)}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View in Dotloop
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 py-6">
          {/* Filter Controls */}
          <div className="space-y-3 sticky top-0 z-10 bg-background pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by address, agent, property type..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filters.status || 'All'} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.agent || 'All'} onValueChange={(value) => setFilters({ ...filters, agent: value })}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Agent" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueAgents.map(agent => (
                    <SelectItem key={agent} value={agent}>
                      {agent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Favorites and Bookmarks */}
            <div className="flex items-center gap-2 flex-wrap">
              <FavoritesSelector
                transactions={filteredTransactions}
                onApply={(bookmark) => {
                  setFilters(bookmark.filters);
                  setSortState(bookmark.sortState);
                }}
              />
              <BookmarkManager
                isOpen={showBookmarkDialog}
                onOpenChange={setShowBookmarkDialog}
                onSaveBookmark={(name) => {
                  const bookmark: FilterBookmark = {
                    id: Date.now().toString(),
                    name,
                    filters,
                    sortState,
                    timestamp: new Date().toISOString(),
                  };
                  const existing = getBookmarks();
                  saveBookmark([...existing, bookmark]);
                  setBookmarkName(name);
                  setShowBookmarkDialog(false);
                }}
              />
            </div>
          </div>

          {/* Transaction Table */}
          <div ref={scrollContainerRef} className="overflow-x-auto">
            <TransactionTable
              transactions={filteredTransactions}
              selectedRecords={selectedRecords}
              selectAll={selectAll}
              onSelectChange={setSelectedRecords}
              onSelectAllChange={setSelectAll}
              onTransactionClick={handleTransactionClick}
              sortState={sortState}
              onSortChange={(newSort) => {
                setSortState(newSort);
                onSortChange?.(newSort);
              }}
            />
          </div>

          {/* Custom Scrollbar */}
          <div ref={scrollbarRef} className="h-2 bg-muted rounded-full relative">
            <div
              ref={scrollbarThumbRef}
              className="h-full bg-primary rounded-full cursor-grab active:cursor-grabbing"
              onMouseDown={() => setIsDragging(true)}
            />
          </div>
        </div>
      </FullScreenModal>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedRecords={selectedTransactionRecords}
        allRecords={filteredTransactions}
        title={title}
        isVisible={selectedRecords.size > 0}
      />

      {/* Transaction Info Modal */}
      <TransactionInfoModal
        isOpen={showTransactionInfo}
        onClose={() => setShowTransactionInfo(false)}
        transaction={selectedTransaction}
      />
    </>
  );
}
