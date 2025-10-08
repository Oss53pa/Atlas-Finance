import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  CurrencyDollarIcon
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface SIGData {
  id: string;
  fiscalYear: string;
  calculationDate: string;
  
  // 1. MARGE COMMERCIALE
  merchandiseSales: number;
  merchandiseCost: number;
  commercialMargin: number;
  
  // 2. PRODUCTION DE L'EXERCICE
  productionSold: number;
  productionStored: number;
  productionImmobilized: number;
  periodProduction: number;
  
  // 3. VALEUR AJOUTÉE
  intermediateConsumption: number;
  addedValue: number;
  
  // 4. EXCÉDENT BRUT D'EXPLOITATION
  operatingSubsidies: number;
  staffCosts: number;
  taxesAndDuties: number;
  grossOperatingSurplus: number;
  
  // 5. RÉSULTAT D'EXPLOITATION
  otherOperatingIncome: number;
  depreciationProvisionsDotations: number;
  otherOperatingExpenses: number;
  operatingResult: number;
  
  // 6. RÉSULTAT FINANCIER
  financialIncome: number;
  financialExpenses: number;
  financialResult: number;
  
  // 7. RÉSULTAT COURANT AVANT IMPÔTS
  currentResultBeforeTax: number;
  
  // 8. RÉSULTAT EXCEPTIONNEL
  exceptionalIncome: number;
  exceptionalExpenses: number;
  exceptionalResult: number;
  
  // 9. RÉSULTAT NET
  incomeTax: number;
  finalNetResult: number;
  
  // Taux et ratios
  addedValueRate: number;
  operatingMarginRate: number;
  netMarginRate: number;
  
  // Base de calcul
  revenueBase: number;
}

const SIGDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [selectedView, setSelectedView] = useState<'waterfall' | 'breakdown' | 'evolution'>('waterfall');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const { data: sigData, isLoading } = useQuery({
    queryKey: ['sig-data', selectedPeriod],
    queryFn: async (): Promise<SIGData> => {
      // Mock data - remplacer par vraie API
      return {
        id: '1',
        fiscalYear: '2024',
        calculationDate: '2024-08-25T10:30:00Z',
        
        // 1. Marge commerciale
        merchandiseSales: 3200000,
        merchandiseCost: 2100000,
        commercialMargin: 1100000,
        
        // 2. Production
        productionSold: 8500000,
        productionStored: 150000,
        productionImmobilized: 80000,
        periodProduction: 8730000,
        
        // 3. Valeur ajoutée
        intermediateConsumption: 4030000,
        addedValue: 5800000,
        
        // 4. EBE
        operatingSubsidies: 120000,
        staffCosts: 2100000,
        taxesAndDuties: 970000,
        grossOperatingSurplus: 2850000,
        
        // 5. Résultat d'exploitation
        otherOperatingIncome: 180000,
        depreciationProvisionsDotations: 750000,
        otherOperatingExpenses: 180000,
        operatingResult: 2100000,
        
        // 6. Résultat financier
        financialIncome: 45000,
        financialExpenses: 225000,
        financialResult: -180000,
        
        // 7. RCAI
        currentResultBeforeTax: 1920000,
        
        // 8. Résultat exceptionnel
        exceptionalIncome: 80000,
        exceptionalExpenses: 30000,
        exceptionalResult: 50000,
        
        // 9. Résultat net
        incomeTax: 520000,
        finalNetResult: 1450000,
        
        // Taux
        addedValueRate: 48.3,
        operatingMarginRate: 17.5,
        netMarginRate: 12.1,
        
        revenueBase: 12000000
      };
    }
  });

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!sigData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-700">Aucune donnée SIG disponible</p>
      </div>
    );
  }

  // Données pour le graphique cascade (waterfall)
  const waterfallData = [
    { name: 'Marge Comm.', value: sigData.commercialMargin, cumulative: sigData.commercialMargin },
    { name: 'Production', value: sigData.periodProduction, cumulative: sigData.commercialMargin + sigData.periodProduction },
    { name: 'Consom. Inter.', value: -sigData.intermediateConsumption, cumulative: sigData.addedValue },
    { name: 'Personnel', value: -sigData.staffCosts, cumulative: sigData.addedValue - sigData.staffCosts },
    { name: 'Impôts/Taxes', value: -sigData.taxesAndDuties, cumulative: sigData.addedValue - sigData.staffCosts - sigData.taxesAndDuties },
    { name: 'Dotations', value: -sigData.depreciationProvisionsDotations, cumulative: sigData.operatingResult },
    { name: 'Financier', value: sigData.financialResult, cumulative: sigData.currentResultBeforeTax },
    { name: 'Exceptionnel', value: sigData.exceptionalResult, cumulative: sigData.currentResultBeforeTax + sigData.exceptionalResult },
    { name: 'Impôt', value: -sigData.incomeTax, cumulative: sigData.finalNetResult }
  ];

  // Données pour la répartition de la VA
  const valueAddedBreakdown = [
    { name: 'Personnel', value: sigData.staffCosts, color: '#B85450' },
    { name: 'Impôts/Taxes', value: sigData.taxesAndDuties, color: '#B87333' },
    { name: 'Dotations', value: sigData.depreciationProvisionsDotations, color: '#7A99AC' },
    { name: 'Résultat', value: sigData.finalNetResult, color: '#6A8A82' }
  ];

  // Données pour l'évolution des marges
  const marginData = [
    { name: 'Taux VA', value: sigData.addedValueRate, color: '#7A99AC' },
    { name: 'Marge Exploit.', value: sigData.operatingMarginRate, color: '#6A8A82' },
    { name: 'Marge Nette', value: sigData.netMarginRate, color: '#B87333' }
  ];

  return (
    <div className="space-y-6">
      {/* Header avec contrôles */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SIG - Soldes Intermédiaires de Gestion</h2>
          <p className="text-gray-600">Exercice {sigData.fiscalYear} • Calculé le {new Date(sigData.calculationDate).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="waterfall">Cascade SIG</option>
            <option value="breakdown">Décomposition</option>
            <option value="evolution">Évolution</option>
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

      {/* KPIs des 9 soldes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valeur Ajoutée</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(sigData.addedValue)}</p>
              <p className="text-sm text-blue-600">{formatPercentage(sigData.addedValueRate)} du CA</p>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">EBE</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(sigData.grossOperatingSurplus)}</p>
              <p className="text-sm text-green-600">Capacité d'autofinancement</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Résultat Net</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(sigData.finalNetResult)}</p>
              <p className="text-sm text-purple-600">{formatPercentage(sigData.netMarginRate)} marge nette</p>
            </div>
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu selon la vue sélectionnée */}
      {selectedView === 'waterfall' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique cascade des SIG */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cascade des Soldes Intermédiaires</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill={(entry, index) => entry > 0 ? '#6A8A82' : '#B85450'} />
                <Line type="monotone" dataKey="cumulative" stroke="#7A99AC" strokeWidth={3} name="Cumul" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Détail des 9 soldes */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Détail des 9 Soldes SYSCOHADA</h3>
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">1. Marge Commerciale</span>
                  <span className="font-bold">{formatCurrency(sigData.commercialMargin)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Ventes: {formatCurrency(sigData.merchandiseSales)} - Coût: {formatCurrency(sigData.merchandiseCost)}
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">2. Production de l'exercice</span>
                  <span className="font-bold">{formatCurrency(sigData.periodProduction)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Vendue: {formatCurrency(sigData.productionSold)} + Stockée: {formatCurrency(sigData.productionStored)}
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">3. Valeur Ajoutée</span>
                  <span className="font-bold text-blue-600">{formatCurrency(sigData.addedValue)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatPercentage(sigData.addedValueRate)} du chiffre d'affaires
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">4. Excédent Brut d'Exploitation</span>
                  <span className="font-bold text-green-600">{formatCurrency(sigData.grossOperatingSurplus)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  VA - Personnel ({formatCurrency(sigData.staffCosts)}) - Impôts ({formatCurrency(sigData.taxesAndDuties)})
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">5. Résultat d'Exploitation</span>
                  <span className="font-bold">{formatCurrency(sigData.operatingResult)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatPercentage(sigData.operatingMarginRate)} marge d'exploitation
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">6. Résultat Financier</span>
                  <span className={`font-bold ${sigData.financialResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(sigData.financialResult)}
                  </span>
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">7. RCAI</span>
                  <span className="font-bold">{formatCurrency(sigData.currentResultBeforeTax)}</span>
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">8. Résultat Exceptionnel</span>
                  <span className={`font-bold ${sigData.exceptionalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(sigData.exceptionalResult)}
                  </span>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-purple-900">9. Résultat Net Final</span>
                  <span className="font-bold text-lg text-purple-700">{formatCurrency(sigData.finalNetResult)}</span>
                </div>
                <div className="text-xs text-purple-600 mt-1">
                  Marge nette: {formatPercentage(sigData.netMarginRate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Répartition de la Valeur Ajoutée */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition de la Valeur Ajoutée</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={valueAddedBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {valueAddedBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="space-y-3">
                {valueAddedBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-gray-700">
                        {formatPercentage((item.value / sigData.addedValue) * 100)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Évolution des marges */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Taux de Marge et Performance</h3>
            <div className="space-y-6">
              {marginData.map((margin, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{margin.name}</span>
                    <span className="text-lg font-bold" style={{ color: margin.color }}>
                      {formatPercentage(margin.value)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ 
                        backgroundColor: margin.color,
                        width: `${Math.min(margin.value, 100)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-700">
                    <span>0%</span>
                    <span>50%</span>
                  </div>
                </div>
              ))}

              {/* Benchmarks */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Benchmarks Sectoriels</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Taux VA moyen:</span>
                    <span className="text-blue-900 font-medium">45-55%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Marge exploit. cible:</span>
                    <span className="text-blue-900 font-medium">12-20%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Marge nette cible:</span>
                    <span className="text-blue-900 font-medium">8-15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau récapitulatif */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tableau de Synthèse SIG</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.balance')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">% CA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Évolution</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Marge Commerciale</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(sigData.commercialMargin)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage((sigData.commercialMargin / sigData.revenueBase) * 100)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +5.2%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Valeur Ajoutée</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(sigData.addedValue)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage(sigData.addedValueRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +2.1%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">EBE</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(sigData.grossOperatingSurplus)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage((sigData.grossOperatingSurplus / sigData.revenueBase) * 100)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <ArrowDownIcon className="w-3 h-3 mr-1" /> -1.8%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Résultat d'Exploitation</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatCurrency(sigData.operatingResult)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage(sigData.operatingMarginRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +3.5%
                  </span>
                </td>
              </tr>
              <tr className="bg-purple-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-900">Résultat Net</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-900">{formatCurrency(sigData.finalNetResult)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-900">{formatPercentage(sigData.netMarginRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +8.7%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SIGDashboard;