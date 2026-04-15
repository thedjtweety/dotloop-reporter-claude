/**
 * CDAContext - Global CDA slide-over panel state
 *
 * Provides a global hook `useCDAPanel()` that any component can call to open
 * the CDA slide-over with pre-populated data from a DotloopRecord.
 * Also provides `openCDAHistory()` to open the CDA History panel.
 */
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { DotloopRecord } from '@/lib/csvParser';
import CDASlideOver, { CDAData, mapRecordToCDA } from '@/components/CDASlideOver';
import CDAHistoryPanel from '@/components/CDAHistoryPanel';

interface CDAContextValue {
  openCDA: (record: DotloopRecord, label?: string) => void;
  openCDAWithData: (data: CDAData, label?: string) => void;
  closeCDA: () => void;
  openCDAHistory: () => void;
  closeCDAHistory: () => void;
}

const CDAContext = createContext<CDAContextValue | null>(null);

export function CDAProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [cdaData, setCDAData] = useState<CDAData | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | undefined>();

  const [historyOpen, setHistoryOpen] = useState(false);

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

  const openCDAHistory = useCallback(() => {
    setHistoryOpen(true);
  }, []);

  const closeCDAHistory = useCallback(() => {
    setHistoryOpen(false);
  }, []);

  // When reopening a CDA from history, close history first then open slide-over
  const handleReopenFromHistory = useCallback((data: CDAData, label: string) => {
    setHistoryOpen(false);
    setCDAData(data);
    setSourceLabel(label);
    setOpen(true);
  }, []);

  return (
    <CDAContext.Provider value={{ openCDA, openCDAWithData, closeCDA, openCDAHistory, closeCDAHistory }}>
      {children}
      <CDASlideOver
        open={open}
        onClose={closeCDA}
        initialData={cdaData}
        sourceLabel={sourceLabel}
      />
      <CDAHistoryPanel
        open={historyOpen}
        onClose={closeCDAHistory}
        onReopen={handleReopenFromHistory}
      />
    </CDAContext.Provider>
  );
}

export function useCDAPanel() {
  const ctx = useContext(CDAContext);
  if (!ctx) throw new Error('useCDAPanel must be used within CDAProvider');
  return ctx;
}
