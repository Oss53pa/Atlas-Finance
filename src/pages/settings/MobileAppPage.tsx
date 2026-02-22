import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { toast } from 'react-hot-toast';
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState<{ [key: number]: boolean }>({});
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<{ id: number; name: string } | null>(null);
  const [settings, setSettings] = useState({
    minVersion: '2.0.0',
    serverUrl: 'https://api.atlasfinance.com',
    cacheLimit: 500,
    debugMode: false,
    analytics: true
  });

  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: Smartphone },
    { id: 'devices', label: 'Appareils', icon: Users },
    { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: t('navigation.settings'), icon: Settings }
  ];

  // TODO: wire to real device registry when available
  const connectedDevices: Array<{
    id: number; name: string; type: string; version: string;
    lastSync: string; battery: number; status: string; user: string;
  }> = [];

  // TODO: wire to real sync log when available
  const syncHistory: Array<{
    id: number; device: string; timestamp: string; type: string;
    items: number; duration: string; status: string; error?: string;
  }> = [];

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

  // Handler functions
  const handleAssociateDevice = () => {
    setShowQRModal(true);
  };

  const handleSyncDevice = async (deviceId: number) => {
    setIsSyncing(prev => ({ ...prev, [deviceId]: true }));

    // Simulate sync process
    setTimeout(() => {
      setIsSyncing(prev => ({ ...prev, [deviceId]: false }));
      toast.success('Synchronisation réussie !');
    }, 2000);
  };

  const handleDisconnectDevice = (deviceId: number, deviceName: string) => {
    setShowDisconnectConfirm({ id: deviceId, name: deviceName });
  };

  const confirmDisconnect = () => {
    if (showDisconnectConfirm) {
      toast.success(`${showDisconnectConfirm.name} déconnecté avec succès`);
      setShowDisconnectConfirm(null);
    }
  };

  const handleSaveSettings = () => {
    toast.success('Paramètres enregistrés avec succès !');
  };

  const handleResetSettings = () => {
    setSettings({
      minVersion: '2.0.0',
      serverUrl: 'https://api.atlasfinance.com',
      cacheLimit: 500,
      debugMode: false,
      analytics: true
    });
    toast.success('Paramètres réinitialisés !');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'success':
        return 'text-[var(--color-success)]';
      case 'offline':
      case 'failed':
        return 'text-[var(--color-error)]';
      case 'syncing':
        return 'text-[var(--color-warning)]';
      default:
        return 'text-[var(--color-text-tertiary)]';
    }
  };

  const getBatteryColor = (level: number) => {
    if (level > 60) return 'text-[var(--color-success)]';
    if (level > 30) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-error)]';
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
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <div className="text-lg font-bold">{connectedDevices.length}</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Appareils connectés</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Download className="w-8 h-8 text-[var(--color-success)]" />
                </div>
                <div className="text-lg font-bold">-</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Téléchargements</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <Star className="w-8 h-8 text-[var(--color-warning)]" />
                </div>
                <div className="text-lg font-bold">-</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Note moyenne</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-2">
                  <RefreshCw className="w-8 h-8 text-[var(--color-secondary)]" />
                </div>
                <div className="text-lg font-bold">{syncHistory.filter(s => s.status === 'success').length}/{syncHistory.length || '-'}</div>
                <div className="text-xs text-[var(--color-text-tertiary)]">Synchronisations réussies</div>
              </motion.div>
            </div>

            {/* Download Links */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">Télécharger l'application</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-text-secondary)] transition-colors">
                  <Apple className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Télécharger sur</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-success)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-success)] hover:opacity-90 transition-colors">
                  <Play className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Disponible sur</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                  <Chrome className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Application</div>
                    <div className="font-semibold">Web PWA</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-text-secondary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-text-primary)] transition-colors">
                  <Globe className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">Version</div>
                    <div className="font-semibold">Desktop</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">Fonctionnalités mobiles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    <feature.icon className={`w-5 h-5 mt-0.5 ${feature.enabled ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'}`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{feature.name}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">{feature.description}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feature.enabled}
                        className="sr-only peer"
                        readOnly
                      />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
              <div className="space-y-3">
                {syncHistory.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)] py-4 text-center">Aucune activité récente</p>
                ) : (
                  syncHistory.slice(0, 3).map(sync => (
                    <div key={sync.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${sync.status === 'success' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-error)]'}`}></div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{sync.device} — {sync.type}</div>
                        <div className="text-xs text-[var(--color-text-tertiary)]">{sync.timestamp}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );

      case 'devices':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Appareils connectés</h3>
              <button
                onClick={handleAssociateDevice}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
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
                  className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)] hover:shadow-[var(--shadow-md)] transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-8 h-8 text-[var(--color-text-tertiary)]" />
                      <div>
                        <h4 className="font-semibold">{device.name}</h4>
                        <span className="text-xs text-[var(--color-text-tertiary)]">{device.user}</span>
                      </div>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${
                      device.status === 'online' ? 'bg-[var(--color-success)]' :
                      device.status === 'offline' ? 'bg-[var(--color-text-tertiary)]' :
                      'bg-[var(--color-warning)] animate-pulse'
                    }`} />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">Système:</span>
                      <span className="flex items-center gap-1">
                        {device.type === 'iOS' ? <Apple className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {device.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">Version:</span>
                      <span>{device.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">Dernière sync:</span>
                      <span>{device.lastSync}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">Batterie:</span>
                      <span className={`flex items-center gap-1 ${getBatteryColor(device.battery)}`}>
                        <Battery className="w-3 h-3" />
                        {device.battery}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSyncDevice(device.id)}
                      disabled={isSyncing[device.id]}
                      className="flex-1 px-3 py-2 bg-[var(--color-border-light)] text-[var(--color-text-secondary)] rounded-lg text-sm hover:bg-[var(--color-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSyncing[device.id] ? (
                        <span className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Synchronisation...
                        </span>
                      ) : (
                        'Synchroniser'
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnectDevice(device.id, device.name)}
                      className="px-3 py-2 bg-[var(--color-error-light)] text-[var(--color-error)] rounded-lg text-sm hover:bg-[var(--color-error-light)] hover:bg-opacity-75 transition-colors">
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
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">Paramètres de synchronisation</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Synchronisation automatique</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Synchroniser les données en arrière-plan</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Wi-Fi uniquement</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Synchroniser uniquement en Wi-Fi</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
                  <div className="font-medium mb-2">Fréquence de synchronisation</div>
                  <select className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                    <option>Toutes les 15 minutes</option>
                    <option>Toutes les 30 minutes</option>
                    <option>Toutes les heures</option>
                    <option>Toutes les 2 heures</option>
                    <option>Manuel uniquement</option>
                  </select>
                </div>

                <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
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

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">Historique de synchronisation</h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-surface-hover)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Appareil</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Date/Heure</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Éléments</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Durée</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {syncHistory.map((sync) => (
                      <tr key={sync.id} className="hover:bg-[var(--color-surface-hover)]">
                        <td className="px-4 py-3 text-sm">{sync.device}</td>
                        <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{sync.timestamp}</td>
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
                            <span className="text-xs text-[var(--color-error)]">{sync.error}</span>
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
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                  Authentification
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Code PIN requis</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Biométrie (Touch/Face ID)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Authentification 2FA</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[var(--color-success)]" />
                  Chiffrement
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chiffrement local</span>
                    <span className="text-xs text-[var(--color-success)] font-medium">AES-256</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Chiffrement réseau</span>
                    <span className="text-xs text-[var(--color-success)] font-medium">TLS 1.3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Stockage sécurisé</span>
                    <span className="text-xs text-[var(--color-success)] font-medium">Activé</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-[var(--color-secondary)]" />
                  Session
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Verrouillage automatique</span>
                    <select className="px-2 py-1 border border-[var(--color-border)] rounded text-sm">
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
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-500" />
                  Audit
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Journal d'activité</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Alertes de sécurité</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
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

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h4 className="font-semibold mb-4">Types de notifications</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Nouvelles factures</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Recevoir une notification pour chaque nouvelle facture</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Paiements reçus</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Être alerté lors de la réception d'un paiement</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('thirdParty.dueDate')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Rappels pour les échéances importantes</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Mises à jour système</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">Informations sur les nouvelles versions</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
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

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h4 className="font-semibold mb-4">Configuration générale</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version minimale requise
                  </label>
                  <input
                    type="text"
                    value={settings.minVersion}
                    onChange={(e) => setSettings(prev => ({ ...prev, minVersion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL du serveur
                  </label>
                  <input
                    type="text"
                    value={settings.serverUrl}
                    onChange={(e) => setSettings(prev => ({ ...prev, serverUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Limite de cache (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.cacheLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, cacheLimit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Mode debug</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.debugMode}
                      onChange={(e) => setSettings(prev => ({ ...prev, debugMode: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Collecte de données analytics</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.analytics}
                      onChange={(e) => setSettings(prev => ({ ...prev, analytics: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    onClick={handleSaveSettings}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    Enregistrer les modifications
                  </button>
                  <button
                    onClick={handleResetSettings}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Application Mobile</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Gérez l'application mobile Atlas Finance et les appareils connectés</p>
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

      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Associer un nouvel appareil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
              <div className="relative">
                <QrCode className="w-48 h-48 text-gray-800" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-2">
                    <span className="text-xs font-mono">WB-2024-XYZ</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Scannez ce QR code avec l'application mobile Atlas Finance
              </p>
              <p className="text-xs text-gray-700">
                Code d'association : <span className="font-mono font-bold">WB-2024-XYZ-123</span>
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  toast.success('Code copié dans le presse-papier !');
                  navigator.clipboard.writeText('WB-2024-XYZ-123');
                }}
                className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] transition-colors"
              >
                Copier le code
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Modal */}
      <Dialog open={!!showDisconnectConfirm} onOpenChange={() => setShowDisconnectConfirm(null)}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Confirmer la déconnexion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir déconnecter <strong>{showDisconnectConfirm?.name}</strong> ?
            </p>
            <p className="text-sm text-gray-700">
              L'appareil devra être reconnecté manuellement pour accéder à nouveau aux données.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDisconnectConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDisconnect}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Déconnecter
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileAppPage;