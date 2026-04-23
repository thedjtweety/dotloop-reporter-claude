import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Upload, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ColumnMapping {
  csvColumn: string;
  prospectField: string;
  matched: boolean;
}

interface CSVUploadValidatorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (file: File, mappings: Record<string, string>) => void;
  file: File | null;
  csvHeaders: string[];
  previewData: any[];
}

const PROSPECT_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'primaryPhone', label: 'Primary Phone', required: false },
  { key: 'mobilePhone', label: 'Mobile Phone', required: false },
  { key: 'office', label: 'Office', required: false },
  { key: 'agentAddress', label: 'Agent Address', required: false },
  { key: 'officeLocation', label: 'Office Location', required: false },
  { key: 'mlsId', label: 'MLS ID', required: false },
  { key: 'listSideUnits', label: 'List Side Units', required: false },
  { key: 'listSideVolume', label: 'List Side Volume', required: false },
  { key: 'salesSideUnits', label: 'Sales Side Units', required: false },
  { key: 'salesSideVolume', label: 'Sales Side Volume', required: false },
  { key: 'totalUnits', label: 'Total Units', required: false },
  { key: 'totalVolume', label: 'Total Volume', required: false },
];

export default function CSVUploadValidator({
  isOpen,
  onClose,
  onConfirm,
  file,
  csvHeaders,
  previewData,
}: CSVUploadValidatorProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [selectedTab, setSelectedTab] = useState<'mapping' | 'preview'>('mapping');

  // Auto-detect field mappings based on header names
  React.useEffect(() => {
    if (csvHeaders.length === 0) return;

    const autoMappings: Record<string, string> = {};
    const lowerHeaders = csvHeaders.map(h => h.toLowerCase());

    PROSPECT_FIELDS.forEach(field => {
      const headerIndex = lowerHeaders.findIndex(h =>
        h.includes(field.label.toLowerCase().replace(/\s+/g, '')) ||
        h.includes(field.key.toLowerCase())
      );

      if (headerIndex !== -1) {
        autoMappings[field.key] = csvHeaders[headerIndex];
      }
    });

    setMappings(autoMappings);
  }, [csvHeaders]);

  const requiredFieldsMapped = PROSPECT_FIELDS.filter(f => f.required).every(
    f => mappings[f.key]
  );

  const handleMappingChange = (fieldKey: string, csvColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldKey]: csvColumn,
    }));
  };

  const handleConfirm = () => {
    if (!file) return;
    onConfirm(file, mappings);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validate CSV Upload</DialogTitle>
          <DialogDescription>
            Map your CSV columns to prospect fields before importing
          </DialogDescription>
        </DialogHeader>

        {!requiredFieldsMapped && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Please map all required fields (marked with *) before importing
            </AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setSelectedTab('mapping')}
            className={`px-4 py-2 font-medium ${
              selectedTab === 'mapping'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-muted-foreground'
            }`}
          >
            Column Mapping
          </button>
          <button
            onClick={() => setSelectedTab('preview')}
            className={`px-4 py-2 font-medium ${
              selectedTab === 'preview'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-muted-foreground'
            }`}
          >
            Preview Data ({previewData.length})
          </button>
        </div>

        {/* Mapping Tab */}
        {selectedTab === 'mapping' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROSPECT_FIELDS.map(field => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    {field.required && <span className="text-red-500">*</span>}
                    {mappings[field.key] && (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <select
                    value={mappings[field.key] || ''}
                    onChange={e => handleMappingChange(field.key, e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                  >
                    <option value="">-- Select column --</option>
                    {csvHeaders.map(header => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {selectedTab === 'preview' && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Showing first {Math.min(5, previewData.length)} rows of {previewData.length} total records
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {csvHeaders.map(header => (
                      <th key={header} className="px-4 py-2 text-left font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      {csvHeaders.map(header => (
                        <td key={`${idx}-${header}`} className="px-4 py-2">
                          {row[header]?.toString() || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!requiredFieldsMapped}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import Prospects
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
