import { useState, useMemo } from 'react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Download, Plus, Trash2, Info } from 'lucide-react';
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

// Helper component for labeled input fields
const LabeledInput = ({ label, hint, required = false, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
    <Input {...props} className="bg-slate-900/50" />
  </div>
);

// Helper component for labeled select fields
const LabeledSelect = ({ label, hint, required = false, children, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
    <select {...props} className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground">
      {children}
    </select>
  </div>
);

// Helper component for labeled textarea
const LabeledTextarea = ({ label, hint, required = false, ...props }: any) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
    <Textarea {...props} className="bg-slate-900/50" />
  </div>
);

export default function CDABuilderPage() {
  const { user } = useAuth();
  const { transactionData } = useTransactionData();
  const { data: branding } = trpc.branding.getBranding.useQuery();
  const generatePdfMutation = trpc.cdaBuilder.generatePdf.useMutation();

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
        salePrice: transaction.salePrice || 0,
        buyerName: transaction.buyerName || '',
        sellerName: transaction.sellerName || '',
        closingDate: transaction.closingDate || '',
      }));
    }
  };

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salePrice' || name.includes('Split') || name.includes('Rate') || name.includes('Fee') 
        ? parseFloat(value) || 0 
        : value,
    }));
  };

  // Calculate waterfall
  const waterfall = useMemo(() => {
    const gci = formData.salePrice * (formData.totalCommissionRate / 100);
    const listingSideAmount = gci * (formData.listingSide / 100);
    const buyingSideAmount = gci * (formData.buyingSide / 100);

    const referralAmount = formData.referralAppliesto !== 'none' 
      ? (formData.referralAppliesto === 'listing' ? listingSideAmount : buyingSideAmount) * (formData.referralFee / 100)
      : 0;

    const franchiseAmount = gci * (formData.franchiseFee / 100);

    const listingAgentGross = (listingSideAmount - referralAmount - franchiseAmount) * (formData.listingAgentSplit / 100);
    const listingBrokerGross = (listingSideAmount - referralAmount - franchiseAmount) * (1 - formData.listingAgentSplit / 100);

    const buyingAgentGross = (buyingSideAmount - franchiseAmount) * (formData.buyingAgentSplit / 100);
    const buyingBrokerGross = (buyingSideAmount - franchiseAmount) * (1 - formData.buyingAgentSplit / 100);

    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

    return {
      gci,
      listingSide: listingSideAmount,
      buyingSide: buyingSideAmount,
      referralAmount,
      franchiseAmount,
      listingAgentGross,
      listingBrokerGross,
      buyingAgentGross,
      buyingBrokerGross,
      totalDeductions,
      listingAgentNet: listingAgentGross - totalDeductions,
      buyingAgentNet: buyingAgentGross - totalDeductions,
    };
  }, [formData, deductions]);

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
    const newAgents = [...agents];
    newAgents[index] = { ...newAgents[index], [field]: value };
    setAgents(newAgents);
  };

  const handleAddDeduction = () => {
    setDeductions([
      ...deductions,
      { id: Date.now().toString(), description: '', amount: 0, side: 'both', type: 'flat' },
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
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Select Transaction <span className="text-red-500">*</span>
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">Choose a transaction from your uploaded CSV. All property and party details will auto-populate.</p>
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
                  <p className="text-sm text-muted-foreground">Fill in all fields manually to create a CDA from scratch. All fields marked with * are required.</p>
                </TabsContent>
              </Tabs>
            </Card>

            {/* Closing/Title Company */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                🏢 Closing / Title Company
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <LabeledInput
                  label="Title / Escrow Company"
                  hint="Name of the closing/title company handling this transaction"
                  required
                  name="titleCompany"
                  placeholder="First American Title"
                  value={formData.titleCompany}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="Closer / Officer Name"
                  hint="Full name of the closing officer or title agent"
                  required
                  name="closerName"
                  placeholder="Jane Smith"
                  value={formData.closerName}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="Phone"
                  hint="Phone number for the closing officer"
                  name="phone"
                  placeholder="(512) 555-0100"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="Email"
                  hint="Email address for the closing officer"
                  name="email"
                  placeholder="closer@title.com"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="File / Escrow Number"
                  hint="Unique file number assigned by the title company"
                  name="fileNumber"
                  placeholder="2025-12345"
                  value={formData.fileNumber}
                  onChange={handleInputChange}
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
                    <LabeledSelect
                      label="Transaction Type"
                      hint="Type of real estate transaction"
                      required
                      name="transactionType"
                      value={formData.transactionType}
                      onChange={handleInputChange}
                    >
                      <option value="sale">Sale</option>
                      <option value="rental">Rental</option>
                      <option value="lease">Lease</option>
                    </LabeledSelect>
                  </div>
                  <LabeledInput
                    label="Property Address"
                    hint="Street address of the property"
                    required
                    name="propertyAddress"
                    placeholder="123 Main Street"
                    value={formData.propertyAddress}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <LabeledInput
                    label="City"
                    hint="City where property is located"
                    name="city"
                    placeholder="Austin"
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                  <LabeledInput
                    label="State"
                    hint="State abbreviation (TX, CA, etc.)"
                    name="state"
                    placeholder="TX"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                  <LabeledInput
                    label="Zip Code"
                    hint="Postal code"
                    name="zipCode"
                    placeholder="78701"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                  />
                  <LabeledInput
                    label="County"
                    hint="County name"
                    name="county"
                    placeholder="Travis"
                    value={formData.county}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <LabeledInput
                    label="MLS Number"
                    hint="Multiple Listing Service number (if applicable)"
                    name="mlsNumber"
                    placeholder="MLS123456"
                    value={formData.mlsNumber}
                    onChange={handleInputChange}
                  />
                  <LabeledInput
                    label="Sale Price"
                    hint="Total purchase price of the property"
                    required
                    name="salePrice"
                    type="number"
                    placeholder="500000"
                    value={formData.salePrice}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <LabeledInput
                    label="Closing Date"
                    hint="Date of closing/settlement"
                    required
                    name="closingDate"
                    type="date"
                    value={formData.closingDate}
                    onChange={handleInputChange}
                  />
                  <LabeledInput
                    label="Contract Date"
                    hint="Date contract was signed"
                    name="contractDate"
                    type="date"
                    value={formData.contractDate}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <LabeledInput
                    label="Buyer Name(s)"
                    hint="Full name(s) of buyer(s)"
                    required
                    name="buyerName"
                    placeholder="John & Jane Smith"
                    value={formData.buyerName}
                    onChange={handleInputChange}
                  />
                  <LabeledInput
                    label="Seller Name(s)"
                    hint="Full name(s) of seller(s)"
                    required
                    name="sellerName"
                    placeholder="Robert Johnson"
                    value={formData.sellerName}
                    onChange={handleInputChange}
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
                <Info className="w-4 h-4 inline mr-2" />
                Industry-standard calculation: GCI → Side Split → Referral → Franchise → Agent/Broker Split → Deductions → Net Payable
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <LabeledInput
                  label="Total Commission Rate (%)"
                  hint="Overall commission percentage (e.g., 6% = 0.06 of sale price)"
                  required
                  name="totalCommissionRate"
                  type="number"
                  step="0.1"
                  value={formData.totalCommissionRate}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="Listing Side (%)"
                  hint="Percentage of commission going to listing side (typically 50%)"
                  name="listingSide"
                  type="number"
                  step="1"
                  value={formData.listingSide}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="Buying Side (%)"
                  hint="Percentage of commission going to buying side (typically 50%)"
                  name="buyingSide"
                  type="number"
                  step="1"
                  value={formData.buyingSide}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <LabeledInput
                  label="Referral Fee (%)"
                  hint="Percentage fee for referral agents (if applicable)"
                  name="referralFee"
                  type="number"
                  step="0.1"
                  value={formData.referralFee}
                  onChange={handleInputChange}
                />
                <div>
                  <LabeledSelect
                    label="Referral Applies To"
                    hint="Which side does the referral fee apply to?"
                    name="referralAppliesto"
                    value={formData.referralAppliesto}
                    onChange={handleInputChange}
                  >
                    <option value="none">No Referral</option>
                    <option value="listing">Listing Side</option>
                    <option value="buying">Buying Side</option>
                  </LabeledSelect>
                </div>
                <LabeledInput
                  label="Franchise Fee (%)"
                  hint="Percentage fee for franchise/brokerage (deducted from both sides)"
                  name="franchiseFee"
                  type="number"
                  step="0.1"
                  value={formData.franchiseFee}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <LabeledInput
                  label="Listing Agent Split (%)"
                  hint="Percentage of listing side commission going to agent (e.g., 70% agent, 30% broker)"
                  name="listingAgentSplit"
                  type="number"
                  step="1"
                  value={formData.listingAgentSplit}
                  onChange={handleInputChange}
                />
                <LabeledInput
                  label="Buying Agent Split (%)"
                  hint="Percentage of buying side commission going to agent (e.g., 70% agent, 30% broker)"
                  name="buyingAgentSplit"
                  type="number"
                  step="1"
                  value={formData.buyingAgentSplit}
                  onChange={handleInputChange}
                />
              </div>
            </Card>

            {/* Brokerage & Agent Details */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                👥 Brokerage & Agent Details
              </h2>
              <div className="space-y-6">
                {agents.map((agent, index) => (
                  <div key={index} className="p-4 bg-slate-900/30 rounded-lg border border-border">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-foreground">
                        {agent.role === 'listing_agent' && '📋 Listing Agent'}
                        {agent.role === 'listing_broker' && '🏢 Listing Broker'}
                        {agent.role === 'buying_agent' && '📋 Buying Agent'}
                        {agent.role === 'buying_broker' && '🏢 Buying Broker'}
                      </h3>
                      {agents.length > 1 && (
                        <button
                          onClick={() => handleRemoveAgent(index)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <LabeledSelect
                          label="Role"
                          name={`agents[${index}].role`}
                          value={agent.role}
                          onChange={(e) => handleAgentChange(index, 'role', e.target.value as any)}
                        >
                          <option value="listing_agent">Listing Agent</option>
                          <option value="listing_broker">Listing Broker</option>
                          <option value="buying_agent">Buying Agent</option>
                          <option value="buying_broker">Buying Broker</option>
                        </LabeledSelect>
                      </div>
                      <LabeledInput
                        label="Full Name"
                        hint="Agent or broker's full legal name"
                        name={`agents[${index}].name`}
                        placeholder="Full Name"
                        value={agent.name}
                        onChange={(e) => handleAgentChange(index, 'name', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <LabeledInput
                        label="Legal Entity"
                        hint="LLC, Corporation, or other legal entity (if applicable)"
                        name={`agents[${index}].legalEntity`}
                        placeholder="LLC/Corp (if any)"
                        value={agent.legalEntity}
                        onChange={(e) => handleAgentChange(index, 'legalEntity', e.target.value)}
                      />
                      <LabeledInput
                        label="Company / Brokerage"
                        hint="Company or brokerage name"
                        name={`agents[${index}].company`}
                        placeholder="Brokerage Name"
                        value={agent.company}
                        onChange={(e) => handleAgentChange(index, 'company', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <LabeledInput
                        label="License #"
                        hint="Real estate license number"
                        name={`agents[${index}].licenseNumber`}
                        placeholder="License #"
                        value={agent.licenseNumber}
                        onChange={(e) => handleAgentChange(index, 'licenseNumber', e.target.value)}
                      />
                      <LabeledInput
                        label="TIN / SSN"
                        hint="Tax ID or Social Security Number (for 1099 reporting)"
                        name={`agents[${index}].tinSsn`}
                        placeholder="For 1099 reporting"
                        value={agent.tinSsn}
                        onChange={(e) => handleAgentChange(index, 'tinSsn', e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <LabeledInput
                        label="Phone"
                        name={`agents[${index}].phone`}
                        placeholder="Phone"
                        value={agent.phone}
                        onChange={(e) => handleAgentChange(index, 'phone', e.target.value)}
                      />
                      <LabeledInput
                        label="Email"
                        name={`agents[${index}].email`}
                        placeholder="Email"
                        value={agent.email}
                        onChange={(e) => handleAgentChange(index, 'email', e.target.value)}
                      />
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddAgent}
                  className="w-full py-2 border border-dashed border-border rounded-lg text-foreground hover:bg-slate-900/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Party
                </button>
              </div>
            </Card>

            {/* Flat-Fee Deductions */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                💸 Flat-Fee Deductions (from Agent share)
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Specify deductions that come out of agent commission (e.g., transaction coordinator fees, E&O insurance)
              </p>

              <div className="space-y-3 mb-4">
                {deductions.map(deduction => (
                  <div key={deduction.id} className="grid grid-cols-5 gap-3 items-end">
                    <LabeledInput
                      label="Description"
                      hint="Name of the deduction"
                      name={`deduction-${deduction.id}-description`}
                      placeholder="Fee name"
                      value={deduction.description}
                      onChange={(e) => handleDeductionChange(deduction.id, 'description', e.target.value)}
                    />
                    <LabeledInput
                      label="Amount ($)"
                      hint="Dollar amount or percentage"
                      name={`deduction-${deduction.id}-amount`}
                      type="number"
                      placeholder="0"
                      value={deduction.amount}
                      onChange={(e) => handleDeductionChange(deduction.id, 'amount', parseFloat(e.target.value) || 0)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Side</label>
                      <select
                        value={deduction.side}
                        onChange={(e) => handleDeductionChange(deduction.id, 'side', e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                      >
                        <option value="listing">Listing</option>
                        <option value="buying">Buying</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Type</label>
                      <select
                        value={deduction.type}
                        onChange={(e) => handleDeductionChange(deduction.id, 'type', e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-border rounded-md text-foreground"
                      >
                        <option value="flat">Flat $</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleRemoveDeduction(deduction.id)}
                      className="text-red-500 hover:text-red-400 py-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddDeduction}
                className="w-full py-2 border border-dashed border-border rounded-lg text-foreground hover:bg-slate-900/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Deduction
              </button>
            </Card>

            {/* Disbursement Instructions */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                📋 Disbursement Instructions
              </h2>
              <LabeledTextarea
                label="Disbursement Instructions"
                hint="Specify how each payee should receive their funds (optional — defaults to waterfall calculation)"
                name="disbursementInstructions"
                placeholder="e.g., 'Listing agent receives 70% of listing side after franchise fee...'"
                value={formData.disbursementInstructions}
                onChange={handleInputChange}
                rows={4}
              />
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                📝 Notes / Special Instructions
              </h2>
              <LabeledTextarea
                label="Additional Notes"
                hint="Any special instructions or notes for the CDA (optional)"
                name="notes"
                placeholder="e.g., 'Referral agent to be paid from listing broker share...'"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
              />
            </Card>
          </div>

          {/* Live Preview Sidebar */}
          <div className="col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                💰 Commission Waterfall (Live Preview)
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sale Price</span>
                  <span className="font-semibold text-foreground">${waterfall.gci.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Commission Rate</span>
                  <span className="font-semibold text-foreground">{formData.totalCommissionRate}%</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Gross Commission Income (GCI)</span>
                  <span>${waterfall.gci.toFixed(2)}</span>
                </div>

                <hr className="border-border my-3" />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listing Side ({formData.listingSide}%)</span>
                  <span className="font-semibold text-foreground">${waterfall.listingSide.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buying Side ({formData.buyingSide}%)</span>
                  <span className="font-semibold text-foreground">${waterfall.buyingSide.toFixed(2)}</span>
                </div>

                {waterfall.referralAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referral Fee</span>
                    <span className="font-semibold text-foreground">-${waterfall.referralAmount.toFixed(2)}</span>
                  </div>
                )}

                {waterfall.franchiseAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Franchise Fee</span>
                    <span className="font-semibold text-foreground">-${waterfall.franchiseAmount.toFixed(2)}</span>
                  </div>
                )}

                <hr className="border-border my-3" />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listing Agent Gross ({formData.listingAgentSplit}%)</span>
                  <span className="font-semibold text-foreground">${waterfall.listingAgentGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listing Broker Gross</span>
                  <span className="font-semibold text-foreground">${waterfall.listingBrokerGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buying Agent Gross ({formData.buyingAgentSplit}%)</span>
                  <span className="font-semibold text-foreground">${waterfall.buyingAgentGross.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Buying Broker Gross</span>
                  <span className="font-semibold text-foreground">${waterfall.buyingBrokerGross.toFixed(2)}</span>
                </div>

                {waterfall.totalDeductions > 0 && (
                  <>
                    <hr className="border-border my-3" />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Deductions</span>
                      <span className="font-semibold text-red-500">-${waterfall.totalDeductions.toFixed(2)}</span>
                    </div>
                  </>
                )}

                <hr className="border-border my-3" />

                <div className="flex justify-between text-emerald-400 font-bold text-lg">
                  <span>Listing Agent Net</span>
                  <span>${waterfall.listingAgentNet.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold text-lg">
                  <span>Buying Agent Net</span>
                  <span>${waterfall.buyingAgentNet.toFixed(2)}</span>
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
