import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Target,
  Layers,
  Users,
  DollarSign,
  Calendar,
  Filter,
  Download
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
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

const AnalyticsDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [axeFilter, setAxeFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const je = await adapter.getAll('journalEntries');
        setJournalEntries(je as any[]);
      } catch (e) {
        console.error('AnalyticsDashboard load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [adapter]);

  const dashboardData = useMemo(() => {
    let chiffre_affaires = 0;
    let couts_directs = 0;
    const costByPrefix: Record<string, number> = {};

    for (const entry of journalEntries) {
      if (!entry.lines) continue;
      for (const line of entry.lines) {
        if (line.accountCode?.startsWith('7')) {
          chiffre_affaires += (line.credit || 0) - (line.debit || 0);
        }
        if (line.accountCode?.startsWith('6')) {
          const amount = (line.debit || 0) - (line.credit || 0);
          couts_directs += amount;
          const prefix = line.accountCode?.substring(0, 2) || '6X';
          costByPrefix[prefix] = (costByPrefix[prefix] || 0) + amount;
        }
      }
    }

    const marge_brute = chiffre_affaires - couts_directs;
    const taux_marge = chiffre_affaires > 0 ? (marge_brute / chiffre_affaires) * 100 : 0;
    const rentabilite_globale = taux_marge;

    const costCenterColors = ['bg-emerald-400', 'bg-blue-400', 'bg-purple-400', 'bg-orange-400', 'bg-yellow-400', 'bg-red-400', 'bg-pink-400'];
    const accountLabels: Record<string, string> = {
      '60': 'Achats', '61': 'Services ext.', '62': 'Autres services', '63': 'Impots',
      '64': 'Personnel', '65': 'Autres charges', '66': 'Charges fin.', '67': 'Charges except.',
      '68': 'Dotations', '69': 'Participation',
    };
    const costCenterChart = Object.entries(costByPrefix)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([prefix, value], i) => ({
        label: accountLabels[prefix] || `Compte ${prefix}x`,
        value: Math.round(Math.abs(value) / 1000),
        color: costCenterColors[i % costCenterColors.length],
      }));

    return {
      chiffre_affaires,
      couts_directs,
      marge_brute,
      taux_marge,
      nombre_axes: 0,
      nombre_centres: 0,
      ecritures_ventilees: 0,
      rentabilite_globale,
      evolution_rentabilite: 0,
      indice_productivite: chiffre_affaires > 0 && couts_directs > 0 ? +(chiffre_affaires / couts_directs).toFixed(2) : 0,
      taux_efficacite: 0,
      top_centres: [] as any[],
      repartition_couts: [] as any[],
      dernieres_ventilations: [] as any[],
      costCenterChart: costCenterChart.length > 0 ? costCenterChart : [{ label: '\u2014', value: 0, color: 'bg-neutral-300' }],
    };
  }, [journalEntries]);

  if (isLoading) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-6 bg-white/90 backdrop-blur-sm p-12 rounded-xl shadow-md"
          >
            <div className="w-20 h-20 border-4 border-[var(--color-primary-light)] border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-neutral-700">Chargement du tableau de bord analytique...</p>
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
          title="Tableau de Bord Analytique"
          subtitle="Vue d'ensemble de la comptabilite analytique par axes et centres"
          icon={BarChart3}
          action={
            <div className="flex items-center space-x-4">
              <div className="flex bg-white rounded-2xl p-1 shadow-lg border border-neutral-200">
                {(['month', 'quarter', 'year'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      period === p
                        ? 'bg-[var(--color-primary)] text-white shadow-md'
                        : 'text-neutral-600 hover:text-[var(--color-primary)]'
                    }`}
                  >
                    {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Annee'}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Chiffre d'Affaires"
            value={formatCurrency(dashboardData.chiffre_affaires)}
            subtitle="Performance globale"
            icon={DollarSign}
            color="success"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title="Couts Directs"
            value={formatCurrency(dashboardData.couts_directs)}
            subtitle="Charges operationnelles"
            icon={TrendingDown}
            color="warning"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title="Marge Brute"
            value={formatCurrency(dashboardData.marge_brute)}
            subtitle="Benefice brut"
            icon={TrendingUp}
            color="primary"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title="Taux de Marge"
            value={formatPercentage(dashboardData.taux_marge)}
            subtitle="Rentabilite"
            icon={Target}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <UnifiedCard variant="elevated" size="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Axes Analytiques</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {dashboardData.nombre_axes}
                  </p>
                </div>
                <div className="p-3 bg-[var(--color-primary-lighter)] rounded-2xl">
                  <Layers className="h-8 w-8 text-[var(--color-primary)]" />
                </div>
              </div>
            </UnifiedCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <UnifiedCard variant="elevated" size="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Centres de Couts</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {dashboardData.nombre_centres}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-2xl">
                  <Users className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
            </UnifiedCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <UnifiedCard variant="elevated" size="md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-600">Ecritures Ventilees</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {dashboardData.ecritures_ventilees}
                  </p>
                </div>
                <div className="p-3 bg-[var(--color-info-lighter)] rounded-2xl">
                  <BarChart3 className="h-8 w-8 text-[var(--color-info)]" />
                </div>
              </div>
            </UnifiedCard>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <ModernChartCard
            title="Performance par Centres de Couts"
            subtitle="Repartition de la rentabilite par centre analytique"
            icon={PieChart}
          >
            <ColorfulBarChart
              data={dashboardData.costCenterChart}
              height={200}
            />
          </ModernChartCard>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Top Performing Centers */}
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Top Centres de Couts</h2>
                <p className="text-neutral-600">Meilleure performance</p>
              </div>
            </div>
            <div className="space-y-6">
              {dashboardData.top_centres?.length > 0 ? dashboardData.top_centres.map((centre: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-6 border border-neutral-200 rounded-2xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl text-emerald-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{centre.nom}</p>
                      <p className="text-sm text-neutral-600">{centre.code_axe} - {centre.nom_axe}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700 text-lg">
                      {formatCurrency(centre.marge)}
                    </p>
                    <div className="flex items-center space-x-1">
                      {centre.variation > 0 ? <TrendingUp className="h-4 w-4 text-emerald-600" /> : <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />}
                      <span className="text-sm text-neutral-600">
                        {formatPercentage(centre.taux_marge)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <p className="text-neutral-500 text-center py-4">Aucune donnee de centre analytique</p>
              )}
            </div>
          </UnifiedCard>

          {/* Cost Distribution */}
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <PieChart className="h-6 w-6 text-[var(--color-info)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Repartition des Couts</h2>
                <p className="text-neutral-600">Par categorie</p>
              </div>
            </div>
            <div className="space-y-6">
              {dashboardData.repartition_couts?.length > 0 ? dashboardData.repartition_couts.map((cout: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-6 border-l-4 bg-neutral-50 rounded-2xl"
                  style={{ borderLeftColor: `hsl(${index * 60}, 70%, 50%)` }}
                >
                  <div>
                    <p className="font-semibold text-neutral-900">{cout.categorie}</p>
                    <p className="text-sm text-neutral-600">{cout.nb_centres} centre(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neutral-900 text-lg">
                      {formatCurrency(cout.montant)}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-info-lighter)] text-[var(--color-info-dark)]">
                      {formatPercentage(cout.pourcentage)}
                    </span>
                  </div>
                </motion.div>
              )) : (
                <p className="text-neutral-500 text-center py-4">Aucune donnee de repartition</p>
              )}
            </div>
          </UnifiedCard>
        </div>

        {/* Recent Activities */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/90 rounded-2xl">
                <Calendar className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Dernieres Ventilations Analytiques</h2>
                <p className="text-neutral-600">Activite recente</p>
              </div>
            </div>
            <ElegantButton variant="outline" icon={Download}>
              Exporter
            </ElegantButton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">{t('common.date')}</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">{t('accounting.journal')}</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">N Piece</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">{t('accounting.label')}</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">Centre</th>
                  <th className="text-right py-4 px-2 font-semibold text-neutral-900">Montant</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">Performance</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.dernieres_ventilations?.length > 0 ? dashboardData.dernieres_ventilations.map((ventilation: any, index: number) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="py-4 px-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-neutral-400 mr-2" />
                        {formatDate(ventilation.date)}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]">
                        {ventilation.code_journal}
                      </span>
                    </td>
                    <td className="py-4 px-2 font-mono text-sm">{ventilation.numero_piece}</td>
                    <td className="py-4 px-2">
                      <p className="font-medium text-neutral-900">{ventilation.libelle}</p>
                    </td>
                    <td className="py-4 px-2">
                      <div>
                        <p className="font-medium text-sm">{ventilation.nom_centre}</p>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-[var(--color-info-lighter)] text-[var(--color-info-dark)]">
                          {ventilation.code_axe}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className={`font-semibold ${
                        ventilation.montant >= 0 ? 'text-emerald-700' : 'text-[var(--color-error-dark)]'
                      }`}>
                        {formatCurrency(ventilation.montant)}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          ventilation.performance >= 90 ? 'bg-emerald-500' :
                          ventilation.performance >= 70 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-error)]'
                        }`}></div>
                        <span className="text-sm font-medium text-neutral-900">
                          {ventilation.performance}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500">
                      Aucune ventilation analytique enregistree
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </UnifiedCard>

        {/* Quick Actions */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Actions Rapides</h2>
            <p className="text-neutral-600">Gestion de la comptabilite analytique</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <Link to="/analytics/axes">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-primary-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Layers className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Axes Analytiques</h3>
                <p className="text-sm text-neutral-600">Gerer les dimensions</p>
              </motion.div>
            </Link>

            <Link to="/analytics/cost-centers">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Centres de Couts</h3>
                <p className="text-sm text-neutral-600">Creer et organiser</p>
              </motion.div>
            </Link>

            <Link to="/analytics/reports">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-info-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-6 w-6 text-[var(--color-info)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Rapports</h3>
                <p className="text-sm text-neutral-600">Analyses detaillees</p>
              </motion.div>
            </Link>

            <Link to="/analytics/budgets">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-warning-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Target className="h-6 w-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Budgets</h3>
                <p className="text-sm text-neutral-600">Suivi et controle</p>
              </motion.div>
            </Link>
          </div>
        </UnifiedCard>

        {/* Performance Indicators */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/90 rounded-2xl">
                <Target className="h-6 w-6 text-[var(--color-warning)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Indicateurs de Performance</h2>
                <p className="text-neutral-600">Metriques cles</p>
              </div>
            </div>
            <ElegantButton variant="outline" icon={Download}>
              Exporter
            </ElegantButton>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl border bg-emerald-50/80 border-emerald-200/60"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-emerald-900">Rentabilite Globale</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-emerald-700">
                {formatPercentage(dashboardData.rentabilite_globale)}
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                +{formatPercentage(dashboardData.evolution_rentabilite)} vs periode precedente
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl border bg-[var(--color-primary-lightest)]/80 border-[var(--color-primary-light)]/60"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[var(--color-primary-darker)]">Productivite</span>
                <BarChart3 className="h-4 w-4 text-[var(--color-primary)]" />
              </div>
              <p className="text-lg font-bold text-[var(--color-primary-dark)]">
                {dashboardData.indice_productivite}
              </p>
              <p className="text-sm text-[var(--color-primary)] mt-1">
                Index base sur le CA/cout
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl border bg-[var(--color-info-lightest)]/80 border-purple-200/60"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-purple-900">Efficacite</span>
                <Target className="h-4 w-4 text-[var(--color-info)]" />
              </div>
              <p className="text-lg font-bold text-[var(--color-info-dark)]">
                {formatPercentage(dashboardData.taux_efficacite)}
              </p>
              <p className="text-sm text-[var(--color-info)] mt-1">
                Objectifs atteints
              </p>
            </motion.div>
          </div>
        </UnifiedCard>
      </div>
    </PageContainer>
  );
};

export default AnalyticsDashboard;
