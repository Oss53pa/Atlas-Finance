import React from 'react';
import { ReportingStats } from '../components/ReportingStats';
import { ReportCard } from '../components/ReportCard';
import { Button } from '@/shared/components/ui/Button';
import { Plus, FileText, Layout, Clock } from 'lucide-react';
import { useReports, useReportStats } from '../hooks/useReporting';
import { Report } from '../types/reporting.types';

const ReportingDashboardPage: React.FC = () => {
  const { stats, loading: statsLoading } = useReportStats();
  const { reports, loading: reportsLoading } = useReports();

  const handleReportClick = (report: Report) => {
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Tableau de Bord Reporting</h1>
          <p className="mt-2 text-gray-600">
            Gestion des rapports et tableaux de bord
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={FileText}>
            Modèles
          </Button>
          <Button variant="outline" icon={Layout}>
            Tableaux de Bord
          </Button>
          <Button icon={Plus}>
            Nouveau Rapport
          </Button>
        </div>
      </div>

      <ReportingStats stats={stats} loading={statsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rapports Récents</h2>
              <Button variant="ghost" size="sm">
                Voir tout
              </Button>
            </div>
            {reportsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-32 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {reports.slice(0, 3).map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onClick={() => handleReportClick(report)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Statistiques</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-blue-900">
                    Rapports Automatiques
                  </span>
                  <span className="font-bold text-xl text-blue-900">
                    {stats?.automaticReports || 0}
                  </span>
                </div>
                <p className="text-sm text-blue-700">Générés automatiquement</p>
              </div>

              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-green-900">
                    Formats Supportés
                  </span>
                  <span className="font-bold text-xl text-green-900">
                    {stats?.supportedFormats || 0}
                  </span>
                </div>
                <p className="text-sm text-green-700">PDF, Excel, Dashboard</p>
              </div>

              <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-purple-900">
                    Fréquence Moyenne
                  </span>
                  <span className="font-bold text-xl text-purple-900">
                    {stats?.averageFrequency || 0}
                  </span>
                </div>
                <p className="text-sm text-purple-700">Générations par semaine</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Actions Rapides</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/50 transition-colors text-sm">
                📊 Créer un Rapport
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/50 transition-colors text-sm">
                📑 Bibliothèque de Modèles
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/50 transition-colors text-sm">
                ⏰ Planification
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportingDashboardPage;