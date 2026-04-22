// @ts-nocheck
/**
 * CDAHistoryPanel
 *
 * A slide-over panel showing all saved CDAs from localStorage.
 * Each entry can be re-opened in the CDASlideOver for editing/printing.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Clock,
  Home,
  DollarSign,
  RefreshCw,
  History,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatUtils';
import { CDAData } from '@/components/CDASlideOver';
import { generateCompleteCDAPDF, type CDAFormData } from '@/lib/cdaPdfGeneratorComplete';

// ─── History Entry Type ───────────────────────────────────────────────────────
export interface CDAHistoryEntry {
  id: string;
  savedAt: string;
  propertyAddress: string;
  salePrice: number;
  data: CDAData;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────
export function loadCDAHistory(): CDAHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('cda_history') || '[]');
  } catch { return []; }
}

export function deleteCDAHistoryEntry(id: string): CDAHistoryEntry[] {
  const history = loadCDAHistory().filter(e => e.id !== id);
  localStorage.setItem('cda_history', JSON.stringify(history));
  return history;
}

export function clearCDAHistory(): void {
  localStorage.removeItem('cda_history');
}

// ─── Convert CDAData → CDAFormData for PDF ───────────────────────────────────
function toCDAFormData(d: CDAData): CDAFormData {
  return {
    sellingCommission: true,
    listingCommission: true,
    propertyAddress: d.propertyAddress,
    mls: d.mlsNumber || '',
    buyerName: d.buyerName || '',
    buyerAddress: d.buyerAddress || '',
    buyerPhone: d.buyerPhone || '',
    buyerEmail: d.buyerEmail || '',
    sellerName: d.sellerName || '',
    sellerAddress: d.sellerAddress || '',
    sellerPhone: d.sellerPhone || '',
    sellerEmail: d.sellerEmail || '',
    loanType: d.loanType || '',
    purchasePrice: d.salePrice,
    totalGrossCommission: d.totalGrossCommission,
    totalGrossCommissionPercent: d.totalCommissionRate,
    sellingGrossCommission: d.sellingGrossCommission,
    sellingGrossCommissionPercent: d.sellingSplitPercent,
    listingGrossCommission: d.listingGrossCommission,
    listingGrossCommissionPercent: d.listingSplitPercent,
    referralPercent: d.referralPercent || 0,
    referralTotal: d.referralFee || 0,
    typeOfReferral: '',
    referralListing: d.referralType === 'listing',
    referralSelling: d.referralType === 'selling',
    referralContact: d.referralCompanyName || '',
    referralEmail: '',
    referralPhone: '',
    sellingCompanyPercent: d.sellingBrokerSplitPercent,
    sellingCompanyTotal: d.sellingBrokerageCommission,
    sellingCompanyAddress: d.sellingCompanyAddress || '',
    listingCompanyPercent: d.listingBrokerSplitPercent,
    listingCompanyTotal: d.listingBrokerageCommission,
    listingCompanyAddress: d.listingCompanyAddress || '',
    sellingCommissionBeforeFees: d.sellingGrossCommission,
    sellingOtherFees: [],
    sellingCommissionAfterFees: d.sellingCommissionAfterFees,
    listingCommissionBeforeFees: d.listingGrossCommission,
    listingOtherFees: [],
    listingCommissionAfterFees: d.listingCommissionAfterFees,
    sellingAgent1Name: d.sellingAgent1Name,
    sellingAgent1Percent: d.sellingAgent1SplitPercent,
    sellingAgent1OtherFees: [],
    sellingAgent1Total: d.sellingAgent1Commission,
    sellingAgent2Name: d.sellingAgent2Name || '',
    sellingAgent2Percent: d.sellingAgent2SplitPercent || 0,
    sellingAgent2OtherFees: [],
    sellingAgent2Total: d.sellingAgent2Commission || 0,
    listingAgent1Name: d.listingAgent1Name,
    listingAgent1Percent: d.listingAgent1SplitPercent,
    listingAgent1OtherFees: [],
    listingAgent1Total: d.listingAgent1Commission,
    listingAgent2Name: d.listingAgent2Name || '',
    listingAgent2Percent: d.listingAgent2SplitPercent || 0,
    listingAgent2OtherFees: [],
    listingAgent2Total: d.listingAgent2Commission || 0,
    sellingBrokeragePercent: d.sellingBrokerSplitPercent,
    sellingBrokerageOtherFees: [],
    sellingBrokerageTotalDue: d.sellingBrokerageCommission,
    listingBrokeragePercent: d.listingBrokerSplitPercent,
    listingBrokerageOtherFees: [],
    listingBrokerageTotalDue: d.listingBrokerageCommission,
    commissionDisbursementRequestedBy: d.sellingAgent1Name,
    additionalNotes: d.additionalNotes || '',
    closingDate: d.closingDate || '',
    acceptanceDate: d.acceptanceDate || '',
    salePrice: d.salePrice,
    grossCommission: d.totalGrossCommission,
    grossCommissionPercent: d.totalCommissionRate,
    titleCompany: d.titleCompany || '',
    closingOfficer: d.closingOfficer || '',
    referralBrokerage: d.referralCompanyName || '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CDAHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onReopen: (data: CDAData, label: string) => void;
}

export default function CDAHistoryPanel({ open, onClose, onReopen }: CDAHistoryPanelProps) {
  const [history, setHistory] = useState<CDAHistoryEntry[]>([]);
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Reload history whenever panel opens
  useEffect(() => {
    if (open) {
      setHistory(loadCDAHistory());
      setSearch('');
    }
  }, [open]);

  const handleDelete = useCallback((id: string) => {
    const updated = deleteCDAHistoryEntry(id);
    setHistory(updated);
    toast.success('CDA removed from history');
  }, []);

  const handleClearAll = useCallback(() => {
    clearCDAHistory();
    setHistory([]);
    toast.success('CDA history cleared');
  }, []);

  const handleReopen = useCallback((entry: CDAHistoryEntry) => {
    onReopen(entry.data, `${entry.propertyAddress} (saved ${new Date(entry.savedAt).toLocaleDateString()})`);
    onClose();
  }, [onReopen, onClose]);

  const handleDownloadPDF = useCallback(async (entry: CDAHistoryEntry) => {
    setDownloadingId(entry.id);
    try {
      const formData = toCDAFormData(entry.data);
      const pdfBytes = await generateCompleteCDAPDF(formData);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = `CDA_${entry.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${new Date(entry.savedAt).toISOString().slice(0, 10)}.pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const filtered = history.filter(e =>
    !search ||
    e.propertyAddress.toLowerCase().includes(search.toLowerCase()) ||
    e.data.sellingAgent1Name?.toLowerCase().includes(search.toLowerCase()) ||
    e.data.sellerName?.toLowerCase().includes(search.toLowerCase()) ||
    e.data.buyerName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalGCI = filtered.reduce((sum, e) => sum + (e.data.totalGrossCommission || 0), 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-card/50">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                <History className="w-4 h-4 text-primary" />
                CDA History
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {history.length} saved CDA{history.length !== 1 ? 's' : ''} · Total GCI: {formatCurrency(totalGCI)}
              </SheetDescription>
            </div>
            {history.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                className="h-7 text-xs text-destructive hover:text-destructive gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Search */}
        {history.length > 0 && (
          <div className="px-6 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by address, agent, buyer, seller..."
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* List */}
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
              {history.length === 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">No saved CDAs yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click the CDA button on any transaction, fill in the details, and hit Save to store it here.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No CDAs match your search</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="px-6 py-4 hover:bg-accent/30 transition-colors group"
                >
                  {/* Address & date */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Home className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-sm font-medium truncate">{entry.propertyAddress || 'Unknown Address'}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Saved {new Date(entry.savedAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReopen(entry)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Re-open & edit"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadPDF(entry)}
                        disabled={downloadingId === entry.id}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Download PDF"
                      >
                        {downloadingId === entry.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(entry.id)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Financial summary */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Sale:</span>
                      <span className="text-xs font-medium">{formatCurrency(entry.salePrice)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">GCI:</span>
                      <Badge variant="secondary" className="text-xs h-4 px-1.5">
                        {formatCurrency(entry.data.totalGrossCommission)}
                      </Badge>
                    </div>
                    {entry.data.totalCommissionRate > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {entry.data.totalCommissionRate.toFixed(2)}%
                      </span>
                    )}
                  </div>

                  {/* Agents */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {entry.data.sellingAgent1Name && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Selling:</span>
                        <span className="text-xs font-medium">{entry.data.sellingAgent1Name}</span>
                        <span className="text-xs text-green-500">
                          ({formatCurrency(entry.data.sellingCommissionAfterFees)})
                        </span>
                      </div>
                    )}
                    {entry.data.listingAgent1Name && entry.data.listingAgent1Name !== entry.data.sellingAgent1Name && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Listing:</span>
                        <span className="text-xs font-medium">{entry.data.listingAgent1Name}</span>
                        <span className="text-xs text-blue-400">
                          ({formatCurrency(entry.data.listingCommissionAfterFees)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Parties */}
                  {(entry.data.sellerName || entry.data.buyerName) && (
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {entry.data.sellerName && (
                        <span className="text-xs text-muted-foreground">
                          Seller: <span className="text-foreground">{entry.data.sellerName}</span>
                        </span>
                      )}
                      {entry.data.buyerName && (
                        <span className="text-xs text-muted-foreground">
                          Buyer: <span className="text-foreground">{entry.data.buyerName}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action buttons (always visible on mobile, hover on desktop) */}
                  <div className="flex items-center gap-2 mt-3 sm:hidden">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReopen(entry)}
                      className="h-7 text-xs gap-1 flex-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPDF(entry)}
                      disabled={downloadingId === entry.id}
                      className="h-7 text-xs gap-1 flex-1"
                    >
                      {downloadingId === entry.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(entry.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer stats */}
        {filtered.length > 0 && (
          <>
            <Separator />
            <div className="px-6 py-3 bg-card/50">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Total CDAs</p>
                  <p className="text-sm font-semibold">{filtered.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Volume</p>
                  <p className="text-sm font-semibold">{formatCurrency(filtered.reduce((s, e) => s + e.salePrice, 0))}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total GCI</p>
                  <p className="text-sm font-semibold text-green-400">{formatCurrency(totalGCI)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
