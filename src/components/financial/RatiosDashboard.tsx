import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ScatterChart,
  Scatter
} from 'recharts';

interface RatioData {
  id: string;
  category: 'STRUCTURE' | 'LIQUIDITE' | 'ACTIVITE' | 'RENTABILITE' | 'SOLVABILITE' | 'OHADA';
  typeRatio: string;
  libelle: string;
  valeur: number;
  unite: '%' | 'ratio' | 'fois' | 'jours' | 'montant';
  valeurReference: number;
  ecartReference: number;
  valeurN1?: number;
  variationAbsolue?: number;
  variationRelative?: number;
  benchmarkSectorValue?: number;
  sectorPercentile?: number;
  interpretation: string;
  alerte: boolean;
  niveauAlerte: '' | 'INFO' | 'ATTENTION' | 'DANGER' | 'CRITIQUE';
  formule: string;
}

interface RatiosSummary {
  totalRatios: number;
  alertRatios: number;
  globalScore: number;
  categoriesScores: Record<string, number>;
  evolutionTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

const RatiosDashboard: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [selectedView, setSelectedView] = useState<'grid' | 'radar' | 'evolution' | 'benchmark'>('grid');

  const { data: ratiosData, isLoading } = useQuery({
    queryKey: ['financial-ratios', selectedCategory],
    queryFn: async (): Promise<RatioData[]> => {
      const entries = await db.journalEntries.toArray();
      const net = (...pfx: string[]) => {
        let t = 0;
        for (const e of entries) for (const l of e.lines)
          if (pfx.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit;
        return t;
      };
      const creditN = (...pfx: string[]) => {
        let t = 0;
        for (const e of entries) for (const l of e.lines)
          if (pfx.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit;
        return t;
      };
      const safe = (a: number, b: number) => b === 0 ? 0 : a / b;

      // Key aggregates
      const totalActif = Math.max(0, net('2', '28', '3', '41', '46', '5'));
      const cp = creditN('10', '11', '12') + (creditN('7') - net('6'));
      const dettesFinancieres = creditN('16', '17');
      const actifCirculant = Math.max(0, net('3', '41', '46', '5'));
      const passifCirculant = creditN('40', '42', '43', '44', '47');
      const tresorerie = Math.max(0, net('5'));
      const creancesClients = Math.max(0, net('41'));
      const dettesFournisseurs = creditN('40');
      const stocks = Math.max(0, net('3'));
      const ca = creditN('70');
      const achats = net('60');
      const rn = creditN('7') - net('6');
      const re = creditN('70', '71', '72', '73', '74', '75', '78', '79') - net('60', '61', '62', '63', '64', '65', '66', '68', '69');
      const chargesFin = net('67');
      const va = ca - net('60', '61', '62', '63');
      const ebe = va + creditN('74') - net('66') - net('64');

      const mkRatio = (id: string, cat: RatioData['category'], type: string, lib: string, val: number, unit: RatioData['unite'], ref: number, formule: string): RatioData => {
        const ecart = val - ref;
        const interp = val >= ref ? 'Conforme aux normes' : 'En dessous des normes';
        const alerte = (cat === 'STRUCTURE' || cat === 'RENTABILITE') ? val < ref * 0.5 : val < ref * 0.7;
        return { id, category: cat, typeRatio: type, libelle: lib, valeur: Math.round(val * 10) / 10, unite: unit, valeurReference: ref, ecartReference: Math.round(ecart * 10) / 10, interpretation: interp, alerte, niveauAlerte: alerte ? 'ATTENTION' : '', formule };
      };

      return [
        mkRatio('1', 'STRUCTURE', 'AUTONOMIE_FINANCIERE', 'Autonomie financière', safe(cp, totalActif) * 100, '%', 33, 'Capitaux Propres / Total Actif × 100'),
        mkRatio('2', 'STRUCTURE', 'ENDETTEMENT_GLOBAL', 'Endettement global', safe(dettesFinancieres + passifCirculant, totalActif) * 100, '%', 67, 'Total Dettes / Total Actif × 100'),
        mkRatio('3', 'STRUCTURE', 'CAPACITE_REMBOURSEMENT', 'Capacité de remboursement', safe(dettesFinancieres, ebe), 'fois', 4, 'Dettes Financières / EBE'),
        mkRatio('4', 'LIQUIDITE', 'LIQUIDITE_GENERALE', 'Liquidité générale', safe(actifCirculant, passifCirculant), 'ratio', 1.2, 'Actif Circulant / Passif Circulant'),
        mkRatio('5', 'LIQUIDITE', 'LIQUIDITE_REDUITE', 'Liquidité réduite', safe(creancesClients + tresorerie, passifCirculant), 'ratio', 0.8, '(Créances + Disponibilités) / Passif Circulant'),
        mkRatio('6', 'ACTIVITE', 'DELAI_CLIENTS', 'Délai clients (DSO)', safe(creancesClients, ca) * 365, 'jours', 45, '(Créances Clients × 365) / CA'),
        mkRatio('7', 'ACTIVITE', 'DELAI_FOURNISSEURS', 'Délai fournisseurs (DPO)', safe(dettesFournisseurs, achats) * 365, 'jours', 60, '(Dettes Fournisseurs × 365) / Achats'),
        mkRatio('8', 'ACTIVITE', 'ROTATION_STOCKS', 'Rotation stocks (DIO)', safe(stocks, achats) * 365, 'jours', 45, '(Stock Moyen × 365) / Coût d\'Achat'),
        mkRatio('9', 'RENTABILITE', 'MARGE_NETTE', 'Marge nette', safe(rn, ca) * 100, '%', 5, 'Résultat Net / CA × 100'),
        mkRatio('10', 'RENTABILITE', 'ROE', 'ROE (Return on Equity)', safe(rn, cp) * 100, '%', 10, 'Résultat Net / Capitaux Propres × 100'),
        mkRatio('11', 'RENTABILITE', 'ROA', 'ROA (Return on Assets)', safe(rn, totalActif) * 100, '%', 5, 'Résultat Net / Total Actif × 100'),
        mkRatio('12', 'SOLVABILITE', 'COUVERTURE_INTERETS', 'Couverture des intérêts', safe(ebe, chargesFin), 'fois', 3, 'EBE / Charges Financières'),
        mkRatio('13', 'SOLVABILITE', 'DETTE_EBITDA', 'Dette / EBITDA', safe(dettesFinancieres, ebe), 'fois', 4, 'Dettes Financières / EBE'),
      ];
    }
  });

  const { data: ratiosSummary } = useQuery({
    queryKey: ['ratios-summary', ratiosData?.length],
    queryFn: async (): Promise<RatiosSummary> => {
      if (!ratiosData) return null;
      
      const alertRatios = ratiosData.filter(r => r.alerte).length;
      const globalScore = ratiosData.reduce((sum, ratio) => {
        const performance = ratio.valeur >= ratio.valeurReference ? 100 : (ratio.valeur / ratio.valeurReference) * 100;
        return sum + Math.min(performance, 100);
      }, 0) / ratiosData.length;

      const categoriesScores = ratiosData.reduce((acc, ratio) => {
        if (!acc[ratio.category]) acc[ratio.category] = [];
        const performance = ratio.valeur >= ratio.valeurReference ? 100 : (ratio.valeur / ratio.valeurReference) * 100;
        acc[ratio.category].push(Math.min(performance, 100));
        return acc;
      }, {} as Record<string, number[]>);

      Object.keys(categoriesScores).forEach(category => {
        const scores = categoriesScores[category];
        categoriesScores[category] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      });

      return {
        totalRatios: ratiosData.length,
        alertRatios,
        globalScore: Math.round(globalScore),
        categoriesScores: categoriesScores as Record<string, number>,
        evolutionTrend: 'IMPROVING'
      };
    },
    enabled: !!ratiosData
  });

  const formatNumber = (value: number, decimals: number = 1): string => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const getRatioColor = (ratio: RatioData): string => {
    if (ratio.alerte) {
      switch (ratio.niveauAlerte) {
        case 'CRITIQUE': return 'text-red-600';
        case 'DANGER': return 'text-red-500';
        case 'ATTENTION': return 'text-yellow-600';
        default: return 'text-blue-600';
      }
    }
    return ratio.valeur >= ratio.valeurReference ? 'text-green-600' : 'text-gray-600';
  };

  const getRatioBgColor = (ratio: RatioData): string => {
    if (ratio.alerte) {
      switch (ratio.niveauAlerte) {
        case 'CRITIQUE': return 'bg-red-50 border-red-200';
        case 'DANGER': return 'bg-red-50 border-red-200';
        case 'ATTENTION': return 'bg-yellow-50 border-yellow-200';
        default: return 'bg-blue-50 border-blue-200';
      }
    }
    return ratio.valeur >= ratio.valeurReference ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';
  };

  const getPerformanceIcon = (ratio: RatioData) => {
    if (ratio.variationRelative !== undefined) {
      if (ratio.variationRelative > 5) return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
      if (ratio.variationRelative < -5) return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
    }
    return <div className="h-4 w-4" />;
  };

  const getCategoryLabel = (category: string): string => {
    switch (category) {
      case 'STRUCTURE': return 'Structure';
      case 'LIQUIDITE': return 'Liquidité';
      case 'ACTIVITE': return 'Activité';
      case 'RENTABILITE': return 'Rentabilité';
      case 'SOLVABILITE': return 'Solvabilité';
      case 'OHADA': return 'OHADA';
      default: return category;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!ratiosData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-700">Aucune donnée de ratios disponible</p>
      </div>
    );
  }

  const filteredRatios = ratiosData.filter(ratio => {
    const categoryMatch = selectedCategory === 'all' || ratio.category === selectedCategory;
    const alertMatch = !showAlertsOnly || ratio.alerte;
    return categoryMatch && alertMatch;
  });

  // Données pour radar chart
  const radarData = Object.entries(ratiosSummary?.categoriesScores || {}).map(([category, score]) => ({
    category: getCategoryLabel(category),
    score: Math.round(score),
    fullMark: 100
  }));

  // Données pour évolution temporelle
  const evolutionData = filteredRatios
    .filter(r => r.valeurN1 !== undefined)
    .map(ratio => ({
      name: ratio.libelle.substring(0, 15) + '...',
      current: ratio.valeur,
      previous: ratio.valeurN1,
      reference: ratio.valeurReference
    }));

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Ratios Financiers SYSCOHADA</h2>
          <p className="text-gray-600">
            Analyse complète des ratios avec benchmarks sectoriels • 
            Score global: {ratiosSummary?.globalScore || 0}/100
          </p>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="grid">Grille</option>
            <option value="radar">Performance</option>
            <option value="evolution">Évolution</option>
            <option value="benchmark">Benchmark</option>
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Toutes catégories</option>
            <option value="STRUCTURE">Structure</option>
            <option value="LIQUIDITE">Liquidité</option>
            <option value="ACTIVITE">Activité</option>
            <option value="RENTABILITE">Rentabilité</option>
            <option value="SOLVABILITE">Solvabilité</option>
          </select>
          <button
            onClick={() => setShowAlertsOnly(!showAlertsOnly)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
              showAlertsOnly ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Alertes uniquement</span>
          </button>
        </div>
      </div>

      {/* Synthèse performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Score Global</p>
              <p className="text-lg font-bold text-gray-900">{ratiosSummary?.globalScore || 0}/100</p>
              <p className="text-sm text-green-600">Performance élevée</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ratios Analysés</p>
              <p className="text-lg font-bold text-gray-900">{ratiosSummary?.totalRatios || 0}</p>
              <p className="text-sm text-blue-600">Toutes catégories</p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alertes Actives</p>
              <p className="text-lg font-bold text-gray-900">{ratiosSummary?.alertRatios || 0}</p>
              <p className="text-sm text-red-600">À surveiller</p>
            </div>
            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tendance</p>
              <p className="text-lg font-bold text-green-600">↗</p>
              <p className="text-sm text-green-600">En amélioration</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ArrowUpIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu selon la vue */}
      {selectedView === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRatios.map((ratio) => (
            <div key={ratio.id} className={`p-6 rounded-lg shadow-sm border ${getRatioBgColor(ratio)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{ratio.libelle}</h3>
                  <p className="text-xs text-gray-700 mt-1">{ratio.category}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {getPerformanceIcon(ratio)}
                  {ratio.alerte && (
                    <ExclamationTriangleIcon className={`h-4 w-4 ${
                      ratio.niveauAlerte === 'CRITIQUE' ? 'text-red-500' :
                      ratio.niveauAlerte === 'ATTENTION' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-lg font-bold text-gray-900">
                    {formatNumber(ratio.valeur, ratio.unite === 'jours' ? 0 : 1)}
                  </span>
                  <span className="text-sm text-gray-700">{ratio.unite}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Référence:</span>
                  <span className="font-medium">{formatNumber(ratio.valeurReference)} {ratio.unite}</span>
                </div>

                {ratio.valeurN1 !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">N-1:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formatNumber(ratio.valeurN1)} {ratio.unite}</span>
                      {ratio.variationRelative !== undefined && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ratio.variationRelative > 0 ? 'bg-green-100 text-green-800' : 
                          ratio.variationRelative < 0 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ratio.variationRelative > 0 ? '+' : ''}{formatNumber(ratio.variationRelative)}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {ratio.benchmarkSectorValue && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Secteur:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{formatNumber(ratio.benchmarkSectorValue)} {ratio.unite}</span>
                      {ratio.sectorPercentile && (
                        <span className="text-xs text-blue-600">P{ratio.sectorPercentile}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-gray-200">
                  <p className={`text-xs font-medium ${getRatioColor(ratio)}`}>
                    {ratio.interpretation}
                  </p>
                </div>

                <div className="pt-2">
                  <details className="text-xs text-gray-700">
                    <summary className="cursor-pointer hover:text-gray-700">Formule</summary>
                    <p className="mt-1 font-mono">{ratio.formule}</p>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedView === 'radar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar chart performance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance par Catégorie</h3>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#6A8A82"
                  fill="#6A8A82"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Détail des scores par catégorie */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Scores Détaillés</h3>
            <div className="space-y-4">
              {Object.entries(ratiosSummary?.categoriesScores || {}).map(([category, score]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{getCategoryLabel(category)}</span>
                    <span className="text-lg font-bold text-gray-900">{Math.round(score)}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        score >= 80 ? 'bg-green-500' :
                        score >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${score}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-700">
                    <span>Critique</span>
                    <span>Excellent</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Interprétation</h4>
              <div className="space-y-1 text-xs text-blue-800">
                <p>• Score ≥ 80: Performance excellente</p>
                <p>• Score 60-79: Performance satisfaisante</p>
                <p>• Score 40-59: Performance à améliorer</p>
                <p>• Score &lt; 40: Performance critique</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'evolution' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution des Ratios Clés</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="current" stroke="#6A8A82" strokeWidth={2} name="Actuel" />
              <Line type="monotone" dataKey="previous" stroke="#7A99AC" strokeWidth={2} name="Précédent" />
              <Line type="monotone" dataKey="reference" stroke="#B87333" strokeWidth={1} strokeDasharray="5 5" name="Référence" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tableau détaillé */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Tableau Détaillé des Ratios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Ratio</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Valeur</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Référence</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Évolution</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Benchmark</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRatios.map((ratio) => (
                <tr key={ratio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{ratio.libelle}</div>
                      <div className="text-xs text-gray-700">{ratio.category}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`text-sm font-bold ${getRatioColor(ratio)}`}>
                      {formatNumber(ratio.valeur)} {ratio.unite}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                    {formatNumber(ratio.valeurReference)} {ratio.unite}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {ratio.variationRelative !== undefined ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ratio.variationRelative > 0 ? 'bg-green-100 text-green-800' :
                        ratio.variationRelative < 0 ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {ratio.variationRelative > 0 ? <ArrowUpIcon className="w-3 h-3 mr-1" /> : 
                         ratio.variationRelative < 0 ? <ArrowDownIcon className="w-3 h-3 mr-1" /> : null}
                        {formatNumber(Math.abs(ratio.variationRelative))}%
                      </span>
                    ) : (
                      <span className="text-gray-700">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {ratio.benchmarkSectorValue ? (
                      <div className="text-sm">
                        <div>{formatNumber(ratio.benchmarkSectorValue)} {ratio.unite}</div>
                        {ratio.sectorPercentile && (
                          <div className="text-xs text-blue-600">P{ratio.sectorPercentile}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-700">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {ratio.alerte ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ratio.niveauAlerte === 'CRITIQUE' ? 'bg-red-100 text-red-800' :
                        ratio.niveauAlerte === 'ATTENTION' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                        {ratio.niveauAlerte}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RatiosDashboard;