import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  Filter,
  Download,
  Zap,
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
import JournalEntryModal from '../../components/accounting/JournalEntryModal';
import { useAccountingEntries } from '../../hooks';
import { formatCurrency, formatDate } from '../../lib/utils';

const AccountingDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('year');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  const { data: entriesData, isLoading: isLoadingEntries } = useAccountingEntries({
    page: 1,
    page_size: 10,
  });

  const stats = {
    total_comptes: 847,
    comptes_actifs: 245,
    ecritures_mois: entriesData?.count || 1847,
    ecritures_validees: entriesData?.results?.filter((e: any) => e.statut === 'valide').length || 1654,
    montant_total_mois: 2847350000,
    ecritures_brouillon: entriesData?.results?.filter((e: any) => e.statut === 'brouillon').length || 23,
  };

  const balanceSummary = {
    total_actif: 15750000000,
    total_passif: 15750000000,
    total_charges: 8950000000,
    total_produits: 12450000000,
  };

  const isLoadingStats = isLoadingEntries;
  const isLoadingBalance = false;

  if (isLoadingStats) {
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

  return (
    <PageContainer background="warm" padding="lg">
      {/* Header with Period Filter */}
      <div className="space-y-8">
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

        {/* KPI Cards avec style moderne */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Plan Comptable SYSCOHADA"
            value={(stats?.total_comptes || 847).toString()}
            subtitle={`${stats?.comptes_actifs || 245} comptes actifs • 9 classes`}
            icon={Book}
            color="neutral"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title="Journaux & Écritures"
            value={(stats?.ecritures_mois || 1847).toString()}
            subtitle={`${stats?.ecritures_validees || 1654} validées • 6 journaux`}
            icon={FileText}
            color="primary"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title="Mouvements (FCFA)"
            value={formatCurrency(stats?.montant_total_mois || 2847350000)}
            subtitle={`${period === 'month' ? 'Ce mois' : period === 'quarter' ? 'Ce trimestre' : 'Cette année'} • Multi-devises`}
            icon={DollarSign}
            color="success"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title="Contrôles & Lettrage"
            value={(stats?.ecritures_brouillon || 23).toString()}
            subtitle="À valider • IA activée"
            icon={AlertCircle}
            color="warning"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Section graphique des soldes */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModernChartCard
            title="Soldes par Classes SYSCOHADA"
            subtitle="Répartition des montants par classe comptable"
            icon={PieChart}
          >
            <ColorfulBarChart
              data={[
                { label: 'Classe 1', value: 15750, color: 'bg-neutral-800' },
                { label: 'Classe 2', value: 12300, color: 'bg-neutral-700' },
                { label: 'Classe 3', value: 8950, color: 'bg-neutral-600' },
                { label: 'Classe 4', value: 18200, color: 'bg-neutral-500' },
                { label: 'Classe 5', value: 6450, color: 'bg-neutral-400' },
                { label: 'Classe 6', value: 11800, color: 'bg-neutral-600' },
                { label: 'Classe 7', value: 14100, color: 'bg-neutral-500' }
              ]}
              height={200}
            />
          </ModernChartCard>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Entries */}
          <UnifiedCard variant="elevated" size="lg" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/90">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">
                    Écritures Récentes
                  </h2>
                  <p className="text-neutral-600">Saisie IA intelligente</p>
                </div>
              </div>
              <ElegantButton 
                variant="outline" 
                icon={Zap}
                onClick={() => setIsJournalModalOpen(true)}
              >
                Saisie Intelligente
              </ElegantButton>
            </div>
            {isLoadingEntries ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Exemple d'écritures avec types SYSCOHADA */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="group flex items-center justify-between p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                      VE001
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 group-hover:text-[var(--color-primary-dark)] transition-colors">
                        Vente marchandises - OCR automatique
                      </h4>
                      <p className="text-sm text-neutral-600">
                        Journal Ventes (VE) • Compte 701 • {formatDate(new Date())}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neutral-900 text-lg">
                      {formatCurrency(2750000)}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                      Validée IA
                    </span>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="group flex items-center justify-between p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                      HA045
                    </div>
                    <div>
                      <h4 className="font-semibold text-neutral-900 group-hover:text-[var(--color-primary-dark)] transition-colors">
                        Achat matières premières
                      </h4>
                      <p className="text-sm text-neutral-600">
                        Journal Achats (HA) • Compte 601 • Multi-devise EUR
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-neutral-900 text-lg">
                      {formatCurrency(1850000)}
                    </p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]">
                      Lettrage Auto
                    </span>
                  </div>
                </motion.div>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 bg-white/90"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-[var(--color-primary-lighter)] rounded-2xl">
                      <Calculator className="w-8 h-8 text-[var(--color-primary)]" />
                    </div>
                  </div>
                  <h3 className="font-bold text-neutral-900 mb-2">Assistant IA SYSCOHADA</h3>
                  <p className="text-sm text-neutral-600">Saisie guidée, OCR factures, suggestions automatiques</p>
                </motion.div>
              </div>
            )}
          </UnifiedCard>

          {/* Balance SYSCOHADA */}
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
            {isLoadingBalance ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'ACTIF (Classes 1-5)', value: balanceSummary?.total_actif || 15750000000, desc: 'Immobilisations, Stocks, Créances, Trésorerie' },
                  { label: 'PASSIF (Classes 1-4)', value: balanceSummary?.total_passif || 15750000000, desc: 'Capitaux propres, Provisions, Dettes' },
                  { label: 'CHARGES (Classe 6)', value: balanceSummary?.total_charges || 8950000000, desc: 'Achats, Services, Personnel, Finances' },
                  { label: 'PRODUITS (Classe 7)', value: balanceSummary?.total_produits || 12450000000, desc: 'Ventes, Production, Produits accessoires' }
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
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">{item.desc}</p>
                  </motion.div>
                ))}

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-4"
                >
                  <Link to="/accounting/balance">
                    <ElegantButton variant="outline" className="w-full">
                      Balance SYSCOHADA Complète
                    </ElegantButton>
                  </Link>
                </motion.div>
              </div>
            )}
          </UnifiedCard>
        </div>

        {/* Actions Rapides SYSCOHADA */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">
              Fonctionnalités SYSCOHADA
            </h2>
            <p className="text-neutral-600">ERP Comptable conforme aux normes africaines - Actions rapides</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/accounting/chart-of-accounts">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <Book size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Plan SYSCOHADA</h3>
                <p className="text-sm text-neutral-600">9 positions - Multi-plans</p>
              </motion.div>
            </Link>

            <Link to="/accounting/journals">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <FileText size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('navigation.journals')}</h3>
                <p className="text-sm text-neutral-600">HA, VE, BQ, CA, OD, AN</p>
              </motion.div>
            </Link>

            <Link to="/accounting/entries">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <TrendingUp size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Saisie IA</h3>
                <p className="text-sm text-neutral-600">OCR + Suggestions</p>
              </motion.div>
            </Link>

            <Link to="/accounting/balance">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <BarChart3 size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('accounting.balance')}</h3>
                <p className="text-sm text-neutral-600">9 Classes SYSCOHADA</p>
              </motion.div>
            </Link>

            <Link to="/accounting/general-ledger">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <PieChart size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Grand Livre</h3>
                <p className="text-sm text-neutral-600">Mouvements détaillés</p>
              </motion.div>
            </Link>
            
            <Link to="/accounting/lettrage">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <Users size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">{t('thirdParty.reconciliation')}</h3>
                <p className="text-sm text-neutral-600">Rapprochement des comptes</p>
              </motion.div>
            </Link>
            
            <Link to="/accounting/ratios-financiers">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <DollarSign size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Ratios Financiers</h3>
                <p className="text-sm text-neutral-600">Analyses & KPIs</p>
              </motion.div>
            </Link>
            
            <Link to="/accounting/financial-statements">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-neutral-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-white/90">
                  <Calendar size={24} />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">États Financiers</h3>
                <p className="text-sm text-neutral-600">Bilan & Résultat</p>
              </motion.div>
            </Link>
          </div>
        </UnifiedCard>
      </div>

      {/* Modal d'écriture comptable */}
      <JournalEntryModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
      />
    </PageContainer>
  );
};

export default AccountingDashboard;