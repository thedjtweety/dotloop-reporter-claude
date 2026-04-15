import { useState } from 'react';
import { Settings, Building2, DollarSign, Users, Bell, Database, Shield, ChevronRight, Save } from 'lucide-react';

const TABS = [
  { key: 'brokerage', label: 'Brokerage Info', icon: Building2 },
  { key: 'commission', label: 'Commission Defaults', icon: DollarSign },
  { key: 'agents', label: 'Agent Management', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'data', label: 'Data & Import', icon: Database },
  { key: 'security', label: 'Security', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('brokerage');
  const [saved, setSaved] = useState(false);
  const [brokerage, setBrokerage] = useState({
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
  });

  const [commissionDefaults, setCommissionDefaults] = useState({
    defaultSplit: '70',
    capAmount: '16000',
    transactionFee: '250',
    eoFee: '150',
    royaltyFee: '0',
    defaultCommissionRate: '3',
  });

  const [notifications, setNotifications] = useState({
    emailReports: true,
    weeklyDigest: true,
    dealAlerts: false,
    goalMilestones: true,
    newAgentJoins: false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
                      onChange={e => setBrokerage(b => ({ ...b, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full bg-[#1a2332] border border-[#1e2d3d] rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-gray-400 text-xs mb-1 block">Fiscal Year Start</label>
                  <select
                    value={brokerage.fiscalYearStart}
                    onChange={e => setBrokerage(b => ({ ...b, fiscalYearStart: e.target.value }))}
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
                    onChange={e => setBrokerage(b => ({ ...b, timezone: e.target.value }))}
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
                        onChange={e => setCommissionDefaults(c => ({ ...c, [field.key]: e.target.value }))}
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
                      onClick={() => setNotifications(n => ({ ...n, [item.key]: !(n as any)[item.key] }))}
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

          {(activeTab === 'agents' || activeTab === 'data' || activeTab === 'security') && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Settings className="w-10 h-10 text-gray-500 mb-3 opacity-30" />
              <p className="text-white font-medium mb-1">{TABS.find(t => t.key === activeTab)?.label}</p>
              <p className="text-gray-400 text-sm">Configuration options coming soon</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
