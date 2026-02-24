/**
 * CDA PDF Generator Utility
 * Generates professional Commission Disbursement Authorization PDFs
 */

interface CDAData {
  propertyAddress: string;
  mlsNumber?: string;
  salePrice: number;
  totalCommissionRate: number;
  totalGrossCommission: number;
  sellerName: string;
  sellerEmail?: string;
  closingDate?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEmail?: string;
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
 * Generate a professional CDA PDF document
 * Uses HTML canvas to create a PDF-like document
 */
export async function generateCDAPDF(cdaData: CDAData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Create HTML content for the PDF
      const htmlContent = generateCDAHTML(cdaData);

      // Create a new window for printing
      const printWindow = window.open('', '', 'height=800,width=1000');
      if (!printWindow) {
        reject(new Error('Failed to open print window'));
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Wait for content to load, then print to PDF
      setTimeout(() => {
        printWindow.print();
        // Note: In a real scenario, you'd use a library like jsPDF or html2pdf
        // For now, we'll create a simple PDF-like blob
        resolve(new Blob([htmlContent], { type: 'text/html' }));
      }, 250);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate HTML content for the CDA document
 */
function generateCDAHTML(cdaData: CDAData): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Commission Disbursement Authorization</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
          background: #fff;
        }
        .container {
          max-width: 8.5in;
          height: 11in;
          margin: 0 auto;
          padding: 0.5in;
          background: white;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #1e3a5f;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          font-size: 28px;
          color: #1e3a5f;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          font-size: 12px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          color: #1e3a5f;
          background: #f0f4f8;
          padding: 8px 12px;
          margin-bottom: 12px;
          border-left: 4px solid #10b981;
        }
        .row {
          display: flex;
          gap: 20px;
          margin-bottom: 12px;
        }
        .col {
          flex: 1;
        }
        .label {
          font-size: 11px;
          color: #666;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .value {
          font-size: 13px;
          color: #333;
          font-weight: 500;
        }
        .currency {
          font-family: 'Courier New', monospace;
          text-align: right;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 12px;
        }
        .table th {
          background: #1e3a5f;
          color: white;
          padding: 10px;
          text-align: left;
          font-weight: 600;
        }
        .table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .table tr:nth-child(even) {
          background: #f9fafb;
        }
        .table .amount {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        .summary-box {
          background: #f0f4f8;
          border: 2px solid #1e3a5f;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }
        .summary-row:last-child {
          margin-bottom: 0;
          font-weight: bold;
          border-top: 2px solid #1e3a5f;
          padding-top: 10px;
          font-size: 14px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          font-size: 11px;
          color: #666;
          text-align: center;
        }
        .signature-line {
          margin-top: 30px;
          display: flex;
          gap: 60px;
        }
        .signature-block {
          flex: 1;
          text-align: center;
        }
        .signature-line-element {
          border-top: 1px solid #333;
          margin-top: 40px;
          padding-top: 5px;
          font-size: 11px;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .container {
            box-shadow: none;
            max-width: 100%;
            height: auto;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>Commission Disbursement Authorization</h1>
          <p>Professional Real Estate Transaction Report</p>
        </div>

        <!-- Property Information -->
        <div class="section">
          <div class="section-title">Property Information</div>
          <div class="row">
            <div class="col">
              <div class="label">Property Address</div>
              <div class="value">${cdaData.propertyAddress}</div>
            </div>
            <div class="col">
              <div class="label">MLS Number</div>
              <div class="value">${cdaData.mlsNumber || 'N/A'}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Sale Price</div>
              <div class="value currency">${formatCurrency(cdaData.salePrice)}</div>
            </div>
            <div class="col">
              <div class="label">Closing Date</div>
              <div class="value">${formatDate(cdaData.closingDate)}</div>
            </div>
          </div>
        </div>

        <!-- Parties Information -->
        <div class="section">
          <div class="section-title">Transaction Parties</div>
          <div class="row">
            <div class="col">
              <div class="label">Seller Name</div>
              <div class="value">${cdaData.sellerName}</div>
            </div>
            <div class="col">
              <div class="label">Buyer Name</div>
              <div class="value">${cdaData.buyerName || 'N/A'}</div>
            </div>
          </div>
          <div class="row">
            <div class="col">
              <div class="label">Seller Email</div>
              <div class="value">${cdaData.sellerEmail || 'N/A'}</div>
            </div>
            <div class="col">
              <div class="label">Buyer Email</div>
              <div class="value">${cdaData.buyerEmail || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Commission Summary -->
        <div class="section">
          <div class="section-title">Commission Summary</div>
          <div class="summary-box">
            <div class="summary-row">
              <span>Commission Rate</span>
              <span>${(cdaData.totalCommissionRate || 0).toFixed(2)}%</span>
            </div>
            <div class="summary-row">
              <span>Gross Commission</span>
              <span>${formatCurrency(cdaData.totalGrossCommission)}</span>
            </div>
            <div class="summary-row">
              <span>Selling Side Commission</span>
              <span>${formatCurrency(cdaData.sellingGrossCommission)}</span>
            </div>
            <div class="summary-row">
              <span>Listing Side Commission</span>
              <span>${formatCurrency(cdaData.listingGrossCommission)}</span>
            </div>
          </div>
        </div>

        <!-- Agent Commission Details -->
        <div class="section">
          <div class="section-title">Agent Commission Details</div>
          <table class="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Side</th>
                <th style="text-align: right;">Split %</th>
                <th style="text-align: right;">Commission</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${cdaData.sellingAgent1Name}</td>
                <td>Selling</td>
                <td class="amount">${(cdaData.sellingAgent1SplitPercent || 0).toFixed(2)}%</td>
                <td class="amount">${formatCurrency(cdaData.sellingAgent1Commission)}</td>
              </tr>
              ${cdaData.listingAgent1Name ? `
              <tr>
                <td>${cdaData.listingAgent1Name}</td>
                <td>Listing</td>
                <td class="amount">${(cdaData.listingAgent1SplitPercent || 0).toFixed(2)}%</td>
                <td class="amount">${formatCurrency(cdaData.listingAgent1Commission)}</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <!-- Brokerage Information -->
        <div class="section">
          <div class="section-title">Brokerage Information</div>
          <div class="row">
            <div class="col">
              <div class="label">Selling Brokerage Commission</div>
              <div class="value currency">${formatCurrency(cdaData.sellingBrokerageCommission)}</div>
            </div>
            <div class="col">
              <div class="label">Listing Brokerage Commission</div>
              <div class="value currency">${formatCurrency(cdaData.listingBrokerageCommission)}</div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This Commission Disbursement Authorization is generated automatically and is valid for transaction reference and record-keeping purposes.</p>
          <p style="margin-top: 10px;">Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download a CDA PDF to the user's computer
 */
export function downloadCDAPDF(blob: Blob, propertyAddress: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CDA_${propertyAddress.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
