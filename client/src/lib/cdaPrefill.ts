import { DotloopRecord } from './csvParser';

export interface CDAPrefill {
  address?: string;
  city?: string;
  state?: string;
  salePrice?: number;
  closingDate?: string;
  transactionType?: string;
  mlsNumber?: string;
  agentName?: string;
  commissionRate?: number;
  commissionTotal?: number;
  buySideCommission?: number;
  sellSideCommission?: number;
  companyDollar?: number;
}

export function buildCDAPrefill(r: DotloopRecord): CDAPrefill {
  return {
    address: r.address || r.loopName || '',
    city: r.city || '',
    state: r.state || '',
    salePrice: r.salePrice || r.price || 0,
    closingDate: r.closingDate || '',
    transactionType: (r as any).transactionType || r.propertyType || '',
    mlsNumber: (r as any).mlsNumber || '',
    agentName: r.agents ? r.agents.split(',')[0].trim() : '',
    commissionRate: r.commissionRate || 0,
    commissionTotal: r.commissionTotal || 0,
    buySideCommission: r.buySideCommission || 0,
    sellSideCommission: r.sellSideCommission || 0,
    companyDollar: r.companyDollar || 0,
  };
}

export const CDA_PREFILL_KEY = 'cda-prefill';

export function storeCDAPrefill(r: DotloopRecord): void {
  localStorage.setItem(CDA_PREFILL_KEY, JSON.stringify(buildCDAPrefill(r)));
}
