import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign,
  Filter,
  Download,
  Zap,
  Users,
  Clock,
  Plus,
  Eye,
  ShieldCheck,
  LayoutDashboard,
  Building2,
  ArrowUpDown,
  GitCompareArrows
} from 'lucide-react';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { Link } from 'react-router-dom';

// Lazy imports des pages existantes
const BudgetsPage = lazy(() => import('./BudgetsPage'));
const BudgetControlPage = lazy(() => import('./BudgetControlPage'));
const BudgetRecapPage = lazy(() => import('./BudgetRecapPage'));
const CostCentersPage = lazy(() => import('../analytics/CostCentersPage'));

const TABS = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard },
  { id: 'elaboration', label: 'Elaboration & Creation', icon: Plus },
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'controle', label: 'Controle', icon: ShieldCheck },
  { id: 'centres-couts', label: 'Centres de Couts', icon: Building2 },
  { id: 'tendances', label: 'Tendances', icon: TrendingUp },
  { id: 'ecarts', label: 'Analyse des Ecarts', icon: GitCompareArrows },
] as const;

type TabId = typeof TABS[number]['id'];

const TabLoader = () => (
  <div className="flex justify-center items-center py-20">
    <div className="w-10 h-10 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin" />
  </div>
);

const BudgetingDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [isLoading, setIsLoading] = useState(true);
  const [budgetLines, setBudgetLines] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [bl, je] = await Promise.all([
          adapter.getAll('budgetLines'),
          adapter.getAll('journalEntries'),
        ]);
        setBudgetLines(bl as any[]);
        setJournalEntries(je as any[]);
      } catch (e) {
        console.error('BudgetingDashboard load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [adapter]);

  const dashboardData = useMemo(() => {
    let totalBudgeted = 0;
    let totalActual = 0;

    for (const bl of budgetLines) {
      totalBudgeted += bl.amount || bl.total_budget || bl.budgeted || 0;
    }

    const monthlyActual = new Array(12).fill(0);
    const monthlyBudget = new Array(12).fill(0);
    let revenueActual = 0, chargesActual = 0, investActual = 0;

    for (const entry of journalEntries) {
      if (!entry.lines) continue;
      const month = new Date(entry.date).getMonth();
      for (const line of entry.lines) {
        if (line.accountCode?.startsWith('6')) {
          const val = (line.debit || 0) - (line.credit || 0);
          totalActual += val;
          chargesActual += val;
          if (month >= 0 && month < 12) monthlyActual[month] += val;
        }
        if (line.accountCode?.startsWith('7')) revenueActual += (line.credit || 0) - (line.debit || 0);
        if (line.accountCode?.startsWith('2')) investActual += (line.debit || 0) - (line.credit || 0);
      }
    }

    if (totalBudgeted > 0) {
      const monthlyBudgetAvg = totalBudgeted / 12;
      for (let i = 0; i < 12; i++) monthlyBudget[i] = monthlyBudgetAvg;
    }

    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyPerformance = monthNames
      .map((label, i) => {
        const budget = monthlyBudget[i];
        const actual = monthlyActual[i];
        const perf = budget > 0 ? Math.round((actual / budget) * 100) : 0;
        return { label, value: perf, budget, actual };
      })
      .filter(d => d.actual > 0 || d.budget > 0);

    return {
      totalBudgeted,
      totalActual,
      monthlyPerformance,
      revenueActual,
      chargesActual,
      investActual,
    };
  }, [budgetLines, journalEntries]);

  // ═══ ONGLET TENDANCES ════════════════════════════
  const tendancesData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyRevenue = new Array(12).fill(0);
    const monthlyCharges = new Array(12).fill(0);
    const monthlyResult = new Array(12).fill(0);

    for (const entry of journalEntries) {
      if (!entry.lines) continue;
      const month = new Date(entry.date).getMonth();
      for (const line of entry.lines) {
        if (line.accountCode?.startsWith('7')) {
          const val = (line.credit || 0) - (line.debit || 0);
          monthlyRevenue[month] += val;
        }
        if (line.accountCode?.startsWith('6')) {
          const val = (line.debit || 0) - (line.credit || 0);
          monthlyCharges[month] += val;
        }
      }
    }
    for (let i = 0; i < 12; i++) monthlyResult[i] = monthlyRevenue[i] - monthlyCharges[i];

    return monthNames.map((label, i) => ({
      label,
      revenue: monthlyRevenue[i],
      charges: monthlyCharges[i],
      result: monthlyResult[i],
    })).filter(d => d.revenue > 0 || d.charges > 0);
  }, [journalEntries]);

  // ═══ ONGLET ANALYSE DES ECARTS ══════════════════
  const ecartsData = useMemo(() => {
    const grouped = new Map<string, { label: string; budget: number; actual: number }>();
    for (const bl of budgetLines) {
      const cat = bl.category || bl.label || bl.account_label || 'Divers';
      const existing = grouped.get(cat) || { label: cat, budget: 0, actual: 0 };
      existing.budget += bl.amount || bl.total_budget || bl.budgeted || 0;
      existing.actual += bl.consumed || bl.total_consumed || 0;
      grouped.set(cat, existing);
    }
    return Array.from(grouped.values()).map(d => ({
      ...d,
      ecart: d.budget - d.actual,
      ecartPct: d.budget > 0 ? Math.round(((d.actual - d.budget) / d.budget) * 100) : 0,
    }));
  }, [budgetLines]);

  const formatValue = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M FCFA`;
    if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K FCFA`;
    return `${v} FCFA`;
  };

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-6">
        {/* Header */}
        <SectionHeader
          title="Budget & Previsions"
          subtitle="Elaboration, suivi et controle budgetaire"
          icon={Target}
        />

        {/* Tab Navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-[var(--color-border)]">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                    : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══ TAB: Elaboration & Creation ═══ */}
        {activeTab === 'elaboration' && (
          <Suspense fallback={<TabLoader />}>
            <BudgetsPage />
          </Suspense>
        )}

        {/* ═══ TAB: Overview ═══ */}
        {activeTab === 'overview' && (
          <Suspense fallback={<TabLoader />}>
            <BudgetRecapPage />
          </Suspense>
        )}

        {/* ═══ TAB: Controle ═══ */}
        {activeTab === 'controle' && (
          <Suspense fallback={<TabLoader />}>
            <BudgetControlPage />
          </Suspense>
        )}

        {/* ═══ TAB: Centres de Couts ═══ */}
        {activeTab === 'centres-couts' && (
          <Suspense fallback={<TabLoader />}>
            <CostCentersPage />
          </Suspense>
        )}

        {/* ═══ TAB: Tendances ═══ */}
        {activeTab === 'tendances' && (
          <div className="space-y-6">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <KPICard
                title="Revenus Cumules"
                value={formatValue(tendancesData.reduce((s, d) => s + d.revenue, 0))}
                subtitle="Total exercice"
                icon={TrendingUp}
                color="success"
                delay={0.1}
              />
              <KPICard
                title="Charges Cumulees"
                value={formatValue(tendancesData.reduce((s, d) => s + d.charges, 0))}
                subtitle="Total exercice"
                icon={TrendingDown}
                color="warning"
                delay={0.2}
              />
              <KPICard
                title="Resultat Cumule"
                value={formatValue(tendancesData.reduce((s, d) => s + d.result, 0))}
                subtitle="Revenus - Charges"
                icon={BarChart3}
                color="primary"
                delay={0.3}
              />
              <KPICard
                title="Mois Analyses"
                value={`${tendancesData.length}`}
                subtitle="Mois avec donnees"
                icon={Calendar}
                color="neutral"
                delay={0.4}
              />
            </div>

            <ModernChartCard
              title="Tendance Revenus vs Charges"
              subtitle="Evolution mensuelle comparee"
              icon={TrendingUp}
            >
              {tendancesData.length > 0 ? (
                <ColorfulBarChart
                  data={tendancesData.map(d => ({
                    label: d.label,
                    value: d.revenue > 0 ? Math.round((d.result / d.revenue) * 100) : 0,
                    color: d.result >= 0 ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]',
                  }))}
                  height={200}
                />
              ) : (
                <p className="text-center text-[var(--color-text-tertiary)] py-12">Aucune donnee disponible</p>
              )}
            </ModernChartCard>

            <UnifiedCard variant="glass" size="lg">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Detail Mensuel</h3>
                <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--color-surface-hover)]">
                        <tr>
                          <th className="text-left p-4 font-bold text-[var(--color-text-secondary)] text-sm">Mois</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Revenus</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Charges</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Resultat</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Marge %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-light)]">
                        {tendancesData.map((d, i) => {
                          const marge = d.revenue > 0 ? Math.round((d.result / d.revenue) * 100) : 0;
                          return (
                            <tr key={i} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                              <td className="p-4 font-medium text-[var(--color-text-primary)]">{d.label}</td>
                              <td className="p-4 text-right text-[var(--color-success)] font-semibold">{formatValue(d.revenue)}</td>
                              <td className="p-4 text-right text-[var(--color-error)] font-semibold">{formatValue(d.charges)}</td>
                              <td className={`p-4 text-right font-bold ${d.result >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>{formatValue(d.result)}</td>
                              <td className="p-4 text-right">
                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${marge >= 10 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' : marge >= 0 ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' : 'bg-[var(--color-error-light)] text-[var(--color-error)]'}`}>
                                  {marge}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {tendancesData.length === 0 && (
                          <tr><td colSpan={5} className="p-6 text-center text-[var(--color-text-tertiary)]">Aucune donnee</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </UnifiedCard>
          </div>
        )}

        {/* ═══ TAB: Analyse des Ecarts ═══ */}
        {activeTab === 'ecarts' && (
          <div className="space-y-6">
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <KPICard
                title="Budget Total"
                value={formatValue(ecartsData.reduce((s, d) => s + d.budget, 0))}
                subtitle="Toutes categories"
                icon={Target}
                color="primary"
                delay={0.1}
              />
              <KPICard
                title="Realise Total"
                value={formatValue(ecartsData.reduce((s, d) => s + d.actual, 0))}
                subtitle="Consomme"
                icon={BarChart3}
                color="success"
                delay={0.2}
              />
              <KPICard
                title="Ecart Total"
                value={formatValue(ecartsData.reduce((s, d) => s + d.ecart, 0))}
                subtitle={ecartsData.reduce((s, d) => s + d.ecart, 0) >= 0 ? 'Sous-consommation' : 'Depassement'}
                icon={ArrowUpDown}
                color="warning"
                delay={0.3}
              />
              <KPICard
                title="Postes en Depassement"
                value={`${ecartsData.filter(d => d.ecartPct > 0).length}`}
                subtitle={`sur ${ecartsData.length} postes`}
                icon={AlertCircle}
                color="neutral"
                delay={0.4}
              />
            </div>

            <ModernChartCard
              title="Ecarts Budget vs Realise"
              subtitle="Par poste budgetaire"
              icon={GitCompareArrows}
            >
              {ecartsData.length > 0 ? (
                <ColorfulBarChart
                  data={ecartsData.map(d => ({
                    label: d.label.length > 15 ? d.label.substring(0, 15) + '...' : d.label,
                    value: Math.abs(d.ecartPct),
                    color: d.ecartPct > 10 ? 'bg-[var(--color-error)]' : d.ecartPct > 0 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]',
                  }))}
                  height={200}
                />
              ) : (
                <p className="text-center text-[var(--color-text-tertiary)] py-12">Aucune donnee budgetaire disponible</p>
              )}
            </ModernChartCard>

            <UnifiedCard variant="glass" size="lg">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Detail des Ecarts par Poste</h3>
                  <ElegantButton variant="outline" size="sm" icon={Download}>
                    Exporter
                  </ElegantButton>
                </div>
                <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[var(--color-surface-hover)]">
                        <tr>
                          <th className="text-left p-4 font-bold text-[var(--color-text-secondary)] text-sm">Poste</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Budget</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Realise</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Ecart</th>
                          <th className="text-right p-4 font-bold text-[var(--color-text-secondary)] text-sm">Ecart %</th>
                          <th className="text-center p-4 font-bold text-[var(--color-text-secondary)] text-sm">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-light)]">
                        {ecartsData.map((d, i) => (
                          <tr key={i} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                            <td className="p-4 font-medium text-[var(--color-text-primary)]">{d.label}</td>
                            <td className="p-4 text-right font-semibold text-[var(--color-text-secondary)]">{formatValue(d.budget)}</td>
                            <td className="p-4 text-right font-semibold text-[var(--color-text-secondary)]">{formatValue(d.actual)}</td>
                            <td className={`p-4 text-right font-bold ${d.ecart >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                              {d.ecart >= 0 ? '+' : ''}{formatValue(d.ecart)}
                            </td>
                            <td className="p-4 text-right">
                              <span className={`font-bold ${d.ecartPct > 10 ? 'text-[var(--color-error)]' : d.ecartPct > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                                {d.ecartPct > 0 ? '+' : ''}{d.ecartPct}%
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                                d.ecartPct > 10 ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' :
                                d.ecartPct > 0 ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' :
                                d.ecartPct > -10 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                                'bg-[var(--color-info-light)] text-[var(--color-info)]'
                              }`}>
                                {d.ecartPct > 10 ? 'Depassement' : d.ecartPct > 0 ? 'Attention' : d.ecartPct > -10 ? 'Conforme' : 'Sous-exec.'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {ecartsData.length === 0 && (
                          <tr><td colSpan={6} className="p-6 text-center text-[var(--color-text-tertiary)]">Aucune ligne budgetaire enregistree</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </UnifiedCard>
          </div>
        )}

        {/* ═══ TAB: Tableau de Bord (contenu original) ═══ */}
        {activeTab === 'dashboard' && <>

        {/* Period selector */}
        <div className="flex gap-3 justify-end">
          {(['month', 'quarter', 'year'] as const).map((p) => (
            <ElegantButton
              key={p}
              variant={period === p ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Annee'}
            </ElegantButton>
          ))}
        </div>

        {/* KPIs */}
        {(() => {
          const budgetTotal = dashboardData.totalBudgeted;
          const realise = dashboardData.totalActual;
          const ecart = budgetTotal - realise;
          const performance = budgetTotal > 0 ? Math.round((realise / budgetTotal) * 100) : 0;
          return (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <KPICard
                title="Budget Total"
                value={formatValue(budgetTotal)}
                subtitle={`Periode: ${period === 'month' ? 'Mois' : period === 'quarter' ? 'Trimestre' : 'Annee'}`}
                icon={DollarSign}
                color="primary"
                delay={0.1}
                withChart={true}
              />

              <KPICard
                title="Realise"
                value={formatValue(realise)}
                subtitle={`${performance}% du budget`}
                icon={BarChart3}
                trend={budgetTotal > 0 ? { value: `${performance}%`, isPositive: performance >= 80 } : undefined}
                color="success"
                delay={0.2}
                withChart={true}
              />

              <KPICard
                title="Ecart"
                value={formatValue(ecart)}
                subtitle={ecart > 0 ? 'Sous-realisation' : ecart < 0 ? 'Depassement' : "A l'equilibre"}
                icon={Target}
                trend={budgetTotal > 0 ? { value: `${ecart > 0 ? '-' : '+'}${Math.round(Math.abs(ecart) / budgetTotal * 100)}%`, isPositive: ecart <= 0 } : undefined}
                color="warning"
                delay={0.3}
                withChart={true}
              />

              <KPICard
                title="Performance"
                value={`${performance}%`}
                subtitle="Objectif: 85%"
                icon={TrendingUp}
                color="neutral"
                delay={0.4}
                withChart={true}
              />
            </div>
          );
        })()}

        {/* Monthly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Evolution Budgetaire Mensuelle"
            subtitle="Comparaison Budget vs Realise par mois"
            icon={BarChart3}
          >
            <ColorfulBarChart
              data={dashboardData.monthlyPerformance.length > 0
                ? dashboardData.monthlyPerformance.map(d => ({
                    label: d.label,
                    value: d.value,
                    color: d.value >= 90 ? 'bg-[var(--color-success)]' : d.value >= 75 ? 'bg-green-400' : d.value >= 60 ? 'bg-yellow-400' : 'bg-orange-400',
                  }))
                : [{ label: '\u2014', value: 0, color: 'bg-neutral-300' }]
              }
              height={180}
            />
          </ModernChartCard>
        </motion.div>

        {/* Performance by Category */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <UnifiedCard variant="glass" size="lg" hover>
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/90">
                    <PieChart className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Performance par Categorie</h2>
                    <p className="text-neutral-600">Analyse detaillee des realisations</p>
                  </div>
                </div>
                <ElegantButton variant="outline" size="sm" icon={Download}>
                  Exporter
                </ElegantButton>
              </div>

              {(() => {
                const revPct = dashboardData.totalBudgeted > 0 ? Math.round((dashboardData.revenueActual / (dashboardData.totalBudgeted * 0.5)) * 100) : 0;
                const chgPct = dashboardData.totalBudgeted > 0 ? Math.round((dashboardData.chargesActual / (dashboardData.totalBudgeted * 0.4)) * 100) : 0;
                const invPct = dashboardData.totalBudgeted > 0 ? Math.round((dashboardData.investActual / (dashboardData.totalBudgeted * 0.1)) * 100) : 0;
                return (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Revenus</h3>
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-bold text-emerald-700">{dashboardData.totalBudgeted > 0 ? `${revPct}%` : 'N/A'}</p>
                    <p className="text-sm text-neutral-600">{revPct > 100 ? `Objectif depasse de ${revPct - 100}%` : revPct > 0 ? `${100 - revPct}% restant` : 'Aucune donnee'}</p>
                    <div className="w-full bg-emerald-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(revPct, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Charges</h3>
                    <div className="p-2 bg-[var(--color-primary-lighter)] rounded-xl">
                      <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-bold text-[var(--color-primary-dark)]">{dashboardData.totalBudgeted > 0 ? `${chgPct}%` : 'N/A'}</p>
                    <p className="text-sm text-neutral-600">{chgPct <= 100 ? 'Sous controle' : 'Depassement'}</p>
                    <div className="w-full bg-[var(--color-primary-lighter)] rounded-full h-2">
                      <div className="bg-[var(--color-primary)] h-2 rounded-full" style={{ width: `${Math.min(chgPct, 100)}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Investissements</h3>
                    <div className="p-2 bg-amber-100 rounded-xl">
                      <Target className="h-5 w-5 text-amber-600" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-bold text-amber-700">{dashboardData.totalBudgeted > 0 ? `${invPct}%` : 'N/A'}</p>
                    <p className="text-sm text-neutral-600">{invPct < 80 ? 'En retard' : invPct <= 100 ? 'En bonne voie' : 'Depassement'}</p>
                    <div className="w-full bg-amber-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(invPct, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
                );
              })()}
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/90">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Actions Rapides</h2>
                  <p className="text-neutral-600">Acces direct aux fonctionnalites essentielles</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/budgeting/list" className="group">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="bg-white/90"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Target className="h-8 w-8 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">Gerer Budgets</h3>
                        <p className="text-sm text-slate-600 mt-1">Creer et modifier</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/budgeting/control" className="group">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="bg-white/90"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-[var(--color-success-lighter)] rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <BarChart3 className="h-8 w-8 text-[var(--color-success)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--color-success-darker)] text-lg">Controle</h3>
                        <p className="text-sm text-[var(--color-success)] mt-1">Suivi et analyse</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <div className="group cursor-pointer">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="bg-white/90"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <PieChart className="h-8 w-8 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">Rapports</h3>
                        <p className="text-sm text-slate-600 mt-1">Analyses detaillees</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="group cursor-pointer">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="bg-white/90"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-amber-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <AlertCircle className="h-8 w-8 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-800 text-lg">Alertes</h3>
                        <p className="text-sm text-amber-600 mt-1">Notifications</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Budget Execution Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <UnifiedCard variant="glass" size="lg">
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/90">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">Execution Budgetaire</h2>
                    <p className="text-neutral-600">Suivi detaille par poste</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ElegantButton variant="outline" size="sm" icon={Filter}>
                    Filtres
                  </ElegantButton>
                  <ElegantButton variant="primary" size="sm" icon={Download}>
                    Exporter
                  </ElegantButton>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-neutral-200/60">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-neutral-50 to-neutral-100">
                      <tr>
                        <th className="text-left p-6 font-bold text-neutral-700">Poste Budgetaire</th>
                        <th className="text-left p-6 font-bold text-neutral-700">Responsable</th>
                        <th className="text-right p-6 font-bold text-neutral-700">{t('navigation.budget')}</th>
                        <th className="text-right p-6 font-bold text-neutral-700">Realise</th>
                        <th className="text-right p-6 font-bold text-neutral-700">Performance</th>
                        <th className="text-center p-6 font-bold text-neutral-700">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {budgetLines.length > 0 ? budgetLines.slice(0, 10).map((bl: any, idx: number) => {
                        const budgeted = bl.amount || bl.total_budget || bl.budgeted || 0;
                        const actual = bl.consumed || bl.total_consumed || 0;
                        const perf = budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
                        const formatVal = (v: number) => {
                          if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
                          if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                          return v.toString();
                        };
                        const statusLabel = perf >= 90 ? 'Excellent' : perf >= 70 ? 'En bonne voie' : perf >= 50 ? 'A surveiller' : 'Critique';
                        const statusColor = perf >= 90 ? 'bg-emerald-100 text-emerald-800' : perf >= 70 ? 'bg-blue-100 text-blue-800' : perf >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]';
                        return (
                        <tr key={bl.id || idx} className="hover:bg-[var(--color-primary-lightest)]/30 transition-colors duration-200">
                          <td className="p-6">
                            <div className="space-y-1">
                              <p className="font-semibold text-neutral-900">{bl.label || bl.account_label || bl.category || `Ligne ${idx + 1}`}</p>
                              <p className="text-sm text-neutral-500">{bl.code || bl.account_number || bl.id?.substring(0, 8) || ''}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
                                <Users className="h-4 w-4 text-[var(--color-primary)]" />
                              </div>
                              <span className="font-medium text-neutral-700">{'\u2014'}</span>
                            </div>
                          </td>
                          <td className="text-right p-6">
                            <span className="font-bold text-neutral-700 text-lg">{formatVal(budgeted)} FCFA</span>
                          </td>
                          <td className="text-right p-6">
                            <span className={`font-bold text-lg ${perf >= 80 ? 'text-emerald-700' : perf >= 50 ? 'text-amber-700' : 'text-[var(--color-error-dark)]'}`}>{formatVal(actual)} FCFA</span>
                          </td>
                          <td className="text-right p-6">
                            <div className="flex items-center justify-end space-x-2">
                              {perf >= 80 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-amber-600" />}
                              <span className={`font-bold text-lg ${perf >= 80 ? 'text-emerald-700' : perf >= 50 ? 'text-amber-700' : 'text-[var(--color-error-dark)]'}`}>{perf}%</span>
                            </div>
                          </td>
                          <td className="text-center p-6">
                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-neutral-500">
                            Aucune ligne budgetaire enregistree
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>

        </>}
      </div>
    </PageContainer>
  );
};

export default BudgetingDashboard;
