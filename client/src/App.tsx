import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ModalProvider } from "./contexts/ModalContext";
import { TransactionDataProvider } from "./contexts/TransactionDataContext";
import SidebarLayout from "./components/SidebarLayout";
import { CDAProvider } from "./contexts/CDAContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// ─── Pages ───────────────────────────────────────────────────────────────────

import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import LeadROIPage from "./pages/LeadROIPage";
import StuckDealsPage from "./pages/StuckDealsPage";
import VelocityPage from "./pages/VelocityPage";
import TasksPage from "./pages/TasksPage";
import AgentBillingPage from "./pages/AgentBillingPage";
import RetentionPage from "./pages/RetentionPage";
import QuickBooksPage from "./pages/QuickBooksPage";

// Auth pages
import LoginPage  from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";

// Auth / legal
import OAuthCallback from "./pages/OAuthCallback";
import DotloopOAuthCallback from "./pages/DotloopOAuthCallback";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";

// Deals & Pipeline
import AgentsPage from "./pages/AgentsPage";
import CommissionManagement from "./pages/CommissionManagement";
import NetCommissionReportPage from "./pages/NetCommissionReportPage";
import CDABuilderPage from "./pages/CDABuilderPage";
import CDAHistoryPage from "./pages/CDAHistoryPage";

// Analytics
import TrendsPage from "./pages/TrendsPage";
import ForecastingPage from "./pages/ForecastingPage";
import GoalsPage from "./pages/GoalsPage";
import TimelinePage from "./pages/TimelinePage";
import ComparePage from "./pages/ComparePage";
import ComparisonPage from "./pages/ComparisonPage";
import MarketPage from "./pages/MarketPage";

// Team & Growth
import TeamsPage from "./pages/TeamsPage";
import ContestsPage from "./pages/ContestsPage";
import RecruitingPage from "./pages/RecruitingPage";
// Finance & Ops
import CommissionTemplates from "./pages/CommissionTemplates";

// Reports & Admin
import ReportingComplete from "./pages/ReportingComplete";
import DataValidationRules from "./pages/DataValidationRules";
import AuditLog from "./pages/AuditLog";
import AdminDashboard from "./pages/AdminDashboard";

// Settings
import SettingsComplete from "./pages/SettingsComplete";

// ─── Routes ──────────────────────────────────────────────────────────────────

// All routes wrapped with SidebarLayout
const SIDEBAR_ROUTES: { path: string; component: React.ComponentType }[] = [
  // Overview
  { path: "/",       component: Dashboard },
  { path: "/upload", component: Home },

  // Deals & Pipeline
  { path: "/agents",                component: AgentsPage },
  { path: "/commission",            component: CommissionManagement },
  { path: "/net-commission-report", component: NetCommissionReportPage },
  { path: "/cda-builder",           component: CDABuilderPage },
  { path: "/cda-history",           component: CDAHistoryPage },
  { path: "/stuck-deals",           component: StuckDealsPage },
  { path: "/tasks",                 component: TasksPage },

  // Analytics
  { path: "/trends",      component: TrendsPage },
  { path: "/forecasting", component: ForecastingPage },
  { path: "/goals",       component: GoalsPage },
  { path: "/timeline",    component: TimelinePage },
  { path: "/velocity",    component: VelocityPage },
  { path: "/compare",     component: ComparePage },
  { path: "/comparison",  component: ComparisonPage },
  { path: "/market",      component: MarketPage },

  // Team & Growth
  { path: "/teams",           component: TeamsPage },
  { path: "/contests",        component: ContestsPage },
  { path: "/recruiting",      component: RecruitingPage },
  { path: "/retention",       component: RetentionPage },
  { path: "/lead-roi",        component: LeadROIPage },

  // Finance & Ops
  { path: "/agent-billing", component: AgentBillingPage },
  { path: "/quickbooks",    component: QuickBooksPage },
  { path: "/templates",     component: CommissionTemplates },

  // Reports & Admin
  { path: "/reporting",     component: ReportingComplete },
  { path: "/data-quality",  component: DataValidationRules },
  { path: "/audit-log",     component: AuditLog },
  { path: "/admin",         component: AdminDashboard },

  // Settings
  { path: "/settings", component: SettingsComplete },
];

/**
 * Full-page spinner shown while auth state is loading.
 */
function AuthLoadingSpinner() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

/**
 * ProtectedRoute — redirects to /login when not authenticated.
 * /upload is exempt so demo / CSV mode still works without an account.
 */
function ProtectedRoute({ component: Component, path }: { component: React.ComponentType; path: string }) {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  // /upload is the public demo / CSV entry point — never redirect
  const isPublicPath = path === '/upload';

  if (loading) return <AuthLoadingSpinner />;

  if (!isAuthenticated && !isPublicPath) {
    // Redirect to login; store intended destination
    navigate('/login');
    return null;
  }

  return (
    <SidebarLayout>
      <Component />
    </SidebarLayout>
  );
}

function Router() {
  return (
    <Switch>
      {/* All sidebar routes — protected except /upload (demo entry point) */}
      {SIDEBAR_ROUTES.map(({ path, component: Component }) => (
        <Route key={path} path={path}>
          <ProtectedRoute component={Component} path={path} />
        </Route>
      ))}

      {/* Auth routes */}
      <Route path="/login"  component={LoginPage} />
      <Route path="/signup" component={SignupPage} />

      {/* No-sidebar routes */}
      <Route path="/api/dotloop/callback" component={OAuthCallback} />
      <Route path="/dotloop/callback" component={DotloopOAuthCallback} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <TransactionDataProvider>
          <CDAProvider>
            <ModalProvider>
              <ThemeProvider defaultTheme="contrast" switchable={true}>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </ThemeProvider>
            </ModalProvider>
          </CDAProvider>
        </TransactionDataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
