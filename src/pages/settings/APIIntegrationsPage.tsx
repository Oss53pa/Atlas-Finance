import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const APIIntegrationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedAPI, setSelectedAPI] = useState<any>(null);
  const [showAPIKey, setShowAPIKey] = useState<{ [key: string]: boolean }>({});

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
    { id: 'api-keys', label: 'Clés API', icon: Key },
    { id: 'webhooks', label: 'Webhooks', icon: Link },
    { id: 'integrations', label: 'Intégrations', icon: Cloud },
    { id: 'documentation', label: 'Documentation', icon: Code },
    { id: 'logs', label: 'Journaux', icon: Activity }
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
      url: 'https://app.wisebook.com/webhooks/invoices',
      events: ['invoice.created', 'invoice.paid', 'invoice.overdue'],
      status: 'active',
      created: '2024-01-10',
      lastTriggered: '2024-03-20 11:20',
      successRate: 98.5
    },
    {
      id: 2,
      url: 'https://slack.com/api/wisebook-notifications',
      events: ['payment.received', 'payment.failed'],
      status: 'active',
      created: '2024-02-05',
      lastTriggered: '2024-03-19 15:30',
      successRate: 99.8
    },
    {
      id: 3,
      url: 'https://zapier.com/hooks/wisebook/accounting',
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
      userAgent: 'WiseBook Mobile/2.1.0'
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
      userAgent: 'WiseBook Desktop/3.0.1'
    }
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'connected':
      case 200:
        return 'text-green-500';
      case 'inactive':
      case 'disconnected':
      case 400:
      case 401:
      case 403:
      case 404:
        return 'text-red-500';
      case 'pending':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
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
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-8 h-8 text-blue-500" />
                  <span className="text-xs text-green-500 font-medium">+12%</span>
                </div>
                <div className="text-2xl font-bold">45,230</div>
                <div className="text-xs text-gray-500">Requêtes API / jour</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-green-500" />
                  <span className="text-xs text-green-500 font-medium">99.9%</span>
                </div>
                <div className="text-2xl font-bold">245ms</div>
                <div className="text-xs text-gray-500">Temps de réponse moyen</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Link className="w-8 h-8 text-purple-500" />
                  <span className="text-xs text-green-500 font-medium">Active</span>
                </div>
                <div className="text-2xl font-bold">12</div>
                <div className="text-xs text-gray-500">Intégrations actives</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-8 h-8 text-orange-500" />
                  <span className="text-xs text-green-500 font-medium">Sécurisé</span>
                </div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs text-gray-500">Clés API actives</div>
              </motion.div>
            </div>

            {/* Usage Graph */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Utilisation API (7 derniers jours)</h3>
              <div className="h-64 flex items-end space-x-2">
                {[65, 78, 82, 91, 85, 73, 88].map((height, index) => (
                  <div key={index} className="flex-1">
                    <div className="text-xs text-center text-gray-500 mb-1">
                      {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'][index]}
                    </div>
                    <div
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">Actions rapides</h3>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Générer une nouvelle clé API
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Configurer un webhook
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2">
                      <Cloud className="w-4 h-4" />
                      Ajouter une intégration
                    </span>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="font-semibold mb-3">État du système</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API REST</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-500">Opérationnel</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Webhooks</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-500">Opérationnel</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">OAuth 2.0</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-500">Opérationnel</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">GraphQL</span>
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-yellow-500">Maintenance</span>
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
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
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
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{apiKey.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apiKey.status === 'active'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {apiKey.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          apiKey.environment === 'Production'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {apiKey.environment}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <code className="flex-1 px-3 py-2 bg-gray-50 rounded text-sm font-mono">
                          {showAPIKey[apiKey.id] ? apiKey.key : '•'.repeat(30)}
                        </code>
                        <button
                          onClick={() => setShowAPIKey({ ...showAPIKey, [apiKey.id]: !showAPIKey[apiKey.id] })}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          {showAPIKey[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Créée le {apiKey.created}</span>
                        <span>•</span>
                        <span>Dernière utilisation: {apiKey.lastUsed}</span>
                        <span>•</span>
                        <span>Limite: {apiKey.rateLimit}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">Permissions:</span>
                        {apiKey.permissions.map((perm) => (
                          <span key={perm} className="px-2 py-0.5 text-xs bg-gray-100 rounded">
                            {perm}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
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
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
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
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link className="w-5 h-5 text-gray-400" />
                        <code className="text-sm font-mono">{webhook.url}</code>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          webhook.status === 'active'
                            ? 'bg-green-100 text-green-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {webhook.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {webhook.events.map((event) => (
                          <span key={event} className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded">
                            {event}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Créé le {webhook.created}</span>
                        <span>•</span>
                        <span>Dernier déclenchement: {webhook.lastTriggered}</span>
                        <span>•</span>
                        <span className={`${webhook.successRate > 95 ? 'text-green-500' : 'text-yellow-500'}`}>
                          Taux de succès: {webhook.successRate}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Activity className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition-colors">
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
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
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
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{integration.icon}</span>
                      <div>
                        <h4 className="font-semibold">{integration.name}</h4>
                        <span className="text-xs text-gray-500">{integration.category}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      integration.status === 'connected'
                        ? 'bg-green-100 text-green-600'
                        : integration.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {integration.status === 'connected' ? 'Connecté' :
                       integration.status === 'pending' ? 'En attente' : 'Déconnecté'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{integration.description}</p>

                  {integration.status === 'connected' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Dernière sync:</span>
                        <span>{integration.lastSync}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Points de données:</span>
                        <span className="font-semibold">{integration.dataPoints.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                          Configurer
                        </button>
                        <button className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors">
                          Déconnecter
                        </button>
                      </>
                    ) : (
                      <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">
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
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-500" />
                  Démarrage rapide
                </h4>
                <div className="space-y-2">
                  <a href="#" className="block p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium text-sm">Authentication</div>
                    <div className="text-xs text-gray-500">Apprendre à s'authentifier avec l'API</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium text-sm">Première requête</div>
                    <div className="text-xs text-gray-500">Faire votre première requête API</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium text-sm">SDKs</div>
                    <div className="text-xs text-gray-500">Utiliser nos SDKs officiels</div>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  Ressources
                </h4>
                <div className="space-y-2">
                  <a href="#" className="block p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium text-sm">Clients</div>
                    <div className="text-xs text-gray-500">Gérer les données clients</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium text-sm">Factures</div>
                    <div className="text-xs text-gray-500">Créer et gérer les factures</div>
                  </a>
                  <a href="#" className="block p-2 hover:bg-gray-50 rounded">
                    <div className="font-medium text-sm">Paiements</div>
                    <div className="text-xs text-gray-500">Traiter les paiements</div>
                  </a>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-green-500" />
                  Exemples de code
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Node.js</span>
                    <button className="text-xs text-blue-500 hover:underline">Voir →</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Python</span>
                    <button className="text-xs text-blue-500 hover:underline">Voir →</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PHP</span>
                    <button className="text-xs text-blue-500 hover:underline">Voir →</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ruby</span>
                    <button className="text-xs text-blue-500 hover:underline">Voir →</button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-500" />
                  Outils
                </h4>
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm">Postman Collection</span>
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm">OpenAPI Spec</span>
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm">API Playground</span>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
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
                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option>Tous les statuts</option>
                  <option>Succès (2xx)</option>
                  <option>Erreurs client (4xx)</option>
                  <option>Erreurs serveur (5xx)</option>
                </select>
                <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Méthode</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {apiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{log.timestamp}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          log.method === 'GET' ? 'bg-blue-100 text-blue-600' :
                          log.method === 'POST' ? 'bg-green-100 text-green-600' :
                          log.method === 'PUT' ? 'bg-yellow-100 text-yellow-600' :
                          log.method === 'DELETE' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-800">{log.endpoint}</td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold text-sm ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.duration}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Affichage de 1-{apiLogs.length} sur {apiLogs.length} entrées
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  Précédent
                </button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
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
        <h1 className="text-2xl font-bold text-gray-900">API & Intégrations</h1>
        <p className="text-gray-600 mt-1">Gérez vos clés API, webhooks et intégrations tierces</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
    </div>
  );
};

export default APIIntegrationsPage;