/**
 * Upload History Page
 * 
 * Displays all uploaded CSV files with:
 * - Upload metadata (filename, date, record count)
 * - Ability to compare two uploads side-by-side
 * - Ability to re-use data from previous uploads
 * - Comparison reports showing transaction differences
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, RefreshCw, BarChart3, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/formatUtils';

interface UploadWithMetadata {
  id: number;
  fileName: string;
  recordCount: number;
  uploadedAt: string;
  uploadedAtFormatted: string;
  status: 'success' | 'failed' | 'partial';
  fileSize?: number | null;
  [key: string]: any;
}

export default function UploadHistory() {
  const [selectedUpload1, setSelectedUpload1] = useState<number | null>(null);
  const [selectedUpload2, setSelectedUpload2] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showReuseDialog, setShowReuseDialog] = useState(false);
  const [reuseUploadId, setReuseUploadId] = useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(false);

  // Fetch upload history
  const { data: historyData, isLoading: historyLoading, refetch } = trpc.uploadHistory.getHistory.useQuery();

  // Compare uploads query
  const { refetch: compareUploads } = trpc.uploadHistory.compareUploads.useQuery(
    {
      uploadId1: selectedUpload1 || 0,
      uploadId2: selectedUpload2 || 0,
    },
    { enabled: false }
  );

  // Re-use upload query
  const { refetch: reuseUploadRefetch } = trpc.uploadHistory.reuseUpload.useQuery(
    { uploadId: reuseUploadId || 0 },
    { enabled: false }
  );

  const handleCompare = async () => {
    if (!selectedUpload1 || !selectedUpload2) {
      toast.error('⚠️ Please select two uploads to compare');
      return;
    }

    setIsComparing(true);
    try {
      const result = await compareUploads();
      if (result.data?.success) {
        setComparisonResult(result.data.comparison);
        setShowComparison(true);
        toast.success('✅ Comparison complete!');
      } else {
        toast.error(`❌ Comparison failed: ${result.data?.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const handleReuse = (uploadId: number) => {
    setReuseUploadId(uploadId);
    setShowReuseDialog(true);
  };

  const confirmReuse = async () => {
    if (!reuseUploadId) return;

    try {
      const result = await reuseUploadRefetch();
      if (result.data?.success) {
        toast.success(`✅ ${result.data.message}`);
        setShowReuseDialog(false);
      } else {
        toast.error(`❌ Re-use failed: ${result.data?.error}`);
      }
    } catch (error: any) {
      toast.error(`❌ Error: ${error.message}`);
    }
  };

  const uploads = historyData?.uploads || [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Upload History</h1>
          <p className="text-muted-foreground mt-1">View, compare, and re-use previous CSV uploads</p>
        </div>
        <Button
          onClick={() => refetch()}
          disabled={historyLoading}
          variant="outline"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Comparison Controls */}
      {uploads.length > 1 && (
        <Card className="p-4 bg-card/50 border-border">
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Compare Uploads</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Upload 1 (Older)</label>
                <select
                  value={selectedUpload1 || ''}
                  onChange={(e) => setSelectedUpload1(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">Select an upload...</option>
                  {uploads.map((upload) => (
                    <option key={upload.id} value={upload.id}>
                      {upload.fileName} ({upload.uploadedAtFormatted})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Upload 2 (Newer)</label>
                <select
                  value={selectedUpload2 || ''}
                  onChange={(e) => setSelectedUpload2(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="">Select an upload...</option>
                  {uploads.map((upload) => (
                    <option key={upload.id} value={upload.id}>
                      {upload.fileName} ({upload.uploadedAtFormatted})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={handleCompare}
              disabled={!selectedUpload1 || !selectedUpload2 || isComparing}
              className="w-full"
            >
              {isComparing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Compare Uploads
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Upload History Table */}
      <Card className="border-border">
        {historyLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : uploads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No uploads yet. Start by uploading a CSV file.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload: UploadWithMetadata) => (
                <TableRow key={upload.id} className="hover:bg-accent/50">
                  <TableCell className="font-medium text-foreground">{upload.fileName}</TableCell>
                  <TableCell className="text-muted-foreground">{upload.recordCount.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{upload.uploadedAtFormatted}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        upload.status === 'success'
                          ? 'default'
                          : upload.status === 'partial'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {upload.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReuse(upload.id)}
                      >
                        Re-use
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUpload1(upload.id);
                          toast.success('✅ Selected for comparison');
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Comparison Results Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Upload Comparison Report</DialogTitle>
            <DialogDescription>
              Detailed analysis of differences between two uploads
            </DialogDescription>
          </DialogHeader>

          {comparisonResult && (
            <div className="space-y-6">
              {/* Comparison Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 bg-green-50 dark:bg-green-950">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {comparisonResult.statistics.newCount}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">New Transactions</div>
                </Card>
                <Card className="p-4 bg-red-50 dark:bg-red-950">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {comparisonResult.statistics.deletedCount}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">Deleted Transactions</div>
                </Card>
                <Card className="p-4 bg-blue-50 dark:bg-blue-950">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {comparisonResult.statistics.modifiedCount}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Modified Transactions</div>
                </Card>
                <Card className="p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                    {comparisonResult.statistics.unchangedCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Unchanged</div>
                </Card>
              </div>

              {/* New Transactions */}
              {comparisonResult.newTransactions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    🆕 New Transactions ({comparisonResult.newTransactions.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comparisonResult.newTransactions.slice(0, 5).map((trans: any, idx: number) => (
                      <div key={idx} className="p-2 bg-green-50 dark:bg-green-950 rounded text-sm">
                        <div className="font-medium text-foreground">{trans.address || trans.loopName}</div>
                        <div className="text-muted-foreground">
                          {trans.loopStatus} • {formatCurrency(trans.price || 0)}
                        </div>
                      </div>
                    ))}
                    {comparisonResult.newTransactions.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        +{comparisonResult.newTransactions.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Deleted Transactions */}
              {comparisonResult.deletedTransactions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    🗑️ Deleted Transactions ({comparisonResult.deletedTransactions.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comparisonResult.deletedTransactions.slice(0, 5).map((trans: any, idx: number) => (
                      <div key={idx} className="p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                        <div className="font-medium text-foreground">{trans.address || trans.loopName}</div>
                        <div className="text-muted-foreground">
                          {trans.loopStatus} • {formatCurrency(trans.price || 0)}
                        </div>
                      </div>
                    ))}
                    {comparisonResult.deletedTransactions.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        +{comparisonResult.deletedTransactions.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modified Transactions */}
              {comparisonResult.modifiedTransactions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">
                    ✏️ Modified Transactions ({comparisonResult.modifiedTransactions.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comparisonResult.modifiedTransactions.slice(0, 5).map((mod: any, idx: number) => (
                      <div key={idx} className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-sm">
                        <div className="font-medium text-foreground">{mod.after.address || mod.after.loopName}</div>
                        <div className="text-muted-foreground">
                          Changed fields: {mod.changedFields.slice(0, 3).join(', ')}
                          {mod.changedFields.length > 3 && ` +${mod.changedFields.length - 3} more`}
                        </div>
                      </div>
                    ))}
                    {comparisonResult.modifiedTransactions.length > 5 && (
                      <div className="text-sm text-muted-foreground">
                        +{comparisonResult.modifiedTransactions.length - 5} more...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Re-use Confirmation Dialog */}
      <Dialog open={showReuseDialog} onOpenChange={setShowReuseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-use Upload Data</DialogTitle>
            <DialogDescription>
              Load all transactions from this upload into your current session?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will load all transactions from the selected upload, allowing you to review, modify, and generate reports.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReuseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={confirmReuse}>
                <Download className="w-4 h-4 mr-2" />
                Load Data
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
