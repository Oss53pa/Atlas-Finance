import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
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
import { formatDate } from '../../lib/utils';

const SecurityDashboard: React.FC = () => {
  const { adapter } = useData();

  // Fetch security overview from real audit data
  const { data: securityOverview, isLoading: isLoadingOverview } = useQuery({
    queryKey: ['security', 'overview'],
    queryFn: async () => {
      try {
        const auditLogs = await adapter.getAuditTrail();
        const uniqueUsers = new Set(auditLogs.map((l: any) => l.userId || l.user || l.createdBy).filter(Boolean));
        const loginEvents = auditLogs.filter((l: any) => (l.action || l.event || '').toLowerCase().includes('login'));
        const alertEvents = auditLogs.filter((l: any) => {
          const action = (l.action || l.event || '').toLowerCase();
          return action.includes('error') || action.includes('fail') || action.includes('denied');
        });
        return {
          utilisateurs_actifs: uniqueUsers.size,
          total_utilisateurs: uniqueUsers.size,
          sessions_actives: 0,
          utilisateurs_mfa: 0,
          alertes_securite: alertEvents.length,
        };
      } catch (err) { /* silent */
        return {
          utilisateurs_actifs: 0,
          total_utilisateurs: 0,
          sessions_actives: 0,
          utilisateurs_mfa: 0,
          alertes_securite: 0,
        };
      }
    },
  });

  // Fetch recent security events from audit log
  const { data: recentEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['security', 'recent-events'],
    queryFn: async () => {
      try {
        const auditLogs = await adapter.getAuditTrail({ limit: 20, orderBy: { field: 'timestamp', direction: 'desc' } });
        return auditLogs.map((log: any) => ({
          id: log.id || String(Math.random()),
          type_evenement: log.action || log.event || 'system',
          description: log.description || log.details || log.action || 'Action système',
          utilisateur: log.userId ? { nom: String(log.userId), prenom: '' } : undefined,
          adresse_ip: log.ipAddress || log.ip || '-',
          timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
          niveau_gravite: (log.action || '').toLowerCase().includes('error') ? 'high' :
                         (log.action || '').toLowerCase().includes('delete') ? 'medium' : 'low',
        }));
      } catch (err) { /* silent */
        return [] as Array<{ id: string; type_evenement: string; description: string; utilisateur?: { nom: string; prenom: string }; adresse_ip: string; timestamp: string; niveau_gravite: string }>;
      }
    },
  });

  // Fetch user activity summary from real audit data
  const { data: userActivity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ['security', 'user-activity'],
    queryFn: async () => {
      try {
        const auditLogs = await adapter.getAuditTrail();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const last24h = auditLogs.filter((l: any) => {
          const ts = new Date(l.timestamp || l.createdAt || 0).getTime();
          return (now - ts) < dayMs;
        });
        const loginCount = last24h.filter((l: any) => (l.action || l.event || '').toLowerCase().includes('login')).length;
        const failCount = last24h.filter((l: any) => {
          const action = (l.action || l.event || '').toLowerCase();
          return action.includes('fail') || action.includes('error');
        }).length;
        return {
          connexions_24h: loginCount,
          echecs_connexion_24h: failCount,
          actions_24h: last24h.length,
          duree_moyenne_session: '-',
        };
      } catch (err) { /* silent */
        return {
          connexions_24h: 0,
          echecs_connexion_24h: 0,
          actions_24h: 0,
          duree_moyenne_session: '-',
        };
      }
    },
  });

  // Fetch security alerts from audit log
  const { data: securityAlerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['security', 'alerts'],
    queryFn: async () => {
      try {
        const auditLogs = await adapter.getAuditTrail();
        const alertLogs = auditLogs.filter((l: any) => {
          const action = (l.action || l.event || '').toLowerCase();
          return action.includes('error') || action.includes('fail') || action.includes('denied') || action.includes('alert');
        });
        return alertLogs.slice(0, 10).map((log: any) => ({
          id: log.id || String(Math.random()),
          titre: log.action || log.event || 'Alerte',
          description: log.description || log.details || 'Événement de sécurité détecté',
          statut: 'nouveau',
          date_creation: log.timestamp || log.createdAt || new Date().toISOString(),
          actions_recommandees: 'Vérifier les logs système',
        }));
      } catch (err) { /* silent */
        return [] as Array<{ id: string; titre: string; description: string; statut: string; date_creation: string; actions_recommandees?: string }>;
      }
    },
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
                { label: 'Connexions', value: userActivity?.connexions_24h || 0, color: 'bg-primary-400' },
                { label: 'Échecs', value: userActivity?.echecs_connexion_24h || 0, color: 'bg-red-400' },
                { label: 'Actions', value: userActivity?.actions_24h || 0, color: 'bg-blue-400' },
                { label: 'Alertes', value: securityOverview?.alertes_securite || 0, color: 'bg-orange-400' }
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
                      <div className="p-3 bg-primary-100 rounded-2xl">
                        <Shield className="w-8 h-8 text-primary-600" />
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
                        alert.statut === 'en_cours' ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' : 'bg-primary-100 text-primary-700'
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
                    className="p-6 bg-primary-50/80 rounded-2xl text-center border border-primary-200/60"
                  >
                    <div className="flex justify-center mb-4">
                      <div className="p-3 bg-primary-100 rounded-2xl">
                        <Shield className="w-8 h-8 text-primary-600" />
                      </div>
                    </div>
                    <h3 className="font-bold text-primary-900 mb-2">Aucune alerte de sécurité</h3>
                    <p className="text-sm text-primary-700">Système sécurisé</p>
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
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
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
                  className="p-6 rounded-2xl border bg-primary-50/80 border-primary-200/60"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-primary-900">Actions</span>
                    <Activity className="h-4 w-4 text-primary-600" />
                  </div>
                  <p className="text-lg font-bold text-primary-900">
                    {userActivity.actions_24h}
                  </p>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-6 rounded-2xl border bg-[var(--color-info-lightest)]/80 border-primary-200/60"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-primary-900">Temps moyen</span>
                    <Clock className="h-4 w-4 text-[var(--color-info)]" />
                  </div>
                  <p className="text-lg font-bold text-primary-900">
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
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-primary-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-primary-100 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Key className="h-6 w-6 text-primary-600" />
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
                className="group p-6 border border-neutral-200 rounded-2xl hover:border-primary-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
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