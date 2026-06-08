import { FileText } from 'lucide-react';
import { useLocation } from 'wouter';
import { DotloopRecord } from '@/lib/csvParser';
import { storeCDAPrefill } from '@/lib/cdaPrefill';

interface CDAButtonProps {
  record: DotloopRecord;
  className?: string;
}

export function CDAButton({ record, className = '' }: CDAButtonProps) {
  const [, navigate] = useLocation();

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    storeCDAPrefill(record);
    navigate('/cda-builder');
  }

  return (
    <button
      onClick={handleClick}
      title="Build CDA for this transaction"
      className={`flex items-center gap-1 px-2 py-1 text-xs rounded border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors ${className}`}
    >
      <FileText className="w-3 h-3" />
      CDA
    </button>
  );
}
