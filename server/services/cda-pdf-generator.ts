import { PDFDocument, rgb } from 'pdf-lib';

interface FormData {
  titleCompany: string;
  closerName: string;
  phone: string;
  email: string;
  fileNumber: string;
  transactionType: string;
  propertyAddress: string;
  city: string;
  state: string;
  zipCode: string;
  county: string;
  mlsNumber: string;
  salePrice: number;
  closingDate: string;
  contractDate: string;
  buyerName: string;
  sellerName: string;
  totalCommissionRate: number;
  listingSide: number;
  buyingSide: number;
  referralFee: number;
  referralAppliesto: string;
  franchiseFee: number;
  listingAgentSplit: number;
  buyingAgentSplit: number;
  disbursementInstructions: string;
  notes: string;
}

interface Agent {
  role: string;
  name: string;
  legalEntity: string;
  company: string;
  licenseNumber: string;
  tinSsn: string;
  phone: string;
  email: string;
}

interface Waterfall {
  gci: number;
  listingSide: number;
  buyingSide: number;
  referralAmount: number;
  franchiseAmount: number;
  listingAgentGross: number;
  listingBrokerGross: number;
  buyingAgentGross: number;
  buyingBrokerGross: number;
  totalDeductions: number;
  listingAgentNet: number;
  buyingAgentNet: number;
}

interface Branding {
  brokerageName: string;
  tagline?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export async function generateCdaPdf(
  formData: FormData,
  agents: Agent[],
  waterfall: Waterfall,
  branding?: Branding
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  const primaryColor = branding ? hexToRgb(branding.primaryColor) : rgb(0.06, 0.72, 0.51); // Emerald
  const textColor = rgb(0, 0, 0);
  const lightGray = rgb(0.9, 0.9, 0.9);

  // Embed fonts at the start
  const boldFont = await pdfDoc.embedFont('Helvetica-Bold');
  const regularFont = await pdfDoc.embedFont('Helvetica');

  let yPosition = height - 40;

  // Header with branding
  if (branding?.brokerageName) {
    page.drawText(branding.brokerageName, {
      x: 40,
      y: yPosition,
      size: 24,
      color: primaryColor,
      font: boldFont,
    });
    yPosition -= 20;

    if (branding.tagline) {
      page.drawText(branding.tagline, {
        x: 40,
        y: yPosition,
        size: 10,
        color: textColor,
        font: regularFont,
      });
      yPosition -= 15;
    }
  }

  // Title
  page.drawText('Commission Disbursement Authorization', {
    x: 40,
    y: yPosition,
    size: 18,
    color: primaryColor,
    font: boldFont,
  });
  yPosition -= 25;

  // Closing/Title Company Section
  page.drawText('CLOSING / TITLE COMPANY', {
    x: 40,
    y: yPosition,
    size: 12,
    color: primaryColor,
    font: boldFont,
  });
  yPosition -= 18;

  const closingInfo = [
    `Company: ${formData.titleCompany}`,
    `Closer: ${formData.closerName}`,
    `Phone: ${formData.phone} | Email: ${formData.email}`,
    `File #: ${formData.fileNumber}`,
  ];

  closingInfo.forEach(line => {
    page.drawText(line, { x: 40, y: yPosition, size: 10, color: textColor, font: regularFont });
    yPosition -= 14;
  });

  yPosition -= 10;

  // Property Details Section
  page.drawText('PROPERTY & TRANSACTION DETAILS', {
    x: 40,
    y: yPosition,
    size: 12,
    color: primaryColor,
    font: boldFont,
  });
  yPosition -= 18;

  const propertyInfo = [
    `Address: ${formData.propertyAddress}, ${formData.city}, ${formData.state} ${formData.zipCode}`,
    `County: ${formData.county} | MLS #: ${formData.mlsNumber}`,
    `Sale Price: $${formData.salePrice.toLocaleString()}`,
    `Closing Date: ${formData.closingDate} | Contract Date: ${formData.contractDate}`,
    `Buyer: ${formData.buyerName} | Seller: ${formData.sellerName}`,
  ];

  propertyInfo.forEach(line => {
    page.drawText(line, { x: 40, y: yPosition, size: 10, color: textColor, font: regularFont });
    yPosition -= 14;
  });

  yPosition -= 10;

  // Commission Waterfall Section
  page.drawText('COMMISSION WATERFALL', {
    x: 40,
    y: yPosition,
    size: 12,
    color: primaryColor,
    font: boldFont,
  });
  yPosition -= 18;

  const waterfallInfo = [
    `Gross Commission Income (GCI): $${waterfall.gci.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Listing Side (${formData.listingSide}%): $${waterfall.listingSide.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Buying Side (${formData.buyingSide}%): $${waterfall.buyingSide.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    ``,
    `Listing Agent (${formData.listingAgentSplit}%): $${waterfall.listingAgentGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Listing Broker: $${waterfall.listingBrokerGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Buying Agent (${formData.buyingAgentSplit}%): $${waterfall.buyingAgentGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    `Buying Broker: $${waterfall.buyingBrokerGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
  ];

  waterfallInfo.forEach(line => {
    if (line) {
      page.drawText(line, { x: 40, y: yPosition, size: 10, color: textColor, font: regularFont });
    }
    yPosition -= 14;
  });

  yPosition -= 10;

  // Agent Details Section
  page.drawText('PARTIES INVOLVED', {
    x: 40,
    y: yPosition,
    size: 12,
    color: primaryColor,
    font: boldFont,
  });
  yPosition -= 18;

  agents.forEach(agent => {
    page.drawText(`${agent.role.replace(/_/g, ' ').toUpperCase()}`, {
      x: 40,
      y: yPosition,
      size: 10,
      color: primaryColor,
      font: boldFont,
    });
    yPosition -= 12;

    const agentInfo = [
      `Name: ${agent.name}`,
      `Company: ${agent.company}`,
      `License #: ${agent.licenseNumber}`,
      `TIN/SSN: ${agent.tinSsn}`,
      `Phone: ${agent.phone} | Email: ${agent.email}`,
    ];

    agentInfo.forEach(line => {
      page.drawText(line, { x: 50, y: yPosition, size: 9, color: textColor, font: regularFont });
      yPosition -= 12;
    });

    yPosition -= 6;
  });

  // Footer
  page.drawText('This document is for informational purposes only and does not constitute a legal agreement.', {
    x: 40,
    y: 20,
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
    font: regularFont,
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function hexToRgb(hex: string): ReturnType<typeof rgb> {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;
    return rgb(r, g, b);
  }
  return rgb(0, 0, 0);
}
