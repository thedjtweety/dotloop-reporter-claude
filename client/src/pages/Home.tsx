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
import { Upload, TrendingUp, Home as HomeIcon, DollarSign, Calendar, Percent, Settings, ArrowLeft, AlertCircle, Trophy } from 'lucide-react';
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
import MobileNav from '@/components/MobileNav';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import OnboardingTour from '@/components/OnboardingTour';
import { useOnboardingTour, uploadTourSteps, dashboardTourSteps } from '@/hooks/useOnboardingTour';

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

  useEffect(() => {
    const saved = localStorage.getItem('dotloop_field_mapping');
    if (saved) {
      try {
        setCustomMapping(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved mapping', e);
      }
    }

    // Load recent files from localStorage
    const savedFiles = localStorage.getItem('dotloop_recent_files');
    if (savedFiles) {
      try {
        setRecentFiles(JSON.parse(savedFiles));
      } catch (e) {
        console.error('Failed to parse recent files', e);
      }
    }
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
      const updated = await saveRecentFile(name, records);
      setRecentFiles(updated);
    } catch (e) {
      console.error('Failed to save recent file', e);
    }
  };

  const handleRecentSelect = (file: RecentFile) => {
    setAllRecords(file.data);
    setFilteredRecords(file.data);
    setMetrics(calculateMetrics(file.data));
    const metrics1 = calculateAgentMetrics(file.data);
    setAgentMetrics(applyPlansToAllAgents(metrics1, file.data));
  };

  const handleRecentDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentFiles.filter(f => f.id !== id);
    setRecentFiles(updated);
    localStorage.setItem('dotloop_recent_files', JSON.stringify(updated));
  };

  const handleDemoMode = () => {
    setIsLoading(true);
    setTimeout(() => {
      const { data: sampleData, stats } = generateDemoData({ complexity: 'random' });
      
      // Store demo data in localStorage so CommissionCalculator can access it
      localStorage.setItem('dotloop_demo_data', JSON.stringify(sampleData));
      
      // Setup demo commission plans and agent assignments
      const { plans, assignments } = setupDemoPlanData(sampleData);
      console.log(`✅ Demo setup: ${plans.length} plans, ${assignments.length} agents assigned`);
      console.log(`🎯 Demo Generated [${stats.complexity}]:\n  📊 ${stats.agentCount} agents | ${stats.transactionCount} transactions\n  💰 $${stats.totalGCI.toLocaleString()} GCI | $${stats.totalVolume.toLocaleString()} volume\n  🌎 ${stats.stateCount} states | ${stats.propertyTypeCount} property types\n  📅 ${stats.dateRange.earliest} to ${stats.dateRange.latest}`);
      setAllRecords(sampleData);
      setFilteredRecords(sampleData);
      setMetrics(calculateMetrics(sampleData));
      const metrics2 = calculateAgentMetrics(sampleData);
      setAgentMetrics(applyPlansToAllAgents(metrics2, sampleData));
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
      
      if (shouldShowProgress) {
        const activeStage = uploadProgress.stages.find(s => s.status === 'in-progress');
        if (activeStage) {
          uploadProgress.errorStage(
            activeStage.id,
            error instanceof Error ? error.message : 'Unknown error occurred'
          );
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
            
            {/* Show Upload History for authenticated users, RecentUploads for guests */}
            {isAuthenticated && user ? (
              <div className="mt-12 text-left">
                <UploadHistory 
                  onSelectUpload={(file) => {
                    handleRecentSelect(file);
                  }}
                  currentUploadId={recentFiles.find(f => f.data === allRecords)?.id}
                />
              </div>
            ) : recentFiles.length > 0 && (
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

        {/* Professional Disclaimer Footer */}
        <footer className="mt-auto border-t border-border bg-card/30 backdrop-blur-sm">
          <div className="container py-6 px-4">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-foreground/70 text-center leading-relaxed">
                <span className="font-semibold text-foreground">Disclaimer:</span> This tool is strictly an independent passion project and is <span className="font-semibold">NOT</span> an official dotloop product. For questions or support, please email{' '}
                <a 
                  href="mailto:dotloopreport@gmail.com" 
                  className="text-primary hover:text-primary/80 underline transition-colors"
                >
                  dotloopreport@gmail.com
                </a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />
      {/* <SectionNav /> - Removed floating navigation */}
      <BackToTop />
      <ModernHeader dateRange={dateRange} setDateRange={setDateRange} title="Dotloop Reporter" onDemoClick={handleDemoMode} isDemoLoading={isLoading} />

      {/* Main Dashboard */}
      <main className="container py-6 sm:py-8 md:py-10 px-4 sm:px-6 md:px-8">
        {/* Filter Badge */}
        <FilterBadge />
        
        {/* Pipeline Pulse Dashboard */}
        {metrics && filteredRecords.length > 0 && (
          <div className="mb-12 space-y-6" data-tour="pipeline-pulse">
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                title="Total Transactions"
                value={metrics.totalTransactions}
                subtitle={`Avg: ${formatCurrency(metrics.averagePrice)}`}
                icon="📊"
                trend={metrics.trends?.totalTransactions?.value}
                trendLabel="vs previous period"
                color="primary"
                onClick={() => handleMetricClick('total')}
              />
              <KPICard
                title="Total Sales Volume"
                value={formatCurrency(metrics.totalSalesVolume)}
                subtitle={`${metrics.closed} closed deals`}
                icon="💰"
                trend={metrics.trends?.totalVolume?.value}
                trendLabel="vs previous period"
                color="success"
                onClick={() => handleMetricClick('volume')}
              />
              <KPICard
                title="Closing Rate"
                value={formatPercentage(metrics.closingRate)}
                subtitle={`${metrics.averageDaysToClose} days avg`}
                icon="🎯"
                trend={metrics.trends?.closingRate?.value}
                trendLabel="vs previous period"
                color="accent"
                onClick={() => handleMetricClick('closing')}
              />
            </div>

            {/* Pipeline Funnel Chart & Projected to Close - Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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



        {/* Status Overview Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 landscape:grid-cols-4 gap-3 landscape:gap-4 mb-8">
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

            <TabsContent value="pipeline" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <Card className="p-6 bg-card border border-border">
                <h2 className="text-xl font-display font-bold text-foreground mb-4">
                  Pipeline Breakdown
                </h2>
                <InteractivePipelineChart 
                  data={allRecords}
                />
              </Card>
              
              <Card className="p-6 bg-card border border-border">
                <ConversionTrendsChart data={allRecords} />
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 bg-card border border-border">
                  <h2 className="text-xl font-display font-bold text-foreground mb-4">
                    Sales Volume Over Time
                  </h2>
                  <SalesTimelineChart 
                    data={getSalesOverTime(filteredRecords)}
                    allRecords={filteredRecords}
                    onDataPointClick={(month, records) => {
                      openAnalyticsDrillDown(`Sales Volume: ${month}`, records);
                    }}
                  />
                </Card>
                <Card className="p-6 bg-card border border-border">
                  <h2 className="text-xl font-display font-bold text-foreground mb-4">
                    Buy vs Sell Trends
                  </h2>
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

            <TabsContent value="leadsource" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <Card className="p-6 bg-card border border-border">
                <h2 className="text-xl font-display font-bold text-foreground mb-4">
                  Lead Source Performance
                </h2>
                <LeadSourceChart 
                  data={getLeadSourceData(allRecords)} 
                  onSliceClick={(label) => openChartDrillDown('leadSource', label, `Lead Source: ${label}`)}
                />
              </Card>
            </TabsContent>

            <TabsContent value="property" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <Card className="p-6 bg-card border border-border">
                <h2 className="text-xl font-display font-bold text-foreground mb-4">
                  Property Type Distribution
                </h2>
                <PropertyTypeChart 
                  data={getPropertyTypeData(allRecords)} 
                  onBarClick={(label) => openChartDrillDown('propertyType', label, `Property Type: ${label}`)}
                />
              </Card>
            </TabsContent>

            <TabsContent value="geographic" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <Card className="p-6 bg-card border border-border">
                <h2 className="text-xl font-display font-bold text-foreground mb-4">
                  Geographic Distribution
                </h2>
                <GeographicChart 
                  data={getGeographicData(allRecords)} 
                  onBarClick={(label) => openChartDrillDown('geographic', label, `Location: ${label}`)}
                  transactions={allRecords}
                />
              </Card>
            </TabsContent>

            {metrics?.hasFinancialData && (
              <>
                <TabsContent value="financial" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-card border border-border">
                      <h2 className="text-xl font-display font-bold text-foreground mb-4">
                        Revenue Overview
                      </h2>
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

              </>
            )}

            <TabsContent value="insights" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
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

            <TabsContent value="health" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
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

            <TabsContent value="settings" className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
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

      {/* Professional Disclaimer Footer */}
      <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-auto">
        <div className="container py-6 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-foreground/70 text-center leading-relaxed">
              <span className="font-semibold text-foreground">Disclaimer:</span> This tool is strictly an independent passion project and is <span className="font-semibold">NOT</span> an official dotloop product. For questions or support, please email{' '}
              <a 
                href="mailto:dotloopreport@gmail.com" 
                className="text-primary hover:text-primary/80 underline transition-colors"
              >
                dotloopreport@gmail.com
              </a>
              {' '}or visit our{' '}
              <a 
                href="/privacy" 
                className="text-primary hover:text-primary/80 underline transition-colors"
              >
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </footer>
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
