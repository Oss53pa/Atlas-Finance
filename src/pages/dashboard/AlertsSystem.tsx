import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, Bell, Info, CheckCircle, XCircle, TrendingUp,
  TrendingDown, Clock, DollarSign, Users, Package, Settings,
  Filter, Search, Calendar, Download, ChevronRight, Eye,
  EyeOff, Volume2, VolumeX, Mail, MessageSquare, Smartphone,
  Shield, Zap, AlertCircle, Activity, BarChart3, Target
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'critical',
      category: 'finance',
      title: 'Trésorerie critique',
      message: 'Le niveau de trésorerie est tombé en dessous du seuil minimal de 500,000 DH',
      timestamp: new Date(Date.now() - 300000),
      priority: 'high',
      status: 'new',
      source: 'Système de monitoring',
      impact: 'Risque de rupture de paiement fournisseurs',
      suggestedAction: 'Accélérer le recouvrement client ou négocier un découvert bancaire',
      value: 450000,
      threshold: 500000,
      trend: 'down'
    },
    {
      id: '2',
      type: 'warning',
      category: 'clients',
      title: 'Créances vieillissantes',
      message: '12 factures dépassent 60 jours d\'échéance pour un total de 234,000 DH',
      timestamp: new Date(Date.now() - 3600000),
      priority: 'medium',
      status: 'acknowledged',
      source: 'Module Recouvrement',
      impact: 'Risque de créances irrécouvrables',
      suggestedAction: 'Lancer une campagne de relance intensive',
      assignedTo: 'Service Recouvrement',
      value: 234000,
      trend: 'up'
    },
    {
      id: '3',
      type: 'success',
      category: 'performance',
      title: 'Objectif CA atteint',
      message: 'Le chiffre d\'affaires mensuel a dépassé l\'objectif de 15%',
      timestamp: new Date(Date.now() - 7200000),
      priority: 'low',
      status: 'resolved',
      source: 'KPI Dashboard',
      impact: 'Impact positif sur la rentabilité',
      value: 2300000,
      threshold: 2000000,
      trend: 'up',
      autoResolve: true,
      resolveTime: new Date()
    },
    {
      id: '4',
      type: 'warning',
      category: 'stock',
      title: 'Rupture de stock imminente',
      message: 'Stock critique pour 5 produits best-sellers',
      timestamp: new Date(Date.now() - 10800000),
      priority: 'high',
      status: 'new',
      source: 'Gestion des stocks',
      impact: 'Perte potentielle de ventes',
      suggestedAction: 'Commander en urgence auprès des fournisseurs',
      relatedKPI: 'inventory_turnover'
    },
    {
      id: '5',
      type: 'info',
      category: 'operations',
      title: 'Maintenance planifiée',
      message: 'Maintenance du système prévue ce soir de 22h à 23h',
      timestamp: new Date(Date.now() - 14400000),
      priority: 'low',
      status: 'acknowledged',
      source: 'IT Department',
      impact: 'Indisponibilité temporaire du système'
    }
  ]);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      name: 'Trésorerie minimale',
      condition: 'cash_balance',
      threshold: 500000,
      comparison: 'less',
      frequency: 'realtime',
      enabled: true,
      notifications: ['email', 'dashboard', 'sms'],
      recipients: ['cfo@company.com', 'treasurer@company.com']
    },
    {
      id: '2',
      name: 'Créances > 60 jours',
      condition: 'overdue_invoices',
      threshold: 60,
      comparison: 'greater',
      frequency: 'daily',
      enabled: true,
      notifications: ['email', 'dashboard'],
      recipients: ['ar@company.com']
    },
    {
      id: '3',
      name: 'Taux de conversion',
      condition: 'conversion_rate',
      threshold: 2,
      comparison: 'less',
      frequency: 'hourly',
      enabled: true,
      notifications: ['dashboard'],
      recipients: ['sales@company.com']
    }
  ]);

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

  // Simulation de nouvelles alertes
  useEffect(() => {
    const interval = setInterval(() => {
      const random = Math.random();
      if (random > 0.7) {
        const newAlert: Alert = {
          id: `new-${Date.now()}`,
          type: random > 0.9 ? 'critical' : random > 0.8 ? 'warning' : 'info',
          category: ['finance', 'operations', 'clients', 'stock', 'performance'][Math.floor(Math.random() * 5)] as Alert['category'],
          title: 'Nouvelle alerte détectée',
          message: 'Une anomalie a été détectée dans le système',
          timestamp: new Date(),
          priority: random > 0.8 ? 'high' : 'medium',
          status: 'new',
          source: 'Monitoring automatique',
          impact: 'À évaluer',
          value: Math.floor(Math.random() * 100000),
          trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as Alert['trend']
        };

        setAlerts(prev => [newAlert, ...prev]);

        // Jouer un son si activé
        if (soundEnabled && newAlert.type === 'critical') {
          // Simuler un son d'alerte
          console.log('🔔 Alerte critique!');
        }
      }
    }, 30000); // Toutes les 30 secondes

    return () => clearInterval(interval);
  }, [soundEnabled]);

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
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-700 border-blue-200';
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
          <h1 className="text-3xl font-bold text-gray-900">Centre d'Alertes Intelligentes</h1>
          <p className="text-gray-600 mt-1">Surveillance proactive et gestion des anomalies</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-2 rounded-lg border transition-colors",
              soundEnabled ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"
            )}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
          </button>

          <button
            onClick={() => setShowCreateRule(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <Bell className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Dernières 24h</p>
        </div>

        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Critiques</span>
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
          <p className="text-xs text-red-600 mt-1">Action immédiate</p>
        </div>

        <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-yellow-700">Avertissements</span>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-yellow-700">{stats.warning}</p>
          <p className="text-xs text-yellow-600 mt-1">À surveiller</p>
        </div>

        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">En cours</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700">{stats.acknowledged}</p>
          <p className="text-xs text-blue-600 mt-1">Traitement</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Résolues</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-700">{stats.resolved}</p>
          <p className="text-xs text-green-600 mt-1">Aujourd'hui</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans les alertes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous types</option>
              <option value="critical">Critique</option>
              <option value="warning">Avertissement</option>
              <option value="info">Information</option>
              <option value="success">Succès</option>
            </select>

            <select
              value={filter.category}
              onChange={(e) => setFilter({ ...filter, category: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes catégories</option>
              <option value="finance">Finance</option>
              <option value="operations">Opérations</option>
              <option value="clients">Clients</option>
              <option value="stock">Stock</option>
              <option value="performance">Performance</option>
              <option value="security">Sécurité</option>
            </select>

            <select
              value={filter.priority}
              onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Toutes priorités</option>
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>

            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous statuts</option>
              <option value="new">Nouveau</option>
              <option value="acknowledged">Reconnu</option>
              <option value="resolved">Résolu</option>
              <option value="ignored">Ignoré</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
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
                      alert.priority === 'medium' && "bg-yellow-200 text-yellow-800",
                      alert.priority === 'low' && "bg-green-200 text-green-800"
                    )}>
                      {alert.priority === 'high' ? 'Haute' : alert.priority === 'medium' ? 'Moyenne' : 'Basse'}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {getCategoryIcon(alert.category)}
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{alert.message}</p>

                  {alert.value !== undefined && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">
                        Valeur: {alert.value.toLocaleString()} {alert.threshold && `/ Seuil: ${alert.threshold.toLocaleString()}`}
                      </span>
                      {alert.trend && (
                        <span className="flex items-center gap-1">
                          {alert.trend === 'up' ? <TrendingUp className="w-4 h-4 text-red-600" /> :
                           alert.trend === 'down' ? <TrendingDown className="w-4 h-4 text-green-600" /> :
                           <Activity className="w-4 h-4 text-gray-400" />}
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
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      Source: {alert.source}
                    </span>
                    {alert.assignedTo && (
                      <span className="text-xs text-gray-500">
                        Assigné à: {alert.assignedTo}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className={cn(
                  "px-3 py-1 text-xs rounded-full font-medium",
                  alert.status === 'new' && "bg-blue-200 text-blue-800",
                  alert.status === 'acknowledged' && "bg-yellow-200 text-yellow-800",
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
                    {notif === 'email' && <Mail className="w-4 h-4 text-gray-400" />}
                    {notif === 'sms' && <MessageSquare className="w-4 h-4 text-gray-400" />}
                    {notif === 'push' && <Smartphone className="w-4 h-4 text-gray-400" />}
                    {notif === 'dashboard' && <Bell className="w-4 h-4 text-gray-400" />}
                  </span>
                ))}
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Settings className="w-4 h-4 text-gray-400" />
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