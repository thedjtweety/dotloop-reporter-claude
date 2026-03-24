/**
 * Filter and Sort Utilities for Drill-Down Data
 * Provides functions for filtering and sorting transaction records
 */

import { DotloopRecord } from './csvParser';

export interface DrillDownFilters {
  searchQuery: string;
  status?: string;
  agent?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export type SortField = 'status' | 'address' | 'agentName' | 'listPrice' | 'soldPrice' | 'commission' | 'daysToClose' | 'closeDate';
export type SortOrder = 'asc' | 'desc';

export interface SortState {
  field: SortField;
  order: SortOrder;
}

/**
 * Filter transactions based on search and filter criteria
 */
export function filterTransactions(
  records: DotloopRecord[],
  filters: DrillDownFilters
): DotloopRecord[] {
  return records.filter(record => {
    // Search query filter - searches across multiple fields
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch = 
        record.address?.toLowerCase().includes(query) ||
        record.city?.toLowerCase().includes(query) ||
        record.state?.toLowerCase().includes(query) ||
        record.agentName?.toLowerCase().includes(query) ||
        record.status?.toLowerCase().includes(query) ||
        record.propertyType?.toLowerCase().includes(query) ||
        record.leadSource?.toLowerCase().includes(query) ||
        record.notes?.toLowerCase().includes(query);
      
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'All') {
      if (record.status !== filters.status) return false;
    }

    // Agent filter
    if (filters.agent && filters.agent !== 'All') {
      // Handle comma-separated agent names
      const agents = record.agents ? record.agents.split(',').map(a => a.trim()) : [];
      if (!agents.includes(filters.agent)) return false;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      if (record.closeDate) {
        const recordDate = new Date(record.closeDate);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (recordDate < fromDate) return false;
        }

        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (recordDate > toDate) return false;
        }
      } else if (filters.dateFrom || filters.dateTo) {
        // If date filter is applied but record has no close date, exclude it
        return false;
      }
    }

    return true;
  });
}

/**
 * Sort transactions based on sort state
 */
export function sortTransactions(
  records: DotloopRecord[],
  sortState: SortState | null
): DotloopRecord[] {
  if (!sortState) return records;

  const sorted = [...records].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortState.field) {
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'address':
        aValue = a.address || '';
        bValue = b.address || '';
        break;
      case 'agentName':
        aValue = a.agentName || '';
        bValue = b.agentName || '';
        break;
      case 'listPrice':
        aValue = a.listPrice || 0;
        bValue = b.listPrice || 0;
        break;
      case 'soldPrice':
        aValue = a.soldPrice || 0;
        bValue = b.soldPrice || 0;
        break;
      case 'commission':
        aValue = a.commission || 0;
        bValue = b.commission || 0;
        break;
      case 'daysToClose':
        aValue = a.daysToClose || 0;
        bValue = b.daysToClose || 0;
        break;
      case 'closeDate':
        aValue = a.closeDate ? new Date(a.closeDate).getTime() : 0;
        bValue = b.closeDate ? new Date(b.closeDate).getTime() : 0;
        break;
      default:
        return 0;
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortState.order === 'asc' ? comparison : -comparison;
    }

    // Handle numeric comparison
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue;
      return sortState.order === 'asc' ? comparison : -comparison;
    }

    return 0;
  });

  return sorted;
}

/**
 * Apply both filtering and sorting to transactions
 */
export function filterAndSortTransactions(
  records: DotloopRecord[],
  filters: DrillDownFilters,
  sortState: SortState | null
): DotloopRecord[] {
  const filtered = filterTransactions(records, filters);
  return sortTransactions(filtered, sortState);
}

/**
 * Get unique values for a specific field (for filter dropdowns)
 */
export function getUniqueValues(records: DotloopRecord[], field: 'status' | 'agentName'): string[] {
  const values = new Set<string>();
  records.forEach(record => {
    if (field === 'status') {
      if (record.status) {
        values.add(record.status);
      }
    } else if (field === 'agentName') {
      // Handle comma-separated agent names
      if (record.agents) {
        const agents = record.agents.split(',').map(a => a.trim()).filter(a => a);
        agents.forEach(agent => values.add(agent));
      }
    }
  });
  return Array.from(values).sort();
}
