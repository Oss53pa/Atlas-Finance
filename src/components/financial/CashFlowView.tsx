import React, { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PlusIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface CashFlowData {
  id: string;
  period: string;
  statementDate: string;

  // Flux d'exploitation
  netResult: number;
  depreciation: number;
  provisionsReversals: number;
  selfFinancingCapacity: number;
  workingCapitalVariation: number;
  operatingCashFlow: number;

  // Flux d'investissement
  fixedAssetsAcquisitions: number;
  fixedAssetsDisposals: number;
  investmentCashFlow: number;

  // Flux de financement
  capitalIncrease: number;
  newBorrowings: number;
  loanRepayments: number;
  dividendsPaid: number;
  financingCashFlow: number;

  // Variation totale
  cashFlowVariation: number;
  openingCashBalance: number;
  closingCashBalance: number;

  status: 'draft' | 'validated';
  calculationMethod: 'direct' | 'indirect';
}

interface CashFlowScenario {
  id: string;
  name: string;
  type: 'optimistic' | 'pessimistic' | 'realistic' | 'monte_carlo';
  description: string;
  startDate: string;
  endDate: string;

  // Hypothèses
  revenueGrowthRate: number;
  costInflationRate: number;
  collectionPeriodDays: number;
  paymentPeriodDays: number;

  // Métriques calculées
  averageMonthlyCashFlow: number;
  minimumCashPosition: number;
  burnRateMonthly: number;
  cashRunwayMonths: number;

  status: 'draft' | 'active' | 'archived';
  confidenceLevel: number;
}

const CashFlowView: React.FC = () => {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [scenarios, setScenarios] = useState<CashFlowScenario[]>([]);
  const [activeTab, setActiveTab] = useState<'statements' | 'scenarios' | 'forecast' | 'analysis'>('statements');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');

  // Données d'exemple - à remplacer par des appels API
  useEffect(() => {
    setCashFlowData([
      {
        id: '1',
        period: 'Exercice 2024',
        statementDate: '2024-12-31',
        netResult: 198000,
        depreciation: 85000,
        provisionsReversals: -15000,
        selfFinancingCapacity: 268000,
        workingCapitalVariation: 45000,
        operatingCashFlow: 223000,
        fixedAssetsAcquisitions: 150000,
        fixedAssetsDisposals: 25000,
        investmentCashFlow: -125000,
        capitalIncrease: 0,
        newBorrowings: 80000,
        loanRepayments: 65000,
        dividendsPaid: 40000,
        financingCashFlow: -25000,
        cashFlowVariation: 73000,
        openingCashBalance: 125000,
        closingCashBalance: 198000,
        status: 'validated',
        calculationMethod: 'indirect'
      }
    ]);

    setScenarios([
      {
        id: '1',
        name: 'Croissance Optimiste 2025',
        type: 'optimistic',
        description: 'Scénario de forte croissance avec amélioration des délais de paiement',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        revenueGrowthRate: 15,
        costInflationRate: 3,
        collectionPeriodDays: 35,
        paymentPeriodDays: 65,
        averageMonthlyCashFlow: 25000,
        minimumCashPosition: 150000,
        burnRateMonthly: 0,
        cashRunwayMonths: 12,
        status: 'active',
        confidenceLevel: 75
      },
      {
        id: '2',
        name: 'Base Case 2025',
        type: 'realistic',
        description: 'Scénario réaliste basé sur les tendances actuelles',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        revenueGrowthRate: 8,
        costInflationRate: 4,
        collectionPeriodDays: 45,
        paymentPeriodDays: 60,
        averageMonthlyCashFlow: 18000,
        minimumCashPosition: 125000,
        burnRateMonthly: 0,
        cashRunwayMonths: 11,
        status: 'active',
        confidenceLevel: 85
      },
      {
        id: '3',
        name: 'Stress Test 2025',
        type: 'pessimistic',
        description: 'Scénario de crise avec dégradation des conditions',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        revenueGrowthRate: -5,
        costInflationRate: 8,
        collectionPeriodDays: 60,
        paymentPeriodDays: 45,
        averageMonthlyCashFlow: 5000,
        minimumCashPosition: 85000,
        burnRateMonthly: 12000,
        cashRunwayMonths: 7,
        status: 'active',
        confidenceLevel: 60
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

  const getScenarioTypeColor = (type: string) => {
    switch (type) {
      case 'optimistic':
        return 'bg-green-100 text-green-800';
      case 'pessimistic':
        return 'bg-red-100 text-red-800';
      case 'realistic':
        return 'bg-blue-100 text-blue-800';
      case 'monte_carlo':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScenarioTypeLabel = (type: string) => {
    switch (type) {
      case 'optimistic':
        return 'Optimiste';
      case 'pessimistic':
        return 'Pessimiste';
      case 'realistic':
        return 'Réaliste';
      case 'monte_carlo':
        return 'Monte Carlo';
      default:
        return type;
    }
  };

  const renderCashFlowStatements = () => {
    if (cashFlowData.length === 0) {
      return (
        <div className="bg-white rounded-lg border p-8 text-center">
          <BanknotesIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun TAFIRE Disponible</h3>
          <p className="text-gray-700 mb-4">
            Créez votre premier Tableau de Flux de Trésorerie (TAFIRE) SYSCOHADA.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Créer un TAFIRE
          </button>
        </div>
      );
    }

    const currentData = cashFlowData[0];

    return (
      <div className="space-y-6">
        {/* En-tête du TAFIRE */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                TAFIRE - {currentData.period}
              </h3>
              <p className="text-gray-600 mt-1">
                Méthode {currentData.calculationMethod === 'indirect' ? 'indirecte' : 'directe'} -
                Arrêté au {new Date(currentData.statementDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex space-x-2">
              <button className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 border rounded-md hover:bg-gray-50">
                <EyeIcon className="h-4 w-4" />
                <span>Détail</span>
              </button>
            </div>
          </div>

          {/* Résumé exécutif */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Flux d'Exploitation</p>
                  <p className="text-lg font-bold text-blue-900">{formatAmount(currentData.operatingCashFlow)}</p>
                </div>
                <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Flux d'Investissement</p>
                  <p className="text-lg font-bold text-red-900">{formatAmount(currentData.investmentCashFlow)}</p>
                </div>
                <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600">Flux de Financement</p>
                  <p className="text-lg font-bold text-yellow-900">{formatAmount(currentData.financingCashFlow)}</p>
                </div>
                <BanknotesIcon className="h-8 w-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Variation Totale</p>
                  <p className="text-lg font-bold text-green-900">{formatAmount(currentData.cashFlowVariation)}</p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Détail des flux */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flux d'exploitation */}
          <div className="bg-white rounded-lg border p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-500 mr-2" />
              Flux d'Exploitation
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Résultat net</span>
                <span className="font-medium">{formatAmount(currentData.netResult)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">+ Dotations amortissements</span>
                <span className="font-medium">{formatAmount(currentData.depreciation)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">- Reprises provisions</span>
                <span className="font-medium">{formatAmount(Math.abs(currentData.provisionsReversals))}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-blue-100 bg-blue-50 px-3 rounded">
                <span className="font-medium text-blue-900">= CAF</span>
                <span className="font-bold text-blue-900">{formatAmount(currentData.selfFinancingCapacity)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">- Variation BFR</span>
                <span className="font-medium">{formatAmount(currentData.workingCapitalVariation)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-green-100 bg-green-50 px-3 rounded">
                <span className="font-medium text-green-900">= Flux d'Exploitation</span>
                <span className="font-bold text-green-900">{formatAmount(currentData.operatingCashFlow)}</span>
              </div>
            </div>
          </div>

          {/* Flux d'investissement et financement */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ArrowTrendingDownIcon className="h-5 w-5 text-red-500 mr-2" />
                Flux d'Investissement
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">- Acquisitions immobilisations</span>
                  <span className="font-medium">{formatAmount(currentData.fixedAssetsAcquisitions)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Cessions immobilisations</span>
                  <span className="font-medium">{formatAmount(currentData.fixedAssetsDisposals)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-red-100 bg-red-50 px-3 rounded">
                  <span className="font-medium text-red-900">= Flux d'Investissement</span>
                  <span className="font-bold text-red-900">{formatAmount(currentData.investmentCashFlow)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BanknotesIcon className="h-5 w-5 text-yellow-500 mr-2" />
                Flux de Financement
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Augmentation capital</span>
                  <span className="font-medium">{formatAmount(currentData.capitalIncrease)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">+ Nouveaux emprunts</span>
                  <span className="font-medium">{formatAmount(currentData.newBorrowings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Remboursements emprunts</span>
                  <span className="font-medium">{formatAmount(currentData.loanRepayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">- Dividendes versés</span>
                  <span className="font-medium">{formatAmount(currentData.dividendsPaid)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-yellow-100 bg-yellow-50 px-3 rounded">
                  <span className="font-medium text-yellow-900">= Flux de Financement</span>
                  <span className="font-bold text-yellow-900">{formatAmount(currentData.financingCashFlow)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Réconciliation trésorerie */}
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Variation de Trésorerie</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Trésorerie d'ouverture</p>
              <p className="text-lg font-bold text-gray-900">{formatAmount(currentData.openingCashBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Variation nette</p>
              <p className={`text-lg font-bold ${currentData.cashFlowVariation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentData.cashFlowVariation >= 0 ? '+' : ''}{formatAmount(currentData.cashFlowVariation)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Trésorerie de clôture</p>
              <p className="text-lg font-bold text-blue-600">{formatAmount(currentData.closingCashBalance)}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScenarios = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Scénarios de Trésorerie</h3>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2">
          <PlusIcon className="h-4 w-4" />
          <span>Nouveau Scénario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <div key={scenario.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">{scenario.name}</h4>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getScenarioTypeColor(scenario.type)}`}>
                  {getScenarioTypeLabel(scenario.type)}
                </span>
              </div>
              <div className="flex space-x-1">
                <button className="p-1 text-gray-700 hover:text-gray-600" aria-label="Voir les détails">
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button className="p-1 text-gray-700 hover:text-gray-600" aria-label="Lire">
                  <PlayIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{scenario.description}</p>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Période:</span>
                <span className="font-medium">
                  {new Date(scenario.startDate).toLocaleDateString('fr-FR')} -
                  {new Date(scenario.endDate).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Cash flow mensuel moyen:</span>
                <span className={`font-medium ${scenario.averageMonthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatAmount(scenario.averageMonthlyCashFlow)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Position cash minimum:</span>
                <span className="font-medium">{formatAmount(scenario.minimumCashPosition)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Runway (mois):</span>
                <span className={`font-medium ${scenario.cashRunwayMonths < 6 ? 'text-red-600' : scenario.cashRunwayMonths < 12 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {scenario.cashRunwayMonths}
                </span>
              </div>
            </div>

            {/* Hypothèses clés */}
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <h5 className="font-medium text-gray-900 text-sm mb-2">Hypothèses Clés</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Croissance CA:</span>
                  <span className="ml-1 font-medium">{scenario.revenueGrowthRate > 0 ? '+' : ''}{scenario.revenueGrowthRate}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Inflation coûts:</span>
                  <span className="ml-1 font-medium">{scenario.costInflationRate}%</span>
                </div>
                <div>
                  <span className="text-gray-600">DSO:</span>
                  <span className="ml-1 font-medium">{scenario.collectionPeriodDays}j</span>
                </div>
                <div>
                  <span className="text-gray-600">DPO:</span>
                  <span className="ml-1 font-medium">{scenario.paymentPeriodDays}j</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-700">Confiance:</span>
                <span className="text-xs font-medium">{scenario.confidenceLevel}%</span>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                scenario.status === 'active' ? 'bg-green-100 text-green-800' :
                scenario.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {scenario.status === 'active' ? 'Actif' : scenario.status === 'draft' ? 'Brouillon' : 'Archivé'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Comparaison des scénarios */}
      <div className="bg-white rounded-lg border p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Comparaison des Scénarios</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Scénario</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Cash Flow Mensuel</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Position Min</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">Runway</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">Risque</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <span className={`w-3 h-3 rounded-full ${scenario.type === 'optimistic' ? 'bg-green-500' : scenario.type === 'pessimistic' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                      <span className="font-medium">{scenario.name}</span>
                    </div>
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${scenario.averageMonthlyCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatAmount(scenario.averageMonthlyCashFlow)}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {formatAmount(scenario.minimumCashPosition)}
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${scenario.cashRunwayMonths < 6 ? 'text-red-600' : scenario.cashRunwayMonths < 12 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {scenario.cashRunwayMonths} mois
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      scenario.confidenceLevel >= 80 ? 'bg-green-100 text-green-800' :
                      scenario.confidenceLevel >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {scenario.confidenceLevel >= 80 ? 'Faible' : scenario.confidenceLevel >= 60 ? 'Moyen' : 'Élevé'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAnalysis = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Analyse de Trésorerie</h3>

      {/* Métriques clés */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Free Cash Flow</h4>
            <CurrencyDollarIcon className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-blue-600">98K €</p>
          <p className="text-sm text-green-600">+12% vs N-1</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Cash Conversion</h4>
            <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-600">1.13</p>
          <p className="text-sm text-green-600">Excellent</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Jours de Trésorerie</h4>
            <CalendarIcon className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-lg font-bold text-yellow-600">34j</p>
          <p className="text-sm text-yellow-600">À surveiller</p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Burn Rate</h4>
            <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600">5.8K €</p>
          <p className="text-sm text-red-600">Par mois</p>
        </div>
      </div>

      {/* Recommandations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h4 className="font-medium text-green-900 mb-3">✅ Points Forts</h4>
          <ul className="space-y-2 text-sm text-green-800">
            <li>• CAF positive et en croissance (+15%)</li>
            <li>• Excellent cash conversion ratio (1.13)</li>
            <li>• Free cash flow positif</li>
            <li>• Diversification des sources de financement</li>
          </ul>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h4 className="font-medium text-yellow-900 mb-3">⚠️ Points d'Amélioration</h4>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>• Réduire les délais de recouvrement (45 → 35 jours)</li>
            <li>• Optimiser la gestion des stocks</li>
            <li>• Négocier de meilleurs délais fournisseurs</li>
            <li>• Constituer un coussin de sécurité de 3 mois</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gestion de Trésorerie</h1>
          <p className="mt-1 text-gray-600">
            TAFIRE, prévisions et scénarios de flux de trésorerie
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Nouveau TAFIRE</span>
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2">
            <ChartBarIcon className="h-5 w-5" />
            <span>Prévisions</span>
          </button>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('statements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'statements'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            TAFIRE SYSCOHADA
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scenarios'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scénarios Prévisionnels
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analyse & KPIs
          </button>
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'statements' && renderCashFlowStatements()}
      {activeTab === 'scenarios' && renderScenarios()}
      {activeTab === 'analysis' && renderAnalysis()}
    </div>
  );
};

export default CashFlowView;