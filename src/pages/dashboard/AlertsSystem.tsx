import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import {
  AlertTriangle, Bell, Info, CheckCircle, XCircle, TrendingUp,
  TrendingDown, Clock, DollarSign, Users, Package, Settings,
  Filter, Search, Calendar, Download, ChevronRight, Eye,
  EyeOff, Volume2, VolumeX, Mail, MessageSquare, Smartphone,
  Shield, Zap, AlertCircle, Activity, BarChart3, Target, Plus, Trash2, X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatCurrency } from '@/utils/formatters';
import { useFormattedCurrency } from '../../hooks/useMoneyFormat';
import { formatNumber } from '../../utils/formatters';
import { computeDashboardMetrics } from '../../utils/dashboardMetrics';

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

// ─── Indicateurs réels sur lesquels une règle peut porter (tirés du grand livre) ───
type MetricKind = 'currency' | 'percent' | 'count';
// `labelKey` et non `label` : la table est figée au chargement du module.
interface MetricDef { key: string; labelKey: string; kind: MetricKind }
const METRIC_DEFS: MetricDef[] = [
  { key: 'ca', labelKey: 'financialAnalysis.kpiRevenue', kind: 'currency' },
  { key: 'charges', labelKey: 'executiveDigest.kpiTotalExpenses', kind: 'currency' },
  { key: 'resultatNet', labelKey: 'alertsSystem.metricNetResult', kind: 'currency' },
  { key: 'treasury', labelKey: 'alertsSystem.metricCash', kind: 'currency' },
  { key: 'margeNette', labelKey: 'kpisRealTime.seriesNetMargin', kind: 'percent' },
  { key: 'creances', labelKey: 'alertsSystem.metricReceivables', kind: 'currency' },
  { key: 'draftCount', labelKey: 'alertsSystem.metricDrafts', kind: 'count' },
  { key: 'overdueReceivables', labelKey: 'alertsSystem.metricOverdue', kind: 'currency' },
];
const metricDef = (key: string): MetricDef | undefined => METRIC_DEFS.find((d) => d.key === key);

const ALERT_RULES_KEY = 'atlas_alert_rules';
function loadRules(): AlertRule[] {
  try { const v = JSON.parse(localStorage.getItem(ALERT_RULES_KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function saveRules(rules: AlertRule[]): void {
  localStorage.setItem(ALERT_RULES_KEY, JSON.stringify(rules));
}
function compareValue(value: number, comparison: AlertRule['comparison'], threshold: number): boolean {
  if (comparison === 'greater') return value > threshold;
  if (comparison === 'less') return value < threshold;
  return Math.abs(value - threshold) < 0.0001;
}
const EMPTY_RULE_FORM = {
  name: '',
  condition: METRIC_DEFS[0].key,
  comparison: 'greater' as AlertRule['comparison'],
  threshold: 0,
  frequency: 'daily' as AlertRule['frequency'],
  notifications: ['dashboard'] as AlertRule['notifications'],
  recipients: '' as string, // saisie brute (emails séparés par virgule)
};

const AlertsSystem: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const fmtCur = useFormattedCurrency();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  // Incrémenté à chaque CRUD de règle → relance l'évaluation des alertes.
  const [rulesVersion, setRulesVersion] = useState(0);
  const [ruleForm, setRuleForm] = useState({ ...EMPTY_RULE_FORM });

  // Charge les règles persistées (localStorage) au montage et après chaque CRUD.
  useEffect(() => { setAlertRules(loadRules()); }, [rulesVersion]);

  const persistRules = (rules: AlertRule[]) => {
    saveRules(rules);
    setAlertRules(rules);
    setRulesVersion((v) => v + 1);
  };
  const createRule = () => {
    const rule: AlertRule = {
      id: `${Date.now()}`,
      name: ruleForm.name.trim() || t('alertsSystem.unnamedRule'),
      condition: ruleForm.condition,
      threshold: Number(ruleForm.threshold) || 0,
      comparison: ruleForm.comparison,
      frequency: ruleForm.frequency,
      enabled: true,
      notifications: ruleForm.notifications.length ? ruleForm.notifications : ['dashboard'],
      recipients: ruleForm.recipients.split(',').map((r) => r.trim()).filter(Boolean),
    };
    persistRules([...alertRules, rule]);
    setRuleForm({ ...EMPTY_RULE_FORM });
    setShowCreateRule(false);
  };
  const toggleRule = (id: string) =>
    persistRules(alertRules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  const deleteRule = (id: string) => persistRules(alertRules.filter((r) => r.id !== id));

  // Statuts d'alerte persistés (reconnu/résolu/ignoré) par id STABLE, dans localStorage :
  // les alertes sont recalculées depuis le GL à chaque montage, donc sans persistance
  // l'action de traitement était perdue au rechargement.
  const ALERT_STATUS_KEY = 'atlas_alert_status';
  const readAlertStatus = (): Record<string, Alert['status']> => {
    try { return JSON.parse(localStorage.getItem(ALERT_STATUS_KEY) || '{}'); } catch { return {}; }
  };
  const persistAlertStatus = (id: string, status: Alert['status']) => {
    const map = readAlertStatus();
    map[id] = status;
    localStorage.setItem(ALERT_STATUS_KEY, JSON.stringify(map));
  };

  // Load real alerts from journal data anomalies
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        const generatedAlerts: Alert[] = [];
        const statusMap = readAlertStatus();
        let alertId = 0;

        // Check for unbalanced entries (parmi les écritures comptabilisées, pas les brouillons)
        for (const entry of entries) {
          if (entry.status === 'draft') continue;
          if (entry.lines && Array.isArray(entry.lines)) {
            const totalDebit = entry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
            const totalCredit = entry.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
              alertId++;
              generatedAlerts.push({
                id: `unbalanced-${entry.id}`,
                type: 'critical',
                category: 'finance',
                title: t('alertsSystem.unbalancedTitle'),
                message: t('alertsSystem.unbalancedMessage', { ref: String(entry.entryNumber || entry.id), amount: formatCurrency(Math.abs(totalDebit - totalCredit)) }),
                timestamp: new Date(entry.createdAt || Date.now()),
                priority: 'high',
                status: statusMap[`unbalanced-${entry.id}`] || 'new',
                source: t('alertsSystem.sourceEntryControl'),
                impact: t('alertsSystem.impactInconsistency'),
                suggestedAction: t('alertsSystem.actionBalanceEntry'),
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
            id: 'drafts',
            type: 'warning',
            category: 'operations',
            title: t('alertsSystem.draftsTitle'),
            message: t('alertsSystem.draftsMessage', { count: String(draftEntries.length) }),
            timestamp: new Date(),
            priority: 'medium',
            status: statusMap['drafts'] || 'new',
            source: t('alertsSystem.sourceJournal'),
            impact: t('alertsSystem.impactUnvalidated'),
            suggestedAction: t('alertsSystem.actionValidateDrafts'),
            value: draftEntries.length
          });
        }

        // Check for overdue receivables (class 41x with old dates)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        let overdueTotal = 0;
        let overdueCount = 0;
        for (const entry of entries) {
          if ((entry.status === 'validated' || entry.status === 'posted') && entry.lines) {
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
            id: 'overdue-receivables',
            type: 'warning',
            category: 'clients',
            title: t('alertsSystem.agingTitle'),
            message: t('alertsSystem.agingMessage', { count: String(overdueCount), amount: formatCurrency(overdueTotal) }),
            timestamp: new Date(),
            priority: 'medium',
            status: statusMap['overdue-receivables'] || 'new',
            source: t('alertsSystem.sourceReceivables'),
            impact: t('alertsSystem.impactBadDebt'),
            suggestedAction: t('alertsSystem.actionChaseClients'),
            value: overdueTotal,
            trend: 'up'
          });
        }

        // Check treasury level (class 5)
        let treasuryBalance = 0;
        for (const entry of entries) {
          if ((entry.status === 'validated' || entry.status === 'posted') && entry.lines) {
            for (const line of entry.lines) {
              // Classe 5 hors 58 (virements internes en transit)
              if (line.accountCode?.startsWith('5') && !line.accountCode?.startsWith('58')) {
                treasuryBalance += (line.debit || 0) - (line.credit || 0);
              }
            }
          }
        }
        if (treasuryBalance < 0) {
          alertId++;
          generatedAlerts.push({
            id: 'treasury-negative',
            type: 'critical',
            category: 'finance',
            title: t('alertsSystem.negativeCashTitle'),
            message: t('alertsSystem.negativeCashMessage', { amount: formatCurrency(treasuryBalance) }),
            timestamp: new Date(),
            priority: 'high',
            status: statusMap['treasury-negative'] || 'new',
            source: t('alertsSystem.sourceCash'),
            impact: t('alertsSystem.impactPaymentRisk'),
            suggestedAction: t('alertsSystem.actionCollectOrOverdraft'),
            value: treasuryBalance,
            trend: 'down'
          });
        }

        // ─── Snapshot des indicateurs réels (grand livre) pour les règles ───
        const dm = computeDashboardMetrics(entries);
        const metricSnapshot: Record<string, number> = {
          ca: dm.ca,
          charges: dm.charges,
          resultatNet: dm.resultatNet,
          treasury: dm.treasury,
          margeNette: dm.margeNette,
          creances: dm.h.net('41'),
          draftCount: draftEntries.length,
          overdueReceivables: overdueTotal,
        };
        setMetrics(metricSnapshot);

        // ─── Évaluation des règles personnalisées → alertes déclenchées ───
        for (const rule of loadRules()) {
          if (!rule.enabled) continue;
          const def = metricDef(rule.condition);
          if (!def) continue;
          const value = metricSnapshot[rule.condition];
          if (value === undefined) continue;
          if (!compareValue(value, rule.comparison, rule.threshold)) continue;
          const fmtVal = def.kind === 'currency' ? formatCurrency(value)
            : def.kind === 'percent' ? `${value.toFixed(1)} %` : String(Math.round(value));
          const fmtThr = def.kind === 'currency' ? formatCurrency(rule.threshold)
            : def.kind === 'percent' ? `${rule.threshold} %` : String(rule.threshold);
          const op = rule.comparison === 'greater' ? '>' : rule.comparison === 'less' ? '<' : '=';
          generatedAlerts.push({
            id: `rule-${rule.id}`,
            type: 'warning',
            category: 'performance',
            title: t('alertsSystem.ruleTriggeredTitle', { name: rule.name }),
            message: t('alertsSystem.ruleTriggeredMessage', { metric: t(def.labelKey), value: fmtVal, operator: op, threshold: fmtThr }),
            timestamp: new Date(),
            priority: 'medium',
            status: statusMap[`rule-${rule.id}`] || 'new',
            source: t('alertsSystem.sourceCustomRule'),
            impact: t('alertsSystem.impactUserThreshold'),
            suggestedAction: t('alertsSystem.actionCheckMetric'),
            value,
            threshold: rule.threshold,
          });
        }

        setAlerts(generatedAlerts);
      } catch (err) {
        setAlerts([]);
      }
    };
    loadAlerts();
  }, [adapter, rulesVersion]);

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
      case 'info': return 'bg-[var(--color-border)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
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
    persistAlertStatus(alertId, 'acknowledged');
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
    ));
  };

  const handleResolve = (alertId: string) => {
    persistAlertStatus(alertId, 'resolved');
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, status: 'resolved', resolveTime: new Date() } : alert
    ));
  };

  const handleIgnore = (alertId: string) => {
    persistAlertStatus(alertId, 'ignored');
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
          <p className="text-lg font-bold text-gray-900">{formatNumber(stats.total)}</p>
          <p className="text-xs text-gray-700 mt-1">{t('alertsSystem.last24h')}</p>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Critiques</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-700">{stats.critical}</p>
          <p className="text-xs text-red-600 mt-1">{t('alertsSystem.immediateAction')}</p>
        </div>

        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-amber-700">Avertissements</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-amber-700">{stats.warning}</p>
          <p className="text-xs text-amber-600 mt-1">{t('alertsSystem.toWatch')}</p>
        </div>

        <div className="bg-[var(--color-surface-hover)] rounded-lg shadow p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">{t('status.inProgress')}</span>
            <Clock className="w-5 h-5 text-[var(--color-text-tertiary)]" />
          </div>
          <p className="text-lg font-bold text-[var(--color-text-secondary)]">{stats.acknowledged}</p>
          <p className="text-xs text-[var(--color-primary)] mt-1">Traitement</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">{t('alertsSystem.resolved')}</span>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700" />
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
              <option value="all">{t('alertsSystem.allCategories')}</option>
              <option value="finance">Finance</option>
              <option value="operations">{t('alertsSystem.catOperations')}</option>
              <option value="clients">{t('navigation.clients')}</option>
              <option value="stock">Stock</option>
              <option value="performance">Performance</option>
              <option value="security">{t('alertsSystem.catSecurity')}</option>
            </select>

            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-text-tertiary)]"
            >
              <option value="all">{t('alertsSystem.allPriorities')}</option>
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
              <option value="resolved">{t('alertsSystem.statusResolved')}</option>
              <option value="ignored">{t('alertsSystem.statusIgnored')}</option>
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
                      <p className="text-sm font-medium">{t('alertsSystem.suggestedAction')}</p>
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
                  alert.status === 'new' && "bg-[var(--color-border)] text-[#404040]",
                  alert.status === 'acknowledged' && "bg-amber-200 text-amber-800",
                  alert.status === 'resolved' && "bg-green-200 text-green-800",
                  alert.status === 'ignored' && "bg-gray-200 text-gray-800"
                )}>
                  {alert.status === 'new' ? 'Nouveau' :
                   alert.status === 'acknowledged' ? 'Reconnu' :
                   alert.status === 'resolved' ? t('alertsSystem.statusResolved') : t('alertsSystem.statusIgnored')}
                </span>

                {alert.status === 'new' && (
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcknowledge(alert.id);
                      }}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                      title={t('alertsSystem.acknowledge')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(alert.id);
                      }}
                      className="p-1 bg-white rounded hover:bg-gray-100"
                      title={t('alertsSystem.resolve')}
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('alertsSystem.activeRules')}</h2>
        <div className="space-y-3">
          {alertRules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('alertsSystem.noRule')}</p>
              <p className="text-xs mt-1">{t('alertsSystem.noRuleHint')}</p>
            </div>
          )}
          {alertRules.map((rule) => {
            const def = metricDef(rule.condition);
            const kind = def?.kind;
            const fmtByKind = (v: number) => kind === 'currency' ? formatCurrency(v)
              : kind === 'percent' ? `${v.toFixed(1)} %` : String(Math.round(v));
            const thr = kind === 'currency' ? formatCurrency(rule.threshold)
              : kind === 'percent' ? `${rule.threshold} %` : String(rule.threshold);
            const cur = metrics[rule.condition];
            const triggered = cur !== undefined && rule.enabled && compareValue(cur, rule.comparison, rule.threshold);
            return (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={cn("w-3 h-3 rounded-full shrink-0", rule.enabled ? "bg-green-500" : "bg-gray-300")}
                    title={t(rule.enabled ? 'alertsSystem.ruleActiveTitle' : 'alertsSystem.ruleInactiveTitle')}
                    aria-label={t(rule.enabled ? 'alertsSystem.disableRule' : 'alertsSystem.enableRule')}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                      {triggered && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">{t('alertsSystem.triggered')}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {def ? t(def.labelKey) : rule.condition} {rule.comparison === 'greater' ? '>' : rule.comparison === 'less' ? '<' : '='} {thr}
                      {cur !== undefined && <span className="text-gray-400"> · actuel : {fmtByKind(cur)}</span>}
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
                  <button onClick={() => deleteRule(rule.id)} className="p-1 hover:bg-red-50 rounded" aria-label={t('alertsSystem.deleteRule')}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Modal : configurer une règle d'alerte ─── */}
      {showCreateRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setShowCreateRule(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--color-primary)]" /> Nouvelle règle d'alerte
              </h2>
              <button onClick={() => setShowCreateRule(false)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Fermer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('alertsSystem.ruleName')}</label>
                <input
                  type="text" value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder={t('alertsSystem.ruleNamePlaceholder')}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('alertsSystem.watchedMetric')}</label>
                <select
                  value={ruleForm.condition}
                  onChange={(e) => setRuleForm({ ...ruleForm, condition: e.target.value })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                >
                  {METRIC_DEFS.map((d) => <option key={d.key} value={d.key}>{t(d.labelKey)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</label>
                  <select
                    value={ruleForm.comparison}
                    onChange={(e) => setRuleForm({ ...ruleForm, comparison: e.target.value as AlertRule['comparison'] })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                  >
                    <option value="greater">{t('alertsSystem.opGreater')}</option>
                    <option value="less">{t('alertsSystem.opLess')}</option>
                    <option value="equal">{t('alertsSystem.opEqual')}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Seuil</label>
                  <input
                    type="number" value={ruleForm.threshold}
                    onChange={(e) => setRuleForm({ ...ruleForm, threshold: Number(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('alertsSystem.evalFrequency')}</label>
                <select
                  value={ruleForm.frequency}
                  onChange={(e) => setRuleForm({ ...ruleForm, frequency: e.target.value as AlertRule['frequency'] })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
                >
                  <option value="realtime">{t('alertsSystem.freqRealtime')}</option>
                  <option value="hourly">Horaire</option>
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notifications</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(['dashboard', 'email'] as AlertRule['notifications']).map((n) => {
                    const active = ruleForm.notifications.includes(n);
                    return (
                      <button
                        key={n} type="button"
                        onClick={() => setRuleForm({
                          ...ruleForm,
                          notifications: active
                            ? ruleForm.notifications.filter((x) => x !== n)
                            : [...ruleForm.notifications, n],
                        })}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border",
                          active ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]" : "bg-white text-gray-600 border-gray-300"
                        )}
                      >
                        {n === 'dashboard' ? 'Tableau de bord' : 'Email'}
                      </button>
                    );
                  })}
                </div>
              </div>
              {ruleForm.notifications.includes('email') && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('alertsSystem.emailRecipients')}</label>
                  <input
                    type="text" value={ruleForm.recipients}
                    onChange={(e) => setRuleForm({ ...ruleForm, recipients: e.target.value })}
                    placeholder="dg@societe.com, daf@societe.com"
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  />
                </div>
              )}
            </div>
            <div className="p-5 border-t flex gap-2">
              <button onClick={() => setShowCreateRule(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={createRule} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]">
                <Plus className="w-4 h-4" /> Créer la règle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsSystem;