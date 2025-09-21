import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Download,
  Upload,
  Settings,
  Users,
  Bell,
  Shield,
  Wifi,
  WifiOff,
  Battery,
  Camera,
  QrCode,
  Fingerprint,
  Lock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Apple,
  Play,
  Chrome,
  Globe,
  BarChart3,
  TrendingUp,
  Star,
  MessageSquare,
  Bug,
  Zap,
  Activity
} from 'lucide-react';

const MobileAppPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Smartphone },
    { id: 'devices', label: 'Appareils', icon: Users },
    { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  // Mock data for connected devices
  const connectedDevices = [
    {
      id: 1,
      name: 'iPhone 14 Pro',
      type: 'iOS',
      version: 'v2.3.1',
      lastSync: '2024-03-20 14:30',
      battery: 85,
      status: 'online',
      user: 'Jean Dupont'
    },
    {
      id: 2,
      name: 'Samsung Galaxy S23',
      type: 'Android',
      version: 'v2.3.0',
      lastSync: '2024-03-20 13:15',
      battery: 62,
      status: 'online',
      user: 'Marie Martin'
    },
    {
      id: 3,
      name: 'iPad Air',
      type: 'iOS',
      version: 'v2.3.1',
      lastSync: '2024-03-20 09:45',
      battery: 94,
      status: 'offline',
      user: 'Pierre Leblanc'
    },
    {
      id: 4,
      name: 'OnePlus 11',
      type: 'Android',
      version: 'v2.2.8',
      lastSync: '2024-03-19 16:20',
      battery: 45,
      status: 'syncing',
      user: 'Sophie Durand'
    }
  ];

  // Mock sync history
  const syncHistory = [
    {
      id: 1,
      device: 'iPhone 14 Pro',
      timestamp: '2024-03-20 14:30:15',
      type: 'Complète',
      items: 245,
      duration: '2.3s',
      status: 'success'
    },
    {
      id: 2,
      device: 'Samsung Galaxy S23',
      timestamp: '2024-03-20 13:15:42',
      type: 'Partielle',
      items: 87,
      duration: '1.1s',
      status: 'success'
    },
    {
      id: 3,
      device: 'iPad Air',
      timestamp: '2024-03-20 09:45:23',
      type: 'Complète',
      items: 312,
      duration: '3.5s',
      status: 'success'
    },
    {
      id: 4,
      device: 'OnePlus 11',
      timestamp: '2024-03-19 16:20:11',
      type: 'Échouée',
      items: 0,
      duration: '-',
      status: 'failed',
      error: 'Connexion interrompue'
    }
  ];

  // Mock app features
  const appFeatures = [
    {
      id: 1,
      name: 'Mode hors ligne',
      description: 'Travaillez sans connexion internet',
      enabled: true,
      icon: WifiOff
    },
    {
      id: 2,
      name: 'Scan de documents',
      description: 'Numérisez factures et reçus',
      enabled: true,
      icon: Camera
    },
    {
      id: 3,
      name: 'Authentification biométrique',
      description: 'Connexion par empreinte ou Face ID',
      enabled: true,
      icon: Fingerprint
    },
    {
      id: 4,
      name: 'QR Code',
      description: 'Scan rapide pour les paiements',
      enabled: false,
      icon: QrCode
    },
    {
      id: 5,
      name: 'Notifications push',
      description: 'Alertes en temps réel',
      enabled: true,
      icon: Bell
    },
    {
      id: 6,
      name: 'Synchronisation automatique',
      description: 'Mise à jour en arrière-plan',
      enabled: true,
      icon: RefreshCw
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'success':
        return 'text-green-500';
      case 'offline':
      case 'failed':
        return 'text-red-500';
      case 'syncing':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return 'text-green-500';
    if (level > 30) return 'text-yellow-500';
    return 'text-red-500';
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* App Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone className="w-8 h-8 text-blue-500" />
                  <span className="text-xs text-green-500 font-medium">+8%</span>
                </div>
                <div className="text-2xl font-bold">247</div>
                <div className="text-xs text-gray-500">Utilisateurs actifs</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Download className="w-8 h-8 text-green-500" />
                  <span className="text-xs text-green-500 font-medium">v2.3.1</span>
                </div>
                <div className="text-2xl font-bold">1,234</div>
                <div className="text-xs text-gray-500">Téléchargements</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-yellow-500" />
                  <span className="text-xs font-medium">4.8/5</span>
                </div>
                <div className="text-2xl font-bold">4.8</div>
                <div className="text-xs text-gray-500">Note moyenne</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <RefreshCw className="w-8 h-8 text-purple-500" />
                  <span className="text-xs text-green-500 font-medium">Active</span>
                </div>
                <div className="text-2xl font-bold">98.5%</div>
                <div className="text-xs text-gray-500">Taux de synchronisation</div>
              </motion.div>
            </div>

            {/* Download Links */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Télécharger l'application</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="flex items-center justify-center gap-3 p-4 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors">
                  <Apple className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Télécharger sur</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Play className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Disponible sur</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Chrome className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Application</div>
                    <div className="font-semibold">Web PWA</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  <Globe className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Version</div>
                    <div className="font-semibold">Desktop</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Fonctionnalités mobiles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <feature.icon className={`w-5 h-5 mt-0.5 ${feature.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{feature.name}</div>
                      <div className="text-xs text-gray-500">{feature.description}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feature.enabled}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Nouvelle version 2.3.1 disponible</div>
                    <div className="text-xs text-gray-500">Il y a 2 jours</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">247 utilisateurs actifs ce mois</div>
                    <div className="text-xs text-gray-500">Il y a 5 jours</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">Maintenance planifiée le 25/03</div>
                    <div className="text-xs text-gray-500">Il y a 1 semaine</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'devices':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Appareils connectés</h3>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <QrCode className="w-4 h-4" />
                Associer un appareil
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedDevices.map((device) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-gray-400" />
                      <div>
                        <h4 className="font-semibold">{device.name}</h4>
                        <span className="text-xs text-gray-500">{device.user}</span>
                      </div>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${
                      device.status === 'online' ? 'bg-green-500' :
                      device.status === 'offline' ? 'bg-gray-400' :
                      'bg-yellow-500 animate-pulse'
                    }`} />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Système:</span>
                      <span className="flex items-center gap-1">
                        {device.type === 'iOS' ? <Apple className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {device.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Version:</span>
                      <span>{device.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Dernière sync:</span>
                      <span>{device.lastSync}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Batterie:</span>
                      <span className={`flex items-center gap-1 ${getBatteryColor(device.battery)}`}>
                        <Battery className="w-3 h-3" />
                        {device.battery}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                      Synchroniser
                    </button>
                    <button className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200 transition-colors">
                      Déconnecter
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'sync':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Paramètres de synchronisation</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Synchronisation automatique</div>
                    <div className="text-xs text-gray-500">Synchroniser les données en arrière-plan</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Wi-Fi uniquement</div>
                    <div className="text-xs text-gray-500">Synchroniser uniquement en Wi-Fi</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">Fréquence de synchronisation</div>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option>Toutes les 15 minutes</option>
                    <option>Toutes les 30 minutes</option>
                    <option>Toutes les heures</option>
                    <option>Toutes les 2 heures</option>
                    <option>Manuel uniquement</option>
                  </select>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium mb-2">Données à synchroniser</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Factures et documents</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Contacts et clients</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">Écritures comptables</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">Pièces jointes</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Historique de synchronisation</h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appareil</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Éléments</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durée</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {syncHistory.map((sync) => (
                      <tr key={sync.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{sync.device}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sync.timestamp}</td>
                        <td className="px-4 py-3 text-sm">{sync.type}</td>
                        <td className="px-4 py-3 text-sm">{sync.items}</td>
                        <td className="px-4 py-3 text-sm">{sync.duration}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-sm ${getStatusColor(sync.status)}`}>
                            {sync.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                             sync.status === 'failed' ? <AlertCircle className="w-4 h-4" /> :
                             <Info className="w-4 h-4" />}
                            {sync.status === 'success' ? 'Réussi' :
                             sync.status === 'failed' ? 'Échoué' : 'En cours'}
                          </span>
                          {sync.error && (
                            <span className="text-xs text-red-500">{sync.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Sécurité mobile</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-500" />
                  Authentification
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Code PIN requis</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Biométrie (Touch/Face ID)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authentification 2FA</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Chiffrement
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chiffrement local</span>
                    <span className="text-xs text-green-500 font-medium">AES-256</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chiffrement réseau</span>
                    <span className="text-xs text-green-500 font-medium">TLS 1.3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Stockage sécurisé</span>
                    <span className="text-xs text-green-500 font-medium">Activé</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-purple-500" />
                  Session
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verrouillage automatique</span>
                    <select className="px-2 py-1 border border-gray-300 rounded text-sm">
                      <option>1 minute</option>
                      <option>5 minutes</option>
                      <option>15 minutes</option>
                      <option>Jamais</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Effacement à distance</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Audit
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal d'activité</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alertes de sécurité</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Paramètres de notifications</h3>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h4 className="font-semibold mb-4">Types de notifications</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Nouvelles factures</div>
                    <div className="text-xs text-gray-500">Recevoir une notification pour chaque nouvelle facture</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Paiements reçus</div>
                    <div className="text-xs text-gray-500">Être alerté lors de la réception d'un paiement</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Échéances</div>
                    <div className="text-xs text-gray-500">Rappels pour les échéances importantes</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Mises à jour système</div>
                    <div className="text-xs text-gray-500">Informations sur les nouvelles versions</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Paramètres de l'application mobile</h3>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h4 className="font-semibold mb-4">Configuration générale</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version minimale requise
                  </label>
                  <input
                    type="text"
                    defaultValue="2.0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL du serveur
                  </label>
                  <input
                    type="text"
                    defaultValue="https://api.wisebook.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de cache (MB)
                  </label>
                  <input
                    type="number"
                    defaultValue="500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Mode debug</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Collecte de données analytics</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                  </label>
                </div>

                <div className="pt-4 flex gap-2">
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Enregistrer les modifications
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Réinitialiser
                  </button>
                </div>
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
        <h1 className="text-2xl font-bold text-gray-900">Application Mobile</h1>
        <p className="text-gray-600 mt-1">Gérez l'application mobile WiseBook et les appareils connectés</p>
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

export default MobileAppPage;