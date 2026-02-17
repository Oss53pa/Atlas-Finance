import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calculator,
  FileText,
  Calendar,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle
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
import { taxationService } from '../../services/taxation.service';
import { formatCurrency, formatDate } from '../../lib/utils';

const TaxationDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024');

  // Fetch taxation statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['taxation', 'dashboard-stats', selectedPeriod],
    queryFn: () => taxationService.getDashboardStats({ period: selectedPeriod }),
  });

  // Fetch upcoming deadlines
  const { data: deadlines, isLoading: isLoadingDeadlines } = useQuery({
    queryKey: ['taxation', 'deadlines'],
    queryFn: taxationService.getUpcomingDeadlines,
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
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du module fiscalité...</p>
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
          title="Tableau de Bord Fiscalité"
          subtitle="Suivi des déclarations fiscales et obligations réglementaires"
          icon={Calculator}
          action={
            <div className="flex gap-3">
              <Link to="/taxation/declarations">
                <ElegantButton variant="outline" icon={FileText}>
                  Nouvelles Déclarations
                </ElegantButton>
              </Link>
              <Link to="/taxation/deadlines">
                <ElegantButton variant="primary" icon={Calendar}>
                  Échéances
                </ElegantButton>
              </Link>
            </div>
          }
        />

        {/* KPI Cards épurées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Déclarations en Cours"
            value={(stats?.declarations_pending || 5).toString()}
            subtitle={`${stats?.declarations_overdue || 2} en retard`}
            icon={FileText}
            color="warning"
            delay={0.1}
            withChart={true}
          />
          
          <KPICard
            title="TVA à Payer"
            value={formatCurrency(stats?.vat_due || 1250000)}
            subtitle="Déclaration mensuelle"
            icon={DollarSign}
            color="error"
            delay={0.2}
            withChart={true}
          />
          
          <KPICard
            title="Prochaines Échéances"
            value={(stats?.upcoming_deadlines || 8).toString()}
            subtitle="Dans les 30 prochains jours"
            icon={Calendar}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          
          <KPICard
            title="Conformité"
            value="94%"
            subtitle="Taux de respect des délais"
            icon={CheckCircle}
            trend={{ value: "+2.1%", isPositive: true }}
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
            title="Évolution des Obligations Fiscales"
            subtitle="Montants mensuels par type de taxe"
            icon={TrendingUp}
          >
            <ColorfulBarChart
              data={[
                { label: 'Jan', value: 1200, color: 'bg-red-400' },
                { label: 'Fév', value: 1350, color: 'bg-orange-400' },
                { label: 'Mar', value: 1180, color: 'bg-amber-400' },
                { label: 'Avr', value: 1420, color: 'bg-[var(--color-error)]' },
                { label: 'Mai', value: 1250, color: 'bg-[var(--color-warning)]' },
                { label: 'Juin', value: 1380, color: 'bg-amber-500' },
                { label: 'Juil', value: 1450, color: 'bg-[var(--color-error)]' }
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
                <Link to="/taxation/declarations" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-red-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[var(--color-error-lightest)] rounded-lg">
                        <FileText className="h-5 w-5 text-[var(--color-error)]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Déclarations TVA</h3>
                        <p className="text-sm text-neutral-500">Mensuelles & annuelles</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/taxation/deadlines" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Échéances Fiscales</h3>
                        <p className="text-sm text-neutral-500">Planning & rappels</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/taxation/calculations" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[var(--color-primary-lightest)] rounded-lg">
                        <Calculator className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Calculs Automatiques</h3>
                        <p className="text-sm text-neutral-500">TVA & impôts</p>
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

export default TaxationDashboard;