/**
 * Comprehensive CDA PDF Generator
 * Generates a complete Commission Disbursement Request & Authorization form
 * matching the sample CDA template exactly
 */

export interface CDAFormData {
  // Header
  sellingCommission: boolean;
  listingCommission: boolean;

  // Property Information
  propertyAddress: string;
  mls: string;
  buyerName: string;
  buyerAddress: string;
  buyerPhone: string;
  buyerEmail: string;
  sellerName: string;
  sellerAddress: string;
  sellerPhone: string;
  sellerEmail: string;
  loanType: string;

  // Commission Information
  purchasePrice: number;
  totalGrossCommission: number;
  totalGrossCommissionPercent: number;
  sellingGrossCommission: number;
  sellingGrossCommissionPercent: number;
  listingGrossCommission: number;
  listingGrossCommissionPercent: number;

  // Referral Company
  referralPercent: number;
  referralTotal: number;
  typeOfReferral: string;
  referralListing: boolean;
  referralSelling: boolean;
  referralContact: string;
  referralEmail: string;
  referralPhone: string;

  // Selling Company
  sellingCompanyPercent: number;
  sellingCompanyTotal: number;
  sellingCompanyAddress: string;

  // Listing Company
  listingCompanyPercent: number;
  listingCompanyTotal: number;
  listingCompanyAddress: string;

  // Selling Company Commission Breakdown
  sellingCommissionBeforeFees: number;
  sellingOtherFees: Array<{ amount: number; description: string }>;
  sellingCommissionAfterFees: number;

  // Listing Company Commission Breakdown
  listingCommissionBeforeFees: number;
  listingOtherFees: Array<{ amount: number; description: string }>;
  listingCommissionAfterFees: number;

  // Selling Agent(s) Commission
  sellingAgent1Name: string;
  sellingAgent1Percent: number;
  sellingAgent1OtherFees: Array<{ amount: number; description: string }>;
  sellingAgent1Total: number;

  sellingAgent2Name: string;
  sellingAgent2Percent: number;
  sellingAgent2OtherFees: Array<{ amount: number; description: string }>;
  sellingAgent2Total: number;

  // Listing Agent(s) Commission
  listingAgent1Name: string;
  listingAgent1Percent: number;
  listingAgent1OtherFees: Array<{ amount: number; description: string }>;
  listingAgent1Total: number;

  listingAgent2Name: string;
  listingAgent2Percent: number;
  listingAgent2OtherFees: Array<{ amount: number; description: string }>;
  listingAgent2Total: number;

  // Brokerage Commission
  sellingBrokeragePercent: number;
  sellingBrokerageOtherFees: Array<{ amount: number; description: string }>;
  sellingBrokerageTotalDue: number;

  listingBrokeragePercent: number;
  listingBrokerageOtherFees: Array<{ amount: number; description: string }>;
  listingBrokerageTotalDue: number;

  // Additional
  commissionDisbursementRequestedBy: string;
  additionalNotes: string;

  // Authorization Section
  closingDate: string;
  acceptanceDate: string;
  salePrice: number;
  grossCommission: number;
  grossCommissionPercent: number;
  titleCompany: string;
  closingOfficer: string;
  referralBrokerage: string;
  referralContact2: string;
  referralAddress: string;

  // Signature
  authorizedBySignature: string;
  authorizedByName: string;
}

export function generateCompleteCDAPDF(data: Partial<CDAFormData>) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Commission Disbursement Request & Authorization</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Arial', 'Helvetica', sans-serif;
          background: white;
          color: #333;
          line-height: 1.4;
          font-size: 12px;
        }
        .page {
          width: 8.5in;
          height: 11in;
          margin: 0;
          padding: 0.5in;
          background: white;
          page-break-after: always;
          break-after: page;
          box-sizing: border-box;
          position: relative;
          display: block;
        }
        @page {
          size: 8.5in 11in;
          margin: 0.5in;
          padding: 0;
        }
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .page {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            padding: 0.5in !important;
            page-break-after: always;
            break-after: page;
            box-shadow: none !important;
            border: none !important;
          }
          .page:last-child {
            page-break-after: avoid;
          }
        }
        .header {
          background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
          color: white;
          padding: 15px;
          margin: -0.5in -0.5in 20px -0.5in;
          font-size: 20px;
          font-weight: bold;
          display: flex;
          justify-content: space-between;
          align-items: center;
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        @media print {
          .header {
            margin: -0.5in -0.5in 15px -0.5in;
            padding: 12px;
            font-size: 18px;
          }
        }
        .header-title {
          font-size: 24px;
        }
        .header-title .highlight {
          font-weight: bold;
        }
        .checkbox-group {
          display: flex;
          gap: 30px;
          font-size: 14px;
        }
        .checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .checkbox input {
          width: 16px;
          height: 16px;
        }
        .section-title {
          color: #4a90e2;
          font-size: 12px;
          font-weight: bold;
          margin-top: 12px;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          page-break-after: avoid;
          page-break-inside: avoid;
        }
        @media print {
          .section-title {
            margin-top: 10px;
            margin-bottom: 5px;
          }
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        .form-row.full {
          grid-template-columns: 1fr;
        }
        .form-row.three-col {
          grid-template-columns: 1fr 1fr 1fr;
        }
        @media print {
          .form-row {
            gap: 12px;
            margin-bottom: 8px;
          }
        }
        .form-group {
          display: flex;
          flex-direction: column;
          page-break-inside: avoid;
        }
        .form-group label {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 3px;
          color: #333;
        }
        .form-group input,
        .form-group textarea {
          border: none;
          border-bottom: 1px solid #333;
          padding: 5px 3px;
          font-size: 11px;
          font-family: 'Arial', sans-serif;
          background: transparent;
        }
        .form-group textarea {
          resize: none;
          height: 35px;
        }
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          background: #f9f9f9;
        }
        @media print {
          .form-group input,
          .form-group textarea {
            border-bottom: 1px solid #333 !important;
            background: transparent !important;
            padding: 4px 2px;
            font-size: 10px;
          }
          .form-group input:focus,
          .form-group textarea:focus {
            background: transparent !important;
          }
        }
        .currency {
          text-align: right;
        }
        .percent {
          text-align: center;
        }
        .table {
          width: 100%;
          margin: 8px 0;
          border-collapse: collapse;
          font-size: 11px;
          page-break-inside: avoid;
        }
        .table th {
          background: #f0f0f0;
          padding: 5px;
          text-align: left;
          font-weight: bold;
          border-bottom: 1px solid #333;
        }
        .table td {
          padding: 5px;
          border-bottom: 1px solid #ddd;
        }
        .table .total-row {
          background: #f9f9f9;
          font-weight: bold;
          border-top: 2px solid #333;
        }
        @media print {
          .table {
            page-break-inside: avoid;
          }
          .table th {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .table .total-row {
            background: #f9f9f9 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        .inline-group {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .inline-group .form-group {
          flex: 1;
          min-width: 80px;
        }
        .signature-box {
          border: 1px solid #333;
          height: 50px;
          margin-top: 8px;
          page-break-inside: avoid;
        }
        @media print {
          .signature-box {
            border: 1px solid #333 !important;
            height: 50px;
          }
        }
        .page-break {
          page-break-after: always;
          margin-top: 40px;
        }
        .authorization-section {
          margin-top: 20px;
        }
        .commission-disbursement {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
          page-break-inside: avoid;
        }
        .commission-side {
          border: 1px solid #ddd;
          padding: 12px;
          border-radius: 0;
          page-break-inside: avoid;
        }
        @media print {
          .commission-disbursement {
            gap: 15px;
            page-break-inside: avoid;
          }
          .commission-side {
            border: 1px solid #333 !important;
            page-break-inside: avoid;
          }
        }
        .commission-side-title {
          color: #4a90e2;
          font-weight: bold;
          margin-bottom: 8px;
          font-size: 12px;
          page-break-after: avoid;
        }
        .commission-line {
          display: grid;
          grid-template-columns: 50px 1fr 80px;
          gap: 8px;
          margin-bottom: 6px;
          align-items: center;
          font-size: 11px;
          page-break-inside: avoid;
        }
        .commission-line input {
          border: none;
          border-bottom: 1px solid #333;
          padding: 3px;
          font-size: 10px;
        }
        .commission-line .label {
          font-size: 10px;
          color: #666;
        }
        @media print {
          .commission-line input {
            border-bottom: 1px solid #333 !important;
            background: transparent !important;
          }
        }
        /* Print-specific optimizations */
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .page {
            margin: 0 !important;
            padding: 0.5in !important;
            page-break-after: always;
            box-shadow: none !important;
          }
          /* Prevent orphaned headers */
          .section-title {
            page-break-after: avoid;
          }
          .form-row {
            page-break-inside: avoid;
          }
          .form-group {
            page-break-inside: avoid;
          }
          /* Ensure text is visible */
          * {
            color: #333 !important;
          }
          a {
            text-decoration: none;
          }
        }
      </style>
    </head>
    <body>
      <!-- PAGE 1: REQUEST -->
      <div class="page" style="page-break-after: always;">
        <div class="header">
          <div class="header-title">COMMISSION DISBURSEMENT <span class="highlight">REQUEST</span></div>
          <div class="checkbox-group">
            <div class="checkbox">
              <input type="checkbox" ${data.sellingCommission ? 'checked' : ''}>
              <span>Selling Side Commission and/or</span>
            </div>
            <div class="checkbox">
              <input type="checkbox" ${data.listingCommission ? 'checked' : ''}>
              <span>Listing Side Commission</span>
            </div>
          </div>
        </div>

        <!-- Property Information -->
        <div class="form-row">
          <div class="form-group">
            <label>Property Address</label>
            <input type="text" value="${data.propertyAddress || ''}">
          </div>
          <div class="form-group">
            <label>MLS#</label>
            <input type="text" value="${data.mls || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Buyer Name</label>
            <input type="text" value="${data.buyerName || ''}">
          </div>
          <div class="form-group">
            <label>Seller Name</label>
            <input type="text" value="${data.sellerName || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Buyer Address</label>
            <input type="text" value="${data.buyerAddress || ''}">
          </div>
          <div class="form-group">
            <label>Seller Address</label>
            <input type="text" value="${data.sellerAddress || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Buyer Phone</label>
            <input type="text" value="${data.buyerPhone || ''}">
          </div>
          <div class="form-group">
            <label>Seller Phone</label>
            <input type="text" value="${data.sellerPhone || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Buyer E-mail</label>
            <input type="text" value="${data.buyerEmail || ''}">
          </div>
          <div class="form-group">
            <label>Seller E-mail</label>
            <input type="text" value="${data.sellerEmail || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Loan Type</label>
            <input type="text" value="${data.loanType || ''}">
          </div>
          <div class="form-group">
            <label>Closing Date</label>
            <input type="text" value="${data.closingDate || ''}">
          </div>
        </div>

        <!-- Commission Information -->
        <div class="form-row full">
          <div class="form-group">
            <label>Purchase Price</label>
            <input type="text" value="${data.purchasePrice ? '$' + data.purchasePrice.toLocaleString() : ''}">
          </div>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label>Total Gross Commission</label>
            <input type="text" class="currency" value="${data.totalGrossCommission ? '$' + data.totalGrossCommission.toLocaleString() : ''}">
          </div>
          <div class="form-group">
            <label>%</label>
            <input type="text" class="percent" value="${data.totalGrossCommissionPercent || ''}">
          </div>
          <div></div>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label>Selling Gross Commission</label>
            <input type="text" class="currency" value="${data.sellingGrossCommission ? '$' + data.sellingGrossCommission.toLocaleString() : ''}">
          </div>
          <div class="form-group">
            <label>%</label>
            <input type="text" class="percent" value="${data.sellingGrossCommissionPercent || ''}">
          </div>
          <div></div>
        </div>

        <div class="form-row three-col">
          <div class="form-group">
            <label>Listing Gross Commission</label>
            <input type="text" class="currency" value="${data.listingGrossCommission ? '$' + data.listingGrossCommission.toLocaleString() : ''}">
          </div>
          <div class="form-group">
            <label>%</label>
            <input type="text" class="percent" value="${data.listingGrossCommissionPercent || ''}">
          </div>
          <div></div>
        </div>

        <!-- Referral Company Section -->
        <div class="section-title">Referral Company</div>
        <div class="form-row">
          <div class="form-group">
            <label>% Referral Total $</label>
            <div class="inline-group">
              <input type="text" style="width: 50px;" value="${data.referralPercent || ''}">
              <span>%</span>
              <input type="text" class="currency" value="${data.referralTotal ? '$' + data.referralTotal.toLocaleString() : ''}">
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Type of Referral</label>
            <input type="text" value="${data.typeOfReferral || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="checkbox">
            <input type="checkbox" ${data.referralListing ? 'checked' : ''}>
            <label>Listing or</label>
          </div>
          <div class="checkbox">
            <input type="checkbox" ${data.referralSelling ? 'checked' : ''}>
            <label>Selling Side</label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Referral Contact</label>
            <input type="text" value="${data.referralContact || ''}">
          </div>
          <div class="form-group">
            <label>Referral E-mail</label>
            <input type="text" value="${data.referralEmail || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Referral Phone</label>
            <input type="text" value="${data.referralPhone || ''}">
          </div>
        </div>

        <!-- Company Sections -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
          <div>
            <div class="section-title">Selling Company</div>
            <div class="form-group">
              <label>% to</label>
              <input type="text" value="${data.sellingCompanyPercent || ''}">
            </div>
            <div class="form-group">
              <label>Address</label>
              <input type="text" value="${data.sellingCompanyAddress || ''}">
            </div>
          </div>
          <div>
            <div class="section-title">Listing Company</div>
            <div class="form-group">
              <label>.00 % to</label>
              <input type="text" value="${data.listingCompanyPercent || ''}">
            </div>
            <div class="form-group">
              <label>Address</label>
              <input type="text" value="${data.listingCompanyAddress || ''}">
            </div>
          </div>
        </div>

        <!-- Commission Breakdown -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
          <div>
            <div class="section-title">Total Commission</div>
            <div class="form-group">
              <label>$ .00 Commission before fees</label>
            </div>
            <div class="form-group">
              <label>$ .00 Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 Commission after fees</label>
            </div>
          </div>
          <div>
            <div class="section-title">Total Commission</div>
            <div class="form-group">
              <label>$ .00 Commission before fees</label>
            </div>
            <div class="form-group">
              <label>$ .00 Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 Commission after fees</label>
            </div>
          </div>
        </div>

        <!-- Agent Commissions -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
          <div>
            <div class="section-title">Selling Agent(s) Commission</div>
            <div class="form-group">
              <label>% to AGENT 1 ${data.sellingAgent1Name || ''}</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 TOTAL COMMISSION</label>
            </div>
            <div class="form-group">
              <label>% to AGENT 2 ${data.sellingAgent2Name || ''}</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 TOTAL COMMISSION</label>
            </div>
          </div>
          <div>
            <div class="section-title">Listing Agent(s) Commission</div>
            <div class="form-group">
              <label>% to AGENT 1 ${data.listingAgent1Name || ''}</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 TOTAL COMMISSION</label>
            </div>
            <div class="form-group">
              <label>% to AGENT 2 ${data.listingAgent2Name || ''}</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 TOTAL COMMISSION</label>
            </div>
          </div>
        </div>

        <!-- Brokerage Commission -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px;">
          <div>
            <div class="section-title">Brokerage Commission</div>
            <div class="form-group">
              <label>100 % to BROKER</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 TOTAL DUE BROKERAGE</label>
            </div>
          </div>
          <div>
            <div class="section-title">Brokerage Commission</div>
            <div class="form-group">
              <label>100 % to BROKER</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ Other +/-</label>
            </div>
            <div class="form-group">
              <label>$ .00 TOTAL DUE BROKERAGE</label>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="margin-top: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; page-break-inside: avoid;">
          <div class="form-group">
            <label>Commission Disbursement Requested by:</label>
            <input type="text" value="${data.commissionDisbursementRequestedBy || ''}">
          </div>
          <div class="form-group">
            <label>Additional Notes</label>
            <textarea>${data.additionalNotes || ''}</textarea>
          </div>
        </div>
      </div>

      <!-- PAGE 2: AUTHORIZATION -->
      <div class="page" style="page-break-after: avoid;">
        <div class="header">
          <div class="header-title">COMMISSION DISBURSEMENT <span class="highlight">AUTHORIZATION</span></div>
        </div>

        <!-- Transaction Details -->
        <div class="form-row">
          <div class="form-group">
            <label>Property Address</label>
            <input type="text" value="${data.propertyAddress || ''}">
          </div>
          <div class="form-group">
            <label>MLS#</label>
            <input type="text" value="${data.mls || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Buyer</label>
            <input type="text" value="${data.buyerName || ''}">
          </div>
          <div class="form-group">
            <label>Title Company</label>
            <input type="text" value="${data.titleCompany || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Seller</label>
            <input type="text" value="${data.sellerName || ''}">
          </div>
          <div class="form-group">
            <label>Closing Officer</label>
            <input type="text" value="${data.closingOfficer || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Acceptance Date</label>
            <input type="text" value="${data.acceptanceDate || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Closing Date</label>
            <input type="text" value="${data.closingDate || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Sale Price</label>
            <input type="text" class="currency" value="${data.salePrice ? '$' + data.salePrice.toLocaleString() : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Gross Commission</label>
            <input type="text" class="currency" value="${data.grossCommission ? '$' + data.grossCommission.toLocaleString() : ''}">
          </div>
          <div class="form-group">
            <label>%</label>
            <input type="text" class="percent" value="${data.grossCommissionPercent || ''}">
          </div>
        </div>

        <!-- Referral Company Section -->
        <div class="section-title">Referral Company</div>
        <div class="form-row">
          <div class="form-group">
            <label>Brokerage</label>
            <input type="text" value="${data.referralBrokerage || ''}">
          </div>
          <div class="form-group">
            <label>Contact</label>
            <input type="text" value="${data.referralContact2 || ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Address</label>
            <input type="text" value="${data.referralAddress || ''}">
          </div>
        </div>

        <!-- Commission Disbursement -->
        <div class="section-title" style="margin-top: 30px;">Commission Disbursement</div>

        <div class="commission-disbursement">
          <div class="commission-side">
            <div class="commission-side-title">SELLING COMMISSION</div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to BROKERAGE</span>
              <input type="text" value="">
            </div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to REFERRAL COMPANY</span>
              <input type="text" value="">
            </div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to SELLING AGENT 1</span>
              <input type="text" value="">
            </div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to SELLING AGENT 2</span>
              <input type="text" value="">
            </div>
          </div>

          <div class="commission-side">
            <div class="commission-side-title">LISTING COMMISSION</div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to BROKERAGE</span>
              <input type="text" value="">
            </div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to REFERRAL COMPANY</span>
              <input type="text" value="">
            </div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to LISTING AGENT 1</span>
              <input type="text" value="">
            </div>
            <div class="commission-line">
              <input type="text" value="$" style="width: 30px; text-align: center;">
              <span class="label">to LISTING AGENT 2</span>
              <input type="text" value="">
            </div>
          </div>
        </div>

        <!-- Authorization Signature -->
        <div style="margin-top: 40px;">
          <div class="form-group">
            <label>Authorized by</label>
            <label style="font-size: 11px; margin-top: 8px;">Admin/Broker Signature</label>
            <div class="signature-box"></div>
          </div>

          <div class="form-group" style="margin-top: 20px;">
            <label>Admin/Broker Name</label>
            <input type="text" value="${data.authorizedByName || ''}">
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Open in new window for print preview
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    });
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    console.log('CDA PDF opened in print preview');
  } else {
    const link = document.createElement('a');
    link.href = url;
    const filename = `CDA-${data.propertyAddress?.split(' ')[0] || 'Document'}-${new Date().toISOString().split('T')[0]}.html`;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
    console.log('CDA PDF downloaded (popup blocked)');
  }
}
