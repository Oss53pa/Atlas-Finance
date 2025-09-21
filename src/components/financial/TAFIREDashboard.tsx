import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface TAFIREData {
  id: string;
  fiscalYear: string;
  calculationMethod: 'DIRECT' | 'INDIRECT';
  
  // Flux d'exploitation
  netIncome: number;
  depreciationProvisions: number;
  provisionsReversal: number;
  exceptionalItems: number;
  selfFinancingCapacity: number;
  workingCapitalVariation: number;
  operatingCashSurplus: number;
  
  // Flux d'investissement
  fixedAssetsAcquisitions: number;
  fixedAssetsDisposals: number;
  financialInvestmentsVariation: number;
  investmentSubsidies: number;
  investmentCashFlow: number;
  
  // Flux de financement
  capitalIncrease: number;
  newBorrowings: number;
  loanRepayments: number;
  dividendsPaid: number;
  financingCashFlow: number;
  
  // Trésorerie
  openingCashBalance: number;
  closingCashBalance: number;
  cashVariation: number;
  freeCashFlow: number;
  
  // Métadonnées
  calculationDate: string;
  calculationTimeMs: number;
  isValidated: boolean;
}

interface TAFIREAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
}

const TAFIREDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [viewMode, setViewMode] = useState<'flows' | 'analysis' | 'comparison'>('flows');

  const { data: tafireData, isLoading } = useQuery({
    queryKey: ['tafire-data', selectedPeriod],
    queryFn: async (): Promise<TAFIREData> => {
      // Mock data - remplacer par vraie API
      return {
        id: '1',
        fiscalYear: '2024',
        calculationMethod: 'INDIRECT',
        
        // Flux d'exploitation
        netIncome: 1450000,
        depreciationProvisions: 850000,
        provisionsReversal: 120000,
        exceptionalItems: 50000,
        selfFinancingCapacity: 2230000,
        workingCapitalVariation: 180000,
        operatingCashSurplus: 2050000,
        
        // Flux d'investissement
        fixedAssetsAcquisitions: 950000,
        fixedAssetsDisposals: 180000,
        financialInvestmentsVariation: 50000,
        investmentSubsidies: 100000,
        investmentCashFlow: -720000,
        
        // Flux de financement
        capitalIncrease: 200000,
        newBorrowings: 500000,
        loanRepayments: 680000,
        dividendsPaid: 250000,
        financingCashFlow: -230000,
        
        // Trésorerie
        openingCashBalance: 580000,
        closingCashBalance: 1680000,
        cashVariation: 1100000,
        freeCashFlow: 1330000,
        
        // Métadonnées
        calculationDate: '2024-08-25T10:30:00Z',
        calculationTimeMs: 1250,
        isValidated: true
      };
    }
  });

  const { data: analysisData } = useQuery({
    queryKey: ['tafire-analysis', tafireData?.id],
    queryFn: async (): Promise<TAFIREAnalysis> => {
      if (!tafireData) return null;
      
      // Analyse automatique basée sur les données
      const analysis: TAFIREAnalysis = {
        strengths: [],
        weaknesses: [],
        recommendations: [],
        riskLevel: 'LOW',
        score: 85
      };

      // Analyse CAF
      if (tafireData.selfFinancingCapacity > 0) {
        analysis.strengths.push("CAF positive - Bonne capacité d'autofinancement");
      } else {
        analysis.weaknesses.push("CAF négative - Difficultés de génération de cash");
        analysis.riskLevel = 'HIGH';
      }

      // Analyse Free Cash Flow
      if (tafireData.freeCashFlow > 0) {
        analysis.strengths.push("Free Cash Flow positif - Capacité d'investissement démontrée");
      } else {
        analysis.weaknesses.push("Free Cash Flow négatif - Dépendance au financement externe");
        analysis.recommendations.push("Optimiser le cash flow libre : rentabilité et maîtrise investissements");
      }

      // Analyse variation BFR
      if (Math.abs(tafireData.workingCapitalVariation) > tafireData.selfFinancingCapacity * 0.3) {
        analysis.weaknesses.push("Forte variation du BFR impactant la trésorerie");
        analysis.recommendations.push("Optimiser la gestion du BFR (clients, stocks, fournisseurs)");
      }

      // Analyse équilibre des flux
      if (tafireData.investmentCashFlow > tafireData.selfFinancingCapacity) {
        analysis.recommendations.push("Investissements dépassant la CAF - Évaluer les sources de financement");
      }

      return analysis;
    },
    enabled: !!tafireData
  });

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getFlowColor = (value: number): string => {
    if (value > 0) return '#10b981'; // Green
    if (value < 0) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  const getFlowIcon = (value: number) => {
    if (value > 0) return <ArrowUpIcon className="h-5 w-5 text-green-500" />;
    if (value < 0) return <ArrowDownIcon className="h-5 w-5 text-red-500" />;
    return <div className="h-5 w-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tafireData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Aucune donnée TAFIRE disponible</p>
      </div>
    );
  }

  const waterfallData = [
    { name: 'Trésorerie début', value: tafireData.openingCashBalance, cumulative: tafireData.openingCashBalance },
    { name: 'Flux exploitation', value: tafireData.operatingCashSurplus, cumulative: tafireData.openingCashBalance + tafireData.operatingCashSurplus },
    { name: 'Flux investissement', value: tafireData.investmentCashFlow, cumulative: tafireData.openingCashBalance + tafireData.operatingCashSurplus + tafireData.investmentCashFlow },
    { name: 'Flux financement', value: tafireData.financingCashFlow, cumulative: tafireData.closingCashBalance },
    { name: 'Trésorerie fin', value: 0, cumulative: tafireData.closingCashBalance }
  ];

  const cafBreakdownData = [
    { name: 'Résultat net', value: tafireData.netIncome },
    { name: 'Dotations', value: tafireData.depreciationProvisions },
    { name: 'Reprises', value: -tafireData.provisionsReversal },
    { name: 'Éléments except.', value: tafireData.exceptionalItems }
  ];

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">TAFIRE - Analyse des Flux</h2>
          <p className="text-gray-600">
            Méthode {tafireData.calculationMethod === 'INDIRECT' ? 'Indirecte' : 'Directe'} • 
            Exercice {tafireData.fiscalYear} • 
            {tafireData.isValidated ? 'Validé' : 'Brouillon'}
          </p>
        </div>
        <div className="flex space-x-4">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="flows">Vue Flux</option>
            <option value="analysis">Analyse</option>
            <option value="comparison">Comparaison</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="current">Exercice courant</option>
            <option value="previous">Exercice précédent</option>
            <option value="comparison">Comparaison N/N-1</option>
          </select>
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CAF</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(tafireData.selfFinancingCapacity)}</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            {getFlowIcon(tafireData.selfFinancingCapacity)}
            <span className={`ml-1 ${tafireData.selfFinancingCapacity > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tafireData.selfFinancingCapacity > 0 ? 'Positif' : 'Négatif'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Free Cash Flow</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(tafireData.freeCashFlow)}</p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            {getFlowIcon(tafireData.freeCashFlow)}
            <span className={`ml-1 ${tafireData.freeCashFlow > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {tafireData.freeCashFlow > 0 ? 'Génération' : 'Consommation'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Variation Trésorerie</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(tafireData.cashVariation)}</p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              tafireData.cashVariation > 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {tafireData.cashVariation > 0 ? 
                <ArrowUpIcon className="h-6 w-6 text-green-600" /> :
                <ArrowDownIcon className="h-6 w-6 text-red-600" />
              }
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            De {formatCurrency(tafireData.openingCashBalance)} à {formatCurrency(tafireData.closingCashBalance)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Score Qualité</p>
              <p className="text-xl font-bold text-gray-900">{analysisData?.score || 0}/100</p>
            </div>
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
              (analysisData?.score || 0) >= 80 ? 'bg-green-100' : 
              (analysisData?.score || 0) >= 60 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              {(analysisData?.score || 0) >= 80 ? 
                <ChartBarIcon className="h-6 w-6 text-green-600" /> :
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              }
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Risque: {analysisData?.riskLevel || 'N/A'}
          </div>
        </div>
      </div>

      {/* Contenu selon le mode de vue */}
      {viewMode === 'flows' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Waterfall Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution des Flux de Trésorerie</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill={(entry) => getFlowColor(entry.value)} />
                <Line type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={3} name="Trésorerie cumulative" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Composition CAF */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Composition de la CAF</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={cafBreakdownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill={(entry) => getFlowColor(entry.value)} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Détail des flux */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Flux d'Exploitation</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">Résultat net</span>
                <span className="font-medium">{formatCurrency(tafireData.netIncome)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">+ Dotations amort./prov.</span>
                <span className="font-medium text-green-600">+{formatCurrency(tafireData.depreciationProvisions)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">- Reprises provisions</span>
                <span className="font-medium text-red-600">-{formatCurrency(tafireData.provisionsReversal)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200 font-semibold">
                <span>= CAF</span>
                <span>{formatCurrency(tafireData.selfFinancingCapacity)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">- Variation BFR</span>
                <span className="font-medium text-red-600">-{formatCurrency(tafireData.workingCapitalVariation)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-blue-50 rounded-lg px-3 font-semibold text-blue-800">
                <span>= Flux d'exploitation</span>
                <span>{formatCurrency(tafireData.operatingCashSurplus)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Flux d'Investissement et Financement</h3>
            <div className="space-y-4">
              {/* Investissement */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Investissement</h4>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Acquisitions immobilisations</span>
                    <span className="text-red-600">-{formatCurrency(tafireData.fixedAssetsAcquisitions)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cessions immobilisations</span>
                    <span className="text-green-600">+{formatCurrency(tafireData.fixedAssetsDisposals)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Total Investissement</span>
                    <span className={tafireData.investmentCashFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(tafireData.investmentCashFlow)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financement */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Financement</h4>
                <div className="space-y-2 ml-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Nouveaux emprunts</span>
                    <span className="text-green-600">+{formatCurrency(tafireData.newBorrowings)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Remboursements</span>
                    <span className="text-red-600">-{formatCurrency(tafireData.loanRepayments)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Dividendes versés</span>
                    <span className="text-red-600">-{formatCurrency(tafireData.dividendsPaid)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>Total Financement</span>
                    <span className={tafireData.financingCashFlow > 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(tafireData.financingCashFlow)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'analysis' && analysisData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Points forts */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 text-green-500 mr-2" />
              Points Forts
            </h3>
            <div className="space-y-3">
              {analysisData.strengths.map((strength, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex-shrink-0 h-2 w-2 bg-green-400 rounded-full mt-2"></div>
                  <p className="text-sm text-green-800">{strength}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Points de vigilance */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              Points de Vigilance
            </h3>
            <div className="space-y-3">
              {analysisData.weaknesses.map((weakness, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-shrink-0 h-2 w-2 bg-yellow-400 rounded-full mt-2"></div>
                  <p className="text-sm text-yellow-800">{weakness}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recommandations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
              Recommandations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                  <p className="text-sm text-blue-800">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TAFIREDashboard;