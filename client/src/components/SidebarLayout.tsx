import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard, Upload, Users, DollarSign, FileText, Building2,
  GitCompare, UsersRound, Target, TrendingUp, Trophy, BarChart3,
  UserPlus, MapPin, Clock, ClipboardList, Settings, ChevronLeft,
  ChevronRight, Sun, Moon, ChevronDown, Calendar, X, History,
  Trash2, Gauge, Heart, Receipt, Calculator, Copy, ListTodo,
  ShieldCheck, ShieldAlert, Percent, Eye, Monitor,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTransactionData, DateRangeFilter } from '../contexts/TransactionDataContext';
import { useCDAPanel } from '../contexts/CDAContext';
import { useSettings } from '@/hooks/useSettings';
import supabase from '@/lib/supabase';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

// ─── Navigation ──────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard',   icon: LayoutDashboard, path: '/' },
      { label: 'Upload Data', icon: Upload,           path: '/upload' },
    ],
  },
  {
    title: 'Deals & Pipeline',
    items: [
      { label: 'Agents',       icon: Users,     path: '/agents' },
      { label: 'Commission',   icon: DollarSign, path: '/commission' },
      { label: 'Net Report',   icon: FileText,  path: '/net-commission-report' },
      { label: 'CDA Builder',  icon: Building2, path: '/cda-builder' },
      { label: 'CDA History',  icon: History,   path: '/cda-history' },
      { label: 'Stuck Deals',  icon: Clock,     path: '/stuck-deals' },
      { label: 'Tasks',        icon: ListTodo,  path: '/tasks' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Trends',      icon: TrendingUp, path: '/trends' },
      { label: 'Forecasting', icon: BarChart3,  path: '/forecasting' },
      { label: 'Goals',       icon: Target,     path: '/goals' },
      { label: 'Timeline',    icon: Calendar,   path: '/timeline' },
      { label: 'Velocity',    icon: Gauge,      path: '/velocity' },
      { label: 'Compare',     icon: GitCompare, path: '/compare' },
      { label: 'Market',      icon: MapPin,     path: '/market' },
    ],
  },
  {
    title: 'Team & Growth',
    items: [
      { label: 'Teams',      icon: UsersRound, path: '/teams' },
      { label: 'Contests',   icon: Trophy,     path: '/contests' },
      { label: 'Recruiting', icon: UserPlus,   path: '/recruiting' },
      { label: 'Retention',  icon: Heart,      path: '/retention' },
      { label: 'Lead ROI',   icon: Percent,    path: '/lead-roi' },
    ],
  },
  {
    title: 'Finance & Ops',
    items: [
      { label: 'Agent Billing', icon: Receipt,    path: '/agent-billing' },
      { label: 'QuickBooks',    icon: Calculator, path: '/quickbooks' },
      { label: 'Templates',     icon: Copy,       path: '/templates' },
    ],
  },
  {
    title: 'Reports & Admin',
    items: [
      { label: 'Reports',      icon: BarChart3,   path: '/reporting' },
      { label: 'Data Quality', icon: ShieldCheck, path: '/data-quality' },
      { label: 'Audit Log',    icon: ClipboardList, path: '/audit-log' },
      { label: 'Admin',        icon: ShieldAlert, path: '/admin' },
    ],
  },
];

const DATE_PRESETS = [
  {
    label: 'Last 30 Days',
    getRange: (): DateRangeFilter => {
      const to = new Date(); const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to, label: 'Last 30 Days' };
    },
  },
  {
    label: 'Last 90 Days',
    getRange: (): DateRangeFilter => {
      const to = new Date(); const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from, to, label: 'Last 90 Days' };
    },
  },
  {
    label: 'This Year',
    getRange: (): DateRangeFilter => {
      const to = new Date(); const from = new Date(to.getFullYear(), 0, 1);
      return { from, to, label: 'This Year' };
    },
  },
  {
    label: 'Last Year',
    getRange: (): DateRangeFilter => {
      const year = new Date().getFullYear() - 1;
      return { from: new Date(year, 0, 1), to: new Date(year, 11, 31), label: 'Last Year' };
    },
  },
];

// ─── Theme helpers ────────────────────────────────────────────────────────────

const THEME_CONFIG = {
  dark:     { icon: Moon,    label: 'Dark',          next: 'Switch to Light' },
  light:    { icon: Sun,     label: 'Light',         next: 'Switch to Contrast' },
  contrast: { icon: Eye,     label: 'High Contrast', next: 'Switch to Dark' },
  system:   { icon: Monitor, label: 'System',        next: 'Switch to Light' },
} as const;

// ─── Component ───────────────────────────────────────────────────────────────

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { settings: appSettings } = useSettings();

  const [collapsed, setCollapsed] = useState<boolean>(() =>
    typeof window !== 'undefined' && localStorage.getItem('sidebar_collapsed') === 'true'
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [calendarRange, setCalendarRange] = useState<{ from?: Date; to?: Date }>({});

  const datePickerRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  const {
    dateFilter, setDateFilter,
    teamFilter, setTeamFilter,
    hasData, activeDataSetName, dataStatistics,
    clearTransactionData, teams, isDemoMode,
  } = useTransactionData();

  const { openCDAHistory } = useCDAPanel();
  const { theme, toggleTheme } = useTheme();

  // Dotloop sync status (live badge)
  const [syncStatus, setSyncStatus] = useState<{
    connected: boolean;
    lastSynced?: string;
    syncStatus?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSyncStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/dotloop/status', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const data = await res.json() as typeof syncStatus;
        if (!cancelled) setSyncStatus(data);
      } catch { /* ignore */ }
    }
    void fetchSyncStatus();
    const interval = setInterval(() => { void fetchSyncStatus(); }, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  async function handleManualSync() {
    try {
      await fetch('/api/dotloop/sync', { method: 'POST', credentials: 'include' });
      setSyncStatus(prev => prev ? { ...prev, syncStatus: 'running' } : prev);
    } catch { /* ignore */ }
  }

  // Build team list: "All Teams" + unique agents from context
  const teamOptions = ['All Teams', ...teams.slice(0, 20)];

  const themeConf = THEME_CONFIG[theme] ?? THEME_CONFIG.dark;
  const ThemeIcon = themeConf.icon;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) setShowTeamDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const isActive = (path: string) =>
    path === '/' ? location === '/' : location.startsWith(path);

  const applyCalendarRange = () => {
    if (calendarRange.from && calendarRange.to) {
      setDateFilter({
        from: calendarRange.from,
        to: calendarRange.to,
        label: `${calendarRange.from.toLocaleDateString()} – ${calendarRange.to.toLocaleDateString()}`,
      });
    }
    setShowDatePicker(false);
  };

  const clearDateFilter = () => {
    setDateFilter({ from: undefined, to: undefined, label: 'All Data' });
    setCalendarRange({});
    setShowDatePicker(false);
  };

  const isFiltered = !!(dateFilter.from || dateFilter.to || teamFilter.teamId !== 'all');

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col bg-background border-r border-border transition-all duration-300 shrink-0 z-20 relative ${
          collapsed ? 'w-[56px]' : 'w-[220px]'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          {appSettings.branding.logoBase64 ? (
            <img src={appSettings.branding.logoBase64} alt="logo" className="w-7 h-7 rounded-md object-contain shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">D</span>
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-foreground font-bold text-sm leading-tight truncate">{appSettings.brokerage.name || 'Dotloop Reporter'}</div>
              <div className="text-muted-foreground text-[10px] truncate">
                {activeDataSetName ? `📊 ${activeDataSetName}` : 'Real Estate Analytics'}
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        {!collapsed && (
          <div className="px-2 py-2 border-b border-border space-y-1.5">

            {/* Date filter */}
            <div ref={datePickerRef} className="relative">
              <button
                onClick={() => { setShowDatePicker(v => !v); setShowTeamDropdown(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                  dateFilter.from || dateFilter.to
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate text-[11px]">{dateFilter.label}</span>
                </div>
                {dateFilter.from
                  ? <X className="w-3 h-3 shrink-0 ml-1 hover:text-destructive" onClick={e => { e.stopPropagation(); clearDateFilter(); }} />
                  : <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
                }
              </button>

              {showDatePicker && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-2xl p-3 w-[280px]">
                  <div className="grid grid-cols-2 gap-1 mb-3">
                    {DATE_PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setDateFilter(p.getRange()); setCalendarRange({}); setShowDatePicker(false); }}
                        className={`text-[11px] px-2 py-1 rounded transition-colors text-left ${
                          dateFilter.label === p.label
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-border pt-2 mb-2">
                    <div className="text-[10px] text-muted-foreground mb-1">Custom Range</div>
                    <DayPicker
                      mode="range"
                      selected={calendarRange as { from?: Date; to?: Date } & { from: Date | undefined }}
                      onSelect={(range) => setCalendarRange(range ?? {})}
                      numberOfMonths={1}
                      className="!text-xs"
                      style={{ '--rdp-accent-color': '#10b981' } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={clearDateFilter} className="flex-1 text-[11px] py-1 rounded border border-border text-muted-foreground hover:text-foreground">
                      Clear
                    </button>
                    <button
                      onClick={applyCalendarRange}
                      disabled={!calendarRange.from || !calendarRange.to}
                      className="flex-1 text-[11px] py-1 rounded bg-emerald-500 text-white disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Team filter */}
            <div ref={teamDropdownRef} className="relative">
              <button
                onClick={() => { setShowTeamDropdown(v => !v); setShowDatePicker(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                  teamFilter.teamId !== 'all'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <UsersRound className="w-3 h-3 shrink-0" />
                  <span className="truncate text-[11px]">{teamFilter.teamName}</span>
                </div>
                {teamFilter.teamId !== 'all'
                  ? <X className="w-3 h-3 shrink-0 ml-1 hover:text-destructive" onClick={e => { e.stopPropagation(); setTeamFilter({ teamId: 'all', teamName: 'All Teams' }); }} />
                  : <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
                }
              </button>

              {showTeamDropdown && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-2xl p-2 w-full max-h-48 overflow-y-auto">
                  {teamOptions.map(t => (
                    <button
                      key={t}
                      onClick={() => { setTeamFilter({ teamId: t === 'All Teams' ? 'all' : t, teamName: t }); setShowTeamDropdown(false); }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                        teamFilter.teamName === t ? 'bg-emerald-500/20 text-emerald-400' : 'text-foreground hover:bg-secondary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isFiltered && (
              <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-amber-400">Filters active</span>
                <button onClick={() => { clearDateFilter(); setTeamFilter({ teamId: 'all', teamName: 'All Teams' }); }} className="text-[10px] text-amber-400 hover:text-amber-300 underline">
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'pt-2' : ''}>
              {!collapsed && (
                <div className="px-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
                  {group.title}
                </div>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => setLocation(item.path)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && (
                      <span className="truncate text-[13px]">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Dotloop Live Sync Status */}
        {!collapsed && syncStatus?.connected && (
          <div className="px-2 py-1.5 border-t border-border">
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full flex-none ${syncStatus.syncStatus === 'running' ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
                <span className="text-[10px] text-emerald-400 font-medium">
                  {syncStatus.syncStatus === 'running' ? 'Syncing…' : 'Live'}
                </span>
                {syncStatus.lastSynced && syncStatus.syncStatus !== 'running' && (
                  <span className="text-[9px] text-muted-foreground">
                    · {new Date(syncStatus.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <button
                onClick={() => { void handleManualSync(); }}
                disabled={syncStatus.syncStatus === 'running'}
                className="text-[9px] text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
                title="Sync now"
              >
                ↻
              </button>
            </div>
          </div>
        )}

        {/* Data Summary */}
        {hasData && !collapsed && (
          <div className="px-2 pt-1 pb-2 border-t border-border">
            <div className="px-2 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
              <div className="text-[9px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">
                {isDemoMode ? 'Demo Data' : 'Loaded Data'}
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Transactions', value: dataStatistics.transactionCount.toString() },
                  { label: 'Total GCI', value: `$${(dataStatistics.totalGCI / 1_000_000).toFixed(1)}M` },
                  { label: 'Close Rate', value: `${dataStatistics.closeRate.toFixed(1)}%` },
                ].map(s => (
                  <div key={s.label} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="text-emerald-400 font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div className={`border-t border-border py-1.5 px-1.5 space-y-0.5 ${collapsed ? '' : ''}`}>

          {/* CDA History shortcut */}
          {!collapsed && (
            <button
              onClick={openCDAHistory}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <History className="w-4 h-4 shrink-0" />
              <span className="truncate">CDA History</span>
            </button>
          )}

          {/* Clear Data */}
          {hasData && (
            <button
              onClick={() => {
                if (confirm('Clear all data and return to dashboard?')) {
                  clearTransactionData();
                  setLocation('/');
                }
              }}
              title={collapsed ? 'Clear Data' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors ${collapsed ? 'justify-center' : ''}`}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">Clear Data</span>}
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setLocation('/settings')}
            title={collapsed ? 'Settings' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive('/settings') ? 'bg-emerald-500/20 text-emerald-400' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="truncate">Settings</span>}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={collapsed ? themeConf.next : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <ThemeIcon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-[11px]">{themeConf.label}</span>
              </div>
            )}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={handleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span className="truncate">Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        <div className="flex-1 p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
