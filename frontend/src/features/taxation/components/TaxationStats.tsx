import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { FileText, DollarSign, Calendar, CheckCircle } from 'lucide-react';
import { DashboardStats } from '../types/taxation.types';
import { formatNumber } from '@/shared/utils/formatters';

interface TaxationStatsProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

export const TaxationStats: React.FC<TaxationStatsProps> = ({ stats, loading }) => {
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
        title="Déclarations en Cours"
        value={stats.declarations_pending.toString()}
        subtitle={`${stats.declarations_overdue} en retard`}
        icon={FileText}
        color="warning"
      />

      <StatCard
        title="TVA à Payer"
        value={`${formatNumber(stats.vat_due)} FCFA`}
        subtitle="Déclaration mensuelle"
        icon={DollarSign}
        color="error"
      />

      <StatCard
        title="Prochaines Échéances"
        value={stats.upcoming_deadlines.toString()}
        subtitle="Dans les 30 prochains jours"
        icon={Calendar}
        color="warning"
      />

      <StatCard
        title="Conformité"
        value={`${stats.compliance_rate}%`}
        subtitle="Taux de respect des délais"
        icon={CheckCircle}
        color="success"
      />
    </div>
  );
};