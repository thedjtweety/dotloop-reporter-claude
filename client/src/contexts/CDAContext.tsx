/**
 * CDAContext - Global CDA slide-over panel state
 *
 * Provides a global hook `useCDAPanel()` that any component can call to open
 * the CDA slide-over with pre-populated data from a DotloopRecord.
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DotloopRecord } from '@/lib/csvParser';
import CDASlideOver, { CDAData, mapRecordToCDA } from '@/components/CDASlideOver';

interface CDAContextValue {
  openCDA: (record: DotloopRecord, label?: string) => void;
  openCDAWithData: (data: CDAData, label?: string) => void;
  closeCDA: () => void;
}

const CDAContext = createContext<CDAContextValue | null>(null);

export function CDAProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [cdaData, setCDAData] = useState<CDAData | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | undefined>();

  const openCDA = useCallback((record: DotloopRecord, label?: string) => {
    const data = mapRecordToCDA(record);
    setCDAData(data);
    setSourceLabel(label || record.loopName || record.address || 'Transaction');
    setOpen(true);
  }, []);

  const openCDAWithData = useCallback((data: CDAData, label?: string) => {
    setCDAData(data);
    setSourceLabel(label);
    setOpen(true);
  }, []);

  const closeCDA = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <CDAContext.Provider value={{ openCDA, openCDAWithData, closeCDA }}>
      {children}
      <CDASlideOver
        open={open}
        onClose={closeCDA}
        initialData={cdaData}
        sourceLabel={sourceLabel}
      />
    </CDAContext.Provider>
  );
}

export function useCDAPanel() {
  const ctx = useContext(CDAContext);
  if (!ctx) throw new Error('useCDAPanel must be used within CDAProvider');
  return ctx;
}
