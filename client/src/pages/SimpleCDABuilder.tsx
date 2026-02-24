import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, History, Edit2 } from 'lucide-react';
import CDAEditModal from '@/components/CDAEditModal';
import { generateCDAPDF, downloadCDAPDF } from '@/lib/cdaPdfGenerator';
import { generateCompleteCDAPDF, type CDAFormData } from '@/lib/cdaPdfGeneratorComplete';

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

// Proper CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
}

export default function SimpleCDABuilder() {
  const [file, setFile] = useState<File | null>(null);
  const [cdaData, setCDAData] = useState<CDAData | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Read query parameters on mount to pre-populate CDA data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    
    if (dataParam) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam));
        // Ensure numeric fields are properly converted
        const normalizedData: CDAData = {
          ...decodedData,
          salePrice: Number(decodedData.salePrice) || 0,
          totalCommissionRate: Number(decodedData.totalCommissionRate) || 0,
          totalGrossCommission: Number(decodedData.totalGrossCommission) || 0,
          sellingSplitPercent: Number(decodedData.sellingSplitPercent) || 50,
          listingSplitPercent: Number(decodedData.listingSplitPercent) || 50,
          sellingGrossCommission: Number(decodedData.sellingGrossCommission) || 0,
          listingGrossCommission: Number(decodedData.listingGrossCommission) || 0,
          sellingAgent1SplitPercent: Number(decodedData.sellingAgent1SplitPercent) || 0,
          sellingAgent1Commission: Number(decodedData.sellingAgent1Commission) || 0,
          sellingAgent2SplitPercent: Number(decodedData.sellingAgent2SplitPercent) || 0,
          sellingAgent2Commission: Number(decodedData.sellingAgent2Commission) || 0,
          sellingBrokerSplitPercent: Number(decodedData.sellingBrokerSplitPercent) || 0,
          sellingBrokerageCommission: Number(decodedData.sellingBrokerageCommission) || 0,
          sellingCommissionAfterFees: Number(decodedData.sellingCommissionAfterFees) || 0,
          listingAgent1SplitPercent: Number(decodedData.listingAgent1SplitPercent) || 0,
          listingAgent1Commission: Number(decodedData.listingAgent1Commission) || 0,
          listingAgent2SplitPercent: Number(decodedData.listingAgent2SplitPercent) || 0,
          listingAgent2Commission: Number(decodedData.listingAgent2Commission) || 0,
          listingBrokerSplitPercent: Number(decodedData.listingBrokerSplitPercent) || 0,
          listingBrokerageCommission: Number(decodedData.listingBrokerageCommission) || 0,
          listingCommissionAfterFees: Number(decodedData.listingCommissionAfterFees) || 0,
          referralPercent: Number(decodedData.referralPercent) || 0,
          referralFee: Number(decodedData.referralFee) || 0,
        };
        setCDAData(normalizedData);
        setUploadSuccess(true);
      } catch (e) {
        console.error('Failed to decode CDA data from URL:', e);
        setError('Failed to load pre-populated CDA data');
      }
    }
  }, []);

  // Clear the data param from URL after loading
  useEffect(() => {
    if (cdaData && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [cdaData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploadSuccess(false);
  };

  const handleUploadAndParse = async () => {
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const lines = text.trim().split('\n');

      if (lines.length < 2) {
        setError('CSV file must contain headers and at least one data row');
        setIsLoading(false);
        return;
      }

      // Parse CSV with proper quote handling
      const headers = parseCSVLine(lines[0]);
      const values = parseCSVLine(lines[1]);

      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate required fields
      const requiredFields = ['propertyAddress', 'salePrice', 'totalCommissionRate', 'sellingAgent1Name', 'listingAgent1Name', 'sellerName'];
      const missingFields = requiredFields.filter(field => !row[field]);

      if (missingFields.length > 0) {
        setError(`Missing required fields: ${missingFields.join(', ')}`);
        setIsLoading(false);
        return;
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

      const cda: CDAData = {
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

      setCDAData(cda);
      setUploadSuccess(true);
      setIsLoading(false);
    } catch (err) {
      setError(`Error parsing CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const saveCDAToHistory = (pdfBlob: Blob) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const history = JSON.parse(localStorage.getItem('cda_history') || '[]');
        const newRecord = {
          id: `cda_${Date.now()}`,
          propertyAddress: cdaData?.propertyAddress || '',
          salePrice: cdaData?.salePrice || 0,
          grossCommission: cdaData?.totalGrossCommission || 0,
          generatedAt: new Date().toISOString(),
          pdfData: base64,
        };
        history.push(newRecord);
        localStorage.setItem('cda_history', JSON.stringify(history));
      };
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error('Failed to save CDA to history:', error);
    }
  };

  const handleGeneratePDF = async () => {
    if (!cdaData) return;

    setIsGeneratingPDF(true);
    setError('');

    try {
      // Map CDAData to CDAFormData for the complete PDF generator
      const formData: Partial<CDAFormData> = {
        sellingCommission: true,
        listingCommission: true,
        propertyAddress: cdaData.propertyAddress,
        mls: cdaData.mlsNumber,
        buyerName: cdaData.buyerName,
        buyerAddress: cdaData.buyerAddress,
        buyerPhone: cdaData.buyerPhone,
        buyerEmail: cdaData.buyerEmail,
        sellerName: cdaData.sellerName,
        sellerEmail: cdaData.sellerEmail,
        closingDate: cdaData.closingDate,
        purchasePrice: cdaData.salePrice,
        totalGrossCommission: cdaData.totalGrossCommission,
        totalGrossCommissionPercent: cdaData.totalCommissionRate,
        sellingGrossCommission: cdaData.sellingGrossCommission,
        sellingGrossCommissionPercent: cdaData.sellingSplitPercent,
        listingGrossCommission: cdaData.listingGrossCommission,
        listingGrossCommissionPercent: cdaData.listingSplitPercent,
        sellingCompanyAddress: cdaData.sellingCompanyAddress,
        listingCompanyAddress: cdaData.listingCompanyAddress,
        sellingAgent1Name: cdaData.sellingAgent1Name,
        sellingAgent1Percent: cdaData.sellingAgent1SplitPercent,
        sellingAgent1Total: cdaData.sellingAgent1Commission,
        sellingAgent2Name: cdaData.sellingAgent2Name,
        sellingAgent2Percent: cdaData.sellingAgent2SplitPercent,
        sellingAgent2Total: cdaData.sellingAgent2Commission,
        listingAgent1Name: cdaData.listingAgent1Name,
        listingAgent1Percent: cdaData.listingAgent1SplitPercent,
        listingAgent1Total: cdaData.listingAgent1Commission,
        listingAgent2Name: cdaData.listingAgent2Name,
        listingAgent2Percent: cdaData.listingAgent2SplitPercent,
        listingAgent2Total: cdaData.listingAgent2Commission,
        sellingBrokeragePercent: cdaData.sellingBrokerSplitPercent,
        sellingBrokerageTotalDue: cdaData.sellingBrokerageCommission,
        listingBrokeragePercent: cdaData.listingBrokerSplitPercent,
        listingBrokerageTotalDue: cdaData.listingBrokerageCommission,
        salePrice: cdaData.salePrice,
        grossCommission: cdaData.totalGrossCommission,
        grossCommissionPercent: cdaData.totalCommissionRate,
      };
      generateCompleteCDAPDF(formData);
    } catch (err) {
      setError(`Failed to generate PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveEdits = (updatedData: CDAData) => {
    setCDAData(updatedData);
    setEditModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">CDA Generator</h1>
            <p className="text-foreground/70">Upload a CSV file to generate a professional Commission Disbursement Authorization</p>
          </div>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/cda-history'}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            View History
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!cdaData ? (
          <Card className="p-8 border-2 border-dashed">
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                >
                  Click to upload CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-sm text-foreground/70 mt-2">or drag and drop</p>
              </div>

              {file && (
                <div className="bg-card p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-foreground/70 mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}

              <Button
                onClick={handleUploadAndParse}
                disabled={!file || isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upload & Parse CSV'
                )}
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-foreground font-medium mb-2">Required CSV Columns:</p>
                <ul className="text-xs text-foreground/70 space-y-1">
                  <li>• propertyAddress</li>
                  <li>• salePrice</li>
                  <li>• totalCommissionRate</li>
                  <li>• sellingAgent1Name</li>
                  <li>• listingAgent1Name</li>
                  <li>• sellerName</li>
                </ul>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {uploadSuccess && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  CSV parsed successfully! All calculations complete.
                </AlertDescription>
              </Alert>
            )}

            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">CDA Summary</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-foreground/70">Property Address</p>
                  <p className="font-semibold text-foreground">{cdaData.propertyAddress}</p>
                </div>
                <div>
                  <p className="text-foreground/70">Sale Price</p>
                  <p className="font-semibold text-foreground">${(cdaData.salePrice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-foreground/70">Total Commission</p>
                  <p className="font-semibold text-foreground">${(cdaData.totalGrossCommission || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-foreground/70">Commission Rate</p>
                  <p className="font-semibold text-foreground">{(cdaData.totalCommissionRate || 0).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-foreground/70">Selling Agent</p>
                  <p className="font-semibold text-foreground">{cdaData.sellingAgent1Name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-foreground/70">Listing Agent</p>
                  <p className="font-semibold text-foreground">{cdaData.listingAgent1Name || 'N/A'}</p>
                </div>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setCDAData(null);
                  setFile(null);
                  setUploadSuccess(false);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="flex-1"
              >
                Upload Different File
              </Button>
              <Button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPDF || !cdaData}
                className="flex-1 gap-2"
                size="lg"
              >
                {isGeneratingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download CDA PDF
                  </>
                )}
              </Button>
            </div>

            {/* Edit Modal */}
            {cdaData && (
              <CDAEditModal
                open={editModalOpen}
                cdaData={cdaData}
                onClose={() => setEditModalOpen(false)}
                onSave={handleSaveEdits}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
