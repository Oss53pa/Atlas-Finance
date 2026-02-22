import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { db } from '../../lib/db';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  ArrowTrendingDownIcon,
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

  // Load journal entries from Dexie
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['financial-analysis-entries', selectedPeriod],
    queryFn: () => db.journalEntries.filter(e => e.status === 'validated' || e.status === 'posted').toArray(),
  });

  const isLoading = entriesLoading;

  // Compute all financial data from real journal entries
  const financialData: FinancialData | undefined = useMemo(() => {
    if (entries.length === 0) return undefined;

    // Helper: sum debit - credit for account prefixes
    const net = (prefixes: string[]) => {
      let debit = 0, credit = 0;
      for (const e of entries) {
        for (const l of e.lines) {
          if (prefixes.some(p => l.accountCode.startsWith(p))) {
            debit += l.debit;
            credit += l.credit;
          }
        }
      }
      return debit - credit;
    };
    const creditNet = (prefixes: string[]) => -net(prefixes);

    // SIG computation (SYSCOHADA classes 6/7)
    const chiffreAffaires = creditNet(['70', '71', '72']);
    const achatsConsommes = net(['60', '61']);
    const servicesExterieurs = net(['62', '63']);
    const personnel = net(['64', '66']);
    const amortissements = net(['68']);
    const chargesFinancieres = net(['67']);
    const produitsFinanciers = creditNet(['76', '77']);
    const chargesExceptionnelles = net(['83', '85', '87']);
    const produitsExceptionnels = creditNet(['84', '86', '88']);
    const impots = net(['89']);
    const productionStockee = creditNet(['73']);

    const commercialMargin = chiffreAffaires - achatsConsommes;
    const production = chiffreAffaires + productionStockee;
    const addedValue = commercialMargin + productionStockee - servicesExterieurs;
    const grossOperatingSurplus = addedValue - personnel;
    const operatingResult = grossOperatingSurplus - amortissements;
    const financialResult = produitsFinanciers - chargesFinancieres;
    const currentResultBeforeTax = operatingResult + financialResult;
    const exceptionalResult = produitsExceptionnels - chargesExceptionnelles;
    const netResult = currentResultBeforeTax + exceptionalResult - impots;
    const selfFinancingCapacity = netResult + amortissements;

    const addedValueRate = chiffreAffaires !== 0 ? (addedValue / chiffreAffaires) * 100 : 0;
    const operatingMarginRate = chiffreAffaires !== 0 ? (operatingResult / chiffreAffaires) * 100 : 0;
    const netMarginRate = chiffreAffaires !== 0 ? (netResult / chiffreAffaires) * 100 : 0;

    // Balance sheet items for functional balance
    const immobilisations = net(['2']);
    const stocks = net(['3']);
    const creancesClients = net(['41']);
    const disponibilites = net(['5']);
    const capitauxPropres = creditNet(['10', '11', '12', '13']);
    const dettesFinancieres = creditNet(['16', '17']);
    const dettesFournisseurs = creditNet(['40']);

    const stableResources = capitauxPropres + dettesFinancieres;
    const stableUses = immobilisations;
    const workingCapitalFund = stableResources - stableUses;
    const operatingWorkingCapitalNeed = stocks + creancesClients - dettesFournisseurs;
    const netTreasury = workingCapitalFund - operatingWorkingCapitalNeed;
    const coverageRatio = stableUses !== 0 ? (stableResources / Math.abs(stableUses)) * 100 : 0;
    const bfrRotationDays = chiffreAffaires !== 0 ? (operatingWorkingCapitalNeed / chiffreAffaires) * 365 : 0;
    const treasuryAutonomyDays = chiffreAffaires !== 0 ? (disponibilites / (chiffreAffaires / 365)) : 0;

    // TAFIRE
    const operatingCashFlow = selfFinancingCapacity;
    const investmentCashFlow = -Math.abs(net(['21', '22', '23', '24', '25']));
    const financingCashFlow = creditNet(['16']) - net(['16']);
    const netCashFlow = operatingCashFlow + investmentCashFlow + financingCashFlow;

    const totalActif = immobilisations + stocks + creancesClients + disponibilites;

    // Ratios
    const liquiditeGenerale = (dettesFournisseurs !== 0) ? (stocks + creancesClients + disponibilites) / dettesFournisseurs : 0;
    const autonomieFinanciere = totalActif !== 0 ? (capitauxPropres / totalActif) * 100 : 0;
    const roe = capitauxPropres !== 0 ? (netResult / capitauxPropres) * 100 : 0;
    const dso = chiffreAffaires !== 0 ? (creancesClients / chiffreAffaires) * 365 : 0;
    const debtToEbitda = grossOperatingSurplus !== 0 ? dettesFinancieres / grossOperatingSurplus : 0;

    // Monthly forecasts from entries grouped by month
    const monthlyMap = new Map<string, { inflows: number; outflows: number }>();
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    for (const e of entries) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
      if (!monthlyMap.has(key)) monthlyMap.set(key, { inflows: 0, outflows: 0 });
      const m = monthlyMap.get(key)!;
      for (const l of e.lines) {
        if (l.accountCode.startsWith('5')) {
          m.inflows += l.debit;
          m.outflows += l.credit;
        }
      }
    }
    const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    let cumulative = disponibilites;
    const monthlyForecasts: MonthlyForecast[] = sortedMonths.map(([key, val]) => {
      const monthIdx = parseInt(key.split('-')[1]);
      const flow = val.inflows - val.outflows;
      cumulative += flow;
      return {
        month: monthNames[monthIdx] || key,
        inflows: val.inflows,
        outflows: val.outflows,
        netFlow: flow,
        cumulativeCash: cumulative,
      };
    });

    const avgMonthlyOutflow = monthlyForecasts.length > 0
      ? monthlyForecasts.reduce((sum, m) => sum + m.outflows, 0) / monthlyForecasts.length
      : 0;
    const avgNetFlow = monthlyForecasts.length > 0
      ? monthlyForecasts.reduce((sum, m) => sum + m.netFlow, 0) / monthlyForecasts.length
      : 0;
    const runway = avgMonthlyOutflow !== 0 ? disponibilites / avgMonthlyOutflow : 0;

    return {
      tafire: {
        operatingCashFlow,
        investmentCashFlow,
        financingCashFlow,
        netCashFlow,
        selfFinancingCapacity,
        freeCashFlow: operatingCashFlow + investmentCashFlow,
        openingCash: disponibilites - netCashFlow,
        closingCash: disponibilites,
      },
      sig: {
        commercialMargin,
        production,
        addedValue,
        grossOperatingSurplus,
        operatingResult,
        financialResult,
        currentResultBeforeTax,
        exceptionalResult,
        netResult,
        addedValueRate,
        operatingMarginRate,
        netMarginRate,
      },
      functionalBalance: {
        workingCapitalFund,
        totalWorkingCapitalNeed: operatingWorkingCapitalNeed,
        netTreasury,
        operatingWorkingCapitalNeed,
        stableUses,
        stableResources,
        coverageRatio,
        bfrRotationDays: Math.abs(bfrRotationDays),
        treasuryAutonomyDays: Math.abs(treasuryAutonomyDays),
      },
      ratios: [
        { category: 'LIQUIDITE', name: 'Liquidité générale', value: liquiditeGenerale, unit: 'ratio', reference: 1.2, variation: 0, interpretation: liquiditeGenerale >= 1.2 ? 'Bonne liquidité' : 'Liquidité faible', alert: liquiditeGenerale < 1, alertLevel: liquiditeGenerale < 1 ? 'high' : '' },
        { category: 'STRUCTURE', name: 'Autonomie financière', value: autonomieFinanciere, unit: '%', reference: 33, variation: 0, interpretation: autonomieFinanciere >= 33 ? 'Bonne autonomie' : 'Autonomie faible', alert: autonomieFinanciere < 20, alertLevel: autonomieFinanciere < 20 ? 'high' : '' },
        { category: 'RENTABILITE', name: 'ROE', value: roe, unit: '%', reference: 10, variation: 0, interpretation: roe >= 10 ? 'Excellente rentabilité' : 'Rentabilité faible', alert: roe < 5, alertLevel: roe < 5 ? 'medium' : '' },
        { category: 'ACTIVITE', name: 'Délai clients', value: Math.abs(dso), unit: 'jours', reference: 45, variation: 0, interpretation: Math.abs(dso) <= 45 ? 'Bon recouvrement' : 'Recouvrement lent', alert: Math.abs(dso) > 60, alertLevel: Math.abs(dso) > 60 ? 'medium' : '' },
        { category: 'SOLVABILITE', name: 'Dette/EBITDA', value: Math.abs(debtToEbitda), unit: 'fois', reference: 4, variation: 0, interpretation: Math.abs(debtToEbitda) <= 4 ? 'Faible endettement' : 'Endettement élevé', alert: Math.abs(debtToEbitda) > 5, alertLevel: Math.abs(debtToEbitda) > 5 ? 'high' : '' },
      ],
      cashFlowForecast: {
        monthlyForecasts,
        scenarios: [
          { name: 'Optimiste', type: 'OPTIMISTIC', averageCashFlow: avgNetFlow * 1.3, minimumCash: disponibilites * 0.8, confidenceLevel: 75 },
          { name: 'Réaliste', type: 'REALISTIC', averageCashFlow: avgNetFlow, minimumCash: disponibilites * 0.5, confidenceLevel: 85 },
          { name: 'Pessimiste', type: 'PESSIMISTIC', averageCashFlow: avgNetFlow * 0.5, minimumCash: disponibilites * 0.2, confidenceLevel: 90 },
        ],
        burnRate: avgMonthlyOutflow,
        runway: Math.abs(runway),
      },
    };
  }, [entries]);

  const getStatusIcon = (value: number, reference: number) => {
    if (value >= reference * 1.1) return <ChartBarIcon className="h-5 w-5 text-green-500" />;
    if (value <= reference * 0.9) return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />;
    return <ArrowRightIcon className="h-5 w-5 text-yellow-500" />;
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
            <h1 className="text-lg font-bold text-gray-900">Analyse Financière Avancée</h1>
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
              onClick={() => setSelectedView(id as typeof selectedView)}
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
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(financialData?.sig.netResult || 0)}</p>
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
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(financialData?.tafire.freeCashFlow || 0)}</p>
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
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(financialData?.functionalBalance.workingCapitalFund || 0)}</p>
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
                  <p className="text-lg font-bold text-gray-900">{formatNumber(financialData?.ratios.find(r => r.name === 'ROE')?.value || 0)}%</p>
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
                  <Bar dataKey="value" fill="#171717" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Équilibre financier */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Équilibre Financier</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { name: 'FRNG', value: financialData?.functionalBalance.workingCapitalFund || 0, fill: '#171717' },
                  { name: 'BFR', value: financialData?.functionalBalance.totalWorkingCapitalNeed || 0, fill: '#525252' },
                  { name: 'Trésorerie', value: financialData?.functionalBalance.netTreasury || 0, fill: '#737373' }
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
                  <Radar name="Performance" dataKey="value" stroke="#171717" fill="#171717" fillOpacity={0.6} />
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">TAFIRE - Tableau Financier des Ressources et Emplois</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Flux d'Exploitation</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(financialData?.tafire.operatingCashFlow || 0)}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600 font-medium">Flux d'Investissement</p>
                <p className="text-lg font-bold text-red-700">{formatCurrency(financialData?.tafire.investmentCashFlow || 0)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Flux de Financement</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(financialData?.tafire.financingCashFlow || 0)}</p>
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
                  <Bar dataKey="value" fill="#171717" />
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
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cash Flow Prévisionnel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">Burn Rate Mensuel</p>
                <p className="text-lg font-bold text-blue-700">{formatCurrency(financialData.cashFlowForecast.burnRate)}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600 font-medium">Runway</p>
                <p className="text-lg font-bold text-green-700">{formatNumber(financialData.cashFlowForecast.runway)} mois</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Scénarios</p>
                <p className="text-lg font-bold text-purple-700">{financialData.cashFlowForecast.scenarios.length}</p>
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
                <Bar dataKey="inflows" fill="#171717" name="Encaissements" />
                <Bar dataKey="outflows" fill="#ef4444" name="Décaissements" />
                <Line type="monotone" dataKey="cumulativeCash" stroke="#737373" strokeWidth={3} name="Trésorerie cumulative" />
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