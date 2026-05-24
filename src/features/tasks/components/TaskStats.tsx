import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { TaskStats as Stats } from '../types/task.types';

interface TaskStatsProps {
  stats: Stats | null;
  loading?: boolean;
}

export const TaskStats: React.FC<TaskStatsProps> = ({ stats, loading }) => {
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
        title="Tâches Totales"
        value={stats.total.toString()}
        subtitle={`${stats.done} terminées`}
        icon={CheckCircle2}
        color="primary"
      />

      <StatCard
        title="En Cours"
        value={stats.inProgress.toString()}
        subtitle={`${stats.review} en révision`}
        icon={Clock}
        color="info"
      />

      <StatCard
        title="En Retard"
        value={stats.overdue.toString()}
        subtitle="Nécessitent attention"
        icon={AlertCircle}
        color={stats.overdue > 0 ? 'danger' : 'success'}
      />

      <StatCard
        title="Taux Complétion"
        value={`${stats.completionRate.toFixed(0)}%`}
        subtitle={`Temps moyen: ${stats.avgCompletionTime}j`}
        icon={TrendingUp}
        color="success"
        trend={stats.completionRate > 75 ? 'up' : 'down'}
      />
    </div>
  );
};