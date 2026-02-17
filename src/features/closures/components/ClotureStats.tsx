import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { ClotureStats as Stats } from '../types/closures.types';
import { formatNumber } from '@/shared/utils/formatters';

interface ClotureStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const ClotureStats: React.FC<ClotureStatsProps> = ({ stats, loading }) => {
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
        title="Total Écritures"
        value={formatNumber(stats.totalEcritures)}
        subtitle={`${stats.totalProvisions} provisions, ${stats.totalAmortissements} amortissements`}
        icon={FileText}
        color="primary"
      />

      <StatCard
        title="Écritures Validées"
        value={formatNumber(stats.ecrituresValidees)}
        subtitle={`${((stats.ecrituresValidees / stats.totalEcritures) * 100).toFixed(0)}% du total`}
        icon={CheckCircle}
        color="success"
      />

      <StatCard
        title="En Attente"
        value={formatNumber(stats.ecrituresEnAttente)}
        subtitle="Nécessitent validation"
        icon={Clock}
        color="warning"
      />

      <StatCard
        title="Régularisations"
        value={formatNumber(stats.totalRegularisations)}
        subtitle="Opérations diverses"
        icon={AlertTriangle}
        color="info"
      />
    </div>
  );
};