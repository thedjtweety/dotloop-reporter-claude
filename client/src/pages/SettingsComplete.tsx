import { useState, useMemo, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  Search, ChevronRight, X, Check, Download, Trash2, AlertTriangle,
  Building2, Palette, FileImage, Percent, Clock, RefreshCw, Archive,
  Mail, Users, Monitor, Link, Zap, Settings2, Bell, BellOff, Tag,
  DollarSign, Upload, Activity,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  section: 'brokerage' | 'reporting' | 'integrations' | 'notifications' | 'data' | 'advanced' | 'danger';
  functional?: boolean;
}

const CARDS: SettingCard[] = [
  // BROKERAGE
  { id: 'brokerage', title: 'Brokerage', description: 'Your brokerage name and details.', icon: <Building2 />, section: 'brokerage', functional: true },
  { id: 'branding', title: 'Branding & White Label', description: 'Colors, tagline, logo, and brokerage details.', icon: <Palette />, section: 'brokerage', functional: true },
  { id: 'cda-logo', title: 'CDA Logo', description: 'Logo shown on Commission Disbursement Authorizations.', icon: <FileImage />, section: 'brokerage' },
  { id: 'default-commission', title: 'Default Commission Rate', description: 'Default split applied to new agents and deals.', icon: <Percent />, section: 'brokerage', functional: true },
  { id: 'default-timezone', title: 'Default Timezone', description: 'Tenant timezone used for schedules and reports.', icon: <Clock />, section: 'brokerage' },
  // REPORTING
  { id: 'auto-refresh', title: 'Dashboard Auto-Refresh', description: 'How often the dashboard polls for fresh data.', icon: <RefreshCw />, section: 'reporting' },
  { id: 'report-retention', title: 'Custom Report Retention', description: 'How long generated reports stay available.', icon: <Archive />, section: 'reporting' },
  { id: 'email-reports', title: 'Automated Email Reports', description: 'Schedule monthly or quarterly production reports.', icon: <Mail />, section: 'reporting' },
  { id: 'report-recipients', title: 'External Report Recipients', description: 'Share reports with stakeholders outside the brokerage.', icon: <Users />, section: 'reporting' },
  { id: 'display-mode', title: 'Display Mode', description: 'Wallboard, scenes, and presentation schedules.', icon: <Monitor />, section: 'reporting' },
  // INTEGRATIONS
  { id: 'account-connections', title: 'Account Connections', description: 'Connected accounts and identity providers.', icon: <Link />, section: 'integrations' },
  { id: 'dotloop-connections', title: 'Dotloop Connections', description: 'Sign in to one or more Dotloop accounts.', icon: <Zap />, section: 'integrations', functional: true },
  { id: 'dotloop-autopush', title: 'Dotloop Auto-Push', description: 'Automatically push new transactions from Dotloop.', icon: <Zap />, section: 'integrations' },
  { id: 'fub', title: 'Follow Up Boss', description: 'Sync loops, custom fields, and participants into FUB.', icon: <Settings2 />, section: 'integrations' },
  { id: 'quickbooks', title: 'QuickBooks Settings', description: 'Map accounts, vendors, and billing items for sync.', icon: <DollarSign />, section: 'integrations' },
  { id: 'quickbooks-alerts', title: 'QuickBooks Failure Alerts', description: 'Get notified when a QuickBooks sync fails.', icon: <Bell />, section: 'integrations' },
  { id: 'webhooks', title: 'Webhook Settings', description: 'HTTP callbacks for closed deals, goals, and more.', icon: <Activity />, section: 'integrations' },
  // NOTIFICATIONS
  { id: 'alerts', title: 'Alerts & Notifications', description: 'Threshold-based alerts and stuck-deal monitoring.', icon: <Bell />, section: 'notifications' },
  { id: 'notification-prefs', title: 'Notification Preferences', description: 'Per-notification opt-in for each delivery channel.', icon: <BellOff />, section: 'notifications' },
  // DATA
  { id: 'lead-sources', title: 'Lead Sources', description: 'Define and order the lead sources you track.', icon: <Tag />, section: 'data' },
  { id: 'lead-costs', title: 'Lead Source Costs', description: 'Monthly cost per lead source for ROI calculations.', icon: <DollarSign />, section: 'data' },
  { id: 'upload-limits', title: 'Upload & Push Limits', description: 'Maximum CSV size and per-push transaction count.', icon: <Upload />, section: 'data' },
  // ADVANCED
  { id: 'api-limits', title: 'API Rate Limits', description: "Inspect your tenant's current rate-limit usage.", icon: <Activity />, section: 'advanced' },
  // DANGER
  { id: 'export-data', title: 'Export All Data', description: 'Download all your data as JSON.', icon: <Download />, section: 'danger' },
  { id: 'reset-data', title: 'Reset All Data', description: 'Permanently delete all data. Irreversible.', icon: <Trash2 />, section: 'danger' },
];

interface SectionDef {
  id: string;
  label: string;
  description: string;
  tabLabel: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'brokerage', label: 'BROKERAGE', description: 'Brokerage profile, branding, and defaults.', tabLabel: 'Brokerage' },
  { id: 'reporting', label: 'REPORTING', description: 'Dashboards, reports, and recipients.', tabLabel: 'Reporting' },
  { id: 'integrations', label: 'INTEGRATIONS', description: 'Connect Dotloop, FUB, QuickBooks, and webhooks.', tabLabel: 'Integrations' },
  { id: 'notifications', label: 'NOTIFICATIONS', description: 'Alerts and delivery preferences.', tabLabel: 'Notifications' },
  { id: 'data', label: 'DATA', description: 'Lead sources, costs, and import limits.', tabLabel: 'Data' },
  { id: 'advanced', label: 'ADVANCED', description: 'Power-user controls.', tabLabel: 'Advanced' },
  { id: 'danger', label: 'DANGER ZONE', description: '', tabLabel: 'Danger' },
];

function SettingCardItem({ card, onClick }: { card: SettingCard; onClick: () => void }) {
  const isDanger = card.section === 'danger';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 p-3.5 border rounded-xl transition-all group ${
        isDanger
          ? 'bg-destructive/5 border-destructive/30 hover:border-destructive/60'
          : 'bg-background border-border hover:border-border/80 hover:bg-secondary/30'
      }`}
    >
      <div className={`flex-none w-9 h-9 rounded-lg flex items-center justify-center ${isDanger ? 'bg-destructive/10' : 'bg-secondary'}`}>
        <span className={`[&>svg]:w-4 [&>svg]:h-4 ${isDanger ? 'text-destructive' : 'text-muted-foreground'}`}>{card.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-medium leading-tight truncate">{card.title}</p>
        <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{card.description}</p>
      </div>
      <ChevronRight className="flex-none w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

function SectionBlock({ section, cards, onCardClick }: { section: SectionDef; cards: SettingCard[]; onCardClick: (id: string) => void }) {
  if (cards.length === 0) return null;
  const isDanger = section.id === 'danger';
  return (
    <div className={isDanger ? 'border border-destructive/30 rounded-xl p-5' : ''}>
      <div className="mb-3">
        <h2 className={`text-xs font-semibold tracking-widest mb-0.5 ${isDanger ? 'text-destructive' : 'text-muted-foreground'}`}>
          {section.label}
        </h2>
        {section.description && <p className="text-muted-foreground text-xs">{section.description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map(card => (
          <SettingCardItem key={card.id} card={card} onClick={() => onCardClick(card.id)} />
        ))}
      </div>
    </div>
  );
}

export default function SettingsComplete() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const { clearTransactionData } = useTransactionData();
  const [, navigate] = useLocation();

  const [brokerageName, setBrokerageName] = useState(() => localStorage.getItem('setting-brokerage-name') || '');
  const [brokerName, setBrokerName] = useState(() => localStorage.getItem('setting-broker-name') || '');
  const [licenseNumber, setLicenseNumber] = useState(() => localStorage.getItem('setting-license') || '');
  const [brokeragePhone, setBrokeragePhone] = useState(() => localStorage.getItem('setting-phone') || '');
  const [brokerageAddress, setBrokerageAddress] = useState(() => localStorage.getItem('setting-address') || '');
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('setting-primary-color') || '#10b981');
  const [secondaryColor, setSecondaryColor] = useState(() => localStorage.getItem('setting-secondary-color') || '#3b82f6');
  const [tagline, setTagline] = useState(() => localStorage.getItem('setting-tagline') || '');
  const [agentSplit, setAgentSplit] = useState(() => localStorage.getItem('setting-agent-split') || '70');
  const [capAmount, setCapAmount] = useState(() => localStorage.getItem('setting-cap-amount') || '25000');
  const [postCapSplit, setPostCapSplit] = useState(() => localStorage.getItem('setting-post-cap-split') || '100');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const filteredCards = useMemo(() => {
    if (!search) return CARDS;
    const q = search.toLowerCase();
    return CARDS.filter(c => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [search]);

  function getVisibleCards(sectionId: string) {
    return filteredCards.filter(c => c.section === sectionId);
  }

  function handleCardClick(id: string) {
    if (id === 'reset-data') {
      setResetDialog(true);
      return;
    }
    setOpenCard(id);
  }

  const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500/50';
  const labelCls = 'text-foreground text-xs font-medium block mb-1.5';

  function renderSheetContent(cardId: string): ReactNode {
    if (cardId === 'brokerage') {
      return (
        <>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-foreground">Brokerage</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">Your brokerage name and contact details.</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Brokerage Name</label>
              <input value={brokerageName} onChange={e => setBrokerageName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Managing Broker Name</label>
              <input value={brokerName} onChange={e => setBrokerName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>License Number</label>
              <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={brokeragePhone} onChange={e => setBrokeragePhone(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <textarea value={brokerageAddress} onChange={e => setBrokerageAddress(e.target.value)} rows={3} className={inputCls} />
            </div>
            <button
              onClick={() => {
                localStorage.setItem('setting-brokerage-name', brokerageName);
                localStorage.setItem('setting-broker-name', brokerName);
                localStorage.setItem('setting-license', licenseNumber);
                localStorage.setItem('setting-phone', brokeragePhone);
                localStorage.setItem('setting-address', brokerageAddress);
                showToast('Brokerage settings saved');
              }}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </>
      );
    }

    if (cardId === 'branding') {
      return (
        <>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-foreground">Branding & White Label</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">Colors and tagline for your brokerage.</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Secondary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent" />
                <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Tagline</label>
              <input value={tagline} onChange={e => setTagline(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={() => {
                localStorage.setItem('setting-primary-color', primaryColor);
                localStorage.setItem('setting-secondary-color', secondaryColor);
                localStorage.setItem('setting-tagline', tagline);
                showToast('Branding settings saved');
              }}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </>
      );
    }

    if (cardId === 'default-commission') {
      return (
        <>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-foreground">Default Commission Rate</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">Default split applied to new agents and deals.</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className={labelCls}>Agent Split %</label>
              <input type="number" min={0} max={100} value={agentSplit} onChange={e => setAgentSplit(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Broker Split %</label>
              <p className="text-foreground text-sm bg-secondary border border-border rounded-lg px-3 py-2">{100 - Number(agentSplit || 0)}%</p>
            </div>
            <div>
              <label className={labelCls}>Cap Amount $</label>
              <input type="number" min={0} value={capAmount} onChange={e => setCapAmount(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Post-Cap Split %</label>
              <input type="number" min={0} max={100} value={postCapSplit} onChange={e => setPostCapSplit(e.target.value)} className={inputCls} />
            </div>
            <button
              onClick={() => {
                localStorage.setItem('setting-agent-split', agentSplit);
                localStorage.setItem('setting-cap-amount', capAmount);
                localStorage.setItem('setting-post-cap-split', postCapSplit);
                showToast('Commission settings saved');
              }}
              className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Save Changes
            </button>
          </div>
        </>
      );
    }

    if (cardId === 'dotloop-connections') {
      return (
        <>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-foreground">Dotloop Connections</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">Sign in to your Dotloop account to enable live sync.</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5 space-y-5">
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <span className="text-xs text-yellow-400 font-medium">Status: Not connected</span>
            </div>
            <button disabled className="w-full py-2.5 bg-secondary border border-border rounded-lg text-muted-foreground text-sm cursor-not-allowed" title="Coming in Phase 2">
              Connect Dotloop Account
            </button>
            <p className="text-muted-foreground text-xs text-center">Coming in Phase 2</p>
            <div className="space-y-2">
              <p className="text-foreground text-xs font-medium">Connecting will enable:</p>
              {['Live data sync', 'Auto-push transactions', 'Real-time updates', 'Multi-office support'].map(f => (
                <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Check className="w-3.5 h-3.5 text-emerald-400 flex-none" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (cardId === 'export-data') {
      return (
        <>
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
            <SheetTitle className="text-foreground">Export All Data</SheetTitle>
            <SheetDescription className="text-muted-foreground text-sm">Download all your brokerage data as a JSON file.</SheetDescription>
          </SheetHeader>
          <div className="px-6 py-5 space-y-4">
            <p className="text-muted-foreground text-sm">This will export all data currently stored in your browser including settings, transaction data, and preferences.</p>
            <button
              onClick={() => {
                const settings: Record<string, string> = {};
                for (let i = 0; i < localStorage.length; i++) {
                  const key = localStorage.key(i);
                  if (key && key.startsWith('setting-')) settings[key] = localStorage.getItem(key) || '';
                }
                const data = { settings, exportDate: new Date().toISOString(), version: '1.0' };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dotloop-reporter-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Export downloaded');
              }}
              className="w-full py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download JSON Export
            </button>
          </div>
        </>
      );
    }

    const card = CARDS.find(c => c.id === cardId);
    return (
      <>
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-foreground">{card?.title}</SheetTitle>
          <SheetDescription className="text-muted-foreground text-sm">{card?.description}</SheetDescription>
        </SheetHeader>
        <div className="px-6 py-5">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
              <span className="text-muted-foreground [&>svg]:w-5 [&>svg]:h-5">{card?.icon}</span>
            </div>
            <p className="text-foreground font-medium mb-2">Coming Soon</p>
            <p className="text-muted-foreground text-sm max-w-[260px]">{card?.description}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Manage your brokerage configuration</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search settings..."
          className="w-full bg-secondary border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500/50"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {!search && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-0 overflow-x-auto">
            {['overview', ...SECTIONS.map(s => s.id)].map(tab => {
              const label = tab === 'overview' ? 'Overview' : SECTIONS.find(s => s.id === tab)?.tabLabel ?? tab;
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm whitespace-nowrap font-medium hover:text-foreground transition-colors"
                >
                  {label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-8">
            {SECTIONS.map(section => (
              <SectionBlock key={section.id} section={section} cards={getVisibleCards(section.id)} onCardClick={handleCardClick} />
            ))}
          </TabsContent>

          {SECTIONS.map(section => (
            <TabsContent key={section.id} value={section.id} className="mt-6">
              <SectionBlock section={section} cards={getVisibleCards(section.id)} onCardClick={handleCardClick} />
            </TabsContent>
          ))}
        </Tabs>
      )}

      {search && (
        <div className="space-y-8">
          {filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-10 h-10 text-muted-foreground mb-3 opacity-30" />
              <p className="text-foreground font-medium mb-1">No settings match your search</p>
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
                Clear search
              </button>
            </div>
          ) : (
            SECTIONS.map(section => (
              <SectionBlock key={section.id} section={section} cards={getVisibleCards(section.id)} onCardClick={handleCardClick} />
            ))
          )}
        </div>
      )}

      <Sheet open={!!openCard && openCard !== 'reset-data'} onOpenChange={open => !open && setOpenCard(null)}>
        <SheetContent className="w-full sm:max-w-md bg-background border-l border-border overflow-y-auto p-0 gap-0">
          {openCard && renderSheetContent(openCard)}
        </SheetContent>
      </Sheet>

      <Dialog open={resetDialog} onOpenChange={setResetDialog}>
        <DialogContent className="bg-background border border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Reset All Data
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will permanently delete all transaction data, settings, and history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Type <span className="font-mono font-bold text-foreground">RESET</span> to confirm:
              </p>
              <input
                value={resetInput}
                onChange={e => setResetInput(e.target.value)}
                placeholder="Type RESET here"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-destructive"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setResetDialog(false);
                  setResetInput('');
                }}
                className="px-4 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={resetInput !== 'RESET'}
                onClick={() => {
                  clearTransactionData();
                  localStorage.clear();
                  setResetDialog(false);
                  setResetInput('');
                  showToast('All data has been cleared');
                  setTimeout(() => navigate('/upload'), 1500);
                }}
                className="px-4 py-2 text-sm bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Everything
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-bottom-4">
          <Check className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  );
}
