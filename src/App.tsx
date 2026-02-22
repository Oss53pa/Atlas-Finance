import React, { Suspense } from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
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
import { DataProvider } from './contexts/DataContext';
import './styles/globals.css';

// Pages publiques
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));

// Workspaces
const ComptableWorkspace = React.lazy(() => import('./pages/workspace/ComptableWorkspaceFinal'));
const ManagerWorkspace = React.lazy(() => import('./pages/workspace/ManagerWorkspace'));
const AdminWorkspace = React.lazy(() => import('./pages/workspace/AdminWorkspace'));
const WorkspaceDashboard = React.lazy(() => import('./pages/workspace/WorkspaceDashboard'));

// Dashboards
const ExecutiveDashboard = React.lazy(() => import('./pages/dashboard/ExecutiveDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/dashboard/AdminDashboard'));
const ComptableDashboard = React.lazy(() => import('./pages/dashboard/ComptableDashboard'));
const ManagerDashboard = React.lazy(() => import('./pages/dashboard/ManagerDashboard'));
const KPIsRealTime = React.lazy(() => import('./pages/dashboard/KPIsRealTime'));
const AlertsSystem = React.lazy(() => import('./pages/dashboard/AlertsSystem'));
const AIInsights = React.lazy(() => import('./pages/dashboard/AIInsights'));
const WorkflowsManager = React.lazy(() => import('./pages/dashboard/WorkflowsManager'));
const FinancialAnalysisDashboard = React.lazy(() => import('./pages/dashboard/FinancialAnalysisDashboard'));

// Comptabilite
const AccountingDashboard = React.lazy(() => import('./pages/accounting/AccountingDashboard'));
const JournalsPage = React.lazy(() => import('./pages/accounting/JournalsPage'));
const EntriesPage = React.lazy(() => import('./pages/accounting/EntriesPage'));
const BalancePage = React.lazy(() => import('./pages/accounting/BalancePage'));
const ChartOfAccountsPage = React.lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
const GeneralLedgerPage = React.lazy(() => import('./pages/accounting/GeneralLedgerPage'));
const LettragePage = React.lazy(() => import('./pages/accounting/LettragePage'));
const LettrageAutomatiquePage = React.lazy(() => import('./pages/accounting/LettrageAutomatiquePage'));
const OCRInvoices = React.lazy(() => import('./pages/accounting/OCRInvoices'));
const ElectronicSignature = React.lazy(() => import('./pages/accounting/ElectronicSignature'));
const FinancialStatementsPage = React.lazy(() => import('./pages/accounting/FinancialStatementsPage'));
const IncomeStatementPage = React.lazy(() => import('./pages/accounting/IncomeStatementPage'));
const BalanceSheetPage = React.lazy(() => import('./pages/accounting/BalanceSheetPage'));
const CashFlowPageAccounting = React.lazy(() => import('./pages/accounting/CashFlowPage'));
const FinancialRatiosPage = React.lazy(() => import('./pages/accounting/FinancialRatiosPage'));
const ReportsPageAccounting = React.lazy(() => import('./pages/accounting/ReportsPage'));

// Tiers
const TiersDashboard = React.lazy(() => import('./pages/tiers/TiersDashboard'));
const ClientsModule = React.lazy(() => import('./pages/tiers/ClientsModule'));
const FournisseursModule = React.lazy(() => import('./pages/tiers/FournisseursModule'));
const RecouvrementModule = React.lazy(() => import('./pages/tiers/RecouvrementModule'));
const ContactsModule = React.lazy(() => import('./pages/tiers/ContactsModule'));
const LettrageModule = React.lazy(() => import('./pages/tiers/LettrageModule'));
const PartenairesModule = React.lazy(() => import('./pages/tiers/PartenairesModule'));
const ProspectsModule = React.lazy(() => import('./pages/tiers/ProspectsModule'));

// Third-party (alternative)
const ThirdPartyDashboard = React.lazy(() => import('./pages/third-party/ThirdPartyDashboard'));

// Tresorerie
const TreasuryDashboard = React.lazy(() => import('./pages/treasury/TreasuryDashboard'));
const BankAccountsPage = React.lazy(() => import('./pages/treasury/BankAccountsPage'));
const FundCallsPage = React.lazy(() => import('./pages/treasury/FundCallsPage'));
const TreasuryPositions = React.lazy(() => import('./pages/treasury/TreasuryPositions'));
const CashFlowPage = React.lazy(() => import('./pages/treasury/CashFlowPage'));
const ReconciliationPage = React.lazy(() => import('./pages/treasury/ReconciliationPage'));
const MultiCurrency = React.lazy(() => import('./pages/treasury/MultiCurrency'));
const BankMovementsPage = React.lazy(() => import('./pages/treasury/BankMovementsPage'));
const ConnexionsBancairesPage = React.lazy(() => import('./pages/treasury/ConnexionsBancairesPage'));
const GestionPaiementsPage = React.lazy(() => import('./pages/treasury/GestionPaiementsPage'));
const PrevisionsTresoreriePage = React.lazy(() => import('./pages/treasury/PrevisionsTresoreriePage'));
const PositionTresoreriePage = React.lazy(() => import('./pages/treasury/PositionTresoreriePage'));

// Immobilisations
const AssetsDashboard = React.lazy(() => import('./pages/assets/AssetsDashboard'));
const FixedAssetsPage = React.lazy(() => import('./pages/assets/FixedAssetsPage'));
const DepreciationPage = React.lazy(() => import('./pages/assets/DepreciationPage'));
const AssetsSummary = React.lazy(() => import('./pages/assets/AssetsSummary'));
const AssetsRegistry = React.lazy(() => import('./pages/assets/AssetsRegistry'));
const AssetsTransactions = React.lazy(() => import('./pages/assets/AssetsTransactions'));
const AssetsCategories = React.lazy(() => import('./pages/assets/AssetsCategories'));
const AssetsClasses = React.lazy(() => import('./pages/assets/AssetsClasses'));
const AssetsJournal = React.lazy(() => import('./pages/assets/AssetsJournal'));
const AssetsDisposals = React.lazy(() => import('./pages/assets/AssetsDisposals'));
const AssetsMaintenance = React.lazy(() => import('./pages/assets/AssetsMaintenance'));
const InventairePhysiquePage = React.lazy(() => import('./pages/assets/InventairePhysiquePage'));

// Budget
const BudgetingDashboard = React.lazy(() => import('./pages/budgeting/BudgetingDashboard'));
const BudgetsPage = React.lazy(() => import('./pages/budgeting/BudgetsPage'));
const BudgetControlPage = React.lazy(() => import('./pages/budgeting/BudgetControlPage'));
const BudgetDetailPage = React.lazy(() => import('./pages/budgeting/BudgetDetailPage'));

// Clotures
const ClosureModulesIndex = React.lazy(() => import('./pages/closures/ClosureModulesIndex'));
const PeriodicClosuresModule = React.lazy(() => import('./pages/closures/PeriodicClosuresModule'));
const RevisionsModule = React.lazy(() => import('./pages/closures/RevisionsModule'));
const ReportsANouveauModule = React.lazy(() => import('./pages/closures/ReportsANouveauModule'));
const PisteAuditModule = React.lazy(() => import('./pages/closures/PisteAuditModule'));

// Reporting
const ReportingDashboard = React.lazy(() => import('./pages/reporting/ReportingDashboard'));
const TaxReportingPage = React.lazy(() => import('./pages/reporting/TaxReportingPage'));
const CustomReportsPage = React.lazy(() => import('./pages/reporting/CustomReportsPage'));
const DashboardsPage = React.lazy(() => import('./pages/reporting/DashboardsPage'));
const ReportingSyscohada = React.lazy(() => import('./pages/reporting/ReportingSyscohada'));
const ReportingIFRS = React.lazy(() => import('./pages/reporting/ReportingIFRS'));

// Financial statements
const FinancialStatementsIndexPage = React.lazy(() => import('./pages/financial/FinancialStatementsIndexPage'));
const BilanSYSCOHADAPage = React.lazy(() => import('./pages/financial/BilanSYSCOHADAPage'));
const CompteResultatPage = React.lazy(() => import('./pages/financial/CompteResultatPage'));
const FinancialAnalysisPage = React.lazy(() => import('./pages/financial/FinancialAnalysisPage'));

// Fiscalite
const TaxationDashboard = React.lazy(() => import('./pages/taxation/TaxationDashboard'));
const TaxDeclarationsPage = React.lazy(() => import('./pages/taxation/TaxDeclarationsPage'));
const LiasseFiscalePage = React.lazy(() => import('./pages/taxation/LiasseFiscalePage'));
const EcheancesFiscalesPage = React.lazy(() => import('./pages/taxation/EcheancesFiscalesPage'));

// Securite
const SecurityDashboard = React.lazy(() => import('./pages/security/SecurityDashboard'));
const UsersPage = React.lazy(() => import('./pages/security/UsersPage'));
const RolesPage = React.lazy(() => import('./pages/security/RolesPage'));
const PermissionsPage = React.lazy(() => import('./pages/security/PermissionsPage'));

// Analytics
const AnalyticsDashboard = React.lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const AnalyticalAxesPage = React.lazy(() => import('./pages/analytics/AnalyticalAxesPage'));
const CostCentersPage = React.lazy(() => import('./pages/analytics/CostCentersPage'));

// Inventory
const InventoryDashboard = React.lazy(() => import('./pages/inventory/InventoryDashboard'));
const StockManagement = React.lazy(() => import('./pages/inventory/StockManagement'));
const InventoryMovements = React.lazy(() => import('./pages/inventory/InventoryMovements'));
const PhysicalInventory = React.lazy(() => import('./pages/inventory/PhysicalInventory'));
const InventoryValuation = React.lazy(() => import('./pages/inventory/InventoryValuation'));

// Settings
const AccountingSettingsPage = React.lazy(() => import('./pages/settings/AccountingSettingsPage'));
const BackupPage = React.lazy(() => import('./pages/settings/BackupPage'));
const ImportExportPage = React.lazy(() => import('./pages/settings/ImportExportPage'));
const APIIntegrationsPage = React.lazy(() => import('./pages/settings/APIIntegrationsPage'));
const MobileAppPage = React.lazy(() => import('./pages/settings/MobileAppPage'));
const OfflineModePage = React.lazy(() => import('./pages/settings/OfflineModePage'));
const IAConfigPage = React.lazy(() => import('./pages/settings/IAConfigPage'));
const TrackChangePage = React.lazy(() => import('./pages/settings/TrackChangePage'));
const TypographyGuide = React.lazy(() => import('./pages/settings/TypographyGuide'));

// Config
const PlanSYSCOHADAPage = React.lazy(() => import('./pages/config/PlanSYSCOHADAPage'));
const TVATaxesPage = React.lazy(() => import('./pages/config/TVATaxesPage'));
const MultiSocietesPage = React.lazy(() => import('./pages/config/MultiSocietesPage'));
const AssistantDemarragePage = React.lazy(() => import('./pages/config/AssistantDemarragePage'));

// Core
const CompanyPage = React.lazy(() => import('./pages/core/CompanyPage'));
const ExercicePage = React.lazy(() => import('./pages/core/ExercicePage'));
const SetupWizardPage = React.lazy(() => import('./pages/core/SetupWizardPage'));

// Erreurs
const NotFoundPage = React.lazy(() => import('./pages/errors/NotFoundPage'));
const MaintenancePage = React.lazy(() => import('./pages/errors/MaintenancePage'));

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
                  <ChatbotProvider>
                    <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                      {/* Pages publiques */}
                      <Route path="/" element={<LandingPage />} />
                      <Route path="/login" element={<LoginPage />} />

                      {/* Workspaces - EN DEHORS du layout principal */}
                      <Route path="/workspace" element={<WorkspaceDashboard />} />
                      <Route path="/workspace/comptable" element={<ComptableWorkspace />} />
                      <Route path="/workspace/manager" element={<ManagerWorkspace />} />
                      <Route path="/workspace/admin" element={<AdminWorkspace />} />

                      {/* Application principale avec layout */}
                      <Route element={<ModernDoubleSidebarLayout />}>
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
                        </Route>

                        {/* Etats financiers */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="États financiers" /></RBACGuard>}>
                          <Route path="/financial-statements" element={<FinancialStatementsIndexPage />} />
                          <Route path="/financial-statements/balance" element={<BilanSYSCOHADAPage />} />
                          <Route path="/financial-statements/income" element={<CompteResultatPage />} />
                          <Route path="/financial-statements/analysis" element={<FinancialAnalysisPage />} />
                        </Route>

                        {/* Reporting */}
                        <Route element={<RBACGuard allowedRoles={['admin', 'manager', 'comptable', 'accountant', 'user', 'viewer']}><FeatureErrorBoundary feature="Reporting" /></RBACGuard>}>
                          <Route path="/reporting" element={<ReportingDashboard />} />
                          <Route path="/reporting/dashboards" element={<DashboardsPage />} />
                          <Route path="/reporting/tax" element={<TaxReportingPage />} />
                          <Route path="/reporting/custom" element={<CustomReportsPage />} />
                          <Route path="/reporting/syscohada" element={<ReportingSyscohada />} />
                          <Route path="/reporting/ifrs" element={<ReportingIFRS />} />
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
                          <Route path="/config/wizard" element={<AssistantDemarragePage />} />
                        </Route>

                        {/* Core — admin only */}
                        <Route element={<RBACGuard allowedRoles={['admin']}><Outlet /></RBACGuard>}>
                          <Route path="/core/company" element={<CompanyPage />} />
                          <Route path="/core/exercice" element={<ExercicePage />} />
                          <Route path="/setup" element={<SetupWizardPage />} />
                        </Route>
                      </Route>

                      {/* Erreurs */}
                      <Route path="/maintenance" element={<MaintenancePage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                    </Suspense>
                  </ErrorBoundary>
                  </ChatbotProvider>
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
