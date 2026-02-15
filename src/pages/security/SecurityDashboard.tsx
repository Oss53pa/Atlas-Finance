import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield,
  Users,
  Key,
  Activity,
  AlertTriangle,
  Lock,
  UserCheck,
  Settings,
  Eye,
  Clock,
  Zap,
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
import { securityService } from '../../services/security.service';
import { formatDate } from '../../lib/utils';

const SecurityDashboard: React.FC = () => {
  // Fetch security overview
  const { data: securityOverview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['security', 'overview'],
    queryFn: securityService.getSecurityOverview,
  });

  // Fetch recent security events
  const { data: recentEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['security', 'recent-events'],
    queryFn: () => securityService.getRecentSecurityEvents(10),
  });

  // Fetch user activity summary
  const { data: userActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['security', 'user-activity'],
    queryFn: securityService.getUserActivitySummary,
  });

  // Fetch security alerts
  const { data: securityAlerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['security', 'alerts'],
    queryFn: securityService.getSecurityAlerts,
  });

  if (isLoadingOverview) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-6 bg-white/90 backdrop-blur-sm p-12 rounded-xl shadow-md"
          >
            <div className="w-20 h-20 border-4 border-[var(--color-primary-light)] border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-lg font-semibold text-neutral-700">Chargement du module sécurité...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, React.ReactNode> = {
      'login': <UserCheck className="h-4 w-4" />,
      'failed_login': <AlertTriangle className="h-4 w-4" />,
      'password_change': <Key className="h-4 w-4" />,
      'permission_denied': <Lock className="h-4 w-4" />,
      'data_access': <Eye className="h-4 w-4" />,
      'system': <Settings className="h-4 w-4" />
    };
    return icons[eventType] || <Activity className="h-4 w-4" />;
  };

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Header */}
        <SectionHeader
          title="Sécurité & Administration"
          subtitle="Gestion des utilisateurs, rôles et sécurité du système"
          icon={Shield}
          action={
            <div className="flex space-x-4">
              <Link to="/security/users">
                <ElegantButton icon={Users}>
                  Gérer Utilisateurs
                </ElegantButton>
              </Link>
              <Link to="/security/roles">
                <ElegantButton variant="outline" icon={Key}>
                  Gérer Rôles
                </ElegantButton>
              </Link>
            </div>
          }
        />

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Utilisateurs Actifs"
            value={(securityOverview?.utilisateurs_actifs || 0).toString()}
            subtitle={`Sur ${securityOverview?.total_utilisateurs || 0} au total`}
            icon={Users}
            color="primary"
            delay={0.1}
            withChart={true}
          />
          <KPICard
            title="Sessions Actives"
            value={(securityOverview?.sessions_actives || 0).toString()}
            subtitle="En cours maintenant"
            icon={Activity}
            color="success"
            delay={0.2}
            withChart={true}
          />
          <KPICard
            title="MFA Activé"
            value={(securityOverview?.utilisateurs_mfa || 0).toString()}
            subtitle={`${Math.round(((securityOverview?.utilisateurs_mfa || 0) / (securityOverview?.total_utilisateurs || 1)) * 100)}% des utilisateurs`}
            icon={Lock}
            color="neutral"
            delay={0.3}
            withChart={true}
          />
          <KPICard
            title="Alertes Sécurité"
            value={(securityOverview?.alertes_securite || 0).toString()}
            subtitle="Dernières 24h"
            icon={AlertTriangle}
            color="warning"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Security Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ModernChartCard
            title="Activité de Sécurité (24h)"
            subtitle="Répartition des événements de sécurité récents"
            icon={Activity}
          >
            <ColorfulBarChart
              data={[
                { label: 'Connexions', value: userActivity?.connexions_24h || 245, color: 'bg-emerald-400' },
                { label: 'Échecs', value: userActivity?.echecs_connexion_24h || 12, color: 'bg-red-400' },
                { label: 'Actions', value: userActivity?.actions_24h || 847, color: 'bg-blue-400' },
                { label: 'Alertes', value: securityOverview?.alertes_securite || 3, color: 'bg-orange-400' }
              ]}
              height={200}
            />
          </ModernChartCard>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Security Events */}
          <UnifiedCard variant="elevated" size="lg" className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-white/90 rounded-2xl">
                  <Activity className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Événements de Sécurité Récents</h2>
                  <p className="text-neutral-600">{recentEvents?.length || 0} récents</p>
                </div>
              </div>
              <Link to="/security/audit-log">
                <ElegantButton variant="outline" icon={Eye}>
                  Journal Complet
                </ElegantButton>
              </Link>
            </div>

            {isLoadingEvents ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-4 border-[var(--color-primary-light)] border-t-blue-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {recentEvents?.length ? recentEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group flex items-center justify-between p-6 border border-neutral-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-primary-lighter)] rounded-2xl text-[var(--color-primary)]">
                        {getEventIcon(event.type_evenement)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 group-hover:text-[var(--color-primary-dark)] transition-colors">
                          {event.description}
                        </h4>
                        <div className="flex items-center space-x-4 text-sm text-neutral-600">
                          <span>{event.utilisateur?.nom} {event.utilisateur?.prenom}</span>
                          <span>{event.adresse_ip}</span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      event.niveau_gravite === 'high' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]' :
                      event.niveau_gravite === 'medium' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' :
                      event.niveau_gravite === 'low' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' : 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]'
                    }`}>
                      {event.niveau_gravite === 'high' ? 'Élevé' : 
                       event.niveau_gravite === 'medium' ? 'Moyen' : 
                       event.niveau_gravite === 'low' ? 'Faible' : 'Info'}
                    </span>
                  </motion.div>
                )) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-white/90 rounded-2xl text-center"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-emerald-100 rounded-2xl">
                        <Shield className="w-8 h-8 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-neutral-900 mb-2">Aucun événement récent</h3>
                    <p className="text-sm text-neutral-600">Le système fonctionne normalement</p>
                  </motion.div>
                )}
              </div>
            )}
          </UnifiedCard>

          {/* Security Alerts */}
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <AlertTriangle className="h-6 w-6 text-[var(--color-error)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Alertes de Sécurité</h2>
                <p className="text-neutral-600">Surveillance active</p>
              </div>
            </div>

            {isLoadingAlerts ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-4 border-[var(--color-error-light)] border-t-red-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {securityAlerts?.length ? securityAlerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl border bg-[var(--color-error-lightest)]/80 border-[var(--color-error-light)]/60"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-red-900">{alert.titre}</h4>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        alert.statut === 'nouveau' ? 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]' :
                        alert.statut === 'en_cours' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {alert.statut === 'nouveau' ? 'Nouveau' : 
                         alert.statut === 'en_cours' ? 'En cours' : 'Résolu'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-error-dark)] mb-2">{alert.description}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[var(--color-error)]">{formatDate(alert.date_creation)}</span>
                      {alert.actions_recommandees && (
                        <ElegantButton variant="ghost" size="sm">
                          Actions
                        </ElegantButton>
                      )}
                    </div>
                  </motion.div>
                )) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-emerald-50/80 rounded-2xl text-center border border-emerald-200/60"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-emerald-100 rounded-2xl">
                        <Shield className="w-8 h-8 text-emerald-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-emerald-900 mb-2">Aucune alerte de sécurité</h3>
                    <p className="text-sm text-emerald-700">Système sécurisé</p>
                  </motion.div>
                )}
              </div>
            )}
          </UnifiedCard>
        </div>

        {/* User Activity Summary */}
        {userActivity && (
          <UnifiedCard variant="elevated" size="lg">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-white/90 rounded-2xl">
                <Users className="h-6 w-6 text-[var(--color-info)]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Activité des Utilisateurs (24h)</h2>
                <p className="text-neutral-600">Métriques d'utilisation du système</p>
              </div>
            </div>

            {isLoadingActivity ? (
              <div className="flex justify-center items-center py-16">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-6 rounded-2xl border bg-[var(--color-primary-lightest)]/80 border-[var(--color-primary-light)]/60"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-[var(--color-primary-darker)]">Connexions</span>
                    <UserCheck className="h-4 w-4 text-[var(--color-primary)]" />
                  </div>
                  <p className="text-lg font-bold text-[var(--color-primary-darker)]">
                    {userActivity.connexions_24h}
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-6 rounded-2xl border bg-[var(--color-error-lightest)]/80 border-[var(--color-error-light)]/60"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-red-900">Échecs</span>
                    <AlertTriangle className="h-4 w-4 text-[var(--color-error)]" />
                  </div>
                  <p className="text-lg font-bold text-red-900">
                    {userActivity.echecs_connexion_24h}
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 rounded-2xl border bg-emerald-50/80 border-emerald-200/60"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-emerald-900">Actions</span>
                    <Activity className="h-4 w-4 text-emerald-600" />
                  </div>
                  <p className="text-lg font-bold text-emerald-900">
                    {userActivity.actions_24h}
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-2xl border bg-[var(--color-info-lightest)]/80 border-purple-200/60"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-purple-900">Temps moyen</span>
                    <Clock className="h-4 w-4 text-[var(--color-info)]" />
                  </div>
                  <p className="text-lg font-bold text-purple-900">
                    {userActivity.duree_moyenne_session}
                  </p>
                </motion.div>
              </div>
            )}
          </UnifiedCard>
        )}

        {/* Quick Actions - Security */}
        <UnifiedCard variant="elevated" size="lg">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">
              Actions Rapides - Sécurité
            </h2>
            <p className="text-neutral-600">Gestion de la sécurité et de l'administration</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link to="/security/users">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-primary-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Utilisateurs</h3>
                <p className="text-sm text-neutral-600">Gérer les comptes</p>
              </motion.div>
            </Link>

            <Link to="/security/roles">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-emerald-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Key className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Rôles & Permissions</h3>
                <p className="text-sm text-neutral-600">Configuration des droits</p>
              </motion.div>
            </Link>

            <Link to="/security/audit">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-purple-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-info-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="h-6 w-6 text-[var(--color-info)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Journal d'Audit</h3>
                <p className="text-sm text-neutral-600">Traçabilité complète</p>
              </motion.div>
            </Link>

            <Link to="/security/settings">
              <motion.div 
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-orange-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[var(--color-warning-lighter)] rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Settings className="h-6 w-6 text-[var(--color-warning)]" />
                </div>
                <h3 className="font-bold text-neutral-900 mb-1">Paramètres Sécurité</h3>
                <p className="text-sm text-neutral-600">Politiques de sécurité</p>
              </motion.div>
            </Link>
          </div>
        </UnifiedCard>
      </div>
    </PageContainer>
  );
};

export default SecurityDashboard;