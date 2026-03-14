/**
 * SmartAlerts - Système d'alertes intelligentes
 * Notifications automatiques quand les KPIs dépassent les seuils
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import {
  Bell,
  BellOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  X,
  Settings,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit3,
  Trash2,
  Copy,
  Play,
  Pause,
  Eye,
  EyeOff,
  Zap,
  Target,
  BarChart3,
  Activity,
  RefreshCw
} from 'lucide-react';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';
export type AlertCondition = 'greater_than' | 'less_than' | 'equals' | 'between' | 'change_percent' | 'anomaly';

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  kpiId: string;
  kpiName: string;
  condition: AlertCondition;
  threshold: number;
  thresholdMax?: number; // For 'between' condition
  severity: AlertSeverity;
  isActive: boolean;
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
    inApp: boolean;
  };
  recipients?: string[];
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  kpiName: string;
  message: string;
  severity: AlertSeverity;
  currentValue: number;
  threshold: number;
  change?: number;
  triggeredAt: string;
  isRead: boolean;
  isAcknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface KPI {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

interface SmartAlertsProps {
  alerts: Alert[];
  rules: AlertRule[];
  kpis: KPI[];
  onCreateRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'triggerCount'>) => void;
  onUpdateRule: (ruleId: string, updates: Partial<AlertRule>) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, isActive: boolean) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onMarkAsRead: (alertId: string) => void;
  onDismissAlert: (alertId: string) => void;
  className?: string;
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
  },
  success: {
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-700',
  },
};

const conditionLabels: Record<AlertCondition, string> = {
  greater_than: 'Supérieur à',
  less_than: 'Inférieur à',
  equals: 'Égal à',
  between: 'Entre',
  change_percent: 'Variation de',
  anomaly: 'Anomalie détectée',
};

export const SmartAlerts: React.FC<SmartAlertsProps> = ({
  alerts,
  rules,
  kpis,
  onCreateRule,
  onUpdateRule,
  onDeleteRule,
  onToggleRule,
  onAcknowledgeAlert,
  onMarkAsRead,
  onDismissAlert,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'insights'>('alerts');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  // Rule form state
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [selectedKpi, setSelectedKpi] = useState('');
  const [condition, setCondition] = useState<AlertCondition>('greater_than');
  const [threshold, setThreshold] = useState<number>(0);
  const [thresholdMax, setThresholdMax] = useState<number>(0);
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    slack: false,
    inApp: true,
  });
  const [frequency, setFrequency] = useState<'immediate' | 'hourly' | 'daily' | 'weekly'>('immediate');

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical' && !a.isAcknowledged).length;

  const filteredAlerts = alerts.filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (showUnreadOnly && alert.isRead) return false;
    return true;
  });

  const toggleAlertExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(alertId)) {
        next.delete(alertId);
      } else {
        next.add(alertId);
      }
      return next;
    });
  };

  const handleCreateRule = useCallback(() => {
    if (!ruleName.trim() || !selectedKpi) return;

    const kpi = kpis.find(k => k.id === selectedKpi);
    if (!kpi) return;

    onCreateRule({
      name: ruleName.trim(),
      description: ruleDescription.trim() || undefined,
      kpiId: selectedKpi,
      kpiName: kpi.name,
      condition,
      threshold,
      thresholdMax: condition === 'between' ? thresholdMax : undefined,
      severity,
      isActive: true,
      notifications,
      frequency,
    });

    // Reset form
    setRuleName('');
    setRuleDescription('');
    setSelectedKpi('');
    setCondition('greater_than');
    setThreshold(0);
    setThresholdMax(0);
    setSeverity('warning');
    setShowCreateModal(false);
    setEditingRule(null);
  }, [ruleName, ruleDescription, selectedKpi, condition, threshold, thresholdMax, severity, notifications, frequency, kpis, onCreateRule]);

  const renderAlert = (alert: Alert) => {
    const config = severityConfig[alert.severity];
    const Icon = config.icon;
    const isExpanded = expandedAlerts.has(alert.id);

    return (
      <div
        key={alert.id}
        className={cn(
          'border rounded-lg transition-all',
          config.border,
          alert.isRead ? 'opacity-70' : config.bg
        )}
      >
        <div
          className="p-3 cursor-pointer"
          onClick={() => {
            toggleAlertExpand(alert.id);
            if (!alert.isRead) onMarkAsRead(alert.id);
          }}
        >
          <div className="flex items-start gap-3">
            <div className={cn('p-1.5 rounded-lg', config.bg)}>
              <Icon className={cn('w-5 h-5', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('px-2 py-0.5 text-xs rounded-full', config.badge)}>
                  {alert.kpiName}
                </span>
                {!alert.isRead && (
                  <span className="w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <p className="text-sm text-gray-900 font-medium">{alert.message}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {alert.triggeredAt}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Seuil: {alert.threshold}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Actuel: {alert.currentValue}
                </span>
              </div>
            </div>
            <ChevronDown className={cn(
              'w-5 h-5 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )} />
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3 border-t border-gray-100">
            <div className="flex items-center justify-between pt-3">
              <div className="flex items-center gap-2">
                {alert.change !== undefined && (
                  <span className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
                    alert.change >= 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  )}>
                    {alert.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {alert.change >= 0 ? '+' : ''}{alert.change}%
                  </span>
                )}
                {alert.isAcknowledged && (
                  <span className="text-xs text-gray-500">
                    Acquitté par {alert.acknowledgedBy} le {alert.acknowledgedAt}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!alert.isAcknowledged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcknowledgeAlert(alert.id);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Acquitter
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismissAlert(alert.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRule = (rule: AlertRule) => {
    const config = severityConfig[rule.severity];
    const Icon = config.icon;

    return (
      <div
        key={rule.id}
        className={cn(
          'p-4 rounded-lg border transition-colors',
          rule.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={() => onToggleRule(rule.id, !rule.isActive)}
              className={cn(
                'mt-0.5 p-1.5 rounded-full transition-colors',
                rule.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
              )}
            >
              {rule.isActive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{rule.name}</h4>
                <span className={cn('px-2 py-0.5 text-xs rounded-full', config.badge)}>
                  {rule.severity}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                <span className="font-medium">{rule.kpiName}</span>
                {' '}{conditionLabels[rule.condition].toLowerCase()}{' '}
                <span className="font-medium">{rule.threshold}</span>
                {rule.condition === 'between' && <span> et <span className="font-medium">{rule.thresholdMax}</span></span>}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {rule.triggerCount} déclenchement(s)
                </span>
                {rule.lastTriggered && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Dernière: {rule.lastTriggered}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  {rule.notifications.email && <Mail className="w-3 h-3" />}
                  {rule.notifications.push && <Smartphone className="w-3 h-3" />}
                  {rule.notifications.slack && <MessageSquare className="w-3 h-3" />}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setEditingRule(rule);
                setRuleName(rule.name);
                setRuleDescription(rule.description || '');
                setSelectedKpi(rule.kpiId);
                setCondition(rule.condition);
                setThreshold(rule.threshold);
                setThresholdMax(rule.thresholdMax || 0);
                setSeverity(rule.severity);
                setNotifications(rule.notifications);
                setFrequency(rule.frequency);
                setShowCreateModal(true);
              }}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteRule(rule.id)}
              className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Generate insights from KPIs
  const insights = kpis.map(kpi => {
    const changePercent = ((kpi.currentValue - kpi.previousValue) / kpi.previousValue) * 100;
    const isSignificant = Math.abs(changePercent) > 10;

    return {
      kpi,
      changePercent,
      isSignificant,
      trend: kpi.trend,
    };
  }).filter(i => i.isSignificant);

  return (
    <div className={cn('bg-white rounded-xl shadow-sm border border-gray-200', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alertes intelligentes
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-primary text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                {criticalCount} critique(s)
              </span>
            )}
          </h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouvelle règle
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {[
            { id: 'alerts', label: 'Alertes', count: unreadCount },
            { id: 'rules', label: 'Règles', count: rules.filter(r => r.isActive).length },
            { id: 'insights', label: 'Insights', count: insights.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 text-xs rounded-full',
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <>
            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(['all', 'critical', 'warning', 'info', 'success'] as const).map(sev => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-lg transition-colors',
                      severityFilter === sev
                        ? sev === 'all'
                          ? 'bg-gray-800 text-white'
                          : severityConfig[sev as AlertSeverity].badge
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    {sev === 'all' ? 'Toutes' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors',
                  showUnreadOnly ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'
                )}
              >
                {showUnreadOnly ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                Non lues
              </button>
            </div>

            {/* Alert list */}
            {filteredAlerts.length > 0 ? (
              <div className="space-y-2">
                {filteredAlerts.map(renderAlert)}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">Aucune alerte à afficher</p>
              </div>
            )}
          </>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <>
            {rules.length > 0 ? (
              <div className="space-y-3">
                {rules.map(renderRule)}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 mb-4">Aucune règle configurée</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Créer une règle
                </button>
              </div>
            )}
          </>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-3">
            {insights.length > 0 ? (
              insights.map(({ kpi, changePercent, trend }) => (
                <div
                  key={kpi.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    changePercent >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{kpi.name}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {changePercent >= 0 ? 'Hausse' : 'Baisse'} significative détectée
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        'flex items-center gap-1 text-lg font-bold',
                        changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {changePercent >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                        {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(1)}%
                      </div>
                      <p className="text-sm text-gray-500">
                        {kpi.currentValue} {kpi.unit} (vs {kpi.previousValue})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedKpi(kpi.id);
                      setCondition(changePercent >= 0 ? 'greater_than' : 'less_than');
                      setThreshold(kpi.currentValue * 0.9);
                      setShowCreateModal(true);
                    }}
                    className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Zap className="w-3 h-3" />
                    Créer une alerte pour ce KPI
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">Aucune variation significative détectée</p>
                <p className="text-xs text-gray-400 mt-1">Les insights apparaissent quand un KPI varie de plus de 10%</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">
                {editingRule ? 'Modifier la règle' : 'Nouvelle règle d\'alerte'}
              </h3>
              <button onClick={() => {
                setShowCreateModal(false);
                setEditingRule(null);
              }}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la règle
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="ex: Alerte CA en baisse"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* KPI selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  KPI à surveiller
                </label>
                <select
                  value={selectedKpi}
                  onChange={(e) => setSelectedKpi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="">Sélectionner un KPI</option>
                  {kpis.map(kpi => (
                    <option key={kpi.id} value={kpi.id}>
                      {kpi.name} ({kpi.currentValue} {kpi.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condition */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as AlertCondition)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(conditionLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {condition === 'between' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seuil maximum
                  </label>
                  <input
                    type="number"
                    value={thresholdMax}
                    onChange={(e) => setThresholdMax(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sévérité
                </label>
                <div className="flex gap-2">
                  {(['info', 'warning', 'critical'] as AlertSeverity[]).map(sev => {
                    const config = severityConfig[sev];
                    return (
                      <button
                        key={sev}
                        onClick={() => setSeverity(sev)}
                        className={cn(
                          'flex-1 py-2 rounded-lg border-2 transition-all',
                          severity === sev
                            ? `${config.border} ${config.bg}`
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <span className={cn('text-sm font-medium', severity === sev && config.color)}>
                          {sev.charAt(0).toUpperCase() + sev.slice(1)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notifications
                </label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { key: 'email', label: 'Email', icon: Mail },
                    { key: 'push', label: 'Push', icon: Smartphone },
                    { key: 'slack', label: 'Slack', icon: MessageSquare },
                    { key: 'inApp', label: 'In-app', icon: Bell },
                  ].map(({ key, label, icon: Icon }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[key as keyof typeof notifications]}
                        onChange={(e) => setNotifications(prev => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))}
                        className="rounded border-gray-300"
                      />
                      <Icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fréquence des notifications
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                >
                  <option value="immediate">Immédiate</option>
                  <option value="hourly">Résumé horaire</option>
                  <option value="daily">Résumé quotidien</option>
                  <option value="weekly">Résumé hebdomadaire</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRule(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateRule}
                disabled={!ruleName.trim() || !selectedKpi}
                className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
              >
                {editingRule ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartAlerts;
