// @ts-nocheck

import React, { useState } from 'react';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
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
  
  // 3. VALEUR AJOUTÃ‰E
  intermediateConsumption: number;
  addedValue: number;
  
  // 4. EXCÃ‰DENT BRUT D'EXPLOITATION
  operatingSubsidies: number;
  staffCosts: number;
  taxesAndDuties: number;
  grossOperatingSurplus: number;
  
  // 5. RÃ‰SULTAT D'EXPLOITATION
  otherOperatingIncome: number;
  depreciationProvisionsDotations: number;
  otherOperatingExpenses: number;
  operatingResult: number;
  
  // 6. RÃ‰SULTAT FINANCIER
  financialIncome: number;
  financialExpenses: number;
  financialResult: number;
  
  // 7. RÃ‰SULTAT COURANT AVANT IMPÃ”TS
  currentResultBeforeTax: number;
  
  // 8. RÃ‰SULTAT EXCEPTIONNEL
  exceptionalIncome: number;
  exceptionalExpenses: number;
  exceptionalResult: number;
  
  // 9. RÃ‰SULTAT NET
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
  const { adapter } = useData();
  const fmt = useMoneyFormat();
  const [selectedView, setSelectedView] = useState<'waterfall' | 'breakdown' | 'evolution'>('waterfall');
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const { data: sigData, isLoading } = useQuery({
    queryKey: ['sig-data', selectedPeriod],
    queryFn: async (): Promise<SIGData> => {
      const entries = await adapter.getAll('journalEntries');
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

      const merchandiseSales = creditN('701');
      const merchandiseCost = net('601', '6031');
      const commercialMargin = merchandiseSales - merchandiseCost;
      const productionSold = creditN('70');
      const productionStored = creditN('73');
      const productionImmobilized = creditN('72');
      const periodProduction = productionSold + productionStored + productionImmobilized;
      const intermediateConsumption = net('60', '61', '62', '63');
      const addedValue = commercialMargin + periodProduction - intermediateConsumption;
      const operatingSubsidies = creditN('74');
      const staffCosts = net('66');
      const taxesAndDuties = net('64');
      const grossOperatingSurplus = addedValue + operatingSubsidies - staffCosts - taxesAndDuties;
      const otherOperatingIncome = creditN('75', '78', '79');
      const depreciationProvisionsDotations = net('68', '69');
      const otherOperatingExpenses = net('65');
      const operatingResult = grossOperatingSurplus + otherOperatingIncome - depreciationProvisionsDotations - otherOperatingExpenses;
      const financialIncome = creditN('77');
      const financialExpenses = net('67');
      const financialResult = financialIncome - financialExpenses;
      const currentResultBeforeTax = operatingResult + financialResult;
      const exceptionalIncome = creditN('84', '86', '88');
      const exceptionalExpenses = net('83', '85', '87');
      const exceptionalResult = exceptionalIncome - exceptionalExpenses;
      const incomeTax = net('89');
      const finalNetResult = currentResultBeforeTax + exceptionalResult - incomeTax;
      const revenueBase = merchandiseSales + productionSold;
      const safe = (a: number, b: number) => b === 0 ? 0 : (a / b) * 100;

      return {
        id: '1',
        fiscalYear: new Date().getFullYear().toString(),
        calculationDate: new Date().toISOString(),
        merchandiseSales, merchandiseCost, commercialMargin,
        productionSold, productionStored, productionImmobilized, periodProduction,
        intermediateConsumption, addedValue,
        operatingSubsidies, staffCosts, taxesAndDuties, grossOperatingSurplus,
        otherOperatingIncome, depreciationProvisionsDotations, otherOperatingExpenses, operatingResult,
        financialIncome, financialExpenses, financialResult,
        currentResultBeforeTax,
        exceptionalIncome, exceptionalExpenses, exceptionalResult,
        incomeTax, finalNetResult,
        addedValueRate: safe(addedValue, revenueBase),
        operatingMarginRate: safe(operatingResult, revenueBase),
        netMarginRate: safe(finalNetResult, revenueBase),
        revenueBase,
      };
    }
  });


  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!sigData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-700">Aucune donnÃ©e SIG disponible</p>
      </div>
    );
  }

  // DonnÃ©es pour le graphique cascade (waterfall)
  const waterfallData = [
    { name: 'Marge Comm.', value: sigData.commercialMargin, cumulative: sigData.commercialMargin },
    { name: 'Production', value: sigData.periodProduction, cumulative: sigData.commercialMargin + sigData.periodProduction },
    { name: 'Consom. Inter.', value: -sigData.intermediateConsumption, cumulative: sigData.addedValue },
    { name: 'Personnel', value: -sigData.staffCosts, cumulative: sigData.addedValue - sigData.staffCosts },
    { name: 'ImpÃ´ts/Taxes', value: -sigData.taxesAndDuties, cumulative: sigData.addedValue - sigData.staffCosts - sigData.taxesAndDuties },
    { name: 'Dotations', value: -sigData.depreciationProvisionsDotations, cumulative: sigData.operatingResult },
    { name: 'Financier', value: sigData.financialResult, cumulative: sigData.currentResultBeforeTax },
    { name: 'Exceptionnel', value: sigData.exceptionalResult, cumulative: sigData.currentResultBeforeTax + sigData.exceptionalResult },
    { name: 'ImpÃ´t', value: -sigData.incomeTax, cumulative: sigData.finalNetResult }
  ];

  // DonnÃ©es pour la rÃ©partition de la VA
  const valueAddedBreakdown = [
    { name: 'Personnel', value: sigData.staffCosts, color: '#ef4444' },
    { name: 'ImpÃ´ts/Taxes', value: sigData.taxesAndDuties, color: '#525252' },
    { name: 'Dotations', value: sigData.depreciationProvisionsDotations, color: '#737373' },
    { name: 'RÃ©sultat', value: sigData.finalNetResult, color: '#171717' }
  ];

  // DonnÃ©es pour l'Ã©volution des marges
  const marginData = [
    { name: 'Taux VA', value: sigData.addedValueRate, color: '#737373' },
    { name: 'Marge Exploit.', value: sigData.operatingMarginRate, color: '#171717' },
    { name: 'Marge Nette', value: sigData.netMarginRate, color: '#525252' }
  ];

  return (
    <div className="space-y-6">
      {/* Header avec contrÃ´les */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-900">SIG - Soldes IntermÃ©diaires de Gestion</h2>
          <p className="text-gray-600">Exercice {sigData.fiscalYear} â€¢ CalculÃ© le {new Date(sigData.calculationDate).toLocaleDateString('fr-FR')}</p>
        </div>
        <div className="flex space-x-4">
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as typeof selectedView)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
          >
            <option value="waterfall">Cascade SIG</option>
            <option value="breakdown">DÃ©composition</option>
            <option value="evolution">Ã‰volution</option>
          </select>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
          >
            <option value="current">Exercice courant</option>
            <option value="previous">Exercice prÃ©cÃ©dent</option>
            <option value="comparison">Comparaison N/N-1</option>
          </select>
        </div>
      </div>

      {/* KPIs des 9 soldes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Valeur AjoutÃ©e</p>
              <p className="text-lg font-bold text-gray-900">{fmt(sigData.addedValue)}</p>
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
              <p className="text-lg font-bold text-gray-900">{fmt(sigData.grossOperatingSurplus)}</p>
              <p className="text-sm text-green-600">CapacitÃ© d'autofinancement</p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">RÃ©sultat Net</p>
              <p className="text-lg font-bold text-gray-900">{fmt(sigData.finalNetResult)}</p>
              <p className="text-sm text-primary-600">{formatPercentage(sigData.netMarginRate)} marge nette</p>
            </div>
            <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Contenu selon la vue sÃ©lectionnÃ©e */}
      {selectedView === 'waterfall' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique cascade des SIG */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cascade des Soldes IntermÃ©diaires</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value: number) => fmt(value)} />
                <Bar dataKey="value" fill={(entry, index) => entry > 0 ? '#171717' : '#ef4444'} />
                <Line type="monotone" dataKey="cumulative" stroke="#737373" strokeWidth={3} name="Cumul" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* DÃ©tail des 9 soldes */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">DÃ©tail des 9 Soldes SYSCOHADA</h3>
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">1. Marge Commerciale</span>
                  <span className="font-bold">{fmt(sigData.commercialMargin)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Ventes: {fmt(sigData.merchandiseSales)} - CoÃ»t: {fmt(sigData.merchandiseCost)}
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">2. Production de l'exercice</span>
                  <span className="font-bold">{fmt(sigData.periodProduction)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Vendue: {fmt(sigData.productionSold)} + StockÃ©e: {fmt(sigData.productionStored)}
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">3. Valeur AjoutÃ©e</span>
                  <span className="font-bold text-blue-600">{fmt(sigData.addedValue)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatPercentage(sigData.addedValueRate)} du chiffre d'affaires
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">4. ExcÃ©dent Brut d'Exploitation</span>
                  <span className="font-bold text-green-600">{fmt(sigData.grossOperatingSurplus)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  VA - Personnel ({fmt(sigData.staffCosts)}) - ImpÃ´ts ({fmt(sigData.taxesAndDuties)})
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">5. RÃ©sultat d'Exploitation</span>
                  <span className="font-bold">{fmt(sigData.operatingResult)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {formatPercentage(sigData.operatingMarginRate)} marge d'exploitation
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">6. RÃ©sultat Financier</span>
                  <span className={`font-bold ${sigData.financialResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(sigData.financialResult)}
                  </span>
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">7. RCAI</span>
                  <span className="font-bold">{fmt(sigData.currentResultBeforeTax)}</span>
                </div>
              </div>

              <div className="border-b border-gray-100 pb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">8. RÃ©sultat Exceptionnel</span>
                  <span className={`font-bold ${sigData.exceptionalResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(sigData.exceptionalResult)}
                  </span>
                </div>
              </div>

              <div className="bg-primary-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-primary-900">9. RÃ©sultat Net Final</span>
                  <span className="font-bold text-lg text-primary-700">{fmt(sigData.finalNetResult)}</span>
                </div>
                <div className="text-xs text-primary-600 mt-1">
                  Marge nette: {formatPercentage(sigData.netMarginRate)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedView === 'breakdown' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RÃ©partition de la Valeur AjoutÃ©e */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">RÃ©partition de la Valeur AjoutÃ©e</h3>
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
                    fill="#737373"
                    dataKey="value"
                  >
                    {valueAddedBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
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
                      <p className="text-sm font-bold text-gray-900">{fmt(item.value)}</p>
                      <p className="text-xs text-gray-700">
                        {formatPercentage((item.value / sigData.addedValue) * 100)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ã‰volution des marges */}
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

      {/* Tableau rÃ©capitulatif */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tableau de SynthÃ¨se SIG</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('accounting.balance')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">% CA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Ã‰volution</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Marge Commerciale</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{fmt(sigData.commercialMargin)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage((sigData.commercialMargin / sigData.revenueBase) * 100)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +5.2%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Valeur AjoutÃ©e</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{fmt(sigData.addedValue)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage(sigData.addedValueRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +2.1%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">EBE</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{fmt(sigData.grossOperatingSurplus)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage((sigData.grossOperatingSurplus / sigData.revenueBase) * 100)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <ArrowDownIcon className="w-3 h-3 mr-1" /> -1.8%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">RÃ©sultat d'Exploitation</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{fmt(sigData.operatingResult)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-700">{formatPercentage(sigData.operatingMarginRate)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <ArrowUpIcon className="w-3 h-3 mr-1" /> +3.5%
                  </span>
                </td>
              </tr>
              <tr className="bg-primary-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary-900">RÃ©sultat Net</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-primary-900">{fmt(sigData.finalNetResult)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-primary-900">{formatPercentage(sigData.netMarginRate)}</td>
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