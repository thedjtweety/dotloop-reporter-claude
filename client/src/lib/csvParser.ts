/**
 * CSV Parser and Data Analysis Utilities for Dotloop Reports
 * Handles parsing, validation, and transformation of Dotloop CSV exports
 */

export interface DotloopRecord {
  loopId: string;
  loopViewUrl: string;
  loopName: string;
  loopStatus: string;
  createdDate: string;
  closingDate: string;
  listingDate: string;
  offerDate: string;
  address: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  city: string;
  state: string;
  county: string;
  leadSource: string;
  earnestMoney: number;
  salePrice: number;
  commissionRate: number;
  commissionTotal: number;
  agents: string;
  createdBy: string;
  buySideCommission: number;
  sellSideCommission: number;
  companyDollar: number;
  referralSource: string;
  referralPercentage: number;
  complianceStatus: string;
  tags: string[];
  originalPrice: number;
  yearBuilt: number;
  lotSize: number;
  subdivision: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  sellerName?: string;
  sellerEmail?: string;
  sellerPhone?: string;
  [key: string]: any;
}

export interface MetricTrend {
  value: number;
  direction: 'up' | 'down' | 'neutral';
}

export interface DashboardMetrics {
  totalTransactions: number;
  activeListings: number;
  underContract: number;
  closed: number;
  archived: number;
  totalSalesVolume: number;
  averagePrice: number;
  totalCommission: number;
  totalCompanyDollar: number; // Added field
  averageDaysToClose: number;
  closingRate: number;
  hasFinancialData: boolean; // New flag to indicate if financial data is present
  trends?: {
    totalTransactions: MetricTrend;
    totalVolume: MetricTrend;
    avgCommission: MetricTrend;
    avgSalePrice: MetricTrend;
    avgDaysToClose: MetricTrend;
    closingRate: MetricTrend;
  };
}

export interface ChartData {
  label: string;
  value: number;
  percentage?: number;
  movingAverage?: number;
}

export interface AgentMetrics {
  agentName: string;
  totalTransactions: number;
  closedDeals: number;
  closingRate: number;
  totalCommission: number;
  averageCommission: number;
  totalSalesVolume: number;
  averageSalesPrice: number;
  averageDaysToClose: number;
  activeListings: number;
  underContract: number;
  buySideCommission: number;
  sellSideCommission: number;
  buySidePercentage: number;
  sellSidePercentage: number;
  companyDollar: number;
}

/**
 * Progress callback for parsing operations
 */
export type ParseProgressCallback = (progress: number, message?: string) => void;

/**
 * Parse CSV string into records with progress tracking
 */
export function parseCSV(
  csvContent: string,
  onProgress?: ParseProgressCallback
): DotloopRecord[] {
  onProgress?.(0, 'Starting CSV parsing...');
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 1) {
    onProgress?.(100, 'No data to parse');
    return [];
  }
  
  onProgress?.(10, `Processing ${lines.length} lines...`);

  // Check if first line is a header or data
  const firstLine = lines[0];
  const firstLineFields = parseCSVLine(firstLine);
  
  // Heuristic: If first line contains "Price", "Date", "Address", etc., it's a header.
  // If it contains specific names, dates (e.g. "6/21/2017"), or numbers, it's data.
  const isHeader = firstLineFields.some(f => 
    ['Agent Name', 'Loop Name', 'Price', 'Closing Date', 'Address', 'Lead Source'].some(h => 
      f.toLowerCase().includes(h.toLowerCase())
    )
  );

  let headers: string[] = [];
  let startIndex = 0;

  if (isHeader) {
    headers = firstLineFields.map(h => h.trim());
    startIndex = 1;
  } else {
    // Default mapping for headless CSV (ReportBuilding.csv format)
    // Based on analysis: 
    // 0: Agent Name, 1: Address, 2: Lead Source, 3: Listing Date, 4: Price, 5: Status, 
    // 6: Contract Date, 7: Closing Date, 8: Review Status, 9: Comm Split?, 10: Side, 
    // 11: Total Comm, 12: Rate, 13: Buy Comm, 14: Sell Comm, 15: Buy %, 16: Sell %
    headers = [
      'Agents',           // 0
      'Address',          // 1
      'Lead Source',      // 2
      'Listing Date',     // 3
      'Price',            // 4
      'Loop Status',      // 5
      'Offer Date',       // 6
      'Closing Date',     // 7
      'Review Status',    // 8
      'Commission Split', // 9
      'Transaction Side', // 10
      'Total Commission', // 11
      'Commission Rate',  // 12
      'Buy Side Commission', // 13
      'Sell Side Commission', // 14
      'Buy Side %',       // 15
      'Sell Side %'       // 16
    ];
    startIndex = 0; // Start parsing from the first line
  }

  const records: DotloopRecord[] = [];
  const totalLines = lines.length - startIndex;

  for (let i = startIndex; i < lines.length; i++) {
    // Update progress every 100 lines
    if (i % 100 === 0) {
      const progress = 10 + Math.round((i - startIndex) / totalLines * 80);
      onProgress?.(progress, `Parsed ${i - startIndex} of ${totalLines} records...`);
    }
    const line = lines[i];
    if (!line.trim()) continue;

    // Skip lines that look like empty commas (e.g. ",,,,,,,,,")
    if (line.replace(/,/g, '').trim().length === 0) continue;

    try {
      const fields = parseCSVLine(line);
      const record: any = {};

      headers.forEach((header, index) => {
        record[header] = fields[index] || '';
      });

      // Map to normalized fields
      const normalized = normalizeRecord(record);
      if (normalized) {
        records.push(normalized);
      }
    } catch (error) {
      console.error('Error parsing line', i, ':', error);
    }
  }
  
  onProgress?.(100, `Parsed ${records.length} records successfully`);

  return records;
}

/**
 * Calculate agent performance metrics
 */
export function calculateAgentMetrics(records: DotloopRecord[]): AgentMetrics[] {
  const agentMap = new Map<string, any>();

  records.forEach(record => {
    // Handle multiple agents (comma-separated)
    const agents = record.agents
      ? record.agents.split(',').map(a => a.trim()).filter(a => a)
      : [];

    const status = (record.loopStatus || '').toLowerCase();
    const isClosed = status === 'closed' || status === 'sold';
    const isActive = status.includes('active');
    const isUC = status === 'under contract';

    agents.forEach(agentName => {
      if (!agentMap.has(agentName)) {
        agentMap.set(agentName, {
          agentName,
          totalTransactions: 0,
          closedDeals: 0,
          totalCommission: 0,
          totalSalesVolume: 0,
          daysToCloseList: [],
          activeListings: 0,
          underContract: 0,
          buySideCommission: 0,
          sellSideCommission: 0,
          companyDollar: 0,
        });
      }

      const agent = agentMap.get(agentName)!;
      agent.totalTransactions++;

      if (isClosed) {
        agent.closedDeals++;
        // Only accumulate financial metrics for closed deals
        agent.totalCommission += record.commissionTotal || 0;
        agent.totalSalesVolume += record.salePrice || record.price || 0;
        agent.buySideCommission += record.buySideCommission || 0;
        agent.sellSideCommission += record.sellSideCommission || 0;
        agent.companyDollar += record.companyDollar || 0;

        // Days to close: prefer listingDate, fall back to createdDate
        const startDateStr = record.listingDate || record.createdDate;
        if (record.closingDate && startDateStr) {
          const start = new Date(startDateStr);
          const closing = new Date(record.closingDate);
          if (!isNaN(start.getTime()) && !isNaN(closing.getTime())) {
            const daysToClose = Math.ceil(
              (closing.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysToClose > 0) {
              agent.daysToCloseList.push(daysToClose);
            }
          }
        }
      } else if (isActive) {
        agent.activeListings++;
      } else if (isUC) {
        agent.underContract++;
      }
    });
  });

  // Convert to array and calculate final metrics
  return Array.from(agentMap.values())
    .map(agent => ({
      agentName: agent.agentName,
      totalTransactions: agent.totalTransactions,
      closedDeals: agent.closedDeals,
      closingRate:
        agent.totalTransactions > 0
          ? (agent.closedDeals / agent.totalTransactions) * 100
          : 0,
      totalCommission: agent.totalCommission,
      averageCommission:
        agent.closedDeals > 0
          ? agent.totalCommission / agent.closedDeals
          : 0,
      totalSalesVolume: agent.totalSalesVolume,
      averageSalesPrice:
        agent.closedDeals > 0
          ? agent.totalSalesVolume / agent.closedDeals
          : 0,
      averageDaysToClose:
        agent.daysToCloseList.length > 0
          ? Math.round(
              agent.daysToCloseList.reduce((a: number, b: number) => a + b, 0) /
                agent.daysToCloseList.length
            )
          : 0,
      activeListings: agent.activeListings,
      underContract: agent.underContract,
      buySideCommission: agent.buySideCommission,
      sellSideCommission: agent.sellSideCommission,
      buySidePercentage:
        agent.totalCommission > 0
          ? (agent.buySideCommission / agent.totalCommission) * 100
          : 0,
      sellSidePercentage:
        agent.totalCommission > 0
          ? (agent.sellSideCommission / agent.totalCommission) * 100
          : 0,
      companyDollar: agent.companyDollar,
    }))
    .sort((a: AgentMetrics, b: AgentMetrics) => b.totalCommission - a.totalCommission);
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * Normalize raw CSV record to standard format
 */
export function normalizeRecord(raw: any, mapping?: Record<string, string>): DotloopRecord | null {
  try {
    // Helper to get value from mapping or fallback to raw keys
    const getValue = (key: string, fallbacks: string[] = []) => {
      // 1. Try explicit mapping
      if (mapping && mapping[key]) {
        return raw[mapping[key]];
      }
      
      // 2. Try exact fallbacks
      for (const fallback of fallbacks) {
        if (raw[fallback] !== undefined && raw[fallback] !== '') return raw[fallback];
      }

      // 3. Fuzzy Match: Try to find a key that *contains* the fallback (case-insensitive)
      // Only do this if we haven't found a value yet
      const rawKeys = Object.keys(raw);
      for (const fallback of fallbacks) {
        const match = rawKeys.find(k => k.toLowerCase().includes(fallback.toLowerCase()));
        if (match && raw[match] !== undefined && raw[match] !== '') return raw[match];
      }

      return '';
    };

    // Helper to clean currency strings
    const parseCurrency = (val: string) => {
      if (!val) return 0;
      return parseFloat(val.replace(/[$,\s]/g, '')) || 0;
    };

    // Helper to clean percentage strings
    const parsePercent = (val: string) => {
      if (!val) return 0;
      return parseFloat(val.replace(/[%,\s]/g, '')) || 0;
    };

    // Fallback logic for Address: If Address is missing, use Loop Name
    const loopName = getValue('loopName', ['Loop Name', 'Address']) || '';
    const address = getValue('address', ['Address', 'Property Address / Full Address']) || loopName;

    // Extract Loop ID and construct URL
    const loopId = getValue('loopId', ['Loop ID', 'Loop View']) || '';
    const loopViewUrl = loopId ? `https://www.dotloop.com/loop/${loopId}/view` : '';

    return {
      loopId,
      loopViewUrl,
      loopName: loopName,
      loopStatus: getValue('loopStatus', ['Loop Status']) || '',
      createdDate: getValue('createdDate', ['Created Date', 'Listing Date']) || '',
      closingDate: getValue('closingDate', ['Closing Date', 'Contract Dates / Closing Date']) || '',
      listingDate: getValue('listingDate', ['Listing Date', 'Listing Information / Listing Date']) || '',
      offerDate: getValue('offerDate', ['Offer Date']) || '',
      address: address,
      price: parseCurrency(getValue('price', ['Price', 'Financials / Purchase/Sale Price', 'Listing Information / Current Price']) || '0'),
      propertyType: getValue('propertyType', ['Property / Type', 'Property Type']) || 'Residential',
      bedrooms: parseInt(getValue('bedrooms', ['Property / Bedrooms']) || '0') || 0,
      bathrooms: parseInt(getValue('bathrooms', ['Property / Bathrooms']) || '0') || 0,
      squareFootage: parseInt(getValue('squareFootage', ['Property / Square Footage']) || '0') || 0,
      city: getValue('city', ['Property Address / City']) || '',
      state: getValue('state', ['Property Address / State/Prov']) || '',
      county: getValue('county', ['Property Address / County']) || '',
      leadSource: getValue('leadSource', ['Lead Source / Lead Source', 'Lead Source', 'Referral / LEAD SOURCE', 'Referral / Referral Source', 'Lead Source / Source', 'Referral / Lead Source']) || '',
      earnestMoney: parseCurrency(getValue('earnestMoney', ['Financials / Earnest Money Amount']) || '0'),
      salePrice: parseCurrency(getValue('price', ['Financials / Purchase/Sale Price', 'Price']) || '0'),
      commissionRate: parsePercent(getValue('commissionRate', ['Commission Rate', 'Financials / Sale Commission Rate']) || '0'),
      commissionTotal: parseCurrency(getValue('commissionTotal', ['Total Commission', 'Financials / Sale Commission Total']) || '0'),
      agents: getValue('agents', ['Agents', 'Agent', 'Agent Name', 'Agent(s)', 'Primary Agent', 'Listing Agent', 'Selling Agent', 'Team', 'Team Member', 'Parties / Buyer Agent Name', 'Parties / Seller Agent Name']) || '',
      createdBy: getValue('createdBy', ['Created By', 'Created by', 'User']) || getValue('agents', ['Agents', 'Agent', 'Agent Name', 'Agent(s)', 'Primary Agent']) || '',
      buySideCommission: parseCurrency(getValue('buySideCommission', ['Buy Side Commission', 'Financials / Sale Commission Split $ - Buy Side']) || '0'),
      sellSideCommission: parseCurrency(getValue('sellSideCommission', ['Sell Side Commission', 'Financials / Sale Commission Split $ - Sell Side']) || '0'),
      companyDollar: parseCurrency(getValue('companyDollar', ['Company Dollar', 'Net to Office']) || '0'),
      referralSource: getValue('referralSource', ['Referral / Referral Source', 'Referral Source', 'Referral / Referral Source Name']) || '',
      referralPercentage: parsePercent(getValue('referralPercentage', ['Referral / Referral %', 'Referral %']) || '0'),
      complianceStatus: getValue('complianceStatus', ['Compliance Status', 'Review Status']) || 'No Status',
      tags: (getValue('tags', ['Tags']) || '').split('|').filter((t: string) => t.trim()),
      originalPrice: parseCurrency(getValue('originalPrice', ['Listing Information / Original Price', 'Original Price']) || '0'),
      yearBuilt: parseInt(getValue('yearBuilt', ['Property / Year Built']) || '0') || 0,
      lotSize: parseInt(getValue('lotSize', ['Property / Lot Size']) || '0') || 0,
      subdivision: getValue('subdivision', ['Geographic Description / Subdivision']) || '',
      buyerName: getValue('buyerName', ['Buyer Name', 'Parties / Buyer Name', 'Buyer']) || '',
      buyerEmail: getValue('buyerEmail', ['Buyer Email', 'Parties / Buyer Email']) || '',
      buyerPhone: getValue('buyerPhone', ['Buyer Phone', 'Parties / Buyer Phone']) || '',
      sellerName: getValue('sellerName', ['Seller Name', 'Parties / Seller Name', 'Seller']) || '',
      sellerEmail: getValue('sellerEmail', ['Seller Email', 'Parties / Seller Email']) || '',
      sellerPhone: getValue('sellerPhone', ['Seller Phone', 'Parties / Seller Phone']) || '',
    };
  } catch (error) {
    console.error('Error normalizing record:', error);
    return null;
  }
}

/**
 * Calculate dashboard metrics from records
 */
import { calculateTrend } from './dateUtils';

export function calculateMetrics(records: DotloopRecord[], previousRecords?: DotloopRecord[]): DashboardMetrics {
  const calculateBaseMetrics = (recs: DotloopRecord[]) => {
    if (recs.length === 0) {
      return {
        totalTransactions: 0,
        activeListings: 0,
        underContract: 0,
        closed: 0,
        archived: 0,
        totalSalesVolume: 0,
        averagePrice: 0,
        totalCommission: 0,
        totalCompanyDollar: 0,
        averageDaysToClose: 0,
        closingRate: 0,
        hasFinancialData: false,
      };
    }

    const statusCounts = {
      activeListings: 0,
      underContract: 0,
      closed: 0,
      archived: 0,
    };

    let totalSalesVolume = 0;
    let totalCommission = 0;
    let totalCompanyDollar = 0;
    let daysToCloseValues: number[] = [];

    recs.forEach(record => {
      const status = record.loopStatus?.toLowerCase() || '';

      if (status.includes('active')) statusCounts.activeListings++;
      else if (status.includes('contract')) statusCounts.underContract++;
      else if (status.includes('closed') || status.includes('sold')) statusCounts.closed++;
      else if (status.includes('archived')) statusCounts.archived++;

      // Only count volume for closed/sold deals
      if (status.includes('closed') || status.includes('sold')) {
        totalSalesVolume += record.salePrice || record.price || 0;
      }
      totalCommission += record.commissionTotal || 0;
      totalCompanyDollar += record.companyDollar || 0;

      // Only calculate days to close for closed/sold deals; prefer listingDate over createdDate
      if (status.includes('closed') || status.includes('sold')) {
        const startDateStr = record.listingDate || record.createdDate;
        if (record.closingDate && startDateStr) {
          const start = new Date(startDateStr);
          const closing = new Date(record.closingDate);
          if (!isNaN(start.getTime()) && !isNaN(closing.getTime())) {
            const days = Math.ceil((closing.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            if (days > 0) daysToCloseValues.push(days);
          }
        }
      }
    });

    const totalTransactions = recs.length;
    const averagePrice = statusCounts.closed > 0 ? totalSalesVolume / statusCounts.closed : 0;
    const averageDaysToClose = daysToCloseValues.length > 0 
      ? Math.round(daysToCloseValues.reduce((a, b) => a + b, 0) / daysToCloseValues.length) 
      : 0;
    const closingRate = totalTransactions > 0 ? (statusCounts.closed / totalTransactions) * 100 : 0;
    
    // Check if any record has commission data > 0
    const hasFinancialData = recs.some(r => (r.commissionTotal || 0) > 0 || (r.companyDollar || 0) > 0);

    return {
      totalTransactions,
      activeListings: statusCounts.activeListings,
      underContract: statusCounts.underContract,
      closed: statusCounts.closed,
      archived: statusCounts.archived,
      totalSalesVolume,
      averagePrice,
      totalCommission,
      totalCompanyDollar,
      averageDaysToClose,
      closingRate,
      hasFinancialData,
    };
  };

  const currentMetrics = calculateBaseMetrics(records);
  
  // Calculate trends if previous records exist
  let trends;
  if (previousRecords && previousRecords.length > 0) {
    const prevMetrics = calculateBaseMetrics(previousRecords);
    
    trends = {
      totalTransactions: calculateTrend(currentMetrics.totalTransactions, prevMetrics.totalTransactions),
      totalVolume: calculateTrend(currentMetrics.totalSalesVolume, prevMetrics.totalSalesVolume),
      avgCommission: calculateTrend(currentMetrics.totalCommission / (currentMetrics.closed || 1), prevMetrics.totalCommission / (prevMetrics.closed || 1)),
      avgSalePrice: calculateTrend(currentMetrics.averagePrice, prevMetrics.averagePrice),
      avgDaysToClose: calculateTrend(currentMetrics.averageDaysToClose, prevMetrics.averageDaysToClose),
      closingRate: calculateTrend(currentMetrics.closingRate, prevMetrics.closingRate),
    };
  }

  return {
    ...currentMetrics,
    trends,
  };
}

// Helper functions for getting chart data
export function getPipelineData(records: DotloopRecord[]): ChartData[] {
  const counts: Record<string, number> = {};
  
  records.forEach(r => {
    const status = r.loopStatus || 'Unknown';
    counts[status] = (counts[status] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function getLeadSourceData(records: DotloopRecord[]): ChartData[] {
  const counts: Record<string, number> = {};
  
  records.forEach(r => {
    const source = r.leadSource || 'Unknown';
    counts[source] = (counts[source] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 sources
}

export function getPropertyTypeData(records: DotloopRecord[]): ChartData[] {
  const counts: Record<string, number> = {};
  
  records.forEach(r => {
    const type = r.propertyType || 'Unknown';
    counts[type] = (counts[type] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function getGeographicData(records: DotloopRecord[]): ChartData[] {
  const counts: Record<string, number> = {};
  
  records.forEach(r => {
    const state = r.state || 'Unknown';
    counts[state] = (counts[state] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function getSalesOverTime(records: DotloopRecord[]): ChartData[] {
  const monthlyVolume: Record<string, number> = {};
  
  records.forEach(r => {
    // Include ALL deals (Active, Contract, Closed) grouped by listing date
    // This shows pipeline activity, not just closed deals
    const dateToUse = r.listingDate || r.closingDate;
    if (dateToUse) {
      const date = new Date(dateToUse);
      if (!isNaN(date.getTime())) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        // Sum total deal value (sale price or listing price)
        monthlyVolume[key] = (monthlyVolume[key] || 0) + (r.salePrice || r.price || 0);
      }
    }
  });

  const sorted = Object.entries(monthlyVolume)
    .map(([label, value]) => ({ label, value, movingAverage: 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Calculate 3-month moving average
  sorted.forEach((item, idx) => {
    const start = Math.max(0, idx - 2);
    const end = idx + 1;
    const window = sorted.slice(start, end);
    const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length;
    item.movingAverage = avg;
  });

  return sorted;
}
