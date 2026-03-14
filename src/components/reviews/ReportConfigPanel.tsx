/**
 * ReportConfigPanel - Panneau de résumé de la configuration d'un rapport
 * Affiche les sources de données, modèles appliqués, KPIs et insights IA
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Database, Layers, TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

// Types
interface DataSource {
  id: string;
  name: string;
  type: 'ledger' | 'balance' | 'sales' | 'custom';
}

interface AppliedModel {
  id: string;
  name: string;
  category: string;
}

interface KPI {
  id: string;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  description?: string;
}

interface Summary {
  title: string;
  items: { label: string; value: string; detail?: string }[];
}

interface AIInsight {
  id: string;
  type: 'warning' | 'opportunity' | 'info';
  message: string;
}

interface ReportConfig {
  id: string;
  title: string;
  dataSources: DataSource[];
  models: AppliedModel[];
  kpis: KPI[];
  summaries: Summary[];
  aiInsights: AIInsight[];
}

interface ReportConfigPanelProps {
  reportId: string;
  onClose: () => void;
  className?: string;
}

// Mock data for demonstration
const mockReportConfig: ReportConfig = {
  id: 'report-1',
  title: 'Bilan Financier Q4 2024',
  dataSources: [
    { id: '1', name: 'Grand Livre 2024', type: 'ledger' },
    { id: '2', name: 'Balance Générale 2024', type: 'balance' },
    { id: '3', name: 'Ventes Q4 2024', type: 'sales' },
  ],
  models: [
    { id: '1', name: 'Rapport Financier', category: 'Finance' },
    { id: '2', name: 'Analyse des Ventes', category: 'Commercial' },
    { id: '3', name: 'Vue d\'ensemble', category: 'Synthèse' },
    { id: '4', name: 'Analyse Croisée', category: 'Avancé' },
  ],
  kpis: [
    { id: '1', label: 'Chiffre d\'Affaires Q4', value: '149 717 €', change: '+23.5% vs Q3', changeType: 'positive' },
    { id: '2', label: 'Résultat Net', value: '452 000 000 €', change: '+18.2% vs N-1', changeType: 'positive' },
    { id: '3', label: 'Clients Actifs', value: '15', change: '+12% nouveaux', changeType: 'positive' },
    { id: '4', label: 'Marge Brute', value: '28.8%', change: '+2.3% pts vs N-1', changeType: 'positive' },
  ],
  summaries: [
    {
      title: 'Synthèse Financière',
      items: [
        { label: 'Total Actif', value: '1 675 000 000 €' },
        { label: 'Capitaux Propres', value: '1 287 000 000 €' },
        { label: 'Chiffre d\'Affaires', value: '1 767 000 000 €' },
        { label: 'Résultat Net', value: '452 000 000 €' },
      ],
    },
    {
      title: 'Synthèse Commerciale',
      items: [
        { label: 'Ventes Totales Q4', value: '149 717 €' },
        { label: 'Logiciels', value: '78 317 €', detail: '52.3%' },
        { label: 'Services', value: '71 400 €', detail: '47.7%' },
        { label: 'Panier Moyen', value: '9 981,133 €' },
      ],
    },
  ],
  aiInsights: [
    { id: '1', type: 'warning', message: 'La concentration des ventes sur Abidjan (65%) représente un risque de dépendance géographique' },
    { id: '2', type: 'warning', message: 'Les créances clients ont augmenté de 15% - surveiller le délai de recouvrement' },
    { id: '3', type: 'opportunity', message: 'Opportunité : les services ont une marge supérieure (+12 pts) aux licences' },
  ],
};

const ReportConfigPanel: React.FC<ReportConfigPanelProps> = ({
  reportId,
  onClose,
  className,
}) => {
  const navigate = useNavigate();

  // In real implementation, fetch report config based on reportId
  const config = mockReportConfig;

  const handleViewDetails = (section: string) => {
    onClose();
    navigate(`/reports/${reportId}?section=${section}`);
  };

  return (
    <div className={cn('bg-white border-l border-gray-200 flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Configuration du rapport</h2>
          <p className="text-sm text-gray-500">{config.title}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-12">
        {/* Sources de données */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Database className="w-4 h-4 text-blue-500" />
            Sources de données
          </h3>
          <div className="space-y-2">
            {config.dataSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                {source.name}
              </div>
            ))}
          </div>
        </section>

        {/* Modèles appliqués */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Layers className="w-4 h-4 text-purple-500" />
            Modèles appliqués
          </h3>
          <div className="flex flex-wrap gap-2">
            {config.models.map((model) => (
              <span
                key={model.id}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium"
              >
                {model.name}
              </span>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Indicateurs clés
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {config.kpis.map((kpi) => (
              <div
                key={kpi.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                {kpi.change && (
                  <div className={cn(
                    'text-xs font-medium mb-1',
                    kpi.changeType === 'positive' && 'text-green-600',
                    kpi.changeType === 'negative' && 'text-red-600',
                    kpi.changeType === 'neutral' && 'text-gray-500'
                  )}>
                    {kpi.changeType === 'positive' && <TrendingUp className="w-3 h-3 inline mr-1" />}
                    {kpi.changeType === 'negative' && <TrendingDown className="w-3 h-3 inline mr-1" />}
                    {kpi.change}
                  </div>
                )}
                <div className="text-lg font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500">{kpi.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Summaries */}
        {config.summaries.map((summary, idx) => (
          <section key={idx}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">{summary.title}</h3>
              <button
                onClick={() => handleViewDetails(summary.title.toLowerCase().replace(/\s+/g, '-'))}
                className="text-xs text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 transition-colors"
              >
                Voir détails <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg border border-gray-100 divide-y divide-gray-100">
              {summary.items.map((item, itemIdx) => (
                <div key={itemIdx} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-600">{item.label}</span>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    {item.detail && (
                      <span className="text-xs text-gray-500 ml-1">({item.detail})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* AI Insights */}
        <section className="mb-8">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Points d'attention identifiés par l'IA
          </h3>
          <div className="space-y-2">
            {config.aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={cn(
                  'flex items-start gap-2 p-3 rounded-lg text-sm',
                  insight.type === 'warning' && 'bg-amber-50 text-amber-800',
                  insight.type === 'opportunity' && 'bg-green-50 text-green-800',
                  insight.type === 'info' && 'bg-blue-50 text-blue-800'
                )}
              >
                {insight.type === 'warning' && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                {insight.type === 'opportunity' && <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{insight.message}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Spacer for scroll */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default ReportConfigPanel;
