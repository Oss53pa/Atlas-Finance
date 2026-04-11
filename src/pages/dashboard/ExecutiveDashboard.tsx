// @ts-nocheck

import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { useActivityType } from '../../hooks/useActivityType';
import { useActivityKPIs } from '../../hooks/useActivityKPIs';
import type { ActivityType } from '../../services/company.service';
import {
  Factory, ShoppingCart, Briefcase,
  ArrowUpRight, ArrowDownRight, Download, RefreshCw, Settings,
  LayoutGrid, TrendingUp, BarChart3, Building2
} from 'lucide-react';
import { FeatureGate, UpgradeBanner, useFeatureAccess } from '../../components/gating';
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
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const ACTIVITY_ICONS: Record<ActivityType, React.FC<{ className?: string }>> = {
  production: Factory,
  negoce: ShoppingCart,
  services: Briefcase,
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  production: 'Production / Industrie',
  negoce: 'Negoce / Commerce',
  services: 'Prestations de Services',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  production: 'var(--color-warning)',
  negoce: 'var(--color-success)',
  services: 'var(--color-primary)',
};

function formatKPIValue(value: number, format: string): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'days':
      return `${Math.round(value)}j`;
    default:
      return value.toLocaleString('fr-FR');
  }
}

function getValueColor(value: number, condition?: string): string {
  if (!condition) return 'text-[var(--color-text-primary)]';
  if (condition === 'higher-is-better') {
    return value > 0 ? 'text-[var(--color-success)]' : value < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-text-primary)]';
  }
  // lower-is-better: for costs, a higher value is "bad"
  return 'text-[var(--color-text-primary)]';
}

const ExecutiveDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { activityType, setActivityType, dashboardConfig, loading: activityLoading } = useActivityType();
  const { primaryKPIs, secondaryKPIs, monthlyTrend, loading: kpisLoading } = useActivityKPIs();
  const [showActivitySelector, setShowActivitySelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'details' | 'group'>('overview');
  const { allowed: canGroupView } = useFeatureAccess('tableaux_bord_groupe');

  const tabsList = [
    { key: 'overview' as const, label: "Vue d'ensemble", icon: LayoutGrid, locked: false },
    { key: 'trends' as const, label: 'Tendances', icon: TrendingUp, locked: false },
    { key: 'details' as const, label: 'Détails activité', icon: BarChart3, locked: false },
    { key: 'group' as const, label: 'Vue Groupe', icon: Building2, locked: !canGroupView },
  ];

  const loading = activityLoading || kpisLoading;

  const ActivityIcon = ACTIVITY_ICONS[activityType];

  // Chart: Revenue vs Cost trend
  const trendChartData = useMemo(() => ({
    labels: MONTH_LABELS,
    datasets: [
      {
        label: dashboardConfig.chartLabels.revenueLabel,
        data: monthlyTrend.map((m) => m.revenue),
        borderColor: 'var(--color-success)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: dashboardConfig.chartLabels.costLabel,
        data: monthlyTrend.map((m) => m.cost),
        borderColor: 'var(--color-error)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  }), [monthlyTrend, dashboardConfig]);

  // Chart: Margin trend
  const marginChartData = useMemo(() => ({
    labels: MONTH_LABELS,
    datasets: [
      {
        label: dashboardConfig.chartLabels.marginLabel,
        data: monthlyTrend.map((m) => m.margin),
        backgroundColor: monthlyTrend.map((m) =>
          m.margin >= 0 ? 'rgba(34, 197, 94, 0.7)' : 'rgba(239, 68, 68, 0.7)'
        ),
        borderRadius: 4,
      },
    ],
  }), [monthlyTrend, dashboardConfig]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 15, usePointStyle: true, font: { size: 12 } },
      },
    },
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)] mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      {/* Header with Activity Type Selector */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${ACTIVITY_COLORS[activityType]} 15%, transparent)` }}
            >
              <ActivityIcon className="w-7 h-7" style={{ color: ACTIVITY_COLORS[activityType] }} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
                Tableau de Bord — {dashboardConfig.label}
              </h1>
              <p className="text-[var(--color-text-secondary)] text-sm mt-0.5">
                {dashboardConfig.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Activity Type Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowActivitySelector(!showActivitySelector)}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)] flex items-center gap-2 hover:bg-[var(--color-background)] transition-colors"
              >
                <Settings className="w-4 h-4" />
                Type d'activite
              </button>
              {showActivitySelector && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="p-3 border-b border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">
                      Choisir le type d'activite
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Le dashboard s'adapte automatiquement
                    </p>
                  </div>
                  {(['production', 'negoce', 'services'] as ActivityType[]).map((type) => {
                    const Icon = ACTIVITY_ICONS[type];
                    const isActive = activityType === type;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setActivityType(type);
                          setShowActivitySelector(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary)]'
                            : 'hover:bg-[var(--color-background)] text-[var(--color-text-primary)]'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <div>
                          <p className="font-medium text-sm">{ACTIVITY_LABELS[type]}</p>
                        </div>
                        {isActive && (
                          <span className="ml-auto text-xs font-medium bg-[var(--color-primary)] text-white px-2 py-0.5 rounded-full">
                            Actif
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors" aria-label="Actualiser">
              <RefreshCw className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
            <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-[var(--color-card-bg)] rounded-xl p-1 border border-[var(--color-border)] w-fit mb-6">
          {tabsList.map((tab) => {
            const Icon = tab.icon;
            const locked = (tab as any).locked;
            return (
              <button
                key={tab.key}
                onClick={() => { if (!locked) setActiveTab(tab.key); }}
                disabled={locked}
                title={locked ? 'Vue Groupe — réservée au plan Premium' : undefined}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : locked
                      ? 'text-neutral-400 cursor-not-allowed'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {locked && (
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ml-1"
                    style={{ background: 'rgba(239,159,39,0.15)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.3)' }}
                  >
                    Premium
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {primaryKPIs.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.id} className="bg-[var(--color-card-bg)] rounded-lg p-5 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-[var(--color-background)]">
                    <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  {kpi.colorCondition && (
                    <span className={`text-xs font-medium flex items-center gap-1 ${getValueColor(kpi.value, kpi.colorCondition)}`}>
                      {kpi.value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    </span>
                  )}
                </div>
                <div className={`text-xl font-bold ${getValueColor(kpi.value, kpi.colorCondition)}`}>
                  {formatKPIValue(kpi.value, kpi.format)}
                </div>
                <div className="text-sm text-[var(--color-text-secondary)] mt-1 font-medium">
                  {kpi.label}
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] mt-0.5 opacity-70">
                  {kpi.description}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Tendances */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              {dashboardConfig.chartLabels.revenueLabel} vs {dashboardConfig.chartLabels.costLabel}
            </h3>
            <div style={{ position: 'relative', height: '300px', width: '100%' }}>
              <Line data={trendChartData} options={chartOptions} />
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              {dashboardConfig.chartLabels.marginLabel}
            </h3>
            <div style={{ position: 'relative', height: '300px', width: '100%' }}>
              <Bar data={marginChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Détails activité */}
      {activeTab === 'details' && dashboardConfig.sections.map((section) => {
        const SectionIcon = section.icon;
        const sectionKPIs = secondaryKPIs.filter((k) => section.kpis.includes(k.id));
        if (sectionKPIs.length === 0) return null;

        return (
          <div key={section.id} className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] mb-6">
            <div className="p-5 border-b border-[var(--color-border)]">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <SectionIcon className="w-5 h-5" />
                {section.title}
              </h2>
            </div>
            <div className="p-5">
              <div className={`grid gap-4 ${
                sectionKPIs.length <= 3 ? 'grid-cols-1 md:grid-cols-3' :
                sectionKPIs.length <= 4 ? 'grid-cols-2 md:grid-cols-4' :
                'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
              }`}>
                {sectionKPIs.map((kpi) => {
                  const Icon = kpi.icon;
                  return (
                    <div key={kpi.id} className="p-4 bg-[var(--color-background)] rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                        <span className="text-sm text-[var(--color-text-secondary)] truncate">{kpi.label}</span>
                      </div>
                      <div className={`text-lg font-bold ${getValueColor(kpi.value, kpi.colorCondition)}`}>
                        {formatKPIValue(kpi.value, kpi.format)}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)] mt-1 opacity-70">
                        {kpi.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* Tab: Vue Groupe — gated (tableaux_bord_groupe) */}
      {activeTab === 'group' && (
        <FeatureGate
          feature="tableaux_bord_groupe"
          fallback={<UpgradeBanner feature="tableaux_bord_groupe" />}
        >
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Vue Groupe — KPIs consolidés
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Tableau de bord consolidé toutes sociétés du groupe.
            </p>
          </div>
        </FeatureGate>
      )}
    </div>
  );
};

export default ExecutiveDashboard;
