import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { DollarSign, TrendingUp, FileText, CheckCircle } from 'lucide-react';
import { RecoveryStats as Stats } from '../types/recovery.types';
import { formatCurrency, formatPercent } from '@/shared/utils/formatters';

interface RecoveryStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const RecoveryStats: React.FC<RecoveryStatsProps> = ({ stats, loading }) => {
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
        title="Total Créances"
        value={formatCurrency(stats.montantTotal)}
        subtitle={`${stats.totalCreances} créances`}
        icon={DollarSign}
        color="primary"
      />

      <StatCard
        title="Taux de Recouvrement"
        value={formatPercent(stats.tauxRecouvrement)}
        trend={{
          value: "+5.2%",
          isPositive: true,
          label: "vs mois dernier"
        }}
        icon={TrendingUp}
        color="success"
      />

      <StatCard
        title="Dossiers Actifs"
        value={stats.dossiersActifs}
        subtitle={`${stats.nouveauxDossiers} nouveaux`}
        icon={FileText}
        color="warning"
      />

      <StatCard
        title="Dossiers Résolus"
        value={stats.dossiersResolus}
        subtitle="Ce mois"
        icon={CheckCircle}
        color="success"
      />
    </div>
  );
};