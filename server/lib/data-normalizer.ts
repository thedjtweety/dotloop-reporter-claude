/**
 * Data Normalization Pipeline - Priority 2.2
 * Normalizes and cleans CSV data for consistent processing
 */

export interface NormalizedTransaction {
  loopName: string;
  loopStatus: string;
  price: number;
  closingDate: string | null;
  listingDate: string | null;
  offerDate: string | null;
  address: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  city: string;
  state: string;
  county: string;
  leadSource: string;
  agents: string;
  createdBy: string;
  earnestMoney: number;
  salePrice: number;
  commissionRate: number;
  commissionTotal: number;
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
  daysToClose: number;
  isActive: boolean;
  isClosed: boolean;
  isArchived: boolean;
}

/**
 * Normalize a single transaction record
 */
export function normalizeTransaction(record: Record<string, any>): NormalizedTransaction | null {
  try {
    // Extract and normalize required fields
    const loopName = normalizeString(record.loopName || record['Loop Name'] || '');
    if (!loopName) return null;

    const loopStatus = normalizeString(record.loopStatus || record['Loop Status'] || '');
    if (!loopStatus) return null;

    const price = normalizeNumber(record.price || record['Price'] || 0);
    if (price < 0) return null;

    // Parse dates
    const closingDate = normalizeDate(record.closingDate || record['Closing Date']);
    const listingDate = normalizeDate(record.listingDate || record['Listing Date']);
    const offerDate = normalizeDate(record.offerDate || record['Offer Date']);

    // Calculate days to close
    let daysToClose = 0;
    if (listingDate && closingDate) {
      const listing = new Date(listingDate);
      const closing = new Date(closingDate);
      daysToClose = Math.floor((closing.getTime() - listing.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Determine status flags
    const statusLower = loopStatus.toLowerCase();
    const isActive = statusLower.includes('active') && !statusLower.includes('archived');
    const isClosed = statusLower.includes('closed') || statusLower.includes('sold');
    const isArchived = statusLower.includes('archived');

    return {
      loopName,
      loopStatus,
      price,
      closingDate,
      listingDate,
      offerDate,
      address: normalizeString(record.address || record['Address'] || ''),
      propertyType: normalizeString(record.propertyType || record['Property Type'] || ''),
      bedrooms: normalizeNumber(record.bedrooms || record['Bedrooms'] || 0),
      bathrooms: normalizeNumber(record.bathrooms || record['Bathrooms'] || 0),
      squareFootage: normalizeNumber(record.squareFootage || record['Square Footage'] || 0),
      city: normalizeString(record.city || record['City'] || ''),
      state: normalizeString(record.state || record['State'] || ''),
      county: normalizeString(record.county || record['County'] || ''),
      leadSource: normalizeString(record.leadSource || record['Lead Source'] || ''),
      agents: normalizeString(record.agents || record['Agents'] || ''),
      createdBy: normalizeString(record.createdBy || record['Created By'] || ''),
      earnestMoney: normalizeNumber(record.earnestMoney || record['Earnest Money'] || 0),
      salePrice: normalizeNumber(record.salePrice || record['Sale Price'] || price),
      commissionRate: normalizeNumber(record.commissionRate || record['Commission Rate'] || 0),
      commissionTotal: normalizeNumber(record.commissionTotal || record['Commission Total'] || 0),
      buySideCommission: normalizeNumber(record.buySideCommission || record['Buy Side Commission'] || 0),
      sellSideCommission: normalizeNumber(record.sellSideCommission || record['Sell Side Commission'] || 0),
      companyDollar: normalizeNumber(record.companyDollar || record['Company Dollar'] || 0),
      referralSource: normalizeString(record.referralSource || record['Referral Source'] || ''),
      referralPercentage: normalizeNumber(record.referralPercentage || record['Referral Percentage'] || 0),
      complianceStatus: normalizeString(record.complianceStatus || record['Compliance Status'] || ''),
      tags: normalizeTags(record.tags || record['Tags'] || ''),
      originalPrice: normalizeNumber(record.originalPrice || record['Original Price'] || price),
      yearBuilt: normalizeNumber(record.yearBuilt || record['Year Built'] || 0),
      lotSize: normalizeNumber(record.lotSize || record['Lot Size'] || 0),
      subdivision: normalizeString(record.subdivision || record['Subdivision'] || ''),
      daysToClose,
      isActive,
      isClosed,
      isArchived,
    };
  } catch (error) {
    console.error('Error normalizing transaction:', error);
    return null;
  }
}

/**
 * Normalize a string value
 */
function normalizeString(value: any): string {
  if (!value) return '';
  return String(value).trim();
}

/**
 * Normalize a numeric value
 */
function normalizeNumber(value: any): number {
  if (!value) return 0;
  
  // Handle string values with currency symbols
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normalize a date value
 */
function normalizeDate(value: any): string | null {
  if (!value) return null;
  
  try {
    let date: Date | null = null;
    
    if (typeof value === 'string') {
      // Try common date formats
      const formats = [
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
        /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY
      ];
      
      for (const format of formats) {
        const match = value.match(format);
        if (match) {
          if (format === formats[0]) {
            // MM/DD/YYYY
            date = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
          } else if (format === formats[1]) {
            // YYYY-MM-DD
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          } else {
            // DD-MM-YYYY
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
          }
          break;
        }
      }
      
      if (!date) {
        date = new Date(value);
      }
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else {
      date = new Date(value);
    }
    
    if (!date || isNaN(date.getTime())) return null;
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error normalizing date:', error);
    return null;
  }
}

/**
 * Normalize tags
 */
function normalizeTags(value: any): string[] {
  if (!value) return [];
  
  if (Array.isArray(value)) {
    return value.map((tag) => normalizeString(tag)).filter((tag) => tag.length > 0);
  }
  
  if (typeof value === 'string') {
    return value
      .split(/[,;|]/)
      .map((tag) => normalizeString(tag))
      .filter((tag) => tag.length > 0);
  }
  
  return [];
}

/**
 * Normalize a batch of transactions
 */
export function normalizeTransactionBatch(records: Record<string, any>[]): {
  valid: NormalizedTransaction[];
  invalid: Array<{ index: number; error: string }>;
} {
  const valid: NormalizedTransaction[] = [];
  const invalid: Array<{ index: number; error: string }> = [];
  
  for (let i = 0; i < records.length; i++) {
    try {
      const normalized = normalizeTransaction(records[i]);
      if (normalized) {
        valid.push(normalized);
      } else {
        invalid.push({
          index: i,
          error: 'Missing required fields (loopName, loopStatus, price)',
        });
      }
    } catch (error) {
      invalid.push({
        index: i,
        error: `Normalization error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
  
  return { valid, invalid };
}

/**
 * Calculate data quality score
 */
export function calculateDataQuality(transactions: NormalizedTransaction[]): {
  score: number; // 0-100
  completeness: number; // 0-100
  validity: number; // 0-100
  consistency: number; // 0-100
} {
  if (transactions.length === 0) {
    return { score: 0, completeness: 0, validity: 0, consistency: 0 };
  }
  
  let totalFields = 0;
  let filledFields = 0;
  let validFields = 0;
  let consistentFields = 0;
  
  for (const tx of transactions) {
    // Check completeness
    const fields = Object.values(tx);
    totalFields += fields.length;
    filledFields += fields.filter((f) => f !== null && f !== '' && f !== 0).length;
    
    // Check validity
    if (tx.price > 0) validFields++;
    if (tx.loopName && tx.loopStatus) validFields++;
    
    // Check consistency
    if (tx.salePrice === tx.price || tx.salePrice === 0) consistentFields++;
  }
  
  const completeness = Math.round((filledFields / totalFields) * 100);
  const validity = Math.round((validFields / (transactions.length * 2)) * 100);
  const consistency = Math.round((consistentFields / transactions.length) * 100);
  const score = Math.round((completeness + validity + consistency) / 3);
  
  return { score, completeness, validity, consistency };
}
