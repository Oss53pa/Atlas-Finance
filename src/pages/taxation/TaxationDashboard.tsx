import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
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
import { formatCurrency, formatDate } from '../../lib/utils';

const TaxationDashboard: React.FC = () => {
  const { adapter } = useData();
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [loading, setLoading] = useState(true);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const je = await adapter.getAll('journalEntries');
        setJournalEntries(je as any[]);
      } catch (e) {
        console.error('TaxationDashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  // Compute tax-related metrics from journal entries on 44x accounts (tax accounts SYSCOHADA)
  const taxData = useMemo(() => {
    let vatDue = 0;
    const monthlyTax: number[] = new Array(12).fill(0);
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    const colors = ['bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-[var(--color-error)]', 'bg-[var(--color-warning)]', 'bg-amber-500', 'bg-[var(--color-error)]', 'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-red-500', 'bg-orange-500'];

    for (const entry of journalEntries) {
      if (!entry.lines) continue;
      const month = new Date(entry.date).getMonth();
      for (const line of entry.lines) {
        if (line.accountCode?.startsWith('44')) {
          const amount = (line.credit || 0) - (line.debit || 0);
          vatDue += amount;
          if (month >= 0 && month < 12) monthlyTax[month] += Math.abs(amount);
        }
      }
    }

    const chartData = monthlyTax
      .map((val, i) => ({ label: monthNames[i], value: Math.round(val / 1000), color: colors[i] }))
      .filter(d => d.value > 0);

    return {
      vatDue,
      chartData: chartData.length > 0 ? chartData : [{ label: '\u2014', value: 0, color: 'bg-neutral-300' }],
    };
  }, [journalEntries]);

  if (loading) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-sm"
          >
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du module fiscalite...</p>
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
          title="Tableau de Bord Fiscalite"
          subtitle="Suivi des declarations fiscales et obligations reglementaires"
          icon={Calculator}
          action={
            <div className="flex gap-3">
              <Link to="/taxation/declarations">
                <ElegantButton variant="outline" icon={FileText}>
                  Nouvelles Declarations
                </ElegantButton>
              </Link>
              <Link to="/taxation/deadlines">
                <ElegantButton variant="primary" icon={Calendar}>
                  Echeances
                </ElegantButton>
              </Link>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Declarations en Cours"
            value="0"
            subtitle="0 en retard"
            icon={FileText}
            color="warning"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="TVA a Payer"
            value={formatCurrency(taxData.vatDue)}
            subtitle="Calcule depuis ecritures 44x"
            icon={DollarSign}
            color="error"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Prochaines Echeances"
            value="N/A"
            subtitle="Donnees non disponibles"
            icon={Calendar}
            color="warning"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="Conformite"
            value="N/A"
            subtitle="Donnees non disponibles"
            icon={CheckCircle}
            color="success"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Evolution des Obligations Fiscales"
            subtitle="Montants mensuels par type de taxe"
            icon={TrendingUp}
          >
            <ColorfulBarChart
              data={taxData.chartData}
              height={160}
            />
          </ModernChartCard>
        </motion.div>

        {/* Actions rapides */}
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
                        <h3 className="font-medium text-neutral-800">Declarations TVA</h3>
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
                        <h3 className="font-medium text-neutral-800">Echeances Fiscales</h3>
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
                        <p className="text-sm text-neutral-500">TVA & impots</p>
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
