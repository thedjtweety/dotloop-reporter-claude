import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ModalProvider } from "./contexts/ModalContext";
import { TransactionDataProvider } from "./contexts/TransactionDataContext";
import Home from "./pages/Home";

import AdminDashboard from "./pages/AdminDashboard";
import CreativeDashboard from "./pages/CreativeDashboard";
import PerformanceDashboard from "./pages/PerformanceDashboard";
import AuditLog from "./pages/AuditLog";
import RoleManagement from "./pages/RoleManagement";
import TenantSettings from "./pages/TenantSettings";
import CommissionManagement from "./pages/CommissionManagement";
import PerformanceTrendsPage from "./pages/PerformanceTrendsPage";
import BenchmarkComparisonPage from "./pages/BenchmarkComparisonPage";
import ManageDotloopConnections from "./pages/ManageDotloopConnections";
import OAuthCallback from "./pages/OAuthCallback";
import CommissionTemplates from "./pages/CommissionTemplates";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import SimpleCDABuilder from "./pages/SimpleCDABuilder";
import CDAHistory from "./pages/CDAHistory";
import UploadHistory from "./pages/UploadHistory";
import NetCommissionReportPage from "./pages/NetCommissionReportPage";


function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
       <Route path="/" component={Home} />

      <Route path="/admin" component={AdminDashboard} />
      <Route path="/audit-log" component={AuditLog} />
      <Route path="/roles" component={RoleManagement} />
      <Route path="/performance" component={PerformanceDashboard} />
      <Route path="/creative" component={CreativeDashboard} />
      <Route path="/settings" component={TenantSettings} />
      <Route path="/commission" component={CommissionManagement} />
      <Route path="/trends" component={PerformanceTrendsPage} />
      <Route path="/benchmarks" component={BenchmarkComparisonPage} />
      <Route path="/settings/dotloop" component={ManageDotloopConnections} />
      <Route path="/api/dotloop/callback" component={OAuthCallback} />
      <Route path="/commission-templates" component={CommissionTemplates} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/faq" component={FAQ} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/cda-builder" component={SimpleCDABuilder} />
      <Route path="/cda-history" component={CDAHistory} />
      <Route path="/uploads" component={UploadHistory} />
      <Route path="/net-commission-report" component={NetCommissionReportPage} />

      <Route path="{/404}" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <TransactionDataProvider>
        <ModalProvider>
          <ThemeProvider
            defaultTheme="dark"
            switchable={true}
          >
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </ModalProvider>
      </TransactionDataProvider>
    </ErrorBoundary>
  );
}

export default App;
