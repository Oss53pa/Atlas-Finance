import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { DollarSign, TrendingUp, TrendingDown, Building2, FileText } from 'lucide-react';
import { BudgetStats as Stats } from '../types/budgeting.types';
import { formatCurrency, formatPercent } from '@/shared/utils/formatters';

interface BudgetStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const BudgetStats: React.FC<BudgetStatsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} title="" value="" loading={true} />
        ))}
      </div>
    );
  }

  const isOverBudget = stats.variancePercent < 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Budget Total"
        value={formatCurrency(stats.totalBudget)}
        subtitle={`${stats.accountsCount} comptes budgétaires`}
        icon={DollarSign}
        color="primary"
      />

      <StatCard
        title="Dépenses Réelles"
        value={formatCurrency(stats.totalActual)}
        subtitle={`${stats.departmentsCount} départements`}
        icon={FileText}
        color="info"
      />

      <StatCard
        title={isOverBudget ? 'Dépassement' : 'Écart Budgétaire'}
        value={formatCurrency(Math.abs(stats.totalVariance))}
        trend={{
          value: formatPercent(Math.abs(stats.variancePercent / 100)),
          isPositive: !isOverBudget,
          label: isOverBudget ? 'Au-dessus du budget' : 'Sous le budget',
        }}
        icon={isOverBudget ? TrendingDown : TrendingUp}
        color={isOverBudget ? 'error' : 'success'}
      />

      <StatCard
        title="Sessions Actives"
        value={stats.activeSessions}
        subtitle="En cours de planification"
        icon={Building2}
        color="warning"
      />
    </div>
  );
};