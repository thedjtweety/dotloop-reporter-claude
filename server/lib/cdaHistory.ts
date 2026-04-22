import { getDb } from "../db";
import { cdaGenerated } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface CDARecord {
  id: string;
  propertyAddress: string;
  mlsNumber?: string;
  salePrice: number;
  closingDate?: string;
  grossCommission: number;
  commissionRate: number;
  sellingAgent?: string;
  listingAgent?: string;
  pdfPath: string;
  pdfFileName: string;
  generatedAt: string;
  calculationData: any;
}

/**
 * Save a generated CDA record to the database
 */
export async function saveCDARecord(
  tenantId: number,
  userId: number,
  data: {
    propertyAddress: string;
    mlsNumber?: string;
    salePrice: number;
    closingDate?: string;
    grossCommission: number;
    commissionRate: number;
    pdfPath: string;
    pdfFileName: string;
    calculationData: any;
  }
): Promise<string> {
  const id = uuidv4();
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');

  await db.insert(cdaGenerated).values({
    id,
    tenantId,
    templateId: "default", // Using default template for now
    propertyAddress: data.propertyAddress,
    mlsNumber: data.mlsNumber,
    salePrice: data.salePrice.toString(),
    closingDate: data.closingDate,
    grossCommission: data.grossCommission.toString(),
    commissionRate: data.commissionRate.toString(),
    pdfPath: data.pdfPath,
    pdfFileName: data.pdfFileName,
    status: "completed",
    generatedBy: userId,
    calculationData: JSON.stringify(data.calculationData),
  });

  return id;
}

/**
 * Get all CDA records for a user (paginated)
 */
export async function getUserCDAHistory(
  tenantId: number,
  userId: number,
  limit: number = 10,
  offset: number = 0
): Promise<{ records: CDARecord[]; total: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  // Get total count
  const countResult = await db
    .select()
    .from(cdaGenerated)
    .where(and(eq(cdaGenerated.tenantId, tenantId), eq(cdaGenerated.generatedBy, userId)));

  // Get paginated records
  const records = await db
    .select()
    .from(cdaGenerated)
    .where(and(eq(cdaGenerated.tenantId, tenantId), eq(cdaGenerated.generatedBy, userId)))
    .orderBy(desc(cdaGenerated.generatedAt))
    .limit(limit)
    .offset(offset);

  return {
    records: records.map((r) => ({
      id: r.id,
      propertyAddress: r.propertyAddress || "",
      mlsNumber: r.mlsNumber || undefined,
      salePrice: parseFloat(r.salePrice?.toString() || "0"),
      closingDate: r.closingDate ? String(r.closingDate) : undefined,
      grossCommission: parseFloat(r.grossCommission?.toString() || "0"),
      commissionRate: parseFloat(r.commissionRate?.toString() || "0"),
      pdfPath: r.pdfPath || "",
      pdfFileName: r.pdfFileName || "",
      generatedAt: r.generatedAt,
      calculationData: r.calculationData ? JSON.parse(r.calculationData) : {},
    })),
    total: countResult.length,
  };
}

/**
 * Get a single CDA record by ID
 */
export async function getCDARecord(cdaId: string, tenantId: number): Promise<CDARecord | null> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  const record = await db
    .select()
    .from(cdaGenerated)
    .where(and(eq(cdaGenerated.id, cdaId), eq(cdaGenerated.tenantId, tenantId)))
    .limit(1);

  if (record.length === 0) return null;

  const r = record[0];
  return {
    id: r.id,
    propertyAddress: r.propertyAddress || "",
    mlsNumber: r.mlsNumber || undefined,
    salePrice: parseFloat(r.salePrice?.toString() || "0"),
    closingDate: r.closingDate ? String(r.closingDate) : undefined,
    grossCommission: parseFloat(r.grossCommission?.toString() || "0"),
    commissionRate: parseFloat(r.commissionRate?.toString() || "0"),
    pdfPath: r.pdfPath || "",
    pdfFileName: r.pdfFileName || "",
    generatedAt: r.generatedAt,
    calculationData: r.calculationData ? JSON.parse(r.calculationData) : {},
  };
}

/**
 * Delete a CDA record
 */
export async function deleteCDARecord(cdaId: string, tenantId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  const result = await db
    .delete(cdaGenerated)
    .where(and(eq(cdaGenerated.id, cdaId), eq(cdaGenerated.tenantId, tenantId)));

  return (result as any).rowsAffected > 0;
}
