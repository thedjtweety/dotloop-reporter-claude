import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Calendar, MapPin, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatUtils';
import { Skeleton } from '@/components/ui/skeleton';
import FullScreenModal from '@/components/FullScreenModal';

export default function CDAHistory() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const limit = 10;

  const { data: historyData, isLoading, refetch } = trpc.cdaHistory.getHistory.useQuery({
    limit,
    offset: page * limit,
  });

  const deleteMutation = trpc.cdaHistory.delete.useMutation({
    onSuccess: () => {
      setDeleteId(null);
      refetch();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CDA History</CardTitle>
          <CardDescription>Previously generated Commission Disbursement Authorizations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const records = historyData?.records || [];
  const total = historyData?.total || 0;
  const hasMore = historyData?.hasMore || false;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>CDA History</CardTitle>
          <CardDescription>Previously generated Commission Disbursement Authorizations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No CDAs generated yet. Upload a CSV to get started.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-semibold text-foreground truncate">{record.propertyAddress}</h4>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm text-foreground/70">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 flex-shrink-0" />
                          {formatCurrency(record.salePrice)}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 flex-shrink-0" />
                          Commission: {formatCurrency(record.grossCommission)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          {formatDate(new Date(record.generatedAt))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-auto sm:ml-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = record.pdfPath;
                          link.download = record.pdfFileName;
                          link.click();
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(record.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} CDAs
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!hasMore}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <FullScreenModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete CDA"
        subtitle="Are you sure you want to delete this CDA record? This action cannot be undone."
      >
        <div className="max-w-2xl mx-auto py-12 flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="text-center space-y-6">
            <p className="text-lg text-muted-foreground">
              This will permanently delete the CDA record and cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                className="sm:min-w-[150px]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (deleteId) {
                    deleteMutation.mutate({ cdaId: deleteId });
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:min-w-[150px]"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </FullScreenModal>
    </>
  );
}
