import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowArrowTrendingDownIcon,
  ArrowRightIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';

interface FinancialData {
  tafire: TAFIREData;
  sig: SIGData;
  functionalBalance: FunctionalBalanceData;
  ratios: RatioData[];
  cashFlowForecast: CashFlowData;
}

interface TAFIREData {
  operatingCashFlow: number;
  investmentCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  selfFinancingCapacity: number;
  freeCashFlow: number;
  openingCash: number;
  closingCash: number;
}

interface SIGData {
  commercialMargin: number;
  production: number;
  addedValue: number;
  grossOperatingSurplus: number;
  operatingResult: number;
  financialResult: number;
  currentResultBeforeTax: number;
  exceptionalResult: number;
  netResult: number;
  addedValueRate: number;
  operatingMarginRate: number;
  netMarginRate: number;
}

interface FunctionalBalanceData {
  workingCapitalFund: number;
  totalWorkingCapitalNeed: number;
  netTreasury: number;
  operatingWorkingCapitalNeed: number;
  stableUses: number;
  stableResources: number;
  coverageRatio: number;
  bfrRotationDays: number;
  treasuryAutonomyDays: number;
}

interface RatioData {
  category: string;
  name: string;
  value: number;
  unit: string;
  reference: number;
  variation: number;
  interpretation: string;
  alert: boolean;
  alertLevel: string;
}

interface CashFlowData {
  monthlyForecasts: MonthlyForecast[];
  scenarios: Scenario[];
  burnRate: number;
  runway: number;
}

interface MonthlyForecast {
  month: string;
  inflows: number;
  outflows: number;
  netFlow: number;
  cumulativeCash: number;
}

interface Scenario {
  name: string;
  type: string;
  averageCashFlow: number;
  minimumCash: number;
  confidenceLevel: number;
}

const FinancialAnalysisPage: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'overview' | 'tafire' | 'sig' | 'functional' | 'ratios' | 'forecast'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const { data: financialData, isLoading } = useQuery({
    queryKey: ['financial-analysis', selectedPeriod],
    queryFn: async () => {
      const mockData: FinancialData = {
        tafire: {
          operatingCashFlow: 2450000,
          investmentCashFlow: -850000,
          financingCashFlow: -650000,
          netCashFlow: 950000,
          selfFinancingCapacity: 2100000,
          freeCashFlow: 1600000,
          openingCash: 580000,
          closingCash: 1530000
        },
        sig: {
          commercialMargin: 3200000,
          production: 8500000,
          addedValue: 5800000,
          grossOperatingSurplus: 2850000,
          operatingResult: 2100000,
          financialResult: -180000,
          currentResultBeforeTax: 1920000,
          exceptionalResult: 50000,
          netResult: 1450000,
          addedValueRate: 48.3,
          operatingMarginRate: 17.5,
          netMarginRate: 12.1
        },
        functionalBalance: {
          workingCapitalFund: 1800000,
          totalWorkingCapitalNeed: 950000,
          netTreasury: 850000,
          operatingWorkingCapitalNeed: 1200000,
          stableUses: 4500000,
          stableResources: 6300000,
          coverageRatio: 140,
          bfrRotationDays: 28.5,
          treasuryAutonomyDays: 85
        },
        ratios: [
          { category: 'LIQUIDITE', name: 'Liquidité générale', value: 1.8, unit: 'ratio', reference: 1.2, variation: 0.2, interpretation: 'Bonne liquidité', alert: false, alertLevel: '' },
          { category: 'STRUCTURE', name: 'Autonomie financière', value: 45.2, unit: '%', reference: 33, variation: 2.1, interpretation: 'Bonne autonomie', alert: false, alertLevel: '' },
          { category: 'RENTABILITE', name: 'ROE', value: 18.7, unit: '%', reference: 10, variation: 1.5, interpretation: 'Excellente rentabilité', alert: false, alertLevel: '' },
          { category: 'ACTIVITE', name: 'Délai clients', value: 42, unit: 'jours', reference: 45, variation: -3, interpretation: 'Bon recouvrement', alert: false, alertLevel: '' },
          { category: 'SOLVABILITE', name: 'Dette/EBITDA', value: 2.1, unit: 'fois', reference: 4, variation: -0.3, interpretation: 'Faible endettement', alert: false, alertLevel: '' }
        ],
        cashFlowForecast: {
          monthlyForecasts: [
            { month: 'Jan', inflows: 1200000, outflows: 980000, netFlow: 220000, cumulativeCash: 1750000 },
            { month: 'Fév', inflows: 1350000, outflows: 1020000, netFlow: 330000, cumulativeCash: 2080000 },
            { month: 'Mar', inflows: 1180000, outflows: 1100000, netFlow: 80000, cumulativeCash: 2160000 },
            { month: 'Avr', inflows: 1400000, outflows: 1050000, netFlow: 350000, cumulativeCash: 2510000 },
            { month: 'Mai', inflows: 1250000, outflows: 1080000, netFlow: 170000, cumulativeCash: 2680000 },
            { month: 'Jun', inflows: 1320000, outflows: 1150000, netFlow: 170000, cumulativeCash: 2850000 }
          ],
          scenarios: [
            { name: 'Optimiste', type: 'OPTIMISTIC', averageCashFlow: 285000, minimumCash: 1200000, confidenceLevel: 75 },
            { name: 'Réaliste', type: 'REALISTIC', averageCashFlow: 220000, minimumCash: 800000, confidenceLevel: 85 },
            { name: 'Pessimiste', type: 'PESSIMISTIC', averageCashFlow: 120000, minimumCash: 400000, confidenceLevel: 90 }
          ],
          burnRate: 180000,
          runway: 8.5
        }
      };
      
      return mockData;
    }
  });

  const getStatusIcon = (value: number, reference: number) => {
    if (value >= reference * 1.1) return <ChartBarIcon className="h-5 w-5 text-green-500" />;
    if (value <= reference * 0.9) return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />;
    return <ArrowRightIcon className="h-5 w-5 text-yellow-500" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number, decimals: number = 1) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analyse Financière Avancée</h1>
            <p className="text-gray-600">TAFIRE, SIG, Bilan Fonctionnel et Ratios SYSCOHADA</p>
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="current">Exercice courant</option>
              <option value="previous">Exercice précédent</option>
              <option value="comparison">Comparaison N/N-1</option>
            </select>
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>Exporter Rapport</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8 border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: ChartBarIcon },
            { id: 'tafire', label: 'TAFIRE', icon: CurrencyDollarIcon },
            { id: 'sig', label: 'SIG', icon: ChartBarIcon },
            { id: 'functional', label: 'Bilan Fonctionnel', icon: DocumentTextIcon },
            { id: 'ratios', label: 'Ratios', icon: ChartBarIcon },
            { id: 'forecast', label: 'Prévisions', icon: ClockIcon }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSelectedView(id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                selectedView === id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {selectedView === 'overview' && (
        <div className="space-y-8">
          {/* KPIs principaux */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Résultat Net</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialData?.sig.netResult || 0)}</p>
                  <p className="text-sm text-green-600 flex items-center">
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                    {formatNumber(financialData?.sig.netMarginRate || 0)}% marge
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Free Cash Flow</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialData?.tafire.freeCashFlow || 0)}</p>
                  <p className="text-sm text-blue-600">CAF: {formatCurrency(financialData?.tafire.selfFinancingCapacity || 0)}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">FRNG</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(financialData?.functionalBalance.workingCapitalFund || 0)}</p>
                  <p className="text-sm text-purple-600">BFR: {formatCurrency(financialData?.functionalBalance.totalWorkingCapitalNeed || 0)}</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">ROE</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(financialData?.ratios.find(r => r.name === 'ROE')?.value || 0)}%</p>
                  <p className="text-sm text-orange-600">Ref: 10%</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques de synthèse */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Évolution SIG */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cascade des SIG</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'Marge Comm.', value: financialData?.sig.commercialMargin || 0 },
                  { name: 'Production', value: financialData?.sig.production || 0 },
                  { name: 'Valeur Ajoutée', value: financialData?.sig.addedValue || 0 },
                  { name: 'EBE', value: financialData?.sig.grossOperatingSurplus || 0 },
                  { name: 'Rés. Exploit.', value: financialData?.sig.operatingResult || 0 },
                  { name: 'Rés. Net', value: financialData?.sig.netResult || 0 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#6A8A82" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Équilibre financier */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Équilibre Financier</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'FRNG', value: financialData?.functionalBalance.workingCapitalFund || 0, fill: '#6A8A82' },
                  { name: 'BFR', value: financialData?.functionalBalance.totalWorkingCapitalNeed || 0, fill: '#B87333' },
                  { name: 'Trésorerie', value: financialData?.functionalBalance.netTreasury || 0, fill: '#7A99AC' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ratios radar */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Globale</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={financialData?.ratios.map(ratio => ({
                  category: ratio.category,
                  value: Math.min(100, (ratio.value / ratio.reference) * 100),
                  fullMark: 100
                })) || []}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Performance" dataKey="value" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
              
              <div className="space-y-4">
                {financialData?.ratios.slice(0, 5).map((ratio, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(ratio.value, ratio.reference)}
                      <span className="text-sm font-medium text-gray-900">{ratio.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatNumber(ratio.value)}{ratio.unit}</p>
                      <p className="text-xs text-gray-700">Réf: {formatNumber(ratio.reference)}{ratio.unit}</p>
                    </div>
                  </div>
                )) || []}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'tafire' && (
        <div className="space-y-8">
          {/* En-tête TAFIRE */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">TAFIRE - Tableau Financier des Ressources et Emplois</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Flux d'Exploitation</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(financialData?.tafire.operatingCashFlow || 0)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Flux d'Investissement</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(financialData?.tafire.investmentCashFlow || 0)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Flux de Financement</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(financialData?.tafire.financingCashFlow || 0)}</p>
              </div>
            </div>
          </div>

          {/* Analyse des flux */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Waterfall des Flux de Trésorerie</h3>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={[
                  { name: 'Trésorerie début', value: financialData?.tafire.openingCash || 0, type: 'opening' },
                  { name: 'Flux exploitation', value: financialData?.tafire.operatingCashFlow || 0, type: 'operating' },
                  { name: 'Flux investissement', value: financialData?.tafire.investmentCashFlow || 0, type: 'investment' },
                  { name: 'Flux financement', value: financialData?.tafire.financingCashFlow || 0, type: 'financing' },
                  { name: 'Trésorerie fin', value: financialData?.tafire.closingCash || 0, type: 'closing' }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#6A8A82" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Indicateurs Clés</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Capacité d'Autofinancement</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(financialData?.tafire.selfFinancingCapacity || 0)}</p>
                  </div>
                  <div className="text-right">
                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Free Cash Flow</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(financialData?.tafire.freeCashFlow || 0)}</p>
                  </div>
                  <div className="text-right">
                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Variation de Trésorerie</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(financialData?.tafire.netCashFlow || 0)}</p>
                  </div>
                  <div className="text-right">
                    {(financialData?.tafire.netCashFlow || 0) > 0 ? 
                      <ArrowUpIcon className="h-8 w-8 text-green-500" /> : 
                      <ArrowDownIcon className="h-8 w-8 text-red-500" />
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'forecast' && financialData && (
        <div className="space-y-8">
          {/* Prévisions de trésorerie */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cash Flow Prévisionnel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Burn Rate Mensuel</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(financialData.cashFlowForecast.burnRate)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Runway</p>
                <p className="text-2xl font-bold text-green-700">{formatNumber(financialData.cashFlowForecast.runway)} mois</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Scénarios</p>
                <p className="text-2xl font-bold text-purple-700">{financialData.cashFlowForecast.scenarios.length}</p>
              </div>
            </div>

            {/* Graphique prévisionnel */}
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={financialData.cashFlowForecast.monthlyForecasts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="inflows" fill="#6A8A82" name="Encaissements" />
                <Bar dataKey="outflows" fill="#B85450" name="Décaissements" />
                <Line type="monotone" dataKey="cumulativeCash" stroke="#7A99AC" strokeWidth={3} name="Trésorerie cumulative" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Scénarios */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Analyse de Scénarios</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {financialData.cashFlowForecast.scenarios.map((scenario, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      scenario.type === 'OPTIMISTIC' ? 'bg-green-100 text-green-800' :
                      scenario.type === 'PESSIMISTIC' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {scenario.confidenceLevel}% confiance
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cash Flow Moyen:</span>
                      <span className="text-sm font-medium">{formatCurrency(scenario.averageCashFlow)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cash Minimum:</span>
                      <span className="text-sm font-medium">{formatCurrency(scenario.minimumCash)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialAnalysisPage;