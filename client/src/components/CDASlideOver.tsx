// @ts-nocheck
/**
 * CDASlideOver - Global CDA Panel
 *
 * Opens as a right-side sheet panel from anywhere in the app.
 * Pre-populates with transaction data, allows full editing,
 * and provides Save (to history) + Print/Download PDF buttons.
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
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Printer,
  Save,
  Download,
  CheckCircle2,
  Building2,
  User,
  DollarSign,
  Home,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatUtils';
import { DotloopRecord } from '@/lib/csvParser';
import { generateCompleteCDAPDF, type CDAFormData } from '@/lib/cdaPdfGeneratorComplete';

// ─── CDA Data Type ────────────────────────────────────────────────────────────
export interface CDAData {
  // Property
  propertyAddress: string;
  mlsNumber?: string;
  salePrice: number;
  closingDate?: string;
  acceptanceDate?: string;
  loanType?: string;
  // Parties
  sellerName: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  buyerName?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  // Commission
  totalCommissionRate: number;
  totalGrossCommission: number;
  sellingSplitPercent: number;
  listingSplitPercent: number;
  sellingGrossCommission: number;
  listingGrossCommission: number;
  // Selling side
  sellingCompanyName?: string;
  sellingCompanyAddress?: string;
  sellingAgent1Name: string;
  sellingAgent1SplitPercent: number;
  sellingAgent1Commission: number;
  sellingAgent2Name?: string;
  sellingAgent2SplitPercent?: number;
  sellingAgent2Commission?: number;
  sellingBrokerSplitPercent: number;
  sellingBrokerageCommission: number;
  sellingCommissionAfterFees: number;
  // Listing side
  listingCompanyName?: string;
  listingCompanyAddress?: string;
  listingAgent1Name: string;
  listingAgent1SplitPercent: number;
  listingAgent1Commission: number;
  listingAgent2Name?: string;
  listingAgent2SplitPercent?: number;
  listingAgent2Commission?: number;
  listingBrokerSplitPercent: number;
  listingBrokerageCommission: number;
  listingCommissionAfterFees: number;
  // Referral
  referralCompanyName?: string;
  referralPercent?: number;
  referralType?: 'selling' | 'listing';
  referralFee?: number;
  // Meta
  titleCompany?: string;
  closingOfficer?: string;
  additionalNotes?: string;
}

// ─── Load brokerage settings from localStorage ───────────────────────────────
function loadBrokerageSettings() {
  try {
    const raw = localStorage.getItem('dotloop_settings_brokerage');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ─── Load commission defaults from localStorage ───────────────────────────────
function loadCommissionDefaults() {
  try {
    const raw = localStorage.getItem('dotloop_settings_commission');
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

// ─── Load agent plan assignments from localStorage ────────────────────────────
function loadAgentPlanAssignments(): Record<string, { splitPercent: number; transactionFee: number; capAmount: number }> {
  try {
    // Try tRPC-backed localStorage cache first
    const raw = localStorage.getItem('dotloop_agent_assignments');
    if (raw) return JSON.parse(raw);
    // Fallback: try legacy commission storage
    const legacyAssignments = localStorage.getItem('dotloop_agent_plan_assignments');
    const legacyPlans = localStorage.getItem('dotloop_commission_plans');
    if (legacyAssignments && legacyPlans) {
      const assignments = JSON.parse(legacyAssignments);
      const plans = JSON.parse(legacyPlans);
      const result: Record<string, { splitPercent: number; transactionFee: number; capAmount: number }> = {};
      for (const a of assignments) {
        const plan = plans.find((p: any) => p.id === a.planId);
        if (plan) {
          result[a.agentName] = {
            splitPercent: plan.splitPercentage || 80,
            transactionFee: plan.deductions?.find((d: any) => d.name?.toLowerCase().includes('transaction'))?.amount || 0,
            capAmount: plan.capAmount || 0,
          };
        }
      }
      return result;
    }
    return {};
  } catch { return {}; }
}

// ─── Load custom agent contact info from Settings ────────────────────────────
function loadCustomAgentContacts(): Record<string, { email: string; role: string }> {
  try {
    const raw = localStorage.getItem('dotloop_settings_customAgents');
    if (!raw) return {};
    const agents: Array<{ name: string; email: string; role: string }> = JSON.parse(raw);
    const result: Record<string, { email: string; role: string }> = {};
    for (const a of agents) {
      if (a.name) result[a.name] = { email: a.email || '', role: a.role || 'Agent' };
    }
    return result;
  } catch { return {}; }
}

// ─── Map DotloopRecord → CDAData (comprehensive auto-fill) ───────────────────
export function mapRecordToCDA(record: DotloopRecord): CDAData {
  // Load all available data sources
  const brokerage = loadBrokerageSettings();
  const commDefaults = loadCommissionDefaults();
  const agentPlans = loadAgentPlanAssignments();
  const agentContacts = loadCustomAgentContacts();

  // ── Property & Financial ──────────────────────────────────────────────────
  const salePrice = record.salePrice || record.price || 0;
  const addressParts = [
    record.address || record.streetAddress,
    record.city,
    record.state,
    record.zip,
  ].filter(Boolean);
  const address = addressParts.length > 0 ? addressParts.join(', ') : (record.loopName || '');

  // Commission rate: use record value, calculate from total, or fall back to settings default
  const settingsDefaultRate = parseFloat(commDefaults.defaultCommissionRate || '3');
  const commRate = record.commissionRate > 0
    ? record.commissionRate
    : salePrice > 0 && record.commissionTotal > 0
      ? (record.commissionTotal / salePrice) * 100
      : settingsDefaultRate;

  const grossCommission = record.commissionTotal > 0 ? record.commissionTotal : salePrice * (commRate / 100);

  // ── Agent Info ────────────────────────────────────────────────────────────
  // Handle multiple agents (comma-separated)
  const agentList = record.agents
    ? record.agents.split(',').map((a: string) => a.trim()).filter(Boolean)
    : record.createdBy
      ? [record.createdBy.trim()]
      : [];
  const primaryAgent = agentList[0] || '';
  const secondaryAgent = agentList[1] || '';

  // ── Commission Split from Plan ────────────────────────────────────────────
  const agentPlan = agentPlans[primaryAgent];
  const defaultSplitPct = parseFloat(commDefaults.defaultSplit || '80');
  const agentSplit = agentPlan?.splitPercent ?? defaultSplitPct;
  const brokerSplit = 100 - agentSplit;
  const transactionFee = agentPlan?.transactionFee ?? parseFloat(commDefaults.transactionFee || '0');

  // ── Selling / Listing split ───────────────────────────────────────────────
  // Determine from buySide/sellSide commission if available
  let sellingSplit = 50;
  let listingSplit = 50;
  if (record.buySideCommission > 0 && record.sellSideCommission > 0) {
    const total = record.buySideCommission + record.sellSideCommission;
    sellingSplit = Math.round((record.buySideCommission / total) * 100);
    listingSplit = 100 - sellingSplit;
  }

  const sellingGross = grossCommission * (sellingSplit / 100);
  const listingGross = grossCommission * (listingSplit / 100);

  // Agent commissions after transaction fee deduction
  const sellingAgentNet = Math.max(0, sellingGross * (agentSplit / 100) - transactionFee);
  const listingAgentNet = Math.max(0, listingGross * (agentSplit / 100) - transactionFee);

  // ── Brokerage info from Settings ─────────────────────────────────────────
  const brokerageName = brokerage.name || '';
  const brokerageAddress = [brokerage.address, brokerage.city, brokerage.state, brokerage.zip]
    .filter(Boolean).join(', ');

  // ── Agent contact info from Settings ─────────────────────────────────────
  const primaryAgentContact = agentContacts[primaryAgent] || { email: '', role: 'Agent' };

  // ── Referral ──────────────────────────────────────────────────────────────
  const referralPct = record.referralPercentage || 0;
  const referralFee = referralPct > 0 ? grossCommission * (referralPct / 100) : 0;
  const referralSource = record.referralSource || record.leadSource || '';

  // ── Additional notes from record metadata ────────────────────────────────
  const notes: string[] = [];
  if (record.loopId) notes.push(`Loop ID: ${record.loopId}`);
  if (record.complianceStatus && record.complianceStatus !== 'No Status') notes.push(`Compliance: ${record.complianceStatus}`);
  if (record.tags?.length) notes.push(`Tags: ${record.tags.join(', ')}`);
  if (record.subdivision) notes.push(`Subdivision: ${record.subdivision}`);
  if (record.schoolDistrict) notes.push(`School District: ${record.schoolDistrict}`);
  if (record.yearBuilt) notes.push(`Year Built: ${record.yearBuilt}`);
  if (record.squareFootage) notes.push(`Sq Ft: ${record.squareFootage.toLocaleString()}`);
  if (record.bedrooms) notes.push(`Beds: ${record.bedrooms}`);
  if (record.bathrooms) notes.push(`Baths: ${record.bathrooms}`);
  if (record.earnestMoney) notes.push(`Earnest Money: $${record.earnestMoney.toLocaleString()}`);
  if (transactionFee > 0) notes.push(`Transaction Fee: $${transactionFee} applied`);

  return {
    // Property
    propertyAddress: address,
    mlsNumber: (record as any).mlsNumber || (record as any).mls || '',
    salePrice,
    closingDate: record.closingDate || '',
    acceptanceDate: record.offerDate || '',
    loanType: (record as any).loanType || (record as any).financingType || '',
    // Parties — seller
    sellerName: (record as any).sellerName || (record as any).seller || '',
    sellerAddress: (record as any).sellerAddress || '',
    sellerPhone: (record as any).sellerPhone || '',
    sellerEmail: (record as any).sellerEmail || '',
    // Parties — buyer
    buyerName: (record as any).buyerName || (record as any).buyer || '',
    buyerAddress: (record as any).buyerAddress || '',
    buyerPhone: (record as any).buyerPhone || '',
    buyerEmail: (record as any).buyerEmail || '',
    // Commission
    totalCommissionRate: commRate,
    totalGrossCommission: grossCommission,
    sellingSplitPercent: sellingSplit,
    listingSplitPercent: listingSplit,
    sellingGrossCommission: sellingGross,
    listingGrossCommission: listingGross,
    // Selling side
    sellingCompanyName: brokerageName,
    sellingCompanyAddress: brokerageAddress,
    sellingAgent1Name: primaryAgent,
    sellingAgent1SplitPercent: agentSplit,
    sellingAgent1Commission: sellingAgentNet,
    sellingAgent2Name: secondaryAgent,
    sellingAgent2SplitPercent: secondaryAgent ? agentSplit : 0,
    sellingAgent2Commission: secondaryAgent ? sellingGross * (agentSplit / 100) / 2 : 0,
    sellingBrokerSplitPercent: brokerSplit,
    sellingBrokerageCommission: sellingGross * (brokerSplit / 100),
    sellingCommissionAfterFees: sellingAgentNet,
    // Listing side
    listingCompanyName: brokerageName,
    listingCompanyAddress: brokerageAddress,
    listingAgent1Name: primaryAgent,
    listingAgent1SplitPercent: agentSplit,
    listingAgent1Commission: listingAgentNet,
    listingAgent2Name: secondaryAgent,
    listingAgent2SplitPercent: secondaryAgent ? agentSplit : 0,
    listingAgent2Commission: secondaryAgent ? listingGross * (agentSplit / 100) / 2 : 0,
    listingBrokerSplitPercent: brokerSplit,
    listingBrokerageCommission: listingGross * (brokerSplit / 100),
    listingCommissionAfterFees: listingAgentNet,
    // Referral
    referralCompanyName: referralSource,
    referralPercent: referralPct,
    referralFee,
    referralType: referralPct > 0 ? 'selling' : undefined,
    // Meta
    titleCompany: (record as any).titleCompany || (record as any).closingCompany || '',
    closingOfficer: (record as any).closingOfficer || (record as any).closingAttorney || '',
    additionalNotes: notes.join(' | '),
  };
}

// ─── Recalculate derived values ───────────────────────────────────────────────
function recalculate(data: CDAData): CDAData {
  const gross = data.salePrice * (data.totalCommissionRate / 100);
  const sellingGross = gross * (data.sellingSplitPercent / 100);
  const listingGross = gross * (data.listingSplitPercent / 100);
  const s1Commission = sellingGross * (data.sellingAgent1SplitPercent / 100);
  const sBrokerCommission = sellingGross * (data.sellingBrokerSplitPercent / 100);
  const l1Commission = listingGross * (data.listingAgent1SplitPercent / 100);
  const lBrokerCommission = listingGross * (data.listingBrokerSplitPercent / 100);
  return {
    ...data,
    totalGrossCommission: gross,
    sellingGrossCommission: sellingGross,
    listingGrossCommission: listingGross,
    sellingAgent1Commission: s1Commission,
    sellingBrokerageCommission: sBrokerCommission,
    sellingCommissionAfterFees: s1Commission,
    listingAgent1Commission: l1Commission,
    listingBrokerageCommission: lBrokerCommission,
    listingCommissionAfterFees: l1Commission,
    referralFee: data.referralPercent ? gross * (data.referralPercent / 100) : 0,
  };
}

// ─── Number field helper ──────────────────────────────────────────────────────
function NumField({
  label,
  value,
  onChange,
  prefix = '$',
  suffix,
  readOnly,
}: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  prefix?: string;
  suffix?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          readOnly={readOnly}
          className={`h-7 text-sm ${readOnly ? 'bg-muted/30 text-muted-foreground' : ''}`}
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 text-sm"
      />
    </div>
  );
}

// ─── Save to history ──────────────────────────────────────────────────────────
function saveCDAToHistory(data: CDAData) {
  try {
    const history = JSON.parse(localStorage.getItem('cda_history') || '[]');
    history.unshift({
      id: Date.now().toString(),
      savedAt: new Date().toISOString(),
      propertyAddress: data.propertyAddress,
      salePrice: data.salePrice,
      data,
    });
    // Keep last 50
    localStorage.setItem('cda_history', JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save CDA to history', e);
  }
}

// ─── Convert CDAData → CDAFormData for PDF generation ────────────────────────
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
interface CDASlideOverProps {
  open: boolean;
  onClose: () => void;
  initialData: CDAData | null;
  sourceLabel?: string; // e.g. "123 Main St" or "Agent: John Smith"
}

export default function CDASlideOver({ open, onClose, initialData, sourceLabel }: CDASlideOverProps) {
  const [data, setData] = useState<CDAData | null>(null);
  const [saved, setSaved] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (initialData) {
      setData(recalculate(initialData));
      setSaved(false);
    }
  }, [initialData]);

  const update = useCallback((partial: Partial<CDAData>) => {
    setData(prev => prev ? recalculate({ ...prev, ...partial }) : prev);
    setSaved(false);
  }, []);

  const handleSave = () => {
    if (!data) return;
    saveCDAToHistory(data);
    setSaved(true);
    toast.success('CDA saved to history');
  };

  const handlePrint = async () => {
    if (!data) return;
    setIsGeneratingPDF(true);
    try {
      const formData = toCDAFormData(data);
      const pdfBytes = await generateCompleteCDAPDF(formData);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const filename = `CDA_${data.propertyAddress.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CDA PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintWindow = () => {
    if (!data) return;
    // Open CDA builder in new tab with data pre-filled
    const encoded = encodeURIComponent(JSON.stringify(data));
    window.open(`/cda-builder?data=${encoded}`, '_blank');
  };

  if (!data) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border bg-card/50">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4 text-primary" />
                Commission Disbursement Authorization
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {sourceLabel || data.propertyAddress || 'New CDA'}
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSave}
                className="h-7 text-xs gap-1"
              >
                {saved ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Save className="w-3 h-3" />}
                {saved ? 'Saved' : 'Save'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintWindow}
                className="h-7 text-xs gap-1"
              >
                <Printer className="w-3 h-3" />
                Full Editor
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                disabled={isGeneratingPDF}
                className="h-7 text-xs gap-1"
              >
                {isGeneratingPDF ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Summary bar */}
        <div className="px-6 py-3 bg-primary/5 border-b border-border flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium truncate max-w-[200px]">{data.propertyAddress || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs">{formatCurrency(data.salePrice)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Gross Commission:</span>
            <Badge variant="secondary" className="text-xs h-5">{formatCurrency(data.totalGrossCommission)}</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Rate:</span>
            <span className="text-xs font-medium">{data.totalCommissionRate.toFixed(2)}%</span>
          </div>
        </div>

        {/* Tabs */}
        <ScrollArea className="flex-1">
          <Tabs defaultValue="property" className="px-6 py-4">
            <TabsList className="mb-4 h-8">
              <TabsTrigger value="property" className="text-xs h-6">Property</TabsTrigger>
              <TabsTrigger value="parties" className="text-xs h-6">Parties</TabsTrigger>
              <TabsTrigger value="commission" className="text-xs h-6">Commission</TabsTrigger>
              <TabsTrigger value="selling" className="text-xs h-6">Selling Side</TabsTrigger>
              <TabsTrigger value="listing" className="text-xs h-6">Listing Side</TabsTrigger>
              <TabsTrigger value="referral" className="text-xs h-6">Referral</TabsTrigger>
            </TabsList>

            {/* Property Tab */}
            <TabsContent value="property" className="space-y-3 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <TextField label="Property Address" value={data.propertyAddress} onChange={v => update({ propertyAddress: v })} placeholder="123 Main St, City, ST" />
                </div>
                <TextField label="MLS Number" value={data.mlsNumber || ''} onChange={v => update({ mlsNumber: v })} placeholder="MLS#" />
                <TextField label="Loan Type" value={data.loanType || ''} onChange={v => update({ loanType: v })} placeholder="Conventional, FHA..." />
                <TextField label="Closing Date" value={data.closingDate || ''} onChange={v => update({ closingDate: v })} placeholder="MM/DD/YYYY" />
                <TextField label="Acceptance Date" value={data.acceptanceDate || ''} onChange={v => update({ acceptanceDate: v })} placeholder="MM/DD/YYYY" />
                <TextField label="Title Company" value={data.titleCompany || ''} onChange={v => update({ titleCompany: v })} placeholder="Title company name" />
                <TextField label="Closing Officer" value={data.closingOfficer || ''} onChange={v => update({ closingOfficer: v })} placeholder="Officer name" />
              </div>
            </TabsContent>

            {/* Parties Tab */}
            <TabsContent value="parties" className="space-y-4 mt-0">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><User className="w-3 h-3" /> Seller</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Seller Name" value={data.sellerName} onChange={v => update({ sellerName: v })} />
                  <TextField label="Seller Email" value={data.sellerEmail || ''} onChange={v => update({ sellerEmail: v })} />
                  <div className="col-span-2">
                    <TextField label="Seller Address" value={data.sellerAddress || ''} onChange={v => update({ sellerAddress: v })} />
                  </div>
                  <TextField label="Seller Phone" value={data.sellerPhone || ''} onChange={v => update({ sellerPhone: v })} />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><User className="w-3 h-3" /> Buyer</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Buyer Name" value={data.buyerName || ''} onChange={v => update({ buyerName: v })} />
                  <TextField label="Buyer Email" value={data.buyerEmail || ''} onChange={v => update({ buyerEmail: v })} />
                  <div className="col-span-2">
                    <TextField label="Buyer Address" value={data.buyerAddress || ''} onChange={v => update({ buyerAddress: v })} />
                  </div>
                  <TextField label="Buyer Phone" value={data.buyerPhone || ''} onChange={v => update({ buyerPhone: v })} />
                </div>
              </div>
            </TabsContent>

            {/* Commission Tab */}
            <TabsContent value="commission" className="space-y-3 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Sale Price" value={data.salePrice} onChange={v => update({ salePrice: v })} />
                <NumField label="Commission Rate %" value={data.totalCommissionRate} onChange={v => update({ totalCommissionRate: v })} prefix="" suffix="%" />
                <NumField label="Total Gross Commission" value={data.totalGrossCommission} readOnly />
                <div />
                <NumField label="Selling Split %" value={data.sellingSplitPercent} onChange={v => update({ sellingSplitPercent: v, listingSplitPercent: 100 - v })} prefix="" suffix="%" />
                <NumField label="Listing Split %" value={data.listingSplitPercent} onChange={v => update({ listingSplitPercent: v, sellingSplitPercent: 100 - v })} prefix="" suffix="%" />
                <NumField label="Selling Gross Commission" value={data.sellingGrossCommission} readOnly />
                <NumField label="Listing Gross Commission" value={data.listingGrossCommission} readOnly />
              </div>
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                <textarea
                  value={data.additionalNotes || ''}
                  onChange={e => update({ additionalNotes: e.target.value })}
                  className="w-full mt-1 p-2 text-sm rounded-md border border-input bg-background resize-none h-20"
                  placeholder="Any additional notes for this CDA..."
                />
              </div>
            </TabsContent>

            {/* Selling Side Tab */}
            <TabsContent value="selling" className="space-y-3 mt-0">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Selling Company</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Company Name" value={data.sellingCompanyName || ''} onChange={v => update({ sellingCompanyName: v })} />
                  <TextField label="Company Address" value={data.sellingCompanyAddress || ''} onChange={v => update({ sellingCompanyAddress: v })} />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agent 1</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Agent Name" value={data.sellingAgent1Name} onChange={v => update({ sellingAgent1Name: v })} />
                  <NumField label="Agent Split %" value={data.sellingAgent1SplitPercent} onChange={v => update({ sellingAgent1SplitPercent: v, sellingBrokerSplitPercent: 100 - v })} prefix="" suffix="%" />
                  <NumField label="Agent Commission" value={data.sellingAgent1Commission} readOnly />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agent 2 (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Agent Name" value={data.sellingAgent2Name || ''} onChange={v => update({ sellingAgent2Name: v })} />
                  <NumField label="Agent Split %" value={data.sellingAgent2SplitPercent || 0} onChange={v => update({ sellingAgent2SplitPercent: v })} prefix="" suffix="%" />
                  <NumField label="Agent Commission" value={data.sellingAgent2Commission || 0} readOnly />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Brokerage</p>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Broker Split %" value={data.sellingBrokerSplitPercent} onChange={v => update({ sellingBrokerSplitPercent: v, sellingAgent1SplitPercent: 100 - v })} prefix="" suffix="%" />
                  <NumField label="Brokerage Commission" value={data.sellingBrokerageCommission} readOnly />
                  <NumField label="Commission After Fees" value={data.sellingCommissionAfterFees} readOnly />
                </div>
              </div>
            </TabsContent>

            {/* Listing Side Tab */}
            <TabsContent value="listing" className="space-y-3 mt-0">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5"><Building2 className="w-3 h-3" /> Listing Company</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Company Name" value={data.listingCompanyName || ''} onChange={v => update({ listingCompanyName: v })} />
                  <TextField label="Company Address" value={data.listingCompanyAddress || ''} onChange={v => update({ listingCompanyAddress: v })} />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agent 1</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Agent Name" value={data.listingAgent1Name} onChange={v => update({ listingAgent1Name: v })} />
                  <NumField label="Agent Split %" value={data.listingAgent1SplitPercent} onChange={v => update({ listingAgent1SplitPercent: v, listingBrokerSplitPercent: 100 - v })} prefix="" suffix="%" />
                  <NumField label="Agent Commission" value={data.listingAgent1Commission} readOnly />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Agent 2 (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Agent Name" value={data.listingAgent2Name || ''} onChange={v => update({ listingAgent2Name: v })} />
                  <NumField label="Agent Split %" value={data.listingAgent2SplitPercent || 0} onChange={v => update({ listingAgent2SplitPercent: v })} prefix="" suffix="%" />
                  <NumField label="Agent Commission" value={data.listingAgent2Commission || 0} readOnly />
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Brokerage</p>
                <div className="grid grid-cols-2 gap-3">
                  <NumField label="Broker Split %" value={data.listingBrokerSplitPercent} onChange={v => update({ listingBrokerSplitPercent: v, listingAgent1SplitPercent: 100 - v })} prefix="" suffix="%" />
                  <NumField label="Brokerage Commission" value={data.listingBrokerageCommission} readOnly />
                  <NumField label="Commission After Fees" value={data.listingCommissionAfterFees} readOnly />
                </div>
              </div>
            </TabsContent>

            {/* Referral Tab */}
            <TabsContent value="referral" className="space-y-3 mt-0">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Referral Company" value={data.referralCompanyName || ''} onChange={v => update({ referralCompanyName: v })} />
                <NumField label="Referral %" value={data.referralPercent || 0} onChange={v => update({ referralPercent: v })} prefix="" suffix="%" />
                <NumField label="Referral Fee" value={data.referralFee || 0} readOnly />
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Referral Type</Label>
                  <div className="flex gap-2 mt-1">
                    {(['selling', 'listing'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => update({ referralType: data.referralType === type ? undefined : type })}
                        className={`px-3 py-1 text-xs rounded-md border transition-colors ${data.referralType === type ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        {/* Footer summary */}
        <div className="px-6 py-3 border-t border-border bg-card/50">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Selling Agent Net</p>
              <p className="text-sm font-semibold text-green-400">{formatCurrency(data.sellingCommissionAfterFees)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Listing Agent Net</p>
              <p className="text-sm font-semibold text-blue-400">{formatCurrency(data.listingCommissionAfterFees)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Gross</p>
              <p className="text-sm font-semibold">{formatCurrency(data.totalGrossCommission)}</p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
