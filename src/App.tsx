import React, { Suspense } from 'react';
import { Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/react-query';

import { ThemeProvider } from './contexts/ThemeContext';
import { AccessibilityProvider } from './accessibility';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ModernDoubleSidebarLayout from './components/layout/ModernDoubleSidebarLayout';
import DataPageLayout from './components/layout/DataPageLayout';
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
    importFn().catch((err: unknown) => {
      // Stale chunk after new deploy — hard-reload once per 30s window.
      // Using a timestamp key prevents stale booleans from previous deployments
      // blocking the reload indefinitely.
      const TS_KEY = 'chunk-reload-ts';
      const last = Number(sessionStorage.getItem(TS_KEY) ?? 0);
      const canReload = Date.now() - last > 30_000;
      if (canReload) {
        sessionStorage.setItem(TS_KEY, String(Date.now()));
        window.location.reload();
        // Suspend forever while the reload is in flight — never resolve/reject
        return new Promise<any>(() => {});
      }
      // Reloaded recently and still failing → let ErrorBoundary handle it
      throw err;
    })
  );
}

// Pages publiques
const LandingPage = lazyRetry(() => import('./pages/LandingPage'));
const DemoPage = lazyRetry(() => import('./pages/DemoPage'));
const LoginPage = lazyRetry(() => import('./pages/auth/LoginPage'));
const AtlasFnAHome = lazyRetry(() => import('./pages/platform/AtlasFnAHome'));
const ExternalAuthPage = lazyRetry(() => import('./pages/auth/ExternalAuthPage'));
const ExternalValidation = lazyRetry(() => import('./pages/public/ExternalValidation'));
const AtlasStudioHub = lazyRetry(() => import('./pages/auth/AtlasStudioHub'));

// Onboarding
const RegisterPage = lazyRetry(() => import('./pages/onboarding/RegisterPage'));
const AtlasStudioRedirect = lazyRetry(() => import('./pages/AtlasStudioRedirect'));
const VerifyEmailPage = lazyRetry(() => import('./pages/onboarding/VerifyEmailPage'));
const SolutionCatalogPage = lazyRetry(() => import('./pages/onboarding/SolutionCatalogPage'));
const TeamSettingsPage = lazyRetry(() => import('./pages/settings/TeamSettingsPage'));
const AcceptInvitePage = lazyRetry(() => import('./pages/onboarding/AcceptInvitePage'));
const PremierConnexionPage = lazyRetry(() => import('./pages/onboarding/PremierConnexionPage'));

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

// Espace collaboratif
const CollaborationWorkspace = lazyRetry(() => import('./pages/collaboration/CollaborationWorkspace'));
const BannettePage = lazyRetry(() => import('./pages/validation/BannettePage'));
const GouvernancePage = lazyRetry(() => import('./pages/validation/GouvernancePage'));
// Dashboards
const ExecutiveDashboard = lazyRetry(() => import('./pages/dashboard/PremiumOverview'));
const ExecutiveDashboardLegacy = lazyRetry(() => import('./pages/dashboard/ExecutiveDashboard'));
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
const JournalDetailPage = lazyRetry(() => import('./pages/accounting/JournalDetailPage'));
const BalanceSheetPage = lazyRetry(() => import('./pages/accounting/BalanceSheetPage'));
const CashFlowPageAccounting = lazyRetry(() => import('./pages/accounting/CashFlowPage'));
const FinancialRatiosPage = lazyRetry(() => import('./pages/accounting/FinancialRatiosPage'));
const ReportsPageAccounting = lazyRetry(() => import('./pages/accounting/ReportsPage'));

// Tiers
const TiersDashboard = lazyRetry(() => import('./pages/tiers/TiersDashboard'));
const ClientsModule = lazyRetry(() => import('./pages/tiers/ClientsModule'));
const FournisseursModule = lazyRetry(() => import('./pages/tiers/FournisseursModule'));
const RecouvrementModule = lazyRetry(() => import('./pages/tiers/RecouvrementModule'));
const PersonnelModule = lazyRetry(() => import('./pages/tiers/PersonnelModule'));
const AutresTiersModule = lazyRetry(() => import('./pages/tiers/AutresTiersModule'));
const ContactsModule = lazyRetry(() => import('./pages/tiers/ContactsModule'));
const LettrageModule = lazyRetry(() => import('./pages/tiers/LettrageModule'));
const PartenairesModule = lazyRetry(() => import('./pages/tiers/PartenairesModule'));
const ProspectsModule = lazyRetry(() => import('./pages/tiers/ProspectsModule'));

// Third-party (alternative)
const ThirdPartyDashboard = lazyRetry(() => import('./pages/third-party/ThirdPartyDashboard'));

// Tresorerie
const TreasuryDashboard = lazyRetry(() => import('./pages/treasury/TreasuryDashboard'));
const BudgetHubPage = lazyRetry(() => import('./pages/budget/BudgetHubPage'));
const BudgetEngagementsPage = lazyRetry(() => import('./pages/budget/BudgetEngagementsPage'));
const BudgetLettragePage = lazyRetry(() => import('./pages/budget/BudgetLettragePage'));
const BudgetMatrixGridPage = lazyRetry(() => import('./pages/budget/BudgetMatrixGridPage'));
const BudgetPnLPage = lazyRetry(() => import('./pages/budget/BudgetPnLPage'));
const BudgetAlertesPage = lazyRetry(() => import('./pages/budget/BudgetAlertesPage'));
const BudgetCockpitPage = lazyRetry(() => import('./pages/budget/BudgetCockpitPage'));
const BudgetTablePage = lazyRetry(() => import('./pages/budgeting/BudgetTablePage'));
const BudgetExploitationPage = lazyRetry(() => import('./pages/budget/BudgetExploitationPage'));
const BudgetInvestissementPage = lazyRetry(() => import('./pages/budget/BudgetInvestissementPage'));
const BudgetEcartsPage = lazyRetry(() => import('./pages/budget/BudgetEcartsPage'));
const BudgetVersionsPage = lazyRetry(() => import('./pages/budget/BudgetVersionsPage'));
const BudgetVersionDetailPage = lazyRetry(() => import('./pages/budget/BudgetVersionDetailPage'));
const AnalyticsSectionsPage = lazyRetry(() => import('./pages/budget/AnalyticsSectionsPage'));
const VentilationRunPage = lazyRetry(() => import('./pages/budget/VentilationRunPage'));
const TresoreriePrevisionLFTPage = lazyRetry(() => import('./pages/budget/TresoreriePrevisionLFTPage'));
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

// Budget — module legacy /budgeting retiré (refonte OPEX/CAPEX D2) : routes redirigées vers /budget

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

const LoadingFallback = () => <div className="flex items-center justify-center min-h-screen"><LoadingSpinner size="lg" /></div>;


/**
 * Écrans de TRAVAIL sur données (grosses tables) : enveloppés dans le gabarit
 * standard DataPageLayout — la fenêtre ne défile pas, la page défile dans son
 * unique zone. Les pages « document » (dashboards, rapports) restent telles quelles.
 */
const work = (page: React.ReactElement) => <DataPageLayout>{page}</DataPageLayout>;

function App() {
  const location = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
      <ThemeProvider>
        <AccessibilityProvider>
        <LanguageProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <ToastProvider>
                <NavigationProvider>
                    <ErrorBoundary resetKey={location.pathname}>
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
                      {/* Validation externe d'une décision (lien nominatif OTP) — hors auth */}
                      <Route path="/validate/:token" element={<ExternalValidation />} />
                      <Route path="/premier-connexion" element={<PremierConnexionPage />} />
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
                      </Route>
                      <Route element={<ChatbotProvider><RBACGuard allowedRoles={['admin', 'manager']}><Outlet /></RBACGuard></ChatbotProvider>}>
                        <Route path="/workspace/manager" element={<ManagerWorkspace />} />
                      </Route>
                      <Route element={<ChatbotProvider><RBACGuard allowedRoles={['admin']}><Outlet /></RBACGuard></ChatbotProvider>}>
                        <Route path="/workspace/admin" element={<AdminWorkspace />} />
                      </Route>

                      {/* Application principale avec layout + chatbot IA */}
                      {/* Page d'accueil Atlas FnA — plein écran, sans sidebar (pattern DocJourney) */}
                      <Route path="/home" element={<AtlasFnAHome />} />

                      <Route element={<ChatbotProvider><ModernDoubleSidebarLayout /></ChatbotProvider>}>
                        {/* Dashboards — all authenticated users */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/dashboard" element={<AccountingDashboard />} />
                          <Route path="/executive" element={<ExecutiveDashboard />} />
                          <Route path="/executive/legacy" element={<ExecutiveDashboardLegacy />} />
                          <Route path="/dashboard/admin" element={<AdminDashboard />} />
                          <Route path="/dashboard/comptable" element={<ComptableDashboard />} />
                          <Route path="/dashboard/manager" element={<ManagerDashboard />} />
                          <Route path="/dashboard/kpis" element={<KPIsRealTime />} />
                          <Route path="/dashboard/alerts" element={<AlertsSystem />} />
                          <Route path="/dashboard/ai-insights" element={<AIInsights />} />
                          {/* /proph3t : cible du raccourci clavier et des liens Atlas Studio
                              (404 sinon) → module IA (analyses réelles + analyse Proph3t). */}
                          <Route path="/proph3t" element={<AIInsights />} />
                          <Route path="/dashboard/workflows" element={<WorkflowsManager />} />
                        </Route>

                        {/* Comptabilite */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Comptabilité" /></RBACGuard>}>
                          <Route path="/accounting" element={<AccountingDashboard />} />
                          <Route path="/accounting/journals" element={<JournalsPage />} />
                          <Route path="/accounting/journals/:journalCode" element={<JournalDetailPage />} />
                          <Route path="/accounting/entries" element={<EntriesPage />} />
                          <Route path="/accounting/balance" element={<BalancePage />} />
                          <Route path="/accounting/chart-of-accounts" element={work(<ChartOfAccountsPage />)} />
                          <Route path="/accounting/general-ledger" element={<GeneralLedgerPage />} />
                          <Route path="/accounting/lettrage" element={<LettragePage />} />
                          <Route path="/accounting/lettrage-auto" element={work(<LettrageAutomatiquePage />)} />
                          <Route path="/accounting/ocr" element={work(<OCRInvoices />)} />
                          <Route path="/accounting/signature" element={work(<ElectronicSignature />)} />
                          <Route path="/accounting/financial-statements" element={<FinancialStatementsPage />} />
                          <Route path="/accounting/income-statement" element={<IncomeStatementPage />} />
                          <Route path="/accounting/balance-sheet" element={<BalanceSheetPage />} />
                          <Route path="/accounting/cash-flow" element={<CashFlowPageAccounting />} />
                          <Route path="/accounting/ratios" element={<FinancialRatiosPage />} />
                          <Route path="/accounting/reports" element={<ReportsPageAccounting />} />
                          <Route path="/accounting/cross-controls" element={work(<CrossControlsPage />)} />
                          <Route path="/budget" element={work(<BudgetHubPage />)} />
                          <Route path="/budget/cockpit" element={work(<BudgetCockpitPage />)} />
                          <Route path="/budget/table" element={work(<BudgetTablePage />)} />
                          <Route path="/budget/exploitation" element={work(<BudgetExploitationPage />)} />
                          <Route path="/budget/investissement" element={work(<BudgetInvestissementPage />)} />
                          <Route path="/budget/engagements" element={work(<BudgetEngagementsPage />)} />
                          <Route path="/budget/lettrage" element={work(<BudgetLettragePage />)} />
                          <Route path="/budget/saisie/:sectionId" element={work(<BudgetMatrixGridPage />)} />
                          <Route path="/budget/pnl" element={work(<BudgetPnLPage />)} />
                          <Route path="/budget/alertes" element={work(<BudgetAlertesPage />)} />
                          <Route path="/budget/ecarts" element={work(<BudgetEcartsPage />)} />
                          <Route path="/budget/versions" element={work(<BudgetVersionsPage />)} />
                          <Route path="/budget/versions/:id" element={work(<BudgetVersionDetailPage />)} />
                          <Route path="/analytique" element={work(<AnalyticsSectionsPage />)} />
                          <Route path="/budget/ventilation" element={work(<VentilationRunPage />)} />
                          <Route path="/tresorerie/prevision-lft" element={work(<TresoreriePrevisionLFTPage />)} />
                        </Route>

                        {/* Tiers */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Tiers" /></RBACGuard>}>
                          <Route path="/tiers" element={<TiersDashboard />} />
                          <Route path="/tiers/clients" element={work(<ClientsModule />)} />
                          <Route path="/tiers/clients/:id" element={work(<ClientsModule />)} />
                          <Route path="/tiers/fournisseurs" element={work(<FournisseursModule />)} />
                          <Route path="/tiers/fournisseurs/:id" element={work(<FournisseursModule />)} />
                          <Route path="/tiers/personnel" element={work(<PersonnelModule />)} />
                          <Route path="/tiers/autres" element={work(<AutresTiersModule />)} />
                          <Route path="/tiers/recouvrement" element={work(<RecouvrementModule />)} />
                          <Route path="/tiers/contacts" element={work(<ContactsModule />)} />
                          <Route path="/tiers/lettrage" element={work(<LettrageModule />)} />
                          <Route path="/tiers/partenaires" element={work(<PartenairesModule />)} />
                          <Route path="/tiers/prospects" element={work(<ProspectsModule />)} />
                          <Route path="/third-party" element={<ThirdPartyDashboard />} />
                        </Route>

                        {/* Tresorerie */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Trésorerie" /></RBACGuard>}>
                          <Route path="/treasury" element={<TreasuryDashboard />} />
                          <Route path="/treasury/accounts" element={work(<BankAccountsPage />)} />
                          <Route path="/treasury/fund-calls" element={work(<FundCallsPage />)} />
                          <Route path="/treasury/positions" element={work(<TreasuryPositions />)} />
                          <Route path="/treasury/cash-flow" element={<CashFlowPage />} />
                          <Route path="/treasury/reconciliation" element={work(<ReconciliationPage />)} />
                          <Route path="/treasury/financing" element={<TreasuryDashboard />} />
                          <Route path="/treasury/multi-currency" element={work(<MultiCurrency />)} />
                          <Route path="/treasury/movements" element={work(<BankMovementsPage />)} />
                          <Route path="/treasury/connections" element={work(<ConnexionsBancairesPage />)} />
                          <Route path="/treasury/payments" element={work(<GestionPaiementsPage />)} />
                          <Route path="/treasury/forecast" element={work(<PrevisionsTresoreriePage />)} />
                          <Route path="/treasury/position" element={work(<PositionTresoreriePage />)} />
                          <Route path="/treasury/payment-orders" element={work(<PaymentOrdersPage />)} />
                          <Route path="/treasury/cash-register" element={work(<CashRegisterPage />)} />
                          <Route path="/treasury/loan-schedule" element={work(<LoanSchedulePage />)} />
                          <Route path="/treasury/checks" element={work(<ChecksRegisterPage />)} />
                          <Route path="/treasury/effets-commerce" element={work(<EffetsCommercePage />)} />
                        </Route>

                        {/* Immobilisations */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Immobilisations" /></RBACGuard>}>
                          <Route path="/assets" element={<AssetsDashboard />} />
                          <Route path="/assets/fixed" element={work(<FixedAssetsPage />)} />
                          <Route path="/assets/depreciation" element={work(<DepreciationPage />)} />
                          <Route path="/assets/summary" element={work(<AssetsSummary />)} />
                          <Route path="/assets/registry" element={work(<AssetsRegistry />)} />
                          <Route path="/assets/transactions" element={work(<AssetsTransactions />)} />
                          <Route path="/assets/categories" element={work(<AssetsCategories />)} />
                          <Route path="/assets/classes" element={work(<AssetsClasses />)} />
                          <Route path="/assets/journal" element={work(<AssetsJournal />)} />
                          <Route path="/assets/disposals" element={work(<AssetsDisposals />)} />
                          <Route path="/assets/inventory" element={work(<AssetsRegistry />)} />
                          <Route path="/assets/maintenance" element={work(<AssetsMaintenance />)} />
                          <Route path="/assets/physical-inventory" element={work(<InventairePhysiquePage />)} />
                          <Route path="/assets/reevaluation" element={work(<ReevaluationPage />)} />
                          <Route path="/assets/composants" element={work(<ComposantsPage />)} />
                        </Route>

                        {/* Budget */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Budget" /></RBACGuard>}>
                          {/* Legacy /budgeting retiré (D2) → redirection vers le module unifié /budget */}
                          <Route path="/budgeting" element={<Navigate to="/budget" replace />} />
                          <Route path="/budgeting/*" element={<Navigate to="/budget" replace />} />
                        </Route>

                        {/* Clotures */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Clôtures" /></RBACGuard>}>
                          <Route path="/closures" element={<ClosureModulesIndex />} />
                          <Route path="/closures/periodic" element={<PeriodicClosuresModule />} />
                          <Route path="/closures/revisions" element={work(<RevisionsModule />)} />
                          <Route path="/closures/carry-forward" element={work(<ReportsANouveauModule />)} />
                          <Route path="/closures/audit-trail" element={work(<PisteAuditModule />)} />
                          <Route path="/closures/off-balance" element={work(<OffBalanceCommitmentsPage />)} />
                          <Route path="/closures/ecarts-conversion" element={work(<EcartsConversionPage />)} />
                        </Route>

                        {/* Espace collaboratif */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Espace collaboratif" /></RBACGuard>}>
                          <Route path="/collaboration" element={<CollaborationWorkspace />} />
                        </Route>

                        {/* Bannette — parapheur unifié (Moteur de Validation Atlas) */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Bannette" /></RBACGuard>}>
                          <Route path="/bannette" element={<BannettePage />} />
                          <Route path="/gouvernance" element={<GouvernancePage />} />
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
                          {/* Ancien tableau de bord analytique (blocs vides, non pratique) → page consolidée /analytique */}
                          <Route path="/analytics" element={<Navigate to="/analytique" replace />} />
                          <Route path="/analytics/axes" element={work(<AnalyticalAxesPage />)} />
                          <Route path="/analytics/cost-centers" element={work(<CostCentersPage />)} />
                          <Route path="/financial-analysis-advanced" element={<FinancialAnalysisDashboard />} />
                        </Route>

                        {/* Inventory */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><Outlet /></RBACGuard>}>
                          <Route path="/inventory" element={<InventoryDashboard />} />
                          <Route path="/inventory/stock" element={work(<StockManagement />)} />
                          <Route path="/inventory/movements" element={work(<InventoryMovements />)} />
                          <Route path="/inventory/physical" element={work(<PhysicalInventory />)} />
                          <Route path="/inventory/valuation" element={work(<InventoryValuation />)} />
                        </Route>

                        {/* Fiscalite */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'comptable', 'accountant']}><FeatureErrorBoundary feature="Fiscalité" /></RBACGuard>}>
                          <Route path="/taxation" element={<TaxationDashboard />} />
                          <Route path="/taxation/declarations" element={work(<TaxDeclarationsPage />)} />
                          <Route path="/taxation/liasse" element={<LiasseFiscalePage />} />
                          <Route path="/taxation/echeances" element={work(<EcheancesFiscalesPage />)} />
                          <Route path="/taxation/fiscal-dashboard" element={<FiscalDashboard />} />
                        </Route>

                        {/* Securite — admin only */}
                        <Route element={<RBACGuard allowedRoles={['admin']}><FeatureErrorBoundary feature="Sécurité" /></RBACGuard>}>
                          <Route path="/security" element={<SecurityDashboard />} />
                          <Route path="/security/users" element={work(<UsersPage />)} />
                          <Route path="/security/roles" element={work(<RolesPage />)} />
                          <Route path="/security/permissions" element={work(<PermissionsPage />)} />
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
        </AccessibilityProvider>
      </ThemeProvider>
      </DataProvider>
    </QueryClientProvider>
  );
}

export default App;
