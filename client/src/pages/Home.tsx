/**
 * Dotloop Reporting Tool - Main Dashboard
 * 
 * Design: Modern Data-Driven Dashboard with Real Estate Focus
 * - Deep slate blue (#1e3a5f) for trust and professionalism
 * - Emerald green (#10b981) for positive metrics
 * - Clean, hierarchical layout with prominent metrics at top
 * - Interactive charts for pipeline, financial, and geographic analysis
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { globalRequestQueue, isRateLimitError } from '@/lib/requestQueue';
import RateLimitModal from '@/components/RateLimitModal';
import Footer from '@/components/Footer';
import { Upload, TrendingUp, Home as HomeIcon, DollarSign, Calendar, Percent, Settings, ArrowLeft, AlertCircle, Trophy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/formatUtils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRange } from 'react-day-picker';
import {
  parseCSV,
  calculateMetrics,
  getPipelineData,
  getLeadSourceData,
  getPropertyTypeData,
  getGeographicData,
  getSalesOverTime,
  calculateAgentMetrics,
  DotloopRecord,
  DashboardMetrics,
  AgentMetrics,
} from '@/lib/csvParser';
import { validateCSVFile, ValidationResult } from '@/lib/csvValidator';
import { applyPlansToAllAgents } from '@/lib/commissionCalculator';
import { PipelineFunnelChart } from '@/components/PipelineFunnelChart';
import { KPICard } from '@/components/KPICard';
import { PipelineDrillDownModal } from '@/components/PipelineDrillDownModal';
import { ValidationErrorDisplay } from '@/components/ValidationErrorDisplay';
import { UploadProgress, useUploadProgress } from '@/components/UploadProgress';
import { filterRecordsByDate, getPreviousPeriod } from '@/lib/dateUtils';
import { generateDashboardSparklineTrends } from '@/lib/sparklineTrendGenerator';
import { cleanDate, cleanNumber, cleanPercentage, cleanText } from '@/lib/dataCleaning';
import { findMatchingTemplate, saveTemplate } from '@/lib/importTemplates';
import { generateDemoData } from '@/lib/demoGenerator';
import { setupDemoPlanData } from '@/lib/demoPlanSetup';
import { getRecentFiles, saveRecentFile, deleteRecentFile } from '@/lib/storage';
import { saveUploadToIndexedDB, getAllUploadsFromIndexedDB, deleteUploadFromIndexedDB, StoredUpload } from '@/lib/indexedDbStorage';
import UploadZone from '@/components/UploadZone';
import CommissionProjector from '@/components/CommissionProjector';
import RecentUploads, { RecentFile } from '@/components/RecentUploads';
import UploadHistory from '@/components/UploadHistory';
import ConnectDotloop from '@/components/ConnectDotloop';
import { OnboardingChecklist } from '@/components/OnboardingChecklist';
import { CSVValidationReportModal } from '@/components/CSVValidationReportModal';
import MetricCard from '@/components/MetricCard';
import ProjectedToCloseCard from '@/components/ProjectedToCloseCard';
import EnhancedProjectedToClose from '@/components/EnhancedProjectedToClose';
import ColumnMapping from '@/components/ColumnMapping';
import FieldMapper, { ColumnMapping as FieldMapping } from '@/components/FieldMapper';
import { DatePickerWithRange } from '@/components/DateRangePicker';
import { normalizeRecord } from '@/lib/csvParser';
import InteractivePipelineChart from '@/components/charts/InteractivePipelineChart';
import ConversionTrendsChart from '@/components/charts/ConversionTrendsChart';
import PipelineChartDrillDown from '@/components/PipelineChartDrillDown';
import ChartDrillDown from '@/components/ChartDrillDown';
import FinancialChart from '@/components/charts/FinancialChart';
import CommissionBreakdownChart from '@/components/CommissionBreakdownChart';
import RevenueDistributionChart from '@/components/charts/RevenueDistributionChart';
import BuySellTrendChart from '@/components/charts/BuySellTrendChart';
import AgentMixChart from '@/components/charts/AgentMixChart';
import ComplianceChart from '@/components/charts/ComplianceChart';
import TagsChart from '@/components/charts/TagsChart';
import EnhancedPriceVsYearBuiltChart from '@/components/charts/EnhancedPriceVsYearBuiltChart';
import PriceReductionChart from '@/components/charts/PriceReductionChart';
import LeadSourceChart from '@/components/charts/LeadSourceChart';
import PropertyTypeChart from '@/components/charts/PropertyTypeChart';
import GeographicChart from '@/components/charts/GeographicChart';
import SalesTimelineChart from '@/components/charts/SalesTimelineChart';
import AgentLeaderboardWithExport from '@/components/AgentLeaderboardWithExport';
import DrillDownModal from '@/components/DrillDownModal';
import DataHealthCheck from '@/components/DataHealthCheck';
import CommissionPlansManager from '@/components/CommissionPlansManager';
import TeamManager from '@/components/TeamManager';
import AgentAssignment from '@/components/AgentAssignment';
import CommissionAuditReport from '@/components/CommissionAuditReport';
import CommissionManagementPanel from '@/components/CommissionManagementPanel';
import DataValidationReport from '@/components/DataValidationReport';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ModeToggle } from '@/components/ModeToggle';
import DotloopAccountSwitcher from '@/components/DotloopAccountSwitcher';
import ModernHeader from '@/components/ModernHeader';
import MetricCardModern from '@/components/MetricCardModern';
import TabAnimation from '@/components/TabAnimation';
import PerformanceBadge from '@/components/PerformanceBadge';
import MobileNav from '@/components/MobileNav';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import OnboardingTour from '@/components/OnboardingTour';
import { useOnboardingTour, uploadTourSteps, dashboardTourSteps } from '@/hooks/useOnboardingTour';
import { useTransactionData } from '@/contexts/TransactionDataContext';

import { FilterProvider, useFilters } from '@/contexts/FilterContext';
import FilterBadge from '@/components/FilterBadge';
import { validateCSVData, ValidationReport } from '@/lib/csvValidation';
import CSVValidationReport from '@/components/CSVValidationReport';
import DataQualityGuide from '@/components/DataQualityGuide';
import toast, { Toaster } from 'react-hot-toast';
// import SectionNav from '@/components/SectionNav'; // Removed floating navigation
import BackToTop from '@/components/BackToTop';
import CollapsibleSection from '@/components/CollapsibleSection';
import CSVPreparationGuide from '@/components/CSVPreparationGuide';
import { useMetricsOrder } from '@/hooks/useMetricsOrder';
import { DraggableMetricsContainer } from '@/components/DraggableMetricsContainer';
import { renderMetricCard } from '@/lib/metricRenderHelper';

function HomeContent() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error, isAuthenticated, logout } = useAuth();
  const { filters, addFilter } = useFilters();
  const { setTransactionData } = useTransactionData();

  const [location, setLocation] = useLocation();
  const { metricsOrder, isEditMode, isLoaded, reorderMetrics, resetToDefault, toggleEditMode } = useMetricsOrder();
  const { showTour, completeTour, skipTour } = useOnboardingTour();
  const [allRecords, setAllRecords] = useState<DotloopRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<DotloopRecord[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sparklineTrends, setSparklineTrends] = useState<any>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Rate limit modal state
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitRetryMs, setRateLimitRetryMs] = useState(0);
  const [queuedRequestCount, setQueuedRequestCount] = useState(0);
  
  // Drill-down state
  const [drillDownOpen, setDrillDownOpen] = useState(false);
  const [drillDownTitle, setDrillDownTitle] = useState('');
  const [drillDownTransactions, setDrillDownTransactions] = useState<DotloopRecord[]>([]);
  
  // Pipeline chart drill-down state
  const [pipelineDrillDownOpen, setPipelineDrillDownOpen] = useState(false);
  const [pipelineDrillDownStatus, setPipelineDrillDownStatus] = useState('');
  const [pipelineFullDetailsOpen, setPipelineFullDetailsOpen] = useState(false);
  
  // Helper function to open full details view from pipeline drill-down
  const openPipelineFullDetails = () => {
    setPipelineDrillDownOpen(false);
    setPipelineFullDetailsOpen(true);
  };
  
  // Generic chart drill-down state
  const [chartDrillDownOpen, setChartDrillDownOpen] = useState(false);
  const [chartDrillDownType, setChartDrillDownType] = useState<'leadSource' | 'propertyType' | 'geographic' | 'commission'>('leadSource');
  const [chartDrillDownValue, setChartDrillDownValue] = useState('');
  const [chartDrillDownTitle, setChartDrillDownTitle] = useState('');
  const [chartFullDetailsOpen, setChartFullDetailsOpen] = useState(false);
  
  // Analytics charts drill-down state
  const [analyticsDrillDownOpen, setAnalyticsDrillDownOpen] = useState(false);
  const [analyticsDrillDownTitle, setAnalyticsDrillDownTitle] = useState('');
  const [analyticsDrillDownTransactions, setAnalyticsDrillDownTransactions] = useState<DotloopRecord[]>([]);
  
  // Helper function to open chart drill-down
  const openChartDrillDown = (type: 'leadSource' | 'propertyType' | 'geographic' | 'commission', value: string, title: string) => {
    setChartDrillDownType(type);
    setChartDrillDownValue(value);
    setChartDrillDownTitle(title);
    setChartDrillDownOpen(true);
  };
  
  // Helper function to open full details view from chart drill-down
  const openChartFullDetails = () => {
    setChartDrillDownOpen(false);
    setChartFullDetailsOpen(true);
  };
  
  // Helper function to open analytics chart drill-down
  const openAnalyticsDrillDown = (title: string, transactions: DotloopRecord[]) => {
    setAnalyticsDrillDownTitle(title);
    setAnalyticsDrillDownTransactions(transactions);
    setAnalyticsDrillDownOpen(true);
  };

  // Import Wizard State
  const [showMapping, setShowMapping] = useState(false);
  const [showFieldMapper, setShowFieldMapper] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ headers: string[], data: any[][] } | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [customMapping, setCustomMapping] = useState<FieldMapping>({});
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [showConsultantConfirm, setShowConsultantConfirm] = useState(false);
  const [consultantRedirectData, setConsultantRedirectData] = useState<DotloopRecord[] | null>(null);
  
  // CSV Validation State
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  
  // Upload Progress State
  const [showProgress, setShowProgress] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadFileSize, setUploadFileSize] = useState('');
  const uploadProgress = useUploadProgress();
  const [showValidationReport, setShowValidationReport] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);

  // Commission Management Panel State
  const [commissionManagementTab, setCommissionManagementTab] = useState('plans');
  const [commissionManagementHighlightAgent, setCommissionManagementHighlightAgent] = useState<string | undefined>();

  // Pipeline Pulse Drill-Down State
  const [pipelinePulseModalOpen, setPipelinePulseModalOpen] = useState(false);
  const [pipelinePulseModalTitle, setPipelinePulseModalTitle] = useState('');
  const [pipelinePulseModalRecords, setPipelinePulseModalRecords] = useState<DotloopRecord[]>([]);
  const [pipelinePulseStageColor, setPipelinePulseStageColor] = useState('');

  // Projected to Close Period State
  const [selectedPeriod, setSelectedPeriod] = useState<'30' | '60' | '90'>('30');

  // Load saved mapping and recent files on mount
  const [showCSVGuide, setShowCSVGuide] = useState(false);

  // Setup request queue listener
  useEffect(() => {
    const unsubscribe = globalRequestQueue.onStatusChange((status) => {
      setQueuedRequestCount(status.queuedCount);
      if (status.currentRetryMs > 0) {
        setRateLimitRetryMs(status.currentRetryMs);
        setShowRateLimitModal(true);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('dotloop_field_mapping');
    if (saved) {
      try {
        setCustomMapping(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved mapping', e);
      }
    }

    // Load recent files from IndexedDB
    const loadRecentFiles = async () => {
      try {
        const uploads = await getAllUploadsFromIndexedDB();
        const recentFilesList = uploads.map((upload: StoredUpload) => ({
          id: upload.id,
          name: upload.fileName,
          date: new Date(upload.uploadDate).toLocaleDateString(),
          recordCount: upload.recordCount,
          data: upload.data,
        }));
        setRecentFiles(recentFilesList);
      } catch (error) {
        console.error('[Home] Failed to load uploads from IndexedDB:', error);
      }
    };
    loadRecentFiles();
  }, []);

  // Check for extension data on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');

    if (source === 'extension') {
      console.log('[Dashboard] Extension source detected, checking for data...');
      
      // Check URL hash for base64-encoded data
      const hash = window.location.hash;
      const dataMatch = hash.match(/data=([^&]+)/);
      
      if (dataMatch && dataMatch[1]) {
        try {
          // Decode base64 data
          const base64Data = dataMatch[1];
          const jsonString = decodeURIComponent(escape(atob(base64Data)));
          const extensionData = JSON.parse(jsonString);
          
          console.log('[Dashboard] Extension data found:', extensionData);
          
          if (extensionData.transactions && extensionData.transactions.length > 0) {
            // Process the transactions
            const records = extensionData.transactions.map((t: any) => normalizeRecord(t)).filter((r: any) => r !== null) as DotloopRecord[];
            
            console.log(`[Dashboard] Loaded ${records.length} transactions from extension`);
            
            // Set the data
            setAllRecords(records);
            setFilteredRecords(records);
            setMetrics(calculateMetrics(records));
            const metrics = calculateAgentMetrics(records);
            setAgentMetrics(applyPlansToAllAgents(metrics, records));
            
            // Show success toast
            toast.success(`✅ Loaded ${records.length} transactions from Dotloop Extension!`, {
              duration: 5000,
              position: 'top-center',
            });
            
            // Clean up URL (remove hash and source parameter)
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            console.warn('[Dashboard] Extension data found but no transactions');
            toast.error('No transactions found in extension data', {
              duration: 4000,
              position: 'top-center',
            });
          }
        } catch (error) {
          console.error('[Dashboard] Error parsing extension data:', error);
          toast.error('Error loading data from extension. Please try again.', {
            duration: 4000,
            position: 'top-center',
          });
        }
      } else {
        console.warn('[Dashboard] Extension source detected but no data in URL hash');
        toast.error('No data received from extension. Please try extracting again.', {
          duration: 4000,
          position: 'top-center',
        });
      }
    }
  }, []);



  const handleSaveRecent = async (name: string, records: DotloopRecord[]) => {
    try {
      const upload: StoredUpload = {
        id: `upload-${Date.now()}`,
        fileName: name,
        uploadDate: Date.now(),
        recordCount: records.length,
        data: records,
      };
      await saveUploadToIndexedDB(upload);
      const uploads = await getAllUploadsFromIndexedDB();
      const recentFilesList = uploads.map((u: StoredUpload) => ({
        id: u.id,
        name: u.fileName,
        date: new Date(u.uploadDate).toLocaleDateString(),
        recordCount: u.recordCount,
        data: u.data,
      }));
      setRecentFiles(recentFilesList);
    } catch (e) {
      console.error('Failed to save recent file', e);
    }
  };

  const handleRecentSelect = (file: RecentFile) => {
    setAllRecords(file.data);
    setFilteredRecords(file.data);
    const calculatedMetrics = calculateMetrics(file.data);
    setMetrics(calculatedMetrics);
    const metrics1 = calculateAgentMetrics(file.data);
    const agentMetricsWithPlans = applyPlansToAllAgents(metrics1, file.data);
    setAgentMetrics(agentMetricsWithPlans);
    setTransactionData({
      allRecords: file.data,
      filteredRecords: file.data,
      metrics: calculatedMetrics,
      agentMetrics: agentMetricsWithPlans,
      fileName: uploadFileName || 'Uploaded CSV',
    });
  };

  const handleRecentDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteUploadFromIndexedDB(id);
      const updated = recentFiles.filter(f => f.id !== id);
      setRecentFiles(updated);
    } catch (error) {
      console.error('[Home] Failed to delete upload:', error);
    }
  };

  const handleDemoMode = () => {
    setIsLoading(true);
    setTimeout(() => {
      const { data: sampleData, stats } = generateDemoData({ complexity: 'random' });
      
      // Note: Demo data is kept in memory only (not stored in localStorage) to avoid quota issues
      // CommissionCalculator accesses data from component state instead
      
      // Setup demo commission plans and agent assignments
      const { plans, assignments } = setupDemoPlanData(sampleData);
      console.log(`✅ Demo setup: ${plans.length} plans, ${assignments.length} agents assigned`);
      console.log(`🎯 Demo Generated [${stats.complexity}]:\n  📊 ${stats.agentCount} agents | ${stats.transactionCount} transactions\n  💰 $${stats.totalGCI.toLocaleString()} GCI | $${stats.totalVolume.toLocaleString()} volume\n  🌎 ${stats.stateCount} states | ${stats.propertyTypeCount} property types\n  📅 ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
      setAllRecords(sampleData);
      setFilteredRecords(sampleData);
      const calculatedMetrics = calculateMetrics(sampleData);
      setMetrics(calculatedMetrics);
      const metrics2 = calculateAgentMetrics(sampleData);
      const agentMetricsWithPlans = applyPlansToAllAgents(metrics2, sampleData);
      setAgentMetrics(agentMetricsWithPlans);
      setTransactionData({
        allRecords: sampleData,
        filteredRecords: sampleData,
        metrics: calculatedMetrics,
        agentMetrics: agentMetricsWithPlans,
        isDemoMode: true,
      });
      setIsLoading(false);
    }, 1500);
  };

  // Update metrics when date range, records, or filters change
  useEffect(() => {
    if (allRecords.length === 0) return;

    let currentRecords = allRecords;
    let previousRecords: DotloopRecord[] | undefined;

    // Apply date range filter
    if (dateRange?.from && dateRange?.to) {
      currentRecords = filterRecordsByDate(allRecords, { from: dateRange.from, to: dateRange.to });
      
      const prevRange = getPreviousPeriod({ from: dateRange.from, to: dateRange.to });
      previousRecords = filterRecordsByDate(allRecords, prevRange);
    }

    // Apply chart drill-down filters
    filters.forEach(filter => {
      switch (filter.type) {
        case 'pipeline':
          currentRecords = currentRecords.filter(r => r.loopStatus === filter.value);
          break;
        case 'leadSource':
          currentRecords = currentRecords.filter(r => (r.leadSource || 'Unknown') === filter.value);
          break;
        case 'propertyType':
          currentRecords = currentRecords.filter(r => (r.transactionType || 'Unknown') === filter.value);
          break;
        case 'geographic':
          currentRecords = currentRecords.filter(r => (r.state || 'Unknown') === filter.value);
          break;
      }
    });

    setFilteredRecords(currentRecords);
    setMetrics(calculateMetrics(currentRecords, previousRecords));
    // Calculate agent metrics and apply commission plans for recalculation
    const baseMetrics = calculateAgentMetrics(currentRecords);
    const metricsWithPlans = applyPlansToAllAgents(baseMetrics, currentRecords);
    setAgentMetrics(metricsWithPlans);
    setSparklineTrends(generateDashboardSparklineTrends(currentRecords, dateRange));
  }, [allRecords, dateRange, filters]);

  // Handle metric card clicks - opens modal with deal details
  // Pipeline Pulse handler
  const handlePipelineStageClick = (stage: any) => {
    setPipelinePulseModalTitle(stage.label);
    setPipelinePulseModalRecords(stage.records);
    setPipelinePulseStageColor(stage.color);
    setPipelinePulseModalOpen(true);
  };

  const handleMetricClick = (type: 'total' | 'volume' | 'closing' | 'days' | 'active' | 'contract' | 'closed' | 'archived') => {
    let filtered: DotloopRecord[] = [];
    let title = '';

    switch (type) {
      case 'total':
        title = 'All Transactions';
        filtered = filteredRecords;
        break;
      case 'volume':
        title = 'Sales Volume Breakdown';
        filtered = filteredRecords.filter(r => (r.salePrice || r.price) > 0).sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
        break;
      case 'closing':
        title = 'Closed Deals';
        filtered = filteredRecords.filter(r => r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
        break;
      case 'days':
        title = 'Days to Close Analysis';
        filtered = filteredRecords.filter(r => r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
        break;
      case 'active':
        title = 'Active Listings';
        filtered = filteredRecords.filter(r => r.loopStatus?.toLowerCase().includes('active'));
        break;
      case 'contract':
        title = 'Under Contract';
        filtered = filteredRecords.filter(r => r.loopStatus?.toLowerCase().includes('contract') || r.loopStatus?.toLowerCase().includes('pending'));
        break;
      case 'closed':
        title = 'Closed Deals';
        filtered = filteredRecords.filter(r => r.loopStatus?.toLowerCase().includes('closed') || r.loopStatus?.toLowerCase().includes('sold'));
        break;
      case 'archived':
        title = 'Archived Loops';
        filtered = filteredRecords.filter(r => r.loopStatus?.toLowerCase().includes('archived'));
        break;
    }

    setDrillDownTitle(title);
    setDrillDownTransactions(filtered);
    setDrillDownOpen(true);
  };

  // Handle chart segment clicks - applies drill-down filters
  const handleChartClick = (type: 'pipeline' | 'leadSource' | 'propertyType' | 'geographic' | 'commission', label: string) => {
    let title = '';

    switch (type) {
      case 'pipeline':
        title = `Pipeline: ${label}`;
        addFilter({ type: 'pipeline', label: title, value: label });
        toast.success(`🔍 Now filtering by: ${label}`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            padding: '16px',
          },
        });
        break;
      case 'leadSource':
        title = `Lead Source: ${label}`;
        addFilter({ type: 'leadSource', label: title, value: label });
        toast.success(`🔍 Now filtering by lead source: ${label}`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            padding: '16px',
          },
        });
        break;
      case 'propertyType':
        title = `Property Type: ${label}`;
        addFilter({ type: 'propertyType', label: title, value: label });
        toast.success(`🔍 Now filtering by property type: ${label}`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            padding: '16px',
          },
        });
        break;
      case 'geographic':
        title = `State: ${label}`;
        addFilter({ type: 'geographic', label: title, value: label });
        toast.success(`🔍 Now filtering by state: ${label}`, {
          duration: 3000,
          position: 'top-center',
          style: {
            background: '#3b82f6',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: '14px',
            padding: '16px',
          },
        });
        break;
      case 'commission':
        title = `Commission Range: ${label}`;
        // Logic for commission range filtering would go here
        break;
    }
  };

  // Client-side only - no database persistence needed

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    
    // Show progress dialog for files > 1MB
    const shouldShowProgress = file.size > 1024 * 1024; // 1MB
    if (shouldShowProgress) {
      setUploadFileName(file.name);
      setUploadFileSize(formatBytes(file.size));
      setShowProgress(true);
      uploadProgress.reset();
    }
    
    // Track performance metrics
    const performanceMetrics = {
      fileSize: file.size,
      validationTimeMs: 0,
      parsingTimeMs: 0,
      totalTimeMs: 0,
    };
    const overallStartTime = Date.now();
    
    try {
      // Step 1: Validate the CSV file
      if (shouldShowProgress) {
        uploadProgress.startStage('validation', 'Checking file format and structure...');
      }
      
      const validationStartTime = Date.now();
      const validationResult = await validateCSVFile(file, (progress, message) => {
        if (shouldShowProgress) {
          uploadProgress.updateProgress('validation', progress, message);
        }
      });
      performanceMetrics.validationTimeMs = Date.now() - validationStartTime;
      
      // If validation fails with critical errors, show error display
      if (!validationResult.isValid) {
        if (shouldShowProgress) {
          uploadProgress.errorStage('validation', 'Validation failed');
          setTimeout(() => {
            setShowProgress(false);
            setValidationResult(validationResult);
            setShowValidationError(true);
          }, 1000);
        } else {
          setValidationResult(validationResult);
          setShowValidationError(true);
        }
        setIsLoading(false);
        return;
      }
      
      if (shouldShowProgress) {
        uploadProgress.completeStage('validation', 'Validation passed');
      }
      
      // If there are warnings, show them but continue
      if (validationResult.warnings.length > 0) {
        console.warn('CSV validation warnings:', validationResult.warnings);
      }
      
      // Step 2: Parse the CSV
      if (shouldShowProgress) {
        uploadProgress.startStage('parsing', 'Reading CSV data...');
      }
      
      const parsingStartTime = Date.now();
      const text = await file.text();
      const records = parseCSV(text, (progress, message) => {
        if (shouldShowProgress) {
          uploadProgress.updateProgress('parsing', progress, message);
        }
      });
      performanceMetrics.parsingTimeMs = Date.now() - parsingStartTime;
      
      if (shouldShowProgress) {
        uploadProgress.completeStage('parsing', `Parsed ${records.length} records`);
      }
      
      // Step 3: Complete - no database upload needed for MVP
      if (shouldShowProgress) {
        uploadProgress.startStage('upload', 'Processing complete');
        uploadProgress.completeStage('upload', 'Ready to analyze');
      }
      
      performanceMetrics.totalTimeMs = Date.now() - overallStartTime;
      
      // Generate validation report
      const report = validateCSVData(file.name, records);
      setValidationReport(report);
      setShowValidationReport(true);
      
      // Process the records for immediate display
      setAllRecords(records);
      setFilteredRecords(records);
      setMetrics(calculateMetrics(records));
      const metrics3 = calculateAgentMetrics(records);
      setAgentMetrics(applyPlansToAllAgents(metrics3, records));
      setIsLoading(false);
      
      // Save to recent files (localStorage)
      await handleSaveRecent(file.name, records);
      
      // Hide progress dialog after a short delay
      if (shouldShowProgress) {
        setTimeout(() => {
          setShowProgress(false);
        }, 2000);
      }
      
    } catch (error) {
      console.error('Error parsing CSV:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Check for rate limit error
      if (errorMessage.includes('Rate limit exceeded') || errorMessage.includes('TOO_MANY_REQUESTS')) {
        if (shouldShowProgress) {
          const activeStage = uploadProgress.stages.find(s => s.status === 'in-progress');
          if (activeStage) {
            uploadProgress.errorStage(activeStage.id, 'Rate limit exceeded');
          }
        }
        // Show user-friendly rate limit message
        alert('You have reached the upload limit. Please wait a moment and try again.\n\n' + errorMessage);
      } else {
        if (shouldShowProgress) {
          const activeStage = uploadProgress.stages.find(s => s.status === 'in-progress');
          if (activeStage) {
            uploadProgress.errorStage(activeStage.id, errorMessage);
          }
        }
      }
      
      setIsLoading(false);
      // Show error toast
    }
  };
  
  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const processWithMapping = (data: any[], mapping: FieldMapping) => {
    const processed = data.map(row => {
      const newRow: any = { ...row };
      
      // Apply mapping
      Object.entries(mapping).forEach(([standardField, csvHeader]) => {
        if (csvHeader && row[csvHeader] !== undefined) {
          newRow[standardField] = row[csvHeader];
        }
      });

      return normalizeRecord(newRow);
    }).filter((record): record is DotloopRecord => record !== null);

    setAllRecords(processed);
    setFilteredRecords(processed);
    setMetrics(calculateMetrics(processed));
    const metrics4 = calculateAgentMetrics(processed);
    setAgentMetrics(applyPlansToAllAgents(metrics4, processed));
    setIsLoading(false);
    setShowMapping(false);
    setShowFieldMapper(false);
  };

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background flex flex-col pb-16">
        <ModernHeader dateRange={dateRange} setDateRange={setDateRange} title="Dotloop Reporter" onDemoClick={handleDemoMode} isDemoLoading={isLoading} />

        <main className="flex-1 container flex items-center justify-center py-8">
          <div className="w-full max-w-6xl space-y-8">
            <div className="space-y-4 text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl">
                Transform Your Data into <span className="text-primary">Actionable Insights</span>
              </h2>
              <p className="text-lg text-foreground max-w-3xl mx-auto">
                Upload your Dotloop export or connect directly to Dotloop to instantly generate professional commission reports, agent leaderboards, and financial analytics.
              </p>
            </div>

            {/* Onboarding Checklist */}
            <OnboardingChecklist />

            {/* Dual-column layout: CSV Upload (left) and Data Quality Tips (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: CSV Upload */}
              <div className="space-y-4">
                <div className="text-center lg:text-left">
                  <h3 className="text-xl font-semibold mb-2">Upload CSV File</h3>
                  <p className="text-sm text-foreground/70 mb-4">
                    Upload a Dotloop export CSV file to analyze your data
                  </p>
                </div>
                <Card className="p-8 border-dashed border-2 border-border bg-card/50 hover:bg-card/80 transition-colors" data-tour="upload-zone">
                  <UploadZone onFileUpload={handleFileUpload} isLoading={isLoading} />
                </Card>
              </div>

              {/* Right Column: Data Quality Tips */}
              <div>
                <DataQualityGuide onOpenGuide={() => setShowCSVGuide(true)} />
              </div>
            </div>
            
            {/* Show Upload History to all users */}
            <div className="mt-12 text-left">
              <UploadHistory 
                onSelectUpload={(file) => {
                  handleRecentSelect(file);
                }}
                currentUploadId={recentFiles.find(f => f.data === allRecords)?.id}
              />
            </div>
            {recentFiles.length > 0 && (
              <div className="mt-12 text-left">
                <RecentUploads 
                  files={recentFiles} 
                  onSelect={handleRecentSelect} 
                  onDelete={handleRecentDelete} 
                />
              </div>
            )}
          </div>
        </main>

        {/* Upload Progress Dialog */}
        <Dialog open={showProgress} onOpenChange={setShowProgress}>
          <DialogContent className="max-w-2xl">
            <UploadProgress
              stages={uploadProgress.stages}
              fileName={uploadFileName}
              fileSize={uploadFileSize}
              onCancel={() => {
                setShowProgress(false);
                setIsLoading(false);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* CSV Validation Report Dialog */}
        <Dialog open={showValidationReport} onOpenChange={setShowValidationReport}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {validationReport && (
              <CSVValidationReport
                report={validationReport}
                onProceed={() => setShowValidationReport(false)}
                onReview={() => {
                  // Could open detailed review modal if needed
                  console.log('Review validation details');
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* CSV Validation Error Dialog */}
        <Dialog open={showValidationError} onOpenChange={setShowValidationError}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            {validationResult && (
              <ValidationErrorDisplay
                validationResult={validationResult}
                onRetry={() => {
                  setShowValidationError(false);
                  setValidationResult(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Mapping Dialogs */}
        <AlertDialog open={showMapping} onOpenChange={setShowMapping}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Map Your CSV Columns</AlertDialogTitle>
              <AlertDialogDescription>
                We noticed some standard fields are missing. Would you like to map your CSV columns to our standard fields?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowMapping(false);
                processWithMapping(pendingFile?.data || [], {});
              }}>
                Skip (Use Defaults)
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowMapping(false);
                setShowFieldMapper(true);
              }}>
                Start Mapping
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Field Mapper Dialog - Wrapped in Dialog to match props */}
        <Dialog open={showFieldMapper} onOpenChange={setShowFieldMapper}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
            <FieldMapper
              headers={csvHeaders}
              onSave={(mapping) => {
                setCustomMapping(mapping);
                localStorage.setItem('dotloop_field_mapping', JSON.stringify(mapping));
                if (pendingFile) {
                  processWithMapping(pendingFile.data, mapping);
                }
              }}
              onCancel={() => setShowFieldMapper(false)}
              initialMapping={customMapping}
            />
          </DialogContent>
        </Dialog>

        {/* CSV Preparation Guide Modal */}
        <CSVPreparationGuide isOpen={showCSVGuide} onClose={() => setShowCSVGuide(false)} />
        <CSVValidationReportModal
          isOpen={showValidationReport}
          report={validationReport}
          onClose={() => setShowValidationReport(false)}
          onProceed={() => setShowValidationReport(false)}
        />

        {/* Legal Footer */}
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />
      {/* Rate Limit Modal */}
      <RateLimitModal
        isOpen={showRateLimitModal}
        retryAfterMs={rateLimitRetryMs}
        queuedRequests={queuedRequestCount}
        onClose={() => setShowRateLimitModal(false)}
      />
      {/* <SectionNav /> - Removed floating navigation */}
      <BackToTop />
      <ModernHeader dateRange={dateRange} setDateRange={setDateRange} title="Dotloop Reporter" onDemoClick={handleDemoMode} isDemoLoading={isLoading} />

      {/* Main Dashboard */}
      <main className="container py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8">
        {/* Filter Badge */}
        <FilterBadge />
        
        {/* Pipeline Pulse Dashboard */}
        {metrics && filteredRecords.length > 0 && (
          <div className="mb-12 space-y-8" data-tour="pipeline-pulse">
            {/* KPI Cards Row - Modern Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              <MetricCardModern
                icon={<TrendingUp className="w-5 h-5 text-accent" />}
                title="Total Transactions"
                value={metrics.totalTransactions.toLocaleString()}
                trend={{
                  value: metrics.trends?.totalTransactions?.value || 0,
                  isPositive: (metrics.trends?.totalTransactions?.direction === 'up') || false,
                  label: 'vs previous'
                }}
                status="active"
                onClick={() => handleMetricClick('total')}
              />
              <MetricCardModern
                icon={<DollarSign className="w-5 h-5 text-accent" />}
                title="Total Sales Volume"
                value={formatCurrency(metrics.totalSalesVolume)}
                trend={{
                  value: metrics.trends?.totalVolume?.value || 0,
                  isPositive: (metrics.trends?.totalVolume?.direction === 'up') || false,
                  label: 'vs previous'
                }}
                status="active"
                onClick={() => handleMetricClick('volume')}
              />
              <MetricCardModern
                icon={<CheckCircle className="w-5 h-5 text-accent" />}
                title="Closing Rate"
                value={formatPercentage(metrics.closingRate)}
                trend={{
                  value: metrics.trends?.closingRate?.value || 0,
                  isPositive: (metrics.trends?.closingRate?.direction === 'up') || false,
                  label: 'vs previous'
                }}
                status="active"
                onClick={() => handleMetricClick('closing')}
              />
              <MetricCardModern
                icon={<Calendar className="w-5 h-5 text-accent" />}
                title="Pipeline Status"
                value={`${metrics.activeListings + metrics.underContract}`}
                trend={{
                  value: ((metrics.activeListings + metrics.underContract) / metrics.totalTransactions * 100),
                  isPositive: true,
                  label: 'active'
                }}
                status="pending"
                onClick={() => handleMetricClick('active')}
              />
            </div>

            {/* Pipeline Funnel Chart & Projected to Close - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Left: Pipeline Breakdown */}
              <div>
                <PipelineFunnelChart
                  records={filteredRecords}
                  onStageClick={handlePipelineStageClick}
                />
              </div>
              
              {/* Right: Projected to Close with Drill-Down */}
              {filteredRecords.length > 0 && metrics && (
                <ProjectedToCloseCard
                  records={filteredRecords}
                />
              )}
            </div>
          </div>
        )}

        {/* Pipeline Drill-Down Modal */}
        <PipelineDrillDownModal
          isOpen={pipelinePulseModalOpen}
          onClose={() => setPipelinePulseModalOpen(false)}
          title={pipelinePulseModalTitle}
          records={pipelinePulseModalRecords}
          stageColor={pipelinePulseStageColor}
          onAgentClick={(agentName) => {
            // Handle agent click - could add agent filter here in future
            console.log('Agent clicked:', agentName);
          }}
        />

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Metrics Order?</AlertDialogTitle>
              <AlertDialogDescription>
                This will restore the metrics to their default order. Your custom arrangement will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetToDefault();
                  setShowResetConfirm(false);
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



        {/* Net Commission Report Featured Card */}
        {metrics && (
          <div className="mb-12 mt-6">
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 active:scale-[0.99] bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30"
              onClick={() => setLocation('/net-commission-report')}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground">
                      Net Commission Report
                    </h3>
                  </div>
                  <p className="text-foreground/70 text-base md:text-lg ml-17">
                    View detailed commission breakdown for all agents with transaction-level analysis
                  </p>
                </div>
                <div className="hidden md:flex items-center justify-center ml-6">
                  <TrendingUp className="w-12 h-12 text-primary/40" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Status Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 landscape:grid-cols-4 gap-3 landscape:gap-4 mb-12 mt-12">
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 active:scale-[0.99]"
            onClick={() => handleMetricClick('active')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Active Listings</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {metrics.activeListings}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-amber-500/50 active:scale-[0.99]"
            onClick={() => handleMetricClick('contract')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground font-medium">Under Contract</p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {metrics.underContract}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Percent className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-green-500/50 active:scale-[0.99]"
            onClick={() => handleMetricClick('closed')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground dark:text-white font-medium">Closed</p>
                <p className="text-2xl font-display font-bold text-foreground dark:text-white">
                  {metrics.closed}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 dark:bg-green-500/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-gray-400/50 active:scale-[0.99]"
            onClick={() => handleMetricClick('archived')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground dark:text-white font-medium">Archived</p>
                <p className="text-2xl font-display font-bold text-foreground dark:text-white">
                  {metrics.archived}
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <HomeIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div data-section="charts" data-tour="charts">
          <CollapsibleSection title="Analytics Charts" icon={<TrendingUp className="w-6 h-6" />}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-10 mb-6 h-auto">
              <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="leadsource">Lead Source</TabsTrigger>
              <TabsTrigger value="property">Property Type</TabsTrigger>
              <TabsTrigger value="geographic">Geographic</TabsTrigger>
              {metrics?.hasFinancialData && (
                <TabsTrigger value="financial">Financial</TabsTrigger>
              )}
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="health">Data Health</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold flex gap-1 items-center">
                <Settings className="w-3 h-3" /> Settings
              </TabsTrigger>
            </TabsList>

            <TabAnimation isVisible={activeTab === 'pipeline'} duration={400}>
            <TabsContent value="pipeline" className="space-y-4">
              <Card className="p-6 bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Pipeline Breakdown
                  </h2>
                  <PerformanceBadge lastUpdated={new Date()} processingTimeMs={245} />
                </div>
                <InteractivePipelineChart 
                  data={allRecords}
                />
              </Card>
              
              <Card className="p-6 bg-card border border-border">
                <ConversionTrendsChart data={allRecords} />
              </Card>
            </TabsContent>
            </TabAnimation>

            <TabAnimation isVisible={activeTab === 'timeline'} duration={400}>
            <TabsContent value="timeline" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-display font-bold text-foreground">
                      Sales Volume Over Time
                    </h2>
                    <PerformanceBadge lastUpdated={new Date()} processingTimeMs={312} />
                  </div>
                  <SalesTimelineChart 
                    data={getSalesOverTime(filteredRecords)}
                    allRecords={filteredRecords}
                    onDataPointClick={(month, records) => {
                      openAnalyticsDrillDown(`Sales Volume: ${month}`, records);
                    }}
                  />
                </Card>
                <Card className="p-6 bg-card border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-display font-bold text-foreground">
                      Buy vs Sell Trends
                    </h2>
                    <PerformanceBadge lastUpdated={new Date()} processingTimeMs={198} />
                  </div>
                  <BuySellTrendChart 
                    data={filteredRecords}
                    onDataPointClick={(month, buySideDeals, sellSideDeals) => {
                      const allDeals = [...buySideDeals, ...sellSideDeals];
                      openAnalyticsDrillDown(`Buy vs Sell: ${month}`, allDeals);
                    }}
                  />
                </Card>
              </div>
            </TabsContent>
            </TabAnimation>

            <TabAnimation isVisible={activeTab === 'leadsource'} duration={400}>
            <TabsContent value="leadsource" className="space-y-4">
              <Card className="p-6 bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Lead Source Performance
                  </h2>
                  <PerformanceBadge lastUpdated={new Date()} processingTimeMs={156} />
                </div>
                <LeadSourceChart 
                  data={getLeadSourceData(allRecords)} 
                  onSliceClick={(label) => openChartDrillDown('leadSource', label, `Lead Source: ${label}`)}
                />
              </Card>
            </TabsContent>
            </TabAnimation>

            <TabAnimation isVisible={activeTab === 'property'} duration={400}>
            <TabsContent value="property" className="space-y-4">
              <Card className="p-6 bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Property Type Distribution
                  </h2>
                  <PerformanceBadge lastUpdated={new Date()} processingTimeMs={189} />
                </div>
                <PropertyTypeChart 
                  data={getPropertyTypeData(allRecords)} 
                  onBarClick={(label) => openChartDrillDown('propertyType', label, `Property Type: ${label}`)}
                />
              </Card>
            </TabsContent>
            </TabAnimation>

            <TabAnimation isVisible={activeTab === 'geographic'} duration={400}>
            <TabsContent value="geographic" className="space-y-4">
              <Card className="p-6 bg-card border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-display font-bold text-foreground">
                    Geographic Distribution
                  </h2>
                  <PerformanceBadge lastUpdated={new Date()} processingTimeMs={267} />
                </div>
                <GeographicChart 
                  data={getGeographicData(allRecords)} 
                  onBarClick={(label) => openChartDrillDown('geographic', label, `Location: ${label}`)}
                  transactions={allRecords}
                />
              </Card>
            </TabsContent>
            </TabAnimation>

            {metrics?.hasFinancialData && (
              <>
                <TabAnimation isVisible={activeTab === 'financial'} duration={400}>
                <TabsContent value="financial" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-card border border-border">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-display font-bold text-foreground">
                          Revenue Overview
                        </h2>
                        <PerformanceBadge lastUpdated={new Date()} processingTimeMs={334} />
                      </div>
                      <FinancialChart metrics={metrics} />
                    </Card>
                    <Card className="p-6 bg-card border border-border">
                      <h2 className="text-xl font-display font-bold text-foreground mb-4">
                        Commission Breakdown
                      </h2>
                      <CommissionBreakdownChart 
                        buySide={filteredRecords.reduce((sum, r) => sum + (r.buySideCommission || 0), 0)}
                        sellSide={filteredRecords.reduce((sum, r) => sum + (r.sellSideCommission || 0), 0)}
                        onSliceClick={(type: string) => openChartDrillDown('commission', type, `Commission: ${type}`)}
                      />
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-card border border-border">
                      <h2 className="text-xl font-display font-bold text-foreground mb-4">
                        Revenue Distribution
                      </h2>
                      <RevenueDistributionChart 
                        totalCommission={metrics.totalCommission}
                        companyDollar={metrics.totalCompanyDollar}
                      />
                    </Card>
                    <Card className="p-6 bg-card border border-border">
                      <h2 className="text-xl font-display font-bold text-foreground mb-4">
                        Agent Mix
                      </h2>
                      <AgentMixChart agents={agentMetrics} />
                    </Card>
                  </div>
                </TabsContent>
                </TabAnimation>
              </>
            )}

            <TabAnimation isVisible={activeTab === 'insights'} duration={400}>
            <TabsContent value="insights" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-card border border-border">
                  <h2 className="text-xl font-display font-bold text-foreground mb-4">
                    Market Insights
                  </h2>
                  <EnhancedPriceVsYearBuiltChart data={filteredRecords} />
                </Card>
                <Card className="p-6 bg-card border border-border">
                  <h2 className="text-xl font-display font-bold text-foreground mb-4">
                    Price Reduction Analysis
                  </h2>
                  <PriceReductionChart data={filteredRecords} />
                </Card>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-card border border-border">
                  <h2 className="text-xl font-display font-bold text-foreground mb-4">
                    Compliance Status
                  </h2>
                  <ComplianceChart data={filteredRecords} />
                </Card>
                <Card className="p-6 bg-card border border-border">
                  <h2 className="text-xl font-display font-bold text-foreground mb-4">
                    Tag Analysis
                  </h2>
                  <TagsChart data={filteredRecords} />
                </Card>
              </div>
            </TabsContent>
            </TabAnimation>

            <TabAnimation isVisible={activeTab === 'health'} duration={400}>
            <TabsContent value="health" className="space-y-4">
              <DataHealthCheck records={allRecords} />
              <DataValidationReport 
                records={allRecords} 
                onConfirm={() => {
                  // Just switch to pipeline tab as "confirm" action
                  setActiveTab('pipeline');
                }}
                onCancel={() => {
                  setMetrics(null);
                  setAllRecords([]);
                  setFilteredRecords([]);
                }}
              />
            </TabsContent>
            </TabAnimation>

            <TabAnimation isVisible={activeTab === 'settings'} duration={400}>
            <TabsContent value="settings" className="space-y-4">
              <Card className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Settings</h3>
                  <p className="text-sm text-muted-foreground">Manage your account and application settings.</p>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <p>Settings functionality coming soon</p>
                </div>
              </Card>
            </TabsContent>
            </TabAnimation>
          </Tabs>
          </CollapsibleSection>
        </div>

        {/* Agent Leaderboard Section */}
        {agentMetrics.length > 0 && (
          <div data-section="leaderboard" data-tour="leaderboard">
            <CollapsibleSection title="Agent Performance Leaderboard" icon={<Trophy className="w-6 h-6" />}>
              <AgentLeaderboardWithExport 
                agents={agentMetrics} 
                records={filteredRecords}
                onNavigateToAssignAgent={(agentName) => {
                  setCommissionManagementTab('assignments');
                  setCommissionManagementHighlightAgent(agentName);
                  const element = document.querySelector('[data-section="commission-management"]');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                onAgentDrillDown={(agentName, transactions) => {
                  setPipelinePulseModalOpen(true);
                  setPipelinePulseModalTitle(agentName + "'s Transactions");
                  setPipelinePulseModalRecords(transactions);
                  setPipelinePulseStageColor('#3b82f6');
                }}
              />
            </CollapsibleSection>
          </div>
        )}

        {/* Commission Management Panel */}
        <div data-section="commission-management">
          <CommissionManagementPanel 
            records={filteredRecords} 
            hasData={filteredRecords.length > 0}
            initialTab={commissionManagementTab}
            highlightAgent={commissionManagementHighlightAgent}
            onTabChange={setCommissionManagementTab}
            onAssignmentChange={() => {
              setMetrics(calculateMetrics(filteredRecords));
              const metrics5 = calculateAgentMetrics(filteredRecords);
              setAgentMetrics(applyPlansToAllAgents(metrics5, filteredRecords));
            }}
          />
        </div>

        {/* Commission Projector Section */}
        {metrics?.hasFinancialData && (
          <div data-section="projector">
            <CollapsibleSection title="Commission Projector" icon={<DollarSign className="w-6 h-6" />}>
              <CommissionProjector records={filteredRecords} />
            </CollapsibleSection>
          </div>
        )}
      </main>

      {/* Drill Down Modal */}
      <DrillDownModal
        isOpen={drillDownOpen}
        onClose={() => setDrillDownOpen(false)}
        title={drillDownTitle}
        transactions={drillDownTransactions}
      />

      {/* Field Mapper Dialog - Wrapped in Dialog to match props */}
      <Dialog open={showFieldMapper} onOpenChange={setShowFieldMapper}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none">
          <FieldMapper
            headers={csvHeaders}
            onSave={(mapping) => {
              setCustomMapping(mapping);
              localStorage.setItem('dotloop_field_mapping', JSON.stringify(mapping));
              if (pendingFile) {
                processWithMapping(pendingFile.data, mapping);
              }
            }}
            onCancel={() => setShowFieldMapper(false)}
            initialMapping={customMapping}
          />
        </DialogContent>
      </Dialog>

      {/* Onboarding Tour */}
      {showTour && (
        <OnboardingTour
          steps={uploadTourSteps}
          onComplete={completeTour}
          onSkip={skipTour}
        />
      )}
      
      {/* Pipeline Chart Drill-Down Modal */}
      <PipelineChartDrillDown
        isOpen={pipelineDrillDownOpen}
        onClose={() => setPipelineDrillDownOpen(false)}
        status={pipelineDrillDownStatus}
        records={allRecords}
        onViewFullDetails={openPipelineFullDetails}
      />
      
      {/* Pipeline Full Details Modal */}
      {pipelineFullDetailsOpen && (
        <DrillDownModal
          isOpen={pipelineFullDetailsOpen}
          onClose={() => setPipelineFullDetailsOpen(false)}
          title={`Pipeline: ${pipelineDrillDownStatus}`}
          transactions={filteredRecords}
        />
      )}
      
      {/* Generic Chart Drill-Down Modal */}
      <ChartDrillDown
        isOpen={chartDrillDownOpen}
        onClose={() => setChartDrillDownOpen(false)}
        title={chartDrillDownTitle}
        filterType={chartDrillDownType}
        filterValue={chartDrillDownValue}
        records={allRecords}
        onViewFullDetails={openChartFullDetails}
      />
      
      {/* Chart Full Details Modal */}
      {chartFullDetailsOpen && (
        <DrillDownModal
          isOpen={chartFullDetailsOpen}
          onClose={() => setChartFullDetailsOpen(false)}
          title={chartDrillDownTitle}
          transactions={filteredRecords}
        />
      )}
      
      {/* Analytics Charts Drill-Down Modal */}
      {analyticsDrillDownOpen && (
        <DrillDownModal
          isOpen={analyticsDrillDownOpen}
          onClose={() => setAnalyticsDrillDownOpen(false)}
          title={analyticsDrillDownTitle}
          transactions={analyticsDrillDownTransactions}
        />
      )}

      {/* Legal Footer */}
      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <FilterProvider>
      <HomeContent />
    </FilterProvider>
  );
}
