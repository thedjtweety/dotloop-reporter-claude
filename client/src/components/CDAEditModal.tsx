/**
 * CDA Edit Modal Component
 * Allows users to edit CDA summary data before generating PDF
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';

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

interface CDAEditModalProps {
  open: boolean;
  cdaData: CDAData;
  onClose: () => void;
  onSave: (data: CDAData) => void;
}

export default function CDAEditModal({ open, cdaData, onClose, onSave }: CDAEditModalProps) {
  const [editedData, setEditedData] = useState<CDAData>(cdaData);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Validate commission splits
  const validateCommissions = (data: CDAData) => {
    const errors: string[] = [];
    const sellingTotal = (data.sellingAgent1SplitPercent || 0) + (data.sellingAgent2SplitPercent || 0) + (data.sellingBrokerSplitPercent || 0);
    const listingTotal = (data.listingAgent1SplitPercent || 0) + (data.listingAgent2SplitPercent || 0) + (data.listingBrokerSplitPercent || 0);
    
    if (data.referralType === 'selling' && data.referralPercent) {
      const sellingWithReferral = sellingTotal + (data.referralPercent || 0);
      if (Math.abs(sellingWithReferral - 100) > 0.01) {
        errors.push(`Selling side splits total ${sellingWithReferral.toFixed(2)}% instead of 100%`);
      }
    } else {
      if (Math.abs(sellingTotal - 100) > 0.01) {
        errors.push(`Selling side splits total ${sellingTotal.toFixed(2)}% instead of 100%`);
      }
    }
    
    if (data.referralType === 'listing' && data.referralPercent) {
      const listingWithReferral = listingTotal + (data.referralPercent || 0);
      if (Math.abs(listingWithReferral - 100) > 0.01) {
        errors.push(`Listing side splits total ${listingWithReferral.toFixed(2)}% instead of 100%`);
      }
    } else {
      if (Math.abs(listingTotal - 100) > 0.01) {
        errors.push(`Listing side splits total ${listingTotal.toFixed(2)}% instead of 100%`);
      }
    }
    
    return errors;
  };

  // Calculate commission disbursements
  const calculateCommissions = (data: CDAData) => {
    const totalGrossCommission = data.salePrice * (data.totalCommissionRate / 100);
    const sellingGrossCommission = totalGrossCommission * (data.sellingSplitPercent / 100);
    const listingGrossCommission = totalGrossCommission * (data.listingSplitPercent / 100);
    
    let referralCommission = 0;
    if (data.referralPercent && data.referralType) {
      const referralBase = data.referralType === 'selling' ? sellingGrossCommission : listingGrossCommission;
      referralCommission = referralBase * (data.referralPercent / 100);
    }
    
    const sellingAgent1Commission = sellingGrossCommission * (data.sellingAgent1SplitPercent / 100);
    const sellingAgent2Commission = data.sellingAgent2SplitPercent ? sellingGrossCommission * (data.sellingAgent2SplitPercent / 100) : 0;
    const sellingBrokerageCommission = sellingGrossCommission - sellingAgent1Commission - sellingAgent2Commission - (data.referralType === 'selling' ? referralCommission : 0);
    
    const listingAgent1Commission = listingGrossCommission * (data.listingAgent1SplitPercent / 100);
    const listingAgent2Commission = data.listingAgent2SplitPercent ? listingGrossCommission * (data.listingAgent2SplitPercent / 100) : 0;
    const listingBrokerageCommission = listingGrossCommission - listingAgent1Commission - listingAgent2Commission - (data.referralType === 'listing' ? referralCommission : 0);
    
    return {
      totalGrossCommission,
      sellingGrossCommission,
      listingGrossCommission,
      sellingAgent1Commission,
      sellingAgent2Commission,
      sellingBrokerageCommission,
      listingAgent1Commission,
      listingAgent2Commission,
      listingBrokerageCommission,
      referralCommission,
    };
  };

  const handleChange = (field: keyof CDAData, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
    setValidationErrors([]);
  };

  const handleNumericChange = (field: keyof CDAData, value: string) => {
    const numValue = parseFloat(value) || 0;
    handleChange(field, numValue);
  };

  const handleSave = () => {
    const errors = validateCommissions(editedData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const calcs = calculateCommissions(editedData);
    const updatedData = {
      ...editedData,
      totalGrossCommission: calcs.totalGrossCommission,
      sellingGrossCommission: calcs.sellingGrossCommission,
      listingGrossCommission: calcs.listingGrossCommission,
      sellingAgent1Commission: calcs.sellingAgent1Commission,
      sellingAgent2Commission: calcs.sellingAgent2Commission,
      sellingBrokerageCommission: calcs.sellingBrokerageCommission,
      listingAgent1Commission: calcs.listingAgent1Commission,
      listingAgent2Commission: calcs.listingAgent2Commission,
      listingBrokerageCommission: calcs.listingBrokerageCommission,
      referralFee: calcs.referralCommission,
    };
    onSave(updatedData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit CDA Summary</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6 pr-4">
            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-2">Commission Split Errors:</p>
                {validationErrors.map((error, idx) => (
                  <p key={idx} className="text-sm text-red-800 dark:text-red-200">• {error}</p>
                ))}
              </div>
            )}

            {/* Property Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Property Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyAddress">Property Address *</Label>
                  <Input
                    id="propertyAddress"
                    value={editedData.propertyAddress}
                    onChange={(e) => handleChange('propertyAddress', e.target.value)}
                    placeholder="123 Main St, City, State 12345"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mlsNumber">MLS Number</Label>
                  <Input
                    id="mlsNumber"
                    value={editedData.mlsNumber || ''}
                    onChange={(e) => handleChange('mlsNumber', e.target.value)}
                    placeholder="MLS #"
                  />
                </div>
              </div>
            </div>

            {/* Commission Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Commission Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salePrice">Sale Price *</Label>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    value={editedData.salePrice}
                    onChange={(e) => handleNumericChange('salePrice', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="totalCommissionRate">Commission Rate (%) *</Label>
                  <Input
                    id="totalCommissionRate"
                    type="number"
                    step="0.01"
                    value={editedData.totalCommissionRate}
                    onChange={(e) => handleNumericChange('totalCommissionRate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Selling Side */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Selling Side</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingCompanyName">Company Name</Label>
                  <Input
                    id="sellingCompanyName"
                    value={editedData.sellingCompanyName || ''}
                    onChange={(e) => handleChange('sellingCompanyName', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingAgent1Name">Agent 1 Name *</Label>
                  <Input
                    id="sellingAgent1Name"
                    value={editedData.sellingAgent1Name}
                    onChange={(e) => handleChange('sellingAgent1Name', e.target.value)}
                    placeholder="Agent Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingAgent1SplitPercent">Agent 1 Split (%)</Label>
                  <Input
                    id="sellingAgent1SplitPercent"
                    type="number"
                    step="0.01"
                    value={editedData.sellingAgent1SplitPercent}
                    onChange={(e) => handleNumericChange('sellingAgent1SplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingAgent2Name">Agent 2 Name</Label>
                  <Input
                    id="sellingAgent2Name"
                    value={editedData.sellingAgent2Name || ''}
                    onChange={(e) => handleChange('sellingAgent2Name', e.target.value)}
                    placeholder="Agent Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingAgent2SplitPercent">Agent 2 Split (%)</Label>
                  <Input
                    id="sellingAgent2SplitPercent"
                    type="number"
                    step="0.01"
                    value={editedData.sellingAgent2SplitPercent || 0}
                    onChange={(e) => handleNumericChange('sellingAgent2SplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sellingBrokerSplitPercent">Brokerage Split (%)</Label>
                <Input
                  id="sellingBrokerSplitPercent"
                  type="number"
                  step="0.01"
                  value={editedData.sellingBrokerSplitPercent}
                  onChange={(e) => handleNumericChange('sellingBrokerSplitPercent', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Listing Side */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Listing Side</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listingCompanyName">Company Name</Label>
                  <Input
                    id="listingCompanyName"
                    value={editedData.listingCompanyName || ''}
                    onChange={(e) => handleChange('listingCompanyName', e.target.value)}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listingAgent1Name">Agent 1 Name *</Label>
                  <Input
                    id="listingAgent1Name"
                    value={editedData.listingAgent1Name}
                    onChange={(e) => handleChange('listingAgent1Name', e.target.value)}
                    placeholder="Agent Name"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="listingAgent1SplitPercent">Agent 1 Split (%)</Label>
                  <Input
                    id="listingAgent1SplitPercent"
                    type="number"
                    step="0.01"
                    value={editedData.listingAgent1SplitPercent}
                    onChange={(e) => handleNumericChange('listingAgent1SplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listingAgent2Name">Agent 2 Name</Label>
                  <Input
                    id="listingAgent2Name"
                    value={editedData.listingAgent2Name || ''}
                    onChange={(e) => handleChange('listingAgent2Name', e.target.value)}
                    placeholder="Agent Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listingAgent2SplitPercent">Agent 2 Split (%)</Label>
                  <Input
                    id="listingAgent2SplitPercent"
                    type="number"
                    step="0.01"
                    value={editedData.listingAgent2SplitPercent || 0}
                    onChange={(e) => handleNumericChange('listingAgent2SplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="listingBrokerSplitPercent">Brokerage Split (%)</Label>
                <Input
                  id="listingBrokerSplitPercent"
                  type="number"
                  step="0.01"
                  value={editedData.listingBrokerSplitPercent}
                  onChange={(e) => handleNumericChange('listingBrokerSplitPercent', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Referral Company */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Referral Company (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referralCompanyName">Company Name</Label>
                  <Input
                    id="referralCompanyName"
                    value={editedData.referralCompanyName || ''}
                    onChange={(e) => handleChange('referralCompanyName', e.target.value)}
                    placeholder="Referral Company"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralPercent">Commission Split (%)</Label>
                  <Input
                    id="referralPercent"
                    type="number"
                    step="0.01"
                    value={editedData.referralPercent || 0}
                    onChange={(e) => handleNumericChange('referralPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralType">Applied To</Label>
                <select
                  id="referralType"
                  value={editedData.referralType || 'selling'}
                  onChange={(e) => handleChange('referralType', e.target.value as 'selling' | 'listing')}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                >
                  <option value="selling">Selling Side</option>
                  <option value="listing">Listing Side</option>
                </select>
              </div>
            </div>

            {/* Commission Splits */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Commission Splits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sellingSplitPercent">Selling Split (%)</Label>
                  <Input
                    id="sellingSplitPercent"
                    type="number"
                    step="0.01"
                    value={editedData.sellingSplitPercent}
                    onChange={(e) => handleNumericChange('sellingSplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listingSplitPercent">Listing Split (%)</Label>
                  <Input
                    id="listingSplitPercent"
                    type="number"
                    step="0.01"
                    value={editedData.listingSplitPercent}
                    onChange={(e) => handleNumericChange('listingSplitPercent', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Commission Calculations Display */}
            <div className="space-y-4 bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-foreground">Commission Disbursement Calculations</h3>
              {(() => {
                const calcs = calculateCommissions(editedData);
                return (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/70">Total Gross Commission:</span>
                      <span className="font-semibold text-foreground">${calcs.totalGrossCommission.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-green-300 dark:border-green-700 pt-3">
                      <p className="font-semibold text-foreground mb-2">Selling Commission: ${calcs.sellingGrossCommission.toFixed(2)}</p>
                      <div className="ml-4 space-y-1 text-foreground/70">
                        <div className="flex justify-between">
                          <span>→ Agent 1:</span>
                          <span>${calcs.sellingAgent1Commission.toFixed(2)}</span>
                        </div>
                        {editedData.sellingAgent2Name && (
                          <div className="flex justify-between">
                            <span>→ Agent 2:</span>
                            <span>${calcs.sellingAgent2Commission.toFixed(2)}</span>
                          </div>
                        )}
                        {editedData.referralType === 'selling' && editedData.referralPercent && (
                          <div className="flex justify-between">
                            <span>→ Referral:</span>
                            <span>${calcs.referralCommission.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>→ Brokerage:</span>
                          <span>${calcs.sellingBrokerageCommission.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-green-300 dark:border-green-700 pt-3">
                      <p className="font-semibold text-foreground mb-2">Listing Commission: ${calcs.listingGrossCommission.toFixed(2)}</p>
                      <div className="ml-4 space-y-1 text-foreground/70">
                        <div className="flex justify-between">
                          <span>→ Agent 1:</span>
                          <span>${calcs.listingAgent1Commission.toFixed(2)}</span>
                        </div>
                        {editedData.listingAgent2Name && (
                          <div className="flex justify-between">
                            <span>→ Agent 2:</span>
                            <span>${calcs.listingAgent2Commission.toFixed(2)}</span>
                          </div>
                        )}
                        {editedData.referralType === 'listing' && editedData.referralPercent && (
                          <div className="flex justify-between">
                            <span>→ Referral:</span>
                            <span>${calcs.referralCommission.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold text-foreground">
                          <span>→ Brokerage:</span>
                          <span>${calcs.listingBrokerageCommission.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800 flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-foreground">
                <p className="font-semibold mb-1">Fields marked with * are required</p>
                <p className="text-foreground/70">All commission splits must total 100% on each side</p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
