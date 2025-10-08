import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { Package, DollarSign, TrendingDown, CheckCircle, Wrench } from 'lucide-react';
import { AssetStats as Stats } from '../types/assets.types';
import { formatCurrency } from '@/shared/utils/formatters';

interface AssetsStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const AssetsStats: React.FC<AssetsStatsProps> = ({ stats, loading }) => {
  const { t } = useLanguage();
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <StatCard key={i} title="" value="" loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="Total Actifs"
        value={stats.totalAssets}
        subtitle={t('navigation.assets')}
        icon={Package}
        color="primary"
      />

      <StatCard
        title="Valeur d'Acquisition"
        value={formatCurrency(stats.totalValue)}
        icon={DollarSign}
        color="info"
      />

      <StatCard
        title="Dépréciation Cumulée"
        value={formatCurrency(stats.totalDepreciation)}
        icon={TrendingDown}
        color="warning"
      />

      <StatCard
        title="Valeur Nette Comptable"
        value={formatCurrency(stats.netBookValue)}
        subtitle={`${((stats.netBookValue / stats.totalValue) * 100).toFixed(1)}% de la valeur`}
        icon={CheckCircle}
        color="success"
      />

      <StatCard
        title="En Maintenance"
        value={stats.maintenanceAssets}
        subtitle={`${stats.activeAssets} actifs`}
        icon={Wrench}
        color="warning"
      />
    </div>
  );
};