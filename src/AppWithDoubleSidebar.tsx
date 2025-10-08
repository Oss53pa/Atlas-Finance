import React, { Suspense } from 'react';
import { useLanguage } from 'contexts/LanguageContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layout avec double sidebar
import DoubleSidebarLayout from './components/layout/DoubleSidebarLayout';

// Pages principales
const WiseBookHome = React.lazy(() => import('./pages/WiseBookHome'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const ParametersPage = React.lazy(() => import('./pages/ParametersPage'));

// Dashboards développés
const ExecutiveDashboard = React.lazy(() => import('./components/dashboards/ExecutiveDashboard'));
const CustomerDashboard = React.lazy(() => import('./components/dashboards/CustomerDashboard'));
const SupplierDashboard = React.lazy(() => import('./components/dashboards/SupplierDashboard'));
const TreasuryDashboardAdvanced = React.lazy(() => import('./components/dashboards/TreasuryDashboard'));
const FinancialAnalysisDashboard = React.lazy(() => import('./components/dashboards/FinancialAnalysisDashboard'));

// Comptabilité
const AccountingDashboard = React.lazy(() => import('./pages/accounting/AccountingDashboard'));
const JournalsPage = React.lazy(() => import('./pages/accounting/JournalsPage'));
const EntriesPage = React.lazy(() => import('./pages/accounting/EntriesPage'));
const BalancePage = React.lazy(() => import('./pages/accounting/BalancePage'));
const GeneralLedgerPage = React.lazy(() => import('./pages/accounting/GeneralLedgerPage'));

// Tiers
const ThirdPartyDashboard = React.lazy(() => import('./pages/third-party/ThirdPartyDashboard'));
const CustomersPage = React.lazy(() => import('./pages/third-party/CustomersPage'));
const SuppliersPage = React.lazy(() => import('./pages/third-party/SuppliersPage'));
const ContactsPage = React.lazy(() => import('./pages/third-party/ContactsPage'));

// Trésorerie
const BankAccountsPage = React.lazy(() => import('./pages/treasury/BankAccountsPage'));
const BankMovementsPage = React.lazy(() => import('./pages/treasury/BankMovementsPage'));
const ReconciliationPage = React.lazy(() => import('./pages/treasury/ReconciliationPage'));
const CashFlowPage = React.lazy(() => import('./pages/treasury/CashFlowPage'));

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

// Reporting
const ReportingDashboard = React.lazy(() => import('./pages/reporting/ReportingDashboard'));
const ReportsPage = React.lazy(() => import('./pages/reporting/ReportsPage'));
const DashboardsPage = React.lazy(() => import('./pages/reporting/DashboardsPage'));

// Sécurité
const SecurityDashboard = React.lazy(() => import('./pages/security/SecurityDashboard'));
const UsersPage = React.lazy(() => import('./pages/security/UsersPage'));
const RolesPage = React.lazy(() => import('./pages/security/RolesPage'));

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
    },
  },
});

// Composant de chargement
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-100">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-gray-600 font-medium">{t('common.loading')}</p>
    </div>
  </div>
);

const AppWithDoubleSidebar: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Route racine - Redirection vers dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Routes avec Double Sidebar Layout */}
          <Route element={<DoubleSidebarLayout />}>
            {/* Dashboard */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/executive" element={
              <ExecutiveDashboard companyId="1" fiscalYearId="2024" />
            } />
            <Route path="/financial-analysis-advanced" element={
              <FinancialAnalysisDashboard companyId="1" fiscalYearId="2024" />
            } />
            
            {/* Comptabilité */}
            <Route path="/accounting" element={<AccountingDashboard />} />
            <Route path="/accounting/journals" element={<JournalsPage />} />
            <Route path="/accounting/entries" element={<EntriesPage />} />
            <Route path="/accounting/balance" element={<BalancePage />} />
            <Route path="/accounting/general-ledger" element={<GeneralLedgerPage />} />
            
            {/* Tiers */}
            <Route path="/third-party" element={<ThirdPartyDashboard />} />
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
            <Route path="/treasury/cash-flow" element={<CashFlowPage />} />
            <Route path="/treasury/fund-calls" element={
              <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Appels de Fonds</h1>
                <p className="text-gray-600">Module d'appels de fonds en cours de développement...</p>
              </div>
            } />
            
            {/* Immobilisations */}
            <Route path="/assets" element={<AssetsDashboard />} />
            <Route path="/assets/fixed-assets" element={<FixedAssetsPage />} />
            <Route path="/assets/depreciation" element={<DepreciationPage />} />
            
            {/* Analytique */}
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/analytics/axes" element={<AnalyticalAxesPage />} />
            <Route path="/analytics/cost-centers" element={<CostCentersPage />} />
            
            {/* Budget */}
            <Route path="/budgeting" element={<BudgetingDashboard />} />
            <Route path="/budgeting/budgets" element={<BudgetsPage />} />
            <Route path="/budgeting/control" element={<BudgetControlPage />} />
            
            {/* Fiscalité */}
            <Route path="/taxation" element={<TaxationDashboard />} />
            <Route path="/taxation/declarations" element={<TaxDeclarationsPage />} />
            <Route path="/taxation/deadlines" element={
              <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Échéances Fiscales</h1>
                <p className="text-gray-600">Module des échéances fiscales en cours de développement...</p>
              </div>
            } />
            
            {/* Reporting */}
            <Route path="/reporting" element={<ReportingDashboard />} />
            <Route path="/reporting/reports" element={<ReportsPage />} />
            <Route path="/reporting/dashboards" element={<DashboardsPage />} />
            
            {/* Sécurité */}
            <Route path="/security" element={<SecurityDashboard />} />
            <Route path="/security/users" element={<UsersPage />} />
            <Route path="/security/roles" element={<RolesPage />} />
            <Route path="/security/permissions" element={
              <div className="bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">Gestion des Permissions</h1>
                <p className="text-gray-600">Module de gestion des permissions en cours de développement...</p>
              </div>
            } />
            
            {/* Paramètres */}
            <Route path="/parameters" element={<ParametersPage />} />
          </Route>
        </Routes>
      </Suspense>
    </QueryClientProvider>
  );
};

export default AppWithDoubleSidebar;