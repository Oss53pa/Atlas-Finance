import React, { useState, useEffect, useMemo } from 'react';
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
  Clock
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

const BudgetingDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
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

  if (isLoading) {
    return (
      <PageContainer background="gradient" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-6 bg-white/90 backdrop-blur-sm p-12 rounded-xl shadow-md"
          >
            <div className="w-20 h-20 border-4 border-[var(--color-primary-light)] border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-neutral-700">Chargement du tableau de bord...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Tableau de Bord Budgetaire"
          subtitle="Suivi et controle budgetaire en temps reel"
          icon={Target}
          action={
            <div className="flex gap-3">
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
          }
        />

        {/* KPIs */}
        {(() => {
          const budgetTotal = dashboardData.totalBudgeted;
          const realise = dashboardData.totalActual;
          const ecart = budgetTotal - realise;
          const performance = budgetTotal > 0 ? Math.round((realise / budgetTotal) * 100) : 0;
          const formatValue = (v: number) => {
            if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M FCFA`;
            if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K FCFA`;
            return `${v} FCFA`;
          };
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
      </div>
    </PageContainer>
  );
};

export default BudgetingDashboard;
