import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CalculatorIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ArrowPathIcon,
  EyeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';

interface SIGData {
  id: string;
  calculationDate: string;
  fiscalYear: string;
  period: string;

  // Soldes principaux
  commercialMargin: number;
  periodProduction: number;
  addedValue: number;
  grossOperatingSurplus: number;
  operatingResult: number;
  financialResult: number;
  currentResultBeforeTax: number;
  exceptionalResult: number;
  finalNetResult: number;

  // Taux et ratios
  addedValueRate: number;
  operatingMarginRate: number;
  netMarginRate: number;
  revenueBase: number;

  // Métadonnées
  status: 'draft' | 'validated';
  lastCalculation: string;
}

interface SIGEvolution {
  indicator: string;
  current: number;
  previous: number;
  evolution: number;
  trend: 'up' | 'down' | 'stable';
}

const SIGView: React.FC = () => {
  const { t } = useLanguage();
  const [sigData, setSigData] = useState<SIGData[]>([]);
  const [selectedSIG, setSelectedSIG] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'evolution' | 'calculate'>('current');
  const [compareMode, setCompareMode] = useState(false);

  // Données d'exemple - à remplacer par des appels API
  useEffect(() => {
    setSigData([
      {
        id: '1',
        calculationDate: '2024-12-31',
        fiscalYear: '2024',
        period: 'Exercice 2024',
        commercialMargin: 280000,
        periodProduction: 1850000,
        addedValue: 1120000,
        grossOperatingSurplus: 420000,
        operatingResult: 310000,
        financialResult: -25000,
        currentResultBeforeTax: 285000,
        exceptionalResult: 8000,
        finalNetResult: 198000,
        addedValueRate: 52.5,
        operatingMarginRate: 14.5,
        netMarginRate: 9.2,
        revenueBase: 2130000,
        status: 'validated',
        lastCalculation: '2024-01-15T10:30:00'
      },
      {
        id: '2',
        calculationDate: '2023-12-31',
        fiscalYear: '2023',
        period: 'Exercice 2023',
        commercialMargin: 265000,
        periodProduction: 1720000,
        addedValue: 1025000,
        grossOperatingSurplus: 385000,
        operatingResult: 275000,
        financialResult: -30000,
        currentResultBeforeTax: 245000,
        exceptionalResult: -5000,
        finalNetResult: 168000,
        addedValueRate: 51.8,
        operatingMarginRate: 13.9,
        netMarginRate: 8.4,
        revenueBase: 1985000,
        status: 'validated',
        lastCalculation: '2023-12-20T14:15:00'
      }
    ]);
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
      default:
        return <MinusIcon className="h-4 w-4 text-gray-700" />;
    }
  };

  const calculateEvolution = (): SIGEvolution[] => {
    if (sigData.length < 2) return [];

    const current = sigData[0];
    const previous = sigData[1];

    const calculateTrend = (curr: number, prev: number): 'up' | 'down' | 'stable' => {
      const diff = curr - prev;
      if (Math.abs(diff) < prev * 0.02) return 'stable'; // Moins de 2% = stable
      return diff > 0 ? 'up' : 'down';
    };

    return [
      {
        indicator: 'Marge commerciale',
        current: current.commercialMargin,
        previous: previous.commercialMargin,
        evolution: ((current.commercialMargin - previous.commercialMargin) / previous.commercialMargin) * 100,
        trend: calculateTrend(current.commercialMargin, previous.commercialMargin)
      },
      {
        indicator: 'Valeur ajoutée',
        current: current.addedValue,
        previous: previous.addedValue,
        evolution: ((current.addedValue - previous.addedValue) / previous.addedValue) * 100,
        trend: calculateTrend(current.addedValue, previous.addedValue)
      },
      {
        indicator: 'EBE',
        current: current.grossOperatingSurplus,
        previous: previous.grossOperatingSurplus,
        evolution: ((current.grossOperatingSurplus - previous.grossOperatingSurplus) / previous.grossOperatingSurplus) * 100,
        trend: calculateTrend(current.grossOperatingSurplus, previous.grossOperatingSurplus)
      },
      {
        indicator: 'Résultat d\'exploitation',
        current: current.operatingResult,
        previous: previous.operatingResult,
        evolution: ((current.operatingResult - previous.operatingResult) / previous.operatingResult) * 100,
        trend: calculateTrend(current.operatingResult, previous.operatingResult)
      },
      {
        indicator: 'Résultat net',
        current: current.finalNetResult,
        previous: previous.finalNetResult,
        evolution: ((current.finalNetResult - previous.finalNetResult) / previous.finalNetResult) * 100,
        trend: calculateTrend(current.finalNetResult, previous.finalNetResult)
      }
    ];
  };

  const renderCurrentSIG = () => {
    if (sigData.length === 0) {
      return (
        <div className="bg-white rounded-lg border p-8 text-center">
          <CalculatorIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun SIG Calculé</h3>
          <p className="text-gray-700 mb-4">
            Calculez les Soldes Intermédiaires de Gestion pour analyser la performance de votre entreprise.
          </p>
          <button
            onClick={() => setActiveTab('calculate')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Calculer les SIG
          </button>
        </div>
      );
    }

    const currentSIG = sigData[0];

    return (
      <div className="space-y-6">
        {/* En-tête du SIG */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                SIG - {currentSIG.period}
              </h3>
              <p className="text-gray-600 mt-1">
                Calculé le {new Date(currentSIG.lastCalculation).toLocaleDateString('fr-FR')} à {new Date(currentSIG.lastCalculation).toLocaleTimeString('fr-FR')}
              </p>
              <p className="text-sm text-gray-700 mt-1">
                CA de référence: {formatAmount(currentSIG.revenueBase)}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50">
                <EyeIcon className="h-4 w-4" />
                <span>Détail</span>
              </button>
              <button className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50" aria-label="Imprimer">
                <PrinterIcon className="h-4 w-4" />
                <span>{t('common.print')}</span>
              </button>
              <button
                onClick={() => setActiveTab('calculate')}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span>Recalculer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Les 9 Soldes Intermédiaires */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colonne 1: Soldes principaux */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-900 mb-3">Soldes d'Exploitation</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">1. Marge commerciale</span>
                  <span className="font-medium">{formatAmount(currentSIG.commercialMargin)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">2. Production de l'exercice</span>
                  <span className="font-medium">{formatAmount(currentSIG.periodProduction)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-blue-50 px-2 rounded">
                  <span className="text-sm font-medium text-blue-900">3. Valeur Ajoutée (VA)</span>
                  <span className="font-bold text-blue-900">{formatAmount(currentSIG.addedValue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-green-50 px-2 rounded">
                  <span className="text-sm font-medium text-green-900">4. Excédent Brut d'Exploitation (EBE)</span>
                  <span className="font-bold text-green-900">{formatAmount(currentSIG.grossOperatingSurplus)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-purple-900">5. Résultat d'Exploitation</span>
                  <span className="font-bold text-purple-900">{formatAmount(currentSIG.operatingResult)}</span>
                </div>
              </div>
            </div>

            {/* Taux et ratios */}
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-900 mb-3">Taux de Performance</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taux de VA</span>
                  <span className="font-medium text-blue-600">{currentSIG.addedValueRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taux de marge d'exploitation</span>
                  <span className="font-medium text-green-600">{currentSIG.operatingMarginRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Taux de marge nette</span>
                  <span className="font-medium text-purple-600">{currentSIG.netMarginRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne 2: Résultats finaux */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-900 mb-3">Résultats Financiers</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">6. Résultat financier</span>
                  <span className={`font-medium ${currentSIG.financialResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAmount(currentSIG.financialResult)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-yellow-50 px-2 rounded">
                  <span className="text-sm font-medium text-yellow-900">7. Résultat Courant Avant Impôts</span>
                  <span className="font-bold text-yellow-900">{formatAmount(currentSIG.currentResultBeforeTax)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">8. Résultat exceptionnel</span>
                  <span className={`font-medium ${currentSIG.exceptionalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAmount(currentSIG.exceptionalResult)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200 bg-indigo-50 px-2 rounded">
                  <span className="text-sm font-medium text-indigo-900">9. Résultat Net Final</span>
                  <span className="font-bold text-indigo-900 text-lg">{formatAmount(currentSIG.finalNetResult)}</span>
                </div>
              </div>
            </div>

            {/* Graphique de répartition */}
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-medium text-gray-900 mb-3">Répartition de la Valeur Ajoutée</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Personnel et charges sociales</span>
                  <span>45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>État (impôts et taxes)</span>
                  <span>25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span>Entreprise (autofinancement)</span>
                  <span>30%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEvolution = () => {
    const evolutions = calculateEvolution();

    if (evolutions.length === 0) {
      return (
        <div className="bg-white rounded-lg border p-8 text-center">
          <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Données Insuffisantes</h3>
          <p className="text-gray-700">
            Au moins deux périodes sont nécessaires pour analyser l'évolution des SIG.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Évolution des SIG - Comparaison N vs N-1
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Indicateur</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">N-1</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">N</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Évolution</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Tendance</th>
                </tr>
              </thead>
              <tbody>
                {evolutions.map((evolution, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{evolution.indicator}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatAmount(evolution.previous)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatAmount(evolution.current)}</td>
                    <td className={`py-3 px-4 text-right font-medium ${
                      evolution.evolution > 0 ? 'text-green-600' : evolution.evolution < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {evolution.evolution > 0 ? '+' : ''}{evolution.evolution.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getTrendIcon(evolution.trend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Analyse de l'évolution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">✅ Points Positifs</h4>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• Croissance de la valeur ajoutée (+9.3%)</li>
              <li>• Amélioration de l'EBE (+9.1%)</li>
              <li>• Progression du résultat net (+17.9%)</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ Points d'Attention</h4>
            <ul className="space-y-1 text-sm text-yellow-800">
              <li>• Résultat financier encore négatif</li>
              <li>• Coût du financement à optimiser</li>
              <li>• Surveillance des charges exceptionnelles</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const renderCalculateForm = () => (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Calculer les Soldes Intermédiaires de Gestion
      </h3>

      <form className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source des Données
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="income_statement">Compte de Résultat Existant</option>
              <option value="trial_balance">Balance Générale</option>
              <option value="manual">Saisie Manuelle</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période de Calcul
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="2024">Exercice 2024</option>
              <option value="2023">Exercice 2023</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date de Fin de Période
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              defaultValue="2024-12-31"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Méthode de Calcul
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="syscohada">SYSCOHADA Standard</option>
              <option value="ifrs">Adaptation IFRS</option>
              <option value="custom">Personnalisée</option>
            </select>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Paramètres de Calcul</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Inclure les retraitements SYSCOHADA</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
              <span className="ml-2 text-sm text-blue-800">Calculer les taux automatiquement</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="ml-2 text-sm text-blue-800">Comparer avec l'exercice précédent</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="ml-2 text-sm text-blue-800">Générer l'analyse sectorielle</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <CalculatorIcon className="h-4 w-4" />
            <span>Calculer les SIG</span>
          </button>
        </div>
      </form>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Soldes Intermédiaires de Gestion (SIG)</h1>
          <p className="mt-1 text-gray-600">
            Analyse des 9 soldes intermédiaires selon les normes SYSCOHADA
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2 border rounded-md ${
              compareMode
                ? 'bg-blue-100 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Mode Comparaison
          </button>
          <button
            onClick={() => setActiveTab('calculate')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <CalculatorIcon className="h-5 w-5" />
            <span>Calculer SIG</span>
          </button>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'current'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            SIG Actuel
          </button>
          <button
            onClick={() => setActiveTab('evolution')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'evolution'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Évolution & Tendances
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'current' && renderCurrentSIG()}
      {activeTab === 'evolution' && renderEvolution()}
      {activeTab === 'calculate' && renderCalculateForm()}
    </div>
  );
};

export default SIGView;