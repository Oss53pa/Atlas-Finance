import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { Package, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { AssetsStats as Stats } from '../types/assets-list.types';
import { formatNumber } from '@/shared/utils/formatters';

interface AssetsStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const AssetsStats: React.FC<AssetsStatsProps> = ({ stats, loading }) => {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCard key={i} title="" value="" loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Immobilisations"
        value={stats.totalAssets.toString()}
        subtitle={`Valeur brute: ${formatNumber(stats.totalValue)} FCFA`}
        icon={Package}
        color="primary"
      />

      <StatCard
        title="Valeur Nette Comptable"
        value={`${formatNumber(stats.totalNetValue)} FCFA`}
        subtitle="Après amortissements"
        icon={DollarSign}
        color="success"
      />

      <StatCard
        title="Amortissement Cumulé"
        value={`${formatNumber(stats.totalDepreciation)} FCFA`}
        subtitle={`${formatNumber(stats.monthlyDepreciation)} FCFA/mois`}
        icon={TrendingDown}
        color="warning"
      />

      <StatCard
        title="Âge Moyen"
        value={`${stats.avgAge.toFixed(1)} ans`}
        subtitle="Durée de vie moyenne"
        icon={Calendar}
        color="info"
      />
    </div>
  );
};