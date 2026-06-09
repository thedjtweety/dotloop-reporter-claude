import { useState, useCallback } from 'react';

// ─── Sub-interfaces ───────────────────────────────────────────────────────────

export interface BrokerageSettings {
  name: string;
  brokerName: string;
  licenseNumber: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  website: string;
}

export interface BrandingSettings {
  logoBase64: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tagline: string;
  footerDisclaimer: string;
}

export interface CdaLogoSettings {
  useMainLogo: boolean;
  logoBase64: string;
}

export interface CommissionDefaults {
  agentSplit: number;
  capAmount: number;
  postCapSplit: number;
  referralFee: number;
}

export interface LocaleSettings {
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currencyFormat: 'USD' | 'CAD';
}

export interface ReportingSettings {
  autoRefreshEnabled: boolean;
  autoRefreshInterval: number; // seconds
  retentionDays: number; // 0 = forever
  emailReportsEnabled: boolean;
  emailFrequency: 'monthly' | 'quarterly';
  emailDayOfMonth: number;
  emailReportTypes: string[];
  recipients: string[];
  displayMode: 'standard' | 'wallboard' | 'presentation';
  wallboardRotateSeconds: number;
}

export interface AlertSettings {
  stuckDealEnabled: boolean;
  stuckDealDays: number;
  pipelineDropEnabled: boolean;
  pipelineDropPercent: number;
  commissionVarianceEnabled: boolean;
  commissionVariancePercent: number;
  lowVolumeEnabled: boolean;
  lowVolumeDeals: number;
  goalBehindEnabled: boolean;
  goalBehindPercent: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  emailAddress: string;
}

export interface LeadSource {
  id: string;
  name: string;
  active: boolean;
}

export interface LeadSourceCost {
  sourceId: string;
  monthlyCost: number;
}

export interface UploadLimits {
  maxFileSizeMB: number;
  maxTransactionsPerPush: number;
}

// ─── Full Config ──────────────────────────────────────────────────────────────

export interface SettingsConfig {
  brokerage: BrokerageSettings;
  branding: BrandingSettings;
  cdaLogo: CdaLogoSettings;
  commissionDefaults: CommissionDefaults;
  locale: LocaleSettings;
  reporting: ReportingSettings;
  alerts: AlertSettings;
  notifications: NotificationSettings;
  leadSources: LeadSource[];
  leadSourceCosts: LeadSourceCost[];
  uploadLimits: UploadLimits;
}

// ─── Default lead sources ─────────────────────────────────────────────────────

export const DEFAULT_LEAD_SOURCES: LeadSource[] = [
  { id: 'zillow', name: 'Zillow', active: true },
  { id: 'realtor', name: 'Realtor.com', active: true },
  { id: 'referral', name: 'Referral', active: true },
  { id: 'sphere', name: 'Sphere of Influence', active: true },
  { id: 'open-house', name: 'Open House', active: true },
  { id: 'social-media', name: 'Social Media', active: true },
  { id: 'google-ads', name: 'Google Ads', active: true },
  { id: 'direct-mail', name: 'Direct Mail', active: true },
  { id: 'broker-referral', name: 'Broker Referral', active: true },
  { id: 'past-client', name: 'Past Client', active: true },
  { id: 'cold-call', name: 'Cold Call', active: false },
  { id: 'other', name: 'Other', active: true },
];

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const SETTINGS_DEFAULTS: SettingsConfig = {
  brokerage: {
    name: '',
    brokerName: '',
    licenseNumber: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    website: '',
  },
  branding: {
    logoBase64: '',
    primaryColor: '#10b981',
    secondaryColor: '#3b82f6',
    accentColor: '#f59e0b',
    tagline: '',
    footerDisclaimer: '',
  },
  cdaLogo: {
    useMainLogo: true,
    logoBase64: '',
  },
  commissionDefaults: {
    agentSplit: 70,
    capAmount: 25000,
    postCapSplit: 100,
    referralFee: 25,
  },
  locale: {
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currencyFormat: 'USD',
  },
  reporting: {
    autoRefreshEnabled: false,
    autoRefreshInterval: 300,
    retentionDays: 90,
    emailReportsEnabled: false,
    emailFrequency: 'monthly',
    emailDayOfMonth: 1,
    emailReportTypes: ['production', 'pipeline'],
    recipients: [],
    displayMode: 'standard',
    wallboardRotateSeconds: 15,
  },
  alerts: {
    stuckDealEnabled: true,
    stuckDealDays: 30,
    pipelineDropEnabled: true,
    pipelineDropPercent: 20,
    commissionVarianceEnabled: false,
    commissionVariancePercent: 15,
    lowVolumeEnabled: false,
    lowVolumeDeals: 2,
    goalBehindEnabled: true,
    goalBehindPercent: 25,
  },
  notifications: {
    emailEnabled: false,
    emailAddress: '',
  },
  leadSources: DEFAULT_LEAD_SOURCES,
  leadSourceCosts: DEFAULT_LEAD_SOURCES.map(s => ({ sourceId: s.id, monthlyCost: 0 })),
  uploadLimits: {
    maxFileSizeMB: 10,
    maxTransactionsPerPush: 5000,
  },
};

// ─── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'dotloop-settings-v1';

// ─── Deep merge ───────────────────────────────────────────────────────────────

function deepMerge<T>(defaults: T, saved: Partial<T>): T {
  const result = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(saved as object)) {
    const sv = (saved as Record<string, unknown>)[key];
    const dv = (defaults as Record<string, unknown>)[key];
    if (
      sv !== null &&
      sv !== undefined &&
      typeof sv === 'object' &&
      !Array.isArray(sv) &&
      typeof dv === 'object' &&
      dv !== null &&
      !Array.isArray(dv)
    ) {
      result[key] = deepMerge(dv as object, sv as object);
    } else if (sv !== undefined) {
      result[key] = sv;
    }
  }
  return result as T;
}

function loadSettings(): SettingsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SETTINGS_DEFAULTS;
    const saved = JSON.parse(raw) as Partial<SettingsConfig>;
    return deepMerge(SETTINGS_DEFAULTS, saved);
  } catch {
    return SETTINGS_DEFAULTS;
  }
}

function saveSettings(cfg: SettingsConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettings() {
  const [settings, setSettings] = useState<SettingsConfig>(loadSettings);

  const update = useCallback(<K extends keyof SettingsConfig>(
    section: K,
    value: SettingsConfig[K],
  ) => {
    setSettings(prev => {
      const next = { ...prev, [section]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(SETTINGS_DEFAULTS);
  }, []);

  return { settings, update, resetAll };
}
