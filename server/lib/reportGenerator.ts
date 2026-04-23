import { getDb } from "../db";
import { transactions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface ReportConfig {
  title: string;
  reportType: "commission" | "performance" | "financial" | "custom";
  metrics: string[];
  filters?: {
    startDate?: string;
    endDate?: string;
    agents?: string[];
    teams?: string[];
  };
}

export interface ReportData {
  title: string;
  generatedAt: string;
  reportType: string;
  summary: {
    totalTransactions: number;
    totalVolume: number;
    totalCommission: number;
    averageCommission: number;
    topAgent?: {
      name: string;
      commission: number;
    };
  };
  details: any[];
}

/**
 * Generate commission report
 */
export async function generateCommissionReport(
  tenantId: number,
  config: ReportConfig
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Fetch transactions based on filters
  const query = db.select().from(transactions).where(eq(transactions.tenantId, tenantId));

  const txns = await query;

  // Calculate summary
  const totalVolume = txns.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0);
  const totalCommission = txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0);
  const averageCommission = txns.length > 0 ? totalCommission / txns.length : 0;

  // Find top agent
  const agentCommissions = new Map<string, number>();
  txns.forEach((t) => {
    const agents = t.agents ? JSON.parse(t.agents) : [];
    agents.forEach((agent: string) => {
      agentCommissions.set(agent, (agentCommissions.get(agent) || 0) + (t.commissionTotal || 0));
    });
  });

  let topAgent: { name: string; commission: number } | undefined;
  let maxCommission = 0;
  agentCommissions.forEach((commission, agent) => {
    if (commission > maxCommission) {
      maxCommission = commission;
      topAgent = { name: agent, commission };
    }
  });

  return {
    title: config.title,
    generatedAt: new Date().toISOString(),
    reportType: config.reportType,
    summary: {
      totalTransactions: txns.length,
      totalVolume,
      totalCommission,
      averageCommission,
      topAgent,
    },
    details: txns,
  };
}

/**
 * Generate performance report
 */
export async function generatePerformanceReport(
  tenantId: number,
  config: ReportConfig
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const txns = await db.select().from(transactions).where(eq(transactions.tenantId, tenantId));

  // Group by agent
  const agentMetrics = new Map<
    string,
    {
      transactions: number;
      volume: number;
      commission: number;
      closingRate: number;
    }
  >();

  txns.forEach((t) => {
    const agents = t.agents ? JSON.parse(t.agents) : [];
    agents.forEach((agent: string) => {
      const current = agentMetrics.get(agent) || {
        transactions: 0,
        volume: 0,
        commission: 0,
        closingRate: 0,
      };

      current.transactions += 1;
      current.volume += t.salePrice || t.price || 0;
      current.commission += t.commissionTotal || 0;

      if (t.loopStatus?.toLowerCase().includes("closed")) {
        current.closingRate += 1;
      }

      agentMetrics.set(agent, current);
    });
  });

  const details = Array.from(agentMetrics.entries()).map(([agent, metrics]) => ({
    agent,
    ...metrics,
    closingRate: metrics.transactions > 0 ? (metrics.closingRate / metrics.transactions) * 100 : 0,
  }));

  return {
    title: config.title,
    generatedAt: new Date().toISOString(),
    reportType: config.reportType,
    summary: {
      totalTransactions: txns.length,
      totalVolume: txns.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0),
      totalCommission: txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0),
      averageCommission: txns.length > 0 ? txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0) / txns.length : 0,
    },
    details,
  };
}

/**
 * Generate financial report
 */
export async function generateFinancialReport(
  tenantId: number,
  config: ReportConfig
): Promise<ReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const txns = await db.select().from(transactions).where(eq(transactions.tenantId, tenantId));

  // Group by month
  const monthlyData = new Map<
    string,
    {
      volume: number;
      commission: number;
      transactions: number;
    }
  >();

  txns.forEach((t) => {
    const date = t.closingDate || t.createdDate || new Date().toISOString();
    const month = date.substring(0, 7); // YYYY-MM

    const current = monthlyData.get(month) || {
      volume: 0,
      commission: 0,
      transactions: 0,
    };

    current.volume += t.salePrice || t.price || 0;
    current.commission += t.commissionTotal || 0;
    current.transactions += 1;

    monthlyData.set(month, current);
  });

  const details = Array.from(monthlyData.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({
      month,
      ...data,
    }));

  return {
    title: config.title,
    generatedAt: new Date().toISOString(),
    reportType: config.reportType,
    summary: {
      totalTransactions: txns.length,
      totalVolume: txns.reduce((sum, t) => sum + (t.salePrice || t.price || 0), 0),
      totalCommission: txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0),
      averageCommission: txns.length > 0 ? txns.reduce((sum, t) => sum + (t.commissionTotal || 0), 0) / txns.length : 0,
    },
    details,
  };
}

/**
 * Save report to history
 */
export async function saveReportToHistory(
  tenantId: number,
  templateId: string,
  reportType: string,
  reportData: ReportData,
  pdfUrl?: string,
  pdfFileName?: string
): Promise<string> {
  // TODO: Implement report history storage when table is created
  const id = uuidv4();
  return id;
}

/**
 * Generate PDF from report data (placeholder - integrate with actual PDF library)
 */
export async function generatePDF(reportData: ReportData): Promise<Buffer> {
  // This would integrate with a PDF library like pdfkit or weasyprint
  // For now, return a placeholder
  const content = JSON.stringify(reportData, null, 2);
  return Buffer.from(content);
}
