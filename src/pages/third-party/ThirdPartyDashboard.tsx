import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users,
  UserPlus,
  Building,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Phone,
  Target
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
import { thirdPartyService } from '../../services/thirdparty.service';
import { formatCurrency, formatDate } from '../../lib/utils';

const ThirdPartyDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');

  // Fetch third party statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['third-party', 'dashboard-stats'],
    queryFn: thirdPartyService.getDashboardStats,
  });

  // Fetch recent customers
  const { data: recentCustomers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['third-party', 'recent-customers'],
    queryFn: () => thirdPartyService.getRecentCustomers(5),
  });

  // Fetch aged receivables
  const { data: agedReceivables, isLoading: isLoadingReceivables } = useQuery({
    queryKey: ['third-party', 'aged-receivables'],
    queryFn: thirdPartyService.getAgedReceivables,
  });

  if (isLoadingStats) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-sm"
          >
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du module tiers...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header épuré */}
        <SectionHeader
          title="Module Tiers & Relations Clients"
          subtitle="Gestion intégrée des clients, fournisseurs et partenaires commerciaux"
          icon={Users}
          action={
            <div className="flex gap-3">
              <Link to="/third-party/customers">
                <ElegantButton variant="outline" icon={UserPlus}>
                  Nouveau Client
                </ElegantButton>
              </Link>
              <Link to="/third-party/suppliers">
                <ElegantButton variant="primary" icon={Building}>
                  Nouveau Fournisseur
                </ElegantButton>
              </Link>
            </div>
          }
        />

        {/* KPI Cards épurées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Clients Actifs"
            value={(stats?.total_customers || 847).toString()}
            subtitle={`${stats?.new_customers_month || 23} nouveaux ce mois`}
            icon={Users}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          
          <KPICard
            title="Créances Clients"
            value={formatCurrency(stats?.total_receivables || 15750000)}
            subtitle={`${stats?.overdue_receivables || 12} en retard`}
            icon={CreditCard}
            color="warning"
            delay={0.2}
            withChart={true}
          />
          
          <KPICard
            title="Fournisseurs"
            value={(stats?.total_suppliers || 245).toString()}
            subtitle={`${stats?.active_suppliers || 189} actifs`}
            icon={Building}
            color="neutral"
            delay={0.3}
            withChart={true}
          />
          
          <KPICard
            title="CA Clients"
            value={formatCurrency(stats?.customer_revenue || 28750000)}
            subtitle={`${period === 'month' ? 'Ce mois' : 'Cette année'}`}
            icon={TrendingUp}
            trend={{ value: "+15.2%", isPositive: true }}
            color="success"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Section graphique moderne */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Évolution du Chiffre d'Affaires Clients"
            subtitle="Performance mensuelle par segment client"
            icon={TrendingUp}
          >
            <ColorfulBarChart
              data={[
                { label: 'Jan', value: 2100, color: 'bg-blue-400' },
                { label: 'Fév', value: 2300, color: 'bg-green-400' },
                { label: 'Mar', value: 2700, color: 'bg-purple-400' },
                { label: 'Avr', value: 2200, color: 'bg-blue-500' },
                { label: 'Mai', value: 2450, color: 'bg-green-500' },
                { label: 'Juin', value: 2800, color: 'bg-purple-500' },
                { label: 'Juil', value: 2875, color: 'bg-blue-600' }
              ]}
              height={160}
            />
          </ModernChartCard>
        </motion.div>

        {/* Actions rapides épurées */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <UnifiedCard variant="elevated" size="md">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-neutral-800">Actions Rapides</h2>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/third-party/customers" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Gestion Clients</h3>
                        <p className="text-sm text-neutral-500">Fiches & historique</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/third-party/suppliers" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <Building className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Fournisseurs</h3>
                        <p className="text-sm text-neutral-500">Gestion & suivi</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/customers/recovery" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Recouvrement</h3>
                        <p className="text-sm text-neutral-500">Créances échues</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default ThirdPartyDashboard;