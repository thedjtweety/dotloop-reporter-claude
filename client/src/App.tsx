import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ModalProvider } from "./contexts/ModalContext";
import { TransactionDataProvider } from "./contexts/TransactionDataContext";
import SidebarLayout from "./components/SidebarLayout";
import { CDAProvider } from "./contexts/CDAContext";

// ─── Pages ───────────────────────────────────────────────────────────────────

import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import PlaceholderPage from "./pages/PlaceholderPage";
import LeadROIPage from "./pages/LeadROIPage";
import StuckDealsPage from "./pages/StuckDealsPage";

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
import TeamManagementComplete from "./pages/TeamManagementComplete";

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
  { path: "/tasks",                 component: PlaceholderPage },

  // Analytics
  { path: "/trends",      component: TrendsPage },
  { path: "/forecasting", component: ForecastingPage },
  { path: "/goals",       component: GoalsPage },
  { path: "/timeline",    component: TimelinePage },
  { path: "/velocity",    component: PlaceholderPage },
  { path: "/compare",     component: ComparePage },
  { path: "/comparison",  component: ComparisonPage },
  { path: "/market",      component: MarketPage },

  // Team & Growth
  { path: "/teams",           component: TeamsPage },
  { path: "/contests",        component: ContestsPage },
  { path: "/recruiting",      component: RecruitingPage },
  { path: "/team-management", component: TeamManagementComplete },
  { path: "/retention",       component: PlaceholderPage },
  { path: "/lead-roi",        component: LeadROIPage },

  // Finance & Ops
  { path: "/agent-billing", component: PlaceholderPage },
  { path: "/quickbooks",    component: PlaceholderPage },
  { path: "/templates",     component: CommissionTemplates },

  // Reports & Admin
  { path: "/reporting",     component: ReportingComplete },
  { path: "/data-quality",  component: DataValidationRules },
  { path: "/audit-log",     component: AuditLog },
  { path: "/admin",         component: AdminDashboard },

  // Settings
  { path: "/settings", component: SettingsComplete },
];

function Router() {
  return (
    <Switch>
      {/* All sidebar routes */}
      {SIDEBAR_ROUTES.map(({ path, component: Component }) => (
        <Route key={path} path={path}>
          <SidebarLayout>
            <Component />
          </SidebarLayout>
        </Route>
      ))}

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
    </ErrorBoundary>
  );
}
