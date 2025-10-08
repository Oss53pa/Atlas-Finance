import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { Calendar, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { ClosureStats as Stats } from '../types/periodic-closures.types';

interface ClosureStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const ClosureStats: React.FC<ClosureStatsProps> = ({ stats, loading }) => {
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
        title="Total Clôtures"
        value={stats.totalPeriods.toString()}
        subtitle={`${stats.closedPeriods} terminées`}
        icon={Calendar}
        color="primary"
      />

      <StatCard
        title="En Cours"
        value={stats.inProgressPeriods.toString()}
        subtitle={`${stats.openPeriods} ouvertes`}
        icon={Clock}
        color="info"
      />

      <StatCard
        title="Clôturées"
        value={stats.closedPeriods.toString()}
        subtitle="Périodes archivées"
        icon={CheckCircle}
        color="success"
      />

      <StatCard
        title="Conformité SYSCOHADA"
        value={`${stats.complianceRate}%`}
        subtitle={`Temps moyen: ${stats.avgCompletionTime}j`}
        icon={TrendingUp}
        color={stats.complianceRate >= 90 ? 'success' : 'warning'}
        trend={stats.complianceRate >= 90 ? 'up' : 'down'}
      />
    </div>
  );
};