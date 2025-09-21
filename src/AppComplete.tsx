import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/globals.css';

// Layout principal avec double sidebar
import ModernDoubleSidebarLayout from './components/layout/ModernDoubleSidebarLayout';

// Pages principales - Import direct pour les plus importantes
import ModernDashboardPage from './pages/ModernDashboardPage';
import ModernSettingsPage from './pages/ModernSettingsPage';

// Dashboard sub-modules
import ExecutiveDashboard from './pages/dashboard/ExecutiveDashboard';
import FinancialAnalysisDashboard from './pages/dashboard/FinancialAnalysisDashboard';
import KPIDashboard from './pages/dashboard/KPIDashboard';

// Modules complets nouvellement créés
import CompleteAccountingDashboard from './pages/accounting/CompleteAccountingDashboard';
import CompleteTaxationModule from './pages/taxation/CompleteTaxationModule';
import CompleteAssetsModule from './pages/assets/CompleteAssetsModule';
import CompleteThirdPartyModule from './pages/third-party/CompleteThirdPartyModule';
import CompleteConfigModule from './pages/config/CompleteConfigModule';
import CompleteFinancialModule from './pages/financial/CompleteFinancialModule';
import EnhancedClosuresModule from './pages/closures/EnhancedClosuresModule';
import CompleteBudgetingModule from './pages/budgeting/CompleteBudgetingModule';
import CompleteAuthModule from './pages/auth/CompleteAuthModule';

// Lazy loading pour les autres modules
const ModernAccountingDashboard = lazy(() => import('./pages/accounting/ModernAccountingDashboard'));
const AccountingDashboard = lazy(() => import('./pages/accounting/AccountingDashboard'));
const JournalsPage = lazy(() => import('./pages/accounting/JournalsPage'));
import CompleteJournalsPage from './pages/accounting/CompleteJournalsPage';
const EntriesPage = lazy(() => import('./pages/accounting/EntriesPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
const BalancePage = lazy(() => import('./pages/accounting/BalancePage'));
const GeneralLedgerPage = lazy(() => import('./pages/accounting/GeneralLedgerPage'));

// Module Facturation
const ModernInvoicingDashboard = lazy(() => import('./pages/invoicing/ModernInvoicingDashboard'));

// Module CRM
const ModernCustomerDashboard = lazy(() => import('./pages/crm/ModernCustomerDashboard'));

// Module Trésorerie
const ModernTreasuryDashboard = lazy(() => import('./pages/treasury/ModernTreasuryDashboard'));
const TreasuryDashboard = lazy(() => import('./pages/treasury/TreasuryDashboard'));
const BankAccountsPage = lazy(() => import('./pages/treasury/BankAccountsPage'));
const BankMovementsPage = lazy(() => import('./pages/treasury/BankMovementsPage'));
const CashFlowPage = lazy(() => import('./pages/treasury/CashFlowPage'));
const ReconciliationPage = lazy(() => import('./pages/treasury/ReconciliationPage'));
const PrevisionsTresoreriePage = lazy(() => import('./pages/treasury/PrevisionsTresoreriePage'));
const ConnexionsBancairesPage = lazy(() => import('./pages/treasury/ConnexionsBancairesPage'));

// Module Rapports et Analytics
const ModernReportsAndAnalytics = lazy(() => import('./pages/reports/ModernReportsAndAnalytics'));
const ReportingDashboard = lazy(() => import('./pages/reporting/ReportingDashboard'));
const AnalyticsDashboard = lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const AnalyticalAxesPage = lazy(() => import('./pages/analytics/AnalyticalAxesPage'));
const CostCentersPage = lazy(() => import('./pages/analytics/CostCentersPage'));

// Module Fiscalité
const TaxationDashboard = lazy(() => import('./pages/taxation/TaxationDashboard'));
const LiasseFiscalePage = lazy(() => import('./pages/taxation/LiasseFiscalePage'));
const EcheancesFiscalesPage = lazy(() => import('./pages/taxation/EcheancesFiscalesPage'));
const CalculsAutomatiquesPage = lazy(() => import('./pages/taxation/CalculsAutomatiquesPage'));

// Module Immobilisations
const AssetsDashboard = lazy(() => import('./pages/assets/AssetsDashboard'));
const FixedAssetsPage = lazy(() => import('./pages/assets/FixedAssetsPage'));
const DepreciationPage = lazy(() => import('./pages/assets/DepreciationPage'));
const InventairePhysiquePage = lazy(() => import('./pages/assets/InventairePhysiquePage'));
const CycleVieCompletPage = lazy(() => import('./pages/assets/CycleVieCompletPage'));

// Module Tiers
const ThirdPartyDashboard = lazy(() => import('./pages/third-party/ThirdPartyDashboard'));
const CustomersPage = lazy(() => import('./pages/third-party/CustomersPage'));
const SuppliersPage = lazy(() => import('./pages/third-party/SuppliersPage'));
const ContactsPage = lazy(() => import('./pages/third-party/ContactsPage'));

// Module Sécurité
const SecurityDashboard = lazy(() => import('./pages/security/SecurityDashboard'));
const PermissionsPage = lazy(() => import('./pages/security/PermissionsPage'));

// Module Configuration
const ConfigurationCentrePage = lazy(() => import('./pages/config/ConfigurationCentrePage'));
const MultiSocietesPage = lazy(() => import('./pages/config/MultiSocietesPage'));
const PlanSYSCOHADAPage = lazy(() => import('./pages/config/PlanSYSCOHADAPage'));
const TVATaxesPage = lazy(() => import('./pages/config/TVATaxesPage'));
const CodificationTiersPage = lazy(() => import('./pages/config/CodificationTiersPage'));
const AxesAnalytiquesPage = lazy(() => import('./pages/config/AxesAnalytiquesPage'));
const ImportExportPage = lazy(() => import('./pages/config/ImportExportPage'));
const ProfilsSecuritePage = lazy(() => import('./pages/config/ProfilsSecuritePage'));

// Module États Financiers
const BilanSYSCOHADAPage = lazy(() => import('./pages/financial/BilanSYSCOHADAPage'));
const CompteResultatPage = lazy(() => import('./pages/financial/CompteResultatPage'));

// Module Core (Sociétés et Exercices)
const CompanyPage = lazy(() => import('./pages/core/CompanyPage'));
const ExercicePage = lazy(() => import('./pages/core/ExercicePage'));

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Composant de chargement
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[var(--color-text-secondary)] font-medium">Chargement du module...</p>
    </div>
  </div>
);

const AppComplete: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Route racine - Redirection vers dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Routes avec Layout Double Sidebar */}
            <Route element={<ModernDoubleSidebarLayout />}>
              {/* Dashboard */}
              <Route path="/dashboard" element={<ModernDashboardPage />} />
              <Route path="/executive" element={<ExecutiveDashboard />} />
              <Route path="/financial-analysis" element={<FinancialAnalysisDashboard />} />
              <Route path="/financial-analysis-advanced" element={<FinancialAnalysisDashboard />} />
              <Route path="/dashboard/kpis" element={<KPIDashboard />} />
              
              {/* Module Comptabilité */}
              <Route path="/accounting" element={<CompleteAccountingDashboard />} />
              <Route path="/accounting/dashboard" element={<AccountingDashboard />} />
              <Route path="/accounting/journals" element={<CompleteJournalsPage />} />
              <Route path="/accounting/entries" element={<EntriesPage />} />
              <Route path="/accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
              <Route path="/accounting/balance" element={<BalancePage />} />
              <Route path="/accounting/general-ledger" element={<GeneralLedgerPage />} />
              
              {/* Module Facturation */}
              <Route path="/invoicing" element={<ModernInvoicingDashboard />} />
              
              {/* Module CRM / Clients */}
              <Route path="/customers" element={<ModernCustomerDashboard />} />
              <Route path="/crm" element={<ModernCustomerDashboard />} />
              
              {/* Module Trésorerie */}
              <Route path="/treasury" element={<ModernTreasuryDashboard />} />
              <Route path="/treasury/dashboard" element={<TreasuryDashboard />} />
              <Route path="/treasury/bank-accounts" element={<BankAccountsPage />} />
              <Route path="/treasury/bank-movements" element={<BankMovementsPage />} />
              <Route path="/treasury/cash-flow" element={<CashFlowPage />} />
              <Route path="/treasury/reconciliation" element={<ReconciliationPage />} />
              <Route path="/treasury/forecasts" element={<PrevisionsTresoreriePage />} />
              <Route path="/treasury/bank-connections" element={<ConnexionsBancairesPage />} />
              
              {/* Module Rapports et Analytics */}
              <Route path="/reports" element={<ModernReportsAndAnalytics />} />
              <Route path="/reporting" element={<ReportingDashboard />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/analytics/axes" element={<AnalyticalAxesPage />} />
              <Route path="/analytics/cost-centers" element={<CostCentersPage />} />
              
              {/* Module Fiscalité */}
              <Route path="/taxation" element={<CompleteTaxationModule />} />
              <Route path="/taxation/liasse-fiscale" element={<LiasseFiscalePage />} />
              <Route path="/taxation/deadlines" element={<EcheancesFiscalesPage />} />
              <Route path="/taxation/automatic-calculations" element={<CalculsAutomatiquesPage />} />
              
              {/* Module Immobilisations */}
              <Route path="/assets" element={<CompleteAssetsModule />} />
              <Route path="/assets/fixed" element={<FixedAssetsPage />} />
              <Route path="/assets/depreciation" element={<DepreciationPage />} />
              <Route path="/assets/inventory" element={<InventairePhysiquePage />} />
              <Route path="/assets/lifecycle" element={<CycleVieCompletPage />} />
              
              {/* Module Tiers */}
              <Route path="/third-party" element={<CompleteThirdPartyModule />} />
              <Route path="/third-party/customers" element={<CustomersPage />} />
              <Route path="/third-party/suppliers" element={<SuppliersPage />} />
              <Route path="/third-party/contacts" element={<ContactsPage />} />
              
              {/* Module Sécurité */}
              <Route path="/security" element={<SecurityDashboard />} />
              <Route path="/security/permissions" element={<PermissionsPage />} />
              
              {/* Module Configuration */}
              <Route path="/config" element={<CompleteConfigModule />} />
              <Route path="/config/multi-companies" element={<MultiSocietesPage />} />
              <Route path="/config/chart-syscohada" element={<PlanSYSCOHADAPage />} />
              <Route path="/config/vat-taxes" element={<TVATaxesPage />} />
              <Route path="/config/third-party-coding" element={<CodificationTiersPage />} />
              <Route path="/config/analytical-axes" element={<AxesAnalytiquesPage />} />
              <Route path="/config/import-export" element={<ImportExportPage />} />
              <Route path="/config/security-profiles" element={<ProfilsSecuritePage />} />
              
              {/* Module États Financiers */}
              <Route path="/financial" element={<CompleteFinancialModule />} />
              <Route path="/financial/balance-sheet" element={<BilanSYSCOHADAPage />} />
              <Route path="/financial/income-statement" element={<CompteResultatPage />} />
              
              {/* Module Core */}
              <Route path="/core/companies" element={<CompanyPage />} />
              <Route path="/core/exercises" element={<ExercicePage />} />
              
              {/* Module Clôtures */}
              <Route path="/closures" element={<EnhancedClosuresModule />} />
              
              {/* Module Budgétisation */}
              <Route path="/budgeting" element={<CompleteBudgetingModule />} />
              
              {/* Module Authentification */}
              <Route path="/auth" element={<CompleteAuthModule />} />
              
              {/* Paramètres */}
              <Route path="/settings" element={<ModernSettingsPage />} />
              
              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default AppComplete;