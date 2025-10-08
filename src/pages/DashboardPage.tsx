import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  UsersIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { 
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../components/ui/DesignSystem';
import JournalEntryModal from '../components/accounting/JournalEntryModal';
import { useToast } from '../hooks/useToast';
import { 
  DollarSign, 
  Users, 
  FileText, 
  TrendingUp,
  Bell,
  Calendar,
  Target,
  Eye,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

  // Alertes intelligentes
  const alerts = [
    {
      type: 'success',
      title: 'Objectif CA atteint',
      message: 'Objectif mensuel dépassé de 15%',
      action: 'Analyser performance',
      path: '/financial-analysis-advanced',
      time: '2h'
    },
    {
      type: 'warning',
      title: 'DSO élevé',
      message: '12 factures > 60 jours d\'impayés',
      action: 'Gérer recouvrement',
      path: '/customers/recovery',
      time: '1h'
    },
    {
      type: 'info',
      title: 'Clôture mensuelle',
      message: 'Clôture septembre à finaliser',
      action: 'Accéder aux clôtures',
      path: '/closures',
      time: '3h'
    }
  ];

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header modernisé avec design chaud */}
        <SectionHeader
          title="WiseBook ERP"
          subtitle="🌍 Système ERP Comptable SYSCOHADA - Plateforme de gestion intégrée pour l'Afrique"
          icon={ChartBarIcon}
        />

        {/* KPIs principaux avec design moderne et graphiques */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Chiffre d'Affaires"
            value="2.45M F"
            subtitle="Ce mois"
            icon={DollarSign}
            trend={{ value: "+12.5%", isPositive: true }}
            color="success"
            delay={0.1}
            withChart={true}
          />
          
          <KPICard
            title={t('navigation.treasury')}
            value="3.85M F"
            subtitle="Position actuelle"
            icon={TrendingUp}
            trend={{ value: "+850K", isPositive: true }}
            color="primary"
            delay={0.2}
            withChart={true}
          />
          
          <KPICard
            title="Créances Clients"
            value="1.25M F"
            subtitle="125K échues"
            icon={Users}
            trend={{ value: "125K échues", isPositive: false }}
            color="warning"
            delay={0.3}
            withChart={true}
          />
          
          <KPICard
            title="Écritures"
            value="1,847"
            subtitle="Ce mois"
            icon={FileText}
            color="neutral"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Section graphique moderne inspirée des captures */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Performance Mensuelle"
            subtitle="Évolution du chiffre d'affaires par mois"
            icon={TrendingUp}
          >
            <ColorfulBarChart
              data={[
                { label: 'Jan', value: 2100, color: 'bg-yellow-400' },
                { label: 'Fév', value: 2300, color: 'bg-orange-400' },
                { label: 'Mar', value: 2700, color: 'bg-amber-400' },
                { label: 'Avr', value: 2200, color: 'bg-[var(--color-warning)]' },
                { label: 'Mai', value: 2450, color: 'bg-[var(--color-warning)]' },
                { label: 'Juin', value: 2800, color: 'bg-amber-500' },
                { label: 'Juil', value: 3100, color: 'bg-[var(--color-warning)]' }
              ]}
              height={180}
            />
          </ModernChartCard>
        </motion.div>

        {/* Alertes Management */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#191919]">Alertes Management</h3>
              <Eye className="w-4 h-4 text-[#767676]" />
            </div>
            
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const alertConfig = {
                  success: { bg: 'bg-[var(--color-success-lightest)]', border: 'border-green-400', text: 'text-[var(--color-success-dark)]', icon: CheckCircle },
                  warning: { bg: 'bg-[var(--color-warning-lightest)]', border: 'border-yellow-400', text: 'text-[var(--color-warning-dark)]', icon: AlertTriangle },
                  info: { bg: 'bg-[var(--color-primary-lightest)]', border: 'border-blue-400', text: 'text-[var(--color-primary-dark)]', icon: Target }
                }[alert.type];
                
                const IconComponent = alertConfig.icon;
                
                return (
                  <div
                    key={index}
                    role="button"
                    tabIndex={0}
                    className={`p-3 rounded-lg border-l-4 cursor-pointer hover:bg-opacity-70 transition-all ${alertConfig.bg} ${alertConfig.border}`}
                    onClick={() => navigate(alert.path)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(alert.path);
                      }
                    }}
                    aria-label={`${alert.title}: ${alert.message}`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className={`w-4 h-4 mt-0.5 ${alertConfig.text}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium text-sm ${alertConfig.text}`}>{alert.title}</h4>
                          <span className="text-xs text-[#767676]">Il y a {alert.time}</span>
                        </div>
                        <p className="text-xs text-[#444444] mb-2">{alert.message}</p>
                        <button className={`text-xs font-medium hover:underline ${alertConfig.text}`}>
                          {alert.action} →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Section de test des notifications unifiée */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <UnifiedCard variant="glass" size="lg" hover>
            <div className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/90">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">🚀 Design System Unifié</h2>
                  <p className="text-neutral-600">Interface modernisée avec navigation responsive et notifications</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ElegantButton
                  variant="primary"
                  onClick={() => toast.success('Opération réalisée avec succès !', t('messages.success'))}
                  icon={TrendingUp}
                >
                  Test Succès
                </ElegantButton>
                
                <ElegantButton
                  variant="outline"
                  onClick={() => toast.warning('Attention, vérifiez les données', 'Avertissement')}
                  icon={Target}
                >
                  Test Alerte
                </ElegantButton>
                
                <ElegantButton
                  variant="secondary"
                  onClick={() => toast.error('Une erreur s\'est produite', t('messages.error'))}
                  icon={Users}
                >
                  Test Erreur
                </ElegantButton>
                
                <ElegantButton
                  variant="ghost"
                  onClick={() => setIsJournalModalOpen(true)}
                  icon={FileText}
                >
                  Nouvelle Écriture
                </ElegantButton>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Section modules rapides */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <UnifiedCard variant="elevated" size="lg">
            <div className="space-y-8">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/90">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">Modules Principaux</h2>
                  <p className="text-neutral-600">Accès rapide aux fonctionnalités essentielles</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <motion.div whileHover={{ scale: 1.03 }} className="group">
                  <div className="bg-white/90">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-[var(--color-primary-light)]/50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <FileText className="h-8 w-8 text-[var(--color-primary-dark)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-[var(--color-primary-darker)] text-lg">{t('accounting.title')}</h3>
                        <p className="text-sm text-[var(--color-primary-dark)] mt-1">Journaux & écritures</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} className="group">
                  <div className="bg-white/90">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-emerald-200/50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Users className="h-8 w-8 text-emerald-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-emerald-900 text-lg">Tiers</h3>
                        <p className="text-sm text-emerald-700 mt-1">Clients & fournisseurs</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} className="group">
                  <div className="bg-white/90">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-[var(--color-info-light)]/50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <DollarSign className="h-8 w-8 text-[var(--color-info-dark)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-900 text-lg">{t('navigation.treasury')}</h3>
                        <p className="text-sm text-[var(--color-info-dark)] mt-1">Gestion des flux</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div whileHover={{ scale: 1.03 }} className="group">
                  <div className="bg-white/90">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="p-4 bg-[var(--color-warning-light)]/50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        <Target className="h-8 w-8 text-[var(--color-warning-dark)]" />
                      </div>
                      <div>
                        <h3 className="font-bold text-orange-900 text-lg">{t('navigation.budget')}</h3>
                        <p className="text-sm text-[var(--color-warning-dark)] mt-1">Contrôle & suivi</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>

        {/* Modal d'écriture comptable */}
        <JournalEntryModal
          isOpen={isJournalModalOpen}
          onClose={() => setIsJournalModalOpen(false)}
        />
      </div>
    </PageContainer>
  );
};

export default DashboardPage;