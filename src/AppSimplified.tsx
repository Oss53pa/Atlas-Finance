import React, { Suspense, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/globals.css';

// Import des pages modernes créées
import ModernDashboardPage from './pages/ModernDashboardPage';
import ModernSettingsPage from './pages/ModernSettingsPage';
import ModernAccountingDashboard from './pages/accounting/ModernAccountingDashboard';
import ModernInvoicingDashboard from './pages/invoicing/ModernInvoicingDashboard';
import ModernCustomerDashboard from './pages/crm/ModernCustomerDashboard';
import ModernTreasuryDashboard from './pages/treasury/ModernTreasuryDashboard';
import ModernReportsAndAnalytics from './pages/reports/ModernReportsAndAnalytics';

// Layout simplifié
import SimplifiedLayout from './components/layout/SimplifiedLayout';

// Configuration React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: false, // Désactiver les retries pour éviter les erreurs
      refetchOnWindowFocus: false,
    },
  },
});

// Composant de chargement
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-[var(--color-background)]">
    <div className="flex flex-col items-center space-y-4">
      <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[var(--color-text-secondary)] font-medium">Chargement...</p>
    </div>
  </div>
);

const AppSimplified: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Route racine - Redirection vers dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Routes avec Layout simplifié */}
            <Route element={<SimplifiedLayout />}>
              <Route path="/dashboard" element={<ModernDashboardPage />} />
              <Route path="/accounting" element={<ModernAccountingDashboard />} />
              <Route path="/invoicing" element={<ModernInvoicingDashboard />} />
              <Route path="/customers" element={<ModernCustomerDashboard />} />
              <Route path="/treasury" element={<ModernTreasuryDashboard />} />
              <Route path="/reports" element={<ModernReportsAndAnalytics />} />
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

export default AppSimplified;