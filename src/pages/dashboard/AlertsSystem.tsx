import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import {
  AlertTriangle, Bell, Info, CheckCircle, XCircle, TrendingUp,
  TrendingDown, Clock, DollarSign, Users, Package, Settings,
  Filter, Search, Calendar, Download, ChevronRight, Eye,
  EyeOff, Volume2, VolumeX, Mail, MessageSquare, Smartphone,
  Shield, Zap, AlertCircle, Activity, BarChart3, Target
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { useFormattedCurrency } from '../../hooks/useMoneyFormat';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  category: 'finance' | 'operations' | 'clients' | 'stock' | 'performance' | 'security';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  source: string;
  impact: string;
  suggestedAction?: string;
  assignedTo?: string;
  relatedKPI?: string;
  value?: number;
  threshold?: number;
  trend?: 'up' | 'down' | 'stable';
  autoResolve?: boolean;
  resolveTime?: Date;
}

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  comparison: 'greater' | 'less' | 'equal';
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
  notifications: ('email' | 'sms' | 'push' | 'dashboard')[];
  recipients: string[];
}

const AlertsSystem: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const fmtCur = useFormattedCurrency();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);

  // Load real alerts from journal data anomalies
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        const generatedAlerts: Alert[] = [];
        let alertId = 0;

        // Check for unbalanced entries
        for (const entry of entries) {
          if (entry.lines && Array.isArray(entry.lines)) {
            const totalDebit = entry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
            const totalCredit = entry.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
              alertId++;
              generatedAlerts.push({
                id: String(alertId),
                type: 'critical',
                category: 'finance',
                title: 'Écriture déséquilibrée',
                message: `L'écriture ${entry.entryNumber || entry.id} a un écart de ${formatCurrency(Math.abs(totalDebit - totalCredit))}`,
                timestamp: new Date(entry.createdAt || Date.now()),
                priority: 'high',
                status: 'new',
                source: 'Contrôle écritures',
                impact: 'Incohérence comptable',
                suggestedAction: 'Corriger l\'écriture pour équilibrer débit et crédit',
                value: Math.abs(totalDebit - totalCredit),
                trend: 'stable'
              });
            }
          }
        }

        // Check for draft entries (pending validation)
        const draftEntries = entries.filter((e: any) => e.status === 'draft');
        if (draftEntries.length > 0) {
          alertId++;
          generatedAlerts.push({
            id: String(alertId),
            type: 'warning',
            category: 'operations',
            title: 'Écritures en brouillon',
            message: `${draftEntries.length} écriture(s) en attente de validation`,
            timestamp: new Date(),
            priority: 'medium',
            status: 'new',
            source: 'Journal comptable',
            impact: 'Écritures non validées',
            suggestedAction: 'Valider ou supprimer les écritures en brouillon',
            value: draftEntries.length
          });
        }

        // Check for overdue receivables (class 41x with old dates)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        let overdueTotal = 0;
        let overdueCount = 0;
        for (const entry of entries) {
          if (entry.status === 'posted' && entry.lines) {
            for (const line of entry.lines) {
              if (line.accountCode?.startsWith('41') && line.debit > 0) {
                const entryDate = new Date(entry.date);
                if (entryDate < sixtyDaysAgo) {
                  overdueTotal += line.debit;
                  overdueCount++;
                }
              }
            }
          }
        }
        if (overdueCount > 0) {
          alertId++;
          generatedAlerts.push({
            id: String(alertId),
            type: 'warning',
            category: 'clients',
            title: 'Créances vieillissantes',
            message: `${overdueCount} ligne(s) client dépassent 60 jours pour un total de ${formatCurrency(overdueTotal)}`,
            timestamp: new Date(),
            priority: 'medium',
            status: 'new',
            source: 'Analyse créances',
            impact: 'Risque de créances irrécouvrables',
            suggestedAction: 'Relancer les clients concernés',
            value: overdueTotal,
            trend: 'up'
          });
        }

        // Check treasury level (class 5)
        let treasuryBalance = 0;
        for (const entry of entries) {
          if (entry.status === 'posted' && entry.lines) {
            for (const line of entry.lines) {
              if (line.accountCode?.startsWith('5')) {
                treasuryBalance += (line.debit || 0) - (line.credit || 0);
              }
            }
          }
        }
        if (treasuryBalance < 0) {
          alertId++;
          generatedAlerts.push({
            id: String(alertId),
            type: 'critical',
            category: 'finance',
            title: 'Trésorerie négative',
            message: `Le solde de trésorerie est négatif: ${formatCurrency(treasuryBalance)}`,
            timestamp: new Date(),
            priority: 'high',
            status: 'new',
            source: 'Trésorerie',
            impact: 'Risque de rupture de paiement',
            suggestedAction: 'Accélérer le recouvrement ou négocier un découvert',
            value: treasuryBalance,
            trend: 'down'
          });
        }

        setAlerts(generatedAlerts);
      } catch (err) {
        setAlerts([]);
      }
    };
    loadAlerts();
  }, [adapter]);

  const [filter, setFilter] = useState({
    type: 'all',
    category: 'all',
    priority: 'all',
    status: 'all',
    dateRange: 'today'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCreateRule, setShowCreateRule] = useState(false);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertTriangle className="w-5 h-5" />;
      case 'info': return <Info className="w-5 h-5" />;
      case 'success': return <CheckCircle className="w-5 h-5" />;
      default: return <Bell className="w-5 h-5" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'warning': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'info': return 'bg-[#e5e5e5] text-[#525252] border-[var(--color-border)]';
      case 'success': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'finance': return <DollarSign className="w-4 h-4" />;
      case 'operations': return <Settings className="w-4 h-4" />;
      case 'clients': return <Users className="w-4 h-4" />;
      case 'stock': return <Package className="w-4 h-4" />;
      case 'performance': return <BarChart3 className="w-4 h-4" />;
      case 'security': return <Shield className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter.type !== 'all' && alert.type !== filter.type) return false;
    if (filter.category !== 'all' && alert.category !== filter.category) return false;
    if (filter.priority !== 'all' && alert.priority !== filter.priority) return false;
    if (filter.status !== 'all' && alert.status !== filter.status) return false;
    if (searchQuery && !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
    ));
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: 'resolved', resolveTime: new Date() } : alert
    ));
  };

  const handleIgnore = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: 'ignored' } : alert
    ));
  };

  const stats = {
    total: alerts.length,
    critical: alerts.filter(a => a.type === 'critical' && a.status === 'new').length,
    warning: alerts.filter(a => a.type === 'warning' && a.status === 'new').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    resolved: alerts.filter(a => a.status === 'resolved').length
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Centre d'Alertes Intelligentes</h1>
          <p className="text-gray-600 mt-1">Surveillance proactive et gestion des anomalies</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-2 rounded-lg border transition-colors",
              soundEnabled ? "bg-[var(--color-surface-hover)] border-[var(--color-border)]" : "bg-gray-50 border-gray-200"
            )}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-[var(--color-primary)]" /> : <VolumeX className="w-5 h-5 text-gray-700" />}
          </button>

          <button
            onClick={() => setShowCreateRule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
          >
            <Settings className="w-4 h-4" />
            Configurer Règles
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Alertes</span>
            <Bell className="w-5 h-5 text-gray-700" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-700 mt-1">Dernières 24h</p>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Critiques</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-700">{stats.critical}</p>
          <p className="text-xs text-red-600 mt-1">Action immédiate</p>
        </div>

        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-700">Avertissements</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-700">{stats.warning}</p>
          <p className="text-xs text-amber-600 mt-1">À surveiller</p>
        </div>

        <div className="bg-[var(--color-surface-hover)] rounded-lg shadow p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#525252]">{t('status.inProgress')}</span>
            <Clock className="w-5 h-5 text-[#737373]" />
          </div>
          <p className="text-lg font-bold text-[#525252]">{stats.acknowledged}</p>
          <p className="text-xs text-[var(--color-primary)] mt-1">Traitement</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Résolues</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-700">{stats.resolved}</p>
          <p className="text-xs text-green-600 mt-1">{t('common.today')}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -tranprimary-y-1/2 w-5 h-5 text-gray-700" />
            <input
              type="text"
              placeholder="Rechercher dans les alertes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
            >
              <option value="all">Tous types</option>
              <option value="critical">Critique</option>
              <option value="warning">Avertissement</option>
              <option value="info">Information</option>
              <option value="success">{t('common.success')}</option>
            </select>

            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
            >
              <option value="all">Toutes catégories</option>
              <option value="finance">Finance</option>
              <option value="operations">Opérations</option>
              <option value="clients">{t('navigation.clients')}</option>
              <option value="stock">Stock</option>
              <option value="performance">Performance</option>
              <option value="security">Sécurité</option>
            </select>

            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
            >
              <option value="all">Toutes priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>

            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
            >
              <option value="all">Tous statuts</option>
              <option value="new">{t('actions.new')}</option>
              <option value="acknowledged">Reconnu</option>
              <option value="resolved">Résolu</option>
              <option value="ignored">Ignoré</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-700">Aucune alerte active</h3>
            <p className="text-sm text-green-600 mt-1">Tous les indicateurs sont dans les seuils normaux</p>
          </div>
        )}
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={cn(
              "rounded-lg border p-4 transition-all hover:shadow-lg cursor-pointer",
              getAlertColor(alert.type),
              alert.status === 'new' && "animate-pulse"
            )}
            onClick={() => setSelectedAlert(alert)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{alert.title}</h3>
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded-full font-medium",
                      alert.priority === 'high' && "bg-red-200 text-red-800",
                      alert.priority === 'medium' && "bg-amber-200 text-amber-800",
                      alert.priority === 'low' && "bg-green-200 text-green-800"
                    )}>
                      {alert.priority === 'high' ? 'Haute' : alert.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-700">
                      {getCategoryIcon(alert.category)}
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{alert.message}</p>

                  {alert.value !== undefined && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">
                        Valeur: {fmtCur(alert.value)} {alert.threshold && `/ Seuil: ${fmtCur(alert.threshold)}`}
                      </span>
                      {alert.trend && (
                        <span className="flex items-center gap-1">
                          {alert.trend === 'up' ? <TrendingUp className="w-4 h-4 text-red-600" /> :
                           alert.trend === 'down' ? <TrendingDown className="w-4 h-4 text-green-600" /> :
                           <Activity className="w-4 h-4 text-gray-700" />}
                        </span>
                      )}
                    </div>
                  )}

                  {alert.suggestedAction && (
                    <div className="mt-2 p-2 bg-white bg-opacity-50 rounded">
                      <p className="text-sm font-medium">Action suggérée:</p>
                      <p className="text-sm">{alert.suggestedAction}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-700">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-700">
                      Source: {alert.source}
                    </span>
                    {alert.assignedTo && (
                      <span className="text-xs text-gray-700">
                        Assigné à: {alert.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full font-medium",
                  alert.status === 'new' && "bg-[#d4d4d4] text-[#404040]",
                  alert.status === 'acknowledged' && "bg-amber-200 text-amber-800",
                  alert.status === 'resolved' && "bg-green-200 text-green-800",
                  alert.status === 'ignored' && "bg-gray-200 text-gray-800"
                )}>
                  {alert.status === 'new' ? 'Nouveau' :
                   alert.status === 'acknowledged' ? 'Reconnu' :
                   alert.status === 'resolved' ? 'Résolu' : 'Ignoré'}
                </span>

                {alert.status === 'new' && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledge(alert.id);
                      }}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                      title="Reconnaître"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(alert.id);
                      }}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                      title="Résoudre"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIgnore(alert.id);
                      }}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                      title="Ignorer"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Rules */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Règles d'Alertes Actives</h2>
        <div className="space-y-3">
          {alertRules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  rule.enabled ? "bg-green-500" : "bg-gray-300"
                )} />
                <div>
                  <h4 className="font-medium text-gray-900">{rule.name}</h4>
                  <p className="text-sm text-gray-600">
                    {rule.condition} {rule.comparison === 'greater' ? '>' : rule.comparison === 'less' ? '<' : '='} {rule.threshold}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {rule.notifications.map((notif) => (
                  <span key={notif} className="p-1" title={notif}>
                    {notif === 'email' && <Mail className="w-4 h-4 text-gray-700" />}
                    {notif === 'sms' && <MessageSquare className="w-4 h-4 text-gray-700" />}
                    {notif === 'push' && <Smartphone className="w-4 h-4 text-gray-700" />}
                    {notif === 'dashboard' && <Bell className="w-4 h-4 text-gray-700" />}
                  </span>
                ))}
                <button className="p-1 hover:bg-gray-100 rounded" aria-label="Paramètres">
                  <Settings className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlertsSystem;