import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Theme Provider
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

// Modern Layout
import ModernDoubleSidebarLayout from './components/layout/ModernDoubleSidebarLayout';
import { NavigationProvider } from './contexts/NavigationContext';
import { ToastProvider } from './hooks/useToast';

// Import global styles
import './styles/globals.css';

// Pages principales
const WiseBookLandingPage = React.lazy(() => import('./pages/WiseBookLandingPage'));
const ComptableWorkspace = React.lazy(() => import('./pages/workspace/ComptableWorkspaceFinal'));
const ManagerWorkspace = React.lazy(() => import('./pages/workspace/ManagerWorkspaceComplete'));
const AdminWorkspace = React.lazy(() => import('./pages/workspace/AdminWorkspaceComplete'));
const ExecutiveDashboardV2 = React.lazy(() => import('./pages/dashboard/ExecutiveDashboard'));
const ModernDashboardPage = React.lazy(() => import('./pages/ModernDashboardPage'));
const ModernSettingsPage = React.lazy(() => import('./pages/ModernSettingsPage'));
const RegionalSettingsPage = React.lazy(() => import('./pages/settings/RegionalSettingsPage'));
const ImportExportSettingsPage = React.lazy(() => import('./pages/settings/ImportExportPage'));
const BackupSettingsPage = React.lazy(() => import('./pages/settings/BackupPage'));
const APIIntegrationsPage = React.lazy(() => import('./pages/settings/APIIntegrationsPage'));
const MobileAppPage = React.lazy(() => import('./pages/settings/MobileAppPage'));
const OfflineModePage = React.lazy(() => import('./pages/settings/OfflineModePage'));
const AccountingDashboardV2 = React.lazy(() => import('./pages/accounting/AccountingDashboardV2'));
const CompleteAccountingDashboardV2 = React.lazy(() => import('./pages/accounting/CompleteAccountingDashboardV2'));
const CompteResultatPageV2 = React.lazy(() => import('./pages/financial/CompteResultatPageV2'));
const BilanSYSCOHADAPage = React.lazy(() => import('./pages/financial/BilanSYSCOHADAPage'));
const CompteResultatPage = React.lazy(() => import('./pages/financial/CompteResultatPage'));
const ModernAccountingDashboard = React.lazy(() => import('./pages/accounting/ModernAccountingDashboard'));
const RecouvrementDashboard = React.lazy(() => import('./pages/recouvrement/RecouvrementDashboard'));
const FixedPage = React.lazy(() => import('./pages/assets/FixedPage'));
const FinancialPage = React.lazy(() => import('./pages/financial/FinancialPage'));
const ModernCustomerDashboard = React.lazy(() => import('./pages/crm/ModernCustomerDashboard'));
const ModernClientDashboard = React.lazy(() => import('./pages/crm/ModernClientDashboard'));
const ModernSupplierDashboard = React.lazy(() => import('./pages/suppliers/ModernSupplierDashboard'));
const ModernBudgetDashboard = React.lazy(() => import('./pages/budgeting/ModernBudgetDashboard'));
const CompleteBudgetingModule = React.lazy(() => import('./pages/budgeting/CompleteBudgetingModule'));
const TreasuryDashboardEnterprise = React.lazy(() => import('./pages/treasury/TreasuryDashboardEnterprise'));
const ModernAssetsManagement = React.lazy(() => import('./pages/assets/ModernAssetsManagement'));
const CompleteAssetsModule = React.lazy(() => import('./pages/assets/CompleteAssetsModule'));
const CompleteConfigModule = React.lazy(() => import('./pages/config/CompleteConfigModule'));
const PlanSYSCOHADAPage = React.lazy(() => import('./pages/config/PlanSYSCOHADAPage'));
const FundCallsPageV2 = React.lazy(() => import('./pages/treasury/FundCallsPageV2'));
const FundCallDetails = React.lazy(() => import('./pages/treasury/FundCallDetails'));
const EmailTemplate = React.lazy(() => import('./pages/treasury/EmailTemplate'));
const ValidatorPreview = React.lazy(() => import('./pages/treasury/ValidatorPreview'));
const CompleteThirdPartyModuleV2 = React.lazy(() => import('./pages/third-party/CompleteThirdPartyModuleV2'));
const SecurityModuleV2 = React.lazy(() => import('./pages/security/SecurityModuleV2'));
const ModernTreasuryDashboard = React.lazy(() => import('./pages/treasury/ModernTreasuryDashboard'));
const ModernReportsAndAnalytics = React.lazy(() => import('./pages/reports/ModernReportsAndAnalytics'));
const ParametersPage = React.lazy(() => import('./pages/ParametersPage'));

// Dashboard avancé
const ExecutivePage = React.lazy(() => import('./pages/dashboard/ExecutivePage'));
const FinancialAnalysisPage = React.lazy(() => import('./pages/dashboard/FinancialAnalysisPage'));

// Dashboard Module Components
const ModernDashboard = React.lazy(() => import('./pages/dashboard/ModernDashboard'));
const KPIsRealTime = React.lazy(() => import('./pages/dashboard/KPIsRealTime'));
const AlertsSystem = React.lazy(() => import('./pages/dashboard/AlertsSystem'));
const AIInsights = React.lazy(() => import('./pages/dashboard/AIInsights'));
const WorkflowsManager = React.lazy(() => import('./pages/dashboard/WorkflowsManager'));

// Dashboards développés
const ExecutiveDashboard = React.lazy(() => import('./components/dashboards/ExecutiveDashboard'));
const CustomerDashboard = React.lazy(() => import('./components/dashboards/CustomerDashboard'));
const SupplierDashboard = React.lazy(() => import('./components/dashboards/SupplierDashboard'));
const TreasuryDashboardAdvanced = React.lazy(() => import('./components/dashboards/TreasuryDashboard'));
const FinancialAnalysisDashboard = React.lazy(() => import('./components/dashboards/FinancialAnalysisDashboard'));

// Comptabilité
const AccountingDashboard = React.lazy(() => import('./pages/accounting/AccountingDashboard'));
const OCRInvoices = React.lazy(() => import('./pages/accounting/OCRInvoices'));
const ElectronicSignature = React.lazy(() => import('./pages/accounting/ElectronicSignature'));
const JournalsPage = React.lazy(() => import('./pages/accounting/JournalsPage'));
const SimpleJournalEntryForm = React.lazy(() => import('./components/accounting/SimpleJournalEntryForm'));
const EntriesPage = React.lazy(() => import('./pages/accounting/EntriesPage'));
const BalancePage = React.lazy(() => import('./pages/accounting/BalancePage'));
const AdvancedBalancePage = React.lazy(() => import('./pages/accounting/AdvancedBalancePage'));
const GeneralLedgerPage = React.lazy(() => import('./pages/accounting/GeneralLedgerPage'));
const LettragePage = React.lazy(() => import('./pages/accounting/LettragePage'));
const FinancialStatementsPage = React.lazy(() => import('./pages/financial/FinancialStatementsPage'));
const BalanceSheetPage = React.lazy(() => import('./pages/accounting/BalanceSheetPage'));
const IncomeStatementPage = React.lazy(() => import('./pages/accounting/IncomeStatementPage'));
const FinancialCashFlowPage = React.lazy(() => import('./pages/accounting/CashFlowPage'));
const FinancialRatiosPage = React.lazy(() => import('./pages/accounting/FinancialRatiosPage'));
const SigPage = React.lazy(() => import('./pages/accounting/SigPage'));
const ChartOfAccountsAdvancedPage = React.lazy(() => import('./pages/accounting/ChartOfAccountsAdvancedPage'));
const LettrageAutomatiquePage = React.lazy(() => import('./pages/accounting/LettrageAutomatiquePage'));
const RatiosFinanciersPage = React.lazy(() => import('./pages/accounting/RatiosFinanciersPage'));
const AccountingReportsPage = React.lazy(() => import('./pages/accounting/ReportsPage'));

// Core Setup
const SetupWizardPage = React.lazy(() => import('./pages/core/SetupWizardPage'));
const MultiCompanyPage = React.lazy(() => import('./pages/core/MultiCompanyPage'));

// Treasury Advanced
const SimpleLoansPage = React.lazy(() => import('./pages/treasury/SimpleLoansPage'));
const FundCallsPage = React.lazy(() => import('./pages/treasury/FundCallsPage'));
const PositionTresoreriePage = React.lazy(() => import('./pages/treasury/PositionTresoreriePage'));

// Financial Pages - Already declared below

// Config Pages
const AssistantDemarragePage = React.lazy(() => import('./pages/config/AssistantDemarragePage'));
const MultiSocietesPage = React.lazy(() => import('./pages/config/MultiSocietesPage'));
const TVATaxesPage = React.lazy(() => import('./pages/config/TVATaxesPage'));
const CodificationTiersPage = React.lazy(() => import('./pages/config/CodificationTiersPage'));
const AxesAnalytiquesPage = React.lazy(() => import('./pages/config/AxesAnalytiquesPage'));
const ImportExportPage = React.lazy(() => import('./pages/config/ImportExportPage'));
const ProfilsSecuritePage = React.lazy(() => import('./pages/config/ProfilsSecuritePage'));
const GestionPaiementsPage = React.lazy(() => import('./pages/treasury/GestionPaiementsPage'));

// Tiers
const ThirdPartyDashboard = React.lazy(() => import('./pages/third-party/ThirdPartyDashboard'));
const CustomersPage = React.lazy(() => import('./pages/third-party/CustomersPage'));
const SuppliersPage = React.lazy(() => import('./pages/third-party/SuppliersPage'));
const ContactsPage = React.lazy(() => import('./pages/third-party/ContactsPage'));
const RecouvrementPage = React.lazy(() => import('./pages/third-party/RecouvrementPage'));
const LettrageClientsPage = React.lazy(() => import('./pages/third-party/LettrageClientsPage'));
const EcheancesFournisseursPage = React.lazy(() => import('./pages/third-party/EcheancesFournisseursPage'));

// Trésorerie
const BankAccountsPage = React.lazy(() => import('./pages/treasury/BankAccountsPage'));
const BankMovementsPage = React.lazy(() => import('./pages/treasury/BankMovementsPage'));
const ReconciliationPage = React.lazy(() => import('./pages/treasury/ReconciliationPage'));
const TreasuryCashFlowPage = React.lazy(() => import('./pages/treasury/CashFlowPage'));

// Immobilisations
const AssetsDashboard = React.lazy(() => import('./pages/assets/AssetsDashboard'));
const FixedAssetsPage = React.lazy(() => import('./pages/assets/FixedAssetsPage'));
const DepreciationPage = React.lazy(() => import('./pages/assets/DepreciationPage'));

// Analytique
const AnalyticsDashboard = React.lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const AnalyticalAxesPage = React.lazy(() => import('./pages/analytics/AnalyticalAxesPage'));
const CostCentersPage = React.lazy(() => import('./pages/analytics/CostCentersPage'));

// Budget
const BudgetingDashboard = React.lazy(() => import('./pages/budgeting/BudgetingDashboard'));
const BudgetsPage = React.lazy(() => import('./pages/budgeting/BudgetsPage'));
const BudgetControlPage = React.lazy(() => import('./pages/budgeting/BudgetControlPage'));

// Fiscalité
const TaxationDashboard = React.lazy(() => import('./pages/taxation/TaxationDashboard'));
const TaxDeclarationsPage = React.lazy(() => import('./pages/taxation/TaxDeclarationsPage'));
const CloturesPeriodiquesPage = React.lazy(() => import('./pages/closures/CloturesPeriodiquesPage'));
const ClotureComptableIntegree = React.lazy(() => import('./pages/closures/ClotureComptableIntegree'));

// Reporting
const ReportingDashboard = React.lazy(() => import('./pages/reporting/ReportingDashboard'));
const ReportsPage = React.lazy(() => import('./pages/reporting/ReportsPage'));
const DashboardsPage = React.lazy(() => import('./pages/reporting/DashboardsPage'));
const TaxReportingPage = React.lazy(() => import('./pages/reporting/TaxReportingPage'));
const CustomReportsPage = React.lazy(() => import('./pages/reporting/CustomReportsPage'));

// Financial Analysis Advanced - Temporairement commenté
// const FinancialAnalysisPage = React.lazy(() => import('./pages/financial/FinancialAnalysisPage'));
// const TAFIREDashboard = React.lazy(() => import('./components/financial/TAFIREDashboard'));
// const SIGDashboard = React.lazy(() => import('./components/financial/SIGDashboard'));
// const FunctionalBalanceSheet = React.lazy(() => import('./components/financial/FunctionalBalanceSheet'));
// const RatiosDashboard = React.lazy(() => import('./components/financial/RatiosDashboard'));

// Period Closures Advanced - Modules Principaux Actifs
const SimpleClosurePage = React.lazy(() => import('./pages/closures/SimpleClosurePage'));
const ClotureExploitable = React.lazy(() => import('./pages/closures/ClotureExploitable'));
const BPMNWorkflowDesigner = React.lazy(() => import('./components/closures/BPMNWorkflowDesigner'));
const AdvancedFormulaEditor = React.lazy(() => import('./components/closures/AdvancedFormulaEditor'));
// Modules de clôtures
const PeriodicClosuresModule = React.lazy(() => import('./pages/closures/PeriodicClosuresModuleV2'));
const EnhancedClosuresModule = React.lazy(() => import('./pages/closures/EnhancedClosuresModule'));
// Nouveaux modules de clôture
const RevisionsModule = React.lazy(() => import('./pages/closures/RevisionsModule'));
const ReportsANouveauModule = React.lazy(() => import('./pages/closures/ReportsANouveauModule'));
const PisteAuditModule = React.lazy(() => import('./pages/closures/PisteAuditModule'));

// Financial Statements SYSCOHADA
const FinancialStatementsIndexPage = React.lazy(() => import('./pages/financial/FinancialStatementsIndexPage'));
const BalanceSheetSYSCOHADA = React.lazy(() => import('./components/financial/BalanceSheetSYSCOHADA'));
const IncomeStatementSYSCOHADA = React.lazy(() => import('./components/financial/IncomeStatementSYSCOHADA'));
const CashFlowStatementSYSCOHADA = React.lazy(() => import('./components/financial/CashFlowStatementSYSCOHADA'));

// Advanced Setup & Configuration
const SimpleParametersManager = React.lazy(() => import('./components/setup/SimpleParametersManager'));

// Configuration Pages
const ConfigurationCentrePage = React.lazy(() => import('./pages/config/ConfigurationCentrePage'));

// Taxation Pages
const CalculsAutomatiquesPage = React.lazy(() => import('./pages/taxation/CalculsAutomatiquesPage'));
const LiasseFiscalePage = React.lazy(() => import('./pages/taxation/LiasseFiscalePage'));
const EcheancesFiscalesPage = React.lazy(() => import('./pages/taxation/EcheancesFiscalesPage'));

// Treasury Pages
const ConnexionsBancairesPage = React.lazy(() => import('./pages/treasury/ConnexionsBancairesPage'));
const PrevisionsTresoreriePage = React.lazy(() => import('./pages/treasury/PrevisionsTresoreriePage'));
const TreasuryPlanDetails = React.lazy(() => import('./pages/treasury/TreasuryPlanDetails'));

// Assets Pages
const CycleVieCompletPage = React.lazy(() => import('./pages/assets/CycleVieCompletPage'));
const InventairePhysiquePage = React.lazy(() => import('./pages/assets/InventairePhysiquePage'));

// Security Pages
const PermissionsPage = React.lazy(() => import('./pages/security/PermissionsPage'));

// Sécurité
const SecurityDashboard = React.lazy(() => import('./pages/security/SecurityDashboard'));
const UsersPage = React.lazy(() => import('./pages/security/UsersPage'));
const RolesPage = React.lazy(() => import('./pages/security/RolesPage'));

// Tiers (Third Party) Management Pages
const TiersDashboard = React.lazy(() => import('./pages/tiers/TiersDashboard'));
const ClientsModule = React.lazy(() => import('./pages/tiers/ClientsModule'));
const FournisseursModule = React.lazy(() => import('./pages/tiers/FournisseursModule'));
const ContactsModule = React.lazy(() => import('./pages/tiers/ContactsModule'));
const LettrageModule = React.lazy(() => import('./pages/tiers/LettrageModule'));
const CollaborationModule = React.lazy(() => import('./pages/tiers/CollaborationModule'));
const RecouvrementModule = React.lazy(() => import('./pages/tiers/RecouvrementModule'));
const ProspectsModule = React.lazy(() => import('./pages/tiers/ProspectsModule'));
const PartenairesModule = React.lazy(() => import('./pages/tiers/PartenairesModule'));
const ClientDetailView = React.lazy(() => import('./pages/tiers/ClientDetailView'));
const FournisseurDetailView = React.lazy(() => import('./pages/tiers/FournisseurDetailView'));

// Treasury Module Components
const TreasuryPositions = React.lazy(() => import('./pages/treasury/TreasuryPositions'));
const MultiCurrency = React.lazy(() => import('./pages/treasury/MultiCurrency'));

// New Configuration Components
const EnhancedCompanyConfiguration = React.lazy(() => import('./components/setup/EnhancedCompanyConfiguration'));
const MultiExerciseImportManager = React.lazy(() => import('./components/setup/MultiExerciseImportManager'));
const TaxConfiguration = React.lazy(() => import('./components/setup/TaxConfiguration'));

// Reporting Module Components
const ReportingIFRS = React.lazy(() => import('./pages/reporting/ReportingIFRS'));
const ReportingSyscohada = React.lazy(() => import('./pages/reporting/ReportingSyscohada'));
const FinancialStatements = React.lazy(() => import('./pages/reporting/FinancialStatements'));

// Assets Module Components
const AssetsSummary = React.lazy(() => import('./pages/assets/AssetsSummary'));
const AssetsRegistry = React.lazy(() => import('./pages/assets/AssetsRegistry'));
const AssetsMaintenance = React.lazy(() => import('./pages/assets/AssetsMaintenance'));
const AssetsDisposals = React.lazy(() => import('./pages/assets/AssetsDisposals'));

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});


const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NavigationProvider>
          <ToastProvider position="top-right">
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Landing Page Premium avec sélection de rôles */}
          <Route path="/" element={<WiseBookLandingPage />} />
          
          {/* Workspaces complets par rôles */}
          <Route path="/dashboard/comptable" element={<ComptableWorkspace />} />
          <Route path="/dashboard/manager" element={<ManagerWorkspace />} />
          <Route path="/dashboard/admin" element={<AdminWorkspace />} />
          
          {/* Routes avec Modern Double Sidebar Layout */}
          <Route element={<ModernDoubleSidebarLayout />}>
            {/* Dashboard Module Complet */}
            <Route path="/dashboard" element={<ModernDashboard />} />
            <Route path="/dashboard/kpis" element={<KPIsRealTime />} />
            <Route path="/dashboard/alerts" element={<AlertsSystem />} />
            <Route path="/dashboard/ai-insights" element={<AIInsights />} />
            <Route path="/dashboard/workflows" element={<WorkflowsManager />} />

            {/* Dashboard legacy */}
            <Route path="/executive" element={<ExecutiveDashboardV2 />} />
            <Route path="/financial-analysis-advanced" element={<FinancialAnalysisPage />} />
            
            {/* Comptabilité */}
            <Route path="/accounting" element={<CompleteAccountingDashboardV2 />} />
            <Route path="/accounting/journals" element={<JournalsPage />} />
            <Route path="/accounting/ocr" element={<OCRInvoices />} />
            <Route path="/accounting/signature" element={<ElectronicSignature />} />
            
            {/* Module Tiers (Third Party Management) */}
            <Route path="/tiers" element={<TiersDashboard />} />
            <Route path="/tiers/clients" element={<ClientsModule />} />
            <Route path="/tiers/clients/:clientId" element={<ClientDetailView />} />
            <Route path="/tiers/fournisseurs" element={<FournisseursModule />} />
            <Route path="/tiers/fournisseurs/:fournisseurId" element={<FournisseurDetailView />} />
            <Route path="/tiers/contacts" element={<ContactsModule />} />
            <Route path="/tiers/lettrage" element={<LettrageModule />} />
            <Route path="/tiers/collaboration" element={<CollaborationModule />} />
            <Route path="/tiers/recouvrement" element={<RecouvrementModule />} />
            <Route path="/tiers/prospects" element={<ProspectsModule />} />
            <Route path="/tiers/partenaires" element={<PartenairesModule />} />

            {/* Recouvrement (legacy route for compatibility) */}
            <Route path="/recouvrement" element={<RecouvrementDashboard />} />

            {/* Clients et CRM */}
            <Route path="/crm/dashboard" element={<ModernClientDashboard />} />
            <Route path="/customers" element={<ModernCustomerDashboard />} />
            <Route path="/third-party/customers" element={<ModernCustomerDashboard />} />
            
            {/* Trésorerie Enterprise */}
            <Route path="/treasury" element={<ModernTreasuryDashboard />} />
            <Route path="/treasury/dashboard-enterprise" element={<TreasuryDashboardEnterprise />} />
            <Route path="/treasury/positions" element={<TreasuryPositions />} />
            <Route path="/treasury/multi-currency" element={<MultiCurrency />} />

            
            {/* Rapports et Analytics */}
            <Route path="/reports" element={<ModernReportsAndAnalytics />} />
            <Route path="/reporting" element={<ModernReportsAndAnalytics />} />
            <Route path="/accounting/entries" element={<EntriesPage />} />
            <Route path="/accounting/entries-advanced" element={<SimpleJournalEntryForm />} />
            <Route path="/accounting/balance" element={<BalancePage />} />
            <Route path="/accounting/balance-advanced" element={<AdvancedBalancePage />} />
            <Route path="/accounting/general-ledger" element={<GeneralLedgerPage />} />
            <Route path="/accounting/lettrage" element={<LettragePage />} />
            <Route path="/accounting/financial-statements" element={<FinancialStatementsPage />} />
            <Route path="/accounting/balance-sheet" element={<BalanceSheetPage />} />
            <Route path="/accounting/income-statement" element={<IncomeStatementPage />} />
            <Route path="/accounting/cash-flow" element={<FinancialCashFlowPage />} />
            <Route path="/accounting/financial-ratios" element={<FinancialRatiosPage />} />
            <Route path="/accounting/reports" element={<AccountingReportsPage />} />

            {/* Financial Statements SYSCOHADA */}
            <Route path="/financial-statements" element={<FinancialStatementsIndexPage />} />
            <Route path="/financial-statements/balance" element={<BilanSYSCOHADAPage />} />
            <Route path="/financial-statements/income" element={<CompteResultatPage />} />
            <Route path="/financial-statements/cashflow" element={<CashFlowStatementSYSCOHADA />} />
            <Route path="/accounting/sig" element={<SigPage />} />
            <Route path="/accounting/chart-advanced" element={<ChartOfAccountsAdvancedPage />} />
            <Route path="/accounting/chart-of-accounts" element={<PlanSYSCOHADAPage />} />
            
            {/* Core Setup */}
            <Route path="/setup" element={<SetupWizardPage />} />
            <Route path="/setup-wizard" element={<AssistantDemarragePage />} />
            <Route path="/multi-company" element={<MultiCompanyPage />} />
            <Route path="/multi-company-advanced" element={<MultiSocietesPage />} />
            
            {/* Settings Route */}
            <Route path="/settings" element={<ParametersPage />} />
            <Route path="/settings/company" element={<EnhancedCompanyConfiguration />} />
            <Route path="/settings/taxes" element={<TaxConfiguration />} />
            <Route path="/settings/import" element={<MultiExerciseImportManager />} />
            <Route path="/settings/import-export" element={<ImportExportSettingsPage />} />
            <Route path="/settings/backup" element={<BackupSettingsPage />} />
            <Route path="/settings/api" element={<APIIntegrationsPage />} />
            <Route path="/settings/mobile" element={<MobileAppPage />} />
            <Route path="/settings/offline" element={<OfflineModePage />} />

            {/* Advanced Configuration */}
            <Route path="/config" element={<CompleteConfigModule />} />
            <Route path="/config/company" element={<EnhancedCompanyConfiguration />} />
            <Route path="/config/taxes" element={<TaxConfiguration />} />
            <Route path="/config/import-multi" element={<MultiExerciseImportManager />} />
            <Route path="/config/startup-wizard" element={<AssistantDemarragePage />} />
            <Route path="/config/multi-companies" element={<MultiSocietesPage />} />
            <Route path="/config/accounts" element={<PlanSYSCOHADAPage />} />
            <Route path="/config/vat-taxes" element={<TVATaxesPage />} />
            <Route path="/config/third-party-codes" element={<CodificationTiersPage />} />
            <Route path="/config/analytical-axes" element={<AxesAnalytiquesPage />} />
            <Route path="/config/import-export" element={<ImportExportPage />} />
            <Route path="/config/security-profiles" element={<ProfilsSecuritePage />} />
            
            {/* Treasury Advanced */}
            <Route path="/treasury/position" element={<PositionTresoreriePage />} />
            <Route path="/treasury/cash-flow" element={<PrevisionsTresoreriePage />} />
            <Route path="/treasury/cash-flow/plan/:id" element={<TreasuryPlanDetails />} />
            <Route path="/treasury/loans" element={<SimpleLoansPage />} />
            <Route path="/treasury/fund-calls" element={<FundCallsPageV2 />} />
            <Route path="/treasury/fund-calls/:id" element={<FundCallDetails />} />
            <Route path="/treasury/banking" element={<ConnexionsBancairesPage />} />
            
            {/* Tiers */}
            <Route path="/third-party" element={<CompleteThirdPartyModuleV2 />} />
            <Route path="/third-party/customers" element={<CustomersPage />} />
            <Route path="/third-party/suppliers" element={<SuppliersPage />} />
            <Route path="/third-party/contacts" element={<ContactsPage />} />
            <Route path="/customers-advanced" element={
              <CustomerDashboard companyId="1" fiscalYearId="2024" />
            } />
            <Route path="/suppliers-advanced" element={
              <SupplierDashboard companyId="1" fiscalYearId="2024" />
            } />
            
            {/* Trésorerie */}
            <Route path="/treasury-advanced" element={
              <TreasuryDashboardAdvanced companyId="1" fiscalYearId="2024" />
            } />
            <Route path="/treasury/bank-accounts" element={<BankAccountsPage />} />
            <Route path="/treasury/bank-movements" element={<BankMovementsPage />} />
            <Route path="/treasury/reconciliation" element={<ReconciliationPage />} />
            <Route path="/treasury/payments" element={<GestionPaiementsPage />} />
            
            {/* Immobilisations IA */}
            <Route path="/assets" element={<AssetsDashboard />} />
            <Route path="/assets/dashboard-ia" element={<ModernAssetsManagement />} />
            <Route path="/assets/management" element={<CompleteAssetsModule />} />
            <Route path="/assets/fixed-assets" element={<FixedAssetsPage />} />
            <Route path="/assets/fixed" element={<FixedPage />} />
            <Route path="/assets/summary" element={<AssetsSummary />} />
            <Route path="/assets/registry" element={<AssetsRegistry />} />
            <Route path="/assets/maintenance" element={<AssetsMaintenance />} />
            <Route path="/assets/disposals" element={<AssetsDisposals />} />
            
            {/* Finance */}
            <Route path="/financial" element={<FinancialPage />} />
            <Route path="/assets/depreciation" element={<DepreciationPage />} />
            <Route path="/assets/lifecycle" element={<CycleVieCompletPage />} />
            <Route path="/assets/inventory" element={<InventairePhysiquePage />} />
            
            {/* Analytique */}
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/analytics/axes" element={<AnalyticalAxesPage />} />
            <Route path="/analytics/cost-centers" element={<CostCentersPage />} />
            
            {/* Budget Intelligent */}
            <Route path="/budgeting" element={<CompleteBudgetingModule />} />
            <Route path="/budgeting/dashboard" element={<CompleteBudgetingModule />} />
            <Route path="/budgeting/budgets" element={<CompleteBudgetingModule />} />
            <Route path="/budgeting/control" element={<CompleteBudgetingModule />} />
            <Route path="/budgeting/forecasts" element={<CompleteBudgetingModule />} />
            <Route path="/budgeting/variances" element={<CompleteBudgetingModule />} />
            
            {/* Fiscalité */}
            <Route path="/taxation" element={<TaxationDashboard />} />
            <Route path="/taxation/declarations" element={<TaxDeclarationsPage />} />
            <Route path="/taxation/deadlines" element={<EcheancesFiscalesPage />} />
            <Route path="/taxation/calculations" element={<CalculsAutomatiquesPage />} />
            <Route path="/taxation/fiscal-package" element={<LiasseFiscalePage />} />
            
            {/* Reporting */}
            <Route path="/reporting" element={<ReportingDashboard />} />
            <Route path="/reporting/reports" element={<ReportsPage />} />
            <Route path="/reporting/dashboards" element={<DashboardsPage />} />
            <Route path="/reporting/ifrs" element={<ReportingIFRS />} />
            <Route path="/reporting/syscohada" element={<ReportingSyscohada />} />
            <Route path="/reporting/financial-statements" element={<FinancialStatements />} />
            <Route path="/reporting/tax" element={<TaxReportingPage />} />
            
            {/* Financial Analysis Advanced - Temporairement commenté */}
            {/* <Route path="/financial-analysis" element={<FinancialAnalysisPage />} />
            <Route path="/financial-analysis/tafire" element={<TAFIREDashboard />} />
            <Route path="/financial-analysis/sig" element={<SIGDashboard />} />
            <Route path="/financial-analysis/functional-balance" element={<FunctionalBalanceSheet />} />
            <Route path="/financial-analysis/ratios" element={<RatiosDashboard />} /> */}
            
            {/* Period Closures - Modules Comptables Complets */}
            <Route path="/closures" element={<ClotureComptableIntegree />} />
            <Route path="/closures/simple" element={<SimpleClosurePage />} />
            <Route path="/closures/old" element={<ClotureExploitable />} />
            {/* Module de clôtures périodiques */}
            <Route path="/closures/periodic" element={<PeriodicClosuresModule />} />
            <Route path="/closures/enhanced" element={<EnhancedClosuresModule />} />
            {/* Nouveaux modules */}
            <Route path="/closures/revisions" element={<RevisionsModule />} />
            <Route path="/closures/reports" element={<ReportsANouveauModule />} />
            <Route path="/closures/audit" element={<PisteAuditModule />} />
            {/* Alias pour compatibilité avec les menus existants */}
            <Route path="/closures/carry-forward" element={<ReportsANouveauModule />} />
            <Route path="/closures/audit-trail" element={<PisteAuditModule />} />
            
            {/* Sécurité */}
            <Route path="/security" element={<SecurityModuleV2 />} />
            <Route path="/security/users" element={<UsersPage />} />
            <Route path="/security/roles" element={<RolesPage />} />
            <Route path="/security/permissions" element={<PermissionsPage />} />
            
            {/* Accounting Advanced Features */}
            <Route path="/accounting/lettrage" element={<LettrageAutomatiquePage />} />
            <Route path="/accounting/ratios" element={<RatiosFinanciersPage />} />
            
            {/* Third Party Advanced Features */}
            <Route path="/customers/recovery" element={<RecouvrementPage />} />
            <Route path="/customers/lettrage" element={<LettrageClientsPage />} />

            {/* Fournisseurs */}
            <Route path="/suppliers/dashboard" element={<ModernSupplierDashboard />} />
            <Route path="/suppliers/payments" element={<EcheancesFournisseursPage />} />
            
            {/* Period Closures */}
            <Route path="/closures" element={<CloturesPeriodiquesPage />} />

            {/* Reporting - Rapports Personnalisés */}
            <Route path="/reporting/custom" element={<CustomReportsPage />} />

            {/* Paramètres */}
            <Route path="/parameters" element={<ModernSettingsPage />} />
          </Route>

          {/* Routes publiques sans sidebar pour validateurs externes */}
          <Route path="/treasury/fund-calls/:id/email-template" element={<EmailTemplate />} />
          <Route path="/treasury/fund-calls/:id/validator-preview" element={<ValidatorPreview />} />
        </Routes>
      </Suspense>
          </ToastProvider>
        </NavigationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;