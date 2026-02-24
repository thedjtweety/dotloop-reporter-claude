/**
 * Transaction Table Component
 * Reusable component to display a list of transactions
 * Optimized for mobile responsiveness with column visibility toggle
 */

import { DotloopRecord } from '@/lib/csvParser';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { CheckCircle2, Clock, Archive, AlertCircle, ChevronLeft, ChevronRight, Search, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import DotloopLogo from './DotloopLogo';
import ExpandableTransactionRow from './ExpandableTransactionRow';
import ResizableTableHeader from './ResizableTableHeader';
import { useState, useMemo, useEffect } from 'react';

interface TransactionTableProps {
  transactions: DotloopRecord[];
  limit?: number;
  compact?: boolean;
  onTransactionClick?: (transaction: DotloopRecord) => void;
  selectedRecords?: Set<number>;
  onSelectionChange?: (selected: Set<number>) => void;
  selectAll?: boolean;
  onSelectAllChange?: (selectAll: boolean) => void;
}

type ColumnKey = 'status' | 'property' | 'agent' | 'price' | 'commission' | 'date' | 'actions';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'status', label: 'Status', visible: true },
  { key: 'property', label: 'Property', visible: true },
  { key: 'agent', label: 'Agent', visible: true },
  { key: 'price', label: 'Price', visible: true },
  { key: 'commission', label: 'Commission', visible: true },
  { key: 'date', label: 'Date', visible: true },
  { key: 'actions', label: 'Actions', visible: true },
];

export default function TransactionTable({ 
  transactions, 
  limit, 
  compact = false, 
  onTransactionClick,
  selectedRecords = new Set(),
  onSelectionChange,
  selectAll = false,
  onSelectAllChange
}: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(() => {
    const saved = localStorage.getItem('transactionTableSearchQuery');
    return saved || '';
  });
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('transactionTableColumnWidths');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });
  const itemsPerPage = 20;

  // Load column preferences, sort preferences, and column widths from localStorage on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem('transactionTableColumns');
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        setColumns(parsed);
      } catch (e) {
        // If parsing fails, use defaults
        setColumns(DEFAULT_COLUMNS);
      }
    }

    const savedSort = localStorage.getItem('transactionTableSort');
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort);
        setSortField(parsed.field);
        setSortOrder(parsed.order);
      } catch (e) {
        // If parsing fails, use defaults
        setSortField(null);
        setSortOrder('asc');
      }
    }

    const savedWidths = localStorage.getItem('transactionTableColumnWidths');
    if (savedWidths) {
      try {
        const parsed = JSON.parse(savedWidths);
        setColumnWidths(parsed);
      } catch (e) {
        // If parsing fails, use defaults
        setColumnWidths({});
      }
    }
  }, []);

  // Save column preferences to localStorage when they change
  const updateColumnVisibility = (key: ColumnKey, visible: boolean) => {
    const updated = columns.map(col => 
      col.key === key ? { ...col, visible } : col
    );
    setColumns(updated);
    localStorage.setItem('transactionTableColumns', JSON.stringify(updated));
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
    localStorage.setItem('transactionTableColumns', JSON.stringify(DEFAULT_COLUMNS));
  };

  const handleColumnWidthChange = (columnKey: string, newWidth: number) => {
    const updated = { ...columnWidths, [columnKey]: newWidth };
    setColumnWidths(updated);
    localStorage.setItem('transactionTableColumnWidths', JSON.stringify(updated));
  };

  // Handle sort and persist to localStorage
  const handleSort = (field: string) => {
    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortField === field) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      setSortOrder(newOrder);
    } else {
      setSortField(field);
      setSortOrder('asc');
      newOrder = 'asc';
    }
    // Save to localStorage
    const fieldToSave = sortField === field ? field : field;
    localStorage.setItem('transactionTableSort', JSON.stringify({ field: fieldToSave, order: newOrder }));
  };

  // Persist search query to localStorage
  useEffect(() => {
    localStorage.setItem('transactionTableSearchQuery', searchQuery);
  }, [searchQuery]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.loopName?.toLowerCase().includes(query) ||
        t.address?.toLowerCase().includes(query) ||
        t.loopStatus?.toLowerCase().includes(query) ||
        t.agents?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (sortField) {
      result = [...result].sort((a, b) => {
        let aVal: any = a[sortField as keyof DotloopRecord];
        let bVal: any = b[sortField as keyof DotloopRecord];

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [transactions, searchQuery, sortField, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayTransactions = limit ? filteredTransactions.slice(0, limit) : filteredTransactions.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Closed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Active Listing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Under Contract':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'Archived':
        return <Archive className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Closed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 whitespace-nowrap">Closed</Badge>;
      case 'Active Listing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 whitespace-nowrap">Active</Badge>;
      case 'Under Contract':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 whitespace-nowrap">Under Contract</Badge>;
      case 'Archived':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 whitespace-nowrap">Archived</Badge>;
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{status || 'Unknown'}</Badge>;
    }
  };

  const isColumnVisible = (key: ColumnKey) => {
    return columns.find(col => col.key === key)?.visible ?? true;
  };

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-foreground">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Search Box and Column Toggle - only show if not using limit prop */}
      {!limit && (
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by property, address, status, or agent..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2"
            />
          </div>

          {/* Column Visibility Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Columns</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Show/Hide Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={col.visible}
                  onCheckedChange={(checked) => updateColumnVisibility(col.key, checked)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetColumns} className="text-xs text-muted-foreground">
                Reset to Default
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Results count */}
      {!limit && (
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length} transactions
          {searchQuery && ` (filtered from ${transactions.length} total)`}
        </div>
      )}

      <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-border">
            {onSelectionChange && (
              <TableHead className="font-semibold text-xs py-2 px-2 w-12">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => {
                    const newSelectAll = e.target.checked;
                    onSelectAllChange?.(newSelectAll);
                    if (newSelectAll) {
                      const allIndices = new Set(displayTransactions.map((_, i) => i));
                      onSelectionChange(allIndices);
                    } else {
                      onSelectionChange(new Set());
                    }
                  }}
                  className="w-4 h-4 cursor-pointer"
                  aria-label="Select all transactions"
                />
              </TableHead>
            )}
            <TableHead className="font-semibold text-xs py-2 px-2 w-8">Details</TableHead>
            {isColumnVisible('status') && (
              <TableHead
                onClick={() => handleSort('loopStatus')}
                className="font-semibold text-xs py-2 px-2 w-[100px] cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortField === 'loopStatus' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            )}
            {isColumnVisible('property') && (
              <TableHead
                onClick={() => handleSort('loopName')}
                className="font-semibold text-xs py-2 px-2 w-[220px] cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Property
                  {sortField === 'loopName' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            )}
            {isColumnVisible('agent') && (
              <TableHead
                onClick={() => handleSort('agents')}
                className="font-semibold text-xs py-2 px-2 w-[110px] cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Agent
                  {sortField === 'agents' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            )}
            {isColumnVisible('price') && (
              <TableHead
                onClick={() => handleSort('price')}
                className="font-semibold text-xs py-2 px-2 w-[90px] cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Price
                  {sortField === 'price' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            )}
            {isColumnVisible('commission') && (
              <TableHead
                onClick={() => handleSort('commission')}
                className="font-semibold text-xs py-2 px-2 w-[100px] cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Commission
                  {sortField === 'commission' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            )}
            {isColumnVisible('date') && (
              <TableHead
                onClick={() => handleSort('closingDate')}
                className="font-semibold text-xs py-2 px-2 w-[100px] cursor-pointer hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Date
                  {sortField === 'closingDate' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
            )}
            {isColumnVisible('actions') && (
              <TableHead className="font-semibold text-xs py-2 px-2 w-[90px] sticky right-0 bg-background z-10 border-l border-border">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayTransactions.map((transaction, idx) => {
            const visibleCols = (['status', 'property', 'agent', 'price', 'commission', 'date', 'actions'] as ColumnKey[]).filter(col => isColumnVisible(col));
            return (
              <ExpandableTransactionRow
                key={idx}
                transaction={transaction}
                visibleColumns={visibleCols}
                compact={compact}
                onTransactionClick={onTransactionClick}
                isSelected={selectedRecords.has(idx)}
                onSelectionChange={(selected) => {
                  if (onSelectionChange) {
                    const newSelected = new Set(selectedRecords);
                    if (selected) {
                      newSelected.add(idx);
                    } else {
                      newSelected.delete(idx);
                    }
                    onSelectionChange(newSelected);
                  }
                }}
                showCheckbox={!!onSelectionChange}
              />
            );
          })}
        </TableBody>
      </Table>
      </div>

      {/* Pagination Controls - only show if many pages */}
      {!limit && totalPages > 2 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Legacy limit message */}
      {limit && transactions.length > limit && (
        <p className="text-xs text-foreground mt-2 px-4 sm:px-0">
          Showing {limit} of {transactions.length} transactions
        </p>
      )}
    </div>
  );
}
