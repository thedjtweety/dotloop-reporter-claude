import { useState, useMemo } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, Plus, Trash2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';

interface Agent {
  role: 'listing_agent' | 'listing_broker' | 'buying_agent' | 'buying_broker';
  name: string;
  legalEntity: string;
  company: string;
  licenseNumber: string;
  tinSsn: string;
  phone: string;
  email: string;
}

interface Deduction {
  id: string;
  description: string;
  amount: number;
  side: 'listing' | 'buying' | 'both';
  type: 'flat' | 'percentage';
}

export default function CDABuilderPage() {
  const { user } = useAuth();
  const { transactionData } = useTransactionData();
  const { data: branding } = trpc.branding.getBranding.useQuery();
  const generatePdfMutation = trpc.cda.generatePdf.useMutation();

  // Mode: 'select' (from CSV) or 'scratch' (manual entry)
  const [mode, setMode] = useState<'select' | 'scratch'>('select');
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    // Closing/Title Company
    titleCompany: '',
    closerName: '',
    phone: '',
    email: '',
    fileNumber: '',

    // Property & Transaction
    transactionType: 'sale',
    propertyAddress: '',
    city: '',
    state: '',
    zipCode: '',
    county: '',
    mlsNumber: '',
    salePrice: 0,
    closingDate: '',
    contractDate: '',
    buyerName: '',
    sellerName: '',

    // Commission Waterfall
    totalCommissionRate: 6,
    listingSide: 50,
    buyingSide: 50,
    referralFee: 0,
    referralAppliesto: 'none',
    franchiseFee: 0,
    listingAgentSplit: 70,
    buyingAgentSplit: 70,

    // Disbursement Instructions
    disbursementInstructions: '',
    notes: '',
  });

  const [agents, setAgents] = useState<Agent[]>([
    {
      role: 'listing_agent',
      name: '',
      legalEntity: '',
      company: '',
      licenseNumber: '',
      tinSsn: '',
      phone: '',
      email: '',
    },
  ]);

  const [deductions, setDeductions] = useState<Deduction[]>([
    { id: '1', description: 'Transaction Coordinator Fee', amount: 0, side: 'both', type: 'flat' },
    { id: '2', description: 'E&O Insurance', amount: 0, side: 'both', type: 'flat' },
  ]);

  // Auto-populate from selected transaction
  const handleTransactionSelect = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    const transaction = transactionData?.find(t => t.loopId === transactionId);
    if (transaction) {
      setFormData(prev => ({
        ...prev,
        propertyAddress: transaction.address || '',
        city: transaction.city || '',
        state: transaction.state || '',
        zipCode: transaction.zipCode || '',
        county: transaction.county || '',
        mlsNumber: transaction.mlsNumber || '',
        salePrice: transaction.salePrice || transaction.price || 0,
        closingDate: transaction.closingDate || '',
        contractDate: transaction.createdDate || '',
      }));
    }
  };

  // Calculate waterfall
  const waterfall = useMemo(() => {
    const gci = (formData.salePrice * formData.totalCommissionRate) / 100;
    const listingSide = (gci * formData.listingSide) / 100;
    const buyingSide = (gci * formData.buyingSide) / 100;

    let referralAmount = 0;
    if (formData.referralAppliesto !== 'none') {
      referralAmount = (gci * formData.referralFee) / 100;
    }

    const franchiseAmount = (gci * formData.franchiseFee) / 100;

    const listingAgentGross = (listingSide * formData.listingAgentSplit) / 100;
    const listingBrokerGross = listingSide - listingAgentGross;

    const buyingAgentGross = (buyingSide * formData.buyingAgentSplit) / 100;
    const buyingBrokerGross = buyingSide - buyingAgentGross;

    // Deductions
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    return {
      gci,
      listingSide,
      buyingSide,
      referralAmount,
      franchiseAmount,
      listingAgentGross,
      listingBrokerGross,
      buyingAgentGross,
      buyingBrokerGross,
      totalDeductions,
      listingAgentNet: listingAgentGross - (totalDeductions / 2),
      buyingAgentNet: buyingAgentGross - (totalDeductions / 2),
    };
  }, [formData, deductions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleAddAgent = () => {
    setAgents([
      ...agents,
      {
        role: 'listing_agent',
        name: '',
        legalEntity: '',
        company: '',
        licenseNumber: '',
        tinSsn: '',
        phone: '',
        email: '',
      },
    ]);
  };

  const handleRemoveAgent = (index: number) => {
    setAgents(agents.filter((_, i) => i !== index));
  };

  const handleAgentChange = (index: number, field: keyof Agent, value: string) => {
    const updated = [...agents];
    updated[index] = { ...updated[index], [field]: value };
    setAgents(updated);
  };

  const handleAddDeduction = () => {
    setDeductions([
      ...deductions,
      {
        id: Date.now().toString(),
        description: '',
        amount: 0,
        side: 'both',
        type: 'flat',
      },
    ]);
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions(deductions.filter(d => d.id !== id));
  };

  const handleDeductionChange = (id: string, field: keyof Deduction, value: any) => {
    setDeductions(
      deductions.map(d =>
        d.id === id ? { ...d, [field]: value } : d
      )
    );
  };

  const handleGeneratePdf = async () => {
    try {
      await generatePdfMutation.mutateAsync({
        formData,
        agents,
        deductions,
        waterfall,
        branding: branding || undefined,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Commission Disbursement Authorization Builder</h1>
          <p className="text-muted-foreground">
            Build industry-standard CDA documents with automatic waterfall commission calculations. Supports referral fees, franchise fees, agent/broker splits, and flat-fee deductions.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="col-span-2 space-y-6">
            {/* Mode Selector */}
            <Card className="p-6">
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'select' | 'scratch')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="select">From CSV</TabsTrigger>
                  <TabsTrigger value="scratch">From Scratch</TabsTrigger>
                </TabsList>

                <TabsContent value="select" className="mt-4">
                  {transactionData && transactionData.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Select Transaction</label>
                      <select
                        value={selectedTransactionId}
                        onChange={(e) => handleTransactionSelect(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                      >
                        <option value="">-- Choose a transaction --</option>
                        {transactionData.map(t => (
                          <option key={t.loopId} value={t.loopId}>
                            {t.loopName} - {t.address} ({t.state})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-700">
                      <AlertCircle className="w-5 h-5 inline mr-2" />
                      No transaction data available. Upload a CSV first or use "From Scratch" mode.
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="scratch" className="mt-4">
                  <p className="text-sm text-muted-foreground">Fill in all fields manually to create a CDA from scratch.</p>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Closing/Title Company */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                🏢 Closing / Title Company
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  name="titleCompany"
                  placeholder="First American Title"
                  value={formData.titleCompany}
                  onChange={handleInputChange}
                  className="bg-slate-900/50"
                />
                <Input
                  name="closerName"
                  placeholder="Jane Smith"
                  value={formData.closerName}
                  onChange={handleInputChange}
                  className="bg-slate-900/50"
                />
                <Input
                  name="phone"
                  placeholder="(512) 555-0100"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="bg-slate-900/50"
                />
                <Input
                  name="email"
                  placeholder="closer@title.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-slate-900/50"
                />
                <Input
                  name="fileNumber"
                  placeholder="2025-12345"
                  value={formData.fileNumber}
                  onChange={handleInputChange}
                  className="bg-slate-900/50"
                />
              </div>
            </Card>

            {/* Property & Transaction Details */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                🏠 Property & Transaction Details
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Transaction Type</label>
                    <select
                      name="transactionType"
                      value={formData.transactionType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                    >
                      <option value="sale">Sale</option>
                      <option value="rental">Rental</option>
                      <option value="lease">Lease</option>
                    </select>
                  </div>
                  <Input
                    name="propertyAddress"
                    placeholder="123 Main Street"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <Input
                    name="city"
                    placeholder="Austin"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                  <Input
                    name="state"
                    placeholder="TX"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                  <Input
                    name="zipCode"
                    placeholder="78701"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                  <Input
                    name="county"
                    placeholder="Travis"
                    value={formData.county}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    name="mlsNumber"
                    placeholder="MLS123456"
                    value={formData.mlsNumber}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                  <Input
                    name="salePrice"
                    type="number"
                    placeholder="500,000"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    name="closingDate"
                    type="date"
                    value={formData.closingDate}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                  <Input
                    name="contractDate"
                    type="date"
                    value={formData.contractDate}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    name="buyerName"
                    placeholder="John & Jane Smith"
                    value={formData.buyerName}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                  <Input
                    name="sellerName"
                    placeholder="Robert Johnson"
                    value={formData.sellerName}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
              </div>
            </Card>

            {/* Commission Waterfall */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                💰 Commission Waterfall
              </h2>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-4 mb-4 text-sm text-blue-700">
                Industry-standard calculation: GCI → Side Split → Referral → Franchise → Agent/Broker Split → Deductions → Net Payable
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Total Commission Rate (%)</label>
                  <Input
                    name="totalCommissionRate"
                    type="number"
                    value={formData.totalCommissionRate}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Listing Side (%)</label>
                  <Input
                    name="listingSide"
                    type="number"
                    value={formData.listingSide}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Buying Side (%)</label>
                  <Input
                    name="buyingSide"
                    type="number"
                    value={formData.buyingSide}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Referral Fee (%)</label>
                  <Input
                    name="referralFee"
                    type="number"
                    value={formData.referralFee}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Referral Applies To</label>
                  <select
                    name="referralAppliesto"
                    value={formData.referralAppliesto}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                  >
                    <option value="none">No Referral</option>
                    <option value="listing">Listing Side</option>
                    <option value="buying">Buying Side</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Franchise Fee (%)</label>
                  <Input
                    name="franchiseFee"
                    type="number"
                    value={formData.franchiseFee}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Listing Agent Split (%)</label>
                  <Input
                    name="listingAgentSplit"
                    type="number"
                    value={formData.listingAgentSplit}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Buying Agent Split (%)</label>
                  <Input
                    name="buyingAgentSplit"
                    type="number"
                    value={formData.buyingAgentSplit}
                    onChange={handleInputChange}
                    className="bg-slate-900/50"
                  />
                </div>
              </div>
            </Card>

            {/* Brokerage & Agent Details */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                👥 Brokerage & Agent Details
              </h2>
              <div className="space-y-6">
                {agents.map((agent, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <select
                        value={agent.role}
                        onChange={(e) => handleAgentChange(index, 'role', e.target.value)}
                        className="px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground font-medium"
                      >
                        <option value="listing_agent">Listing Agent</option>
                        <option value="listing_broker">Listing Broker</option>
                        <option value="buying_agent">Buying Agent</option>
                        <option value="buying_broker">Buying Broker</option>
                      </select>
                      {agents.length > 1 && (
                        <button
                          onClick={() => handleRemoveAgent(index)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Full Name"
                        value={agent.name}
                        onChange={(e) => handleAgentChange(index, 'name', e.target.value)}
                        className="bg-slate-900/50"
                      />
                      <Input
                        placeholder="LLC/Corp (if any)"
                        value={agent.legalEntity}
                        onChange={(e) => handleAgentChange(index, 'legalEntity', e.target.value)}
                        className="bg-slate-900/50"
                      />
                      <Input
                        placeholder="Brokerage Name"
                        value={agent.company}
                        onChange={(e) => handleAgentChange(index, 'company', e.target.value)}
                        className="bg-slate-900/50"
                      />
                      <Input
                        placeholder="License #"
                        value={agent.licenseNumber}
                        onChange={(e) => handleAgentChange(index, 'licenseNumber', e.target.value)}
                        className="bg-slate-900/50"
                      />
                      <Input
                        placeholder="TIN / SSN"
                        value={agent.tinSsn}
                        onChange={(e) => handleAgentChange(index, 'tinSsn', e.target.value)}
                        className="bg-slate-900/50"
                      />
                      <Input
                        placeholder="Phone"
                        value={agent.phone}
                        onChange={(e) => handleAgentChange(index, 'phone', e.target.value)}
                        className="bg-slate-900/50"
                      />
                      <Input
                        placeholder="Email"
                        value={agent.email}
                        onChange={(e) => handleAgentChange(index, 'email', e.target.value)}
                        className="bg-slate-900/50"
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddAgent}
                  className="w-full py-2 border border-dashed border-emerald-500 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Party
                </button>
              </div>
            </Card>

            {/* Flat-Fee Deductions */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                💸 Flat-Fee Deductions (from Agent share)
              </h2>
              <div className="space-y-4">
                {deductions.map((deduction) => (
                  <div key={deduction.id} className="grid grid-cols-5 gap-4 items-end">
                    <Input
                      placeholder="Description"
                      value={deduction.description}
                      onChange={(e) => handleDeductionChange(deduction.id, 'description', e.target.value)}
                      className="bg-slate-900/50"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={deduction.amount}
                      onChange={(e) => handleDeductionChange(deduction.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="bg-slate-900/50"
                    />
                    <select
                      value={deduction.side}
                      onChange={(e) => handleDeductionChange(deduction.id, 'side', e.target.value)}
                      className="px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                    >
                      <option value="listing">Listing</option>
                      <option value="buying">Buying</option>
                      <option value="both">Both</option>
                    </select>
                    <select
                      value={deduction.type}
                      onChange={(e) => handleDeductionChange(deduction.id, 'type', e.target.value)}
                      className="px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                    >
                      <option value="flat">Flat $</option>
                      <option value="percentage">%</option>
                    </select>
                    <button
                      onClick={() => handleRemoveDeduction(deduction.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                <button
                  onClick={handleAddDeduction}
                  className="w-full py-2 border border-dashed border-emerald-500 rounded-md text-emerald-500 hover:bg-emerald-500/10 transition"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Deduction
                </button>
              </div>
            </Card>

            {/* Disbursement & Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                📋 Disbursement Instructions
              </h2>
              <Textarea
                name="disbursementInstructions"
                placeholder="Specify how each payee should receive their funds (optional — defaults to waterfall calculation)."
                value={formData.disbursementInstructions}
                onChange={handleInputChange}
                rows={3}
                className="bg-slate-900/50 mb-4"
              />

              <h3 className="text-lg font-semibold text-foreground mb-2">Notes / Special Instructions</h3>
              <Textarea
                name="notes"
                placeholder="Add any additional notes or special instructions..."
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="bg-slate-900/50"
              />
            </Card>
          </div>

          {/* Live Preview Sidebar */}
          <div className="col-span-1">
            <Card className="p-6 sticky top-6 bg-emerald-500/5 border border-emerald-500/20">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                💵 Commission Waterfall (Live Preview)
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sale Price</span>
                  <span className="font-mono text-foreground">${formData.salePrice.toLocaleString()}</span>
                </div>

                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Total Commission Rate</span>
                  <span className="font-mono text-foreground">{formData.totalCommissionRate}%</span>
                </div>

                <div className="flex justify-between font-semibold text-emerald-400">
                  <span>Gross Commission Income (GCI)</span>
                  <span className="font-mono">${waterfall.gci.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Side ({formData.listingSide}%)</span>
                    <span className="font-mono text-foreground">${waterfall.listingSide.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buying Side ({formData.buyingSide}%)</span>
                    <span className="font-mono text-foreground">${waterfall.buyingSide.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Agent ({formData.listingAgentSplit}%)</span>
                    <span className="font-mono text-foreground">${waterfall.listingAgentGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Listing Broker</span>
                    <span className="font-mono text-foreground">${waterfall.listingBrokerGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buying Agent ({formData.buyingAgentSplit}%)</span>
                    <span className="font-mono text-foreground">${waterfall.buyingAgentGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Buying Broker</span>
                    <span className="font-mono text-foreground">${waterfall.buyingBrokerGross.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {waterfall.totalDeductions > 0 && (
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-red-400">
                      <span>Total Deductions</span>
                      <span className="font-mono">-${waterfall.totalDeductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-3 bg-emerald-500/10 p-3 rounded-md">
                  <div className="flex justify-between font-bold text-emerald-400">
                    <span>Listing Agent Net Payable</span>
                    <span className="font-mono">${waterfall.listingAgentNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-400">
                    <span>Buying Agent Net Payable</span>
                    <span className="font-mono">${waterfall.buyingAgentNet.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGeneratePdf}
                disabled={generatePdfMutation.isPending}
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 mr-2" />
                {generatePdfMutation.isPending ? 'Generating...' : 'Generate CDA PDF'}
              </Button>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                This document is for informational purposes only and does not constitute a legal agreement. All parties should verify amounts before signing.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
