import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Package,
  Truck,
  Monitor,
  Wrench
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
import { assetsService } from '../../services/assets.service';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

const AssetsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['assets', 'dashboard', period],
    queryFn: () => assetsService.getDashboardData({ period }),
  });

  const getCategoryIcon = (categorie: string) => {
    switch (categorie) {
      case 'materiel_informatique': return <Monitor className="h-5 w-5" />;
      case 'vehicules': return <Truck className="h-5 w-5" />;
      case 'mobilier': return <Package className="h-5 w-5" />;
      case 'equipements': return <Wrench className="h-5 w-5" />;
      default: return <Building className="h-5 w-5" />;
    }
  };

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
            <p className="text-xl font-semibold text-neutral-700">Chargement du tableau de bord...</p>
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
          title="Tableau de Bord - Immobilisations"
          subtitle="Vue d'ensemble des actifs immobilisés et amortissements"
          icon={Building}
          action={
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
                  {p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année'}
                </button>
              ))}
            </div>
          }
        />

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Valeur Brute"
            value={formatCurrency(dashboardData?.valeur_brute_totale || 0)}
            subtitle="Valeur d'acquisition"
            icon={Building}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title="Amortissements"
            value={formatCurrency(dashboardData?.amortissements_cumules || 0)}
            subtitle="Cumul des dotations"
            icon={TrendingDown}
            color="warning"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title="Valeur Nette"
            value={formatCurrency(dashboardData?.valeur_nette_totale || 0)}
            subtitle="Valeur comptable actuelle"
            icon={DollarSign}
            color="success"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title="Dotations Annuelles"
            value={formatCurrency(dashboardData?.dotations_annuelles || 0)}
            subtitle="Amortissements annuels"
            icon={TrendingUp}
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
                  <p className="text-sm font-medium text-neutral-600">Nombre d'Actifs</p>
                  <p className="text-xl font-bold text-neutral-900">
                    {dashboardData?.nombre_actifs || 0}
                  </p>
                </div>
                <div className="p-3 bg-[var(--color-primary-lighter)] rounded-2xl">
                  <Package className="h-8 w-8 text-[var(--color-primary)]" />
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
                  <p className="text-sm font-medium text-neutral-600">Taux d'Amortissement</p>
                  <p className="text-xl font-bold text-neutral-900">
                    {formatPercentage(dashboardData?.taux_amortissement_moyen || 0)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-2xl">
                  <BarChart3 className="h-8 w-8 text-emerald-600" />
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
                  <p className="text-sm font-medium text-neutral-600">Âge Moyen</p>
                  <p className="text-xl font-bold text-neutral-900">
                    {dashboardData?.age_moyen || 0} ans
                  </p>
                </div>
                <div className="p-3 bg-[var(--color-info-lighter)] rounded-2xl">
                  <Calendar className="h-8 w-8 text-[var(--color-info)]" />
                </div>
              </div>
            </UnifiedCard>
          </motion.div>
        </div>

        {/* Assets Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <ModernChartCard
            title="Répartition par Catégorie d'Actifs"
            subtitle="Distribution de la valeur nette par type d'immobilisation"
            icon={PieChart}
          >
            <ColorfulBarChart
              data={[
                { label: 'Informatique', value: 25750, color: 'bg-blue-400' },
                { label: 'Véhicules', value: 18300, color: 'bg-emerald-400' },
                { label: 'Mobilier', value: 12950, color: 'bg-orange-400' },
                { label: 'Équipements', value: 15200, color: 'bg-purple-400' },
                { label: 'Immobilier', value: 45450, color: 'bg-yellow-400' }
              ]}
              height={200}
            />
          </ModernChartCard>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Assets by Category */}
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <PieChart className="h-6 w-6 text-[var(--color-info)]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Répartition par Catégorie</h2>
                <p className="text-neutral-600">Valeur et nombre d'actifs</p>
              </div>
            </div>
            <div className="space-y-6">
              {dashboardData?.repartition_categories?.map((category, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-6 border border-neutral-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-info-lighter)] rounded-2xl text-[var(--color-info)]">
                      {getCategoryIcon(category.code)}
                    </div>
                    <div>
                      <p className="font-semibold text-neutral-900">{category.nom}</p>
                      <p className="text-sm text-neutral-600">{category.nombre} actif(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neutral-900 text-lg">
                      {formatCurrency(category.valeur_nette)}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-info-lighter)] text-[var(--color-info-dark)]">
                      {formatPercentage(category.pourcentage)}
                    </span>
                  </div>
                </motion.div>
              )) || []}
            </div>
          </UnifiedCard>

          {/* Recent Depreciations */}
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <TrendingDown className="h-6 w-6 text-[var(--color-warning)]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Derniers Amortissements</h2>
                <p className="text-neutral-600">Dotations récentes</p>
              </div>
            </div>
            <div className="space-y-6">
              {dashboardData?.derniers_amortissements?.map((amortissement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 border border-neutral-200 rounded-2xl hover:border-orange-300 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold text-neutral-900">{amortissement.nom_actif}</p>
                    <p className="font-bold text-[var(--color-warning-dark)] text-lg">
                      {formatCurrency(amortissement.montant)}
                    </p>
                  </div>
                  <div className="flex justify-between items-center text-sm text-neutral-600">
                    <span>{formatDate(amortissement.date)} - {amortissement.periode}</span>
                    <span className="font-medium">{amortissement.methode}</span>
                  </div>
                </motion.div>
              )) || []}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-4"
              >
                <Link to="/assets/depreciation">
                  <ElegantButton variant="outline" className="w-full">
                    Voir tous les amortissements
                  </ElegantButton>
                </Link>
              </motion.div>
            </div>
          </UnifiedCard>
        </div>

        {/* Assets Status Overview */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-white/90 rounded-2xl">
                <AlertCircle className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">État des Immobilisations</h2>
                <p className="text-neutral-600">Suivi détaillé par actif</p>
              </div>
            </div>
            <Link to="/assets/fixed-assets">
              <ElegantButton variant="outline">
                Voir tous les actifs
              </ElegantButton>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">Actif</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">Catégorie</th>
                  <th className="text-left py-4 px-2 font-semibold text-neutral-900">Date d'Acquisition</th>
                  <th className="text-right py-4 px-2 font-semibold text-neutral-900">Valeur Brute</th>
                  <th className="text-right py-4 px-2 font-semibold text-neutral-900">Amortissements</th>
                  <th className="text-right py-4 px-2 font-semibold text-neutral-900">Valeur Nette</th>
                  <th className="text-center py-4 px-2 font-semibold text-neutral-900">% Amorti</th>
                  <th className="text-center py-4 px-2 font-semibold text-neutral-900">État</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.actifs_principaux?.map((actif, index) => (
                  <motion.tr
                    key={actif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border-b border-neutral-100 hover:bg-neutral-50"
                  >
                    <td className="py-4 px-2">
                      <div>
                        <p className="font-semibold text-neutral-900">{actif.designation}</p>
                        {actif.numero_serie && (
                          <p className="text-sm text-neutral-600">S/N: {actif.numero_serie}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]">
                        {actif.nom_categorie}
                      </span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-neutral-400 mr-2" />
                        {formatDate(actif.date_acquisition)}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="font-semibold text-neutral-900">
                        {formatCurrency(actif.valeur_acquisition)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="font-semibold text-[var(--color-warning-dark)]">
                        {formatCurrency(actif.amortissements_cumules)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-right">
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(actif.valeur_nette)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <span className="font-medium text-neutral-900">
                        {formatPercentage(actif.pourcentage_amortissement)}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {actif.pourcentage_amortissement >= 100 ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-neutral-600" />
                            <span className="text-sm font-medium text-neutral-600">Amorti</span>
                          </>
                        ) : actif.pourcentage_amortissement >= 80 ? (
                          <>
                            <AlertCircle className="h-4 w-4 text-[var(--color-warning)]" />
                            <span className="text-sm font-medium text-[var(--color-warning-dark)]">Fin de vie</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-700">Actif</span>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )) || []}
              </tbody>
            </table>
          </div>
        </UnifiedCard>

        {/* Quick Actions */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2">Actions Rapides</h2>
            <p className="text-neutral-600">Gestion des immobilisations et amortissements</p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            <Link to="/assets/fixed-assets">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-primary-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Building className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Gérer les Actifs</h3>
                <p className="text-sm text-neutral-600">Ajouter, modifier, consulter</p>
              </motion.div>
            </Link>

            <Link to="/assets/depreciation">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-warning-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <TrendingDown className="h-6 w-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Amortissements</h3>
                <p className="text-sm text-neutral-600">Calculs et suivi</p>
              </motion.div>
            </Link>

            <Link to="/assets/reports">
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
                <p className="text-sm text-neutral-600">États et analyses</p>
              </motion.div>
            </Link>

            <Link to="/assets/alerts">
              <motion.div
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-red-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-error-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <AlertCircle className="h-6 w-6 text-[var(--color-error)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Alertes</h3>
                <p className="text-sm text-neutral-600">Maintenance et renouvellement</p>
              </motion.div>
            </Link>
          </div>
        </UnifiedCard>
      </div>
    </PageContainer>
  );
};

export default AssetsDashboard;