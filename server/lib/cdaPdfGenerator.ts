import PDFDocument from 'pdfkit';

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

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export async function generateCDAPDF(data: CDAData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'letter',
        margin: 40,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Colors
      const headerBlue = '#1e5a96';
      const accentBlue = '#4a9fd8';
      const darkText = '#333333';

      // Page 1: Commission Disbursement Request
      // Header
      doc.fillColor(headerBlue);
      doc.rect(0, 0, doc.page.width, 60).fill();
      
      doc.fillColor('white');
      doc.fontSize(24).font('Helvetica-Bold').text('COMMISSION DISBURSEMENT', 50, 15);
      doc.fontSize(24).font('Helvetica-Bold').text('REQUEST', 50, 35);
      
      // Checkboxes for commission type
      doc.fillColor(darkText);
      doc.fontSize(10).text('☐ Selling Side Commission and/or  ☐ Listing Side Commission', 350, 25);

      // Reset for content
      doc.fillColor(darkText);
      let y = 80;

      // Property Details Section
      const labelWidth = 120;
      const fieldWidth = 200;
      const rightColumnX = 350;

      // Left column
      doc.fontSize(9).font('Helvetica-Bold').text('Property Address', 50, y);
      doc.fontSize(9).font('Helvetica').text(data.propertyAddress, 50 + labelWidth, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      // Right column
      doc.fontSize(9).font('Helvetica-Bold').text('MLS#', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(data.mlsNumber || '', rightColumnX + 40, y);
      doc.moveTo(rightColumnX + 40, y + 12).lineTo(rightColumnX + 40 + 100, y + 12).stroke();

      y += 30;

      // Buyer/Seller Info
      doc.fontSize(9).font('Helvetica-Bold').text('Buyer Name', 50, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Seller Name', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(data.sellerName, rightColumnX + 80, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(rightColumnX + 80 + 120, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Buyer Address', 50, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Seller Address', rightColumnX, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(rightColumnX + 80 + 120, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Buyer Phone', 50, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Seller Phone', rightColumnX, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(rightColumnX + 80 + 120, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Buyer E-mail', 50, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Seller E-mail', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(data.sellerEmail || '', rightColumnX + 80, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(rightColumnX + 80 + 120, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Loan Type', 50, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Closing Date', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(data.closingDate || '', rightColumnX + 80, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(rightColumnX + 80 + 120, y + 12).stroke();

      y += 30;

      // Commission Section
      doc.fontSize(9).font('Helvetica-Bold').text('Purchase Price', 50, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Total Gross Commission', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(formatPercent(data.totalCommissionRate), rightColumnX + 180, y);
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.totalGrossCommission), rightColumnX + 220, y);

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Selling Gross Commission', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(formatPercent(data.sellingSplitPercent), rightColumnX + 180, y);
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.sellingGrossCommission), rightColumnX + 220, y);

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Listing Gross Commission', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(formatPercent(data.listingSplitPercent), rightColumnX + 180, y);
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.listingGrossCommission), rightColumnX + 220, y);

      y += 40;

      // Referral Company Section
      doc.fillColor(accentBlue);
      doc.fontSize(11).font('Helvetica-Bold').text('REFERRAL COMPANY', 50, y);
      
      y += 25;
      doc.fillColor(darkText);

      doc.fontSize(9).font('Helvetica-Bold').text('Referral %', 50, y);
      doc.fontSize(9).font('Helvetica').text(formatPercent(data.referralPercent || 0), 100, y);
      doc.fontSize(9).font('Helvetica-Bold').text('Referral Total $', 200, y);
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.referralFee || 0), 300, y);

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Type of Referral', 50, y);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();
      doc.fontSize(9).text('☐ Listing or  ☐ Selling Side', 290, y);

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Referral Contact', 50, y);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Referral E-mail', 50, y);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Referral Phone', 50, y);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      y += 35;

      // Selling and Listing Company Sections
      doc.fillColor(accentBlue);
      doc.fontSize(11).font('Helvetica-Bold').text('SELLING COMPANY', 50, y);
      doc.fontSize(11).font('Helvetica-Bold').text('LISTING COMPANY', rightColumnX, y);

      y += 25;
      doc.fillColor(darkText);

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.sellingGrossCommission), 50, y);
      doc.fontSize(9).text('.00  % to', 120, y);
      doc.moveTo(180, y + 12).lineTo(280, y + 12).stroke();

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.listingGrossCommission), rightColumnX, y);
      doc.fontSize(9).text('.00  % to', rightColumnX + 70, y);
      doc.moveTo(rightColumnX + 130, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 25;

      doc.fontSize(9).font('Helvetica-Bold').text('Address', 50, y);
      doc.moveTo(120, y + 12).lineTo(280, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Address', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(data.listingCompanyAddress || '', rightColumnX + 70, y);
      doc.moveTo(rightColumnX + 70, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      // Add page break for page 2
      doc.addPage();

      // Page 2: Commission Disbursement Authorization
      // Header
      doc.fillColor(headerBlue);
      doc.rect(0, 0, doc.page.width, 60).fill();
      
      doc.fillColor('white');
      doc.fontSize(24).font('Helvetica-Bold').text('COMMISSION DISBURSEMENT', 50, 15);
      doc.fontSize(24).font('Helvetica-Bold').text('AUTHORIZATION', 50, 35);

      y = 80;
      doc.fillColor(darkText);

      // Transaction Summary
      doc.fontSize(9).font('Helvetica-Bold').text('Property Address', 50, y);
      doc.fontSize(9).font('Helvetica').text(data.propertyAddress, 50 + labelWidth, y);
      doc.moveTo(50 + labelWidth, y + 12).lineTo(50 + labelWidth + fieldWidth, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('MLS#', rightColumnX, y);
      doc.fontSize(9).font('Helvetica').text(data.mlsNumber || '', rightColumnX + 40, y);
      doc.moveTo(rightColumnX + 40, y + 12).lineTo(rightColumnX + 40 + 100, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Buyer', 50, y);
      doc.moveTo(150, y + 12).lineTo(300, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Title Company', rightColumnX, y);
      doc.moveTo(rightColumnX + 100, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Seller', 50, y);
      doc.fontSize(9).font('Helvetica').text(data.sellerName, 150, y);
      doc.moveTo(150, y + 12).lineTo(300, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Closing Officer', rightColumnX, y);
      doc.moveTo(rightColumnX + 100, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Acceptance Date', 50, y);
      doc.moveTo(150, y + 12).lineTo(300, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('REFERRAL COMPANY', rightColumnX, y);

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Closing Date', 50, y);
      doc.fontSize(9).font('Helvetica').text(data.closingDate || '', 150, y);
      doc.moveTo(150, y + 12).lineTo(300, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Brokerage', rightColumnX, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Sale Price', 50, y);
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.salePrice), 150, y);
      doc.moveTo(150, y + 12).lineTo(300, y + 12).stroke();

      doc.fontSize(9).font('Helvetica-Bold').text('Contact', rightColumnX, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica-Bold').text('Gross Commission', 50, y);
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.totalGrossCommission), 150, y);
      doc.fontSize(9).text('%', 210, y);
      doc.fontSize(9).font('Helvetica').text(formatPercent(data.totalCommissionRate), 220, y);

      doc.fontSize(9).font('Helvetica-Bold').text('Address', rightColumnX, y);
      doc.moveTo(rightColumnX + 80, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 50;

      // Commission Disbursement Section
      doc.fillColor(accentBlue);
      doc.fontSize(11).font('Helvetica-Bold').text('COMMISSION', 50, y);
      doc.fontSize(11).font('Helvetica-Bold').text('DISBURSEMENT', 150, y);

      y += 25;
      doc.fillColor(darkText);

      doc.fillColor(accentBlue);
      doc.fontSize(10).font('Helvetica-Bold').text('SELLING COMMISSION', 50, y);
      doc.fontSize(10).font('Helvetica-Bold').text('LISTING COMMISSION', rightColumnX, y);

      y += 25;
      doc.fillColor(darkText);

      // Selling Commission breakdown
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.sellingGrossCommission), 50, y);
      doc.fontSize(8).text('to BROKERAGE', 120, y);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      // Listing Commission breakdown
      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.listingGrossCommission), rightColumnX, y);
      doc.fontSize(8).text('to BROKERAGE', rightColumnX + 70, y);
      doc.moveTo(rightColumnX + 150, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 25;

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.referralFee || 0), 50, y);
      doc.fontSize(8).text('to REFERRAL', 120, y);
      doc.fontSize(8).text('COMPANY', 120, y + 12);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.referralFee || 0), rightColumnX, y);
      doc.fontSize(8).text('to REFERRAL', rightColumnX + 70, y);
      doc.fontSize(8).text('COMPANY', rightColumnX + 70, y + 12);
      doc.moveTo(rightColumnX + 150, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.sellingAgent1Commission), 50, y);
      doc.fontSize(8).text('to SELLING', 120, y);
      doc.fontSize(8).text('AGENT 1', 120, y + 12);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.listingAgent1Commission), rightColumnX, y);
      doc.fontSize(8).text('to LISTING', rightColumnX + 70, y);
      doc.fontSize(8).text('AGENT 1', rightColumnX + 70, y + 12);
      doc.moveTo(rightColumnX + 150, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 30;

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.sellingAgent2Commission || 0), 50, y);
      doc.fontSize(8).text('to SELLING', 120, y);
      doc.fontSize(8).text('AGENT 2', 120, y + 12);
      doc.moveTo(200, y + 12).lineTo(280, y + 12).stroke();

      doc.fontSize(9).font('Helvetica').text(formatCurrency(data.listingAgent2Commission || 0), rightColumnX, y);
      doc.fontSize(8).text('to LISTING', rightColumnX + 70, y);
      doc.fontSize(8).text('AGENT 2', rightColumnX + 70, y + 12);
      doc.moveTo(rightColumnX + 150, y + 12).lineTo(doc.page.width - 50, y + 12).stroke();

      y += 50;

      // Authorization Section
      doc.fontSize(9).font('Helvetica-Bold').text('Authorized by', 50, y);
      doc.fontSize(9).font('Helvetica-Bold').text('Admin/Broker Signature', 150, y);
      doc.rect(150, y + 15, 300, 60).stroke();

      y += 80;

      doc.fontSize(9).font('Helvetica-Bold').text('Admin/Broker Name', 150, y);
      doc.moveTo(150, y + 20).lineTo(450, y + 20).stroke();

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
