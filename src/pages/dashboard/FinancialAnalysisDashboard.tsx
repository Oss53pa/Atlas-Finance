import React, { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  LineChart, Calculator, Percent, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download, FileText, AlertTriangle, CheckCircle,
  Info, Clock, CreditCard, Wallet, PiggyBank, Landmark
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const FinancialAnalysisDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('ytd');
  const [comparisonMode, setComparisonMode] = useState('previous');

  // Financial Metrics
  const financialMetrics = {
    revenue: {
      current: 8750000,
      previous: 7250000,
      budget: 8500000,
      variance: 20.7,
      budgetVariance: 2.9
    },
    expenses: {
      current: 6125000,
      previous: 5450000,
      budget: 6000000,
      variance: 12.4,
      budgetVariance: 2.1
    },
    profit: {
      gross: 2625000,
      net: 1575000,
      ebitda: 2100000,
      grossMargin: 30,
      netMargin: 18,
      ebitdaMargin: 24
    },
    cashflow: {
      operating: 1890000,
      investing: -750000,
      financing: -350000,
      net: 790000,
      freeFlow: 1140000
    },
    ratios: {
      currentRatio: 2.4,
      quickRatio: 1.8,
      debtToEquity: 0.35,
      roe: 22.5,
      roa: 15.2,
      workingCapital: 3250000
    }
  };

  // Detailed P&L Data
  const plData = [
    { category: 'Ventes Produits', actual: 6500000, budget: 6200000, previous: 5800000 },
    { category: 'Services', actual: 2250000, budget: 2300000, previous: 1450000 },
    { category: 'Coût des Ventes', actual: -3875000, budget: -3800000, previous: -3250000 },
    { category: 'Charges Personnel', actual: -1750000, budget: -1700000, previous: -1600000 },
    { category: 'Charges Externes', actual: -500000, budget: -500000, previous: -450000 },
    { category: 'Amortissements', actual: -525000, budget: -500000, previous: -500000 },
    { category: 'Charges Financières', actual: -125000, budget: -100000, previous: -100000 },
    { category: 'Impôts', actual: -400000, budget: -400000, previous: -350000 }
  ];

  // Cash Flow Waterfall Data
  const cashFlowData = {
    labels: ['Solde Initial', 'Ventes', 'Achats', 'Salaires', 'Charges', 'Investissements', 'Financement', 'Solde Final'],
    datasets: [{
      label: 'Flux de Trésorerie',
      data: [2500000, 8750000, -3875000, -1750000, -625000, -750000, -350000, 3900000],
      backgroundColor: (context: any) => {
        const value = context.raw;
        return value >= 0 ? 'rgba(var(--color-success-rgb), 0.8)' : 'rgba(var(--color-danger-rgb), 0.8)';
      }
    }]
  };

  // Revenue Mix
  const revenueMixData = {
    labels: ['Produits A', 'Produits B', 'Services Premium', 'Services Standard', 'Licences', 'Autres'],
    datasets: [{
      data: [35, 25, 18, 12, 7, 3],
      backgroundColor: [
        'var(--color-primary)',
        'var(--color-success)',
        'var(--color-warning)',
        'var(--color-info)',
        'var(--color-secondary)',
        'var(--color-text-secondary)'
      ]
    }]
  };

  // Expense Breakdown
  const expenseBreakdownData = {
    labels: ['Personnel', 'Matières Premières', 'Services', 'Loyers', 'Marketing', 'IT', 'Autres'],
    datasets: [{
      data: [40, 25, 12, 8, 7, 5, 3],
      backgroundColor: [
        'var(--color-danger)',
        'var(--color-warning)',
        'var(--color-info)',
        'var(--color-secondary)',
        'var(--color-primary)',
        'var(--color-success)',
        'var(--color-text-secondary)'
      ]
    }]
  };

  // Monthly Trend
  const monthlyTrendData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Revenus',
        data: [650000, 680000, 720000, 700000, 750000, 780000, 820000, 850000, 880000, 920000, 950000, 980000],
        borderColor: 'var(--color-success)',
        backgroundColor: 'rgba(var(--color-success-rgb), 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Dépenses',
        data: [480000, 490000, 510000, 500000, 520000, 530000, 550000, 560000, 570000, 580000, 590000, 600000],
        borderColor: 'var(--color-danger)',
        backgroundColor: 'rgba(var(--color-danger-rgb), 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Profit Net',
        data: [170000, 190000, 210000, 200000, 230000, 250000, 270000, 290000, 310000, 340000, 360000, 380000],
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Working Capital Trend
  const workingCapitalData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [
      {
        label: 'Créances Clients',
        data: [1200000, 1350000, 1450000, 1550000],
        backgroundColor: 'var(--color-success)'
      },
      {
        label: 'Stocks',
        data: [800000, 850000, 900000, 950000],
        backgroundColor: 'var(--color-warning)'
      },
      {
        label: 'Dettes Fournisseurs',
        data: [-600000, -650000, -700000, -750000],
        backgroundColor: 'var(--color-danger)'
      }
    ]
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-[var(--color-success)]';
    if (variance < -5) return 'text-[var(--color-error)]';
    return 'text-[var(--color-warning)]';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Analyse Financière Approfondie
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              Performance financière détaillée et analyse des écarts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="mtd">Ce mois</option>
              <option value="qtd">Ce trimestre</option>
              <option value="ytd">Cette année</option>
              <option value="custom">Personnalisé</option>
            </select>
            <select
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="previous">vs Période précédente</option>
              <option value="budget">vs Budget</option>
              <option value="both">Les deux</option>
            </select>
            <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Key Financial Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Chiffre d'Affaires</span>
              <DollarSign className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(financialMetrics.revenue.current)}
            </div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${getVarianceColor(financialMetrics.revenue.variance)}`}>
              {financialMetrics.revenue.variance > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(financialMetrics.revenue.variance)}% vs N-1
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Marge Brute</span>
              <Percent className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {financialMetrics.profit.grossMargin}%
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              {formatCurrency(financialMetrics.profit.gross)}
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">EBITDA</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-info)]" />
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(financialMetrics.profit.ebitda)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              Marge: {financialMetrics.profit.ebitdaMargin}%
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Cash Flow Net</span>
              <PiggyBank className="w-4 h-4 text-[var(--color-warning)]" />
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(financialMetrics.cashflow.net)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              FCF: {formatCurrency(financialMetrics.cashflow.freeFlow)}
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">BFR</span>
              <Wallet className="w-4 h-4 text-[var(--color-info)]" />
            </div>
            <div className="text-xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(financialMetrics.ratios.workingCapital)}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              Ratio courant: {financialMetrics.ratios.currentRatio}
            </div>
          </div>
        </div>
      </div>

      {/* P&L Analysis */}
      <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] mb-6">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Compte de Résultat Détaillé
          </h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Catégorie
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Réel
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Budget
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Écart
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    N-1
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Var %
                  </th>
                </tr>
              </thead>
              <tbody>
                {plData.map((item, index) => {
                  const budgetVariance = item.actual - item.budget;
                  const previousVariance = ((item.actual - item.previous) / Math.abs(item.previous)) * 100;
                  
                  return (
                    <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[var(--color-text-primary)]">
                        {formatCurrency(item.actual)}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                        {formatCurrency(item.budget)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        item.actual > 0 
                          ? budgetVariance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                          : budgetVariance <= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                      }`}>
                        {formatCurrency(budgetVariance)}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                        {formatCurrency(item.previous)}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${getVarianceColor(previousVariance)}`}>
                        {previousVariance > 0 ? '+' : ''}{previousVariance.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="py-3 px-4 text-[var(--color-text-primary)]">
                    Résultat Net
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-text-primary)]">
                    {formatCurrency(financialMetrics.profit.net)}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                    {formatCurrency(1500000)}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-success)]">
                    {formatCurrency(75000)}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                    {formatCurrency(1350000)}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-success)]">
                    +16.7%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Monthly Trend */}
        <div className="lg:col-span-2 bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Évolution Mensuelle
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Line data={monthlyTrendData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Revenue Mix */}
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Mix Revenus
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Doughnut data={revenueMixData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cash Flow Waterfall */}
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Cascade de Trésorerie
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Bar data={cashFlowData} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              }
            }} />
          </div>
        </div>

        {/* Working Capital */}
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Évolution du BFR
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Bar data={workingCapitalData} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              scales: {
                x: { stacked: true },
                y: { stacked: true }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Financial Ratios */}
      <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Ratios Financiers Clés
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Profitability Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Rentabilité</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">ROE</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.roe}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">ROA</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.roa}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Marge Nette</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.profit.netMargin}%
                  </span>
                </div>
              </div>
            </div>

            {/* Liquidity Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Liquidité</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Ratio Courant</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.currentRatio}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Ratio Rapide</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.quickRatio}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Cash Ratio</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    0.8
                  </span>
                </div>
              </div>
            </div>

            {/* Leverage Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Endettement</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Dette/Equity</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.debtToEquity}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Dette/EBITDA</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    1.2
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Couverture Int.</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    8.5x
                  </span>
                </div>
              </div>
            </div>

            {/* Efficiency Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Efficacité</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">Rotation Stocks</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    6.2x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">DSO</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    45 jours
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">DPO</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    38 jours
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="mt-6 p-4 bg-[var(--color-warning-lightest)] rounded-lg border border-[var(--color-warning-light)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 mb-1">Points d'Attention</h4>
                <ul className="text-sm text-[var(--color-warning-darker)] space-y-1">
                  <li>• Le DSO a augmenté de 5 jours ce mois-ci</li>
                  <li>• Les charges externes dépassent le budget de 2.1%</li>
                  <li>• Le ratio de liquidité rapide est en dessous de l'objectif de 2.0</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialAnalysisDashboard;