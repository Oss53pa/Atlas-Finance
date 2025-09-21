import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Pages principales WiseBook
const WiseBookHome = React.lazy(() => import('./pages/WiseBookHome'));
const ParametersPage = React.lazy(() => import('./pages/ParametersPage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));

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

// Trésorerie (pages existantes)
// const TreasuryDashboard = React.lazy(() => import('./pages/treasury/TreasuryDashboard'));
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

// Layout Components
import ERPLayout from './components/layout/ERPLayout';
import ModernLayout from './components/layout/ModernLayout';
import DoubleSidebarLayout from './components/layout/DoubleSidebarLayout';

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

// Composant de chargement avec Trinity Chromatique
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen" style={{backgroundColor: 'var(--swirl)'}}>
    <div className="loading-spinner"></div>
  </div>
);


const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="App">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Route principale - Interface simple qui marche */}
            <Route path="/" element={<WiseBookHome />} />
            <Route path="/parameters" element={<ParametersPage />} />
            
            {/* Route vers notre Executive Dashboard développé */}
            <Route path="/executive" element={
              <ExecutiveDashboard companyId="1" fiscalYearId="2024" />
            } />
            
            {/* Dashboard existant */}
            <Route path="/dashboard" element={
              <ERPLayout>
                <DashboardPage />
              </ERPLayout>
            } />
            
            {/* Comptabilité */}
            <Route path="/accounting" element={
              <ERPLayout>
                <AccountingDashboard />
              </ERPLayout>
            } />
            <Route path="/accounting/journals" element={
              <ERPLayout>
                <JournalsPage />
              </ERPLayout>
            } />
            <Route path="/accounting/entries" element={
              <ERPLayout>
                <EntriesPage />
              </ERPLayout>
            } />
            <Route path="/accounting/balance" element={
              <ERPLayout>
                <BalancePage />
              </ERPLayout>
            } />
            <Route path="/accounting/general-ledger" element={
              <ERPLayout>
                <GeneralLedgerPage />
              </ERPLayout>
            } />
            
            {/* Routes directes vers nos dashboards développés */}
            <Route path="/customers-advanced" element={
              <CustomerDashboard companyId="1" fiscalYearId="2024" />
            } />
            
            <Route path="/suppliers-advanced" element={
              <SupplierDashboard companyId="1" fiscalYearId="2024" />
            } />
            
            <Route path="/treasury-advanced" element={
              <TreasuryDashboardAdvanced companyId="1" fiscalYearId="2024" />
            } />
            
            <Route path="/financial-analysis-advanced" element={
              <FinancialAnalysisDashboard companyId="1" fiscalYearId="2024" />
            } />
            <Route path="/third-party/contacts" element={
              <ERPLayout>
                <ContactsPage />
              </ERPLayout>
            } />
            
            {/* Trésorerie - Dashboard existant */}
            <Route path="/treasury" element={
              <ERPLayout>
                <TreasuryDashboardAdvanced companyId="1" />
              </ERPLayout>
            } />
            
            {/* Analyse Financière - Dashboard développé */}
            <Route path="/financial-analysis" element={
              <ERPLayout>
                <FinancialAnalysisDashboard companyId="1" />
              </ERPLayout>
            } />
            <Route path="/treasury/bank-accounts" element={
              <ERPLayout>
                <BankAccountsPage />
              </ERPLayout>
            } />
            <Route path="/treasury/bank-movements" element={
              <ERPLayout>
                <BankMovementsPage />
              </ERPLayout>
            } />
            <Route path="/treasury/reconciliation" element={
              <ERPLayout>
                <ReconciliationPage />
              </ERPLayout>
            } />
            <Route path="/treasury/cash-flow" element={
              <ERPLayout>
                <CashFlowPage />
              </ERPLayout>
            } />
            
            {/* Immobilisations */}
            <Route path="/assets" element={
              <ERPLayout>
                <AssetsDashboard />
              </ERPLayout>
            } />
            <Route path="/assets/fixed-assets" element={
              <ERPLayout>
                <FixedAssetsPage />
              </ERPLayout>
            } />
            <Route path="/assets/depreciation" element={
              <ERPLayout>
                <DepreciationPage />
              </ERPLayout>
            } />
            
            {/* Analytique */}
            <Route path="/analytics" element={
              <ERPLayout>
                <AnalyticsDashboard />
              </ERPLayout>
            } />
            <Route path="/analytics/axes" element={
              <ERPLayout>
                <AnalyticalAxesPage />
              </ERPLayout>
            } />
            <Route path="/analytics/cost-centers" element={
              <ERPLayout>
                <CostCentersPage />
              </ERPLayout>
            } />
            
            {/* Budget */}
            <Route path="/budgeting" element={
              <ERPLayout>
                <BudgetingDashboard />
              </ERPLayout>
            } />
            <Route path="/budgeting/budgets" element={
              <ERPLayout>
                <BudgetsPage />
              </ERPLayout>
            } />
            <Route path="/budgeting/control" element={
              <ERPLayout>
                <BudgetControlPage />
              </ERPLayout>
            } />
            
            {/* Fiscalité */}
            <Route path="/taxation" element={
              <ERPLayout>
                <TaxationDashboard />
              </ERPLayout>
            } />
            <Route path="/taxation/declarations" element={
              <ERPLayout>
                <TaxDeclarationsPage />
              </ERPLayout>
            } />
            
            {/* Reporting */}
            <Route path="/reporting" element={
              <ERPLayout>
                <ReportingDashboard />
              </ERPLayout>
            } />
            <Route path="/reporting/reports" element={
              <ERPLayout>
                <ReportsPage />
              </ERPLayout>
            } />
            <Route path="/reporting/dashboards" element={
              <ERPLayout>
                <DashboardsPage />
              </ERPLayout>
            } />
            
            {/* Sécurité */}
            <Route path="/security" element={
              <ERPLayout>
                <SecurityDashboard />
              </ERPLayout>
            } />
            <Route path="/security/users" element={
              <ERPLayout>
                <UsersPage />
              </ERPLayout>
            } />
            <Route path="/security/roles" element={
              <ERPLayout>
                <RolesPage />
              </ERPLayout>
            } />
            
            {/* Redirection vers landing page par défaut */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
    </QueryClientProvider>
  );
};

export default App;