import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Calendar, MapPin, DollarSign, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CDARecord {
  id: string;
  propertyAddress: string;
  salePrice: number;
  grossCommission: number;
  generatedAt: string;
  pdfData: string; // Base64 encoded PDF
}

export default function CDAHistory() {
  const [records, setRecords] = useState<CDARecord[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load CDA history from localStorage
    const stored = localStorage.getItem('cda_history');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecords(parsed.sort((a: CDARecord, b: CDARecord) => 
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        ));
      } catch (e) {
        console.error('Failed to load CDA history:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    localStorage.setItem('cda_history', JSON.stringify(updated));
    setDeleteId(null);
  };

  const handleDownload = (record: CDARecord) => {
    try {
      // Convert base64 to blob
      const binaryString = atob(record.pdfData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CDA_${record.propertyAddress.replace(/\s+/g, '_')}_${new Date(record.generatedAt).toISOString().split('T')[0]}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      alert('Failed to download PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container max-w-4xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading CDA history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">CDA History</h1>
          <p className="text-muted-foreground">View and manage your previously generated Commission Disbursement Authorizations</p>
        </div>

        {records.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">No CDAs Generated Yet</h2>
            <p className="text-muted-foreground mb-6">
              Start by uploading a CSV file to generate your first Commission Disbursement Authorization.
            </p>
            <Button onClick={() => window.location.href = '/cda-builder'}>
              Go to CDA Generator
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              {records.length} CDA{records.length !== 1 ? 's' : ''} generated
            </div>

            <div className="space-y-3">
              {records.map((record) => (
                <Card key={record.id} className="p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground">{record.propertyAddress}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-foreground/70 flex-wrap">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          Sale Price: {formatCurrency(record.salePrice)}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          Commission: {formatCurrency(record.grossCommission)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(record.generatedAt).toLocaleDateString()} {new Date(record.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(record)}
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(record.id)}
                        title="Delete CDA"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete CDA</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this CDA record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  handleDelete(deleteId);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
