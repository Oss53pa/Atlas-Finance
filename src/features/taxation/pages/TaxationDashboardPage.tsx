import React, { useState } from 'react';
import { TaxationStats } from '../components/TaxationStats';
import { DeadlinesList } from '../components/DeadlinesList';
import { DeclarationsTable } from '../components/DeclarationsTable';
import { Button } from '@/shared/components/ui/Button';
import { Plus, FileText, Calendar, Calculator } from 'lucide-react';
import { useTaxationStats, useUpcomingDeadlines, useDeclarations } from '../hooks/useTaxation';
import { DeclarationFiscale } from '../types/taxation.types';

const TaxationDashboardPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const { stats, loading: statsLoading } = useTaxationStats(selectedPeriod);
  const { deadlines, loading: deadlinesLoading } = useUpcomingDeadlines();
  const { declarations, loading: declarationsLoading } = useDeclarations();

  const handleDeclarationClick = (declaration: DeclarationFiscale) => {
    console.log('Declaration clicked:', declaration);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord Fiscalité</h1>
          <p className="mt-2 text-gray-600">
            Suivi des déclarations fiscales et obligations réglementaires
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Calculator}>
            Calculer Impôt
          </Button>
          <Button variant="outline" icon={FileText}>
            Rapport Conformité
          </Button>
          <Button icon={Plus}>
            Nouvelle Déclaration
          </Button>
        </div>
      </div>

      <TaxationStats stats={stats} loading={statsLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Déclarations Récentes
              </h2>
              <Button variant="ghost" size="sm">
                Voir tout
              </Button>
            </div>
            <DeclarationsTable
              declarations={declarations.slice(0, 5)}
              loading={declarationsLoading}
              onRowClick={handleDeclarationClick}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Prochaines Échéances
              </h2>
            </div>
            <DeadlinesList deadlines={deadlines} loading={deadlinesLoading} />
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Actions Rapides</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/50 transition-colors text-sm">
                📊 Déclarations TVA
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/50 transition-colors text-sm">
                📅 Échéances Fiscales
              </button>
              <button className="w-full text-left px-3 py-2 rounded hover:bg-white/50 transition-colors text-sm">
                🧮 Calculs Automatiques
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxationDashboardPage;