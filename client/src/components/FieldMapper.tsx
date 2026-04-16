import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Check, Save, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface ColumnMapping {
  [key: string]: string;
}

interface FieldMapperProps {
  headers: string[];
  initialMapping?: ColumnMapping;
  samples?: Record<string, string>;
  onSave: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const FIELD_GROUPS = {
  core: {
    title: 'Core Info',
    fields: [
      { key: 'loopId', label: 'Loop ID', required: true },
      { key: 'loopName', label: 'Loop Name', required: true },
      { key: 'loopStatus', label: 'Loop Status', required: true },
      { key: 'address', label: 'Address', required: true },
    ]
  },
  dates: {
    title: 'Dates',
    fields: [
      { key: 'createdDate', label: 'Created Date', required: false },
      { key: 'closingDate', label: 'Closing Date', required: false },
      { key: 'listingDate', label: 'Listing Date', required: false },
      { key: 'offerDate', label: 'Offer Date', required: false },
    ]
  },
  financials: {
    title: 'Financials',
    fields: [
      { key: 'price', label: 'Sale Price', required: true },
      { key: 'commissionTotal', label: 'Total Commission', required: false },
      { key: 'buySideCommission', label: 'Buy Side Commission', required: false },
      { key: 'sellSideCommission', label: 'Sell Side Commission', required: false },
      { key: 'companyDollar', label: 'Company Dollar', required: false },
      { key: 'earnestMoney', label: 'Earnest Money', required: false },
      { key: 'originalPrice', label: 'Original List Price', required: false },
    ]
  },
  property: {
    title: 'Property Details',
    fields: [
      { key: 'propertyType', label: 'Property Type', required: false },
      { key: 'bedrooms', label: 'Bedrooms', required: false },
      { key: 'bathrooms', label: 'Bathrooms', required: false },
      { key: 'squareFootage', label: 'Square Footage', required: false },
      { key: 'yearBuilt', label: 'Year Built', required: false },
      { key: 'lotSize', label: 'Lot Size', required: false },
      { key: 'subdivision', label: 'Subdivision', required: false },
      { key: 'city', label: 'City', required: false },
      { key: 'state', label: 'State', required: false },
      { key: 'zipCode', label: 'Zip Code', required: false },
    ]
  },
  operational: {
    title: 'Operational',
    fields: [
      { key: 'agents', label: 'Agents', required: false },
      { key: 'leadSource', label: 'Lead Source', required: false },
      { key: 'referralSource', label: 'Referral Source', required: false },
      { key: 'referralPercentage', label: 'Referral %', required: false },
      { key: 'complianceStatus', label: 'Compliance Status', required: false },
      { key: 'tags', label: 'Tags', required: false },
    ]
  },
  parties: {
    title: 'Buyer & Seller Info',
    fields: [
      { key: 'buyerName', label: 'Buyer Name', required: false },
      { key: 'buyerEmail', label: 'Buyer Email', required: false },
      { key: 'buyerPhone', label: 'Buyer Phone', required: false },
      { key: 'sellerName', label: 'Seller Name', required: false },
      { key: 'sellerEmail', label: 'Seller Email', required: false },
      { key: 'sellerPhone', label: 'Seller Phone', required: false },
    ]
  }
};

export default function FieldMapper({ headers, initialMapping = {}, samples = {}, onSave, onCancel }: FieldMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);
  const [activeTab, setActiveTab] = useState('core');

  // Auto-map based on exact name matches if no initial mapping provided
  useEffect(() => {
    if (Object.keys(initialMapping).length === 0) {
      const newMapping: ColumnMapping = {};
      // Simple heuristic: if header includes the field label (case-insensitive), map it
      // This is a basic start, the user will refine it
      Object.values(FIELD_GROUPS).forEach(group => {
        group.fields.forEach(field => {
          const match = headers.find(h => h.toLowerCase().includes(field.label.toLowerCase()));
          if (match) {
            newMapping[field.key] = match;
          }
        });
      });
      setMapping(newMapping);
    }
  }, [headers, initialMapping]);

  const handleMapChange = (fieldKey: string, value: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleReset = () => {
    setMapping({});
  };

  const getMappedCount = () => Object.keys(mapping).length;
  const getTotalFields = () => Object.values(FIELD_GROUPS).reduce((acc, g) => acc + g.fields.length, 0);

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg border-border bg-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl font-display font-bold">Map Your Data</CardTitle>
            <CardDescription>
              Match columns from your CSV to the report fields. We've tried to auto-match them for you.
            </CardDescription>
          </div>
          <div className="text-sm text-foreground bg-muted px-3 py-1 rounded-full">
            {getMappedCount()} / {getTotalFields()} fields mapped
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-6">
            {Object.entries(FIELD_GROUPS).map(([key, group]) => (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                {group.title}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] pr-4">
            {Object.entries(FIELD_GROUPS).map(([key, group]) => (
              <TabsContent key={key} value={key} className="mt-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.fields.map((field) => (
                    <div key={field.key} className="space-y-2 p-3 rounded-lg border border-border/50 hover:border-border transition-colors bg-card/50">
                      <div className="flex justify-between items-center">
                        <Label htmlFor={field.key} className="font-medium flex items-center gap-2">
                          {field.label}
                          {field.required && <span className="text-red-500 text-xs">*</span>}
                        </Label>
                        {mapping[field.key] && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <Select 
                        value={mapping[field.key] || "unmapped"} 
                        onValueChange={(val) => handleMapChange(field.key, val === "unmapped" ? "" : val)}
                      >
                        <SelectTrigger id={field.key} className={mapping[field.key] ? "border-emerald-500/50 bg-emerald-500/5" : ""}>
                          <SelectValue placeholder="Select column..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped" className="text-foreground italic">
                            -- Not Mapped --
                          </SelectItem>
                          {headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              <span className="font-medium">{header}</span>
                              {samples[header] && (
                                <span className="ml-2 text-xs text-foreground truncate max-w-[200px] inline-block align-bottom">
                                  (e.g. "{samples[header].length > 30 ? samples[header].substring(0, 30) + '...' : samples[header]}")
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <Alert className="mt-6 bg-blue-500/10 border-blue-500/20 text-blue-500">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tip</AlertTitle>
          <AlertDescription>
            Your mappings will be saved automatically for future uploads.
          </AlertDescription>
        </Alert>
      </CardContent>

      <CardFooter className="flex justify-between border-t border-border pt-6">
        <Button variant="ghost" onClick={handleReset} className="text-foreground hover:text-foreground">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(mapping)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Save & Process
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
