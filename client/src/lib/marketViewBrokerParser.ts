/**
 * Market View Broker CSV Parser
 * Parses Market View Broker agent production data exports
 */

export interface MarketViewBrokerProspect {
  firstName: string;
  lastName: string;
  email: string;
  primaryPhone: string;
  mobilePhone: string;
  office: string;
  agentAddress: string;
  officeLocation: string;
  mlsId: string;
  listSideUnits: number;
  listSideVolume: number;
  salesSideUnits: number;
  salesSideVolume: number;
  totalUnits: number;
  totalVolume: number;
}

/**
 * Parse Market View Broker CSV format
 * Expected format from Market View Broker exports
 */
export function parseMarketViewBrokerCSV(csvText: string): {
  prospects: MarketViewBrokerProspect[];
  errors: string[];
} {
  const prospects: MarketViewBrokerProspect[] = [];
  const errors: string[] = [];

  try {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length < 5) {
      errors.push('CSV file appears to be empty or malformed');
      return { prospects, errors };
    }

    // Skip header rows (typically lines 0-3 contain metadata and column headers)
    // Line 0: Report title
    // Line 1: Empty or metadata
    // Line 2: Column headers (Agents, Offices, List Side, Sales Side, Total, etc.)
    // Line 3: Sub-headers (First Name, Last Name, etc.)
    // Line 4: Market Totals (skip this)
    // Line 5+: Agent data

    // Find the "Market Totals" line to determine where data starts
    let dataStartIndex = 5;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Market Totals')) {
        dataStartIndex = i + 1;
        break;
      }
    }
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines or lines with just commas
      if (!line || line.split(',').filter(f => f.trim()).length < 10) {
        continue;
      }

      try {
        const prospect = parseMarketViewBrokerLine(line);
        if (prospect) {
          prospects.push(prospect);
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (prospects.length === 0) {
      errors.push('No valid prospect records found in CSV');
    }

    return { prospects, errors };
  } catch (error) {
    errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { prospects, errors };
  }
}

/**
 * Parse a single line from Market View Broker CSV
 * Format: FirstName,LastName,Office,ListUnits,ListVolume,SalesUnits,SalesVolume,TotalUnits,TotalVolume,MLSId,PrimaryPhone,MobilePhone,Email,Address,OfficeLocation,OfficeMLSId
 */
function parseMarketViewBrokerLine(line: string): MarketViewBrokerProspect | null {
  // Use a simple CSV parser that handles quoted fields
  const fields = parseCSVLine(line);
  
  if (fields.length < 14) {
    throw new Error(`Expected at least 14 fields, got ${fields.length}`);
  }

  const firstName = fields[0]?.trim() || '';
  const lastName = fields[1]?.trim() || '';
  const office = fields[2]?.trim() || '';
  const listSideUnits = parseFloat(fields[3]) || 0;
  const listSideVolume = parseFloat(fields[4]) || 0;
  const salesSideUnits = parseFloat(fields[5]) || 0;
  const salesSideVolume = parseFloat(fields[6]) || 0;
  const totalUnits = parseFloat(fields[7]) || 0;
  const totalVolume = parseFloat(fields[8]) || 0;
  const mlsId = fields[9]?.trim() || '';
  const primaryPhone = fields[10]?.trim() || '';
  const mobilePhone = fields[11]?.trim() || '';
  const email = fields[12]?.trim() || '';
  const agentAddress = fields[13]?.trim() || '';
  const officeLocation = fields[14]?.trim() || '';

  // Validate required fields
  if (!firstName || !lastName || !email) {
    throw new Error('Missing required fields: firstName, lastName, or email');
  }

  // Skip "Market Totals" row
  if (firstName.toLowerCase() === 'market totals') {
    return null;
  }

  return {
    firstName,
    lastName,
    email,
    primaryPhone,
    mobilePhone,
    office,
    agentAddress,
    officeLocation,
    mlsId,
    listSideUnits,
    listSideVolume,
    salesSideUnits,
    salesSideVolume,
    totalUnits,
    totalVolume,
  };
}

/**
 * Parse a CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current);

  return fields;
}

/**
 * Validate Market View Broker CSV structure
 */
export function validateMarketViewBrokerCSV(csvText: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!csvText || csvText.trim().length === 0) {
    errors.push('CSV file is empty');
    return { valid: false, errors };
  }

  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);

  if (lines.length < 5) {
    errors.push('CSV file is too short - expected at least 5 lines (header + data)');
    return { valid: false, errors };
  }

  // Check for expected header patterns
  const headerLine = lines[2]?.toLowerCase() || '';
  if (!headerLine.includes('first name') || !headerLine.includes('last name')) {
    errors.push('CSV does not appear to be a valid Market View Broker export');
    return { valid: false, errors };
  }

  return { valid: true, errors };
}

/**
 * Calculate prospect statistics
 */
export function calculateProspectStats(prospects: MarketViewBrokerProspect[]) {
  return {
    totalProspects: prospects.length,
    totalVolume: prospects.reduce((sum, p) => sum + p.totalVolume, 0),
    avgVolume: prospects.length > 0 ? prospects.reduce((sum, p) => sum + p.totalVolume, 0) / prospects.length : 0,
    topProspects: prospects
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10),
    byOffice: prospects.reduce((acc, p) => {
      if (!acc[p.office]) {
        acc[p.office] = { count: 0, volume: 0 };
      }
      acc[p.office].count++;
      acc[p.office].volume += p.totalVolume;
      return acc;
    }, {} as Record<string, { count: number; volume: number }>),
  };
}
