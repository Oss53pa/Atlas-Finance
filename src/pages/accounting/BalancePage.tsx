import React, { Suspense } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

// Lazy load AdvancedBalance component
const AdvancedBalance = React.lazy(() => import('../../components/accounting/AdvancedBalance'));

const BalancePage: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="h-full p-6 bg-[var(--color-background)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Balance Comptable</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Consultez et analysez la balance des comptes</p>
      </div>

      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      }>
        <AdvancedBalance />
      </Suspense>
    </div>
  );
};

export default BalancePage;