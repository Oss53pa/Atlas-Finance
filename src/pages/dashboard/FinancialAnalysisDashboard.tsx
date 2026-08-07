import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3,
  LineChart, Calculator, Percent, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Download, FileText, AlertTriangle, CheckCircle,
  Info, Clock, CreditCard, Wallet, PiggyBank, Landmark, ChevronRight, ChevronDown
} from 'lucide-react';
import { StatBadgeCard } from '../../components/premium';
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
  const [tab, setTab] = useState<'synthese' | 'analyses'>('synthese');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { adapter } = useData();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toggleRow = (key: string) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Financial Metrics from DataContext
  const [allEntries, setAllEntries] = useState<{ date: string; status: string; lines: Array<{ accountCode: string; debit: number; credit: number }> }[]>([]);

  useEffect(() => {
    const load = async () => {
      const entries = await adapter.getAll('journalEntries') as { date: string; status: string; lines: Array<{ accountCode: string; debit: number; credit: number }> }[];
      setAllEntries(entries);
    };
    load();
  }, [adapter]);

  // Apply selectedPeriod date filter
  const filteredEntries = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    let startDate: Date | null = null;
    if (selectedPeriod === 'mtd') {
      startDate = new Date(year, month, 1);
    } else if (selectedPeriod === 'qtd') {
      const quarterStart = Math.floor(month / 3) * 3;
      startDate = new Date(year, quarterStart, 1);
    } else if (selectedPeriod === 'ytd') {
      startDate = new Date(year, 0, 1);
    }
    return allEntries.filter(e => {
      if (e.status === 'draft') return false;
      if (startDate) {
        const d = new Date(e.date);
        return d >= startDate && d <= now;
      }
      return true;
    });
  }, [allEntries, selectedPeriod]);

  const liveFinancials = useMemo(() => {
    let revenue = 0, expenses = 0, treasury = 0;
    let actifCirculant = 0, passifCirculant = 0;
    let impots = 0;          // cl.89 (IS/IMF) — pour le résultat NET
    let chargesFin = 0;      // cl.66 (charges financières) — add-back EBITDA
    let dotations = 0;       // cl.68 (dotations amort./prov.) — add-back EBITDA
    let immobilisations = 0; // cl.2 (VNC, net des amortissements 28) — pour le ROA
    const monthlyRev = new Array(12).fill(0);
    const monthlyExp = new Array(12).fill(0);
    const revenueByClass: Record<string, number> = {};
    const expenseByClass: Record<string, number> = {};
    const quarterlyCreances = [0, 0, 0, 0];
    const quarterlyStocks = [0, 0, 0, 0];
    const quarterlyDettes = [0, 0, 0, 0];

    for (const e of filteredEntries) {
      const m = new Date(e.date).getMonth();
      const q = Math.floor(m / 3);
      for (const l of e.lines) {
        if (!l.accountCode) continue;
        if (l.accountCode.startsWith('7')) {
          const v = (l.credit || 0) - (l.debit || 0);
          revenue += v;
          monthlyRev[m] += v;
          const cls = l.accountCode.substring(0, 2);
          revenueByClass[cls] = (revenueByClass[cls] || 0) + v;
        }
        if (l.accountCode.startsWith('6')) {
          const v = (l.debit || 0) - (l.credit || 0);
          expenses += v;
          monthlyExp[m] += v;
          const cls = l.accountCode.substring(0, 2);
          expenseByClass[cls] = (expenseByClass[cls] || 0) + v;
          if (l.accountCode.startsWith('66')) chargesFin += v;
          if (l.accountCode.startsWith('68')) dotations += v;
        }
        // Impôt sur le résultat (cl.89) — requis pour le résultat NET
        if (l.accountCode.startsWith('89')) impots += (l.debit || 0) - (l.credit || 0);
        // Immobilisations (cl.2, net des amortissements 28) — pour le ROA
        if (l.accountCode.startsWith('2')) immobilisations += (l.debit || 0) - (l.credit || 0);
        // Trésorerie = classe 5 HORS 58 (virements internes en transit)
        if (l.accountCode.startsWith('5') && !l.accountCode.startsWith('58')) treasury += (l.debit || 0) - (l.credit || 0);
        // Actif circulant: classes 3 (stocks) and 4 debit (créances)
        if (l.accountCode.startsWith('3')) {
          const v = (l.debit || 0) - (l.credit || 0);
          actifCirculant += v;
          quarterlyStocks[q] += v;
        }
        if (l.accountCode.startsWith('4')) {
          const netDebit = (l.debit || 0) - (l.credit || 0);
          if (netDebit > 0) {
            // Créance (débit) → actif circulant
            actifCirculant += netDebit;
            quarterlyCreances[q] += netDebit;
          } else {
            // Dettes fournisseurs/fiscales (crédit) → passif circulant
            passifCirculant += Math.abs(netDebit);
            quarterlyDettes[q] += Math.abs(netDebit);
          }
        }
      }
    }

    return {
      revenue,
      expenses,
      treasury,
      impots,
      chargesFin,
      dotations,
      immobilisations,
      monthlyRev,
      monthlyExp,
      actifCirculant,
      passifCirculant,
      revenueByClass,
      expenseByClass,
      quarterlyCreances,
      quarterlyStocks,
      quarterlyDettes,
    };
  }, [filteredEntries]);

  const financialMetrics = useMemo(() => {
    const grossProfit = liveFinancials.revenue - liveFinancials.expenses; // résultat avant impôt
    const netProfit = grossProfit - liveFinancials.impots;                // résultat NET (après cl.89)
    // EBITDA ≈ résultat avant impôt + charges financières (66) + dotations amort./prov. (68)
    const ebitda = grossProfit + liveFinancials.chargesFin + liveFinancials.dotations;
    const grossMargin = liveFinancials.revenue > 0 ? +(grossProfit / liveFinancials.revenue * 100).toFixed(2) : 0;
    const netMargin = liveFinancials.revenue > 0 ? +(netProfit / liveFinancials.revenue * 100).toFixed(2) : 0;
    const ebitdaMargin = liveFinancials.revenue > 0 ? +(ebitda / liveFinancials.revenue * 100).toFixed(2) : 0;
    const workingCapital = liveFinancials.actifCirculant - liveFinancials.passifCirculant;
    const currentRatio = liveFinancials.passifCirculant > 0
      ? +(liveFinancials.actifCirculant / liveFinancials.passifCirculant).toFixed(2)
      : 0;
    // Quick ratio excludes stocks (class 3)
    const quickAssets = liveFinancials.actifCirculant - liveFinancials.quarterlyStocks.reduce((a, b) => a + b, 0);
    const quickRatio = liveFinancials.passifCirculant > 0
      ? +(quickAssets / liveFinancials.passifCirculant).toFixed(2)
      : 0;
    // Total actif = immobilisations (cl.2) + actif circulant + trésorerie
    const totalAssets = liveFinancials.immobilisations + liveFinancials.actifCirculant + liveFinancials.treasury;
    const roa = totalAssets > 0 ? +(netProfit / totalAssets * 100).toFixed(2) : 0;

    return {
      revenue: {
        current: liveFinancials.revenue,
        previous: 0,
        budget: 0,
        variance: 0,
        budgetVariance: 0,
      },
      expenses: {
        current: liveFinancials.expenses,
        previous: 0,
        budget: 0,
        variance: 0,
        budgetVariance: 0,
      },
      profit: {
        gross: grossProfit,
        net: netProfit,
        ebitda,
        grossMargin,
        netMargin,
        ebitdaMargin,
      },
      cashflow: {
        operating: liveFinancials.treasury,
        investing: 0,
        financing: 0,
        net: liveFinancials.treasury,
        freeFlow: liveFinancials.treasury,
      },
      ratios: {
        currentRatio,
        quickRatio,
        debtToEquity: 0,
        roe: 0,
        roa,
        workingCapital,
      },
    };
  }, [liveFinancials]);

  // P&L computed from live data — chaque ligne porte sa ventilation par sous-classe
  // (2 chiffres) pour le drill-down « détail des comptes ».
  const plData = [
    { key: 'prod', category: t('financialAnalysis.catRevenue'), actual: liveFinancials.revenue, budget: 0, previous: 0, byClass: liveFinancials.revenueByClass, sign: 1 },
    { key: 'charges', category: t('financialAnalysis.catExpenses'), actual: -liveFinancials.expenses, budget: 0, previous: 0, byClass: liveFinancials.expenseByClass, sign: -1 },
  ];

  // Cash Flow from live treasury
  const cashFlowData = {
    labels: [t('financialAnalysis.netCash')],
    datasets: [{
      label: t('financialAnalysis.cashFlow'),
      data: [liveFinancials.treasury],
      backgroundColor: (context: any) => {
        const value = context.raw;
        return value >= 0 ? 'rgba(21,128,61,0.85)' : 'rgba(192,50,43,0.85)';
      }
    }]
  };

  // Revenue mix computed from real entries grouped by account class
  const revAccountLabels: Record<string, string> = {
    '70': t('financialAnalysis.acc70'), '71': t('financialAnalysis.acc71'), '72': t('financialAnalysis.acc72'),
    '73': t('financialAnalysis.acc73'), '74': t('financialAnalysis.acc74'), '75': t('financialAnalysis.acc75'),
    '76': t('financialAnalysis.acc76'), '77': t('financialAnalysis.acc77'), '78': t('financialAnalysis.acc78'), '79': t('financialAnalysis.acc79'),
  };
  const revColors = ['#235A6E','#E89A2E','#15803D','#4E7E8D','#C77E2C','#7FA3AF','#3E7A8C','#B26A12'];
  const revenueMixData = useMemo(() => {
    const entries = Object.entries(liveFinancials.revenueByClass).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      return { labels: [t('financialAnalysis.noData')], datasets: [{ data: [100], backgroundColor: ['#E89A2E'] }] };
    }
    return {
      labels: entries.map(([cls]) => revAccountLabels[cls] || `Classe ${cls}`),
      datasets: [{ data: entries.map(([, v]) => Math.round(v)), backgroundColor: entries.map((_, i) => revColors[i % revColors.length]) }],
    };
  }, [liveFinancials.revenueByClass]);

  const expAccountLabels: Record<string, string> = {
    '60': t('financialAnalysis.acc60'), '61': t('financialAnalysis.acc61'), '62': t('financialAnalysis.acc62'), '63': t('financialAnalysis.acc63'),
    '64': t('financialAnalysis.acc64'), '65': t('financialAnalysis.acc65'), '66': t('financialAnalysis.acc66'), '67': t('financialAnalysis.acc67'),
    '68': t('financialAnalysis.acc68'), '69': t('financialAnalysis.acc69'),
  };
  const expColors = ['#C0322B','#E89A2E','#C77E2C','#235A6E','#4E7E8D','#15803D','#7FA3AF','#B26A12'];
  const expenseBreakdownData = useMemo(() => {
    const entries = Object.entries(liveFinancials.expenseByClass).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      return { labels: [t('financialAnalysis.noData')], datasets: [{ data: [100], backgroundColor: ['#E89A2E'] }] };
    }
    return {
      labels: entries.map(([cls]) => expAccountLabels[cls] || `Classe ${cls}`),
      datasets: [{ data: entries.map(([, v]) => Math.round(v)), backgroundColor: entries.map((_, i) => expColors[i % expColors.length]) }],
    };
  }, [liveFinancials.expenseByClass]);

  // Monthly Trend from Dexie aggregation
  const monthlyProfitData = liveFinancials.monthlyRev.map((r: number, i: number) => r - liveFinancials.monthlyExp[i]);
  const monthlyTrendData = {
    labels: t('financialAnalysis.monthsShort').split(','),
    datasets: [
      {
        label: t('financialAnalysis.seriesRevenue'),
        data: liveFinancials.monthlyRev,
        borderColor: '#15803D',
        backgroundColor: 'rgba(21,128,61,0.12)',
        tension: 0.4,
        fill: true
      },
      {
        label: t('financialAnalysis.seriesExpenses'),
        data: liveFinancials.monthlyExp,
        borderColor: '#C0322B',
        backgroundColor: 'rgba(192,50,43,0.12)',
        tension: 0.4,
        fill: true
      },
      {
        label: t('financialAnalysis.seriesNetProfit'),
        data: monthlyProfitData,
        borderColor: '#235A6E',
        backgroundColor: 'rgba(35,90,110,0.12)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Working Capital — computed from real quarterly balance sheet data
  const workingCapitalData = useMemo(() => {
    const hasData = liveFinancials.quarterlyCreances.some(v => v !== 0) ||
      liveFinancials.quarterlyStocks.some(v => v !== 0) ||
      liveFinancials.quarterlyDettes.some(v => v !== 0);
    return {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        { label: t('financialAnalysis.seriesReceivables'), data: hasData ? liveFinancials.quarterlyCreances : [0, 0, 0, 0], backgroundColor: '#235A6E' },
        { label: t('financialAnalysis.seriesStock'), data: hasData ? liveFinancials.quarterlyStocks : [0, 0, 0, 0], backgroundColor: '#E89A2E' },
        { label: t('financialAnalysis.seriesPayables'), data: hasData ? liveFinancials.quarterlyDettes.map(v => -v) : [0, 0, 0, 0], backgroundColor: '#C0322B' },
      ],
    };
  }, [liveFinancials]);

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-[var(--color-success)]';
    if (variance < -5) return 'text-[var(--color-error)]';
    return 'text-[var(--color-warning)]';
  };


  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
              {t('financialAnalysis.title')}
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              {t('financialAnalysis.subtitle')}
            </p>
          </div>
          <PageHeaderActions
            onToggleFilters={() => setFiltersOpen(o => !o)}
            filtersOpen={filtersOpen}
            activeFilters={(selectedPeriod !== 'ytd' ? 1 : 0) + (comparisonMode !== 'previous' ? 1 : 0)}
            printTitle="Analyse Financière Approfondie"
          />
        </div>

        {/* Panneau de filtres (replié par défaut, ouvert par l'entonnoir) */}
        {filtersOpen && (
          <div className="mb-4 p-4 bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] flex flex-wrap items-end gap-4 print-hide">
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{t('financialAnalysis.period')}</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
              >
                <option value="mtd">{t('financialAnalysis.periodMtd')}</option>
                <option value="qtd">{t('financialAnalysis.periodQtd')}</option>
                <option value="ytd">{t('financialAnalysis.periodYtd')}</option>
                <option value="custom">{t('financialAnalysis.periodCustom')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-secondary)] mb-1">{t('financialAnalysis.comparison')}</label>
              <select
                value={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.value)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
              >
                <option value="previous">{t('financialAnalysis.compPrevious')}</option>
                <option value="budget">{t('financialAnalysis.compBudget')}</option>
                <option value="both">{t('financialAnalysis.compBoth')}</option>
              </select>
            </div>
          </div>
        )}

        {/* Key Financial Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6 items-stretch">
          <StatBadgeCard
            label={t('financialAnalysis.kpiRevenue')}
            value={formatCurrency(financialMetrics.revenue.current)}
            badge="petrol"
            icon={<DollarSign />}
            valueSize={20}
            meta="Produits nets (classe 7)"
          />
          <StatBadgeCard
            label={t('financialAnalysis.kpiGrossMargin')}
            value={`${financialMetrics.profit.grossMargin}%`}
            badge="petrol"
            icon={<Percent />}
            meta={formatCurrency(financialMetrics.profit.gross)}
          />
          <StatBadgeCard
            label={t('financialAnalysis.kpiEbitda')}
            value={formatCurrency(financialMetrics.profit.ebitda)}
            badge="petrol"
            icon={<TrendingUp />}
            valueSize={20}
            meta={`Marge : ${financialMetrics.profit.ebitdaMargin}%`}
          />
          <StatBadgeCard
            label={t('financialAnalysis.kpiNetCashFlow')}
            value={formatCurrency(financialMetrics.cashflow.net)}
            badge="amber"
            icon={<PiggyBank />}
            valueSize={20}
            meta={`FCF : ${formatCurrency(financialMetrics.cashflow.freeFlow)}`}
          />
          <StatBadgeCard
            label={t('financialAnalysis.kpiWorkingCapital')}
            value={formatCurrency(financialMetrics.ratios.workingCapital)}
            badge="petrol"
            icon={<Wallet />}
            valueSize={20}
            meta={`Ratio courant : ${financialMetrics.ratios.currentRatio}`}
          />
        </div>
      </div>

      {/* Onglets : Synthèse (Compte de Résultat) / Analyses & graphiques */}
      <div className="flex gap-1 bg-[var(--color-card-bg)] rounded-lg p-1 border border-[var(--color-border)] w-fit mb-6">
        {([['synthese', 'financialAnalysis.tabPl'], ['analyses', 'financialAnalysis.tabAnalyses']] as const).map(([k, lblKey]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium rounded-md ${tab === k ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'}`}>{t(lblKey)}</button>
        ))}
      </div>

      {tab === 'synthese' && (<>
      {/* P&L Analysis */}
      <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] mb-6">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('financialAnalysis.plDetailed')}
          </h2>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    {t('financialAnalysis.colCategory')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    {t('financialAnalysis.colActual')}
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    {t('financialAnalysis.colPctTotal')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {plData.map((item) => {
                  const isOpen = expanded.has(item.key);
                  const labels = item.key === 'prod' ? revAccountLabels : expAccountLabels;
                  const subRows = Object.entries(item.byClass)
                    .filter(([, v]) => Math.abs(v as number) > 0)
                    .sort((a, b) => (b[1] as number) - (a[1] as number));

                  return (
                    <React.Fragment key={item.key}>
                    <tr className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)] cursor-pointer" onClick={() => toggleRow(item.key)}>
                      <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                        <span className="inline-flex items-center gap-1.5">
                          {subRows.length > 0
                            ? (isOpen ? <ChevronDown className="w-4 h-4 text-[var(--color-text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />)
                            : <span className="w-4" />}
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-[var(--color-text-primary)]">
                        {formatCurrency(item.actual)}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                        100%
                      </td>
                    </tr>
                    {isOpen && subRows.map(([cls, v]) => (
                      <tr key={item.key + cls} className="border-b border-[var(--color-border)] bg-[var(--color-background)]/40 hover:bg-[var(--color-background)] cursor-pointer text-sm"
                          onClick={() => navigate(`/accounting/general-ledger?compte=${cls}`)}
                          title={`Voir le grand livre du compte ${cls}`}>
                        <td className="py-2 px-4 pl-12 text-[var(--color-text-secondary)]">
                          <span className="font-mono text-[var(--color-text-tertiary)] mr-2">{cls}</span>{labels[cls] || `Classe ${cls}`}
                        </td>
                        <td className="py-2 px-4 text-right text-[var(--color-text-primary)]">{formatCurrency(item.sign * (v as number))}</td>
                        <td className="py-2 px-4 text-right text-[var(--color-text-tertiary)]">
                          {item.actual !== 0 ? `${((item.sign * (v as number) / item.actual) * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                    </React.Fragment>
                  );
                })}
                <tr className="font-bold">
                  <td className="py-3 px-4 text-[var(--color-text-primary)]">
                    {t('financialAnalysis.netResult')}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-text-primary)]">
                    {formatCurrency(financialMetrics.profit.net)}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                    —
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </>)}

      {tab === 'analyses' && (<>
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
            {t('financialAnalysis.revenueMix')}
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
            {t('financialAnalysis.cashWaterfall')}
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
            {t('financialAnalysis.keyRatios')}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Profitability Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('financialAnalysis.profitability')}</h4>
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
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.netMargin')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.profit.netMargin}%
                  </span>
                </div>
              </div>
            </div>

            {/* Liquidity Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('financialAnalysis.liquidity')}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.currentRatio')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.currentRatio}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.quickRatio')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.quickRatio}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.cashRatio')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {liveFinancials.passifCirculant > 0 ? (liveFinancials.treasury / liveFinancials.passifCirculant).toFixed(2) : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Leverage Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('financialAnalysis.leverage')}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.debtEquity')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.ratios.debtToEquity}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.debtEbitda')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {financialMetrics.profit.ebitda > 0 ? '—' : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.interestCoverage')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    —
                  </span>
                </div>
              </div>
            </div>

            {/* Efficiency Ratios */}
            <div>
              <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('financialAnalysis.efficiency')}</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">{t('financialAnalysis.inventoryTurnover')}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    —
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">DSO</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    —
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--color-text-secondary)]">DPO</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    —
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
                <h4 className="font-medium text-orange-900 mb-1">{t('financialAnalysis.attentionPoints')}</h4>
                <ul className="text-sm text-[var(--color-warning-darker)] space-y-1">
                  {financialMetrics.profit.net < 0 && <li>{t('financialAnalysis.alertNegativeResult', { value: formatCurrency(financialMetrics.profit.net) })}</li>}
                  {financialMetrics.profit.netMargin < 5 && financialMetrics.profit.netMargin > 0 && <li>{t('financialAnalysis.alertLowMargin', { value: financialMetrics.profit.netMargin.toFixed(1) })}</li>}
                  {liveFinancials.treasury < 0 && <li>{t('financialAnalysis.alertNegativeCash', { value: formatCurrency(liveFinancials.treasury) })}</li>}
                  {liveFinancials.revenue === 0 && liveFinancials.expenses === 0 && <li>{t('financialAnalysis.alertNoEntries')}</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
};

export default FinancialAnalysisDashboard;