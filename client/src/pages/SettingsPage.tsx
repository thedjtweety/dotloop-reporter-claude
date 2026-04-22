import { useState, useEffect } from 'react';
import { Settings, Building2, DollarSign, Users, Bell, Database, Shield, ChevronRight, Save, Plus, Trash2, Download, Upload, Key, Lock, Palette } from 'lucide-react';
import { useTransactionData } from '@/contexts/TransactionDataContext';
import BrandingSettingsForm from './BrandingSettingsForm';

const TABS = [
  { key: 'brokerage', label: 'Brokerage Info', icon: Building2 },
  { key: 'branding', label: 'Branding & White Label', icon: Palette },
  { key: 'commission', label: 'Commission Defaults', icon: DollarSign },
  { key: 'agents', label: 'Agent Management', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'data', label: 'Data & Import', icon: Database },
  { key: 'security', label: 'Security', icon: Shield },
];

const STORAGE_KEY = 'dotloop_settings';

export default function SettingsPage() {
  const { agentMetrics } = useTransactionData();
  const [activeTab, setActiveTab] = useState('brokerage');
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  const loadSaved = (key: string, fallback: any) => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}_${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };

  const [brokerage, setBrokerage] = useState(() => loadSaved('brokerage', {
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    website: '',
    mlsId: '',
    brokerLicense: '',
    fiscalYearStart: 'January',
    timezone: 'America/New_York',
  }));

  const [commissionDefaults, setCommissionDefaults] = useState(() => loadSaved('commission', {
    defaultSplit: '70',
    capAmount: '16000',
    transactionFee: '250',
    eoFee: '150',
    royaltyFee: '0',
    defaultCommissionRate: '3',
  }));

  const [notifications, setNotifications] = useState(() => loadSaved('notifications', {
    emailReports: true,
    weeklyDigest: true,
    dealAlerts: false,
    goalMilestones: true,
    newAgentJoins: false,
  }));

  const [customAgents, setCustomAgents] = useState<{ name: string; email: string; role: string }[]>(() => loadSaved('customAgents', []));
  const [newAgent, setNewAgent] = useState({ name: '', email: '', role: 'Agent' });
  const [dataRetention, setDataRetention] = useState(() => loadSaved('dataRetention', { months: '24', autoClean: false }));
  const [apiKey, setApiKey] = useState(() => loadSaved('apiKey', { key: '', showKey: false }));

  const handleSave = () => {
    localStorage.setItem(`${STORAGE_KEY}_brokerage`, JSON.stringify(brokerage));
    localStorage.setItem(`${STORAGE_KEY}_commission`, JSON.stringify(commissionDefaults));
    localStorage.setItem(`${STORAGE_KEY}_notifications`, JSON.stringify(notifications));
    localStorage.setItem(`${STORAGE_KEY}_customAgents`, JSON.stringify(customAgents));
    localStorage.setItem(`${STORAGE_KEY}_dataRetention`, JSON.stringify(dataRetention));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addCustomAgent = () => {
    if (!newAgent.name.trim()) return;
    setCustomAgents(prev => [...prev, { ...newAgent }]);
    setNewAgent({ name: '', email: '', role: 'Agent' });
  };

  const removeCustomAgent = (idx: number) => setCustomAgents(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-400" />
            Settings
          </h1>
          <p className="text-gray-400 text-sm mt-1">Configure your brokerage and tool preferences</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            saved ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-3 h-fit">
          <nav className="space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    activeTab === tab.key
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </div>
                  <ChevronRight className="w-3 h-3 opacity-50" />
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 bg-[#0f1923] border border-[#1e2d3d] rounded-xl p-6">
          {activeTab === 'brokerage' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-5">Brokerage Information</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Brokerage Name', key: 'name', placeholder: 'e.g. Premier Realty Group' },
                  { label: 'Address', key: 'address', placeholder: '123 Main St' },
                  { label: 'City', key: 'city', placeholder: 'New York' },
                  { label: 'State', key: 'state', placeholder: 'NY' },
                  { label: 'ZIP Code', key: 'zip', placeholder: '10001' },
                  { label: 'Phone', key: 'phone', placeholder: '(555) 000-0000' },
                  { label: 'Email', key: 'email', placeholder: 'broker@example.com' },
                  { label: 'Website', key: 'website', placeholder: 'https://example.com' },
                  { label: 'MLS ID', key: 'mlsId', placeholder: 'MLS12345' },
                  { label: 'Broker License #', key: 'brokerLicense', placeholder: 'BL-XXXXX' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-gray-400 text-xs mb-1 block">{field.label}</label>
                    <input
                      value={(brokerage as any)[field.key]}
                      onChange={(e: any) => setBrokerage((b: any) => ({ ...b, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Fiscal Year Start</label>
                  <select
                    value={brokerage.fiscalYearStart}
                    onChange={(e: any) => setBrokerage((b: any) => ({ ...b, fiscalYearStart: e.target.value }))}
                    className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Timezone</label>
                  <select
                    value={brokerage.timezone}
                    onChange={(e: any) => setBrokerage((b: any) => ({ ...b, timezone: e.target.value }))}
                    className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                  >
                    <option value="America/New_York">Eastern (ET)</option>
                    <option value="America/Chicago">Central (CT)</option>
                    <option value="America/Denver">Mountain (MT)</option>
                    <option value="America/Los_Angeles">Pacific (PT)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-5">Commission Defaults</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Default Agent Split (%)', key: 'defaultSplit', placeholder: '70', suffix: '%' },
                  { label: 'Annual Cap Amount ($)', key: 'capAmount', placeholder: '16000', suffix: '$' },
                  { label: 'Transaction Fee ($)', key: 'transactionFee', placeholder: '250', suffix: '$' },
                  { label: 'E&O Fee ($)', key: 'eoFee', placeholder: '150', suffix: '$' },
                  { label: 'Royalty Fee (%)', key: 'royaltyFee', placeholder: '0', suffix: '%' },
                  { label: 'Default Commission Rate (%)', key: 'defaultCommissionRate', placeholder: '3', suffix: '%' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-gray-400 text-xs mb-1 block">{field.label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={(commissionDefaults as any)[field.key]}
                        onChange={(e: any) => setCommissionDefaults((c: any) => ({ ...c, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{field.suffix}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-5">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: 'emailReports', label: 'Email Reports', desc: 'Receive monthly performance reports via email' },
                  { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Get a weekly summary of brokerage activity' },
                  { key: 'dealAlerts', label: 'Deal Alerts', desc: 'Notifications when deals close or change status' },
                  { key: 'goalMilestones', label: 'Goal Milestones', desc: 'Alerts when agents hit goal milestones' },
                  { key: 'newAgentJoins', label: 'New Agent Joins', desc: 'Notify when a new agent is added' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-[#1a2332] rounded-lg">
                    <div>
                      <div className="text-white text-sm font-medium">{item.label}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifications((n: any) => ({ ...n, [item.key]: !(n as any)[item.key] }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${
                        (notifications as any)[item.key] ? 'bg-emerald-500' : 'bg-[#2a3d50]'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        (notifications as any)[item.key] ? 'left-5' : 'left-0.5'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'agents' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-2">Agent Management</h2>
              <p className="text-gray-400 text-sm mb-5">Manage agents imported from Dotloop and add custom entries.</p>

              {/* Agents from data */}
              {agentMetrics.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-gray-300 text-sm font-medium mb-3">Agents from Imported Data ({agentMetrics.length})</h3>
                  <div className="bg-[#1a2332] rounded-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      {agentMetrics.slice(0, 30).map(a => (
                        <div key={a.agentName} className="flex items-center justify-between px-4 py-2.5 border-b border-[#0d1117]/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                              {a.agentName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-gray-200 text-sm">{a.agentName}</span>
                          </div>
                          <span className="text-gray-500 text-xs">{a.closedDeals} closed deals</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Add custom agent */}
              <div className="mb-4">
                <h3 className="text-gray-300 text-sm font-medium mb-3">Add Custom Agent</h3>
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <input
                    value={newAgent.name}
                    onChange={e => setNewAgent(a => ({ ...a, name: e.target.value }))}
                    placeholder="Full Name"
                    className="bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    value={newAgent.email}
                    onChange={e => setNewAgent(a => ({ ...a, email: e.target.value }))}
                    placeholder="Email"
                    className="bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newAgent.role}
                      onChange={e => setNewAgent(a => ({ ...a, role: e.target.value }))}
                      className="flex-1 bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                    >
                      {['Agent', 'Team Lead', 'Broker', 'Admin'].map(r => <option key={r}>{r}</option>)}
                    </select>
                    <button onClick={addCustomAgent} className="px-3 py-2 rounded-md bg-emerald-500 text-white hover:bg-emerald-600">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {customAgents.length > 0 && (
                <div className="bg-[#1a2332] rounded-lg overflow-hidden">
                  {customAgents.map((a, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-[#0d1117]/50 last:border-0">
                      <div>
                        <div className="text-gray-200 text-sm">{a.name}</div>
                        <div className="text-gray-500 text-xs">{a.email} · {a.role}</div>
                      </div>
                      <button onClick={() => removeCustomAgent(i)} className="text-gray-500 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-2">Data & Import Settings</h2>
              <p className="text-gray-400 text-sm mb-5">Configure data retention, export formats, and import preferences.</p>
              <div className="space-y-5">
                <div className="bg-[#1a2332] rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-3">Data Retention</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Keep data for (months)</label>
                      <select
                        value={dataRetention.months}
                        onChange={e => setDataRetention((d: any) => ({ ...d, months: e.target.value }))}
                        className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none"
                      >
                        {['6', '12', '24', '36', '60', 'Forever'].map(m => <option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center justify-between w-full p-3 bg-[#0d1117] rounded-lg">
                        <span className="text-gray-300 text-sm">Auto-clean old data</span>
                        <button
                          onClick={() => setDataRetention((d: any) => ({ ...d, autoClean: !d.autoClean }))}
                          className={`relative w-10 h-5 rounded-full transition-colors ${dataRetention.autoClean ? 'bg-emerald-500' : 'bg-[#2a3d50]'}`}
                        >
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${dataRetention.autoClean ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1a2332] rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-3">Export Formats</h3>
                  <div className="flex gap-3">
                    {['CSV', 'Excel (.xlsx)', 'PDF Report', 'JSON'].map(fmt => (
                      <div key={fmt} className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] rounded-lg">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span className="text-gray-300 text-sm">{fmt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1a2332] rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-1">Import History</h3>
                  <p className="text-gray-400 text-xs mb-3">Recent CSV imports are stored in your browser's local storage.</p>
                  <button
                    onClick={() => {
                      const keys = Object.keys(localStorage).filter(k => k.startsWith('dotloop_'));
                      if (keys.length === 0) return alert('No stored data found.');
                      if (confirm(`Clear ${keys.length} stored items? This cannot be undone.`)) {
                        keys.forEach(k => localStorage.removeItem(k));
                        alert('All stored data cleared.');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" /> Clear All Stored Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'branding' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-2">Branding & White Label</h2>
              <p className="text-gray-400 text-sm mb-5">Customize your brokerage appearance across CDA documents and reports.</p>
              <BrandingSettingsForm />
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-white font-semibold text-lg mb-2">Security</h2>
              <p className="text-gray-400 text-sm mb-5">Manage access controls and API keys for integrations.</p>
              <div className="space-y-5">
                <div className="bg-[#1a2332] rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-400" /> API Key
                  </h3>
                  <p className="text-gray-400 text-xs mb-3">Use this key to integrate with external tools via the Dotloop Reporter API.</p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={apiKey.showKey ? 'text' : 'password'}
                        value={apiKey.key || 'dk_live_••••••••••••••••••••••••••••••••'}
                        readOnly
                        className="w-full bg-[#0d1117] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => setApiKey((k: any) => ({ ...k, showKey: !k.showKey }))}
                      className="px-3 py-2 rounded-md border border-[#1e2d3d] text-gray-400 hover:bg-[#1a2332] text-sm"
                    >
                      {apiKey.showKey ? 'Hide' : 'Show'}
                    </button>
                    <button className="px-3 py-2 rounded-md bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm">
                      Regenerate
                    </button>
                  </div>
                </div>

                <div className="bg-[#1a2332] rounded-lg p-4">
                  <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-blue-400" /> Access Control
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Require login to view reports', desc: 'Only authenticated users can access reports', enabled: true },
                      { label: 'Allow public dashboard links', desc: 'Share read-only dashboard links externally', enabled: false },
                      { label: 'Two-factor authentication', desc: 'Require 2FA for admin actions', enabled: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#0d1117] rounded-lg">
                        <div>
                          <div className="text-gray-200 text-sm">{item.label}</div>
                          <div className="text-gray-500 text-xs mt-0.5">{item.desc}</div>
                        </div>
                        <div className={`relative w-10 h-5 rounded-full ${item.enabled ? 'bg-emerald-500' : 'bg-[#2a3d50]'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${item.enabled ? 'left-5' : 'left-0.5'}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
