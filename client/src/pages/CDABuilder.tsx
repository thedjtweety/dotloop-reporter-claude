import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, Mail, Plus, Trash2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { trpc } from '@/lib/trpc';
import { decodeCDAData } from '@/lib/cdaHelpers';

interface OtherAdjustment {
  description: string;
  amount: number;
}

interface CDAFormData {
  // Transaction Details
  propertyAddress: string;
  salePrice: number;
  totalCommissionRate: number;
  sellingSplitPercent: number;
  listingSplitPercent: number;
  
  // Selling Side
  sellingAgent1Name: string;
  sellingAgent1SplitPercent: number;
  sellingAgent2Name?: string;
  sellingAgent2SplitPercent?: number;
  sellingBrokerSplitPercent: number;
  sellingOtherAdjustments: OtherAdjustment[];
  
  // Listing Side
  listingAgent1Name: string;
  listingAgent1SplitPercent: number;
  listingAgent2Name?: string;
  listingAgent2SplitPercent?: number;
  listingBrokerSplitPercent: number;
  listingOtherAdjustments: OtherAdjustment[];
  
  // Referral
  referralPercent?: number;
  referralType?: 'selling' | 'listing';
  referralCompanyName?: string;
}

interface CDACalculationResult {
  grossCommission: number;
  sellingGrossCommission: number;
  listingGrossCommission: number;
  sellingReferralFee: number;
  listingReferralFee: number;
  sellingOtherAdjustmentsTotal: number;
  listingOtherAdjustmentsTotal: number;
  sellingCommissionAfterFees: number;
  listingCommissionAfterFees: number;
  sellingAgent1Commission: number;
  sellingAgent2Commission: number;
  sellingBrokerageCommission: number;
  listingAgent1Commission: number;
  listingAgent2Commission: number;
  listingBrokerageCommission: number;
  isValid: boolean;
  validationErrors: string[];
}

export default function CDABuilder() {
  const [location, setLocation] = useLocation();
  
  // Check for pre-filled data from URL parameters
  const getInitialFormData = (): CDAFormData => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    
    if (dataParam) {
      const decoded = decodeCDAData(dataParam);
      if (decoded) {
        return decoded;
      }
    }
    
    // Return default form data
    return {
      propertyAddress: '',
      salePrice: 0,
      totalCommissionRate: 6.0,
      sellingSplitPercent: 50,
      listingSplitPercent: 50,
      sellingAgent1Name: '',
      sellingAgent1SplitPercent: 80,
      sellingBrokerSplitPercent: 20,
      sellingOtherAdjustments: [],
      listingAgent1Name: '',
      listingAgent1SplitPercent: 80,
      listingBrokerSplitPercent: 20,
      listingOtherAdjustments: [],
    };
  };
  
  const [formData, setFormData] = useState<CDAFormData>(getInitialFormData());
  
  const [calculation, setCalculation] = useState<CDACalculationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const calculateMutation = trpc.cda.calculate.useMutation({
    onSuccess: (data) => {
      setCalculation(data);
      // Map validation errors to specific fields
      if (data.validationErrors && data.validationErrors.length > 0) {
        const errors: Record<string, string> = {};
        data.validationErrors.forEach((error: string) => {
          if (error.includes('Property Address')) errors.propertyAddress = error;
          if (error.includes('Sale Price')) errors.salePrice = error;
          if (error.includes('Selling Agent')) errors.sellingAgent1Name = error;
          if (error.includes('Listing Agent')) errors.listingAgent1Name = error;
          if (error.includes('Selling split')) errors.sellingAgent1SplitPercent = error;
          if (error.includes('Listing split')) errors.listingAgent1SplitPercent = error;
        });
        setFieldErrors(errors);
      } else {
        setFieldErrors({});
      }
    },
    onError: (error) => {
      console.error('Calculation error:', error);
    },
  });
  
  // Recalculate whenever form data changes
  useEffect(() => {
    if (formData.propertyAddress && formData.salePrice > 0) {
      calculateMutation.mutate(formData);
    }
  }, [formData]);
  
  const handleInputChange = (field: keyof CDAFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const addAdjustment = (side: 'selling' | 'listing') => {
    const field = side === 'selling' ? 'sellingOtherAdjustments' : 'listingOtherAdjustments';
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], { description: '', amount: 0 }],
    }));
  };
  
  const removeAdjustment = (side: 'selling' | 'listing', index: number) => {
    const field = side === 'selling' ? 'sellingOtherAdjustments' : 'listingOtherAdjustments';
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };
  
  const updateAdjustment = (side: 'selling' | 'listing', index: number, field: 'description' | 'amount', value: string | number) => {
    const adjustmentsField = side === 'selling' ? 'sellingOtherAdjustments' : 'listingOtherAdjustments';
    setFormData(prev => ({
      ...prev,
      [adjustmentsField]: prev[adjustmentsField].map((adj, i) => 
        i === index ? { ...adj, [field]: value } : adj
      ),
    }));
  };
  
  const generatePDFMutation = trpc.cda.generatePDF.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CDA_${formData.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('PDF generation error:', error);
      alert(`Failed to generate PDF: ${error.message}`);
      setIsGenerating(false);
    },
  });
  
  const handleGenerateCDA = async () => {
    if (!calculation || !calculation.isValid) {
      setShowValidationDialog(true);
      return;
    }
    
    setIsGenerating(true);
    generatePDFMutation.mutate(formData);
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">
                CDA Builder
              </h1>
              <p className="text-sm text-muted-foreground">
                Commission Disbursement Authorization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleGenerateCDA}
              disabled={isGenerating || !formData.propertyAddress || formData.salePrice === 0}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Generate CDA'}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Transaction Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="propertyAddress" className={fieldErrors.propertyAddress ? 'text-destructive' : ''}>
                    Property Address *
                  </Label>
                  <Input
                    id="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={(e) => handleInputChange('propertyAddress', e.target.value)}
                    placeholder="123 Main St, City, ST 12345"
                    className={fieldErrors.propertyAddress ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {fieldErrors.propertyAddress && (
                    <p className="text-sm text-destructive mt-1">{fieldErrors.propertyAddress}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="salePrice" className={fieldErrors.salePrice ? 'text-destructive' : ''}>
                    Sale Price *
                  </Label>
                  <Input
                    id="salePrice"
                    type="number"
                    value={formData.salePrice || ''}
                    onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    placeholder="500000"
                    className={fieldErrors.salePrice ? 'border-destructive focus-visible:ring-destructive' : ''}
                  />
                  {fieldErrors.salePrice && (
                    <p className="text-sm text-destructive mt-1">{fieldErrors.salePrice}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="totalCommissionRate">Total Commission Rate (%) *</Label>
                  <Input
                    id="totalCommissionRate"
                    type="number"
                    step="0.1"
                    value={formData.totalCommissionRate}
                    onChange={(e) => handleInputChange('totalCommissionRate', parseFloat(e.target.value) || 0)}
                    placeholder="6.0"
                  />
                </div>
                <div>
                  <Label htmlFor="sellingSplitPercent">Selling Split (%)</Label>
                  <Input
                    id="sellingSplitPercent"
                    type="number"
                    value={formData.sellingSplitPercent}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleInputChange('sellingSplitPercent', value);
                      handleInputChange('listingSplitPercent', 100 - value);
                    }}
                    placeholder="50"
                  />
                </div>
                <div>
                  <Label htmlFor="listingSplitPercent">Listing Split (%)</Label>
                  <Input
                    id="listingSplitPercent"
                    type="number"
                    value={formData.listingSplitPercent}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      handleInputChange('listingSplitPercent', value);
                      handleInputChange('sellingSplitPercent', 100 - value);
                    }}
                    placeholder="50"
                  />
                </div>
              </div>
            </Card>
            
            {/* Referral Fee */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Referral Fee (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="referralCompanyName">Referral Company</Label>
                  <Input
                    id="referralCompanyName"
                    value={formData.referralCompanyName || ''}
                    onChange={(e) => handleInputChange('referralCompanyName', e.target.value)}
                    placeholder="Zillow, OpCity, etc."
                  />
                </div>
                <div>
                  <Label htmlFor="referralPercent">Referral Fee (%)</Label>
                  <Input
                    id="referralPercent"
                    type="number"
                    value={formData.referralPercent || ''}
                    onChange={(e) => handleInputChange('referralPercent', parseFloat(e.target.value) || 0)}
                    placeholder="25"
                  />
                </div>
                <div>
                  <Label htmlFor="referralType">Deduct From</Label>
                  <Select
                    value={formData.referralType || ''}
                    onValueChange={(value) => handleInputChange('referralType', value as 'selling' | 'listing')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select side" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selling">Selling Side</SelectItem>
                      <SelectItem value="listing">Listing Side</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
            
            {/* Selling/Listing Sides Tabs */}
            <Tabs defaultValue="selling">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="selling">Selling Side</TabsTrigger>
                <TabsTrigger value="listing">Listing Side</TabsTrigger>
              </TabsList>
              
              {/* Selling Side */}
              <TabsContent value="selling" className="space-y-4 mt-4">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Agent Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sellingAgent1Name" className={fieldErrors.sellingAgent1Name ? 'text-destructive' : ''}>
                          Agent 1 Name *
                        </Label>
                        <Input
                          id="sellingAgent1Name"
                          value={formData.sellingAgent1Name}
                          onChange={(e) => handleInputChange('sellingAgent1Name', e.target.value)}
                          placeholder="John Smith"
                          className={fieldErrors.sellingAgent1Name ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                        {fieldErrors.sellingAgent1Name && (
                          <p className="text-sm text-destructive mt-1">{fieldErrors.sellingAgent1Name}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="sellingAgent1SplitPercent">Agent 1 Split (%)</Label>
                        <Input
                          id="sellingAgent1SplitPercent"
                          type="number"
                          value={formData.sellingAgent1SplitPercent}
                          onChange={(e) => handleInputChange('sellingAgent1SplitPercent', parseFloat(e.target.value) || 0)}
                          placeholder="80"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sellingAgent2Name">Agent 2 Name (Optional)</Label>
                        <Input
                          id="sellingAgent2Name"
                          value={formData.sellingAgent2Name || ''}
                          onChange={(e) => handleInputChange('sellingAgent2Name', e.target.value)}
                          placeholder="Jane Smith"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sellingAgent2SplitPercent">Agent 2 Split (%)</Label>
                        <Input
                          id="sellingAgent2SplitPercent"
                          type="number"
                          value={formData.sellingAgent2SplitPercent || ''}
                          onChange={(e) => handleInputChange('sellingAgent2SplitPercent', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="sellingBrokerSplitPercent">Brokerage Split (%)</Label>
                      <Input
                        id="sellingBrokerSplitPercent"
                        type="number"
                        value={formData.sellingBrokerSplitPercent}
                        onChange={(e) => handleInputChange('sellingBrokerSplitPercent', parseFloat(e.target.value) || 0)}
                        placeholder="20"
                      />
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Other Adjustments</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAdjustment('selling')}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Adjustment
                    </Button>
                  </div>
                  {formData.sellingOtherAdjustments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No adjustments added</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.sellingOtherAdjustments.map((adj, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Description (e.g., Transaction Fee)"
                            value={adj.description}
                            onChange={(e) => updateAdjustment('selling', index, 'description', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={adj.amount || ''}
                            onChange={(e) => updateAdjustment('selling', index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAdjustment('selling', index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Use positive numbers for additions, negative for deductions
                  </p>
                </Card>
              </TabsContent>
              
              {/* Listing Side */}
              <TabsContent value="listing" className="space-y-4 mt-4">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Agent Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="listingAgent1Name" className={fieldErrors.listingAgent1Name ? 'text-destructive' : ''}>
                          Agent 1 Name *
                        </Label>
                        <Input
                          id="listingAgent1Name"
                          value={formData.listingAgent1Name}
                          onChange={(e) => handleInputChange('listingAgent1Name', e.target.value)}
                          placeholder="Jane Doe"
                          className={fieldErrors.listingAgent1Name ? 'border-destructive focus-visible:ring-destructive' : ''}
                        />
                        {fieldErrors.listingAgent1Name && (
                          <p className="text-sm text-destructive mt-1">{fieldErrors.listingAgent1Name}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="listingAgent1SplitPercent">Agent 1 Split (%)</Label>
                        <Input
                          id="listingAgent1SplitPercent"
                          type="number"
                          value={formData.listingAgent1SplitPercent}
                          onChange={(e) => handleInputChange('listingAgent1SplitPercent', parseFloat(e.target.value) || 0)}
                          placeholder="80"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="listingAgent2Name">Agent 2 Name (Optional)</Label>
                        <Input
                          id="listingAgent2Name"
                          value={formData.listingAgent2Name || ''}
                          onChange={(e) => handleInputChange('listingAgent2Name', e.target.value)}
                          placeholder="Bob Williams"
                        />
                      </div>
                      <div>
                        <Label htmlFor="listingAgent2SplitPercent">Agent 2 Split (%)</Label>
                        <Input
                          id="listingAgent2SplitPercent"
                          type="number"
                          value={formData.listingAgent2SplitPercent || ''}
                          onChange={(e) => handleInputChange('listingAgent2SplitPercent', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="listingBrokerSplitPercent">Brokerage Split (%)</Label>
                      <Input
                        id="listingBrokerSplitPercent"
                        type="number"
                        value={formData.listingBrokerSplitPercent}
                        onChange={(e) => handleInputChange('listingBrokerSplitPercent', parseFloat(e.target.value) || 0)}
                        placeholder="20"
                      />
                    </div>
                  </div>
                </Card>
                
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Other Adjustments</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addAdjustment('listing')}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Adjustment
                    </Button>
                  </div>
                  {formData.listingOtherAdjustments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No adjustments added</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.listingOtherAdjustments.map((adj, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder="Description (e.g., E&O Insurance)"
                            value={adj.description}
                            onChange={(e) => updateAdjustment('listing', index, 'description', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={adj.amount || ''}
                            onChange={(e) => updateAdjustment('listing', index, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-32"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeAdjustment('listing', index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Use positive numbers for additions, negative for deductions
                  </p>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right Column - Preview */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">Calculation Preview</h2>
              {calculation ? (
                <div className="space-y-4">
                  {/* Validation Errors */}
                  {calculation.validationErrors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc list-inside text-sm">
                          {calculation.validationErrors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {calculation.isValid && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        All calculations validated successfully
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Calculation Results */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between font-semibold text-base">
                      <span>Gross Commission:</span>
                      <span>${calculation.grossCommission.toFixed(2)}</span>
                    </div>
                    
                    <div className="border-t pt-3">
                      <p className="font-semibold mb-2">Selling Side:</p>
                      <div className="space-y-1 pl-3">
                        <div className="flex justify-between">
                          <span>Gross:</span>
                          <span>${calculation.sellingGrossCommission.toFixed(2)}</span>
                        </div>
                        {calculation.sellingReferralFee > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Referral Fee:</span>
                            <span>-${calculation.sellingReferralFee.toFixed(2)}</span>
                          </div>
                        )}
                        {calculation.sellingOtherAdjustmentsTotal !== 0 && (
                          <div className="flex justify-between">
                            <span>Adjustments:</span>
                            <span className={calculation.sellingOtherAdjustmentsTotal > 0 ? 'text-green-600' : 'text-red-600'}>
                              {calculation.sellingOtherAdjustmentsTotal > 0 ? '+' : ''}${calculation.sellingOtherAdjustmentsTotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold">
                          <span>After Fees:</span>
                          <span>${calculation.sellingCommissionAfterFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Agent 1:</span>
                          <span>${calculation.sellingAgent1Commission.toFixed(2)}</span>
                        </div>
                        {calculation.sellingAgent2Commission > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Agent 2:</span>
                            <span>${calculation.sellingAgent2Commission.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span>Brokerage:</span>
                          <span>${calculation.sellingBrokerageCommission.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <p className="font-semibold mb-2">Listing Side:</p>
                      <div className="space-y-1 pl-3">
                        <div className="flex justify-between">
                          <span>Gross:</span>
                          <span>${calculation.listingGrossCommission.toFixed(2)}</span>
                        </div>
                        {calculation.listingReferralFee > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Referral Fee:</span>
                            <span>-${calculation.listingReferralFee.toFixed(2)}</span>
                          </div>
                        )}
                        {calculation.listingOtherAdjustmentsTotal !== 0 && (
                          <div className="flex justify-between">
                            <span>Adjustments:</span>
                            <span className={calculation.listingOtherAdjustmentsTotal > 0 ? 'text-green-600' : 'text-red-600'}>
                              {calculation.listingOtherAdjustmentsTotal > 0 ? '+' : ''}${calculation.listingOtherAdjustmentsTotal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold">
                          <span>After Fees:</span>
                          <span>${calculation.listingCommissionAfterFees.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Agent 1:</span>
                          <span>${calculation.listingAgent1Commission.toFixed(2)}</span>
                        </div>
                        {calculation.listingAgent2Commission > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Agent 2:</span>
                            <span>${calculation.listingAgent2Commission.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span>Brokerage:</span>
                          <span>${calculation.listingBrokerageCommission.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Enter transaction details to see calculation preview
                </p>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* Validation Error Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Validation Errors
            </DialogTitle>
            <DialogDescription>
              Please fix the following issues before generating the CDA:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {calculation?.validationErrors.map((error, i) => (
              <Alert key={i} variant="destructive" className="py-2">
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowValidationDialog(false)}>
              OK, I'll fix these
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
