import { Router, Request, Response } from 'express';
import multer from 'multer';
import Papa from 'papaparse';
import { generateCDAPDF } from '../lib/cdaPdfGenerator';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

interface CDAData {
  propertyAddress: string;
  mlsNumber?: string;
  salePrice: number;
  totalCommissionRate: number;
  totalGrossCommission: number;
  buyerName?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  sellerName: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  closingDate?: string;
  sellingSplitPercent: number;
  listingSplitPercent: number;
  sellingGrossCommission: number;
  listingGrossCommission: number;
  sellingCompanyName?: string;
  sellingCompanyAddress?: string;
  sellingAgent1Name: string;
  sellingAgent1SplitPercent: number;
  sellingAgent1Commission: number;
  sellingAgent2Name?: string;
  sellingAgent2SplitPercent?: number;
  sellingAgent2Commission?: number;
  sellingBrokerSplitPercent: number;
  sellingBrokerageCommission: number;
  sellingCommissionAfterFees: number;
  listingCompanyName?: string;
  listingCompanyAddress?: string;
  listingAgent1Name: string;
  listingAgent1SplitPercent: number;
  listingAgent1Commission: number;
  listingAgent2Name?: string;
  listingAgent2SplitPercent?: number;
  listingAgent2Commission?: number;
  listingBrokerSplitPercent: number;
  listingBrokerageCommission: number;
  listingCommissionAfterFees: number;
  referralCompanyName?: string;
  referralPercent?: number;
  referralType?: 'selling' | 'listing';
  referralFee?: number;
}

/**
 * POST /api/cda/upload-and-generate
 * Upload CSV and generate CDA PDF
 */
router.post('/upload-and-generate', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV
    const csvText = req.file.buffer.toString('utf-8');
    let csvData: any[] = [];

    await new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          csvData = results.data;
          resolve(null);
        },
        error: (error: any) => {
          reject(error);
        },
      });
    });

    if (csvData.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    const row = csvData[0] as Record<string, any>;

    // Validate required fields
    const requiredFields = ['propertyAddress', 'salePrice', 'totalCommissionRate', 'sellingAgent1Name', 'listingAgent1Name', 'sellerName'];
    const missingFields = requiredFields.filter(field => !row[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
      });
    }

    // Parse and calculate CDA data
    const salePrice = parseFloat(row.salePrice) || 0;
    const totalCommissionRate = parseFloat(row.totalCommissionRate) || 0;
    const totalGrossCommission = salePrice * (totalCommissionRate / 100);

    const sellingSplitPercent = parseFloat(row.sellingSplitPercent) || 50;
    const listingSplitPercent = parseFloat(row.listingSplitPercent) || 50;

    const sellingGrossCommission = totalGrossCommission * (sellingSplitPercent / 100);
    const listingGrossCommission = totalGrossCommission * (listingSplitPercent / 100);

    // Selling side calculations
    const sellingAgent1SplitPercent = parseFloat(row.sellingAgent1SplitPercent) || 50;
    const sellingAgent1Commission = sellingGrossCommission * (sellingAgent1SplitPercent / 100);

    const sellingAgent2SplitPercent = parseFloat(row.sellingAgent2SplitPercent) || 0;
    const sellingAgent2Commission = sellingGrossCommission * (sellingAgent2SplitPercent / 100);

    const sellingBrokerSplitPercent = 100 - sellingAgent1SplitPercent - sellingAgent2SplitPercent;
    const sellingBrokerageCommission = sellingGrossCommission * (sellingBrokerSplitPercent / 100);

    // Listing side calculations
    const listingAgent1SplitPercent = parseFloat(row.listingAgent1SplitPercent) || 50;
    const listingAgent1Commission = listingGrossCommission * (listingAgent1SplitPercent / 100);

    const listingAgent2SplitPercent = parseFloat(row.listingAgent2SplitPercent) || 0;
    const listingAgent2Commission = listingGrossCommission * (listingAgent2SplitPercent / 100);

    const listingBrokerSplitPercent = 100 - listingAgent1SplitPercent - listingAgent2SplitPercent;
    const listingBrokerageCommission = listingGrossCommission * (listingBrokerSplitPercent / 100);

    // Referral calculations
    const referralPercent = parseFloat(row.referralPercent) || 0;
    const referralType = row.referralType || 'selling';
    const referralFee = referralPercent > 0
      ? (referralType === 'selling' ? sellingGrossCommission : listingGrossCommission) * (referralPercent / 100)
      : 0;

    const sellingCommissionAfterFees = sellingGrossCommission - (referralType === 'selling' ? referralFee : 0);
    const listingCommissionAfterFees = listingGrossCommission - (referralType === 'listing' ? referralFee : 0);

    const cdaData: CDAData = {
      propertyAddress: row.propertyAddress,
      mlsNumber: row.mlsNumber,
      salePrice,
      totalCommissionRate,
      totalGrossCommission,
      buyerName: row.buyerName,
      buyerAddress: row.buyerAddress,
      buyerPhone: row.buyerPhone,
      buyerEmail: row.buyerEmail,
      sellerName: row.sellerName,
      sellerAddress: row.sellerAddress,
      sellerPhone: row.sellerPhone,
      sellerEmail: row.sellerEmail,
      closingDate: row.closingDate,
      sellingSplitPercent,
      listingSplitPercent,
      sellingGrossCommission,
      listingGrossCommission,
      sellingCompanyName: row.sellingCompanyName,
      sellingCompanyAddress: row.sellingCompanyAddress,
      sellingAgent1Name: row.sellingAgent1Name,
      sellingAgent1SplitPercent,
      sellingAgent1Commission,
      sellingAgent2Name: row.sellingAgent2Name,
      sellingAgent2SplitPercent,
      sellingAgent2Commission,
      sellingBrokerSplitPercent,
      sellingBrokerageCommission,
      sellingCommissionAfterFees,
      listingCompanyName: row.listingCompanyName,
      listingCompanyAddress: row.listingCompanyAddress,
      listingAgent1Name: row.listingAgent1Name,
      listingAgent1SplitPercent,
      listingAgent1Commission,
      listingAgent2Name: row.listingAgent2Name,
      listingAgent2SplitPercent,
      listingAgent2Commission,
      listingBrokerSplitPercent,
      listingBrokerageCommission,
      listingCommissionAfterFees,
      referralCompanyName: row.referralCompanyName,
      referralPercent,
      referralType: referralType as 'selling' | 'listing',
      referralFee,
    };

    // Generate PDF
    const pdfBuffer = await generateCDAPDF(cdaData);

    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="CDA_${cdaData.propertyAddress.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error('CDA generation error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate CDA PDF',
    });
  }
});

export default router;
