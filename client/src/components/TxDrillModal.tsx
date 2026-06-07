// Re-export from the unified DrillDownModal component
// All pages importing TxDrillModal continue to work without changes
export type { DrillTarget } from './DrillDownModal';
export { DrillDownModal as TxDrillModal, DrillDownModal } from './DrillDownModal';
