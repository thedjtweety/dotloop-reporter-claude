import { useState, useMemo, useEffect, useRef, type ReactNode, type ChangeEvent } from 'react';
import { useLocation } from 'wouter';
import {
  Search, ChevronRight, X, Check, Download, Trash2, AlertTriangle,
  Building2, Palette, FileImage, Percent, Clock, RefreshCw, Archive,
  Mail, Users, Monitor, Link, Zap, Settings2, Bell, BellOff, Tag,
  DollarSign, Upload, Activity, Plus, GripVertical, ChevronUp, ChevronDown, Trash,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useSettings,
  type SettingsConfig,
  type LeadSource,
} from '@/hooks/useSettings';

// ─── Card / Section definitions ───────────────────────────────────────────────

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  section: 'brokerage' | 'reporting' | 'integrations' | 'notifications' | 'data' | 'advanced' | 'danger';
}

const CARDS: SettingCard[] = [
  { id: 'brokerage', title: 'Brokerage', description: 'Your brokerage name and details.', icon: <Building2 />, section: 'brokerage' },
  { id: 'branding', title: 'Branding & White Label', description: 'Colors, tagline, logo, and brokerage details.', icon: <Palette />, section: 'brokerage' },
  { id: 'cda-logo', title: 'CDA Logo', description: 'Logo shown on Commission Disbursement Authorizations.', icon: <FileImage />, section: 'brokerage' },
  { id: 'default-commission', title: 'Default Commission Rate', description: 'Default split applied to new agents and deals.', icon: <Percent />, section: 'brokerage' },
  { id: 'default-timezone', title: 'Default Timezone', description: 'Tenant timezone used for schedules and reports.', icon: <Clock />, section: 'brokerage' },
  { id: 'auto-refresh', title: 'Dashboard Auto-Refresh', description: 'How often the dashboard polls for fresh data.', icon: <RefreshCw />, section: 'reporting' },
  { id: 'report-retention', title: 'Custom Report Retention', description: 'How long generated reports stay available.', icon: <Archive />, section: 'reporting' },
  { id: 'email-reports', title: 'Automated Email Reports', description: 'Schedule monthly or quarterly production reports.', icon: <Mail />, section: 'reporting' },
  { id: 'report-recipients', title: 'External Report Recipients', description: 'Share reports with stakeholders outside the brokerage.', icon: <Users />, section: 'reporting' },
  { id: 'display-mode', title: 'Display Mode', description: 'Wallboard, scenes, and presentation schedules.', icon: <Monitor />, section: 'reporting' },
  { id: 'account-connections', title: 'Account Connections', description: 'Connected accounts and identity providers.', icon: <Link />, section: 'integrations' },
  { id: 'dotloop-connections', title: 'Dotloop Connections', description: 'Sign in to one or more Dotloop accounts.', icon: <Zap />, section: 'integrations' },
  { id: 'dotloop-autopush', title: 'Dotloop Auto-Push', description: 'Automatically push new transactions from Dotloop.', icon: <Zap />, section: 'integrations' },
  { id: 'fub', title: 'Follow Up Boss', description: 'Sync loops, custom fields, and participants into FUB.', icon: <Settings2 />, section: 'integrations' },
  { id: 'quickbooks', title: 'QuickBooks Settings', description: 'Map accounts, vendors, and billing items for sync.', icon: <DollarSign />, section: 'integrations' },
  { id: 'quickbooks-alerts', title: 'QuickBooks Failure Alerts', description: 'Get notified when a QuickBooks sync fails.', icon: <Bell />, section: 'integrations' },
  { id: 'webhooks', title: 'Webhook Settings', description: 'HTTP callbacks for closed deals, goals, and more.', icon: <Activity />, section: 'integrations' },
  { id: 'alerts', title: 'Alerts & Notifications', description: 'Threshold-based alerts and stuck-deal monitoring.', icon: <Bell />, section: 'notifications' },
  { id: 'notification-prefs', title: 'Notification Preferences', description: 'Per-notification opt-in for each delivery channel.', icon: <BellOff />, section: 'notifications' },
  { id: 'lead-sources', title: 'Lead Sources', description: 'Define and order the lead sources you track.', icon: <Tag />, section: 'data' },
  { id: 'lead-costs', title: 'Lead Source Costs', description: 'Monthly cost per lead source for ROI calculations.', icon: <DollarSign />, section: 'data' },
  { id: 'upload-limits', title: 'Upload & Push Limits', description: 'Maximum CSV size and per-push transaction count.', icon: <Upload />, section: 'data' },
  { id: 'api-limits', title: 'API Rate Limits', description: "Inspect your tenant's current rate-limit usage.", icon: <Activity />, section: 'advanced' },
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

// ─── Shared form prop type ────────────────────────────────────────────────────

interface FormProps {
  settings: SettingsConfig;
  update: <K extends keyof SettingsConfig>(section: K, value: SettingsConfig[K]) => void;
  showToast: (msg: string) => void;
  allRecords?: ReturnType<typeof useTransactionData>['allRecords'];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500/50';
const labelCls = 'text-foreground text-xs font-medium block mb-1.5';

function FormRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {hint && <p className="text-muted-foreground text-xs mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${checked ? 'bg-emerald-500' : 'bg-border'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FormRow label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent flex-none" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground font-mono focus:outline-none" />
      </div>
    </FormRow>
  );
}

function SaveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
      Save Changes
    </button>
  );
}

function BtnGroup<T extends string | number>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { label: string; value: T }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={String(o.value)} type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === o.value
              ? 'bg-emerald-500 text-white border-emerald-500'
              : 'bg-secondary text-foreground border-border hover:border-border/60'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ComingSoon({ card }: { card: SettingCard | undefined }) {
  return (
    <div className="px-6 py-5">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-muted-foreground [&>svg]:w-5 [&>svg]:h-5">{card?.icon}</span>
        </div>
        <p className="text-foreground font-medium mb-2">Coming Soon</p>
        <p className="text-muted-foreground text-sm max-w-[260px]">{card?.description}</p>
      </div>
    </div>
  );
}

// ─── Form: Brokerage ─────────────────────────────────────────────────────────

function BrokerageForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.brokerage);
  useEffect(() => { setLocal(settings.brokerage); }, [settings.brokerage]);
  const set = (k: keyof typeof local) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setLocal(prev => ({ ...prev, [k]: e.target.value }));
  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Brokerage Name"><input value={local.name} onChange={set('name')} className={inputCls} placeholder="Acme Realty" /></FormRow>
      <FormRow label="Managing Broker Name"><input value={local.brokerName} onChange={set('brokerName')} className={inputCls} /></FormRow>
      <FormRow label="License Number"><input value={local.licenseNumber} onChange={set('licenseNumber')} className={inputCls} /></FormRow>
      <FormRow label="Phone"><input value={local.phone} onChange={set('phone')} className={inputCls} placeholder="(555) 555-5555" /></FormRow>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="City"><input value={local.city} onChange={set('city')} className={inputCls} /></FormRow>
        <FormRow label="State"><input value={local.state} onChange={set('state')} className={inputCls} placeholder="TX" /></FormRow>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormRow label="Street Address"><input value={local.address} onChange={set('address')} className={inputCls} /></FormRow>
        <FormRow label="ZIP"><input value={local.zip} onChange={set('zip')} className={inputCls} /></FormRow>
      </div>
      <FormRow label="Website"><input value={local.website} onChange={set('website')} className={inputCls} placeholder="https://yoursite.com" /></FormRow>
      <SaveBtn onClick={() => { update('brokerage', local); showToast('Brokerage settings saved'); }} />
    </div>
  );
}

// ─── Form: Branding ──────────────────────────────────────────────────────────

function BrandingForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.branding);
  useEffect(() => { setLocal(settings.branding); }, [settings.branding]);
  const set = <K extends keyof typeof local>(k: K, v: typeof local[K]) =>
    setLocal(prev => ({ ...prev, [k]: v }));

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => set('logoBase64', (ev.target?.result as string) || '');
    reader.readAsDataURL(f);
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Brokerage Logo" hint="PNG or SVG recommended. Displayed in the sidebar and on reports.">
        <div className="space-y-2">
          {local.logoBase64 && (
            <div className="w-full h-20 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
              <img src={local.logoBase64} alt="Logo preview" className="max-h-16 max-w-full object-contain" />
            </div>
          )}
          <label className="block w-full py-2 bg-secondary border border-dashed border-border rounded-lg text-sm text-muted-foreground text-center cursor-pointer hover:border-border/60 transition-colors">
            {local.logoBase64 ? 'Replace Logo' : 'Upload Logo'}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
          {local.logoBase64 && (
            <button onClick={() => set('logoBase64', '')} className="w-full py-1.5 text-xs text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">
              Remove Logo
            </button>
          )}
        </div>
      </FormRow>
      <ColorField label="Primary Color" value={local.primaryColor} onChange={v => set('primaryColor', v)} />
      <ColorField label="Secondary Color" value={local.secondaryColor} onChange={v => set('secondaryColor', v)} />
      <ColorField label="Accent Color" value={local.accentColor} onChange={v => set('accentColor', v)} />
      <FormRow label="Tagline"><input value={local.tagline} onChange={e => set('tagline', e.target.value)} className={inputCls} placeholder="Your tagline here" /></FormRow>
      <FormRow label="Footer Disclaimer">
        <textarea value={local.footerDisclaimer} onChange={e => set('footerDisclaimer', e.target.value)} rows={3} className={inputCls} placeholder="Legal disclaimer for reports..." />
      </FormRow>
      {/* Live preview */}
      <div className="rounded-lg border border-border p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
        <div className="flex items-center gap-2">
          {local.logoBase64
            ? <img src={local.logoBase64} alt="preview" className="w-7 h-7 rounded-md object-contain" />
            : <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: local.primaryColor }}>D</div>
          }
          <span className="text-foreground text-sm font-bold">{settings.brokerage.name || 'Your Brokerage'}</span>
        </div>
        {local.tagline && <p className="text-xs text-muted-foreground italic">{local.tagline}</p>}
      </div>
      <SaveBtn onClick={() => {
        update('branding', local);
        document.documentElement.style.setProperty('--primary', local.primaryColor);
        showToast('Branding settings saved');
      }} />
    </div>
  );
}

// ─── Form: CDA Logo ──────────────────────────────────────────────────────────

function CdaLogoForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.cdaLogo);
  useEffect(() => { setLocal(settings.cdaLogo); }, [settings.cdaLogo]);

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setLocal(prev => ({ ...prev, logoBase64: (ev.target?.result as string) || '' }));
    reader.readAsDataURL(f);
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Logo Source">
        <div className="space-y-2">
          {(['true', 'false'] as const).map(val => (
            <label key={val} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" name="cda-logo-src" checked={local.useMainLogo === (val === 'true')} onChange={() => setLocal(prev => ({ ...prev, useMainLogo: val === 'true' }))} className="accent-emerald-500" />
              <span className="text-sm text-foreground">{val === 'true' ? 'Use main brokerage logo' : 'Use a different logo for CDAs'}</span>
            </label>
          ))}
        </div>
      </FormRow>
      {!local.useMainLogo && (
        <FormRow label="CDA-specific Logo">
          <div className="space-y-2">
            {local.logoBase64 && (
              <div className="w-full h-20 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
                <img src={local.logoBase64} alt="CDA logo preview" className="max-h-16 max-w-full object-contain" />
              </div>
            )}
            <label className="block w-full py-2 bg-secondary border border-dashed border-border rounded-lg text-sm text-muted-foreground text-center cursor-pointer hover:border-border/60">
              {local.logoBase64 ? 'Replace CDA Logo' : 'Upload CDA Logo'}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </label>
          </div>
        </FormRow>
      )}
      <SaveBtn onClick={() => { update('cdaLogo', local); showToast('CDA logo settings saved'); }} />
    </div>
  );
}

// ─── Form: Commission Defaults ────────────────────────────────────────────────

function CommissionForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.commissionDefaults);
  useEffect(() => { setLocal(settings.commissionDefaults); }, [settings.commissionDefaults]);
  const brokerSplit = 100 - local.agentSplit;
  const sampleGCI = 500000 * 0.03; // $15,000 on a $500k deal at 3%
  const agentEarns = sampleGCI * (local.agentSplit / 100);
  const brokerEarns = sampleGCI - agentEarns;
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Agent Split %" hint="Percentage of GCI the agent keeps.">
        <input type="number" min={0} max={100} value={local.agentSplit}
          onChange={e => setLocal(prev => ({ ...prev, agentSplit: Math.min(100, Math.max(0, Number(e.target.value))) }))}
          className={inputCls} />
      </FormRow>
      <FormRow label="Broker Split %">
        <div className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">{brokerSplit}%</div>
      </FormRow>
      <FormRow label="Annual Cap Amount $" hint="Once reached, agent pays no more broker commission.">
        <input type="number" min={0} value={local.capAmount}
          onChange={e => setLocal(prev => ({ ...prev, capAmount: Number(e.target.value) }))}
          className={inputCls} />
      </FormRow>
      <FormRow label="Post-Cap Split %" hint="Agent split after hitting the cap.">
        <input type="number" min={0} max={100} value={local.postCapSplit}
          onChange={e => setLocal(prev => ({ ...prev, postCapSplit: Math.min(100, Math.max(0, Number(e.target.value))) }))}
          className={inputCls} />
      </FormRow>
      <FormRow label="Referral Fee %" hint="Default referral fee taken off the top.">
        <input type="number" min={0} max={50} value={local.referralFee}
          onChange={e => setLocal(prev => ({ ...prev, referralFee: Number(e.target.value) }))}
          className={inputCls} />
      </FormRow>
      {/* Live preview */}
      <div className="rounded-lg border border-border p-3 bg-secondary/50 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground">Preview — $500k deal @ 3% GCI</p>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Agent earns</span>
          <span className="text-emerald-400 font-medium">{fmt(agentEarns)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground">Broker retains</span>
          <span className="text-blue-400 font-medium">{fmt(brokerEarns)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-border mt-2">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${local.agentSplit}%` }} />
        </div>
      </div>
      <SaveBtn onClick={() => { update('commissionDefaults', local); showToast('Commission settings saved'); }} />
    </div>
  );
}

// ─── Form: Locale ─────────────────────────────────────────────────────────────

const US_TIMEZONES = [
  { group: 'Eastern', zones: ['America/New_York'] },
  { group: 'Central', zones: ['America/Chicago'] },
  { group: 'Mountain', zones: ['America/Denver', 'America/Phoenix'] },
  { group: 'Pacific', zones: ['America/Los_Angeles'] },
  { group: 'Alaska', zones: ['America/Anchorage'] },
  { group: 'Hawaii', zones: ['Pacific/Honolulu'] },
];

function LocaleForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.locale);
  useEffect(() => { setLocal(settings.locale); }, [settings.locale]);

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Timezone">
        <select value={local.timezone} onChange={e => setLocal(prev => ({ ...prev, timezone: e.target.value }))}
          className={inputCls}>
          {US_TIMEZONES.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.zones.map(z => <option key={z} value={z}>{z.replace('America/', '').replace('Pacific/', '').replace(/_/g, ' ')}</option>)}
            </optgroup>
          ))}
        </select>
      </FormRow>
      <FormRow label="Date Format">
        <BtnGroup
          value={local.dateFormat}
          onChange={v => setLocal(prev => ({ ...prev, dateFormat: v }))}
          options={[
            { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' as const },
            { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' as const },
            { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' as const },
          ]}
        />
      </FormRow>
      <FormRow label="Currency">
        <BtnGroup
          value={local.currencyFormat}
          onChange={v => setLocal(prev => ({ ...prev, currencyFormat: v }))}
          options={[
            { label: 'USD ($)', value: 'USD' as const },
            { label: 'CAD (C$)', value: 'CAD' as const },
          ]}
        />
      </FormRow>
      <SaveBtn onClick={() => { update('locale', local); showToast('Locale settings saved'); }} />
    </div>
  );
}

// ─── Form: Auto Refresh ───────────────────────────────────────────────────────

function AutoRefreshForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Enable Auto-Refresh">
        <div className="flex items-center gap-3">
          <Toggle checked={local.autoRefreshEnabled} onChange={v => setLocal(prev => ({ ...prev, autoRefreshEnabled: v }))} />
          <span className="text-sm text-muted-foreground">{local.autoRefreshEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </FormRow>
      {local.autoRefreshEnabled && (
        <FormRow label="Refresh Interval" hint="How often the dashboard checks for new data.">
          <BtnGroup
            value={local.autoRefreshInterval}
            onChange={v => setLocal(prev => ({ ...prev, autoRefreshInterval: v }))}
            options={[
              { label: '30s', value: 30 },
              { label: '1m', value: 60 },
              { label: '5m', value: 300 },
              { label: '15m', value: 900 },
              { label: '30m', value: 1800 },
              { label: '1hr', value: 3600 },
            ]}
          />
        </FormRow>
      )}
      <SaveBtn onClick={() => { update('reporting', local); showToast('Auto-refresh settings saved'); }} />
    </div>
  );
}

// ─── Form: Report Retention ───────────────────────────────────────────────────

function ReportRetentionForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Retain Reports For" hint="Generated reports older than this are automatically removed.">
        <BtnGroup
          value={local.retentionDays}
          onChange={v => setLocal(prev => ({ ...prev, retentionDays: v }))}
          options={[
            { label: '7 days', value: 7 },
            { label: '30 days', value: 30 },
            { label: '90 days', value: 90 },
            { label: '1 year', value: 365 },
            { label: 'Forever', value: 0 },
          ]}
        />
      </FormRow>
      <SaveBtn onClick={() => { update('reporting', local); showToast('Retention settings saved'); }} />
    </div>
  );
}

// ─── Form: Email Reports ──────────────────────────────────────────────────────

const REPORT_TYPES = ['production', 'pipeline', 'commission', 'goals', 'recruiting'];

function EmailReportsForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  function toggleType(t: string) {
    setLocal(prev => ({
      ...prev,
      emailReportTypes: prev.emailReportTypes.includes(t)
        ? prev.emailReportTypes.filter(x => x !== t)
        : [...prev.emailReportTypes, t],
    }));
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Enable Email Reports">
        <div className="flex items-center gap-3">
          <Toggle checked={local.emailReportsEnabled} onChange={v => setLocal(prev => ({ ...prev, emailReportsEnabled: v }))} />
          <span className="text-sm text-muted-foreground">{local.emailReportsEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </FormRow>
      {local.emailReportsEnabled && (
        <>
          <FormRow label="Frequency">
            <BtnGroup
              value={local.emailFrequency}
              onChange={v => setLocal(prev => ({ ...prev, emailFrequency: v }))}
              options={[
                { label: 'Monthly', value: 'monthly' as const },
                { label: 'Quarterly', value: 'quarterly' as const },
              ]}
            />
          </FormRow>
          {local.emailFrequency === 'monthly' && (
            <FormRow label="Day of Month">
              <input type="number" min={1} max={28} value={local.emailDayOfMonth}
                onChange={e => setLocal(prev => ({ ...prev, emailDayOfMonth: Number(e.target.value) }))}
                className={inputCls} />
            </FormRow>
          )}
          <FormRow label="Include Reports">
            <div className="space-y-2 mt-1">
              {REPORT_TYPES.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={local.emailReportTypes.includes(t)} onChange={() => toggleType(t)} className="accent-emerald-500" />
                  <span className="text-sm text-foreground capitalize">{t}</span>
                </label>
              ))}
            </div>
          </FormRow>
        </>
      )}
      <SaveBtn onClick={() => { update('reporting', local); showToast('Email report settings saved'); }} />
    </div>
  );
}

// ─── Form: Report Recipients ──────────────────────────────────────────────────

function ReportRecipientsForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  const [newEmail, setNewEmail] = useState('');
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  function addRecipient() {
    const e = newEmail.trim();
    if (!e || local.recipients.includes(e)) return;
    setLocal(prev => ({ ...prev, recipients: [...prev.recipients, e] }));
    setNewEmail('');
  }

  function removeRecipient(e: string) {
    setLocal(prev => ({ ...prev, recipients: prev.recipients.filter(r => r !== e) }));
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Add Recipient">
        <div className="flex gap-2">
          <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addRecipient()}
            className={`${inputCls} flex-1`} placeholder="email@example.com" />
          <button onClick={addRecipient} className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </FormRow>
      <div className="space-y-1.5">
        {local.recipients.length === 0
          ? <p className="text-muted-foreground text-xs text-center py-4">No recipients yet.</p>
          : local.recipients.map(r => (
            <div key={r} className="flex items-center justify-between bg-secondary border border-border rounded-lg px-3 py-2">
              <span className="text-sm text-foreground">{r}</span>
              <button onClick={() => removeRecipient(r)} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        }
      </div>
      <SaveBtn onClick={() => { update('reporting', local); showToast('Recipients saved'); }} />
    </div>
  );
}

// ─── Form: Display Mode ───────────────────────────────────────────────────────

const DISPLAY_MODES = [
  { id: 'standard', label: 'Standard', desc: 'Normal dashboard view for brokers.' },
  { id: 'wallboard', label: 'Wallboard', desc: 'Large-display mode with auto-rotating scenes.' },
  { id: 'presentation', label: 'Presentation', desc: 'Clean layout for meetings and screen share.' },
] as const;

function DisplayModeForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Display Mode">
        <div className="space-y-2 mt-1">
          {DISPLAY_MODES.map(m => (
            <label key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${local.displayMode === m.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-secondary hover:border-border/60'}`}>
              <input type="radio" name="display-mode" value={m.id} checked={local.displayMode === m.id}
                onChange={() => setLocal(prev => ({ ...prev, displayMode: m.id }))} className="accent-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </FormRow>
      {local.displayMode === 'wallboard' && (
        <FormRow label="Scene Rotation Interval" hint="Seconds between automatic scene changes.">
          <BtnGroup
            value={local.wallboardRotateSeconds}
            onChange={v => setLocal(prev => ({ ...prev, wallboardRotateSeconds: v }))}
            options={[
              { label: '10s', value: 10 },
              { label: '15s', value: 15 },
              { label: '30s', value: 30 },
              { label: '60s', value: 60 },
            ]}
          />
        </FormRow>
      )}
      <SaveBtn onClick={() => { update('reporting', local); showToast('Display settings saved'); }} />
    </div>
  );
}

// ─── Form: Alerts ─────────────────────────────────────────────────────────────

function AlertsForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.alerts);
  useEffect(() => { setLocal(settings.alerts); }, [settings.alerts]);

  type AlertKey = keyof typeof local;
  function toggle(k: AlertKey) { setLocal(prev => ({ ...prev, [k]: !prev[k] })); }
  function setNum(k: AlertKey, v: number) { setLocal(prev => ({ ...prev, [k]: v })); }

  return (
    <div className="px-6 py-5 space-y-5 flex-1 overflow-y-auto">
      {/* Stuck deals */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Stuck Deals</p>
            <p className="text-xs text-muted-foreground">Flag deals stagnant for too long.</p>
          </div>
          <Toggle checked={local.stuckDealEnabled} onChange={() => toggle('stuckDealEnabled')} />
        </div>
        {local.stuckDealEnabled && (
          <FormRow label="Days threshold (Under Contract)">
            <input type="number" min={1} max={365} value={local.stuckDealDays}
              onChange={e => setNum('stuckDealDays', Number(e.target.value))} className={inputCls} />
          </FormRow>
        )}
      </div>
      <hr className="border-border" />
      {/* Pipeline drop */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Pipeline Drop</p>
            <p className="text-xs text-muted-foreground">Alert when pipeline falls by X%.</p>
          </div>
          <Toggle checked={local.pipelineDropEnabled} onChange={() => toggle('pipelineDropEnabled')} />
        </div>
        {local.pipelineDropEnabled && (
          <FormRow label="Drop % threshold">
            <input type="number" min={1} max={100} value={local.pipelineDropPercent}
              onChange={e => setNum('pipelineDropPercent', Number(e.target.value))} className={inputCls} />
          </FormRow>
        )}
      </div>
      <hr className="border-border" />
      {/* Commission variance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Commission Variance</p>
            <p className="text-xs text-muted-foreground">Flag when commission deviates from split.</p>
          </div>
          <Toggle checked={local.commissionVarianceEnabled} onChange={() => toggle('commissionVarianceEnabled')} />
        </div>
        {local.commissionVarianceEnabled && (
          <FormRow label="Variance % threshold">
            <input type="number" min={1} max={100} value={local.commissionVariancePercent}
              onChange={e => setNum('commissionVariancePercent', Number(e.target.value))} className={inputCls} />
          </FormRow>
        )}
      </div>
      <hr className="border-border" />
      {/* Goal behind */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Goal Behind Pace</p>
            <p className="text-xs text-muted-foreground">Alert when an agent is behind goal by X%.</p>
          </div>
          <Toggle checked={local.goalBehindEnabled} onChange={() => toggle('goalBehindEnabled')} />
        </div>
        {local.goalBehindEnabled && (
          <FormRow label="Behind % threshold">
            <input type="number" min={1} max={100} value={local.goalBehindPercent}
              onChange={e => setNum('goalBehindPercent', Number(e.target.value))} className={inputCls} />
          </FormRow>
        )}
      </div>
      <SaveBtn onClick={() => { update('alerts', local); showToast('Alert settings saved'); }} />
    </div>
  );
}

// ─── Form: Notifications ──────────────────────────────────────────────────────

function NotificationsForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.notifications);
  useEffect(() => { setLocal(settings.notifications); }, [settings.notifications]);

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Email Notifications">
        <div className="flex items-center gap-3">
          <Toggle checked={local.emailEnabled} onChange={v => setLocal(prev => ({ ...prev, emailEnabled: v }))} />
          <span className="text-sm text-muted-foreground">{local.emailEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </FormRow>
      {local.emailEnabled && (
        <FormRow label="Notification Email Address">
          <input type="email" value={local.emailAddress} onChange={e => setLocal(prev => ({ ...prev, emailAddress: e.target.value }))}
            className={inputCls} placeholder="alerts@yourbrokerage.com" />
        </FormRow>
      )}
      <SaveBtn onClick={() => { update('notifications', local); showToast('Notification preferences saved'); }} />
    </div>
  );
}

// ─── Form: Lead Sources ───────────────────────────────────────────────────────

function LeadSourcesForm({ settings, update, showToast }: FormProps) {
  const [sources, setSources] = useState<LeadSource[]>(settings.leadSources);
  const [newName, setNewName] = useState('');
  useEffect(() => { setSources(settings.leadSources); }, [settings.leadSources]);

  function move(idx: number, dir: -1 | 1) {
    const next = [...sources];
    const to = idx + dir;
    if (to < 0 || to >= next.length) return;
    [next[idx], next[to]] = [next[to], next[idx]];
    setSources(next);
  }

  function toggleActive(id: string) {
    setSources(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  function remove(id: string) {
    setSources(prev => prev.filter(s => s.id !== id));
  }

  function addSource() {
    const n = newName.trim();
    if (!n) return;
    const id = n.toLowerCase().replace(/\s+/g, '-');
    setSources(prev => [...prev, { id, name: n, active: true }]);
    setNewName('');
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <div className="space-y-1.5">
        {sources.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-2 py-1.5">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-none" />
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ChevronUp className="w-3 h-3" /></button>
              <button onClick={() => move(i, 1)} disabled={i === sources.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ChevronDown className="w-3 h-3" /></button>
            </div>
            <span className="flex-1 text-sm text-foreground truncate">{s.name}</span>
            <Toggle checked={s.active} onChange={() => toggleActive(s.id)} />
            <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSource()}
          className={`${inputCls} flex-1`} placeholder="New lead source name" />
        <button onClick={addSource} className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <SaveBtn onClick={() => { update('leadSources', sources); showToast('Lead sources saved'); }} />
    </div>
  );
}

// ─── Form: Lead Source Costs ──────────────────────────────────────────────────

function LeadCostsForm({ settings, update, showToast }: FormProps) {
  const [costs, setCosts] = useState(settings.leadSourceCosts);
  useEffect(() => { setCosts(settings.leadSourceCosts); }, [settings.leadSourceCosts]);
  const activeSources = settings.leadSources.filter(s => s.active);
  const totalMonthly = costs.reduce((sum, c) => sum + c.monthlyCost, 0);

  function setCost(id: string, val: number) {
    setCosts(prev => {
      const existing = prev.find(c => c.sourceId === id);
      if (existing) return prev.map(c => c.sourceId === id ? { ...c, monthlyCost: val } : c);
      return [...prev, { sourceId: id, monthlyCost: val }];
    });
  }

  function getCost(id: string) {
    return costs.find(c => c.sourceId === id)?.monthlyCost ?? 0;
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <p className="text-muted-foreground text-xs">Set the monthly cost per lead source. Used in the Lead ROI page to calculate return on investment.</p>
      <div className="space-y-3">
        {activeSources.map(s => (
          <FormRow key={s.id} label={s.name}>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">$</span>
              <input type="number" min={0} value={getCost(s.id)}
                onChange={e => setCost(s.id, Number(e.target.value))}
                className={`${inputCls} flex-1`} placeholder="0" />
              <span className="text-muted-foreground text-xs whitespace-nowrap">/mo</span>
            </div>
          </FormRow>
        ))}
      </div>
      <div className="rounded-lg border border-border p-3 bg-secondary/50 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total monthly spend</span>
          <span className="text-foreground font-medium">${totalMonthly.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Annual spend</span>
          <span className="text-foreground font-medium">${(totalMonthly * 12).toLocaleString()}</span>
        </div>
      </div>
      <SaveBtn onClick={() => { update('leadSourceCosts', costs); showToast('Lead costs saved'); }} />
    </div>
  );
}

// ─── Form: Upload Limits ──────────────────────────────────────────────────────

function UploadLimitsForm({ settings, update, showToast }: FormProps) {
  const [local, setLocal] = useState(settings.uploadLimits);
  useEffect(() => { setLocal(settings.uploadLimits); }, [settings.uploadLimits]);

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <FormRow label="Max CSV File Size" hint="Files larger than this will be rejected at upload.">
        <BtnGroup
          value={local.maxFileSizeMB}
          onChange={v => setLocal(prev => ({ ...prev, maxFileSizeMB: v }))}
          options={[
            { label: '5 MB', value: 5 },
            { label: '10 MB', value: 10 },
            { label: '25 MB', value: 25 },
            { label: '50 MB', value: 50 },
            { label: '100 MB', value: 100 },
          ]}
        />
      </FormRow>
      <FormRow label="Max Transactions Per Push" hint="Uploads with more rows than this will be truncated.">
        <BtnGroup
          value={local.maxTransactionsPerPush}
          onChange={v => setLocal(prev => ({ ...prev, maxTransactionsPerPush: v }))}
          options={[
            { label: '1,000', value: 1000 },
            { label: '2,500', value: 2500 },
            { label: '5,000', value: 5000 },
            { label: '10,000', value: 10000 },
            { label: 'Unlimited', value: 999999 },
          ]}
        />
      </FormRow>
      <SaveBtn onClick={() => { update('uploadLimits', local); showToast('Upload limits saved'); }} />
    </div>
  );
}

// ─── Form: API Limits ─────────────────────────────────────────────────────────

function ApiLimitsForm() {
  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <p className="text-muted-foreground text-xs">Current API usage for this tenant. Limits reset monthly.</p>
      <div className="space-y-4">
        {[
          { label: 'API Calls (this month)', used: 0, limit: 1000 },
          { label: 'Webhook Deliveries', used: 0, limit: 10000 },
        ].map(item => (
          <div key={item.label} className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{item.used.toLocaleString()} / {item.limit.toLocaleString()}</span>
            </div>
            <div className="h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(100, (item.used / item.limit) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground text-xs text-center pt-2">Live API rate limits available in Phase 2</p>
    </div>
  );
}

// ─── Form: Export Data ────────────────────────────────────────────────────────

function ExportDataForm({ settings, allRecords, showToast }: FormProps) {
  function handleExport() {
    const data = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      settings,
      transactions: allRecords ?? [],
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dotloop-reporter-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded');
  }

  return (
    <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto">
      <p className="text-muted-foreground text-sm">Downloads all settings and transaction data as JSON. Includes {(allRecords ?? []).length.toLocaleString()} records.</p>
      <button onClick={handleExport}
        className="w-full py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
        <Download className="w-4 h-4" />
        Download JSON Export
      </button>
    </div>
  );
}

// ─── Sheet card components ────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsComplete() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const { clearTransactionData, allRecords } = useTransactionData();
  const [, navigate] = useLocation();
  const { settings, update, resetAll } = useSettings();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
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
    if (id === 'reset-data') { setResetDialog(true); return; }
    setOpenCard(id);
  }

  const formProps: FormProps = { settings, update, showToast, allRecords };

  function renderSheetBody(cardId: string): ReactNode {
    switch (cardId) {
      case 'brokerage': return <BrokerageForm {...formProps} />;
      case 'branding': return <BrandingForm {...formProps} />;
      case 'cda-logo': return <CdaLogoForm {...formProps} />;
      case 'default-commission': return <CommissionForm {...formProps} />;
      case 'default-timezone': return <LocaleForm {...formProps} />;
      case 'auto-refresh': return <AutoRefreshForm {...formProps} />;
      case 'report-retention': return <ReportRetentionForm {...formProps} />;
      case 'email-reports': return <EmailReportsForm {...formProps} />;
      case 'report-recipients': return <ReportRecipientsForm {...formProps} />;
      case 'display-mode': return <DisplayModeForm {...formProps} />;
      case 'alerts': return <AlertsForm {...formProps} />;
      case 'notification-prefs': return <NotificationsForm {...formProps} />;
      case 'lead-sources': return <LeadSourcesForm {...formProps} />;
      case 'lead-costs': return <LeadCostsForm {...formProps} />;
      case 'upload-limits': return <UploadLimitsForm {...formProps} />;
      case 'api-limits': return <ApiLimitsForm />;
      case 'export-data': return <ExportDataForm {...formProps} />;
      case 'dotloop-connections': return (
        <div className="px-6 py-5 space-y-5 flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <span className="text-xs text-yellow-400 font-medium">Status: Not connected</span>
          </div>
          <button disabled className="w-full py-2.5 bg-secondary border border-border rounded-lg text-muted-foreground text-sm cursor-not-allowed">
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
      );
      default: return <ComingSoon card={CARDS.find(c => c.id === cardId)} />;
    }
  }

  const openCardDef = CARDS.find(c => c.id === openCard);

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
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">Clear search</button>
            </div>
          ) : (
            SECTIONS.map(section => (
              <SectionBlock key={section.id} section={section} cards={getVisibleCards(section.id)} onCardClick={handleCardClick} />
            ))
          )}
        </div>
      )}

      {/* Settings Sheet */}
      <Sheet open={!!openCard} onOpenChange={open => !open && setOpenCard(null)}>
        <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-background border-l border-border p-0 gap-0">
          {openCard && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <SheetTitle className="text-foreground">{openCardDef?.title}</SheetTitle>
                <SheetDescription className="text-muted-foreground text-sm">{openCardDef?.description}</SheetDescription>
              </SheetHeader>
              {renderSheetBody(openCard)}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reset Dialog */}
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
              <button onClick={() => { setResetDialog(false); setResetInput(''); }}
                className="px-4 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/80 transition-colors">
                Cancel
              </button>
              <button
                disabled={resetInput !== 'RESET'}
                onClick={() => {
                  clearTransactionData();
                  resetAll();
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

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-2xl text-sm font-medium animate-in slide-in-from-bottom-4">
          <Check className="w-4 h-4" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}
