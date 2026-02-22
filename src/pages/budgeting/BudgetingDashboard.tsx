import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
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
import { budgetService } from '../../services/budget.service';
import { Link } from 'react-router-dom';

const BudgetingDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['budgeting', 'dashboard', period],
    queryFn: () => budgetService.getDashboardData({ period }),
  });

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
        {/* Header unifié */}
        <SectionHeader
          title="Tableau de Bord Budgétaire"
          subtitle="📊 Suivi et contrôle budgétaire en temps réel"
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
                  {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année'}
                </ElegantButton>
              ))}
            </div>
          }
        />

        {/* KPIs modernes avec graphiques */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Budget Total"
            value="15.75M €"
            subtitle="Exercice 2024"
            icon={DollarSign}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          
          <KPICard
            title="Réalisé"
            value="12.45M €"
            subtitle="79% du budget"
            icon={BarChart3}
            trend={{ value: "+8.2%", isPositive: true }}
            color="success"
            delay={0.2}
            withChart={true}
          />
          
          <KPICard
            title="Écart"
            value="3.30M €"
            subtitle="Sous-réalisation"
            icon={Target}
            trend={{ value: "-21%", isPositive: false }}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          
          <KPICard
            title="Performance"
            value="79%"
            subtitle="Objectif: 85%"
            icon={TrendingUp}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Section graphique budgétaire moderne */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Évolution Budgétaire Mensuelle"
            subtitle="Comparaison Budget vs Réalisé par mois"
            icon={BarChart3}
          >
            <ColorfulBarChart
              data={[
                { label: 'Jan', value: 85, color: 'bg-green-400' },
                { label: 'Fév', value: 78, color: 'bg-yellow-400' },
                { label: 'Mar', value: 92, color: 'bg-[var(--color-success)]' },
                { label: 'Avr', value: 65, color: 'bg-orange-400' },
                { label: 'Mai', value: 88, color: 'bg-green-400' },
                { label: 'Juin', value: 73, color: 'bg-[var(--color-warning)]' },
                { label: 'Juil', value: 96, color: 'bg-[var(--color-success)]' }
              ]}
              height={180}
            />
          </ModernChartCard>
        </motion.div>

        {/* Performance détaillée */}
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
                    <h2 className="text-lg font-bold text-neutral-900">Performance par Catégorie</h2>
                    <p className="text-neutral-600">Analyse détaillée des réalisations</p>
                  </div>
                </div>
                <ElegantButton variant="outline" size="sm" icon={Download}>
                  Exporter
                </ElegantButton>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/40">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-neutral-800">Revenus</h3>
                    <div className="p-2 bg-emerald-100 rounded-xl">
                      <TrendingUp className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-bold text-emerald-700">102%</p>
                    <p className="text-sm text-neutral-600">Objectif dépassé de 2%</p>
                    <div className="w-full bg-emerald-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full w-full"></div>
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
                    <p className="text-lg font-bold text-[var(--color-primary-dark)]">94%</p>
                    <p className="text-sm text-neutral-600">Sous contrôle</p>
                    <div className="w-full bg-[var(--color-primary-lighter)] rounded-full h-2">
                      <div className="bg-[var(--color-primary)] h-2 rounded-full w-[94%]"></div>
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
                    <p className="text-lg font-bold text-amber-700">67%</p>
                    <p className="text-sm text-neutral-600">En retard</p>
                    <div className="w-full bg-amber-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full w-[67%]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Actions rapides unifiées */}
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
                  <p className="text-neutral-600">Accès direct aux fonctionnalités essentielles</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/budgeting/budgets" className="group">
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="bg-white/90"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-slate-100 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Target className="h-8 w-8 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">Gérer Budgets</h3>
                        <p className="text-sm text-slate-600 mt-1">Créer et modifier</p>
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
                        <h3 className="font-bold text-[var(--color-success-darker)] text-lg">Contrôle</h3>
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
                        <p className="text-sm text-slate-600 mt-1">Analyses détaillées</p>
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

        {/* Tableau de suivi unifié */}
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
                    <h2 className="text-lg font-bold text-neutral-900">Exécution Budgétaire</h2>
                    <p className="text-neutral-600">Suivi détaillé par poste</p>
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

              {/* Table responsive moderne */}
              <div className="overflow-hidden rounded-2xl border border-neutral-200/60">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-neutral-50 to-neutral-100">
                      <tr>
                        <th className="text-left p-6 font-bold text-neutral-700">Poste Budgétaire</th>
                        <th className="text-left p-6 font-bold text-neutral-700">Responsable</th>
                        <th className="text-right p-6 font-bold text-neutral-700">{t('navigation.budget')}</th>
                        <th className="text-right p-6 font-bold text-neutral-700">Réalisé</th>
                        <th className="text-right p-6 font-bold text-neutral-700">Performance</th>
                        <th className="text-center p-6 font-bold text-neutral-700">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      <tr className="hover:bg-[var(--color-primary-lightest)]/30 transition-colors duration-200">
                        <td className="p-6">
                          <div className="space-y-1">
                            <p className="font-semibold text-neutral-900">Ventes Produits</p>
                            <p className="text-sm text-neutral-500">REV-001</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-[var(--color-primary-lighter)] rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-[var(--color-primary)]" />
                            </div>
                            <span className="font-medium text-neutral-700">—</span>
                          </div>
                        </td>
                        <td className="text-right p-6">
                          <span className="font-bold text-neutral-700 text-lg">5.20M €</span>
                        </td>
                        <td className="text-right p-6">
                          <span className="font-bold text-emerald-700 text-lg">5.80M €</span>
                        </td>
                        <td className="text-right p-6">
                          <div className="flex items-center justify-end space-x-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600" />
                            <span className="font-bold text-emerald-700 text-lg">112%</span>
                          </div>
                        </td>
                        <td className="text-center p-6">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
                            Excellent
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-[var(--color-primary-lightest)]/30 transition-colors duration-200">
                        <td className="p-6">
                          <div className="space-y-1">
                            <p className="font-semibold text-neutral-900">Marketing Digital</p>
                            <p className="text-sm text-neutral-500">CHG-003</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-[var(--color-info-lighter)] rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-[var(--color-info)]" />
                            </div>
                            <span className="font-medium text-neutral-700">—</span>
                          </div>
                        </td>
                        <td className="text-right p-6">
                          <span className="font-bold text-neutral-700 text-lg">450K €</span>
                        </td>
                        <td className="text-right p-6">
                          <span className="font-bold text-amber-700 text-lg">380K €</span>
                        </td>
                        <td className="text-right p-6">
                          <div className="flex items-center justify-end space-x-2">
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                            <span className="font-bold text-amber-700 text-lg">84%</span>
                          </div>
                        </td>
                        <td className="text-center p-6">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-800">
                            À surveiller
                          </span>
                        </td>
                      </tr>

                      <tr className="hover:bg-[var(--color-primary-lightest)]/30 transition-colors duration-200">
                        <td className="p-6">
                          <div className="space-y-1">
                            <p className="font-semibold text-neutral-900">Infrastructure IT</p>
                            <p className="text-sm text-neutral-500">INV-007</p>
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-[var(--color-error-lighter)] rounded-full flex items-center justify-center">
                              <Users className="h-4 w-4 text-[var(--color-error)]" />
                            </div>
                            <span className="font-medium text-neutral-700">M. Tech</span>
                          </div>
                        </td>
                        <td className="text-right p-6">
                          <span className="font-bold text-neutral-700 text-lg">1.2M €</span>
                        </td>
                        <td className="text-right p-6">
                          <span className="font-bold text-[var(--color-error-dark)] text-lg">650K €</span>
                        </td>
                        <td className="text-right p-6">
                          <div className="flex items-center justify-end space-x-2">
                            <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />
                            <span className="font-bold text-[var(--color-error-dark)] text-lg">54%</span>
                          </div>
                        </td>
                        <td className="text-center p-6">
                          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-[var(--color-error-lighter)] text-[var(--color-error-darker)]">
                            Critique
                          </span>
                        </td>
                      </tr>
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