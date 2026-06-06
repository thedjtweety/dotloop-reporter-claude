import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/formatUtils';
import { DotloopRecord } from '@/lib/csvParser';

export interface DrillTarget {
  title: string;
  records: DotloopRecord[];
  subtitle?: string;
}

const STATUS_STYLE: Record<string, string> = {
  'Closed':           'bg-emerald-500/20 text-emerald-400',
  'Under Contract':   'bg-blue-500/20 text-blue-400',
  'Active':           'bg-yellow-500/20 text-yellow-400',
  'Active Listing':   'bg-yellow-500/20 text-yellow-400',
  'Archived':         'bg-secondary text-muted-foreground',
};

function exportCSV(title: string, records: DotloopRecord[]) {
  const headers = ['Address', 'Agent', 'Status', 'Closing Date', 'Sale Price', 'GCI', 'Company Dollar'];
  const rows = records.map(r => [
    r.address || r.loopName || '',
    r.agents || '',
    r.loopStatus || '',
    r.closingDate || '',
    r.salePrice ?? '',
    r.commissionTotal ?? '',
    r.companyDollar ?? '',
  ]);
  const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const MAX_DISPLAY = 200;

export function TxDrillModal({ target, onClose }: {
  target: DrillTarget | null;
  onClose: () => void;
}) {
  if (!target) return null;

  const { title, records, subtitle } = target;
  const displayed = records.slice(0, MAX_DISPLAY);
  const totalVolume = records.reduce((s, r) => s + (r.salePrice || 0), 0);
  const totalGCI    = records.reduce((s, r) => s + (r.commissionTotal || 0), 0);
  const autoSubtitle = subtitle ?? `${records.length} transaction${records.length !== 1 ? 's' : ''} · ${formatCurrency(totalVolume)} volume · ${formatCurrency(totalGCI)} GCI`;

  return (
    <Dialog open={!!target} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-background border border-border">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <DialogTitle className="text-foreground text-lg">{title}</DialogTitle>
              <p className="text-muted-foreground text-xs mt-1">{autoSubtitle}</p>
            </div>
            <button
              onClick={() => exportCSV(title, records)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors shrink-0 mt-0.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] mt-2">
          {records.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">No transactions in this category.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2.5 pr-4 font-medium pl-1">Address</th>
                  <th className="text-left py-2.5 pr-4 font-medium">Agent</th>
                  <th className="text-left py-2.5 pr-4 font-medium">Status</th>
                  <th className="text-left py-2.5 pr-4 font-medium">Closing Date</th>
                  <th className="text-right py-2.5 pr-4 font-medium">Sale Price</th>
                  <th className="text-right py-2.5 pr-1 font-medium">GCI</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-secondary/40 transition-colors">
                    <td className="py-2.5 pr-4 pl-1 text-foreground font-medium">{r.address || r.loopName || '—'}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground text-xs">{r.agents || '—'}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.loopStatus || ''] ?? 'bg-secondary text-muted-foreground'}`}>
                        {r.loopStatus || '—'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-muted-foreground text-xs">{r.closingDate || '—'}</td>
                    <td className="py-2.5 pr-4 text-right text-muted-foreground text-xs tabular-nums">
                      {r.salePrice ? formatCurrency(r.salePrice) : '—'}
                    </td>
                    <td className="py-2.5 pr-1 text-right text-emerald-400 text-xs tabular-nums font-medium">
                      {r.commissionTotal ? formatCurrency(r.commissionTotal) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>

        {records.length > MAX_DISPLAY && (
          <p className="text-muted-foreground text-xs mt-2 text-center">
            Showing {MAX_DISPLAY} of {records.length} records. Export CSV to see all.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
