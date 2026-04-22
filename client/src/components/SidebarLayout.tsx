// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  FileText,
  Building2,
  GitCompare,
  UsersRound,
  Target,
  TrendingUp,
  Trophy,
  BarChart3,
  UserPlus,
  MapPin,
  Clock,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sun,
  Moon,
  ChevronDown,
  Calendar,
  X,
  FlaskConical,
  History,
  Trash2,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTransactionData, DateRangeFilter } from '../contexts/TransactionDataContext';
import { useCDAPanel } from '../contexts/CDAContext';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
}

// ALL NAVIGATION ITEMS - All visible in sidebar
const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Agents', icon: Users, path: '/agents' },
  { label: 'Commission', icon: DollarSign, path: '/commission' },
  { label: 'Net Report', icon: FileText, path: '/net-commission-report' },
  { label: 'CDA Builder', icon: Building2, path: '/cda-builder' },
  { label: 'CDA History', icon: History, path: '/cda-history' },
  { label: 'Compare', icon: GitCompare, path: '/compare' },
  { label: 'Teams', icon: UsersRound, path: '/teams' },
  { label: 'Goals', icon: Target, path: '/goals' },
  { label: 'Trends', icon: TrendingUp, path: '/trends' },
  { label: 'Contests', icon: Trophy, path: '/contests' },
  { label: 'Forecasting', icon: BarChart3, path: '/forecasting' },
  { label: 'Recruiting', icon: UserPlus, path: '/recruiting' },
  { label: 'Market', icon: MapPin, path: '/market' },
  { label: 'Timeline', icon: Clock, path: '/timeline' },
  { label: 'Audit Log', icon: ClipboardList, path: '/audit-log' },
];

const bottomItems: NavItem[] = [
  { label: 'Preview as Agent', icon: Eye, path: '/preview-agent' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

// Quick date presets
const DATE_PRESETS = [
  {
    label: 'Last 30 Days',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 30);
      return { from, to, label: 'Last 30 Days' };
    },
  },
  {
    label: 'Last 90 Days',
    getRange: () => {
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - 90);
      return { from, to, label: 'Last 90 Days' };
    },
  },
  {
    label: 'This Year',
    getRange: () => {
      const to = new Date();
      const from = new Date(to.getFullYear(), 0, 1);
      return { from, to, label: 'This Year' };
    },
  },
  {
    label: 'Last Year',
    getRange: () => {
      const year = new Date().getFullYear() - 1;
      const from = new Date(year, 0, 1);
      const to = new Date(year, 11, 31);
      return { from, to, label: 'Last Year' };
    },
  },
];

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [calendarRange, setCalendarRange] = useState<{ from?: Date; to?: Date }>({});

  const datePickerRef = useRef<HTMLDivElement>(null);
  const teamDropdownRef = useRef<HTMLDivElement>(null);

  const { dateFilter, setDateFilter, teamFilter, setTeamFilter } = useTransactionData();
  const { transactionData, dataStatistics, clearTransactionData } = useTransactionData();
  const { openCDAHistory } = useCDAPanel();
  const { theme, toggleTheme } = useTheme();

  const hasData = transactionData && transactionData.length > 0;
  const activeDataSetName = transactionData?.[0]?.loopName || '';
  const teams = ['All Teams', 'Team A', 'Team B', 'Team C'];

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
      if (teamDropdownRef.current && !teamDropdownRef.current.contains(e.target as Node)) {
        setShowTeamDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

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
    setCalendarRange({ from: undefined, to: undefined });
    setShowDatePicker(false);
  };

  const isFiltered = dateFilter.from || dateFilter.to || teamFilter.teamId !== 'all';

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#0d1117] border-r border-[#1e2d3d] transition-all duration-300 ${
          collapsed ? 'w-[56px]' : 'w-[220px]'
        } shrink-0 z-20 relative`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-[#1e2d3d] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">Dotloop Reporter</div>
              <div className="text-gray-500 text-[10px] truncate">
                {activeDataSetName ? `📊 ${activeDataSetName}` : 'Real Estate Analytics'}
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar - Compact at top */}
        {!collapsed && (
          <div className="px-2 py-2 border-b border-[#1e2d3d] space-y-1.5 bg-[#0a0e13]">
            {/* Date filter */}
            <div ref={datePickerRef} className="relative">
              <button
                onClick={() => { setShowDatePicker(v => !v); setShowTeamDropdown(false); }}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                  dateFilter.from || dateFilter.to
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#1a2332] text-gray-300 hover:bg-[#1e2d3d]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="truncate text-[11px]">{dateFilter.label}</span>
                </div>
                {dateFilter.from ? (
                  <X
                    className="w-3 h-3 shrink-0 ml-1 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); clearDateFilter(); }}
                  />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
                )}
              </button>

              {showDatePicker && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-[#0d1117] border border-[#1e2d3d] rounded-lg shadow-2xl p-3 w-[280px]">
                  {/* Quick presets */}
                  <div className="grid grid-cols-2 gap-1 mb-3">
                    {DATE_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => {
                          const range = p.getRange();
                          setDateFilter(range as DateRangeFilter);
                          setCalendarRange({ from: range.from, to: range.to });
                          setShowDatePicker(false);
                        }}
                        className={`text-[11px] px-2 py-1 rounded transition-colors text-left ${
                          dateFilter.label === p.label
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-[#1e2d3d] pt-2 mb-2">
                    <div className="text-[10px] text-gray-500 mb-1">Custom Range</div>
                    <DayPicker
                      mode="range"
                      selected={calendarRange as any}
                      onSelect={(range: any) => setCalendarRange(range || {})}
                      numberOfMonths={1}
                      className="!text-xs rdp-custom"
                      style={{ '--rdp-accent-color': '#10b981' } as any}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={clearDateFilter}
                      className="flex-1 text-[11px] py-1 rounded border border-[#1e2d3d] text-gray-400 hover:text-gray-200"
                    >
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
                    : 'bg-[#1a2332] text-gray-300 hover:bg-[#1e2d3d]'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <UsersRound className="w-3 h-3 shrink-0" />
                  <span className="truncate text-[11px]">{teamFilter.teamName}</span>
                </div>
                {teamFilter.teamId !== 'all' ? (
                  <X
                    className="w-3 h-3 shrink-0 ml-1 hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); setTeamFilter({ teamId: 'all', teamName: 'All Teams' }); }}
                  />
                ) : (
                  <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
                )}
              </button>

              {showTeamDropdown && (
                <div className="absolute left-0 top-full mt-1 z-50 bg-[#0d1117] border border-[#1e2d3d] rounded-lg shadow-2xl p-2 w-full">
                  {teams.map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTeamFilter({ teamId: t === 'All Teams' ? 'all' : t, teamName: t });
                        setShowTeamDropdown(false);
                      }}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                        teamFilter.teamName === t
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'text-gray-300 hover:bg-[#1a2332]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active filter indicator */}
            {isFiltered && (
              <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] text-amber-400">Filters active</span>
                <button
                  onClick={() => {
                    clearDateFilter();
                    setTeamFilter({ teamId: 'all', teamName: 'All Teams' });
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* PRIMARY NAV - All tabs visible */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-500/25 text-emerald-300 shadow-lg shadow-emerald-500/20'
                    : 'text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-5 h-5'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* DATA SUMMARY - Sticky Card */}
        {hasData && !collapsed && (
          <div className="px-2 py-3 border-t border-[#1e2d3d] bg-emerald-500/5">
            <div className="px-2 py-2 rounded bg-emerald-500/10 border border-emerald-500/20">
              <div className="text-[10px] text-gray-400 mb-2 font-semibold">Data Summary</div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Transactions:</span>
                  <span className="text-emerald-400 font-semibold">{dataStatistics.transactionCount}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Total GCI:</span>
                  <span className="text-emerald-400 font-semibold">${(dataStatistics.totalGCI / 1000000).toFixed(1)}M</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-500">Close Rate:</span>
                  <span className="text-emerald-400 font-semibold">{(dataStatistics.closeRate * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ACTIONS */}
        <div className="border-t border-[#1e2d3d] py-2 px-1.5 space-y-0.5 bg-[#0a0e13]">
          {/* Clear Data button */}
          {hasData && !collapsed && (
            <button
              onClick={() => {
                if (confirm('Clear all data and return to home? This will reset all filters and loaded data.')) {
                  clearTransactionData();
                  setLocation('/');
                }
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Clear Data</span>
            </button>
          )}

          {/* Demo mode button */}
          {!collapsed && (
            <div className="px-2 py-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-400 text-center">
              Demo mode active
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={collapsed ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:bg-[#1a2332] hover:text-gray-200 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && <span className="truncate">{theme === 'dark' ? 'Light' : 'Dark'} mode</span>}
          </button>

          {/* Bottom nav items */}
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Collapse button */}
          <button
            onClick={handleCollapse}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="w-full flex items-center justify-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-400 hover:bg-[#1a2332] hover:text-gray-200 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="truncate">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
