import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { FeatureGate, UpgradeBanner } from '../../components/gating';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { toast } from 'react-hot-toast';
import {
  Key,
  Link,
  Cloud,
  Server,
  Shield,
  Activity,
  Settings,
  CheckCircle,
  AlertCircle,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Download,
  Upload,
  Code,
  Database,
  GitBranch,
  Globe,
  Lock,
  Unlock,
  Zap,
  Clock,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface APIKeyData {
  id: number;
  name: string;
  key: string;
  environment: string;
  status: string;
  created: string;
  lastUsed: string;
  permissions: string[];
  rateLimit: string;
}

interface WebhookData {
  id: number;
  url: string;
  events: string[];
  status: string;
  created: string;
  lastTriggered: string;
  successRate: number;
}

interface IntegrationData {
  id: number;
  name: string;
  category: string;
  status: string;
  icon: string;
  description: string;
  lastSync: string | null;
  dataPoints: number;
}

type DeletableItem = APIKeyData | WebhookData | IntegrationData;

const APIIntegrationsPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAPI, setSelectedAPI] = useState<APIKeyData | null>(null);
  const [showAPIKey, setShowAPIKey] = useState<{ [key: string]: boolean }>({});
  const [showNewAPIModal, setShowNewAPIModal] = useState(false);
  const [showNewWebhookModal, setShowNewWebhookModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<IntegrationData | null>(null);
  const [showEditModal, setShowEditModal] = useState<APIKeyData | WebhookData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeletableItem | null>(null);
  const [showCodeExamples, setShowCodeExamples] = useState<string | null>(null);
  const [newAPIForm, setNewAPIForm] = useState({
    name: '',
    environment: 'Test',
    permissions: [] as string[],
    rateLimit: '5000'
  });
  const [newWebhookForm, setNewWebhookForm] = useState({
    url: '',
    events: [] as string[]
  });

  const tabs = [
    { id: 'overview', label: t('apiIntegrations.tabOverview'), icon: BarChart3 },
    { id: 'api-keys', label: t('apiIntegrations.tabApiKeys'), icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Link },
    { id: 'integrations', label: t('apiIntegrations.tabIntegrations'), icon: Cloud },
    { id: 'documentation', label: 'Documentation', icon: Code },
    { id: 'logs', label: t('navigation.journals'), icon: Activity }
  ];

  // Clés API — créées par l'utilisateur (départ vide)
  const [apiKeys, setApiKeys] = useState<APIKeyData[]>([]);

  // Webhooks — créés par l'utilisateur (départ vide)
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);

  // Catalogue d'intégrations disponibles (toutes déconnectées par défaut)
  const integrations: IntegrationData[] = [
    { id: 1, name: 'Salesforce', category: t('apiIntegrations.catCRM'), status: 'disconnected', icon: '🔗', description: t('apiIntegrations.integSalesforceDesc'), lastSync: null, dataPoints: 0 },
    { id: 2, name: 'Stripe', category: t('apiIntegrations.catPayments'), status: 'disconnected', icon: '💳', description: t('apiIntegrations.integStripeDesc'), lastSync: null, dataPoints: 0 },
    { id: 3, name: 'Google Workspace', category: t('apiIntegrations.catProductivity'), status: 'disconnected', icon: '📧', description: t('apiIntegrations.integGoogleDesc'), lastSync: null, dataPoints: 0 },
    { id: 4, name: 'Slack', category: t('apiIntegrations.catCommunication'), status: 'disconnected', icon: '💬', description: t('apiIntegrations.integSlackDesc'), lastSync: null, dataPoints: 0 },
    { id: 5, name: 'QuickBooks', category: t('apiIntegrations.catAccounting'), status: 'disconnected', icon: '📊', description: t('apiIntegrations.integQuickBooksDesc'), lastSync: null, dataPoints: 0 },
    { id: 6, name: 'Microsoft Teams', category: t('apiIntegrations.catCommunication'), status: 'disconnected', icon: '👥', description: t('apiIntegrations.integTeamsDesc'), lastSync: null, dataPoints: 0 },
  ];

  // Logs API — depuis la table auditLogs de l'adaptateur
  const [apiLogs, setApiLogs] = useState<Array<{ id: number; timestamp: string; method: string; endpoint: string; status: number; duration: string; ip: string; userAgent: string; error?: string }>>([]);

  useEffect(() => {
    adapter.getAll<any>('auditLogs').then(logs => {
      const mapped = logs.slice(0, 50).map((log: any, i: number) => ({
        id: i + 1,
        timestamp: log.timestamp || log.createdAt || new Date().toISOString(),
        method: log.method || 'GET',
        endpoint: log.endpoint || log.action || '/api/v1/unknown',
        status: log.statusCode || 200,
        duration: log.duration ? `${log.duration}ms` : '-',
        ip: log.ip || '-',
        userAgent: log.userAgent || log.source || 'Atlas FnA',
        error: log.error || undefined,
      }));
      setApiLogs(mapped);
    }).catch(() => { /* afficher liste vide */ });
  }, [adapter]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('apiIntegrations.copiedToClipboard'));
  };

  // Handler functions
  const handleGenerateNewAPI = () => {
    setShowNewAPIModal(true);
  };

  const handleCreateAPI = () => {
    if (!newAPIForm.name) {
      toast.error(t('apiIntegrations.enterKeyName'));
      return;
    }

    const prefix = newAPIForm.environment === 'Production' ? 'pk_live' : 'pk_test';
    const randomKey = `${prefix}_${Date.now().toString(36)}`;
    const now = new Date().toISOString().slice(0, 10);
    setApiKeys(prev => [...prev, {
      id: Date.now(),
      name: newAPIForm.name,
      key: randomKey,
      environment: newAPIForm.environment,
      status: 'active',
      created: now,
      lastUsed: '-',
      permissions: newAPIForm.permissions,
      rateLimit: `${newAPIForm.rateLimit} req/hour`,
    }]);
    toast.success(t('apiIntegrations.apiKeyCreated', { name: newAPIForm.name }));
    setShowNewAPIModal(false);
    setNewAPIForm({ name: '', environment: 'Test', permissions: [], rateLimit: '5000' });
  };

  const handleCreateWebhook = () => {
    if (!newWebhookForm.url || newWebhookForm.events.length === 0) {
      toast.error(t('apiIntegrations.fillRequiredFields'));
      return;
    }

    setWebhooks(prev => [...prev, {
      id: Date.now(),
      url: newWebhookForm.url,
      events: newWebhookForm.events,
      status: 'active',
      created: new Date().toISOString().slice(0, 10),
      lastTriggered: '-',
      successRate: 100,
    }]);
    toast.success(t('apiIntegrations.webhookCreated'));
    setShowNewWebhookModal(false);
    setNewWebhookForm({ url: '', events: [] });
  };

  const handleConfigureIntegration = (integration: IntegrationData) => {
    setShowConfigModal(integration);
  };

  const handleDisconnectIntegration = (integration: IntegrationData) => {
    setShowDeleteConfirm(integration);
  };

  const handleConnectIntegration = (integration: IntegrationData) => {
    toast.success(t('apiIntegrations.connectionInitiated', { name: integration.name }));
    // Simulate connection process
    setTimeout(() => {
      toast.success(t('apiIntegrations.connectedSuccess', { name: integration.name }));
    }, 2000);
  };

  const handleEditItem = (item: APIKeyData | WebhookData) => {
    setShowEditModal(item);
  };

  const handleDeleteItem = (item: DeletableItem) => {
    setShowDeleteConfirm(item);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      toast.success(t('apiIntegrations.itemDeleted', { name: (showDeleteConfirm as any).name || (showDeleteConfirm as any).url || t('apiIntegrations.deleteItemFallback') }));
      setShowDeleteConfirm(null);
    }
  };

  const handleDownload = (type: string) => {
    toast.success(t('apiIntegrations.downloadStarted', { type }));
    // Simulate download
    setTimeout(() => {
      toast.success(t('apiIntegrations.downloadSuccess', { type }));
    }, 1000);
  };

  const handleViewCode = (language: string) => {
    setShowCodeExamples(language);
  };

  const getStatusColor = (status: string | number) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 200:
        return 'text-[var(--color-success)]';
      case 'inactive':
      case 'disconnected':
      case 400:
      case 401:
      case 403:
      case 404:
        return 'text-[var(--color-error)]';
      case 'pending':
        return 'text-[var(--color-warning)]';
      default:
        return 'text-[var(--color-text-tertiary)]';
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* API Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-8 h-8 text-[var(--color-primary)]" />
                  <span className="text-xs text-green-500 font-medium">+12%</span>
                </div>
                <div className="text-lg font-bold">{apiLogs.length}</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.statApiLogs')}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-[var(--color-success)]" />
                  <span className="text-xs text-green-500 font-medium">99.9%</span>
                </div>
                <div className="text-lg font-bold">{apiLogs.length > 0 ? `${Math.round(apiLogs.reduce((s, l) => s + (parseInt(l.duration) || 0), 0) / apiLogs.length)}ms` : '—'}</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.statAvgResponse')}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Link className="w-8 h-8 text-[var(--color-secondary)]" />
                  <span className="text-xs text-green-500 font-medium">Active</span>
                </div>
                <div className="text-lg font-bold">{integrations.filter(i => i.status === 'connected').length}</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.statActiveIntegrations')}</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-8 h-8 text-[var(--color-warning)]" />
                  <span className="text-xs text-green-500 font-medium">{t('apiIntegrations.secured')}</span>
                </div>
                <div className="text-lg font-bold">{apiKeys.filter(k => k.status === 'active').length}</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.statActiveKeys')}</div>
              </motion.div>
            </div>

            {/* Usage Graph */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">{t('apiIntegrations.usageTitle')}</h3>
              <div className="h-64 flex items-end space-x-2">
                {[65, 78, 82, 91, 85, 73, 88].map((height, index) => (
                  <div key={index} className="flex-1">
                    <div className="text-xs text-center text-[var(--color-text-tertiary)] mb-1">
                      {[t('apiIntegrations.dayMon'), t('apiIntegrations.dayTue'), t('apiIntegrations.dayWed'), t('apiIntegrations.dayThu'), t('apiIntegrations.dayFri'), t('apiIntegrations.daySat'), t('apiIntegrations.daySun')][index]}
                    </div>
                    <div
                      className="bg-gradient-to-t from-[var(--color-primary)] to-[var(--color-primary)] rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h3 className="font-semibold mb-3">{t('apiIntegrations.quickActions')}</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleGenerateNewAPI}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      {t('apiIntegrations.generateNewKey')}
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowNewWebhookModal(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      {t('apiIntegrations.configureWebhook')}
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('integrations')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      {t('apiIntegrations.addIntegration')}
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h3 className="font-semibold mb-3">{t('apiIntegrations.systemStatus')}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">API REST</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-success)]">{t('apiIntegrations.operational')}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Webhooks</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-success)]">{t('apiIntegrations.operational')}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">OAuth 2.0</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-success)]">{t('apiIntegrations.operational')}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">GraphQL</span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />
                      <span className="text-xs text-[var(--color-warning)]">{t('apiIntegrations.maintenance')}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'api-keys':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t('apiIntegrations.manageKeys')}</h3>
              <button
                onClick={handleGenerateNewAPI}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                <Plus className="w-4 h-4" />
                {t('apiIntegrations.newKey')}
              </button>
            </div>

            <div className="space-y-4">
              {apiKeys.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">{t('apiIntegrations.noKeys')}</p>
                  <p className="text-xs mt-1">{t('apiIntegrations.noKeysHint')}</p>
                </div>
              )}
              {apiKeys.map((apiKey) => (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{apiKey.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apiKey.status === 'active'
                            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                            : 'bg-[var(--color-error-light)] text-[var(--color-error)]'
                        }`}>
                          {apiKey.status === 'active' ? t('apiIntegrations.statusActive') : t('apiIntegrations.statusInactive')}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apiKey.environment === 'Production'
                            ? 'bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-secondary)]'
                            : 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]'
                        }`}>
                          {apiKey.environment}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 px-3 py-2 bg-[var(--color-surface-hover)] rounded text-sm font-mono">
                          {showAPIKey[apiKey.id] ? apiKey.key : '•'.repeat(30)}
                        </code>
                        <button
                          onClick={() => setShowAPIKey({ ...showAPIKey, [apiKey.id]: !showAPIKey[apiKey.id] })}
                          className="p-2 hover:bg-[var(--color-border-light)] rounded-lg transition-colors"
                        >
                          {showAPIKey[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="p-2 hover:bg-[var(--color-border-light)] rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
                        <span>{t('apiIntegrations.createdOn', { date: apiKey.created })}</span>
                        <span>•</span>
                        <span>{t('apiIntegrations.keyLastUsed', { date: apiKey.lastUsed })}</span>
                        <span>•</span>
                        <span>{t('apiIntegrations.keyLimit', { limit: apiKey.rateLimit })}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.permissionsLabel')}</span>
                        {apiKey.permissions.map((perm) => (
                          <span key={perm} className="px-2 py-0.5 text-xs bg-[var(--color-border-light)] rounded">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditItem(apiKey)}
                        className="p-2 hover:bg-[var(--color-border-light)] rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          toast.success(t('apiIntegrations.keyRegenerated'));
                        }}
                        className="p-2 hover:bg-[var(--color-border-light)] rounded-lg transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(apiKey)}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'webhooks':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t('apiIntegrations.webhookConfig')}</h3>
              <button
                onClick={() => setShowNewWebhookModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                <Plus className="w-4 h-4" />
                {t('apiIntegrations.newWebhook')}
              </button>
            </div>

            <div className="space-y-4">
              {webhooks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-sm">{t('apiIntegrations.noWebhooks')}</p>
                  <p className="text-xs mt-1">{t('apiIntegrations.noWebhooksHint')}</p>
                </div>
              )}
              {webhooks.map((webhook) => (
                <motion.div
                  key={webhook.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                        <code className="text-sm font-mono">{webhook.url}</code>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          webhook.status === 'active'
                            ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                            : 'bg-[var(--color-error-light)] text-[var(--color-error)]'
                        }`}>
                          {webhook.status === 'active' ? t('apiIntegrations.webhookActive') : t('apiIntegrations.webhookInactive')}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {webhook.events.map((event) => (
                          <span key={event} className="px-2 py-1 text-xs bg-[var(--color-info-light)] text-[var(--color-info)] rounded">
                            {event}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
                        <span>{t('apiIntegrations.webhookCreatedOn', { date: webhook.created })}</span>
                        <span>•</span>
                        <span>{t('apiIntegrations.lastTriggered', { date: webhook.lastTriggered })}</span>
                        <span>•</span>
                        <span className={`${webhook.successRate > 95 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                          {t('apiIntegrations.successRate', { rate: String(webhook.successRate) })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toast(t('apiIntegrations.testingWebhook'))}
                        className="p-2 hover:bg-[var(--color-border-light)] rounded-lg transition-colors">
                        <Activity className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditItem(webhook)}
                        className="p-2 hover:bg-[var(--color-border-light)] rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(webhook)}
                        className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t('apiIntegrations.thirdPartyIntegrations')}</h3>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder={t('apiIntegrations.searchIntegration')}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                />
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                  <Plus className="w-4 h-4" />
                  {t('apiIntegrations.explore')}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)] hover:shadow-[var(--shadow-md)] transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{integration.icon}</span>
                      <div>
                        <h4 className="font-semibold">{integration.name}</h4>
                        <span className="text-xs text-[var(--color-text-tertiary)]">{integration.category}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      integration.status === 'connected'
                        ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                        : integration.status === 'pending'
                        ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                        : 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]'
                    }`}>
                      {integration.status === 'connected' ? t('apiIntegrations.statusConnected') :
                       integration.status === 'pending' ? t('apiIntegrations.statusPending') : t('apiIntegrations.statusDisconnected')}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">{integration.description}</p>

                  {integration.status === 'connected' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-tertiary)]">{t('apiIntegrations.lastSync')}</span>
                        <span>{integration.lastSync}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-tertiary)]">{t('apiIntegrations.dataPoints')}</span>
                        <span className="font-semibold">{integration.dataPoints.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <button
                          onClick={() => handleConfigureIntegration(integration)}
                          className="flex-1 px-3 py-2 bg-[var(--color-border-light)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-border)] transition-colors">
                          {t('apiIntegrations.configure')}
                        </button>
                        <button
                          onClick={() => handleDisconnectIntegration(integration)}
                          className="px-3 py-2 bg-[var(--color-error-light)] text-[var(--color-error)] rounded-lg text-sm hover:bg-[var(--color-error-light)] hover:bg-opacity-75 transition-colors">
                          {t('apiIntegrations.disconnect')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectIntegration(integration)}
                        className="flex-1 px-3 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors">
                        {t('apiIntegrations.connect')}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'documentation':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">{t('apiIntegrations.apiDocumentation')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5 text-[var(--color-primary)]" />
                  {t('apiIntegrations.quickStart')}
                </h4>
                <div className="space-y-2">
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">{t('apiIntegrations.authentication')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.authenticationDesc')}</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">{t('apiIntegrations.firstRequest')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.firstRequestDesc')}</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">SDKs</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.sdksDesc')}</div>
                  </a>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-[var(--color-secondary)]" />
                  {t('apiIntegrations.resources')}
                </h4>
                <div className="space-y-2">
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">{t('navigation.clients')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.manageCustomerData')}</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">{t('apiIntegrations.invoices')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.invoicesDesc')}</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">{t('apiIntegrations.payments')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('apiIntegrations.paymentsDesc')}</div>
                  </a>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[var(--color-success)]" />
                  {t('apiIntegrations.codeExamples')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Node.js</span>
                    <button
                      onClick={() => handleViewCode('Node.js')}
                      className="text-xs text-[var(--color-primary)] hover:underline">{t('apiIntegrations.view')}</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Python</span>
                    <button
                      onClick={() => handleViewCode('Python')}
                      className="text-xs text-[var(--color-primary)] hover:underline">{t('apiIntegrations.view')}</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PHP</span>
                    <button
                      onClick={() => handleViewCode('PHP')}
                      className="text-xs text-[var(--color-primary)] hover:underline">{t('apiIntegrations.view')}</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ruby</span>
                    <button
                      onClick={() => handleViewCode('Ruby')}
                      className="text-xs text-[var(--color-primary)] hover:underline">{t('apiIntegrations.view')}</button>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[var(--color-warning)]" />
                  {t('apiIntegrations.tools')}
                </h4>
                <div className="space-y-3">
                  <button
                    onClick={() => handleDownload('Postman Collection')}
                    className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <span className="text-sm">Postman Collection</span>
                    <Download className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  </button>
                  <button
                    onClick={() => handleDownload('OpenAPI Spec')}
                    className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <span className="text-sm">OpenAPI Spec</span>
                    <Download className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  </button>
                  <button
                    onClick={() => window.open('https://api.atlasfna.com/playground', '_blank')}
                    className="w-full flex items-center justify-between p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <span className="text-sm">API Playground</span>
                    <ExternalLink className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'logs':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{t('apiIntegrations.apiLogsTitle')}</h3>
              <div className="flex items-center gap-2">
                <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                  <option>{t('apiIntegrations.allStatuses')}</option>
                  <option>{t('apiIntegrations.successStatus')}</option>
                  <option>{t('apiIntegrations.clientErrors')}</option>
                  <option>{t('apiIntegrations.serverErrors')}</option>
                </select>
                <button className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-hover)]" aria-label={t('apiIntegrations.refresh')}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('apiIntegrations.colTimestamp')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('apiIntegrations.colMethod')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('apiIntegrations.colStatus')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('apiIntegrations.colDuration')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {apiLogs.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">{t('apiIntegrations.noLogs')}</td></tr>
                  )}
                  {apiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          log.method === 'GET' ? 'bg-[var(--color-info-light)] text-[var(--color-info)]' :
                          log.method === 'POST' ? 'bg-[var(--color-success-light)] text-[var(--color-success)]' :
                          log.method === 'PUT' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' :
                          log.method === 'DELETE' ? 'bg-[var(--color-error-light)] text-[var(--color-error)]' :
                          'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--color-text-primary)]">{log.endpoint}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{log.duration}</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--color-text-tertiary)]">
                {apiLogs.length === 0 ? t('apiIntegrations.noEntries') : t('apiIntegrations.logsShowing', { count: String(apiLogs.length) })}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-surface-hover)]">
                  {t('apiIntegrations.previous')}
                </button>
                <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-surface-hover)]">
                  {t('apiIntegrations.next')}
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <FeatureGate
      feature="api_integrations"
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <UpgradeBanner feature="api_integrations" />
        </div>
      }
    >
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('apiIntegrations.pageTitle')}</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">{t('apiIntegrations.pageSubtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <div className="flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>

      {/* New API Key Modal */}
      <Dialog open={showNewAPIModal} onOpenChange={setShowNewAPIModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('apiIntegrations.createNewKeyTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiIntegrations.keyNameLabel')}
              </label>
              <input
                type="text"
                value={newAPIForm.name}
                onChange={(e) => setNewAPIForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder={t('apiIntegrations.keyNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiIntegrations.environment')}
              </label>
              <select
                value={newAPIForm.environment}
                onChange={(e) => setNewAPIForm(prev => ({ ...prev, environment: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="Test">Test</option>
                <option value="Production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiIntegrations.permissions')}
              </label>
              <div className="space-y-2">
                {['read', 'write', 'delete'].map(perm => (
                  <label key={perm} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAPIForm.permissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewAPIForm(prev => ({ ...prev, permissions: [...prev.permissions, perm] }));
                        } else {
                          setNewAPIForm(prev => ({ ...prev, permissions: prev.permissions.filter(p => p !== perm) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm capitalize">{perm}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiIntegrations.rateLimitLabel')}
              </label>
              <input
                type="number"
                value={newAPIForm.rateLimit}
                onChange={(e) => setNewAPIForm(prev => ({ ...prev, rateLimit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewAPIModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('apiIntegrations.cancel')}
              </button>
              <button
                onClick={handleCreateAPI}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                {t('apiIntegrations.createKey')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Webhook Modal */}
      <Dialog open={showNewWebhookModal} onOpenChange={setShowNewWebhookModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('apiIntegrations.configureNewWebhookTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiIntegrations.webhookUrlLabel')}
              </label>
              <input
                type="url"
                value={newWebhookForm.url}
                onChange={(e) => setNewWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="https://example.com/webhook"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('apiIntegrations.eventsToListen')}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[
                  'invoice.created', 'invoice.paid', 'invoice.overdue',
                  'payment.received', 'payment.failed',
                  'account.created', 'account.updated', 'account.deleted',
                  'document.uploaded', 'document.deleted'
                ].map(event => (
                  <label key={event} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newWebhookForm.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewWebhookForm(prev => ({ ...prev, events: [...prev.events, event] }));
                        } else {
                          setNewWebhookForm(prev => ({ ...prev, events: prev.events.filter(ev => ev !== event) }));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewWebhookModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('apiIntegrations.cancel')}
              </button>
              <button
                onClick={handleCreateWebhook}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                {t('apiIntegrations.createWebhook')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configuration Modal */}
      <Dialog open={!!showConfigModal} onOpenChange={() => setShowConfigModal(null)}>
        <DialogContent className="bg-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {t('apiIntegrations.configOf', { name: showConfigModal?.name || '' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">{t('apiIntegrations.syncSettings')}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('apiIntegrations.autoSync')}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('apiIntegrations.realtimeNotifications')}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('apiIntegrations.syncFrequency')}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>{t('apiIntegrations.every5min')}</option>
                    <option>{t('apiIntegrations.every15min')}</option>
                    <option>{t('apiIntegrations.everyHour')}</option>
                    <option>{t('apiIntegrations.daily')}</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('apiIntegrations.cancel')}
              </button>
              <button
                onClick={() => {
                  toast.success(t('apiIntegrations.configSaved'));
                  setShowConfigModal(null);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                {t('apiIntegrations.save')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('apiIntegrations.confirmDeleteTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('apiIntegrations.confirmDeletePrefix')} <strong>{(showDeleteConfirm as any)?.name || (showDeleteConfirm as any)?.url || t('apiIntegrations.confirmDeleteFallback')}</strong> ?
            </p>
            <p className="text-sm text-gray-700">
              {t('apiIntegrations.deleteIrreversible')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('apiIntegrations.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {t('apiIntegrations.delete')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Code Examples Modal */}
      <Dialog open={!!showCodeExamples} onOpenChange={() => setShowCodeExamples(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('apiIntegrations.codeExampleTitle', { lang: showCodeExamples || '' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{showCodeExamples === 'Node.js' ? `const axios = require('axios');

const apiKey = 'pk_live_YOUR_API_KEY';
const apiUrl = 'https://api.atlasfna.com/v1';

// Exemple de requête GET
axios.get(\`\${apiUrl}/invoices\`, {
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
})
.catch(error => {
});` :
showCodeExamples === 'Python' ? `import requests

api_key = 'pk_live_YOUR_API_KEY'
api_url = 'https://api.atlasfna.com/v1'

# Exemple de requête GET
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

response = requests.get(f'{api_url}/invoices', headers=headers)

if response.status_code == 200:
    invoices = response.json()
    print('Invoices:', invoices)
else:
    print('Error:', response.text)` :
showCodeExamples === 'PHP' ? `<?php
$apiKey = 'pk_live_YOUR_API_KEY';
$apiUrl = 'https://api.atlasfna.com/v1';

// Exemple de requête GET
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => $apiUrl . '/invoices',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $apiKey,
        'Content-Type: application/json'
    ]
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($httpCode == 200) {
    $invoices = json_decode($response, true);
    print_r($invoices);
} else {
    echo 'Error: ' . $response;
}` :
`require 'net/http'
require 'json'

api_key = 'pk_live_YOUR_API_KEY'
api_url = 'https://api.atlasfna.com/v1'

# Exemple de requête GET
uri = URI("#{api_url}/invoices")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Get.new(uri)
request['Authorization'] = "Bearer #{api_key}"
request['Content-Type'] = 'application/json'

response = http.request(request)

if response.code == '200'
  invoices = JSON.parse(response.body)
  puts "Invoices: #{invoices}"
else
  puts "Error: #{response.body}"
end`}</code>
              </pre>
            </div>
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(document.querySelector('pre code')?.textContent || '');
                  toast.success(t('apiIntegrations.codeCopied'));
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                {t('apiIntegrations.copyCode')}
              </button>
              <button
                onClick={() => setShowCodeExamples(null)}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)]"
              >
                {t('apiIntegrations.close')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </FeatureGate>
  );
};

export default APIIntegrationsPage;