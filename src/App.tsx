import React, { Suspense } from 'react';
import { Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ModernDoubleSidebarLayout from './components/layout/ModernDoubleSidebarLayout';
import { NavigationProvider } from './contexts/NavigationContext';
import { ToastProvider } from './hooks/useToast';
import { ChatbotProvider } from './components/layout/ChatbotProvider';
import ErrorBoundary from './components/ErrorBoundary';
import FeatureErrorBoundary from './components/FeatureErrorBoundary';
import RBACGuard from './components/auth/RBACGuard';
import ImpersonationBanner from './components/auth/ImpersonationBanner';
import GuidedTourOverlay from './components/demo/GuidedTourOverlay';
import { DataProvider } from './contexts/DataContext';
import './styles/globals.css';

// Retry wrapper for lazy imports — handles chunk loading errors after Vercel deploys
function lazyRetry(importFn: () => Promise<any>) {
  return React.lazy(() =>
    importFn().catch(() => {
      // Chunk not found (new deploy) — reload the page once
      const reloaded = sessionStorage.getItem('chunk-reload');
      if (!reloaded) {
        sessionStorage.setItem('chunk-reload', '1');
        window.location.reload();
      }
      return importFn();
    })
  );
}

// Pages publiques
const LandingPage = lazyRetry(() => import('./pages/LandingPage'));
const DemoPage = lazyRetry(() => import('./pages/DemoPage'));
const LoginPage = lazyRetry(() => import('./pages/auth/LoginPage'));
const AtlasFnAHome = lazyRetry(() => import('./pages/platform/AtlasFnAHome'));
const ExternalAuthPage = lazyRetry(() => import('./pages/auth/ExternalAuthPage'));
const AtlasStudioHub = lazyRetry(() => import('./pages/auth/AtlasStudioHub'));

// Onboarding
const RegisterPage = lazyRetry(() => import('./pages/onboarding/RegisterPage'));
const AtlasStudioRedirect = lazyRetry(() => import('./pages/AtlasStudioRedirect'));
const VerifyEmailPage = lazyRetry(() => import('./pages/onboarding/VerifyEmailPage'));
const SolutionCatalogPage = lazyRetry(() => import('./pages/onboarding/SolutionCatalogPage'));
const TeamSettingsPage = lazyRetry(() => import('./pages/settings/TeamSettingsPage'));
const AcceptInvitePage = lazyRetry(() => import('./pages/onboarding/AcceptInvitePage'));

// Admin Console
const AdminConsoleLayout = lazyRetry(() => import('./pages/admin-console/AdminConsoleLayout'));
const AdminLoginPage = lazyRetry(() => import('./pages/admin-console/AdminLoginPage'));
const AdminDashboardPage = lazyRetry(() => import('./pages/admin-console/AdminDashboardPage'));
const AdminTenantsPage = lazyRetry(() => import('./pages/admin-console/AdminTenantsPage'));
const AdminTenantDetailPage = lazyRetry(() => import('./pages/admin-console/AdminTenantDetailPage'));
const AdminBillingPage = lazyRetry(() => import('./pages/admin-console/AdminBillingPage'));
const AdminFeaturesPage = lazyRetry(() => import('./pages/admin-console/AdminFeaturesPage'));
const AdminSupportPage = lazyRetry(() => import('./pages/admin-console/AdminSupportPage'));
const AdminMonitoringPage = lazyRetry(() => import('./pages/admin-console/AdminMonitoringPage'));
const AdminPricingPage = lazyRetry(() => import('./pages/admin-console/AdminPricingPage'));
const AdminInvoiceGenerator = lazyRetry(() => import('./pages/admin-console/AdminInvoiceGenerator'));
const AdminTicketDetailPage = lazyRetry(() => import('./pages/admin-console/AdminTicketDetailPage'));

// Platform — Dashboard client
const ClientDashboard = lazyRetry(() => import('./pages/platform/ClientDashboard'));
const ClientHome = lazyRetry(() => import('./pages/platform/ClientHome'));
const ClientTeam = lazyRetry(() => import('./pages/platform/ClientTeam'));
const ClientBilling = lazyRetry(() => import('./pages/platform/ClientBilling'));
const ClientCheckout = lazyRetry(() => import('./pages/platform/ClientCheckout'));
const ClientSettings = lazyRetry(() => import('./pages/platform/ClientSettings'));
const ClientAuditTrail = lazyRetry(() => import('./pages/platform/ClientAuditTrail'));
const ClientLicenses = lazyRetry(() => import('./pages/platform/ClientLicenses'));
const SolutionRouter = lazyRetry(() => import('./pages/platform/SolutionRouter'));

// Workspaces
const ComptableWorkspace = lazyRetry(() => import('./pages/workspace/ComptableWorkspaceFinal'));
const ManagerWorkspace = lazyRetry(() => import('./pages/workspace/ManagerWorkspace'));
const AdminWorkspace = lazyRetry(() => import('./pages/workspace/AdminWorkspace'));
const WorkspaceDashboard = lazyRetry(() => import('./pages/workspace/WorkspaceDashboard'));

// Dashboards
const ExecutiveDashboard = lazyRetry(() => import('./pages/dashboard/ExecutiveDashboard'));
const AdminDashboard = lazyRetry(() => import('./pages/dashboard/AdminDashboard'));
const ComptableDashboard = lazyRetry(() => import('./pages/dashboard/ComptableDashboard'));
const ManagerDashboard = lazyRetry(() => import('./pages/dashboard/ManagerDashboard'));
const KPIsRealTime = lazyRetry(() => import('./pages/dashboard/KPIsRealTime'));
const AlertsSystem = lazyRetry(() => import('./pages/dashboard/AlertsSystem'));
const AIInsights = lazyRetry(() => import('./pages/dashboard/AIInsights'));
const WorkflowsManager = lazyRetry(() => import('./pages/dashboard/WorkflowsManager'));
const FinancialAnalysisDashboard = lazyRetry(() => import('./pages/dashboard/FinancialAnalysisDashboard'));

// Comptabilite
const AccountingDashboard = lazyRetry(() => import('./pages/accounting/AccountingDashboard'));
const JournalsPage = lazyRetry(() => import('./pages/accounting/JournalsPage'));
const EntriesPage = lazyRetry(() => import('./pages/accounting/EntriesPage'));
const BalancePage = lazyRetry(() => import('./pages/accounting/BalancePage'));
const ChartOfAccountsPage = lazyRetry(() => import('./pages/accounting/ChartOfAccountsPage'));
const GeneralLedgerPage = lazyRetry(() => import('./pages/accounting/GeneralLedgerPage'));
const LettragePage = lazyRetry(() => import('./pages/accounting/LettragePage'));
const LettrageAutomatiquePage = lazyRetry(() => import('./pages/accounting/LettrageAutomatiquePage'));
const OCRInvoices = lazyRetry(() => import('./pages/accounting/OCRInvoices'));
const ElectronicSignature = lazyRetry(() => import('./pages/accounting/ElectronicSignature'));
const FinancialStatementsPage = lazyRetry(() => import('./pages/accounting/FinancialStatementsPage'));
const IncomeStatementPage = lazyRetry(() => import('./pages/accounting/IncomeStatementPage'));
const BalanceSheetPage = lazyRetry(() => import('./pages/accounting/BalanceSheetPage'));
const CashFlowPageAccounting = lazyRetry(() => import('./pages/accounting/CashFlowPage'));
const FinancialRatiosPage = lazyRetry(() => import('./pages/accounting/FinancialRatiosPage'));
const ReportsPageAccounting = lazyRetry(() => import('./pages/accounting/ReportsPage'));

// Tiers
const TiersDashboard = lazyRetry(() => import('./pages/tiers/TiersDashboard'));
const ClientsModule = lazyRetry(() => import('./pages/tiers/ClientsModule'));
const FournisseursModule = lazyRetry(() => import('./pages/tiers/FournisseursModule'));
const RecouvrementModule = lazyRetry(() => import('./pages/tiers/RecouvrementModule'));
const ContactsModule = lazyRetry(() => import('./pages/tiers/ContactsModule'));
const LettrageModule = lazyRetry(() => import('./pages/tiers/LettrageModule'));
const PartenairesModule = lazyRetry(() => import('./pages/tiers/PartenairesModule'));
const ProspectsModule = lazyRetry(() => import('./pages/tiers/ProspectsModule'));

// Third-party (alternative)
const ThirdPartyDashboard = lazyRetry(() => import('./pages/third-party/ThirdPartyDashboard'));

// Tresorerie
const TreasuryDashboard = lazyRetry(() => import('./pages/treasury/TreasuryDashboard'));
const BankAccountsPage = lazyRetry(() => import('./pages/treasury/BankAccountsPage'));
const FundCallsPage = lazyRetry(() => import('./pages/treasury/FundCallsPage'));
const TreasuryPositions = lazyRetry(() => import('./pages/treasury/TreasuryPositions'));
const CashFlowPage = lazyRetry(() => import('./pages/treasury/CashFlowPage'));
const ReconciliationPage = lazyRetry(() => import('./pages/treasury/ReconciliationPage'));
const MultiCurrency = lazyRetry(() => import('./pages/treasury/MultiCurrency'));
const BankMovementsPage = lazyRetry(() => import('./pages/treasury/BankMovementsPage'));
const ConnexionsBancairesPage = lazyRetry(() => import('./pages/treasury/ConnexionsBancairesPage'));
const GestionPaiementsPage = lazyRetry(() => import('./pages/treasury/GestionPaiementsPage'));
const PrevisionsTresoreriePage = lazyRetry(() => import('./pages/treasury/PrevisionsTresoreriePage'));
const PositionTresoreriePage = lazyRetry(() => import('./pages/treasury/PositionTresoreriePage'));

// Immobilisations
const AssetsDashboard = lazyRetry(() => import('./pages/assets/AssetsDashboard'));
const FixedAssetsPage = lazyRetry(() => import('./pages/assets/FixedAssetsPage'));
const DepreciationPage = lazyRetry(() => import('./pages/assets/DepreciationPage'));
const AssetsSummary = lazyRetry(() => import('./pages/assets/AssetsSummary'));
const AssetsRegistry = lazyRetry(() => import('./pages/assets/AssetsRegistry'));
const AssetsTransactions = lazyRetry(() => import('./pages/assets/AssetsTransactions'));
const AssetsCategories = lazyRetry(() => import('./pages/assets/AssetsCategories'));
const AssetsClasses = lazyRetry(() => import('./pages/assets/AssetsClasses'));
const AssetsJournal = lazyRetry(() => import('./pages/assets/AssetsJournal'));
const AssetsDisposals = lazyRetry(() => import('./pages/assets/AssetsDisposals'));
const AssetsMaintenance = lazyRetry(() => import('./pages/assets/AssetsMaintenance'));
const InventairePhysiquePage = lazyRetry(() => import('./pages/assets/InventairePhysiquePage'));

// Budget
const BudgetingDashboard = lazyRetry(() => import('./pages/budgeting/BudgetingDashboard'));
const BudgetsPage = lazyRetry(() => import('./pages/budgeting/BudgetsPage'));
const BudgetControlPage = lazyRetry(() => import('./pages/budgeting/BudgetControlPage'));
const BudgetDetailPage = lazyRetry(() => import('./pages/budgeting/BudgetDetailPage'));

// Clotures
const ClosureModulesIndex = lazyRetry(() => import('./pages/closures/ClosureModulesIndex'));
const PeriodicClosuresModule = lazyRetry(() => import('./pages/closures/PeriodicClosuresModule'));
const RevisionsModule = lazyRetry(() => import('./pages/closures/RevisionsModule'));
const ReportsANouveauModule = lazyRetry(() => import('./pages/closures/ReportsANouveauModule'));
const PisteAuditModule = lazyRetry(() => import('./pages/closures/PisteAuditModule'));

// Reporting
const ReportingDashboard = lazyRetry(() => import('./pages/reporting/ReportingDashboard'));
const TaxReportingPage = lazyRetry(() => import('./pages/reporting/TaxReportingPage'));
const DashboardsPage = lazyRetry(() => import('./pages/reporting/DashboardsPage'));
const ReportingSyscohada = lazyRetry(() => import('./pages/reporting/ReportingSyscohada'));
const ReportingIFRS = lazyRetry(() => import('./pages/reporting/ReportingIFRS'));
const ReportBuilderApp = lazyRetry(() => import('./features/report-builder/components/ReportBuilderApp'));

// Financial statements
const FinancialStatementsIndexPage = lazyRetry(() => import('./pages/financial/FinancialStatementsIndexPage'));
const BilanSYSCOHADAPage = lazyRetry(() => import('./pages/financial/BilanSYSCOHADAPage'));
const CompteResultatPage = lazyRetry(() => import('./pages/financial/CompteResultatPage'));
const FinancialAnalysisPage = lazyRetry(() => import('./pages/financial/FinancialAnalysisPage'));
const CashFlowStatementPage = lazyRetry(() => import('./components/financial/CashFlowStatementSYSCOHADA'));

// Fiscalite
const TaxationDashboard = lazyRetry(() => import('./pages/taxation/TaxationDashboard'));
const TaxDeclarationsPage = lazyRetry(() => import('./pages/taxation/TaxDeclarationsPage'));
const LiasseFiscalePage = lazyRetry(() => import('./pages/taxation/LiasseFiscalePage'));
const EcheancesFiscalesPage = lazyRetry(() => import('./pages/taxation/EcheancesFiscalesPage'));
const FiscalDashboard = lazyRetry(() => import('./pages/fiscal/FiscalDashboard'));

// Securite
const SecurityDashboard = lazyRetry(() => import('./pages/security/SecurityDashboard'));
const UsersPage = lazyRetry(() => import('./pages/security/UsersPage'));
const RolesPage = lazyRetry(() => import('./pages/security/RolesPage'));
const PermissionsPage = lazyRetry(() => import('./pages/security/PermissionsPage'));

// Analytics
const AnalyticsDashboard = lazyRetry(() => import('./pages/analytics/AnalyticsDashboard'));
const AnalyticalAxesPage = lazyRetry(() => import('./pages/analytics/AnalyticalAxesPage'));
const CostCentersPage = lazyRetry(() => import('./pages/analytics/CostCentersPage'));

// Inventory
const InventoryDashboard = lazyRetry(() => import('./pages/inventory/InventoryDashboard'));
const StockManagement = lazyRetry(() => import('./pages/inventory/StockManagement'));
const InventoryMovements = lazyRetry(() => import('./pages/inventory/InventoryMovements'));
const PhysicalInventory = lazyRetry(() => import('./pages/inventory/PhysicalInventory'));
const InventoryValuation = lazyRetry(() => import('./pages/inventory/InventoryValuation'));

// Treasury extensions (Correction #3)
const PaymentOrdersPage = lazyRetry(() => import('./pages/treasury/PaymentOrdersPage'));
const CashRegisterPage = lazyRetry(() => import('./pages/treasury/CashRegisterPage'));
const LoanSchedulePage = lazyRetry(() => import('./pages/treasury/LoanSchedulePage'));
const ChecksRegisterPage = lazyRetry(() => import('./pages/treasury/ChecksRegisterPage'));

// Cross Controls (Module P)
const CrossControlsPage = lazyRetry(() => import('./pages/accounting/CrossControlsPage'));

// Off-Balance Commitments (Correction #11)
const OffBalanceCommitmentsPage = lazyRetry(() => import('./pages/closures/OffBalanceCommitmentsPage'));

// New pages — Correction Massive
const EffetsCommercePage = lazyRetry(() => import('./pages/treasury/EffetsCommercePage'));
const ReevaluationPage = lazyRetry(() => import('./pages/assets/ReevaluationPage'));
const ComposantsPage = lazyRetry(() => import('./pages/assets/ComposantsPage'));
const EcartsConversionPage = lazyRetry(() => import('./pages/closures/EcartsConversionPage'));
const MultiSitesPage = lazyRetry(() => import('./pages/config/MultiSitesPage'));

// Settings
const AccountingSettingsPage = lazyRetry(() => import('./pages/settings/AccountingSettingsPage'));
const BackupPage = lazyRetry(() => import('./pages/settings/BackupPage'));
const ImportExportPage = lazyRetry(() => import('./pages/settings/ImportExportPage'));
const ImportTemplatesCatalogPage = lazyRetry(() => import('./pages/settings/ImportTemplatesCatalogPage'));
const APIIntegrationsPage = lazyRetry(() => import('./pages/settings/APIIntegrationsPage'));
const MobileAppPage = lazyRetry(() => import('./pages/settings/MobileAppPage'));
const OfflineModePage = lazyRetry(() => import('./pages/settings/OfflineModePage'));
const IAConfigPage = lazyRetry(() => import('./pages/settings/IAConfigPage'));
const TrackChangePage = lazyRetry(() => import('./pages/settings/TrackChangePage'));
const TypographyGuide = lazyRetry(() => import('./pages/settings/TypographyGuide'));
const ThemePalettesPage = lazyRetry(() => import('./pages/settings/ThemePalettesPage'));

// Config
const PlanSYSCOHADAPage = lazyRetry(() => import('./pages/config/PlanSYSCOHADAPage'));
const TVATaxesPage = lazyRetry(() => import('./pages/config/TVATaxesPage'));
const MultiSocietesPage = lazyRetry(() => import('./pages/config/MultiSocietesPage'));
const AssistantDemarragePage = lazyRetry(() => import('./pages/config/AssistantDemarragePage'));

// Core
const CompanyPage = lazyRetry(() => import('./pages/core/CompanyPage'));
const ExercicePage = lazyRetry(() => import('./pages/core/ExercicePage'));
const SetupWizardPage = lazyRetry(() => import('./pages/core/SetupWizardPage'));

// Erreurs
const NotFoundPage = lazyRetry(() => import('./pages/errors/NotFoundPage'));
const MaintenancePage = lazyRetry(() => import('./pages/errors/MaintenancePage'));

// Aide / Help center
const HelpCenterPage = lazyRetry(() => import('./pages/help/HelpCenterPage'));
const FAQPage = lazyRetry(() => import('./pages/help/FAQPage'));
const HelpArticlePage = lazyRetry(() => import('./pages/help/HelpArticlePage'));

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } } });
const LoadingFallback = () => <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ToastProvider>
                <NavigationProvider>
                    <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                    <ImpersonationBanner />
                    <GuidedTourOverlay />
                    <Routes>
                      {/* Pages publiques — pas d'auth, pas de chatbot */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/demo" element={<DemoPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/auth" element={<ExternalAuthPage />} />
                      {/* Format unifié Atlas Studio Suite — auth centralisée */}
                      <Route path="/signup" element={<AtlasStudioRedirect destination="signup" />} />
                      <Route path="/forgot-password" element={<AtlasStudioRedirect destination="forgot-password" />} />
                      <Route path="/reset-password" element={<AtlasStudioRedirect destination="reset-password" />} />
                      {/* Alias rétro-compat : /register existant garde l'ancien comportement (formulaire local) */}
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/verify-email" element={<VerifyEmailPage />} />
                      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
                      <Route path="/admin-login" element={<AdminLoginPage />} />

                      {/* Hub — sélecteur d'applications */}
                      <Route path="/hub" element={<AtlasStudioHub />} />

                      {/* Catalogue solutions & souscription */}
                      <Route path="/solutions" element={<SolutionCatalogPage />} />

                      {/* Admin Console */}
                      <Route path="/admin-console" element={<AdminConsoleLayout />}>
                        <Route index element={<AdminDashboardPage />} />
                        <Route path="tenants" element={<AdminTenantsPage />} />
                        <Route path="tenants/:id" element={<AdminTenantDetailPage />} />
                        <Route path="billing" element={<AdminBillingPage />} />
                        <Route path="features" element={<AdminFeaturesPage />} />
                        <Route path="support" element={<AdminSupportPage />} />
                        <Route path="support/tickets/:id" element={<AdminTicketDetailPage />} />
                        <Route path="monitoring" element={<AdminMonitoringPage />} />
                        <Route path="pricing" element={<AdminPricingPage />} />
                        <Route path="invoices" element={<AdminInvoiceGenerator />} />
                      </Route>

                      {/* Client Dashboard — portail client avec sidebar */}
                      <Route path="/client" element={<ClientDashboard />}>
                        <Route index element={<ClientHome />} />
                        <Route path="app/:code" element={<SolutionRouter />} />
                        <Route path="billing" element={<ClientBilling />} />
                        <Route path="checkout/:solutionCode" element={<ClientCheckout />} />
                        <Route path="licenses" element={<ClientLicenses />} />
                        <Route path="team" element={<ClientTeam />} />
                        <Route path="settings" element={<ClientSettings />} />
                        <Route path="audit" element={<ClientAuditTrail />} />
                      </Route>

                      {/* Team settings */}
                      <Route path="/settings/team" element={<TeamSettingsPage />} />

                      {/* Workspaces — protégés par authentification Supabase + chatbot IA */}
                      <Route element={<ChatbotProvider><RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard></ChatbotProvider>}>
                        <Route path="/workspace" element={<WorkspaceDashboard />} />
                        <Route path="/workspace/comptable" element={<ComptableWorkspace />} />
                        <Route path="/workspace/manager" element={<ManagerWorkspace />} />
                        <Route path="/workspace/admin" element={<AdminWorkspace />} />
                      </Route>

                      {/* Application principale avec layout + chatbot IA */}
                      {/* Page d'accueil Atlas F&A — plein écran, sans sidebar (pattern DocJourney) */}
                      <Route path="/home" element={<AtlasFnAHome />} />

                      <Route element={<ChatbotProvider><ModernDoubleSidebarLayout /></ChatbotProvider>}>
                        {/* Dashboards — all authenticated users */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/dashboard" element={<AccountingDashboard />} />
                          <Route path="/executive" element={<ExecutiveDashboard />} />
                          <Route path="/dashboard/admin" element={<AdminDashboard />} />
                          <Route path="/dashboard/comptable" element={<ComptableDashboard />} />
                          <Route path="/dashboard/manager" element={<ManagerDashboard />} />
                          <Route path="/dashboard/kpis" element={<KPIsRealTime />} />
                          <Route path="/dashboard/alerts" element={<AlertsSystem />} />
                          <Route path="/dashboard/ai-insights" element={<AIInsights />} />
                          <Route path="/dashboard/workflows" element={<WorkflowsManager />} />
                        </Route>

                        {/* Comptabilite */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Comptabilité" /></RBACGuard>}>
                          <Route path="/accounting" element={<AccountingDashboard />} />
                          <Route path="/accounting/journals" element={<JournalsPage />} />
                          <Route path="/accounting/entries" element={<EntriesPage />} />
                          <Route path="/accounting/balance" element={<BalancePage />} />
                          <Route path="/accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
                          <Route path="/accounting/general-ledger" element={<GeneralLedgerPage />} />
                          <Route path="/accounting/lettrage" element={<LettragePage />} />
                          <Route path="/accounting/lettrage-auto" element={<LettrageAutomatiquePage />} />
                          <Route path="/accounting/ocr" element={<OCRInvoices />} />
                          <Route path="/accounting/signature" element={<ElectronicSignature />} />
                          <Route path="/accounting/financial-statements" element={<FinancialStatementsPage />} />
                          <Route path="/accounting/income-statement" element={<IncomeStatementPage />} />
                          <Route path="/accounting/balance-sheet" element={<BalanceSheetPage />} />
                          <Route path="/accounting/cash-flow" element={<CashFlowPageAccounting />} />
                          <Route path="/accounting/ratios" element={<FinancialRatiosPage />} />
                          <Route path="/accounting/reports" element={<ReportsPageAccounting />} />
                          <Route path="/accounting/cross-controls" element={<CrossControlsPage />} />
                        </Route>

                        {/* Tiers */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Tiers" /></RBACGuard>}>
                          <Route path="/tiers" element={<TiersDashboard />} />
                          <Route path="/tiers/clients" element={<ClientsModule />} />
                          <Route path="/tiers/fournisseurs" element={<FournisseursModule />} />
                          <Route path="/tiers/recouvrement" element={<RecouvrementModule />} />
                          <Route path="/tiers/contacts" element={<ContactsModule />} />
                          <Route path="/tiers/lettrage" element={<LettrageModule />} />
                          <Route path="/tiers/partenaires" element={<PartenairesModule />} />
                          <Route path="/tiers/prospects" element={<ProspectsModule />} />
                          <Route path="/third-party" element={<ThirdPartyDashboard />} />
                        </Route>

                        {/* Tresorerie */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Trésorerie" /></RBACGuard>}>
                          <Route path="/treasury" element={<TreasuryDashboard />} />
                          <Route path="/treasury/accounts" element={<BankAccountsPage />} />
                          <Route path="/treasury/fund-calls" element={<FundCallsPage />} />
                          <Route path="/treasury/positions" element={<TreasuryPositions />} />
                          <Route path="/treasury/cash-flow" element={<CashFlowPage />} />
                          <Route path="/treasury/reconciliation" element={<ReconciliationPage />} />
                          <Route path="/treasury/financing" element={<TreasuryDashboard />} />
                          <Route path="/treasury/multi-currency" element={<MultiCurrency />} />
                          <Route path="/treasury/movements" element={<BankMovementsPage />} />
                          <Route path="/treasury/connections" element={<ConnexionsBancairesPage />} />
                          <Route path="/treasury/payments" element={<GestionPaiementsPage />} />
                          <Route path="/treasury/forecast" element={<PrevisionsTresoreriePage />} />
                          <Route path="/treasury/position" element={<PositionTresoreriePage />} />
                          <Route path="/treasury/payment-orders" element={<PaymentOrdersPage />} />
                          <Route path="/treasury/cash-register" element={<CashRegisterPage />} />
                          <Route path="/treasury/loan-schedule" element={<LoanSchedulePage />} />
                          <Route path="/treasury/checks" element={<ChecksRegisterPage />} />
                          <Route path="/treasury/effets-commerce" element={<EffetsCommercePage />} />
                        </Route>

                        {/* Immobilisations */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Immobilisations" /></RBACGuard>}>
                          <Route path="/assets" element={<AssetsDashboard />} />
                          <Route path="/assets/fixed" element={<FixedAssetsPage />} />
                          <Route path="/assets/depreciation" element={<DepreciationPage />} />
                          <Route path="/assets/summary" element={<AssetsSummary />} />
                          <Route path="/assets/registry" element={<AssetsRegistry />} />
                          <Route path="/assets/transactions" element={<AssetsTransactions />} />
                          <Route path="/assets/categories" element={<AssetsCategories />} />
                          <Route path="/assets/classes" element={<AssetsClasses />} />
                          <Route path="/assets/journal" element={<AssetsJournal />} />
                          <Route path="/assets/disposals" element={<AssetsDisposals />} />
                          <Route path="/assets/inventory" element={<AssetsRegistry />} />
                          <Route path="/assets/maintenance" element={<AssetsMaintenance />} />
                          <Route path="/assets/physical-inventory" element={<InventairePhysiquePage />} />
                          <Route path="/assets/reevaluation" element={<ReevaluationPage />} />
                          <Route path="/assets/composants" element={<ComposantsPage />} />
                        </Route>

                        {/* Budget */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Budget" /></RBACGuard>}>
                          <Route path="/budgeting" element={<BudgetingDashboard />} />
                          <Route path="/budgeting/list" element={<BudgetsPage />} />
                          <Route path="/budgeting/control" element={<BudgetControlPage />} />
                          <Route path="/budgeting/detail/:id" element={<BudgetDetailPage />} />
                        </Route>

                        {/* Clotures */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Clôtures" /></RBACGuard>}>
                          <Route path="/closures" element={<ClosureModulesIndex />} />
                          <Route path="/closures/periodic" element={<PeriodicClosuresModule />} />
                          <Route path="/closures/revisions" element={<RevisionsModule />} />
                          <Route path="/closures/carry-forward" element={<ReportsANouveauModule />} />
                          <Route path="/closures/audit-trail" element={<PisteAuditModule />} />
                          <Route path="/closures/off-balance" element={<OffBalanceCommitmentsPage />} />
                          <Route path="/closures/ecarts-conversion" element={<EcartsConversionPage />} />
                        </Route>

                        {/* Etats financiers */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="États financiers" /></RBACGuard>}>
                          <Route path="/financial-statements" element={<FinancialStatementsIndexPage />} />
                          <Route path="/financial-statements/balance" element={<BilanSYSCOHADAPage />} />
                          <Route path="/financial-statements/income" element={<CompteResultatPage />} />
                          <Route path="/financial-statements/cash-flow" element={<CashFlowStatementPage />} />
                          <Route path="/financial-statements/analysis" element={<FinancialAnalysisPage />} />
                        </Route>

                        {/* Reporting */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Reporting" /></RBACGuard>}>
                          <Route path="/reporting" element={<ReportingDashboard />} />
                          <Route path="/reporting/dashboards" element={<DashboardsPage />} />
                          <Route path="/reporting/tax" element={<TaxReportingPage />} />
                          <Route path="/reporting/syscohada" element={<ReportingSyscohada />} />
                          <Route path="/reporting/ifrs" element={<ReportingIFRS />} />
                          <Route path="/reporting/builder" element={<ReportBuilderApp />} />
                          <Route path="/reports" element={<ReportingDashboard />} />
                        </Route>

                        {/* Analytics */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/analytics" element={<AnalyticsDashboard />} />
                          <Route path="/analytics/axes" element={<AnalyticalAxesPage />} />
                          <Route path="/analytics/cost-centers" element={<CostCentersPage />} />
                          <Route path="/financial-analysis-advanced" element={<FinancialAnalysisDashboard />} />
                        </Route>

                        {/* Inventory */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/inventory" element={<InventoryDashboard />} />
                          <Route path="/inventory/stock" element={<StockManagement />} />
                          <Route path="/inventory/movements" element={<InventoryMovements />} />
                          <Route path="/inventory/physical" element={<PhysicalInventory />} />
                          <Route path="/inventory/valuation" element={<InventoryValuation />} />
                        </Route>

                        {/* Fiscalite */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Fiscalité" /></RBACGuard>}>
                          <Route path="/taxation" element={<TaxationDashboard />} />
                          <Route path="/taxation/declarations" element={<TaxDeclarationsPage />} />
                          <Route path="/taxation/liasse" element={<LiasseFiscalePage />} />
                          <Route path="/taxation/echeances" element={<EcheancesFiscalesPage />} />
                          <Route path="/taxation/fiscal-dashboard" element={<FiscalDashboard />} />
                        </Route>

                        {/* Securite — admin only */}
                        <Route element={<RBACGuard allowedRoles={['admin']}><FeatureErrorBoundary feature="Sécurité" /></RBACGuard>}>
                          <Route path="/security" element={<SecurityDashboard />} />
                          <Route path="/security/users" element={<UsersPage />} />
                          <Route path="/security/roles" element={<RolesPage />} />
                          <Route path="/security/permissions" element={<PermissionsPage />} />
                        </Route>

                        {/* Settings — admin only */}
                        <Route element={<RBACGuard allowedRoles={['admin']}><Outlet /></RBACGuard>}>
                          <Route path="/settings" element={<AccountingSettingsPage />} />
                          <Route path="/settings/accounting" element={<AccountingSettingsPage />} />
                          <Route path="/settings/users" element={<UsersPage />} />
                          <Route path="/settings/company" element={<CompanyPage />} />
                          <Route path="/settings/import-export" element={<ImportExportPage />} />
                          <Route path="/settings/import-templates" element={<ImportTemplatesCatalogPage />} />
                          <Route path="/settings/backup" element={<BackupPage />} />
                          <Route path="/settings/api" element={<APIIntegrationsPage />} />
                          <Route path="/settings/mobile" element={<MobileAppPage />} />
                          <Route path="/settings/offline" element={<OfflineModePage />} />
                          <Route path="/settings/ia" element={<IAConfigPage />} />
                          <Route path="/settings/track-change" element={<TrackChangePage />} />
                          <Route path="/settings/typography" element={<TypographyGuide />} />
                          <Route path="/parameters" element={<AccountingSettingsPage />} />
                        </Route>

                        {/* Config */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/config/plan-syscohada" element={<PlanSYSCOHADAPage />} />
                          <Route path="/config/tva" element={<TVATaxesPage />} />
                          <Route path="/config/multi-societes" element={<MultiSocietesPage />} />
                          <Route path="/config/multi-sites" element={<MultiSitesPage />} />
                          <Route path="/config/wizard" element={<AssistantDemarragePage />} />
                        </Route>

                        {/* Core — admin only */}
                        <Route element={<RBACGuard allowedRoles={['admin']}><Outlet /></RBACGuard>}>
                          <Route path="/core/company" element={<CompanyPage />} />
                          <Route path="/core/exercice" element={<ExercicePage />} />
                          <Route path="/setup" element={<SetupWizardPage />} />
                        </Route>

                        {/* Thèmes — accessible à tous les utilisateurs authentifiés */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/settings/themes" element={<ThemePalettesPage />} />
                        </Route>

                        {/* Aide / Help — accessible à tous les utilisateurs authentifiés */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/help" element={<HelpCenterPage />} />
                          <Route path="/help/faq" element={<FAQPage />} />
                          <Route path="/help/article/:articleId" element={<HelpArticlePage />} />
                        </Route>
                      </Route>

                      {/* Erreurs */}
                      <Route path="/maintenance" element={<MaintenancePage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </NavigationProvider>
              </ToastProvider>
            </WorkspaceProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
