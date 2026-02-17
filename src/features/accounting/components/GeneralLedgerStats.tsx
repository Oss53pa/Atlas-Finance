import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { FileText, Database, Scale, Activity } from 'lucide-react';
import { LedgerStats } from '../types/generalLedger.types';
import { formatCurrency, formatNumber } from '@/shared/utils/formatters';

interface GeneralLedgerStatsProps {
  stats: LedgerStats | null;
  loading?: boolean;
}

export const GeneralLedgerStats: React.FC<GeneralLedgerStatsProps> = ({ stats, loading }) => {
  const { t } = useLanguage();
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} title="" value="" loading={true} />
        ))}
      </div>
    );
  }

  const isBalanced = stats.balance === 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Comptes Mouvementés"
        value={formatNumber(stats.totalAccounts)}
        subtitle={`${formatNumber(stats.totalEntries)} écritures`}
        icon={FileText}
        color="primary"
      />

      <StatCard
        title="Total Débits"
        value={formatCurrency(stats.totalDebit)}
        icon={Database}
        color="info"
      />

      <StatCard
        title="Total Crédits"
        value={formatCurrency(stats.totalCredit)}
        icon={Database}
        color="warning"
      />

      <StatCard
        title={t('accounting.balance')}
        value={formatCurrency(Math.abs(stats.balance))}
        subtitle={isBalanced ? 'Équilibré' : 'Déséquilibré'}
        icon={isBalanced ? Activity : Scale}
        color={isBalanced ? 'success' : 'error'}
        trend={
          !isBalanced
            ? {
                value: formatCurrency(Math.abs(stats.balance)),
                isPositive: false,
                label: 'Écart à corriger',
              }
            : undefined
        }
      />
    </div>
  );
};