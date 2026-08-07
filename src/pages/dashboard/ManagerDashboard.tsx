import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';
import { computeDashboardMetrics, periodRange, type DashboardPeriod } from '../../utils/dashboardMetrics';
import { formatNumber } from '../../utils/formatters';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Target,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  Wallet,
  Receipt,
  Clock,
  Scale,
  Percent,
  Landmark
} from 'lucide-react';

const DSO_THRESHOLD = 60; // seuil d'alerte du délai de recouvrement clients (jours)

const ManagerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState('financial');
  const { adapter } = useData();
  const [reloadKey, setReloadKey] = useState(0);

  // KPIs dérivés de la SOURCE UNIQUE (glHelpers via computeDashboardMetrics).
  const [liveKpiData, setLiveKpiData] = useState<{
    revenue: number; expenses: number; treasury: number; resultatNet: number; margin: number; pendingCount: number;
    receivables: number; payables: number; stocks: number; bfr: number;
    dso: number; dpo: number; margeBrute: number; ratioCD: number | null;
  }>({
    revenue: 0, expenses: 0, treasury: 0, resultatNet: 0, margin: 0, pendingCount: 0,
    receivables: 0, payables: 0, stocks: 0, bfr: 0, dso: 0, dpo: 0, margeBrute: 0, ratioCD: null,
  });
  const [topClients, setTopClients] = useState<Array<{ name: string; amount: number }>>([]);
  const [balHistory, setBalHistory] = useState<Array<{ label: string; creances: number; dettes: number }>>([]);

  const handleExport = () => {
    const rows = [
      [t('managerDashboard.csvIndicator'), t('managerDashboard.csvValue')],
      [t('managerDashboard.csvRevenue'), String(liveKpiData.revenue)],
      [t('managerDashboard.csvExpenses'), String(liveKpiData.expenses)],
      [t('managerDashboard.csvNetResult'), String(liveKpiData.resultatNet)],
      [t('managerDashboard.csvNetMargin'), liveKpiData.margin.toFixed(2)],
      [t('managerDashboard.csvNetCash'), String(liveKpiData.treasury)],
      [t('managerDashboard.csvReceivables'), String(liveKpiData.receivables)],
      [t('managerDashboard.csvPayables'), String(liveKpiData.payables)],
      [t('managerDashboard.csvStocks'), String(liveKpiData.stocks)],
      [t('managerDashboard.csvWorkingCapital'), String(liveKpiData.bfr)],
      [t('managerDashboard.csvDso'), String(liveKpiData.dso)],
      [t('managerDashboard.csvDpo'), String(liveKpiData.dpo)],
      [t('managerDashboard.csvGrossMargin'), liveKpiData.margeBrute.toFixed(2)],
      [t('managerDashboard.csvRatioCD'), liveKpiData.ratioCD != null ? liveKpiData.ratioCD.toFixed(2) : 'n/a'],
      [t('managerDashboard.csvPendingEntries'), String(liveKpiData.pendingCount)],
    ];
    const csv = '﻿' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `dashboard-manager-${timeRange}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const load = async () => {
      const entries = await adapter.getAll<any>('journalEntries');
      // Plage de dates réelle dérivée du sélecteur (semaine = 7 derniers jours).
      let range: DashboardPeriod;
      if (timeRange === 'week') {
        const now = new Date();
        const from = new Date(now); from.setDate(from.getDate() - 6);
        range = { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
      } else {
        range = periodRange(timeRange as 'month' | 'quarter' | 'year');
      }
      const m = computeDashboardMetrics(entries, range);
      const pendingCount = entries.filter((e: any) => e.status === 'draft').length;

      // Postes de bilan : soldes CUMULÉS jusqu'à la fin de la période (les
      // créances/dettes/stocks sont des encours, pas des flux de période).
      const mBal = computeDashboardMetrics(entries, range.to ? { to: range.to } : undefined);
      const receivables = mBal.h.net('41');        // clients — solde débiteur (41x)
      const payables = mBal.h.creditNet('40');     // fournisseurs — solde créditeur (40x)
      const stocks = mBal.classNet['3'] || 0;      // stocks (classe 3)
      const bfr = receivables + stocks - payables; // besoin en fonds de roulement (approché)

      // Ratios : flux de la période (CA, achats cl.60) rapportés aux encours.
      const achats = m.h.net('60');
      const days = (() => {
        if (range.from && range.to) {
          const d = (new Date(range.to).getTime() - new Date(range.from).getTime()) / 86400000 + 1;
          return d > 0 ? d : 365;
        }
        return 365;
      })();
      const dso = m.ca > 0 ? Math.round((receivables / m.ca) * days) : 0;   // délai recouvrement clients
      const dpo = achats > 0 ? Math.round((payables / achats) * days) : 0;  // délai paiement fournisseurs
      const margeBrute = m.ca > 0 ? ((m.ca - achats) / m.ca) * 100 : 0;     // marge brute %
      const ratioCD = payables !== 0 ? receivables / payables : null;       // créances / dettes

      setLiveKpiData({
        revenue: m.ca, expenses: m.charges, treasury: m.treasury, resultatNet: m.resultatNet, margin: m.margeNette, pendingCount,
        receivables, payables, stocks, bfr, dso, dpo, margeBrute, ratioCD,
      });

      // Historique 6 mois : encours créances/dettes cumulés à la fin de chaque mois.
      const anchor = range.to ? new Date(range.to) : new Date();
      const hist: Array<{ label: string; creances: number; dettes: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - i + 1, 0));
        const iso = monthEnd.toISOString().slice(0, 10);
        const mm = computeDashboardMetrics(entries, { to: iso });
        hist.push({ label: t('managerDashboard.monthsShort').split(',')[monthEnd.getUTCMonth()], creances: mm.h.net('41'), dettes: mm.h.creditNet('40') });
      }
      setBalHistory(hist);
      // Top clients RÉELS = montants facturés (débit des comptes 411) agrégés par tiers.
      const byClient = new Map<string, number>();
      for (const e of entries) {
        if (e.status === 'draft') continue;
        for (const l of (e.lines || [])) {
          if (l.accountCode?.startsWith('411')) {
            const name = l.thirdPartyName || l.accountName || l.accountCode;
            byClient.set(name, (byClient.get(name) || 0) + (l.debit || 0));
          }
        }
      }
      setTopClients([...byClient.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount })));
    };
    load();
  }, [adapter, timeRange, reloadKey]);

  const kpis = [
    {
      title: 'Chiffre d\'Affaires',
      value: fmt(liveKpiData.revenue),
      color: 'blue',
      icon: DollarSign,
      description: t('managerDashboard.kpiRevenueDesc'),
    },
    {
      title: t('managerDashboard.kpiNetMargin'),
      value: `${liveKpiData.margin.toFixed(2)}%`,
      color: 'green',
      icon: TrendingUp,
      description: t('managerDashboard.kpiNetMarginDesc'),
    },
    {
      title: t('managerDashboard.kpiPending'),
      value: formatNumber(liveKpiData.pendingCount),
      color: 'orange',
      icon: Target,
      description: t('managerDashboard.kpiPendingDesc'),
    },
    {
      title: t('managerDashboard.kpiNetCash'),
      value: fmt(liveKpiData.treasury),
      color: 'primary',
      icon: BarChart3,
      description: t('managerDashboard.kpiNetCashDesc'),
    }
  ];

  // Alertes dérivées d'indicateurs réels (pas de notifications factices).
  const alerts: Array<{ type: string; title: string; message: string; action: string; time: string }> = [];
  if (liveKpiData.dso > DSO_THRESHOLD) {
    alerts.push({
      type: 'warning',
      title: t('managerDashboard.alertHighDsoTitle'),
      message: t('managerDashboard.alertHighDsoMessage', { dso: String(liveKpiData.dso), threshold: String(DSO_THRESHOLD) }),
      action: t('managerDashboard.alertViewReceivables'),
      time: '',
    });
  }
  if (liveKpiData.treasury < 0) {
    alerts.push({
      type: 'warning',
      title: t('managerDashboard.alertNegativeCashTitle'),
      message: t('managerDashboard.alertNegativeCashMessage', { amount: fmt(liveKpiData.treasury) }),
      action: t('managerDashboard.alertAnalyse'),
      time: '',
    });
  }
  if (liveKpiData.pendingCount > 0) {
    alerts.push({
      type: 'info',
      title: t('managerDashboard.kpiPending'),
      message: t('managerDashboard.alertPendingMessage', { count: String(liveKpiData.pendingCount) }),
      action: t('managerDashboard.alertValidate'),
      time: '',
    });
  }

  const tabs = [
    { id: 'financial', label: t('managerDashboard.tabFinancial'), icon: DollarSign },
    { id: 'operational', label: t('managerDashboard.tabOperational'), icon: BarChart3 },
    { id: 'clients', label: t('navigation.clients'), icon: Users },
    { id: 'forecasts', label: t('managerDashboard.tabForecasts'), icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-background-secondary)]">
      {/* Header Executive */}
      <header className="bg-white border-b border-[var(--color-border)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('managerDashboard.title')}</h1>
            <p className="text-[var(--color-text-primary)]">{t('managerDashboard.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-[var(--color-border-dark)] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">{t('managerDashboard.periodWeek')}</option>
              <option value="month">{t('managerDashboard.periodMonth')}</option>
              <option value="quarter">{t('managerDashboard.periodQuarter')}</option>
              <option value="year">{t('managerDashboard.periodYear')}</option>
            </select>
            <button onClick={() => setReloadKey(k => k + 1)} className="p-2 border border-[var(--color-border-dark)] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </button>
            <button onClick={handleExport} className="bg-[var(--color-success)] text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-[var(--color-success-dark)] transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="w-10 h-10 bg-[var(--color-success-lighter)] rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-[var(--color-border)]">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[var(--color-success)] text-[var(--color-success)]' 
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="p-6">
        {/* KPIs Executive - Style Kads Agency Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi) => {
            const IconComponent = kpi.icon;
            return (
              <div key={kpi.title} className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[var(--color-primary)] group-hover:shadow-md transition-shadow">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{kpi.value}</h3>
                  <p className="text-[var(--color-text-primary)] font-medium">{kpi.title}</p>
                  <p className="text-[var(--color-text-secondary)] text-sm">{kpi.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Créances, dettes & ratios — postes de bilan (cumulés) et ratios réels */}
        <section className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)] mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('managerDashboard.receivablesRatios')}</h2>
            <span className="text-xs text-[var(--color-text-secondary)]">{t('managerDashboard.receivablesRatiosSub')}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
            {[
              { label: t('managerDashboard.tileReceivables'), value: fmt(liveKpiData.receivables), sub: t('managerDashboard.tileReceivablesSub'), icon: Wallet, tone: 'text-[var(--color-primary)]' },
              { label: t('managerDashboard.tilePayables'), value: fmt(liveKpiData.payables), sub: t('managerDashboard.tilePayablesSub'), icon: Receipt, tone: 'text-[var(--color-warning-dark)]' },
              { label: t('managerDashboard.tileWorkingCapital'), value: fmt(liveKpiData.bfr), sub: t('managerDashboard.tileWorkingCapitalSub'), icon: Scale, tone: liveKpiData.bfr >= 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-success)]' },
              { label: 'DSO', value: t('managerDashboard.days', { count: String(liveKpiData.dso) }), sub: t('managerDashboard.tileDsoSub'), icon: Clock, tone: 'text-[var(--color-text-primary)]' },
              { label: 'DPO', value: t('managerDashboard.days', { count: String(liveKpiData.dpo) }), sub: t('managerDashboard.tileDpoSub'), icon: Clock, tone: 'text-[var(--color-text-primary)]' },
              { label: t('managerDashboard.tileGrossMargin'), value: `${liveKpiData.margeBrute.toFixed(1)} %`, sub: t('managerDashboard.tileGrossMarginSub'), icon: Percent, tone: 'text-[var(--color-success)]' },
              { label: t('managerDashboard.tileRatioCD'), value: liveKpiData.ratioCD != null ? liveKpiData.ratioCD.toFixed(2) : '—', sub: t('managerDashboard.tileRatioCDSub'), icon: Landmark, tone: liveKpiData.ratioCD != null && liveKpiData.ratioCD >= 1 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-primary)]' },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.label} className="p-4 rounded-lg bg-[var(--color-background-secondary)] border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-2 text-[var(--color-text-secondary)]">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium">{r.label}</span>
                  </div>
                  <p className={`text-base font-bold ${r.tone}`}>{r.value}</p>
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">{r.sub}</p>
                </div>
              );
            })}
          </div>

          {/* Évolution créances vs dettes (6 derniers mois, encours de fin de mois) */}
          {balHistory.length > 0 && (() => {
            const maxVal = Math.max(1, ...balHistory.flatMap(h => [h.creances, h.dettes]));
            return (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('managerDashboard.balanceTrend')}</h3>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-primary)]" /> {t('managerDashboard.legendReceivables')}</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[var(--color-warning)]" /> Dettes</span>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3" style={{ height: 160 }}>
                  {balHistory.map((h) => (
                    <div key={h.label} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div className="flex items-end justify-center gap-1 w-full" style={{ height: 130 }}>
                        <div
                          className="rounded-t bg-[var(--color-primary)] transition-all"
                          style={{ width: '38%', height: `${Math.max(2, (h.creances / maxVal) * 130)}px` }}
                          title={`Créances ${h.label} : ${fmt(h.creances)}`}
                        />
                        <div
                          className="rounded-t bg-[var(--color-warning)] transition-all"
                          style={{ width: '38%', height: `${Math.max(2, (h.dettes / maxVal) * 130)}px` }}
                          title={`Dettes ${h.label} : ${fmt(h.dettes)}`}
                        />
                      </div>
                      <span className="text-[11px] text-[var(--color-text-secondary)] mt-2">{h.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Graphique principal */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('managerDashboard.periodSummary')}</h2>
            </div>
            {/* Synthèse chiffrée réelle (pas de graphe factice ni de tendance inventée) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-[var(--color-background-secondary)]">
                <p className="text-sm text-[var(--color-text-secondary)]">{t('managerDashboard.income')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{fmt(liveKpiData.revenue)}</p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--color-background-secondary)]">
                <p className="text-sm text-[var(--color-text-secondary)]">{t('managerDashboard.expenses')}</p>
                <p className="text-lg font-bold text-[var(--color-text-primary)]">{fmt(liveKpiData.expenses)}</p>
              </div>
              <div className="p-4 rounded-lg bg-[var(--color-background-secondary)]">
                <p className="text-sm text-[var(--color-text-secondary)]">{t('managerDashboard.netResult')}</p>
                <p className={`text-lg font-bold ${liveKpiData.resultatNet >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>{fmt(liveKpiData.resultatNet)}</p>
              </div>
            </div>
          </div>

          {/* Alertes et notifications */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('managerDashboard.alerts')}</h2>
              <Eye className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </div>
            
            <div className="space-y-4">
              {alerts.length === 0 && (
                <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">{t('managerDashboard.noAlert')}</p>
              )}
              {alerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'warning' ? 'bg-[var(--color-warning-lightest)] border-yellow-400' :
                  alert.type === 'info' ? 'bg-[var(--color-primary-lightest)] border-blue-400' :
                  'bg-[var(--color-success-lightest)] border-green-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />}
                        <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{alert.title}</h3>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] mb-2">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <button className={`text-xs font-medium ${
                          alert.type === 'warning' ? 'text-[var(--color-warning-dark)]' :
                          alert.type === 'info' ? 'text-[var(--color-primary-dark)]' :
                          'text-[var(--color-success-dark)]'
                        }`}>
                          {alert.action} →
                        </button>
                        {alert.time && <span className="text-xs text-[var(--color-text-secondary)]">Il y a {alert.time}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tableaux de données style Kads Agency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clients */}
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Top Clients</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {topClients.length === 0 ? (
                    <p className="text-sm text-[var(--color-text-secondary)] py-4 text-center">{t('managerDashboard.noClientData')}</p>
                  ) : topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-3 hover:bg-[var(--color-background-secondary)] rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-[var(--color-primary)]" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)] text-sm">{client.name}</p>
                          <p className="text-[var(--color-text-secondary)] text-xs">{t('managerDashboard.invoicedAmount')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[var(--color-text-primary)]">{client.amount.toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Répartition par secteur */}
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">CA par Secteur</h2>
            </div>
            <div className="p-6">
              <div className="h-40 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <PieChart className="w-12 h-12 text-primary-500 mx-auto mb-2" />
                  <p className="text-[var(--color-text-primary)] text-sm">{t('managerDashboard.sectorChart')}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-secondary)] py-2 text-center">{t('managerDashboard.noSectorData')}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;