import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Banknote,
  ArrowUpDown,
  TrendingUp,
  Shield,
  Brain,
  Target,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Activity,
  Globe,
  CreditCard,
  Wallet,
  DollarSign
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
import { treasuryService } from '../../services/treasury.service';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';

const TreasuryDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [selectedScenario, setSelectedScenario] = useState('most_likely');

  // Fetch treasury statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['treasury', 'dashboard-stats'],
    queryFn: treasuryService.getDashboardStats,
  });

  // Fetch bank connections
  const { data: bankConnections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['treasury', 'bank-connections'],
    queryFn: treasuryService.getBankConnections,
  });

  // Fetch cash forecast
  const { data: cashForecast, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['treasury', 'cash-forecast', selectedTimeframe],
    queryFn: () => treasuryService.getCashForecast(selectedTimeframe),
  });

  // Fetch reconciliation pending
  const { data: reconciliationPending, isLoading: isLoadingReconciliation } = useQuery({
    queryKey: ['treasury', 'reconciliation-pending'],
    queryFn: treasuryService.getPendingReconciliation,
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
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du module trésorerie...</p>
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
          title="Module Trésorerie & Cash Management"
          subtitle="EBICS, SWIFT MT940/942, Rapprochement IA, Prévisions Monte Carlo"
          icon={Banknote}
          action={
            <div className="flex gap-3">
              <Link to="/treasury/bank-connections">
                <ElegantButton variant="outline" icon={Shield}>
                  Connexions EBICS
                </ElegantButton>
              </Link>
              <Link to="/treasury/cash-forecast">
                <ElegantButton variant="primary" icon={TrendingUp}>
                  Prévisions
                </ElegantButton>
              </Link>
            </div>
          }
        />

        {/* KPI Cards épurées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Position de Trésorerie"
            value={formatCurrency(stats?.totalCashPosition || 48500000000)}
            subtitle="+12.5% vs mois précédent"
            icon={Wallet}
            color="success"
            delay={0.1}
            withChart={true}
          />
          
          <KPICard
            title="Connexions Bancaires"
            value={(stats?.activeBankConnections || 12).toString()}
            subtitle="EBICS • SWIFT • PSD2 • Temps réel"
            icon={Shield}
            color="neutral"
            delay={0.2}
            withChart={true}
          />
          
          <KPICard
            title="Rapprochement IA"
            value={formatPercentage(stats?.reconciliationRate || 0.978)}
            subtitle={`Taux de matching ML • ${stats?.pendingReconciliation || 23} en attente`}
            icon={Brain}
            color="primary"
            delay={0.3}
            withChart={true}
          />
          
          <KPICard
            title="Cash Forecast 30J"
            value={formatCurrency(stats?.cashForecast30d || 52300000000)}
            subtitle="Monte Carlo • Confiance 95%"
            icon={Target}
            color="warning"
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
            title="Évolution de Trésorerie"
            subtitle="Flux mensuels et prévisions"
            icon={TrendingUp}
          >
            <ColorfulBarChart
              data={[
                { label: 'Jan', value: 48500, color: 'bg-[#6A8A82]' },
                { label: 'Fév', value: 51200, color: 'bg-green-400' },
                { label: 'Mar', value: 49800, color: 'bg-yellow-400' },
                { label: 'Avr', value: 52300, color: 'bg-[#6A8A82]' },
                { label: 'Mai', value: 54100, color: 'bg-green-500' },
                { label: 'Juin', value: 51800, color: 'bg-amber-400' },
                { label: 'Juil', value: 55600, color: 'bg-[#6A8A82]' }
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
                <Link to="/treasury/bank-connections" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-[#6A8A82]/30 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#6A8A82]/5 rounded-lg">
                        <Shield className="h-5 w-5 text-[#6A8A82]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Connexions EBICS</h3>
                        <p className="text-sm text-neutral-500">Gestion bancaire</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/treasury/payments" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <CreditCard className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Paiements SEPA</h3>
                        <p className="text-sm text-neutral-500">Virements</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/treasury/reconciliation" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Brain className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Rapprochement IA</h3>
                        <p className="text-sm text-neutral-500">Matching intelligent</p>
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

export default TreasuryDashboard;