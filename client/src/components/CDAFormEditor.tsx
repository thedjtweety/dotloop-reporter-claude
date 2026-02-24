/**
 * CDA Form Editor Component
 * Interactive form for reviewing and editing CDA data before PDF generation
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Download, Printer } from 'lucide-react';
import { generateCompleteCDAPDF } from '@/lib/cdaPdfGeneratorComplete';

interface CDAFormData {
  propertyAddress: string;
  mlsNumber?: string;
  salePrice: number;
  totalCommissionRate: number;
  totalGrossCommission: number;
  closingDate?: string;
  sellerName: string;
  sellerEmail?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  sellingSplitPercent: number;
  listingSplitPercent: number;
  sellingGrossCommission: number;
  listingGrossCommission: number;
  sellingCompanyName?: string;
  sellingAgent1Name: string;
  sellingAgent1SplitPercent: number;
  sellingAgent1Commission: number;
  sellingAgent2Name?: string;
  sellingAgent2SplitPercent?: number;
  sellingAgent2Commission?: number;
  sellingBrokerSplitPercent: number;
  sellingBrokerageCommission: number;
  listingCompanyName?: string;
  listingAgent1Name: string;
  listingAgent1SplitPercent: number;
  listingAgent1Commission: number;
  listingAgent2Name?: string;
  listingAgent2SplitPercent?: number;
  listingAgent2Commission?: number;
  listingBrokerSplitPercent: number;
  listingBrokerageCommission: number;
  referralCompanyName?: string;
  referralPercent?: number;
  referralType?: 'selling' | 'listing';
  referralFee?: number;
}

interface CDAFormEditorProps {
  cdaData: CDAFormData;
  onSave?: (data: CDAFormData) => void;
}

export default function CDAFormEditor({ cdaData, onSave }: CDAFormEditorProps) {
  const [formData, setFormData] = useState<CDAFormData>(cdaData);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setFormData(cdaData);
  }, [cdaData]);

  const handleChange = (field: keyof CDAFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNumericChange = (field: keyof CDAFormData, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleChange(field, numValue);
  };

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
      await generateCompleteCDAPDF(formData);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const html = generateCompleteCDAPDF(formData);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CDA-${formData.propertyAddress.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">CDA Form Review</h2>
          <p className="text-sm text-muted-foreground mt-1">Review and edit all fields before generating PDF</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            disabled={isGenerating}
            variant="outline"
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print Preview
          </Button>
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>
      </div>

      {/* Compliance Notice */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground">
            <p className="font-semibold mb-1">Compliance Review Required</p>
            <p className="text-foreground/70">Please review all fields carefully before generating the PDF. Ensure all commission calculations are accurate and all required fields are completed.</p>
          </div>
        </div>
      </Card>

      {/* Tabbed Form Sections */}
      <Tabs defaultValue="property" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Property Information */}
        <TabsContent value="property" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Property Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Property Address *</Label>
                <Input
                  id="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={(e) => handleChange('propertyAddress', e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mlsNumber">MLS Number</Label>
                <Input
                  id="mlsNumber"
                  value={formData.mlsNumber || ''}
                  onChange={(e) => handleChange('mlsNumber', e.target.value)}
                  placeholder="MLS #"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Sale Price *</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => handleNumericChange('salePrice', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closingDate">Closing Date</Label>
                <Input
                  id="closingDate"
                  type="date"
                  value={formData.closingDate || ''}
                  onChange={(e) => handleChange('closingDate', e.target.value)}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Parties Information */}
        <TabsContent value="parties" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Buyer & Seller Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sellerName">Seller Name *</Label>
                <Input
                  id="sellerName"
                  value={formData.sellerName}
                  onChange={(e) => handleChange('sellerName', e.target.value)}
                  placeholder="Seller Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellerEmail">Seller Email</Label>
                <Input
                  id="sellerEmail"
                  type="email"
                  value={formData.sellerEmail || ''}
                  onChange={(e) => handleChange('sellerEmail', e.target.value)}
                  placeholder="seller@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerName">Buyer Name</Label>
                <Input
                  id="buyerName"
                  value={formData.buyerName || ''}
                  onChange={(e) => handleChange('buyerName', e.target.value)}
                  placeholder="Buyer Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerEmail">Buyer Email</Label>
                <Input
                  id="buyerEmail"
                  type="email"
                  value={formData.buyerEmail || ''}
                  onChange={(e) => handleChange('buyerEmail', e.target.value)}
                  placeholder="buyer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerAddress">Buyer Address</Label>
                <Input
                  id="buyerAddress"
                  value={formData.buyerAddress || ''}
                  onChange={(e) => handleChange('buyerAddress', e.target.value)}
                  placeholder="Buyer Address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerPhone">Buyer Phone</Label>
                <Input
                  id="buyerPhone"
                  value={formData.buyerPhone || ''}
                  onChange={(e) => handleChange('buyerPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Commission Information */}
        <TabsContent value="commission" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Commission Structure</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="totalCommissionRate">Commission Rate (%) *</Label>
                <Input
                  id="totalCommissionRate"
                  type="number"
                  step="0.01"
                  value={formData.totalCommissionRate}
                  onChange={(e) => handleNumericChange('totalCommissionRate', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Total Gross Commission</Label>
                <div className="px-3 py-2 border border-input rounded-md bg-muted text-foreground font-semibold">
                  {formatCurrency(formData.totalGrossCommission)}
                </div>
              </div>
            </div>

            {/* Selling Side */}
            <div className="mb-6 pb-6 border-b border-border">
              <h4 className="font-semibold text-foreground mb-4">Selling Side</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingCompanyName">Company Name</Label>
                  <Input
                    id="sellingCompanyName"
                    value={formData.sellingCompanyName || ''}
                    onChange={(e) => handleChange('sellingCompanyName', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Split: {formData.sellingSplitPercent}%</Label>
                  <div className="px-3 py-2 border border-input rounded-md bg-muted text-foreground font-semibold">
                    {formatCurrency(formData.sellingGrossCommission)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingAgent1Name">Agent 1 Name *</Label>
                  <Input
                    id="sellingAgent1Name"
                    value={formData.sellingAgent1Name}
                    onChange={(e) => handleChange('sellingAgent1Name', e.target.value)}
                    placeholder="Agent Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingAgent1SplitPercent">Split %</Label>
                  <Input
                    id="sellingAgent1SplitPercent"
                    type="number"
                    step="0.01"
                    value={formData.sellingAgent1SplitPercent}
                    onChange={(e) => handleNumericChange('sellingAgent1SplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission</Label>
                  <div className="px-3 py-2 border border-input rounded-md bg-green-50 dark:bg-green-950 text-foreground font-semibold">
                    {formatCurrency(formData.sellingAgent1Commission)}
                  </div>
                </div>
              </div>

              {formData.sellingAgent2Name && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="sellingAgent2Name">Agent 2 Name</Label>
                    <Input
                      id="sellingAgent2Name"
                      value={formData.sellingAgent2Name}
                      onChange={(e) => handleChange('sellingAgent2Name', e.target.value)}
                      placeholder="Agent Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sellingAgent2SplitPercent">Split %</Label>
                    <Input
                      id="sellingAgent2SplitPercent"
                      type="number"
                      step="0.01"
                      value={formData.sellingAgent2SplitPercent || 0}
                      onChange={(e) => handleNumericChange('sellingAgent2SplitPercent', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Commission</Label>
                    <div className="px-3 py-2 border border-input rounded-md bg-green-50 dark:bg-green-950 text-foreground font-semibold">
                      {formatCurrency(formData.sellingAgent2Commission || 0)}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingBrokerSplitPercent">Brokerage Split %</Label>
                  <Input
                    id="sellingBrokerSplitPercent"
                    type="number"
                    step="0.01"
                    value={formData.sellingBrokerSplitPercent}
                    onChange={(e) => handleNumericChange('sellingBrokerSplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label>Brokerage Commission</Label>
                  <div className="px-3 py-2 border border-input rounded-md bg-green-50 dark:bg-green-950 text-foreground font-semibold">
                    {formatCurrency(formData.sellingBrokerageCommission)}
                  </div>
                </div>
              </div>
            </div>

            {/* Listing Side */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Listing Side</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="listingCompanyName">Company Name</Label>
                  <Input
                    id="listingCompanyName"
                    value={formData.listingCompanyName || ''}
                    onChange={(e) => handleChange('listingCompanyName', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Listing Split: {formData.listingSplitPercent}%</Label>
                  <div className="px-3 py-2 border border-input rounded-md bg-muted text-foreground font-semibold">
                    {formatCurrency(formData.listingGrossCommission)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="listingAgent1Name">Agent 1 Name *</Label>
                  <Input
                    id="listingAgent1Name"
                    value={formData.listingAgent1Name}
                    onChange={(e) => handleChange('listingAgent1Name', e.target.value)}
                    placeholder="Agent Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listingAgent1SplitPercent">Split %</Label>
                  <Input
                    id="listingAgent1SplitPercent"
                    type="number"
                    step="0.01"
                    value={formData.listingAgent1SplitPercent}
                    onChange={(e) => handleNumericChange('listingAgent1SplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Commission</Label>
                  <div className="px-3 py-2 border border-input rounded-md bg-green-50 dark:bg-green-950 text-foreground font-semibold">
                    {formatCurrency(formData.listingAgent1Commission)}
                  </div>
                </div>
              </div>

              {formData.listingAgent2Name && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="listingAgent2Name">Agent 2 Name</Label>
                    <Input
                      id="listingAgent2Name"
                      value={formData.listingAgent2Name}
                      onChange={(e) => handleChange('listingAgent2Name', e.target.value)}
                      placeholder="Agent Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listingAgent2SplitPercent">Split %</Label>
                    <Input
                      id="listingAgent2SplitPercent"
                      type="number"
                      step="0.01"
                      value={formData.listingAgent2SplitPercent || 0}
                      onChange={(e) => handleNumericChange('listingAgent2SplitPercent', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Commission</Label>
                    <div className="px-3 py-2 border border-input rounded-md bg-green-50 dark:bg-green-950 text-foreground font-semibold">
                      {formatCurrency(formData.listingAgent2Commission || 0)}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listingBrokerSplitPercent">Brokerage Split %</Label>
                  <Input
                    id="listingBrokerSplitPercent"
                    type="number"
                    step="0.01"
                    value={formData.listingBrokerSplitPercent}
                    onChange={(e) => handleNumericChange('listingBrokerSplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label>Brokerage Commission</Label>
                  <div className="px-3 py-2 border border-input rounded-md bg-green-50 dark:bg-green-950 text-foreground font-semibold">
                    {formatCurrency(formData.listingBrokerageCommission)}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Summary */}
        <TabsContent value="summary" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Commission Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-muted rounded">
                <span className="text-foreground/70">Sale Price:</span>
                <span className="font-semibold text-foreground">{formatCurrency(formData.salePrice)}</span>
              </div>
              <div className="flex justify-between p-3 bg-muted rounded">
                <span className="text-foreground/70">Commission Rate:</span>
                <span className="font-semibold text-foreground">{formData.totalCommissionRate}%</span>
              </div>
              <div className="flex justify-between p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                <span className="text-foreground font-semibold">Total Gross Commission:</span>
                <span className="font-bold text-green-700 dark:text-green-300">{formatCurrency(formData.totalGrossCommission)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-4 border border-border rounded">
                  <p className="text-sm text-foreground/70 mb-2">Selling Commission</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(formData.sellingGrossCommission)}</p>
                  <p className="text-xs text-foreground/60 mt-1">{formData.sellingSplitPercent}% of gross</p>
                </div>
                <div className="p-4 border border-border rounded">
                  <p className="text-sm text-foreground/70 mb-2">Listing Commission</p>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(formData.listingGrossCommission)}</p>
                  <p className="text-xs text-foreground/60 mt-1">{formData.listingSplitPercent}% of gross</p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Action Buttons */}
      <div className="flex justify-end gap-2 sticky bottom-0 bg-background p-4 border-t border-border">
        <Button
          onClick={handlePrint}
          disabled={isGenerating}
          variant="outline"
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Preview
        </Button>
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4" />
          {isGenerating ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>
    </div>
  );
}
