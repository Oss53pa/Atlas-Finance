import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
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
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'api-keys', label: 'Clés API', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Link },
    { id: 'integrations', label: 'Intégrations', icon: Cloud },
    { id: 'documentation', label: 'Documentation', icon: Code },
    { id: 'logs', label: t('navigation.journals'), icon: Activity }
  ];

  // Mock data for API keys
  const apiKeys = [
    {
      id: 1,
      name: 'Production API',
      key: 'pk_live_51KxG8vH3rE9xN2mP7qR4sT6u',
      environment: 'Production',
      status: 'active',
      created: '2024-01-15',
      lastUsed: '2024-03-20 14:30',
      permissions: ['read', 'write', 'delete'],
      rateLimit: '10000 req/hour'
    },
    {
      id: 2,
      name: 'Test API',
      key: 'pk_test_92LyI9kL4nO8pQ3rS5tU7vW',
      environment: 'Test',
      status: 'active',
      created: '2024-02-01',
      lastUsed: '2024-03-19 09:15',
      permissions: ['read', 'write'],
      rateLimit: '5000 req/hour'
    },
    {
      id: 3,
      name: 'Mobile App API',
      key: 'pk_mobile_73MzJ0lM5oP9qR4sT6uV8wX',
      environment: 'Production',
      status: 'inactive',
      created: '2023-12-10',
      lastUsed: '2024-02-28 16:45',
      permissions: ['read'],
      rateLimit: '2000 req/hour'
    }
  ];

  // Mock webhooks
  const webhooks = [
    {
      id: 1,
      url: 'https://app.atlasfinance.com/webhooks/invoices',
      events: ['invoice.created', 'invoice.paid', 'invoice.overdue'],
      status: 'active',
      created: '2024-01-10',
      lastTriggered: '2024-03-20 11:20',
      successRate: 98.5
    },
    {
      id: 2,
      url: 'https://slack.com/api/atlasfinance-notifications',
      events: ['payment.received', 'payment.failed'],
      status: 'active',
      created: '2024-02-05',
      lastTriggered: '2024-03-19 15:30',
      successRate: 99.8
    },
    {
      id: 3,
      url: 'https://zapier.com/hooks/atlasfinance/accounting',
      events: ['account.created', 'account.updated'],
      status: 'inactive',
      created: '2023-11-20',
      lastTriggered: '2024-01-15 08:45',
      successRate: 95.2
    }
  ];

  // Mock integrations
  const integrations = [
    {
      id: 1,
      name: 'Salesforce',
      category: 'CRM',
      status: 'connected',
      icon: '🔗',
      description: 'Synchronisation bidirectionnelle des données clients',
      lastSync: '2024-03-20 10:00',
      dataPoints: 15420
    },
    {
      id: 2,
      name: 'Stripe',
      category: 'Paiements',
      status: 'connected',
      icon: '💳',
      description: 'Traitement des paiements en ligne',
      lastSync: '2024-03-20 14:30',
      dataPoints: 3256
    },
    {
      id: 3,
      name: 'Google Workspace',
      category: 'Productivité',
      status: 'connected',
      icon: '📧',
      description: 'Intégration email et calendrier',
      lastSync: '2024-03-20 09:15',
      dataPoints: 8745
    },
    {
      id: 4,
      name: 'Slack',
      category: 'Communication',
      status: 'connected',
      icon: '💬',
      description: 'Notifications et alertes en temps réel',
      lastSync: '2024-03-20 15:00',
      dataPoints: 1250
    },
    {
      id: 5,
      name: 'QuickBooks',
      category: 'Comptabilité',
      status: 'disconnected',
      icon: '📊',
      description: 'Synchronisation des données comptables',
      lastSync: '2024-02-15 11:30',
      dataPoints: 0
    },
    {
      id: 6,
      name: 'Microsoft Teams',
      category: 'Communication',
      status: 'pending',
      icon: '👥',
      description: 'Collaboration et messagerie d\'équipe',
      lastSync: null,
      dataPoints: 0
    }
  ];

  // Mock API logs
  const apiLogs = [
    {
      id: 1,
      timestamp: '2024-03-20 15:45:32',
      method: 'POST',
      endpoint: '/api/v1/invoices',
      status: 200,
      duration: '245ms',
      ip: '192.168.1.45',
      userAgent: 'Atlas Finance Mobile/2.1.0'
    },
    {
      id: 2,
      timestamp: '2024-03-20 15:42:18',
      method: 'GET',
      endpoint: '/api/v1/customers/123',
      status: 200,
      duration: '87ms',
      ip: '192.168.1.45',
      userAgent: 'Mozilla/5.0'
    },
    {
      id: 3,
      timestamp: '2024-03-20 15:40:05',
      method: 'PUT',
      endpoint: '/api/v1/payments/456',
      status: 400,
      duration: '125ms',
      ip: '192.168.1.78',
      userAgent: 'Postman/9.0.5',
      error: 'Invalid payment amount'
    },
    {
      id: 4,
      timestamp: '2024-03-20 15:38:22',
      method: 'DELETE',
      endpoint: '/api/v1/documents/789',
      status: 401,
      duration: '45ms',
      ip: '192.168.1.92',
      userAgent: 'curl/7.68.0',
      error: 'Unauthorized'
    },
    {
      id: 5,
      timestamp: '2024-03-20 15:35:14',
      method: 'GET',
      endpoint: '/api/v1/reports/monthly',
      status: 200,
      duration: '1.2s',
      ip: '192.168.1.45',
      userAgent: 'Atlas Finance Desktop/3.0.1'
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copié dans le presse-papier !');
  };

  // Handler functions
  const handleGenerateNewAPI = () => {
    setShowNewAPIModal(true);
  };

  const handleCreateAPI = () => {
    if (!newAPIForm.name) {
      toast.error('Veuillez entrer un nom pour la clé API');
      return;
    }

    // Generate mock API key
    const prefix = newAPIForm.environment === 'Production' ? 'pk_live' : 'pk_test';
    const randomKey = `${prefix}_${Math.random().toString(36).substring(2, 15)}`;

    toast.success(`Clé API "${newAPIForm.name}" créée avec succès !`);
    setShowNewAPIModal(false);
    setNewAPIForm({ name: '', environment: 'Test', permissions: [], rateLimit: '5000' });
  };

  const handleCreateWebhook = () => {
    if (!newWebhookForm.url || newWebhookForm.events.length === 0) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    toast.success('Webhook créé avec succès !');
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
    toast.success(`Connexion à ${integration.name} initiée...`);
    // Simulate connection process
    setTimeout(() => {
      toast.success(`${integration.name} connecté avec succès !`);
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
      toast.success(`${showDeleteConfirm.name || 'Élément'} supprimé avec succès`);
      setShowDeleteConfirm(null);
    }
  };

  const handleDownload = (type: string) => {
    toast.success(`Téléchargement de ${type} démarré...`);
    // Simulate download
    setTimeout(() => {
      toast.success(`${type} téléchargé avec succès !`);
    }, 1000);
  };

  const handleViewCode = (language: string) => {
    setShowCodeExamples(language);
  };

  const getStatusColor = (status: string) => {
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
                <div className="text-lg font-bold">45,230</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Requêtes API / jour</div>
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
                <div className="text-lg font-bold">245ms</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Temps de réponse moyen</div>
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
                <div className="text-lg font-bold">12</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Intégrations actives</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-8 h-8 text-[var(--color-warning)]" />
                  <span className="text-xs text-green-500 font-medium">Sécurisé</span>
                </div>
                <div className="text-lg font-bold">3</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Clés API actives</div>
              </motion.div>
            </div>

            {/* Usage Graph */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">Utilisation API (7 derniers jours)</h3>
              <div className="h-64 flex items-end space-x-2">
                {[65, 78, 82, 91, 85, 73, 88].map((height, index) => (
                  <div key={index} className="flex-1">
                    <div className="text-xs text-center text-[var(--color-text-tertiary)] mb-1">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index]}
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
                <h3 className="font-semibold mb-3">Actions rapides</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleGenerateNewAPI}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Générer une nouvelle clé API
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowNewWebhookModal(true)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Configurer un webhook
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveTab('integrations')}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      Ajouter une intégration
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h3 className="font-semibold mb-3">État du système</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">API REST</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-success)]">Opérationnel</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Webhooks</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-success)]">Opérationnel</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">OAuth 2.0</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      <span className="text-xs text-[var(--color-success)]">Opérationnel</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">GraphQL</span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />
                      <span className="text-xs text-[var(--color-warning)]">Maintenance</span>
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
              <h3 className="text-lg font-semibold">Gestion des clés API</h3>
              <button
                onClick={handleGenerateNewAPI}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                <Plus className="w-4 h-4" />
                Nouvelle clé
              </button>
            </div>

            <div className="space-y-4">
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
                          {apiKey.status === 'active' ? 'Active' : 'Inactive'}
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
                        <span>Créée le {apiKey.created}</span>
                        <span>•</span>
                        <span>Dernière utilisation: {apiKey.lastUsed}</span>
                        <span>•</span>
                        <span>Limite: {apiKey.rateLimit}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-[var(--color-text-tertiary)]">Permissions:</span>
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
                          toast.success('Clé API régénérée avec succès !');
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
              <h3 className="text-lg font-semibold">Configuration des webhooks</h3>
              <button
                onClick={() => setShowNewWebhookModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                <Plus className="w-4 h-4" />
                Nouveau webhook
              </button>
            </div>

            <div className="space-y-4">
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
                          {webhook.status === 'active' ? 'Actif' : 'Inactif'}
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
                        <span>Créé le {webhook.created}</span>
                        <span>•</span>
                        <span>Dernier déclenchement: {webhook.lastTriggered}</span>
                        <span>•</span>
                        <span className={`${webhook.successRate > 95 ? 'text-[var(--color-success)]' : 'text-[var(--color-warning)]'}`}>
                          Taux de succès: {webhook.successRate}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toast.info('Test du webhook en cours...')}
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
              <h3 className="text-lg font-semibold">Intégrations tierces</h3>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  placeholder="Rechercher une intégration..."
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm"
                />
                <button className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                  <Plus className="w-4 h-4" />
                  Explorer
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
                      {integration.status === 'connected' ? 'Connecté' :
                       integration.status === 'pending' ? 'En attente' : 'Déconnecté'}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--color-text-secondary)] mb-3">{integration.description}</p>

                  {integration.status === 'connected' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-tertiary)]">Dernière sync:</span>
                        <span>{integration.lastSync}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-tertiary)]">Points de données:</span>
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
                          Configurer
                        </button>
                        <button
                          onClick={() => handleDisconnectIntegration(integration)}
                          className="px-3 py-2 bg-[var(--color-error-light)] text-[var(--color-error)] rounded-lg text-sm hover:bg-[var(--color-error-light)] hover:bg-opacity-75 transition-colors">
                          Déconnecter
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnectIntegration(integration)}
                        className="flex-1 px-3 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors">
                        Connecter
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
            <h3 className="text-lg font-semibold">Documentation API</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5 text-[var(--color-primary)]" />
                  Démarrage rapide
                </h4>
                <div className="space-y-2">
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">Authentication</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Apprendre à s'authentifier avec l'API</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">Première requête</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Faire votre première requête API</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">SDKs</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Utiliser nos SDKs officiels</div>
                  </a>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-[var(--color-secondary)]" />
                  Ressources
                </h4>
                <div className="space-y-2">
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">{t('navigation.clients')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Gérer les données clients</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">Factures</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Créer et gérer les factures</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-[var(--color-surface-hover)] rounded">
                    <div className="font-medium text-sm">Paiements</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Traiter les paiements</div>
                  </a>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[var(--color-success)]" />
                  Exemples de code
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Node.js</span>
                    <button
                      onClick={() => handleViewCode('Node.js')}
                      className="text-xs text-[var(--color-primary)] hover:underline">Voir →</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Python</span>
                    <button
                      onClick={() => handleViewCode('Python')}
                      className="text-xs text-[var(--color-primary)] hover:underline">Voir →</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PHP</span>
                    <button
                      onClick={() => handleViewCode('PHP')}
                      className="text-xs text-[var(--color-primary)] hover:underline">Voir →</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ruby</span>
                    <button
                      onClick={() => handleViewCode('Ruby')}
                      className="text-xs text-[var(--color-primary)] hover:underline">Voir →</button>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[var(--color-warning)]" />
                  Outils
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
                    onClick={() => window.open('https://api.atlasfinance.com/playground', '_blank')}
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
              <h3 className="text-lg font-semibold">Journaux d'activité API</h3>
              <div className="flex items-center gap-2">
                <select className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                  <option>Tous les statuts</option>
                  <option>Succès (2xx)</option>
                  <option>Erreurs client (4xx)</option>
                  <option>Erreurs serveur (5xx)</option>
                </select>
                <button className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-hover)]" aria-label="Actualiser">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg shadow-[var(--shadow-sm)] border border-[var(--color-border)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Méthode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Durée</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
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
                Affichage de 1-{apiLogs.length} sur {apiLogs.length} entrées
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-surface-hover)]">
                  Précédent
                </button>
                <button className="px-3 py-1 border border-[var(--color-border)] rounded text-sm hover:bg-[var(--color-surface-hover)]">
                  Suivant
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">API & Intégrations</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Gérez vos clés API, webhooks et intégrations tierces</p>
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
            <DialogTitle className="text-lg font-semibold">Créer une nouvelle clé API</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la clé
              </label>
              <input
                type="text"
                value={newAPIForm.name}
                onChange={(e) => setNewAPIForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Ex: Production API"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environnement
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
                Permissions
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
                Limite de requêtes (par heure)
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
                Annuler
              </button>
              <button
                onClick={handleCreateAPI}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72]"
              >
                Créer la clé
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Webhook Modal */}
      <Dialog open={showNewWebhookModal} onOpenChange={setShowNewWebhookModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Configurer un nouveau webhook</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL du webhook
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
                Événements à écouter
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
                Annuler
              </button>
              <button
                onClick={handleCreateWebhook}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72]"
              >
                Créer le webhook
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
              Configuration de {showConfigModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Paramètres de synchronisation</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Synchronisation automatique</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A8A82]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notifications en temps réel</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A8A82]"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fréquence de synchronisation
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Toutes les 5 minutes</option>
                    <option>Toutes les 15 minutes</option>
                    <option>Toutes les heures</option>
                    <option>Quotidiennement</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfigModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('Configuration sauvegardée !');
                  setShowConfigModal(null);
                }}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72]"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer <strong>{showDeleteConfirm?.name || 'cet élément'}</strong> ?
            </p>
            <p className="text-sm text-gray-700">
              Cette action est irréversible et toutes les données associées seront perdues.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Code Examples Modal */}
      <Dialog open={!!showCodeExamples} onOpenChange={() => setShowCodeExamples(null)}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Exemple de code - {showCodeExamples}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm">
                <code>{showCodeExamples === 'Node.js' ? `const axios = require('axios');

const apiKey = 'pk_live_YOUR_API_KEY';
const apiUrl = 'https://api.atlasfinance.com/v1';

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
  console.error('Error:', error);
});` :
showCodeExamples === 'Python' ? `import requests

api_key = 'pk_live_YOUR_API_KEY'
api_url = 'https://api.atlasfinance.com/v1'

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
$apiUrl = 'https://api.atlasfinance.com/v1';

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
api_url = 'https://api.atlasfinance.com/v1'

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
                  toast.success('Code copié !');
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Copy className="w-4 h-4" />
                Copier le code
              </button>
              <button
                onClick={() => setShowCodeExamples(null)}
                className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5a7a72]"
              >
                Fermer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APIIntegrationsPage;