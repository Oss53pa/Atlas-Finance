import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, DollarSign, Target, AlertTriangle,
  CheckCircle, Clock, BarChart3, Activity, Briefcase
} from 'lucide-react';
import { OpportunityDetail, getWorkspaceData, WorkspaceData } from '../../services/workspaceApi';

const DirectionGeneraleWorkspace: React.FC = () => {
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityDetail | null>(null);

  useEffect(() => {
    loadWorkspaceData();
  }, []);

  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      const data = await getWorkspaceData();
      setWorkspaceData(data);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    const colors = {
      'prospection': 'bg-gray-500',
      'qualification': 'bg-blue-500',
      'proposition': 'bg-yellow-500',
      'negociation': 'bg-orange-500',
      'cloture': 'bg-green-500'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-400';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[var(--color-background)] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
          Tableau de Bord Direction Générale
        </h1>
        <p className="text-[var(--color-text-secondary)] mt-2">
          Vue d'ensemble des performances et opportunités
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-secondary)] text-sm">Chiffre d'affaires potentiel</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                {formatCurrency(workspaceData?.stats.totalValue || 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-[var(--color-success)]" />
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-secondary)] text-sm">Taux de conversion moyen</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                {workspaceData?.stats.averageProbability.toFixed(1)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-[var(--color-primary)]" />
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-secondary)] text-sm">Opportunités actives</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                {workspaceData?.opportunities.length || 0}
              </p>
            </div>
            <Briefcase className="w-8 h-8 text-[var(--color-warning)]" />
          </div>
        </div>

        <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--color-text-secondary)] text-sm">Clôtures ce mois</p>
              <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
                {workspaceData?.stats.closingSoon || 0}
              </p>
            </div>
            <Clock className="w-8 h-8 text-[var(--color-info)]" />
          </div>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="bg-[var(--color-surface)] rounded-lg shadow-sm">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
            Opportunités commerciales
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--color-surface-hover)]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Opportunité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Valeur
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Probabilité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Étape
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Date de clôture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {workspaceData?.opportunities.map((opportunity) => (
                <tr
                  key={opportunity.id}
                  className="hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
                  onClick={() => setSelectedOpportunity(opportunity)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                      {opportunity.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {opportunity.owner}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-primary)]">
                      {opportunity.client}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(opportunity.value)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-[var(--color-primary)] h-2 rounded-full"
                          style={{ width: `${opportunity.probability}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {opportunity.probability}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStageColor(opportunity.stage)}`}>
                      {opportunity.stage}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                    {new Date(opportunity.expectedCloseDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button className="text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
                      Voir détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opportunity Detail Modal */}
      {selectedOpportunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {selectedOpportunity.title}
              </h3>
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Client</p>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedOpportunity.client}</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Valeur</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {formatCurrency(selectedOpportunity.value)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Probabilité</p>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedOpportunity.probability}%</p>
                </div>
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Date de clôture prévue</p>
                  <p className="font-medium text-[var(--color-text-primary)]">
                    {new Date(selectedOpportunity.expectedCloseDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Dernière activité</p>
                <p className="font-medium text-[var(--color-text-primary)]">{selectedOpportunity.lastActivity}</p>
              </div>

              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Prochaine action</p>
                <p className="font-medium text-[var(--color-text-primary)]">{selectedOpportunity.nextAction}</p>
              </div>

              {selectedOpportunity.notes && (
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">Notes</p>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedOpportunity.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="px-4 py-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                Fermer
              </button>
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectionGeneraleWorkspace;