import { useState, useEffect } from 'react';
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
  LogOut,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Agents', icon: Users, path: '/agents' },
  { label: 'Commission', icon: DollarSign, path: '/commission' },
  { label: 'Net Report', icon: FileText, path: '/net-commission-report' },
  { label: 'CDA Builder', icon: Building2, path: '/cda-builder' },
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

interface SidebarLayoutProps {
  children: React.ReactNode;
  dataFilter?: React.ReactNode;
  teamFilter?: React.ReactNode;
}

export default function SidebarLayout({ children, dataFilter, teamFilter }: SidebarLayoutProps) {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  // Persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
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

  return (
    <div className="flex h-screen bg-[#0d1117] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#0d1117] border-r border-[#1e2d3d] transition-all duration-300 ${
          collapsed ? 'w-[56px]' : 'w-[168px]'
        } shrink-0 z-20`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2 px-3 py-4 border-b border-[#1e2d3d] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">Dotloop Reporter</div>
              <div className="text-gray-500 text-[10px] truncate">Real Estate Analytics</div>
            </div>
          )}
        </div>

        {/* Data / Team filters */}
        {!collapsed && (
          <div className="px-2 py-2 border-b border-[#1e2d3d] space-y-1">
            <button className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-[#1a2332] text-gray-300 text-xs hover:bg-[#1e2d3d] transition-colors">
              <span className="truncate">All Data</span>
              <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
            </button>
            <button className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-[#1a2332] text-gray-300 text-xs hover:bg-[#1e2d3d] transition-colors">
              <span className="truncate">All Teams</span>
              <ChevronDown className="w-3 h-3 shrink-0 ml-1" />
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                    : 'text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom items */}
        <div className="border-t border-[#1e2d3d] py-2 px-1.5 space-y-0.5">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-400 font-medium'
                    : 'text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <Icon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={collapsed ? 'Toggle theme' : undefined}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-gray-400 hover:bg-[#1a2332] hover:text-gray-200 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            {theme === 'dark' ? (
              <Sun className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
            ) : (
              <Moon className={`shrink-0 ${collapsed ? 'w-5 h-5' : 'w-4 h-4'}`} />
            )}
            {!collapsed && <span className="truncate">Light mode</span>}
          </button>

          {/* User info */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-bold">DA</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-gray-300 text-xs font-medium truncate">Demo</div>
                <div className="text-gray-500 text-[10px] truncate">demo@demo.exam...</div>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={handleCollapse}
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm text-gray-400 hover:bg-[#1a2332] hover:text-gray-200 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-[#0d1117]">
        {children}
      </main>
    </div>
  );
}
