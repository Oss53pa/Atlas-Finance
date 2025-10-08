import React from 'react';
import { StatCard } from '@/shared/components/data-display/StatCard';
import { FileText, Eye, Share, Download } from 'lucide-react';
import { ReportStats } from '../types/reporting.types';

interface ReportingStatsProps {
  stats: ReportStats | null;
  loading?: boolean;
}

export const ReportingStats: React.FC<ReportingStatsProps> = ({ stats, loading }) => {
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
        title="Rapports Actifs"
        value={stats.activeReports.toString()}
        subtitle="En production"
        icon={FileText}
        color="primary"
      />

      <StatCard
        title="Vues Totales"
        value={stats.totalViews.toString()}
        subtitle="Ce mois"
        icon={Eye}
        color="success"
      />

      <StatCard
        title="Rapports Partagés"
        value={stats.sharedReports.toString()}
        subtitle="Publics"
        icon={Share}
        color="warning"
      />

      <StatCard
        title="Générations"
        value={stats.weeklyGenerations.toString()}
        subtitle="Cette semaine"
        icon={Download}
        color="info"
      />
    </div>
  );
};