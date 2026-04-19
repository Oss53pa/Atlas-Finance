// @ts-nocheck

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calculator,
  FileText,
  Book,
  TrendingUp,
  BarChart3,
  PieChart,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  Zap,
  LayoutGrid,
  Activity
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
import JournalEntryModal from '../../components/accounting/JournalEntryModal';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useMoneyFormat } from '../../hooks/useMoneyFormat';

type TabKey = 'overview' | 'entries' | 'balance' | 'actions';

const AccountingDashboard: React.FC = () => {
  const { t } = useLanguage();
  const fmt = useMoneyFormat();
  const { adapter } = useData();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real data from adapter
  const [entries, setEntries] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [e, a] = await Promise.all([
          adapter.getAll<any>('journalEntries'),
          adapter.getAll<any>('accounts'),
        ]);
        setEntries(e);
        setAccounts(a);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [adapter]);

  // Computed stats from real data
  const stats = useMemo(() => {
    const posted = entries.filter((e: any) => e.status === 'posted' || e.status === 'validated');
    const drafts = entries.filter((e: any) => e.status === 'draft');
    const activeAccounts = accounts.filter((a: any) => a.isActive !== false);

    let totalMouvements = 0;
    let classSoldes: Record<string, number> = {};

    for (const entry of posted) {
      if (!entry.lines) continue;
      for (const line of entry.lines) {
        totalMouvements += (line.debit || 0);
        const code = String(line.accountCode || '');
        const cls = code.charAt(0);
        if (cls >= '1' && cls <= '9') {
          classSoldes[cls] = (classSoldes[cls] || 0) + (line.debit || 0);
        }
      }
    }

    // Balance: compute totals by class groups
    let totalActif = 0;  // classes 2+3+4(debit)+5
    let totalPassif = 0;  // classes 1+4(credit)
    let totalCharges = 0; // class 6
    let totalProduits = 0; // class 7

    for (const entry of posted) {
      if (!entry.lines) continue;
      for (const line of entry.lines) {
        const code = String(line.accountCode || '');
        const d = line.debit || 0;
        const c = line.credit || 0;
        if (code.startsWith('1')) { totalPassif += c - d; }
        if (code.startsWith('2')) { totalActif += d - c; }
        if (code.startsWith('3')) { totalActif += d - c; }
        if (code.startsWith('4')) {
          if (code.startsWith('41')) { totalActif += d - c; }  // créances
          else { totalPassif += c - d; }  // dettes
        }
        if (code.startsWith('5')) { totalActif += d - c; }
        if (code.startsWith('6')) { totalCharges += d - c; }
        if (code.startsWith('7')) { totalProduits += c - d; }
      }
    }

    return {
      total_comptes: accounts.length,
      comptes_actifs: activeAccounts.length,
      ecritures_total: entries.length,
      ecritures_validees: posted.length,
      ecritures_brouillon: drafts.length,
      montant_total: totalMouvements,
      classSoldes,
      totalActif: Math.abs(totalActif),
      totalPassif: Math.abs(totalPassif),
      totalCharges: Math.abs(totalCharges),
      totalProduits: Math.abs(totalProduits),
    };
  }, [entries, accounts]);

  // Recent entries (last 5 posted)
  const recentEntries = useMemo(() => {
    return entries
      .filter((e: any) => e.status === 'posted' || e.status === 'validated')
      .sort((a: any, b: any) => {
        const da = a.date || a.createdAt || '';
        const db = b.date || b.createdAt || '';
        return db.localeCompare(da);
      })
      .slice(0, 5);
  }, [entries]);

  // Chart data from real class soldes
  const chartData = useMemo(() => {
    return [
      { label: 'Classe 1', value: Math.round((stats.classSoldes['1'] || 0) / 1000), color: 'bg-neutral-800' },
      { label: 'Classe 2', value: Math.round((stats.classSoldes['2'] || 0) / 1000), color: 'bg-neutral-700' },
      { label: 'Classe 3', value: Math.round((stats.classSoldes['3'] || 0) / 1000), color: 'bg-neutral-600' },
      { label: 'Classe 4', value: Math.round((stats.classSoldes['4'] || 0) / 1000), color: 'bg-neutral-500' },
      { label: 'Classe 5', value: Math.round((stats.classSoldes['5'] || 0) / 1000), color: 'bg-neutral-400' },
      { label: 'Classe 6', value: Math.round((stats.classSoldes['6'] || 0) / 1000), color: 'bg-neutral-600' },
      { label: 'Classe 7', value: Math.round((stats.classSoldes['7'] || 0) / 1000), color: 'bg-neutral-500' },
    ];
  }, [stats.classSoldes]);

  const tabs: { key: TabKey; label: string; icon: React.FC<{ className?: string; size?: number }> }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: LayoutGrid },
    { key: 'entries', label: 'Écritures', icon: FileText },
    { key: 'balance', label: 'Balance', icon: BarChart3 },
    { key: 'actions', label: 'Modules', icon: Activity },
  ];

  if (loading) {
    return (
      <PageContainer background="pattern" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-6 bg-white/90 backdrop-blur-sm p-12 rounded-xl shadow-md"
          >
            <div className="w-20 h-20 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-neutral-700">Chargement du module comptabilité...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Plan Comptable SYSCOHADA"
          value={stats.total_comptes.toString()}
          subtitle={`${stats.comptes_actifs} comptes actifs • 9 classes`}
          icon={Book}
          color="neutral"
          delay={0.1}
          withChart={true}
        />
        <KPICard
          title="Journaux & Écritures"
          value={stats.ecritures_total.toString()}
          subtitle={`${stats.ecritures_validees} validées`}
          icon={FileText}
          color="primary"
          delay={0.2}
          withChart={true}
        />
        <KPICard
          title="Mouvements (FCFA)"
          value={fmt(stats.montant_total)}
          subtitle={`${period === 'month' ? 'Ce mois' : period === 'quarter' ? 'Ce trimestre' : 'Cette année'}`}
          icon={DollarSign}
          color="success"
          delay={0.3}
          withChart={true}
        />
        <KPICard
          title="Brouillons à valider"
          value={stats.ecritures_brouillon.toString()}
          subtitle={stats.ecritures_brouillon > 0 ? 'En attente de validation' : 'Tout est validé'}
          icon={AlertCircle}
          color={stats.ecritures_brouillon > 0 ? 'warning' : 'success'}
          delay={0.4}
          withChart={true}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <ModernChartCard
          title="Soldes par Classes SYSCOHADA"
          subtitle="Répartition des montants par classe comptable (en milliers)"
          icon={PieChart}
        >
          {chartData.some(d => d.value > 0) ? (
            <ColorfulBarChart data={chartData} height={200} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
              <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">Aucune écriture validée pour afficher le graphique</p>
            </div>
          )}
        </ModernChartCard>
      </motion.div>
    </div>
  );

  const renderEntriesTab = () => (
    <UnifiedCard variant="elevated" size="lg">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/90">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Écritures Récentes
            </h2>
            <p className="text-neutral-600">{stats.ecritures_total} écritures au total</p>
          </div>
        </div>
        <ElegantButton
          variant="outline"
          icon={Zap}
          onClick={() => setIsJournalModalOpen(true)}
        >
          Nouvelle Écriture
        </ElegantButton>
      </div>
      <div className="space-y-4">
        {recentEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium mb-1">Aucune écriture validée</p>
            <p className="text-sm">Saisissez et validez des écritures pour les voir ici</p>
          </div>
        ) : recentEntries.map((entry: any, index: number) => {
          const totalDebit = entry.lines
            ? entry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0)
            : entry.totalDebit || 0;

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 }}
              className="group flex items-center justify-between p-5 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 bg-neutral-100 rounded-lg text-xs font-bold text-neutral-700">
                  {entry.entryNumber || entry.journal || '—'}
                </div>
                <div>
                  <h4 className="font-semibold text-neutral-900 group-hover:text-[var(--color-primary-dark)] transition-colors">
                    {entry.label || entry.reference || 'Écriture comptable'}
                  </h4>
                  <p className="text-sm text-neutral-600">
                    {entry.journal ? `Journal ${entry.journal}` : ''}{entry.date ? ` • ${formatDate(new Date(entry.date))}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-neutral-900 text-lg">
                  {fmt(totalDebit)}
                </p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  entry.status === 'posted' ? 'bg-green-100 text-green-700'
                    : entry.status === 'validated' ? 'bg-blue-100 text-blue-700'
                    : 'bg-neutral-100 text-neutral-700'
                }`}>
                  {entry.status === 'posted' ? 'Comptabilisée' : entry.status === 'validated' ? 'Validée' : entry.status}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </UnifiedCard>
  );

  const renderBalanceTab = () => (
    <UnifiedCard variant="elevated" size="lg">
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 bg-white/90">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">
            Balance SYSCOHADA
          </h2>
          <p className="text-neutral-600">Classes 1-7 détaillées</p>
        </div>
      </div>
      <div className="space-y-4">
        {[
          { label: 'ACTIF (Classes 2-5)', value: stats.totalActif, desc: 'Immobilisations, Stocks, Créances, Trésorerie' },
          { label: 'PASSIF (Classes 1, 4)', value: stats.totalPassif, desc: 'Capitaux propres, Provisions, Dettes' },
          { label: 'CHARGES (Classe 6)', value: stats.totalCharges, desc: 'Achats, Services, Personnel, Finances' },
          { label: 'PRODUITS (Classe 7)', value: stats.totalProduits, desc: 'Ventes, Production, Produits accessoires' }
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 rounded-2xl border bg-neutral-50/80 border-neutral-200/60"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-neutral-900">{item.label}</span>
              <span className="font-bold text-xl text-neutral-900">
                {fmt(item.value)}
              </span>
            </div>
            <p className="text-sm text-neutral-600">{item.desc}</p>
          </motion.div>
        ))}

        {stats.totalProduits > 0 || stats.totalCharges > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`p-6 rounded-2xl border ${
              stats.totalProduits >= stats.totalCharges
                ? 'bg-green-50/80 border-green-200/60'
                : 'bg-red-50/80 border-red-200/60'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-neutral-900">RÉSULTAT NET</span>
              <span className={`font-bold text-xl ${
                stats.totalProduits >= stats.totalCharges ? 'text-green-700' : 'text-red-700'
              }`}>
                {fmt(stats.totalProduits - stats.totalCharges)}
              </span>
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="pt-4"
        >
          <Link to="/accounting/balance">
            <ElegantButton variant="outline" className="w-full">
              Balance SYSCOHADA Complète
            </ElegantButton>
          </Link>
        </motion.div>
      </div>
    </UnifiedCard>
  );

  const renderActionsTab = () => (
    <UnifiedCard variant="elevated" size="lg">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-neutral-900 mb-2">
          Fonctionnalités SYSCOHADA
        </h2>
        <p className="text-neutral-600">ERP Comptable conforme aux normes africaines - Actions rapides</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { to: '/accounting/chart-of-accounts', icon: Book, title: 'Plan SYSCOHADA', desc: '9 positions - Multi-plans', delay: 0.1 },
          { to: '/accounting/journals', icon: FileText, title: t('navigation.journals'), desc: 'HA, VE, BQ, CA, OD, AN', delay: 0.2 },
          { to: '/accounting/entries', icon: TrendingUp, title: 'Saisie', desc: 'Nouvelles écritures', delay: 0.3 },
          { to: '/accounting/balance', icon: BarChart3, title: t('accounting.balance'), desc: '9 Classes SYSCOHADA', delay: 0.4 },
          { to: '/accounting/general-ledger', icon: PieChart, title: 'Grand Livre', desc: 'Mouvements détaillés', delay: 0.5 },
          { to: '/accounting/lettrage', icon: Users, title: t('thirdParty.reconciliation'), desc: 'Rapprochement des comptes', delay: 0.6 },
          { to: '/accounting/ratios', icon: DollarSign, title: 'Ratios Financiers', desc: 'Analyses & KPIs', delay: 0.7 },
          { to: '/accounting/financial-statements', icon: Calendar, title: 'États Financiers', desc: 'Bilan & Résultat', delay: 0.8 },
        ].map((item) => (
          <Link key={item.to} to={item.to}>
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: item.delay }}
              className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                <item.icon size={24} />
              </div>
              <h3 className="font-bold text-neutral-900 mb-1">{item.title}</h3>
              <p className="text-sm text-neutral-600">{item.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </UnifiedCard>
  );

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-6">
        <SectionHeader
          title="Module Comptabilité SYSCOHADA"
          subtitle="Gestion comptable selon les normes SYSCOHADA - Plan comptable à 9 positions"
          icon={Calculator}
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
                    {p === 'month' ? t('time.month') : p === 'quarter' ? 'Trimestre' : t('time.year')}
                  </button>
                ))}
              </div>
              <ElegantButton
                icon={FileText}
                onClick={() => setIsJournalModalOpen(true)}
              >
                Nouvelle Écriture
              </ElegantButton>
            </div>
          }
        />

        <div className="flex items-center bg-white rounded-2xl p-1.5 shadow-sm border border-neutral-200 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-neutral-600 hover:text-[var(--color-primary)] hover:bg-neutral-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'entries' && renderEntriesTab()}
          {activeTab === 'balance' && renderBalanceTab()}
          {activeTab === 'actions' && renderActionsTab()}
        </motion.div>
      </div>

      <JournalEntryModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
      />
    </PageContainer>
  );
};

export default AccountingDashboard;
