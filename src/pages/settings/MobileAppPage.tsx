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
  const [pairingToken, setPairingToken] = useState('');
  const [isSyncing, setIsSyncing] = useState<{ [key: number]: boolean }>({});
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<{ id: number; name: string } | null>(null);
  const [settings, setSettings] = useState({
    minVersion: '2.0.0',
    serverUrl: 'https://api.atlasfna.com',
    cacheLimit: 500,
    debugMode: false,
    analytics: true
  });

  const tabs = [
    { id: 'overview', label: t('mobileApp.tabOverview'), icon: Smartphone },
    { id: 'devices', label: t('mobileApp.tabDevices'), icon: Users },
    { id: 'sync', label: t('mobileApp.tabSync'), icon: RefreshCw },
    { id: 'security', label: t('mobileApp.tabSecurity'), icon: Shield },
    { id: 'notifications', label: t('mobileApp.tabNotifications'), icon: Bell },
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
      name: t('mobileApp.featOfflineName'),
      description: t('mobileApp.featOfflineDesc'),
      enabled: true,
      icon: WifiOff
    },
    {
      id: 2,
      name: t('mobileApp.featScanName'),
      description: t('mobileApp.featScanDesc'),
      enabled: true,
      icon: Camera
    },
    {
      id: 3,
      name: t('mobileApp.featBiometricName'),
      description: t('mobileApp.featBiometricDesc'),
      enabled: true,
      icon: Fingerprint
    },
    {
      id: 4,
      name: t('mobileApp.featQrName'),
      description: t('mobileApp.featQrDesc'),
      enabled: false,
      icon: QrCode
    },
    {
      id: 5,
      name: t('mobileApp.featPushName'),
      description: t('mobileApp.featPushDesc'),
      enabled: true,
      icon: Bell
    },
    {
      id: 6,
      name: t('mobileApp.featAutoSyncName'),
      description: t('mobileApp.featAutoSyncDesc'),
      enabled: true,
      icon: RefreshCw
    }
  ];

  // Handler functions
  const handleAssociateDevice = () => {
    setPairingToken(`WB-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
    setShowQRModal(true);
  };

  const handleSyncDevice = async (deviceId: number) => {
    setIsSyncing(prev => ({ ...prev, [deviceId]: true }));

    // Simulate sync process
    setTimeout(() => {
      setIsSyncing(prev => ({ ...prev, [deviceId]: false }));
      toast.success(t('mobileApp.toastSyncSuccess'));
    }, 2000);
  };

  const handleDisconnectDevice = (deviceId: number, deviceName: string) => {
    setShowDisconnectConfirm({ id: deviceId, name: deviceName });
  };

  const confirmDisconnect = () => {
    if (showDisconnectConfirm) {
      toast.success(t('mobileApp.toastDeviceDisconnected', { name: showDisconnectConfirm.name }));
      setShowDisconnectConfirm(null);
    }
  };

  const handleSaveSettings = () => {
    toast.success(t('mobileApp.toastSettingsSaved'));
  };

  const handleResetSettings = () => {
    setSettings({
      minVersion: '2.0.0',
      serverUrl: 'https://api.atlasfna.com',
      cacheLimit: 500,
      debugMode: false,
      analytics: true
    });
    toast.success(t('mobileApp.toastSettingsReset'));
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
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.statConnectedDevices')}</div>
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
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.statDownloads')}</div>
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
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.statAverageRating')}</div>
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
                <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.statSuccessfulSyncs')}</div>
              </motion.div>
            </div>

            {/* Download Links */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">{t('mobileApp.downloadTitle')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-text-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-text-secondary)] transition-colors">
                  <Apple className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">{t('mobileApp.downloadOn')}</div>
                    <div className="font-semibold">App Store</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-success)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-success)] hover:opacity-90 transition-colors">
                  <Play className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">{t('mobileApp.availableOn')}</div>
                    <div className="font-semibold">Google Play</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                  <Chrome className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">{t('mobileApp.appLabel')}</div>
                    <div className="font-semibold">Web PWA</div>
                  </div>
                </button>

                <button className="flex items-center justify-center gap-3 p-4 bg-[var(--color-text-secondary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-text-primary)] transition-colors">
                  <Globe className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-80">{t('mobileApp.versionLabel')}</div>
                    <div className="font-semibold">Desktop</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">{t('mobileApp.mobileFeatures')}</h3>
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
              <h3 className="text-lg font-semibold mb-4">{t('mobileApp.recentActivity')}</h3>
              <div className="space-y-3">
                {syncHistory.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-tertiary)] py-4 text-center">{t('mobileApp.noRecentActivity')}</p>
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
              <h3 className="text-lg font-semibold">{t('mobileApp.statConnectedDevices')}</h3>
              <button
                onClick={handleAssociateDevice}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-text-inverse)] rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
                <QrCode className="w-4 h-4" />
                {t('mobileApp.pairDevice')}
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
                      <span className="text-[var(--color-text-tertiary)]">{t('mobileApp.deviceSystem')}</span>
                      <span className="flex items-center gap-1">
                        {device.type === 'iOS' ? <Apple className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {device.type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">{t('mobileApp.deviceVersion')}</span>
                      <span>{device.version}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">{t('mobileApp.deviceLastSync')}</span>
                      <span>{device.lastSync}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-tertiary)]">{t('mobileApp.deviceBattery')}</span>
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
                          {t('mobileApp.syncing')}
                        </span>
                      ) : (
                        t('mobileApp.sync')
                      )}
                    </button>
                    <button
                      onClick={() => handleDisconnectDevice(device.id, device.name)}
                      className="px-3 py-2 bg-[var(--color-error-light)] text-[var(--color-error)] rounded-lg text-sm hover:bg-[var(--color-error-light)] hover:bg-opacity-75 transition-colors">
                      {t('mobileApp.disconnect')}
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
              <h3 className="text-lg font-semibold mb-4">{t('mobileApp.syncSettings')}</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('mobileApp.autoSync')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.autoSyncDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('mobileApp.wifiOnly')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.wifiOnlyDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
                  <div className="font-medium mb-2">{t('mobileApp.syncFrequency')}</div>
                  <select className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm">
                    <option>{t('mobileApp.every15min')}</option>
                    <option>{t('mobileApp.every30min')}</option>
                    <option>{t('mobileApp.everyHour')}</option>
                    <option>{t('mobileApp.every2hours')}</option>
                    <option>{t('mobileApp.manualOnly')}</option>
                  </select>
                </div>

                <div className="p-3 bg-[var(--color-surface-hover)] rounded-lg">
                  <div className="font-medium mb-2">{t('mobileApp.dataToSync')}</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{t('mobileApp.invoicesDocuments')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{t('mobileApp.contactsCustomers')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="rounded" />
                      <span className="text-sm">{t('mobileApp.journalEntries')}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{t('mobileApp.attachments')}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold mb-4">{t('mobileApp.syncHistory')}</h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-surface-hover)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('mobileApp.colDevice')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('mobileApp.colDateTime')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('mobileApp.colType')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('mobileApp.colItems')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('mobileApp.colDuration')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-tertiary)] uppercase">{t('mobileApp.colStatus')}</th>
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
                            {sync.status === 'success' ? t('mobileApp.statusSuccess') :
                             sync.status === 'failed' ? t('mobileApp.statusFailed') : t('mobileApp.statusInProgress')}
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
            <h3 className="text-lg font-semibold">{t('mobileApp.mobileSecurity')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-[var(--color-primary)]" />
                  {t('mobileApp.authentication')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.pinRequired')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.biometricTouchFace')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.twoFactorAuth')}</span>
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
                  {t('mobileApp.encryption')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.localEncryption')}</span>
                    <span className="text-xs text-[var(--color-success)] font-medium">AES-256</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.networkEncryption')}</span>
                    <span className="text-xs text-[var(--color-success)] font-medium">TLS 1.3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.secureStorage')}</span>
                    <span className="text-xs text-[var(--color-success)] font-medium">{t('mobileApp.enabled')}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-lg p-4 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <WifiOff className="w-5 h-5 text-[var(--color-secondary)]" />
                  {t('mobileApp.session')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.autoLock')}</span>
                    <select className="px-2 py-1 border border-[var(--color-border)] rounded text-sm">
                      <option>{t('mobileApp.oneMinute')}</option>
                      <option>{t('mobileApp.fiveMinutes')}</option>
                      <option>{t('mobileApp.fifteenMinutes')}</option>
                      <option>{t('mobileApp.never')}</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.remoteWipe')}</span>
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
                  {t('mobileApp.audit')}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.activityLog')}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-9 h-5 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-success)]"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{t('mobileApp.securityAlerts')}</span>
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
            <h3 className="text-lg font-semibold">{t('mobileApp.notificationSettings')}</h3>

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h4 className="font-semibold mb-4">{t('mobileApp.notificationTypes')}</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('mobileApp.newInvoices')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.newInvoicesDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('mobileApp.paymentsReceived')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.paymentsReceivedDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('thirdParty.dueDate')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.dueDatesDesc')}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t('mobileApp.systemUpdates')}</div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">{t('mobileApp.systemUpdatesDesc')}</div>
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
            <h3 className="text-lg font-semibold">{t('mobileApp.appSettings')}</h3>

            <div className="bg-[var(--color-surface)] rounded-lg p-6 shadow-[var(--shadow-sm)] border border-[var(--color-border)]">
              <h4 className="font-semibold mb-4">{t('mobileApp.generalConfig')}</h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('mobileApp.minVersionRequired')}
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
                    {t('mobileApp.serverUrl')}
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
                    {t('mobileApp.cacheLimit')}
                  </label>
                  <input
                    type="number"
                    value={settings.cacheLimit}
                    onChange={(e) => setSettings(prev => ({ ...prev, cacheLimit: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{t('mobileApp.debugMode')}</span>
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
                  <span className="text-sm font-medium text-gray-700">{t('mobileApp.analyticsCollection')}</span>
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
                    {t('mobileApp.saveChanges')}
                  </button>
                  <button
                    onClick={handleResetSettings}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    {t('mobileApp.reset')}
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
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{t('mobileApp.pageTitle')}</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">{t('mobileApp.pageSubtitle')}</p>
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
            <DialogTitle className="text-lg font-semibold">{t('mobileApp.pairNewDevice')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center p-8 bg-gray-50 rounded-lg">
              <div className="relative">
                <QrCode className="w-48 h-48 text-gray-800" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-2">
                    <span className="text-xs font-mono">{pairingToken}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                {t('mobileApp.scanQrInstruction')}
              </p>
              <p className="text-xs text-gray-700">
                {t('mobileApp.pairingCodeLabel')} <span className="font-mono font-bold">{pairingToken}</span>
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <button
                onClick={() => {
                  toast.success(t('mobileApp.toastCodeCopied'));
                  navigator.clipboard.writeText(pairingToken);
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                {t('mobileApp.copyCode')}
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('mobileApp.close')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Modal */}
      <Dialog open={!!showDisconnectConfirm} onOpenChange={() => setShowDisconnectConfirm(null)}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t('mobileApp.confirmDisconnect')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              {t('mobileApp.confirmDisconnectPrefix')} <strong>{showDisconnectConfirm?.name}</strong> {t('mobileApp.confirmDisconnectSuffix')}
            </p>
            <p className="text-sm text-gray-700">
              {t('mobileApp.disconnectWarning')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDisconnectConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('mobileApp.cancel')}
              </button>
              <button
                onClick={confirmDisconnect}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {t('mobileApp.disconnect')}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MobileAppPage;