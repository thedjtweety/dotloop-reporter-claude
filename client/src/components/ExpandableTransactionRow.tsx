/**
 * ExpandableTransactionRow Component
 * Displays a transaction row with expandable details showing full metadata
 */

import { useState } from 'react';
import { DotloopRecord } from '@/lib/csvParser';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { mapTransactionToCDA, encodeCDAData, getCommissionPlanForAgent } from '@/lib/cdaHelpers';
import { formatCurrency } from '@/lib/formatUtils';
import DotloopLogo from './DotloopLogo';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

interface ExpandableTransactionRowProps {
  transaction: DotloopRecord;
  visibleColumns: string[];
  compact?: boolean;
  onTransactionClick?: (transaction: DotloopRecord) => void;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
  showCheckbox?: boolean;
}

const getStatusColor = (status: string): string => {
  const lower = status?.toLowerCase() || '';
  if (lower.includes('closed') || lower.includes('sold')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (lower.includes('active')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (lower.includes('contract') || lower.includes('pending')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  if (lower.includes('archived')) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
};

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return 'N/A';
  }
};

export default function ExpandableTransactionRow({
  transaction,
  visibleColumns,
  compact = false,
  onTransactionClick,
  isSelected = false,
  onSelectionChange,
  showCheckbox = false,
}: ExpandableTransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [, setLocation] = useLocation();
  
  // Simplified CDA generation mutation
  const generateCDAMutation = trpc.cdaSimple.generateQuick.useMutation({
    onSuccess: (result) => {
      if (result.success && result.calculation) {
        toast.success(`✅ CDA Generated! Commission: ${formatCurrency(result.calculation.grossCommission)}`);
        // Navigate to CDA builder with the generated data for review/editing
        const encoded = encodeCDAData(result.cdaData);
        setLocation(`/cda-builder?data=${encoded}`);
      } else {
        toast.error(`❌ CDA Generation Failed: ${result.error || 'Unknown error'}`);
      }
    },
    onError: (error) => {
      toast.error(`❌ CDA Generation Failed: ${error.message}`);
    },
  });
  
  const handleGenerateCDA = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Get agent name (handle comma-separated multiple agents)
    const agentName = transaction.agents ? transaction.agents.split(',')[0].trim() : transaction.createdBy || '';
    
    // Determine transaction type
    const transactionType = transaction.transactionType?.toLowerCase().includes('listing') ? 'listing' as const :
                           transaction.transactionType?.toLowerCase().includes('selling') ? 'selling' as const :
                           'both' as const;
    
    // Generate CDA with simplified endpoint
    generateCDAMutation.mutate({
      propertyAddress: transaction.address || 'Unknown Property',
      salePrice: transaction.salePrice || transaction.price || 0,
      agentName,
      commissionRate: transaction.commissionRate || 3,
      closingDate: transaction.closingDate,
      mlsNumber: transaction.mlsNumber,
      transactionType,
    });
  };

  const renderCellContent = (column: string) => {
    switch (column) {
      case 'status':
        return (
          <Badge className={`${getStatusColor(transaction.loopStatus)} font-semibold`}>
            {transaction.loopStatus || 'Unknown'}
          </Badge>
        );
      case 'property':
        return (
          <div className="space-y-0.5">
            <div className="font-medium text-foreground truncate">{transaction.address || 'N/A'}</div>
            <div className="text-xs text-foreground/60">
              {transaction.city && transaction.state ? `${transaction.city}, ${transaction.state}` : 'N/A'}
            </div>
          </div>
        );
      case 'agent':
        return <div className="text-foreground truncate">{transaction.agents || 'N/A'}</div>;
      case 'price':
        return <div className="text-foreground font-semibold">{formatCurrency(transaction.salePrice || transaction.price || 0)}</div>;
      case 'commission':
        return <div className="text-foreground font-semibold">{formatCurrency(transaction.commissionTotal || 0)}</div>;
      case 'date':
        return <div className="text-foreground text-sm">{formatDate(transaction.closingDate || transaction.createdDate || '')}</div>;
      case 'actions':
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateCDA}
              disabled={generateCDAMutation.isPending}
              className="gap-1 text-primary hover:text-primary/80"
              title="Generate CDA"
            >
              {generateCDAMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{generateCDAMutation.isPending ? 'Generating...' : 'CDA'}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                if (transaction.loopViewUrl) {
                  window.open(transaction.loopViewUrl, '_blank');
                }
              }}
              disabled={!transaction.loopViewUrl}
              className="gap-1"
            >
              <DotloopLogo className="w-4 h-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <TableRow
        onClick={() => {
          if (onTransactionClick) {
            onTransactionClick(transaction);
          } else {
            setIsExpanded(!isExpanded);
          }
        }}
        className={`cursor-pointer hover:bg-muted/50 transition-colors ${isExpanded ? 'bg-muted/30' : ''}`}
      >
        {showCheckbox && (
          <TableCell className={`w-12 ${compact ? 'py-1 px-2' : 'py-2 px-4'}`}>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelectionChange?.(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 cursor-pointer"
              aria-label="Select transaction"
            />
          </TableCell>
        )}
        <TableCell className={`w-8 ${compact ? 'py-1 px-2' : 'py-2 px-4'}`}>
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </TableCell>

        {visibleColumns.includes('status') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('status')}
          </TableCell>
        )}
        {visibleColumns.includes('property') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('property')}
          </TableCell>
        )}
        {visibleColumns.includes('agent') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('agent')}
          </TableCell>
        )}
        {visibleColumns.includes('price') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('price')}
          </TableCell>
        )}
        {visibleColumns.includes('commission') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('commission')}
          </TableCell>
        )}
        {visibleColumns.includes('date') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('date')}
          </TableCell>
        )}
        {visibleColumns.includes('actions') && (
          <TableCell className={compact ? 'py-1 px-2' : 'py-2 px-4'}>
            {renderCellContent('actions')}
          </TableCell>
        )}
      </TableRow>

      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={visibleColumns.length + 1} className={compact ? 'py-2 px-2' : 'py-4 px-4'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Property Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Property Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Address:</span>
                    <span className="text-foreground font-medium">{transaction.address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">City:</span>
                    <span className="text-foreground">{transaction.city || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">State:</span>
                    <span className="text-foreground">{transaction.state || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">County:</span>
                    <span className="text-foreground">{transaction.county || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Type:</span>
                    <span className="text-foreground">{transaction.propertyType || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Subdivision:</span>
                    <span className="text-foreground">{transaction.subdivision || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Financial Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">List Price:</span>
                    <span className="text-foreground font-medium">{formatCurrency(transaction.price || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Sale Price:</span>
                    <span className="text-foreground font-medium">{formatCurrency(transaction.salePrice || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Commission Rate:</span>
                    <span className="text-foreground">{((transaction.commissionRate || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Total Commission:</span>
                    <span className="text-foreground font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(transaction.commissionTotal || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Buy Side:</span>
                    <span className="text-foreground">{formatCurrency(transaction.buySideCommission || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Sell Side:</span>
                    <span className="text-foreground">{formatCurrency(transaction.sellSideCommission || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Company Dollar:</span>
                    <span className="text-foreground font-medium">{formatCurrency(transaction.companyDollar || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Timeline & Status */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Timeline & Status</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Created:</span>
                    <span className="text-foreground">{formatDate(transaction.createdDate || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Listing:</span>
                    <span className="text-foreground">{formatDate(transaction.listingDate || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Offer:</span>
                    <span className="text-foreground">{formatDate(transaction.offerDate || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Closing:</span>
                    <span className="text-foreground font-medium">{formatDate(transaction.closingDate || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Status:</span>
                    <Badge className={getStatusColor(transaction.loopStatus)}>
                      {transaction.loopStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Compliance:</span>
                    <span className="text-foreground">{transaction.complianceStatus || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Additional Details</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Agent:</span>
                    <span className="text-foreground">{transaction.agents || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Created By:</span>
                    <span className="text-foreground">{transaction.createdBy || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Lead Source:</span>
                    <span className="text-foreground">{transaction.leadSource || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Referral Source:</span>
                    <span className="text-foreground">{transaction.referralSource || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Referral %:</span>
                    <span className="text-foreground">{((transaction.referralPercentage || 0) * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Earnest Money:</span>
                    <span className="text-foreground">{formatCurrency(transaction.earnestMoney || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Property Features */}
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Property Features</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Bedrooms:</span>
                    <span className="text-foreground">{transaction.bedrooms || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Bathrooms:</span>
                    <span className="text-foreground">{transaction.bathrooms || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Square Footage:</span>
                    <span className="text-foreground">{transaction.squareFootage?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Lot Size:</span>
                    <span className="text-foreground">{transaction.lotSize || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-foreground/60">Year Built:</span>
                    <span className="text-foreground">{transaction.yearBuilt || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {transaction.tags && transaction.tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-sm">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {transaction.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dotloop Link */}
            {transaction.loopViewUrl && (
              <div className="mt-4 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(transaction.loopViewUrl, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Dotloop
                </Button>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
