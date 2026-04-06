import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
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
import { formatCurrency, formatDate } from '../../lib/utils';

const ThirdPartyDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [loading, setLoading] = useState(true);
  const [thirdParties, setThirdParties] = useState<any[]>([]);
  const [journalEntries, setJournalEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [tp, je] = await Promise.all([
          adapter.getAll('thirdParties'),
          adapter.getAll('journalEntries'),
        ]);
        setThirdParties(tp as Record<string, unknown>[]);
        setJournalEntries(je as Record<string, unknown>[]);
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [adapter]);

  const stats = useMemo(() => {
    const customers = thirdParties.filter((tp: any) => tp.type === 'CLIENT' || tp.type === 'client');
    const suppliers = thirdParties.filter((tp: any) => tp.type === 'FOURNISSEUR' || tp.type === 'fournisseur' || tp.type === 'supplier');
    const activeSuppliers = suppliers.filter((s: any) => s.statut !== 'INACTIF' && s.statut !== 'BLOQUE');

    let totalReceivables = 0;
    let customerRevenue = 0;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let newCustomersMonth = 0;
    const monthNames = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyValues = new Array(12).fill(0);
    const colors = ['bg-blue-400', 'bg-green-400', 'bg-primary-400', 'bg-[var(--color-primary)]', 'bg-[var(--color-success)]', 'bg-[var(--color-info)]', 'bg-[var(--color-primary)]', 'bg-blue-400', 'bg-green-400', 'bg-primary-400', 'bg-amber-400', 'bg-red-400'];

    for (const entry of journalEntries) {
      if (!entry.lines) continue;
      const entryDate = new Date(entry.date);
      const month = entryDate.getMonth();
      for (const line of entry.lines) {
        if (line.accountCode?.startsWith('41')) {
          totalReceivables += (line.debit || 0) - (line.credit || 0);
        }
        if (line.accountCode?.startsWith('7')) {
          const val = (line.credit || 0) - (line.debit || 0);
          customerRevenue += val;
          if (month >= 0 && month < 12) monthlyValues[month] += val;
        }
      }
    }

    for (const tp of customers) {
      const created = new Date(tp.createdAt || tp.created_at || '');
      if (created.getMonth() === currentMonth && created.getFullYear() === currentYear) {
        newCustomersMonth++;
      }
    }

    const monthlyRevenue = monthlyValues
      .map((val, i) => ({ label: monthNames[i], value: Math.round(val / 1000), color: colors[i] }))
      .filter(d => d.value > 0);

    return {
      total_customers: customers.length,
      new_customers_month: newCustomersMonth,
      total_receivables: totalReceivables,
      overdue_receivables: 0,
      total_suppliers: suppliers.length,
      active_suppliers: activeSuppliers.length,
      customer_revenue: customerRevenue,
      monthlyRevenue,
    };
  }, [thirdParties, journalEntries]);

  if (loading) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-sm"
          >
            <div className="w-16 h-16 border-4 border-[var(--color-primary-light)] border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du module tiers...</p>
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
          title="Module Tiers & Relations Clients"
          subtitle="Gestion integree des clients, fournisseurs et partenaires commerciaux"
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

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Clients Actifs"
            value={stats.total_customers.toString()}
            subtitle={`${stats.new_customers_month} nouveaux ce mois`}
            icon={Users}
            color="primary"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Creances Clients"
            value={formatCurrency(stats.total_receivables)}
            subtitle={`${stats.overdue_receivables} en retard`}
            icon={CreditCard}
            color="warning"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title={t('navigation.suppliers')}
            value={stats.total_suppliers.toString()}
            subtitle={`${stats.active_suppliers} actifs`}
            icon={Building}
            color="neutral"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="CA Clients"
            value={formatCurrency(stats.customer_revenue)}
            subtitle={`${period === 'month' ? 'Ce mois' : 'Cette annee'}`}
            icon={TrendingUp}
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
            title="Evolution du Chiffre d'Affaires Clients"
            subtitle="Performance mensuelle par segment client"
            icon={TrendingUp}
          >
            <ColorfulBarChart
              data={stats.monthlyRevenue.length > 0 ? stats.monthlyRevenue : [{ label: '\u2014', value: 0, color: 'bg-neutral-300' }]}
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
                <Link to="/third-party/customers" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[var(--color-primary-lightest)] rounded-lg">
                        <Users className="h-5 w-5 text-[var(--color-primary)]" />
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
                      <div className="p-2 bg-[var(--color-success-lightest)] rounded-lg">
                        <Building className="h-5 w-5 text-[var(--color-success)]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">{t('navigation.suppliers')}</h3>
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
                        <h3 className="font-medium text-neutral-800">{t('thirdParty.collection')}</h3>
                        <p className="text-sm text-neutral-500">Creances echues</p>
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
