import {
  useState, useMemo, useEffect, useRef,
  type ReactNode, type ChangeEvent,
} from 'react';
import { useLocation } from 'wouter';
import {
  Search, ChevronUp, ChevronRight, X, Check, Download, Trash2, AlertTriangle,
  Building2, Palette, FileImage, Percent, Clock, RefreshCw, Archive,
  Mail, Users, Monitor, Link, Zap, Settings2, Bell, BellOff, Tag,
  DollarSign, Upload, Activity, Plus, GripVertical, ChevronDown, Trash,
  Wifi, Copy, Image, Eye, EyeOff, LogOut, Webhook,
} from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import supabase from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useSettings,
  type SettingsConfig,
  type LeadSource,
  type Webhook as WebhookType,
  type AlertRule,
  type NotificationPrefs,
  type QbAgentMapping,
  type QbBillingItem,
} from '@/hooks/useSettings';

// ─── Card / Section data ──────────────────────────────────────────────────────

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  section: 'brokerage' | 'reporting' | 'integrations' | 'notifications' | 'data' | 'advanced' | 'danger';
}

const CARDS: SettingCard[] = [
  { id: 'brokerage',            title: 'Brokerage',                    description: 'Name, contact details, and license info.',             icon: <Building2 />,  section: 'brokerage' },
  { id: 'branding',             title: 'Branding & White Label',        description: 'Colors, logo, tagline, and appearance.',               icon: <Palette />,    section: 'brokerage' },
  { id: 'cda-logo',             title: 'CDA Logo',                      description: 'Logo on Commission Disbursement Authorizations.',      icon: <FileImage />,  section: 'brokerage' },
  { id: 'default-commission',   title: 'Default Commission Rate',        description: 'Default split applied to new agents and deals.',       icon: <Percent />,    section: 'brokerage' },
  { id: 'default-timezone',     title: 'Default Timezone',              description: 'Timezone, date format, and currency.',                 icon: <Clock />,      section: 'brokerage' },
  { id: 'auto-refresh',         title: 'Dashboard Auto-Refresh',        description: 'How often the dashboard polls for fresh data.',        icon: <RefreshCw />,  section: 'reporting' },
  { id: 'report-retention',     title: 'Custom Report Retention',       description: 'How long generated reports stay available.',           icon: <Archive />,    section: 'reporting' },
  { id: 'email-reports',        title: 'Automated Email Reports',       description: 'Schedule monthly or quarterly production reports.',    icon: <Mail />,       section: 'reporting' },
  { id: 'report-recipients',    title: 'External Report Recipients',    description: 'Share reports with stakeholders outside the brokerage.', icon: <Users />,   section: 'reporting' },
  { id: 'display-mode',         title: 'Display Mode',                  description: 'Wallboard, scenes, and presentation schedules.',       icon: <Monitor />,    section: 'reporting' },
  { id: 'account-connections',  title: 'Account Connections',           description: 'Your account and sign-out options.',                   icon: <Link />,       section: 'integrations' },
  { id: 'dotloop-connections',  title: 'Dotloop Connections',           description: 'Sign in to one or more Dotloop accounts.',             icon: <Zap />,        section: 'integrations' },
  { id: 'dotloop-autopush',     title: 'Dotloop Auto-Push',             description: 'Automatically push new transactions to Dotloop.',      icon: <Zap />,        section: 'integrations' },
  { id: 'fub',                  title: 'Follow Up Boss',                description: 'Sync loops and participants into FUB.',                icon: <Settings2 />,  section: 'integrations' },
  { id: 'quickbooks',           title: 'QuickBooks Settings',           description: 'Map accounts, vendors, and billing items for sync.',   icon: <DollarSign />, section: 'integrations' },
  { id: 'quickbooks-alerts',    title: 'QuickBooks Failure Alerts',     description: 'Get notified when a QuickBooks sync fails.',           icon: <Bell />,       section: 'integrations' },
  { id: 'webhooks',             title: 'Webhook Settings',              description: 'HTTP callbacks for closed deals, goals, and more.',    icon: <Activity />,   section: 'integrations' },
  { id: 'alerts',               title: 'Alerts & Notifications',        description: 'Threshold-based alerts and stuck-deal monitoring.',    icon: <Bell />,       section: 'notifications' },
  { id: 'notification-prefs',   title: 'Notification Preferences',      description: 'Per-notification opt-in for each delivery channel.',   icon: <BellOff />,    section: 'notifications' },
  { id: 'lead-sources',         title: 'Lead Sources',                  description: 'Define and order the lead sources you track.',         icon: <Tag />,        section: 'data' },
  { id: 'lead-costs',           title: 'Lead Source Costs',             description: 'Monthly cost per lead source for ROI calculations.',   icon: <DollarSign />, section: 'data' },
  { id: 'upload-limits',        title: 'Upload & Push Limits',          description: 'Maximum CSV size and per-push transaction count.',     icon: <Upload />,     section: 'data' },
  { id: 'api-limits',           title: 'API Rate Limits',               description: "Inspect your tenant's current rate-limit usage.",     icon: <Activity />,   section: 'advanced' },
  { id: 'export-data',          title: 'Export All Data',               description: 'Download all your data as JSON.',                     icon: <Download />,   section: 'danger' },
  { id: 'reset-data',           title: 'Reset All Data',                description: 'Permanently delete all data. Irreversible.',          icon: <Trash2 />,     section: 'danger' },
];

interface SectionDef {
  id: string;
  label: string;
  description: string;
  tabLabel: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'brokerage',     label: 'BROKERAGE',      description: 'Brokerage profile, branding, and defaults.',           tabLabel: 'Brokerage' },
  { id: 'reporting',     label: 'REPORTING',       description: 'Dashboards, reports, and recipients.',                 tabLabel: 'Reporting' },
  { id: 'integrations',  label: 'INTEGRATIONS',    description: 'Connect Dotloop, FUB, QuickBooks, and webhooks.',      tabLabel: 'Integrations' },
  { id: 'notifications', label: 'NOTIFICATIONS',   description: 'Alerts and delivery preferences.',                     tabLabel: 'Notifications' },
  { id: 'data',          label: 'DATA',            description: 'Lead sources, costs, and import limits.',              tabLabel: 'Data' },
  { id: 'advanced',      label: 'ADVANCED',        description: 'Power-user controls.',                                 tabLabel: 'Advanced' },
  { id: 'danger',        label: 'DANGER ZONE',     description: '',                                                     tabLabel: 'Danger' },
];

// ─── Shared form props ────────────────────────────────────────────────────────

interface FormProps {
  settings: SettingsConfig;
  update: <K extends keyof SettingsConfig>(section: K, value: SettingsConfig[K]) => void;
  showToast: (msg: string) => void;
  allRecords?: ReturnType<typeof useTransactionData>['allRecords'];
  agentMetrics?: ReturnType<typeof useTransactionData>['agentMetrics'];
  onClose: () => void;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const iCls = 'w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-blue-500/50';
const lCls = 'text-foreground text-xs font-medium block mb-1';

function FR({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className={lCls}>{label}</label>
      {hint && <p className="text-muted-foreground text-[11px] mb-1.5 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-border'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg border border-border">
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent flex-none" style={{ padding: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="text-xs text-foreground font-mono bg-transparent outline-none w-full" />
      </div>
    </div>
  );
}

function BtnGroup<T extends string | number>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { label: string; value: T }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            value === o.value ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-secondary text-foreground border-border hover:border-border/60'
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SaveRow({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onCancel} className="flex-1 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
      <button onClick={onSave} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">Save Changes</button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

// ─── BROKERAGE form ───────────────────────────────────────────────────────────

function BrokerageForm({ settings, update, showToast, onClose }: FormProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(settings.brokerage);
  useEffect(() => { setLocal(settings.brokerage); }, [settings.brokerage]);
  const set = (k: keyof typeof local) => (e: ChangeEvent<HTMLInputElement>) =>
    setLocal(prev => ({ ...prev, [k]: e.target.value }));

  function handleSave() {
    update('brokerage', local);
    update('branding', { ...settings.branding, tagline: local.name ? settings.branding.tagline : settings.branding.tagline });
    showToast('Brokerage settings saved');
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Brokerage Name', local.name || '—'],
            ['Managing Broker', local.brokerName || '—'],
            ['License #', local.licenseNumber || '—'],
            ['Phone', local.phone || '—'],
            ['Address', [local.address, local.city, local.state, local.zip].filter(Boolean).join(', ') || '—'],
            ['Website', local.website || '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{k}</p>
              <p className="text-foreground mt-0.5 truncate">{v}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Edit</button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FR label="Brokerage Name"><input value={local.name} onChange={set('name')} className={iCls} placeholder="Acme Realty" /></FR>
        <FR label="Managing Broker"><input value={local.brokerName} onChange={set('brokerName')} className={iCls} /></FR>
        <FR label="License #"><input value={local.licenseNumber} onChange={set('licenseNumber')} className={iCls} /></FR>
        <FR label="Phone"><input value={local.phone} onChange={set('phone')} className={iCls} placeholder="(555) 555-5555" /></FR>
        <FR label="Street Address"><input value={local.address} onChange={set('address')} className={iCls} /></FR>
        <FR label="City"><input value={local.city} onChange={set('city')} className={iCls} /></FR>
        <FR label="State"><input value={local.state} onChange={set('state')} className={iCls} placeholder="TX" /></FR>
        <FR label="ZIP"><input value={local.zip} onChange={set('zip')} className={iCls} /></FR>
      </div>
      <FR label="Website"><input value={local.website} onChange={set('website')} className={iCls} placeholder="https://" /></FR>
      <SaveRow onSave={handleSave} onCancel={() => { setLocal(settings.brokerage); setEditing(false); }} />
    </div>
  );
}

// ─── BRANDING form ────────────────────────────────────────────────────────────

function BrandingForm({ settings, update, showToast, onClose }: FormProps) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(settings.branding);
  const [brok, setBrok] = useState(settings.brokerage);
  useEffect(() => { setLocal(settings.branding); setBrok(settings.brokerage); }, [settings.branding, settings.brokerage]);

  function handleLogoUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setLocal(prev => ({ ...prev, logoBase64: (ev.target?.result as string) || '' }));
    reader.readAsDataURL(f);
  }

  function handleSave() {
    update('branding', local);
    update('brokerage', { ...settings.brokerage, ...brok });
    document.documentElement.style.setProperty('--primary', local.primaryColor);
    showToast('Branding settings saved');
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Customize your brokerage appearance across CDA documents, email reports, and the dashboard</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Tagline</p>
            <p className="text-foreground mt-0.5">{local.tagline || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Brand Colors</p>
            <div className="flex gap-1.5 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-secondary text-xs">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: local.primaryColor }} />
                <span className="font-mono text-foreground">{local.primaryColor}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-secondary text-xs">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: local.secondaryColor }} />
                <span className="font-mono text-foreground">{local.secondaryColor}</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Logo</p>
            {local.logoBase64
              ? <img src={local.logoBase64} alt="logo" className="h-8 mt-1 object-contain" />
              : <p className="text-foreground mt-0.5">—</p>}
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Footer Disclaimer</p>
            <p className="text-foreground mt-0.5 text-xs line-clamp-2">{local.footerDisclaimer || '—'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="px-4 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Edit</button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FR label="Tagline"><input value={brok.name} onChange={e => setBrok(p => ({ ...p, name: e.target.value }))} placeholder="Your brokerage tagline" className={iCls} /></FR>
      <div className="grid grid-cols-2 gap-3">
        <ColorSwatch label="Primary Color" value={local.primaryColor} onChange={v => setLocal(p => ({ ...p, primaryColor: v }))} />
        <ColorSwatch label="Secondary Color" value={local.secondaryColor} onChange={v => setLocal(p => ({ ...p, secondaryColor: v }))} />
      </div>
      <FR label="Accent Color">
        <ColorSwatch label="Accent" value={local.accentColor} onChange={v => setLocal(p => ({ ...p, accentColor: v }))} />
      </FR>
      <FR label="Logo" hint="PNG or SVG recommended.">
        <div className="space-y-2">
          {local.logoBase64 && (
            <div className="w-full h-16 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
              <img src={local.logoBase64} alt="Logo preview" className="max-h-12 max-w-full object-contain" />
            </div>
          )}
          <label className="block w-full py-2 bg-secondary border border-dashed border-border rounded-lg text-sm text-muted-foreground text-center cursor-pointer hover:border-border/60 transition-colors">
            {local.logoBase64 ? 'Replace Logo' : 'Upload Logo'}
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </label>
          {local.logoBase64 && (
            <button onClick={() => setLocal(p => ({ ...p, logoBase64: '' }))} className="w-full py-1.5 text-xs text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">Remove Logo</button>
          )}
        </div>
      </FR>
      <FR label="Footer Disclaimer">
        <textarea value={local.footerDisclaimer} onChange={e => setLocal(p => ({ ...p, footerDisclaimer: e.target.value }))} rows={2} className={iCls} placeholder="Legal disclaimer for reports..." />
      </FR>
      <SaveRow onSave={handleSave} onCancel={() => { setLocal(settings.branding); setEditing(false); }} />
    </div>
  );
}

// ─── CDA LOGO form ────────────────────────────────────────────────────────────

function CdaLogoForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.cdaLogo);
  useEffect(() => { setLocal(settings.cdaLogo); }, [settings.cdaLogo]);

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setLocal(p => ({ ...p, logoBase64: (ev.target?.result as string) || '' }));
    reader.readAsDataURL(f);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Upload your brokerage logo to appear on Commission Disbursement Authorizations</p>
      <label className="block w-full cursor-pointer">
        <div className={`w-full rounded-xl border-2 border-dashed transition-colors py-10 flex flex-col items-center justify-center gap-2 ${local.logoBase64 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-secondary/40 hover:border-border/60'}`}>
          {local.logoBase64
            ? <img src={local.logoBase64} alt="CDA logo" className="max-h-20 max-w-full object-contain" />
            : (
              <>
                <Image className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-sm text-foreground font-medium">Click to upload logo</p>
                <p className="text-xs text-muted-foreground">PNG or JPG — max 500KB</p>
              </>
            )}
        </div>
        <input type="file" accept="image/png,image/jpeg" onChange={handleUpload} className="hidden" />
      </label>
      {local.logoBase64 && (
        <button onClick={() => setLocal(p => ({ ...p, logoBase64: '' }))} className="w-full py-1.5 text-xs text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors">Remove Logo</button>
      )}
      <div className="space-y-2">
        {[{ val: true, label: 'Use main brokerage logo' }, { val: false, label: 'Use a different logo for CDAs' }].map(opt => (
          <label key={String(opt.val)} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="cda-logo-src" checked={local.useMainLogo === opt.val} onChange={() => setLocal(p => ({ ...p, useMainLogo: opt.val }))} className="accent-emerald-500" />
            <span className="text-sm text-foreground">{opt.label}</span>
          </label>
        ))}
      </div>
      <SaveRow
        onSave={() => { update('cdaLogo', local); showToast('CDA logo saved'); onClose(); }}
        onCancel={onClose}
      />
    </div>
  );
}

// ─── COMMISSION form ──────────────────────────────────────────────────────────

function CommissionForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.commissionDefaults);
  useEffect(() => { setLocal(settings.commissionDefaults); }, [settings.commissionDefaults]);
  const brokerSplit = 100 - local.agentSplit;
  const sampleGCI = 500000 * 0.03;
  const agentEarns = sampleGCI * (local.agentSplit / 100);
  const fmt = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FR label="Agent Split %">
          <input type="number" min={0} max={100} value={local.agentSplit}
            onChange={e => setLocal(p => ({ ...p, agentSplit: Math.min(100, Math.max(0, Number(e.target.value))) }))} className={iCls} />
        </FR>
        <FR label="Broker Split %">
          <div className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground">{brokerSplit}%</div>
        </FR>
        <FR label="Cap Amount $" hint="Annual broker commission cap.">
          <input type="number" min={0} value={local.capAmount} onChange={e => setLocal(p => ({ ...p, capAmount: Number(e.target.value) }))} className={iCls} />
        </FR>
        <FR label="Post-Cap Split %">
          <input type="number" min={0} max={100} value={local.postCapSplit} onChange={e => setLocal(p => ({ ...p, postCapSplit: Number(e.target.value) }))} className={iCls} />
        </FR>
      </div>
      <FR label="Referral Fee %">
        <input type="number" min={0} max={50} value={local.referralFee} onChange={e => setLocal(p => ({ ...p, referralFee: Number(e.target.value) }))} className={iCls} />
      </FR>
      <div className="rounded-lg border border-border p-3 bg-secondary/50 space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Preview — $500k deal @ 3% GCI</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Agent earns</span>
          <span className="text-emerald-400 font-medium">{fmt(agentEarns)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Broker retains</span>
          <span className="text-blue-400 font-medium">{fmt(sampleGCI - agentEarns)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-border mt-1">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${local.agentSplit}%` }} />
        </div>
      </div>
      <SaveRow onSave={() => { update('commissionDefaults', local); showToast('Commission defaults saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── LOCALE form ──────────────────────────────────────────────────────────────

const US_TIMEZONES = [
  { group: 'Eastern',  zones: ['America/New_York'] },
  { group: 'Central',  zones: ['America/Chicago'] },
  { group: 'Mountain', zones: ['America/Denver', 'America/Phoenix'] },
  { group: 'Pacific',  zones: ['America/Los_Angeles'] },
  { group: 'Alaska',   zones: ['America/Anchorage'] },
  { group: 'Hawaii',   zones: ['Pacific/Honolulu'] },
];

function LocaleForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.locale);
  useEffect(() => { setLocal(settings.locale); }, [settings.locale]);

  return (
    <div className="space-y-4">
      <FR label="Timezone">
        <select value={local.timezone} onChange={e => setLocal(p => ({ ...p, timezone: e.target.value }))} className={iCls}>
          {US_TIMEZONES.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.zones.map(z => <option key={z} value={z}>{z.replace(/^(America|Pacific)\//, '').replace(/_/g, ' ')}</option>)}
            </optgroup>
          ))}
        </select>
      </FR>
      <FR label="Date Format">
        <BtnGroup value={local.dateFormat} onChange={v => setLocal(p => ({ ...p, dateFormat: v }))}
          options={[{ label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' as const }, { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' as const }, { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' as const }]} />
      </FR>
      <FR label="Currency">
        <BtnGroup value={local.currencyFormat} onChange={v => setLocal(p => ({ ...p, currencyFormat: v }))}
          options={[{ label: 'USD ($)', value: 'USD' as const }, { label: 'CAD (C$)', value: 'CAD' as const }]} />
      </FR>
      <SaveRow onSave={() => { update('locale', local); showToast('Locale saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── AUTO-REFRESH form ────────────────────────────────────────────────────────

const REFRESH_OPTIONS = [
  { label: '1 min', value: 60 }, { label: '2 min', value: 120 },
  { label: '5 min', value: 300 }, { label: '10 min', value: 600 },
  { label: '15 min', value: 900 }, { label: '30 min', value: 1800 },
  { label: '60 min', value: 3600 },
];

function AutoRefreshForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);
  const mins = local.autoRefreshInterval / 60;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Automatically refresh dashboard data at a regular interval</p>
      <Section title="Refresh Interval">
        <BtnGroup value={local.autoRefreshInterval} onChange={v => setLocal(p => ({ ...p, autoRefreshEnabled: true, autoRefreshInterval: v }))} options={REFRESH_OPTIONS} />
        <p className="text-xs text-muted-foreground mt-1.5">Dashboard metrics and charts will automatically refresh every {mins < 1 ? '30 seconds' : `${mins} minute${mins !== 1 ? 's' : ''}`}.</p>
      </Section>
      <Toggle checked={local.autoRefreshEnabled} onChange={v => setLocal(p => ({ ...p, autoRefreshEnabled: v }))} label={local.autoRefreshEnabled ? 'Auto-refresh enabled' : 'Auto-refresh disabled'} />
      <SaveRow onSave={() => { update('reporting', local); showToast('Auto-refresh saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── REPORT RETENTION form ────────────────────────────────────────────────────

const RETENTION_OPTIONS = [
  { label: '30 days', value: 30 }, { label: '60 days', value: 60 },
  { label: '90 days', value: 90 }, { label: '180 days', value: 180 },
  { label: '1 year', value: 365 },
];

function ReportRetentionForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);
  const sel = RETENTION_OPTIONS.find(o => o.value === local.retentionDays) ?? RETENTION_OPTIONS[2];

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">How long to keep send-history rows for each custom report. Older rows are pruned automatically by the daily cleanup pass.</p>
      <Section title="Retention Period">
        <BtnGroup value={local.retentionDays} onChange={v => setLocal(p => ({ ...p, retentionDays: v }))} options={RETENTION_OPTIONS} />
        <p className="text-xs text-muted-foreground mt-1.5">Run-history rows older than {sel.label} are removed during the next cleanup pass.</p>
      </Section>
      <SaveRow onSave={() => { update('reporting', local); showToast('Retention saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── EMAIL REPORTS form ───────────────────────────────────────────────────────

function EmailReportsForm({ settings, update, showToast, onClose }: FormProps) {
  const [rep, setRep] = useState(settings.reporting);
  const [smtp, setSmtp] = useState(settings.smtp);
  const [showPw, setShowPw] = useState(false);
  useEffect(() => { setRep(settings.reporting); setSmtp(settings.smtp); }, [settings.reporting, settings.smtp]);

  const REPORT_TYPES = ['production', 'pipeline', 'commission', 'goals', 'recruiting'];
  function toggleType(t: string) {
    setRep(p => ({ ...p, emailReportTypes: p.emailReportTypes.includes(t) ? p.emailReportTypes.filter(x => x !== t) : [...p.emailReportTypes, t] }));
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Send periodic production reports to agents automatically. Reports include KPIs, goal progress, and peer ranking.</p>
      <div className="space-y-1.5">
        <Toggle checked={rep.emailReportsEnabled} onChange={v => setRep(p => ({ ...p, emailReportsEnabled: v }))} label="Enable Automated Reports" />
        <p className="text-[11px] text-muted-foreground pl-12">Automatically send reports on schedule</p>
      </div>
      {rep.emailReportsEnabled && (
        <>
          <Section title="Schedule">
            <BtnGroup value={rep.emailFrequency} onChange={v => setRep(p => ({ ...p, emailFrequency: v }))}
              options={[{ label: 'Monthly', value: 'monthly' as const }, { label: 'Quarterly', value: 'quarterly' as const }, { label: 'Both', value: 'monthly' as const }]} />
            <p className="text-xs text-muted-foreground mt-1.5">Monthly reports sent on the 1st. Quarterly on Jan 1, Apr 1, Jul 1, Oct 1.</p>
          </Section>
          <Section title="Report Types">
            <div className="space-y-1.5">
              {REPORT_TYPES.map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rep.emailReportTypes.includes(t)} onChange={() => toggleType(t)} className="accent-emerald-500" />
                  <span className="text-sm text-foreground capitalize">{t}</span>
                </label>
              ))}
            </div>
          </Section>
          <Section title="SMTP Configuration">
            <div className="grid grid-cols-2 gap-3">
              <FR label="SMTP Host"><input value={smtp.host} onChange={e => setSmtp(p => ({ ...p, host: e.target.value }))} className={iCls} placeholder="smtp.gmail.com" /></FR>
              <FR label="SMTP Port"><input type="number" value={smtp.port} onChange={e => setSmtp(p => ({ ...p, port: Number(e.target.value) }))} className={iCls} /></FR>
              <FR label="SMTP Username"><input value={smtp.username} onChange={e => setSmtp(p => ({ ...p, username: e.target.value }))} className={iCls} /></FR>
              <FR label="SMTP Password">
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={smtp.password} onChange={e => setSmtp(p => ({ ...p, password: e.target.value }))} className={`${iCls} pr-9`} />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </FR>
              <FR label="Sender Email"><input value={smtp.senderEmail} onChange={e => setSmtp(p => ({ ...p, senderEmail: e.target.value }))} className={iCls} placeholder="reports@yourbrokerage.com" /></FR>
              <FR label="Sender Name"><input value={smtp.senderName} onChange={e => setSmtp(p => ({ ...p, senderName: e.target.value }))} className={iCls} placeholder="Acme Realty" /></FR>
            </div>
            <div className="space-y-2 mt-2">
              <Toggle checked={smtp.useSsl} onChange={v => setSmtp(p => ({ ...p, useSsl: v }))} label="Use SSL/TLS (port 465)" />
              <Toggle checked={smtp.attachPdf} onChange={v => setSmtp(p => ({ ...p, attachPdf: v }))} label="Attach PDF report to emails" />
            </div>
            <button className="mt-2 flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">
              <Wifi className="w-3.5 h-3.5" />
              Test Connection
            </button>
          </Section>
        </>
      )}
      <SaveRow onSave={() => { update('reporting', rep); update('smtp', smtp); showToast('Email report settings saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── REPORT RECIPIENTS form ───────────────────────────────────────────────────

function ReportRecipientsForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [scope, setScope] = useState<'all' | 'specific' | 'office'>('all');
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  function addRecipient() {
    const e = newEmail.trim();
    if (!e || local.recipients.includes(e)) return;
    setLocal(p => ({ ...p, recipients: [...p.recipients, `${newName.trim()} <${e}>`] }));
    setNewName(''); setNewEmail(''); setAdding(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Share production summary reports with stakeholders, franchise contacts, or partners</p>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Recipients</p>
        <button onClick={() => setAdding(v => !v)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
          <Plus className="w-3 h-3" /> Add Recipient
        </button>
      </div>
      {adding && (
        <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/30">
          <p className="text-sm font-medium text-foreground">New Recipient</p>
          <FR label="Name"><input value={newName} onChange={e => setNewName(e.target.value)} className={iCls} placeholder="Jane Smith" /></FR>
          <FR label="Email"><input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className={iCls} placeholder="jane@example.com" /></FR>
          <FR label="Report Scope">
            <div className="space-y-1.5 mt-1">
              {([['all', 'All Agents'], ['specific', 'Specific Agents'], ['office', 'By Office']] as const).map(([v, l]) => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="scope" checked={scope === v} onChange={() => setScope(v)} className="accent-emerald-500" />
                  <span className="text-sm text-foreground">{l}</span>
                </label>
              ))}
            </div>
          </FR>
          <div className="flex gap-2">
            <button onClick={() => { setAdding(false); setNewName(''); setNewEmail(''); }} className="flex-1 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
            <button onClick={addRecipient} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">Add</button>
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        {local.recipients.length === 0
          ? <p className="text-muted-foreground text-xs text-center py-4 border border-dashed border-border rounded-lg">No recipients yet.</p>
          : local.recipients.map(r => (
            <div key={r} className="flex items-center justify-between bg-secondary border border-border rounded-lg px-3 py-2">
              <span className="text-sm text-foreground">{r}</span>
              <button onClick={() => setLocal(p => ({ ...p, recipients: p.recipients.filter(x => x !== r) }))} className="text-muted-foreground hover:text-destructive transition-colors">
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
      </div>
      <SaveRow onSave={() => { update('reporting', local); showToast('Recipients saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── DISPLAY MODE form ────────────────────────────────────────────────────────

const DISPLAY_MODES = [
  { id: 'standard',     label: 'Standard',     desc: 'Normal dashboard view for brokers.' },
  { id: 'wallboard',    label: 'Wallboard',    desc: 'Large-display mode with auto-rotating scenes.' },
  { id: 'presentation', label: 'Presentation', desc: 'Clean layout for meetings and screen share.' },
] as const;

function DisplayModeForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.reporting);
  useEffect(() => { setLocal(settings.reporting); }, [settings.reporting]);

  return (
    <div className="space-y-4">
      <Section title="Display Mode">
        <div className="space-y-2">
          {DISPLAY_MODES.map(m => (
            <label key={m.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${local.displayMode === m.id ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-secondary hover:border-border/60'}`}>
              <input type="radio" name="dmode" value={m.id} checked={local.displayMode === m.id} onChange={() => setLocal(p => ({ ...p, displayMode: m.id }))} className="accent-emerald-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Section>
      {local.displayMode === 'wallboard' && (
        <Section title="Rotation Interval">
          <BtnGroup value={local.wallboardRotateSeconds} onChange={v => setLocal(p => ({ ...p, wallboardRotateSeconds: v }))}
            options={[{ label: '10s', value: 10 }, { label: '15s', value: 15 }, { label: '30s', value: 30 }, { label: '60s', value: 60 }]} />
        </Section>
      )}
      <SaveRow onSave={() => { update('reporting', local); showToast('Display mode saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── ACCOUNT CONNECTIONS form ─────────────────────────────────────────────────

function AccountConnectionsForm({ onClose }: FormProps) {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Who you're signed in as, and how to sign out.</p>
      <div className="flex items-center gap-3 p-3 bg-secondary border border-border rounded-xl">
        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
          DA
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Demo Admin</p>
          <p className="text-xs text-muted-foreground">demo@dotloopreport.com</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate('/upload')}
          className="py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
        <button onClick={() => navigate('/upload')}
          className="py-2.5 bg-secondary border border-destructive/40 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center gap-1.5">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out All Devices
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">"Sign Out" only signs you out of this browser. Use "Sign Out of All Devices" if you have signed in on a shared computer or want to ensure no other sessions are active.</p>
      <button onClick={onClose} className="w-full py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Close</button>
    </div>
  );
}

// ─── DOTLOOP CONNECTIONS form ─────────────────────────────────────────────────

function DotloopConnectionsForm({ onClose }: FormProps) {
  const [status, setStatus] = useState<{
    connected: boolean;
    profileName?: string;
    loopsSynced?: number;
    lastSynced?: string;
    syncStatus?: string;
    error?: string;
  } | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing,       setSyncing]       = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
        const res = await fetch('/api/dotloop/status', { credentials: 'include', headers });
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json() as {
          connected: boolean;
          profileName?: string;
          loopsSynced?: number;
          lastSynced?: string;
          syncStatus?: string;
          error?: string;
        };
        if (!cancelled) { setStatus(data); setLoading(false); }
      } catch { if (!cancelled) setLoading(false); }
    }
    void fetchStatus();
    const interval = setInterval(() => { if (!cancelled) void fetchStatus(); }, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  async function handleConnect() {
    // Get the Supabase access token so the backend can identify this user
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      window.location.href = `/api/dotloop/connect?token=${encodeURIComponent(token)}`;
    } else {
      // Not signed in — redirect to login first
      window.location.href = '/login?error=auth_required';
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/dotloop/disconnect', {
        method: 'POST',
        credentials: 'include',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      setStatus({ connected: false });
    } catch { /* ignore */ }
    setDisconnecting(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/dotloop/sync', {
        method: 'POST',
        credentials: 'include',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
    } catch { /* ignore */ }
    setTimeout(() => setSyncing(false), 3000);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">Checking Dotloop connection…</p>
        <div className="h-10 bg-secondary rounded-lg animate-pulse" />
        <button onClick={onClose} className="w-full py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Close</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Connect your Dotloop account for live transaction sync</p>

      {status?.connected ? (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-none" />
              <span className="text-xs text-emerald-400 font-semibold">Connected</span>
            </div>
            {status.syncStatus === 'running' && (
              <span className="text-[10px] text-blue-400 animate-pulse">Syncing…</span>
            )}
          </div>
          {status.profileName && (
            <p className="text-xs text-foreground font-medium pl-4">{status.profileName}</p>
          )}
          {status.loopsSynced != null && (
            <p className="text-[11px] text-muted-foreground pl-4">{status.loopsSynced} loops synced</p>
          )}
          {status.lastSynced && (
            <p className="text-[11px] text-muted-foreground pl-4">
              Last synced: {new Date(status.lastSynced).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })}
            </p>
          )}
        </div>
      ) : status?.error ? (
        <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-red-400 flex-none" />
          <span className="text-xs text-red-400 font-medium">Connection error — please reconnect</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-yellow-400 flex-none" />
          <span className="text-xs text-yellow-400 font-medium">Not connected</span>
        </div>
      )}

      {status?.connected ? (
        <div className="flex gap-2">
          <button
            onClick={() => { void handleSync(); }}
            disabled={syncing || status.syncStatus === 'running'}
            className="flex-1 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {syncing || status.syncStatus === 'running' ? 'Syncing…' : 'Sync Now'}
          </button>
          <button
            onClick={() => { void handleDisconnect(); }}
            disabled={disconnecting}
            className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => { void handleConnect(); }}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Connect Dotloop Account
        </button>
      )}

      {!status?.connected && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Connecting will enable:</p>
          {['Live transaction sync', 'Real-time data updates', 'Multi-office support', 'Auto-push to Dotloop'].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="w-3 h-3 text-emerald-400 flex-none" /> {f}
            </div>
          ))}
        </div>
      )}

      <button onClick={onClose} className="w-full py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Close</button>
    </div>
  );
}

// ─── DOTLOOP AUTO-PUSH form ───────────────────────────────────────────────────

function AutoPushForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.integrations);
  useEffect(() => { setLocal(settings.integrations); }, [settings.integrations]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">When enabled, transactions added by CSV import or Dotloop sync are automatically pushed back into Dotloop as new loops using the default profile selected below.</p>
      <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <p className="text-xs text-yellow-400">Connect a Dotloop account above to choose a default profile.</p>
      </div>
      <div className="space-y-1.5">
        <Toggle checked={local.autoPushEnabled} onChange={v => setLocal(p => ({ ...p, autoPushEnabled: v }))} label="Enable auto-push" />
        <p className="text-[11px] text-muted-foreground pl-12">Off by default. Turn on to push every new imported transaction.</p>
      </div>
      <FR label="Default profile">
        <select value={local.autoPushProfile} onChange={e => setLocal(p => ({ ...p, autoPushProfile: e.target.value }))} disabled className={`${iCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
          <option value="">Select a profile...</option>
        </select>
      </FR>
      <SaveRow onSave={() => { update('integrations', local); showToast('Auto-push settings saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── FOLLOW UP BOSS form ──────────────────────────────────────────────────────

function FubForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.integrations);
  const [showKey, setShowKey] = useState(false);
  useEffect(() => { setLocal(settings.integrations); }, [settings.integrations]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Connect your Follow Up Boss account to sync Dotloop loop status, close events, and participants into FUB people and notes. Paste your Owner API key from FUB → Admin → API.</p>
      <FR label="FUB Owner API key">
        <div className="relative">
          <input type={showKey ? 'text' : 'password'} value={local.fubApiKey} onChange={e => setLocal(p => ({ ...p, fubApiKey: e.target.value }))} className={`${iCls} pr-9`} placeholder="fka_live_..." />
          <button type="button" onClick={() => setShowKey(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </FR>
      {local.fubConnected ? (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-emerald-400 font-medium">Connected</span>
          <button onClick={() => setLocal(p => ({ ...p, fubConnected: false, fubApiKey: '' }))} className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors">Disconnect</button>
        </div>
      ) : (
        <button onClick={() => { if (local.fubApiKey) { setLocal(p => ({ ...p, fubConnected: true })); showToast('FUB connected (demo)'); } }}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          disabled={!local.fubApiKey}>
          Connect
        </button>
      )}
      <SaveRow onSave={() => { update('integrations', local); showToast('FUB settings saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── QUICKBOOKS SETTINGS form ─────────────────────────────────────────────────

const QB_ACCOUNTS = [
  'Commission Income', 'Agent Commission Splits', 'Referral Fees Paid',
  'Operating Checking', 'Broker Splits', 'Franchise / Royalty Fees',
  'Trust Account', 'Escrow Payable', 'Sales Income', 'Other Income',
];

function QuickBooksForm({ settings, update, showToast, agentMetrics, onClose }: FormProps) {
  const [qb, setQb] = useState(settings.qb);
  useEffect(() => { setQb(settings.qb); }, [settings.qb]);

  const agents = (agentMetrics ?? []).map(a => a.agentName);

  // Ensure agentMappings has a row per agent
  const agentMappings: QbAgentMapping[] = agents.map(name => {
    const existing = qb.agentMappings.find(m => m.agentName === name);
    return existing ?? { agentName: name, vendorName: '', customerName: '', expenseAcct: '' };
  });

  function setMapping(name: string, key: keyof QbAgentMapping, val: string) {
    setQb(p => {
      const updated = p.agentMappings.filter(m => m.agentName !== name);
      const existing = p.agentMappings.find(m => m.agentName === name) ?? { agentName: name, vendorName: '', customerName: '', expenseAcct: '' };
      return { ...p, agentMappings: [...updated, { ...existing, [key]: val }] };
    });
  }

  function setAcct(key: keyof typeof qb.accountMapping, val: string) {
    setQb(p => ({ ...p, accountMapping: { ...p.accountMapping, [key]: val } }));
  }

  // Billing items
  const [newCategory, setNewCategory] = useState('');
  const [newIncome, setNewIncome] = useState('');
  const [newAmount, setNewAmount] = useState(0);
  const [newPerTx, setNewPerTx] = useState(true);

  function addBillingItem() {
    if (!newCategory) return;
    const item: QbBillingItem = { id: Date.now().toString(), category: newCategory, incomeAccount: newIncome, defaultAmount: newAmount, perTx: newPerTx };
    setQb(p => ({ ...p, billingItems: [...p.billingItems, item] }));
    setNewCategory(''); setNewIncome(''); setNewAmount(0); setNewPerTx(true);
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-semibold text-foreground">QuickBooks Online</p>
            {qb.connected && <p className="text-xs text-muted-foreground">Demo Brokerage Books (Sandbox) · Realm DEMO-REALM</p>}
          </div>
        </div>
        {qb.connected
          ? <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">Connected</span>
          : <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">Not Connected</span>
        }
      </div>

      {qb.connected ? (
        <div className="flex items-center justify-between p-3 bg-secondary border border-border rounded-xl">
          <div>
            <p className="text-sm font-medium text-foreground">Demo Brokerage Books (Sandbox)</p>
            <p className="text-xs text-muted-foreground">Realm DEMO-REALM · Sandbox</p>
          </div>
          <button onClick={() => setQb(p => ({ ...p, connected: false }))}
            className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-secondary/80 transition-colors">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => { setQb(p => ({ ...p, connected: true })); showToast('Connected to QuickBooks (demo)'); }}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Connect to QuickBooks Online
          </button>
          <p className="text-xs text-muted-foreground text-center">Enables auto-posting closed deals as Journal Entries</p>
        </div>
      )}

      {/* Auto-post toggle */}
      <div className="space-y-1.5">
        <Toggle checked={qb.autoPostOnClose} onChange={v => setQb(p => ({ ...p, autoPostOnClose: v }))} label="Auto-post on close" />
        <p className="text-[11px] text-muted-foreground pl-12 leading-snug">When enabled, transactions whose status changes to Closed/Sold are posted to QuickBooks automatically. Each auto-post is recorded in the audit log; failures are surfaced on the QuickBooks Sync page.</p>
      </div>

      {/* Account Mapping */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Account Mapping</p>
          <p className="text-xs text-muted-foreground mt-0.5">Choose which QuickBooks accounts should be debited and credited when a closed deal is posted. Closed transactions are posted as a balanced Journal Entry.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            ['commissionIncome',    'Commission Income (CR)'],
            ['bankDeposit',         'Bank / Deposit (DR)'],
            ['agentSplitExpense',   'Agent Split Expense (DR)'],
            ['brokerSplitExpense',  'Broker Split Expense (DR)'],
            ['referralFeeExpense',  'Referral Fee Expense (DR)'],
            ['franchiseFeeExpense', 'Franchise Fee Expense (DR)'],
          ] as const).map(([key, label]) => (
            <FR key={key} label={label}>
              <select value={qb.accountMapping[key]} onChange={e => setAcct(key, e.target.value)} className={iCls}>
                {QB_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </FR>
          ))}
        </div>
        <div className="flex justify-end">
          <button onClick={() => { update('qb', qb); showToast('Account mapping saved'); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Save Mapping
          </button>
        </div>
      </div>

      {/* Agent → Vendor / Customer table */}
      {agents.length > 0 && (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Agent → QuickBooks Vendor / Customer</p>
            <p className="text-xs text-muted-foreground mt-0.5">Map each Dotloop agent to a QuickBooks Vendor (for commission splits) or Customer (for referrals). Optionally override the agent's expense account.</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Agent</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">QB Vendor</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">QB Customer</th>
                  <th className="text-left px-3 py-2 text-muted-foreground font-medium">Expense Acct (override)</th>
                </tr>
              </thead>
              <tbody>
                {agentMappings.map(m => (
                  <tr key={m.agentName} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-1.5 text-foreground font-medium whitespace-nowrap">{m.agentName}</td>
                    <td className="px-3 py-1.5">
                      <input value={m.vendorName} onChange={e => setMapping(m.agentName, 'vendorName', e.target.value)}
                        className="w-full bg-transparent border border-transparent hover:border-border focus:border-blue-500/50 rounded px-1.5 py-1 outline-none text-foreground transition-colors" placeholder="— none —" />
                    </td>
                    <td className="px-3 py-1.5">
                      <input value={m.customerName} onChange={e => setMapping(m.agentName, 'customerName', e.target.value)}
                        className="w-full bg-transparent border border-transparent hover:border-border focus:border-blue-500/50 rounded px-1.5 py-1 outline-none text-foreground transition-colors" placeholder="— none —" />
                    </td>
                    <td className="px-3 py-1.5">
                      <select value={m.expenseAcct} onChange={e => setMapping(m.agentName, 'expenseAcct', e.target.value)}
                        className="w-full bg-transparent border border-transparent hover:border-border rounded px-1.5 py-1 outline-none text-foreground text-xs cursor-pointer">
                        <option value="">(use default)</option>
                        {QB_ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <button onClick={() => { update('qb', { ...qb, agentMappings }); showToast('Agent mappings saved'); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Save Agent Mappings
            </button>
          </div>
        </div>
      )}

      {/* Billing Items */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Agent Billing Items (Charge Categories)</p>
          <p className="text-xs text-muted-foreground mt-0.5">Per-transaction charges (desk fee, E&O, tech fee, etc.) posted as additional debit lines against the company deposit.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Category</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Income Account</th>
                <th className="text-left px-3 py-2 text-muted-foreground font-medium">Default $</th>
                <th className="text-center px-3 py-2 text-muted-foreground font-medium">Per Tx</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {qb.billingItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground text-xs">No billing items yet.</td>
                </tr>
              )}
              {qb.billingItems.map(item => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 text-foreground">{item.category}</td>
                  <td className="px-3 py-1.5 text-foreground">{item.incomeAccount || '—'}</td>
                  <td className="px-3 py-1.5 text-foreground">${item.defaultAmount}</td>
                  <td className="px-3 py-1.5 text-center">{item.perTx ? <Check className="w-3 h-3 text-emerald-400 mx-auto" /> : '—'}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button onClick={() => setQb(p => ({ ...p, billingItems: p.billingItems.filter(b => b.id !== item.id) }))} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Add row */}
              <tr className="border-t border-border bg-secondary/20">
                <td className="px-3 py-1.5">
                  <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Desk Fee" className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50" />
                </td>
                <td className="px-3 py-1.5">
                  <input value={newIncome} onChange={e => setNewIncome(e.target.value)} placeholder="Desk Fee Income" className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50" />
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" value={newAmount} onChange={e => setNewAmount(Number(e.target.value))} className="w-full bg-transparent outline-none text-foreground" />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input type="checkbox" checked={newPerTx} onChange={e => setNewPerTx(e.target.checked)} className="accent-emerald-500" />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <button onClick={addBillingItem} className="text-xs px-2 py-1 bg-secondary border border-border rounded text-foreground hover:bg-secondary/80 transition-colors">+ Add</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end">
          <button onClick={() => { update('qb', qb); showToast('Billing items saved'); }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            Save Billing Items
          </button>
        </div>
      </div>

      <SaveRow onSave={() => { update('qb', qb); showToast('QuickBooks settings saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── QUICKBOOKS ALERTS form ───────────────────────────────────────────────────

function QuickBooksAlertsForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.qbAlerts);
  useEffect(() => { setLocal(settings.qbAlerts); }, [settings.qbAlerts]);
  const smtpMissing = local.emailEnabled && !settings.smtp.host;

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Choose how admins are notified when QuickBooks auto-post fails. Email, Slack, both, or off — recipients are configurable per tenant.</p>

      {/* SMTP warning */}
      {smtpMissing && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl space-y-1">
          <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-none" />
            Email selected but no SMTP server is configured for this brokerage
          </p>
          <p className="text-[11px] text-muted-foreground leading-snug">Email is your only enabled alert channel, so QuickBooks auto-post failures will not be delivered until SMTP is set up under Email Reports. Configure your brokerage's SMTP server, or enable Slack as a backup channel below.</p>
        </div>
      )}

      {/* Email section */}
      <div className="space-y-3 p-4 bg-secondary/30 border border-border rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Email</p>
          </div>
          <Toggle checked={local.emailEnabled} onChange={v => setLocal(p => ({ ...p, emailEnabled: v }))} />
        </div>
        <p className="text-xs text-muted-foreground">Send the failure summary to the recipients below.</p>
        {local.emailEnabled && (
          <FR label="Email recipients (comma-separated)">
            <input value={local.emailRecipients} onChange={e => setLocal(p => ({ ...p, emailRecipients: e.target.value }))}
              className={iCls} placeholder="ops@brokerage.com, manager@brokerage.com" />
            <p className="text-[11px] text-muted-foreground mt-1">Leave blank to fall back to the admin user who has the "QuickBooks auto-post failed" preference enabled.</p>
          </FR>
        )}
      </div>

      {/* Slack section */}
      <div className="space-y-3 p-4 bg-secondary/30 border border-border rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Slack</p>
          </div>
          <Toggle checked={local.slackEnabled} onChange={v => setLocal(p => ({ ...p, slackEnabled: v }))} />
        </div>
        <p className="text-xs text-muted-foreground">Post failures to a Slack channel via incoming webhook.</p>
        {local.slackEnabled && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FR label="Slack incoming webhook URL">
                <input value={local.slackWebhookUrl} onChange={e => setLocal(p => ({ ...p, slackWebhookUrl: e.target.value }))}
                  className={iCls} placeholder="Paste your Slack incoming webhook URL" />
              </FR>
              <FR label="Channel (optional)">
                <input value={local.slackChannel} onChange={e => setLocal(p => ({ ...p, slackChannel: e.target.value }))}
                  className={iCls} placeholder="#qb-alerts" />
              </FR>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">
              <Wifi className="w-3.5 h-3.5" /> Send test alert
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={() => { update('qbAlerts', local); showToast('QB alert preferences saved'); onClose(); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          Save preferences
        </button>
      </div>
    </div>
  );
}

// ─── WEBHOOKS form ────────────────────────────────────────────────────────────

const WEBHOOK_EVENTS_COLS = [
  ['Deal Closed', 'Agent Cap Reached', 'Task Overdue'],
  ['Goal Reached', 'Report Sent', 'QuickBooks Synced'],
  ['Contest Ended', 'Tasks Applied', 'QuickBooks Sync Failed'],
];
const WEBHOOK_EVENTS_FLAT = WEBHOOK_EVENTS_COLS.flat();

function WebhooksForm({ settings, update, showToast, onClose }: FormProps) {
  const [webhooks, setWebhooks] = useState<WebhookType[]>(settings.webhooks);
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEvents, setNewEvents] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(true);
  useEffect(() => { setWebhooks(settings.webhooks); }, [settings.webhooks]);

  function toggleEvent(ev: string) {
    setNewEvents(p => p.includes(ev) ? p.filter(x => x !== ev) : [...p, ev]);
  }

  function addWebhook() {
    if (!newUrl) return;
    setWebhooks(p => [...p, { id: Date.now().toString(), url: newUrl, description: newDesc, events: newEvents, secret: '' }]);
    setNewUrl(''); setNewDesc(''); setNewEvents([]); setFormOpen(false);
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">Push event notifications to Slack, Teams, or custom endpoints when key milestones occur.</p>

      {/* Add form */}
      {formOpen ? (
        <div className="space-y-4 p-4 border border-border rounded-xl bg-secondary/20">
          <FR label="Endpoint URL">
            <input value={newUrl} onChange={e => setNewUrl(e.target.value)} className={iCls} placeholder="https://hooks.slack.com/services/..." />
          </FR>
          <FR label="Description (optional)">
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)} className={iCls} placeholder="Slack #deals channel" />
          </FR>
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Event Subscriptions</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
              {WEBHOOK_EVENTS_COLS.map((col, ci) => (
                <div key={ci} className="space-y-1.5">
                  {col.map(ev => (
                    <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" checked={newEvents.includes(ev)} onChange={() => toggleEvent(ev)} className="accent-emerald-500" />
                      <span className="text-xs text-foreground">{ev}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFormOpen(false)} className="flex-1 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
            <button onClick={addWebhook} disabled={!newUrl} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40">Add</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Webhook
        </button>
      )}

      {/* Webhook list */}
      <div className="space-y-2">
        {webhooks.length === 0
          ? <p className="text-muted-foreground text-xs text-center py-4 border border-dashed border-border rounded-lg">No webhooks configured.</p>
          : webhooks.map(w => (
            <div key={w.id} className="flex items-start gap-2 bg-secondary border border-border rounded-xl p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium truncate">{w.description || w.url}</p>
                {w.description && <p className="text-[11px] text-muted-foreground truncate">{w.url}</p>}
                <p className="text-[11px] text-muted-foreground mt-0.5">{w.events.join(', ') || 'No events'}</p>
              </div>
              <button onClick={() => setWebhooks(p => p.filter(x => x.id !== w.id))} className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 flex-none">
                <Trash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
      </div>

      <SaveRow onSave={() => { update('webhooks', webhooks); showToast('Webhooks saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── ALERTS form ──────────────────────────────────────────────────────────────

const ALERT_TEMPLATES = [
  { id: 'volume-drop',    name: 'Monthly Volume Drop',       desc: 'Alert when 30-day volume drops below a threshold', metric: 'monthly_volume',   operator: 'below' as const, threshold: 500000 },
  { id: 'agent-gci',      name: 'Agent GCI Milestone',       desc: 'Alert when an agent\'s GCI exceeds a target',      metric: 'agent_gci',        operator: 'above' as const, threshold: 100000 },
  { id: 'low-close-rate', name: 'Low Close Rate',            desc: 'Alert when close rate drops below target percentage', metric: 'close_rate',    operator: 'below' as const, threshold: 50 },
  { id: 'office-volume',  name: 'Office Volume Milestone',   desc: 'Alert when brokerage hits a volume milestone',     metric: 'total_volume',     operator: 'above' as const, threshold: 5000000 },
  { id: 'low-units',      name: 'Monthly Units Below Target',desc: 'Alert when monthly transaction count is low',      metric: 'monthly_units',    operator: 'below' as const, threshold: 10 },
];

const METRIC_OPTIONS = [
  { value: 'closed_deals',   label: 'Closed Deals' },
  { value: 'monthly_volume', label: 'Monthly Volume ($)' },
  { value: 'close_rate',     label: 'Close Rate (%)' },
  { value: 'agent_gci',      label: 'Agent GCI ($)' },
  { value: 'total_volume',   label: 'Total Volume ($)' },
  { value: 'monthly_units',  label: 'Monthly Units' },
];

function AlertsForm({ settings, update, showToast, onClose }: FormProps) {
  const [rules, setRules] = useState<AlertRule[]>(settings.alertRules);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newMetric, setNewMetric] = useState('closed_deals');
  const [newOp, setNewOp] = useState<'below' | 'above' | 'equals'>('below');
  const [newThreshold, setNewThreshold] = useState(5);
  const [newScope, setNewScope] = useState<'brokerage' | 'agent' | 'team'>('brokerage');
  const [newName, setNewName] = useState('');
  useEffect(() => { setRules(settings.alertRules); }, [settings.alertRules]);

  function toggleRule(id: string) {
    setRules(p => p.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  function deleteRule(id: string) {
    setRules(p => p.filter(r => r.id !== id));
  }

  function activateTemplate(t: typeof ALERT_TEMPLATES[0]) {
    const exists = rules.find(r => r.id === t.id);
    if (exists) return;
    const label = METRIC_OPTIONS.find(m => m.value === t.metric)?.label ?? t.metric;
    const newRule: AlertRule = {
      id: t.id,
      name: t.name,
      description: `${label} is ${t.operator} ${t.threshold} · Brokerage-wide`,
      enabled: true,
      metric: t.metric,
      operator: t.operator,
      threshold: t.threshold,
      scope: 'brokerage',
    };
    setRules(p => [...p, newRule]);
    showToast(`"${t.name}" activated`);
  }

  function saveNewRule() {
    if (!newName) return;
    const label = METRIC_OPTIONS.find(m => m.value === newMetric)?.label ?? newMetric;
    const rule: AlertRule = {
      id: `custom-${Date.now()}`,
      name: newName,
      description: `${label} is ${newOp} ${newThreshold} · ${newScope === 'brokerage' ? 'Brokerage-wide' : newScope}`,
      enabled: true,
      metric: newMetric,
      operator: newOp,
      threshold: newThreshold,
      scope: newScope,
    };
    setRules(p => [...p, rule]);
    setShowNewForm(false);
    setNewName(''); setNewMetric('closed_deals'); setNewOp('below'); setNewThreshold(5); setNewScope('brokerage');
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-sm font-semibold text-foreground">Data Alerts &amp; Thresholds</p>
            <p className="text-xs text-muted-foreground">Get notified when key metrics cross your defined thresholds</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
              <Clock className="w-3 h-3" /> History
            </button>
            <button className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border border-border rounded-lg text-xs text-foreground hover:bg-secondary/80 transition-colors">
              <Zap className="w-3 h-3" /> Evaluate Now
            </button>
            <button onClick={() => setShowNewForm(v => !v)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
              <Plus className="w-3 h-3" /> New Rule
            </button>
          </div>
        </div>
      </div>

      {/* Existing rules */}
      <div className="space-y-1.5">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 p-3 bg-secondary border border-border rounded-xl">
            <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{rule.name}</p>
              <p className="text-xs text-muted-foreground">{rule.description}</p>
            </div>
            <button onClick={() => setEditingRule(rule.id === editingRule ? null : rule.id)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => deleteRule(rule.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rules.length === 0 && (
          <p className="text-muted-foreground text-xs text-center py-4 border border-dashed border-border rounded-lg">No rules yet. Add one below or activate a template.</p>
        )}
      </div>

      {/* New rule form */}
      {showNewForm && (
        <div className="space-y-3 p-4 border border-border rounded-xl bg-secondary/20">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Rule</p>
          <FR label="Rule Name"><input value={newName} onChange={e => setNewName(e.target.value)} className={iCls} placeholder="e.g. Low Monthly Closings" /></FR>
          <div className="grid grid-cols-3 gap-2">
            <FR label="Metric">
              <select value={newMetric} onChange={e => setNewMetric(e.target.value)} className={iCls}>
                {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </FR>
            <FR label="Operator">
              <select value={newOp} onChange={e => setNewOp(e.target.value as 'below' | 'above' | 'equals')} className={iCls}>
                <option value="below">is below</option>
                <option value="above">is above</option>
                <option value="equals">equals</option>
              </select>
            </FR>
            <FR label="Threshold">
              <input type="number" value={newThreshold} onChange={e => setNewThreshold(Number(e.target.value))} className={iCls} />
            </FR>
          </div>
          <FR label="Scope">
            <select value={newScope} onChange={e => setNewScope(e.target.value as 'brokerage' | 'agent' | 'team')} className={iCls}>
              <option value="brokerage">Brokerage-wide</option>
              <option value="agent">Per agent</option>
              <option value="team">Per team</option>
            </select>
          </FR>
          <div className="flex gap-2">
            <button onClick={() => setShowNewForm(false)} className="flex-1 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
            <button onClick={saveNewRule} disabled={!newName} className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40">Save Rule</button>
          </div>
        </div>
      )}

      {/* Quick templates */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Quick Templates</p>
        <div className="grid grid-cols-2 gap-2">
          {ALERT_TEMPLATES.map(t => {
            const activated = rules.some(r => r.id === t.id);
            return (
              <div key={t.id} className="flex flex-col gap-2 p-3 bg-secondary border border-border rounded-xl">
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 flex-none mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-tight">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button className="flex-1 py-1 text-xs bg-secondary border border-border rounded text-foreground hover:bg-secondary/80 transition-colors">Customize</button>
                  <button
                    onClick={() => activateTemplate(t)}
                    disabled={activated}
                    className="flex-1 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {activated ? 'Active' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SaveRow onSave={() => { update('alertRules', rules); showToast('Alert rules saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── NOTIFICATION PREFS form ──────────────────────────────────────────────────

const NOTIF_ITEMS: { key: keyof NotificationPrefs; label: string }[] = [
  { key: 'goalReached',       label: 'Goal Reached' },
  { key: 'contestEndingSoon', label: 'Contest Ending Soon' },
  { key: 'contestEnded',      label: 'Contest Ended' },
  { key: 'contestLeaderChange', label: 'Contest Leader Change' },
  { key: 'dealClosed',        label: 'Deal Closed' },
  { key: 'reportAvailable',   label: 'Report Available' },
  { key: 'capReached',        label: 'Cap Reached' },
  { key: 'onboardingReminder',label: 'Onboarding Reminder' },
  { key: 'taskAssigned',      label: 'Task Assigned' },
  { key: 'taskDueSoon',       label: 'Task Due Soon' },
  { key: 'taskOverdue',       label: 'Task Overdue' },
];

function NotificationsForm({ settings, update, showToast, onClose }: FormProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(settings.notificationPrefs);
  useEffect(() => { setPrefs(settings.notificationPrefs); }, [settings.notificationPrefs]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Choose which notification types you want to receive</p>
      <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
        {NOTIF_ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between px-4 py-3 bg-background hover:bg-secondary/20 transition-colors">
            <span className="text-sm text-foreground">{item.label}</span>
            <Toggle
              checked={prefs[item.key]}
              onChange={v => setPrefs(p => ({ ...p, [item.key]: v }))}
            />
          </div>
        ))}
      </div>
      <SaveRow onSave={() => { update('notificationPrefs', prefs); showToast('Notification preferences saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── LEAD SOURCES form ────────────────────────────────────────────────────────

function LeadSourcesForm({ settings, update, showToast, onClose }: FormProps) {
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

  function addSource() {
    const n = newName.trim();
    if (!n) return;
    setSources(p => [...p, { id: `custom-${Date.now()}`, name: n, active: true }]);
    setNewName('');
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {sources.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-2 py-1.5">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-none" />
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
              <button onClick={() => move(i, 1)} disabled={i === sources.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
            </div>
            <span className="flex-1 text-sm text-foreground truncate">{s.name}</span>
            <Toggle checked={s.active} onChange={() => setSources(p => p.map(x => x.id === s.id ? { ...x, active: !x.active } : x))} />
            <button onClick={() => setSources(p => p.filter(x => x.id !== s.id))} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSource()} className={`${iCls} flex-1`} placeholder="New lead source name" />
        <button onClick={addSource} className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors"><Plus className="w-4 h-4" /></button>
      </div>
      <SaveRow onSave={() => { update('leadSources', sources); showToast('Lead sources saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── LEAD COSTS form ──────────────────────────────────────────────────────────

function LeadCostsForm({ settings, update, showToast, onClose }: FormProps) {
  const [costs, setCosts] = useState(settings.leadSourceCosts);
  useEffect(() => { setCosts(settings.leadSourceCosts); }, [settings.leadSourceCosts]);
  const active = settings.leadSources.filter(s => s.active);
  const total = costs.reduce((s, c) => s + c.monthlyCost, 0);

  function setCost(id: string, val: number) {
    setCosts(p => p.find(c => c.sourceId === id) ? p.map(c => c.sourceId === id ? { ...c, monthlyCost: val } : c) : [...p, { sourceId: id, monthlyCost: val }]);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Set the monthly cost per lead source for ROI calculations.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {active.map(s => (
          <div key={s.id} className="flex items-center gap-2">
            <span className="text-sm text-foreground w-28 flex-none truncate">{s.name}</span>
            <span className="text-muted-foreground text-sm">$</span>
            <input type="number" min={0} value={costs.find(c => c.sourceId === s.id)?.monthlyCost ?? 0}
              onChange={e => setCost(s.id, Number(e.target.value))} className={`${iCls} flex-1`} />
            <span className="text-xs text-muted-foreground">/mo</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-3 bg-secondary/50 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total monthly</span>
          <span className="text-foreground font-medium">${total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Annual</span>
          <span className="text-foreground font-medium">${(total * 12).toLocaleString()}</span>
        </div>
      </div>
      <SaveRow onSave={() => { update('leadSourceCosts', costs); showToast('Lead costs saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── UPLOAD LIMITS form ───────────────────────────────────────────────────────

function UploadLimitsForm({ settings, update, showToast, onClose }: FormProps) {
  const [local, setLocal] = useState(settings.uploadLimits);
  useEffect(() => { setLocal(settings.uploadLimits); }, [settings.uploadLimits]);

  return (
    <div className="space-y-4">
      <FR label="Max CSV File Size" hint="Files larger than this will be rejected.">
        <BtnGroup value={local.maxFileSizeMB} onChange={v => setLocal(p => ({ ...p, maxFileSizeMB: v }))}
          options={[{ label: '5 MB', value: 5 }, { label: '10 MB', value: 10 }, { label: '25 MB', value: 25 }, { label: '50 MB', value: 50 }, { label: '100 MB', value: 100 }]} />
      </FR>
      <FR label="Max Transactions Per Push">
        <BtnGroup value={local.maxTransactionsPerPush} onChange={v => setLocal(p => ({ ...p, maxTransactionsPerPush: v }))}
          options={[{ label: '1,000', value: 1000 }, { label: '2,500', value: 2500 }, { label: '5,000', value: 5000 }, { label: '10,000', value: 10000 }, { label: 'Unlimited', value: 999999 }]} />
      </FR>
      <SaveRow onSave={() => { update('uploadLimits', local); showToast('Upload limits saved'); onClose(); }} onCancel={onClose} />
    </div>
  );
}

// ─── API LIMITS form ──────────────────────────────────────────────────────────

function ApiLimitsForm({ onClose }: FormProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Current API usage for this tenant. Limits reset monthly.</p>
      {[{ label: 'API Calls (this month)', used: 0, limit: 1000 }, { label: 'Webhook Deliveries', used: 0, limit: 10000 }].map(item => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-foreground">{item.label}</span>
            <span className="text-muted-foreground">{item.used.toLocaleString()} / {item.limit.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-border overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${(item.used / item.limit) * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground text-center">Live API rate limits available in Phase 2</p>
      <button onClick={onClose} className="w-full py-2 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors">Close</button>
    </div>
  );
}

// ─── EXPORT DATA form ─────────────────────────────────────────────────────────

function ExportDataForm({ settings, allRecords, showToast, onClose }: FormProps) {
  function handleExport() {
    const data = { exportDate: new Date().toISOString(), version: '2.0', settings, transactions: allRecords ?? [] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dotloop-reporter-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Export downloaded');
  }
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Downloads all settings and transaction data as JSON. Includes {(allRecords ?? []).length.toLocaleString()} records.</p>
      <button onClick={handleExport} className="w-full py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
        <Download className="w-4 h-4" /> Download JSON Export
      </button>
      <button onClick={onClose} className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Close</button>
    </div>
  );
}

// ─── Form router ──────────────────────────────────────────────────────────────

function renderFormBody(cardId: string, props: FormProps): ReactNode {
  switch (cardId) {
    case 'brokerage':           return <BrokerageForm {...props} />;
    case 'branding':            return <BrandingForm {...props} />;
    case 'cda-logo':            return <CdaLogoForm {...props} />;
    case 'default-commission':  return <CommissionForm {...props} />;
    case 'default-timezone':    return <LocaleForm {...props} />;
    case 'auto-refresh':        return <AutoRefreshForm {...props} />;
    case 'report-retention':    return <ReportRetentionForm {...props} />;
    case 'email-reports':       return <EmailReportsForm {...props} />;
    case 'report-recipients':   return <ReportRecipientsForm {...props} />;
    case 'display-mode':        return <DisplayModeForm {...props} />;
    case 'account-connections': return <AccountConnectionsForm {...props} />;
    case 'dotloop-connections': return <DotloopConnectionsForm {...props} />;
    case 'dotloop-autopush':    return <AutoPushForm {...props} />;
    case 'fub':                 return <FubForm {...props} />;
    case 'quickbooks':          return <QuickBooksForm {...props} />;
    case 'quickbooks-alerts':   return <QuickBooksAlertsForm {...props} />;
    case 'webhooks':            return <WebhooksForm {...props} />;
    case 'alerts':              return <AlertsForm {...props} />;
    case 'notification-prefs':  return <NotificationsForm {...props} />;
    case 'lead-sources':        return <LeadSourcesForm {...props} />;
    case 'lead-costs':          return <LeadCostsForm {...props} />;
    case 'upload-limits':       return <UploadLimitsForm {...props} />;
    case 'api-limits':          return <ApiLimitsForm {...props} />;
    case 'export-data':         return <ExportDataForm {...props} />;
    default: {
      const card = CARDS.find(c => c.id === cardId);
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-3">
            <span className="text-muted-foreground [&>svg]:w-5 [&>svg]:h-5">{card?.icon}</span>
          </div>
          <p className="text-foreground text-sm font-medium mb-1">Coming Soon</p>
          <p className="text-muted-foreground text-xs max-w-[220px]">{card?.description}</p>
        </div>
      );
    }
  }
}

// ─── Section block with inline expansion ─────────────────────────────────────

function SectionBlock({
  section, cards, expandedCard, setExpandedCard, formProps,
}: {
  section: SectionDef;
  cards: SettingCard[];
  expandedCard: string | null;
  setExpandedCard: (id: string | null) => void;
  formProps: FormProps;
}) {
  if (cards.length === 0) return null;
  const isDanger = section.id === 'danger';
  const expandedCardDef = cards.find(c => c.id === expandedCard);

  return (
    <div className={isDanger ? 'border border-destructive/30 rounded-xl p-5' : ''}>
      <div className="mb-3">
        <h2 className={`text-xs font-semibold tracking-widest mb-0.5 ${isDanger ? 'text-destructive' : 'text-muted-foreground'}`}>
          {section.label}
        </h2>
        {section.description && <p className="text-muted-foreground text-xs">{section.description}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {cards.map(card => {
          const isExpanded = card.id === expandedCard;
          const isDangerCard = card.section === 'danger';
          return (
            <button
              key={card.id}
              onClick={() => setExpandedCard(isExpanded ? null : card.id)}
              className={`w-full text-left flex items-center gap-3 p-3.5 border rounded-xl transition-all group ${
                isExpanded
                  ? isDangerCard
                    ? 'bg-destructive/10 border-destructive/60'
                    : 'bg-secondary/60 border-blue-500/40'
                  : isDangerCard
                    ? 'bg-destructive/5 border-destructive/30 hover:border-destructive/60'
                    : 'bg-background border-border hover:border-border/80 hover:bg-secondary/30'
              }`}
            >
              <div className={`flex-none w-9 h-9 rounded-lg flex items-center justify-center ${isDangerCard ? 'bg-destructive/10' : 'bg-secondary'}`}>
                <span className={`[&>svg]:w-4 [&>svg]:h-4 ${isDangerCard ? 'text-destructive' : 'text-muted-foreground'}`}>{card.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium leading-tight truncate">{card.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1">{card.description}</p>
              </div>
              {isExpanded
                ? <ChevronUp className="flex-none w-4 h-4 text-blue-400" />
                : <ChevronRight className="flex-none w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
              }
            </button>
          );
        })}
      </div>

      {/* Inline expansion panel */}
      {expandedCardDef && (
        <div className="mt-3 border border-border rounded-xl bg-background overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
            <div>
              <p className="text-sm font-semibold text-foreground">{expandedCardDef.title}</p>
              <p className="text-xs text-muted-foreground">{expandedCardDef.description}</p>
            </div>
            <button
              onClick={() => setExpandedCard(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Close
            </button>
          </div>
          {/* Panel body */}
          <div className="px-5 py-5">
            {renderFormBody(expandedCard!, { ...formProps, onClose: () => setExpandedCard(null) })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsComplete() {
  const [activeTab, setActiveTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const { clearTransactionData, allRecords, agentMetrics } = useTransactionData();
  const [, navigate] = useLocation();
  const { settings, update, resetAll } = useSettings();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 3000);
  }

  // Close expansion when switching tabs or searching
  useEffect(() => { setExpandedCard(null); }, [activeTab, search]);

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
    setExpandedCard(prev => prev === id ? null : id);
  }

  const formProps: FormProps = { settings, update, showToast, allRecords, agentMetrics, onClose: () => setExpandedCard(null) };

  // SectionBlock needs onClose wired per-section
  function renderSection(section: SectionDef) {
    const cards = getVisibleCards(section.id);
    // Only one card expanded globally — if expanded card isn't in this section, don't show panel here
    const expandedInThisSection = cards.some(c => c.id === expandedCard) ? expandedCard : null;

    return (
      <SectionBlock
        key={section.id}
        section={section}
        cards={cards}
        expandedCard={expandedInThisSection}
        setExpandedCard={id => {
          if (id === 'reset-data') { setResetDialog(true); return; }
          setExpandedCard(id);
        }}
        formProps={formProps}
      />
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
            {SECTIONS.map(section => renderSection(section))}
          </TabsContent>

          {SECTIONS.map(section => (
            <TabsContent key={section.id} value={section.id} className="mt-6">
              {renderSection(section)}
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
            SECTIONS.map(section => renderSection(section))
          )}
        </div>
      )}

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
                  clearTransactionData(); resetAll();
                  setResetDialog(false); setResetInput('');
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
