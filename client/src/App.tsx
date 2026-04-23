import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ModalProvider } from "./contexts/ModalContext";
import { TransactionDataProvider } from "./contexts/TransactionDataContext";
import Home from "./pages/Home";
import SidebarLayout from "./components/SidebarLayout";

// Existing pages
import OAuthCallback from "./pages/OAuthCallback";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import NetCommissionReportPage from "./pages/NetCommissionReportPage";
import SimpleCDABuilder from "./pages/SimpleCDABuilder";
import CDABuilderPage from "./pages/CDABuilderPage";
import CDAHistory from "./pages/CDAHistory";
import CDAHistoryPage from "./pages/CDAHistoryPage";
import CommissionManagement from "./pages/CommissionManagement";
import AuditLog from "./pages/AuditLog";

// New pages
import AgentsPage from "./pages/AgentsPage";
import ComparePage from "./pages/ComparePage";
import ComparisonPage from "./pages/ComparisonPage";
import TeamsPage from "./pages/TeamsPage";
import GoalsPage from "./pages/GoalsPage";
import TrendsPage from "./pages/TrendsPage";
import ContestsPage from "./pages/ContestsPage";
import ForecastingPage from "./pages/ForecastingPage";
import RecruitingPage from "./pages/RecruitingPage";
import MarketPage from "./pages/MarketPage";
import TimelinePage from "./pages/TimelinePage";
import SettingsPage from "./pages/SettingsPage";
import TeamManagementComplete from "./pages/TeamManagementComplete";
import SettingsComplete from "./pages/SettingsComplete";
import ReportingComplete from "./pages/ReportingComplete";
import DotloopOAuthCallback from "./pages/DotloopOAuthCallback";
import { CDAProvider } from "./contexts/CDAContext";
import { useTransactionData } from "./contexts/TransactionDataContext";

// Pages that use sidebar layout
const SIDEBAR_ROUTES = [
  { path: "/", component: Home },
  { path: "/agents", component: AgentsPage },
  { path: "/commission", component: CommissionManagement },
  { path: "/net-commission-report", component: NetCommissionReportPage },
  { path: "/cda-builder", component: CDABuilderPage },
  { path: "/cda-history", component: CDAHistoryPage },
  { path: "/compare", component: ComparePage },
  { path: "/comparison", component: ComparisonPage },
  { path: "/teams", component: TeamsPage },
  { path: "/team-management", component: TeamManagementComplete },
  { path: "/goals", component: GoalsPage },
  { path: "/trends", component: TrendsPage },
  { path: "/contests", component: ContestsPage },
  { path: "/forecasting", component: ForecastingPage },
  { path: "/recruiting", component: RecruitingPage },
  { path: "/market", component: MarketPage },
  { path: "/timeline", component: TimelinePage },
  { path: "/audit-log", component: AuditLog },
  { path: "/settings", component: SettingsComplete },
  { path: "/reporting", component: ReportingComplete },
];

function Router() {
  const { hasData } = useTransactionData();

  return (
    <Switch>
      {/* Routes with sidebar */}
      {SIDEBAR_ROUTES.map(({ path, component: Component }) => {
        // Home page doesn't show sidebar until data is loaded
        if (path === "/" && !hasData) {
          return (
            <Route key={path} path={path}>
              <Component />
            </Route>
          );
        }
        // All other routes or Home with data show sidebar
        return (
          <Route key={path} path={path}>
            <SidebarLayout>
              <Component />
            </SidebarLayout>
          </Route>
        );
      })}

      {/* Routes without sidebar */}
      <Route path="/api/dotloop/callback" component={OAuthCallback} />
      <Route path="/dotloop/callback" component={DotloopOAuthCallback} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <TransactionDataProvider>
        <CDAProvider>
        <ModalProvider>
          <ThemeProvider
            defaultTheme="contrast"
            switchable={true}
          >
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

export default App;
