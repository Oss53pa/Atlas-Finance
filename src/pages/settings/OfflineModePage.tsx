import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  WifiOff,
  Wifi,
  Database,
  HardDrive,
  Cloud,
  Download,
  Upload,
  Settings,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  Archive,
  Timer,
  Users,
  FileText,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Zap,
  Shield,
  Activity,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  GitMerge,
  GitBranch,
  History,
  Eye,
  Edit,
  Save,
  X,
  Plus,
  Minus,
  Info,
  AlertCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
  Label,
  Input,
  Alert,
  AlertDescription,
  Checkbox,
  Separator
} from '../../components/ui';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface OfflineData {
  id: string;
  module: string;
  type: 'table' | 'file' | 'config';
  size: string;
  lastRefreshCw: Date;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
  records: number;
}

interface RefreshCwOperation {
  id: string;
  type: 'upload' | 'download' | 'sync';
  module: string;
  operation: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'conflict';
  createdAt: Date;
  updatedAt: Date;
  progress: number;
  errorMessage?: string;
  conflictCount?: number;
}

interface ConflictItem {
  id: string;
  module: string;
  recordId: string;
  recordType: string;
  field: string;
  localValue: any;
  serverValue: any;
  lastModifiedLocal: Date;
  lastModifiedServer: Date;
  status: 'pending' | 'resolved' | 'auto_resolved';
  resolution?: 'local' | 'server' | 'manual';
}

interface StorageMetrics {
  total: number;
  used: number;
  available: number;
  modules: { [key: string]: number };
}

const OfflineModePage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isOnline, setIsOnline] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [autoRefreshCw, setAutoRefreshCw] = useState(true);
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [showConflictDetails, setShowConflictDetails] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<ConflictItem | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Mock data
  const storageMetrics: StorageMetrics = {
    total: 10 * 1024, // 10 GB in MB
    used: 2.5 * 1024, // 2.5 GB in MB
    available: 7.5 * 1024, // 7.5 GB in MB
    modules: {
      'Comptabilité': 1024,
      'CRM': 512,
      'Stock': 768,
      'RH': 256
    }
  };

  const offlineData: OfflineData[] = [
    {
      id: '1',
      module: 'Comptabilité',
      type: 'table',
      size: '1.2 GB',
      lastRefreshCw: new Date('2024-02-10T15:30:00'),
      priority: 'high',
      enabled: true,
      records: 15420
    },
    {
      id: '2',
      module: 'CRM - Clients',
      type: 'table',
      size: '350 MB',
      lastRefreshCw: new Date('2024-02-10T16:00:00'),
      priority: 'high',
      enabled: true,
      records: 2847
    },
    {
      id: '3',
      module: 'Stock - Articles',
      type: 'table',
      size: '120 MB',
      lastRefreshCw: new Date('2024-02-10T14:15:00'),
      priority: 'medium',
      enabled: true,
      records: 1205
    },
    {
      id: '4',
      module: 'RH - Employés',
      type: 'table',
      size: '45 MB',
      lastRefreshCw: new Date('2024-02-10T13:45:00'),
      priority: 'low',
      enabled: false,
      records: 156
    },
    {
      id: '5',
      module: 'Documents',
      type: 'file',
      size: '800 MB',
      lastRefreshCw: new Date('2024-02-10T12:00:00'),
      priority: 'medium',
      enabled: true,
      records: 324
    }
  ];

  const syncOperations: RefreshCwOperation[] = [
    {
      id: '1',
      type: 'upload',
      module: 'Comptabilité',
      operation: 'RefreshCwhronisation des écritures',
      status: 'pending',
      createdAt: new Date('2024-02-10T17:00:00'),
      updatedAt: new Date('2024-02-10T17:00:00'),
      progress: 0
    },
    {
      id: '2',
      type: 'download',
      module: 'CRM',
      operation: 'Mise à jour des contacts',
      status: 'in_progress',
      createdAt: new Date('2024-02-10T16:45:00'),
      updatedAt: new Date('2024-02-10T16:50:00'),
      progress: 65
    },
    {
      id: '3',
      type: 'sync',
      module: 'Stock',
      operation: 'RefreshCwhronisation des mouvements',
      status: 'conflict',
      createdAt: new Date('2024-02-10T16:30:00'),
      updatedAt: new Date('2024-02-10T16:35:00'),
      progress: 80,
      conflictCount: 3
    },
    {
      id: '4',
      type: 'upload',
      module: 'CRM',
      operation: 'Nouveaux prospects',
      status: 'completed',
      createdAt: new Date('2024-02-10T16:00:00'),
      updatedAt: new Date('2024-02-10T16:15:00'),
      progress: 100
    },
    {
      id: '5',
      type: 'download',
      module: 'RH',
      operation: 'Données des employés',
      status: 'failed',
      createdAt: new Date('2024-02-10T15:30:00'),
      updatedAt: new Date('2024-02-10T15:35:00'),
      progress: 25,
      errorMessage: 'Erreur de connexion au serveur'
    }
  ];

  const conflicts: ConflictItem[] = [
    {
      id: '1',
      module: 'Comptabilité',
      recordId: 'ECR-2024-001',
      recordType: 'Écriture comptable',
      field: 'montant',
      localValue: 1250.00,
      serverValue: 1275.00,
      lastModifiedLocal: new Date('2024-02-10T14:30:00'),
      lastModifiedServer: new Date('2024-02-10T15:00:00'),
      status: 'pending'
    },
    {
      id: '2',
      module: 'CRM',
      recordId: 'CLI-2024-045',
      recordType: 'Client',
      field: 'telephone',
      localValue: '01 23 45 67 89',
      serverValue: '01 23 45 67 90',
      lastModifiedLocal: new Date('2024-02-10T13:15:00'),
      lastModifiedServer: new Date('2024-02-10T16:00:00'),
      status: 'pending'
    },
    {
      id: '3',
      module: 'Stock',
      recordId: 'ART-2024-112',
      recordType: 'Article',
      field: 'quantite',
      localValue: 150,
      serverValue: 142,
      lastModifiedLocal: new Date('2024-02-10T16:45:00'),
      lastModifiedServer: new Date('2024-02-10T16:30:00'),
      status: 'pending'
    }
  ];

  const recentActivity = [
    {
      id: '1',
      action: 'RefreshCwhronisation automatique terminée',
      module: 'CRM',
      timestamp: new Date('2024-02-10T16:15:00'),
      status: 'success'
    },
    {
      id: '2',
      action: 'Mode hors-ligne activé',
      module: 'Système',
      timestamp: new Date('2024-02-10T15:45:00'),
      status: 'info'
    },
    {
      id: '3',
      action: 'Conflit résolu automatiquement',
      module: 'Stock',
      timestamp: new Date('2024-02-10T15:30:00'),
      status: 'warning'
    },
    {
      id: '4',
      action: 'Données sauvegardées localement',
      module: 'Comptabilité',
      timestamp: new Date('2024-02-10T15:00:00'),
      status: 'success'
    }
  ];

  const handleRefreshCwOperation = (operationId: string, action: 'retry' | 'cancel') => {
    if (action === 'retry') {
      toast.success('Opération relancée');
    } else {
      toast.success('Opération annulée');
    }
  };

  const handleConflictResolution = (conflictId: string, resolution: 'local' | 'server' | 'manual') => {
    if (resolution === 'manual') {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (conflict) {
        setShowEditModal(conflict);
        setEditValue(JSON.stringify(conflict.localValue));
      }
    } else {
      toast.success(`Conflit résolu en faveur de la version ${resolution === 'local' ? 'locale' : 'serveur'}`);
    }
  };

  const handleSaveManualEdit = () => {
    if (showEditModal) {
      try {
        const parsedValue = JSON.parse(editValue);
        toast.success(`Valeur manuelle sauvegardée pour ${showEditModal.recordId}`);
        setShowEditModal(null);
        setEditValue('');
      } catch (error) {
        toast.error('Format JSON invalide');
      }
    }
  };

  const handleManualRefreshCw = () => {
    toast.success('RefreshCwhronisation manuelle démarrée');
  };

  const handleClearCache = (module?: string) => {
    if (module) {
      toast.success(`Cache du module ${module} vidé`);
    } else {
      toast.success('Tous les caches ont été vidés');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-[var(--color-error-light)] text-[var(--color-error)]';
      case 'medium': return 'bg-[var(--color-warning-light)] text-[var(--color-warning)]';
      case 'low': return 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]';
      default: return 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-[var(--color-primary)]" />;
      case 'pending': return <Clock className="h-4 w-4 text-[var(--color-warning)]" />;
      case 'failed': return <XCircle className="h-4 w-4 text-[var(--color-error)]" />;
      case 'conflict': return <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />;
      default: return <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-[var(--color-success-light)] text-[var(--color-success)]';
      case 'in_progress': return 'bg-[var(--color-info-light)] text-[var(--color-info)]';
      case 'pending': return 'bg-[var(--color-warning-light)] text-[var(--color-warning)]';
      case 'failed': return 'bg-[var(--color-error-light)] text-[var(--color-error)]';
      case 'conflict': return 'bg-[var(--color-warning-light)] text-[var(--color-warning)]';
      default: return 'bg-[var(--color-border-light)] text-[var(--color-text-secondary)]';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <WifiOff className="h-8 w-8 text-[var(--color-primary)]" />
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Mode Hors-Ligne</h1>
              <p className="text-gray-600">Gestion des données et synchronisation offline</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-[var(--color-success)]" />
              ) : (
                <WifiOff className="h-5 w-5 text-[var(--color-error)]" />
              )}
              <span className={`font-medium ${isOnline ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            <Button
              onClick={handleManualRefreshCw}
              disabled={!isOnline}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>RefreshCwhroniser</span>
            </Button>
          </div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="data">Gestion des données</TabsTrigger>
          <TabsTrigger value="sync">File de synchronisation</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="conflicts">Conflits</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">État du système</p>
                    <p className={`text-lg font-bold ${offlineMode ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                      {offlineMode ? 'Hors ligne' : 'En ligne'}
                    </p>
                  </div>
                  {offlineMode ? (
                    <WifiOff className="h-8 w-8 text-[var(--color-warning)]" />
                  ) : (
                    <Wifi className="h-8 w-8 text-[var(--color-success)]" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Espace utilisé</p>
                    <p className="text-lg font-bold text-[var(--color-text-primary)]">
                      {(storageMetrics.used / 1024).toFixed(1)} GB
                    </p>
                  </div>
                  <HardDrive className="h-8 w-8 text-[var(--color-primary)]" />
                </div>
                <div className="mt-4">
                  <Progress
                    value={(storageMetrics.used / storageMetrics.total) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    {((storageMetrics.used / storageMetrics.total) * 100).toFixed(1)}% utilisé
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{t('status.pending')}</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">
                      {syncOperations.filter(op => op.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-[var(--color-warning)]" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Conflits</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">
                      {conflicts.filter(c => c.status === 'pending').length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-[var(--color-error)]" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Utilisation du stockage</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(storageMetrics.modules).map(([module, size]) => (
                  <div key={module} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{module}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-[var(--color-text-secondary)]">{size} MB</span>
                      <div className="w-24 h-2 bg-[var(--color-border)] rounded-full">
                        <div
                          className="h-2 bg-[var(--color-primary)] rounded-full"
                          style={{ width: `${(size / Math.max(...Object.values(storageMetrics.modules))) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Activité récente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 bg-[var(--color-surface-hover)] rounded-lg">
                    <div className={`p-1 rounded-full ${
                      activity.status === 'success' ? 'bg-[var(--color-success-light)]' :
                      activity.status === 'warning' ? 'bg-[var(--color-warning-light)]' :
                      'bg-[var(--color-info-light)]'
                    }`}>
                      {activity.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      ) : activity.status === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
                      ) : (
                        <Info className="h-4 w-4 text-[var(--color-info)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{activity.action}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-[var(--color-text-tertiary)]">{activity.module}</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">•</span>
                        <span className="text-xs text-[var(--color-text-tertiary)]">
                          {activity.timestamp.toLocaleTimeString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>Données en cache</span>
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={() => handleClearCache()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Vider tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {offlineData.map((data) => (
                    <div key={data.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Switch
                          checked={data.enabled}
                          onCheckedChange={() => {
                            toast.success(`${data.module} ${data.enabled ? 'désactivé' : 'activé'} pour le cache offline`);
                          }}
                        />
                        <div>
                          <p className="font-medium">{data.module}</p>
                          <div className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)]">
                            <span>{data.records.toLocaleString()} enregistrements</span>
                            <span>•</span>
                            <span>{data.size}</span>
                            <span>•</span>
                            <span>RefreshCw: {data.lastRefreshCw.toLocaleTimeString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getPriorityColor(data.priority)}>
                          {data.priority === 'high' ? 'Haute' : data.priority === 'medium' ? 'Moyenne' : 'Basse'}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => handleClearCache(data.module)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Paramètres de stockage</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Limite de stockage</Label>
                  <Select defaultValue="10gb">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5gb">5 GB</SelectItem>
                      <SelectItem value="10gb">10 GB</SelectItem>
                      <SelectItem value="20gb">20 GB</SelectItem>
                      <SelectItem value="unlimited">Illimité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rétention des données</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                      <SelectItem value="365">1 an</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Compression des données</Label>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Chiffrement local</Label>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Nettoyage automatique</h4>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Activer</Label>
                    <Switch defaultChecked />
                  </div>
                  <div>
                    <Label className="text-sm">Seuil de nettoyage</Label>
                    <Select defaultValue="80">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">70%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RefreshCw Queue Tab */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <RefreshCw className="h-5 w-5" />
                  <span>File de synchronisation</span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </Button>
                  <Button size="sm" onClick={handleManualRefreshCw}>
                    <Play className="h-4 w-4 mr-2" />
                    Tout synchroniser
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {syncOperations.map((operation) => (
                  <div key={operation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(operation.status)}
                        {operation.type === 'upload' ? (
                          <Upload className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                        ) : operation.type === 'download' ? (
                          <Download className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                        ) : (
                          <RefreshCw className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{operation.operation}</p>
                        <div className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)]">
                          <span>{operation.module}</span>
                          <span>•</span>
                          <span>{operation.createdAt.toLocaleTimeString('fr-FR')}</span>
                          {operation.errorMessage && (
                            <>
                              <span>•</span>
                              <span className="text-[var(--color-error)]">{operation.errorMessage}</span>
                            </>
                          )}
                          {operation.conflictCount && (
                            <>
                              <span>•</span>
                              <span className="text-[var(--color-warning)]">{operation.conflictCount} conflits</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {operation.status === 'in_progress' && (
                        <div className="w-32">
                          <Progress value={operation.progress} className="h-2" />
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">{operation.progress}%</p>
                        </div>
                      )}
                      <Badge className={getStatusColor(operation.status)}>
                        {operation.status === 'pending' ? 'En attente' :
                         operation.status === 'in_progress' ? 'En cours' :
                         operation.status === 'completed' ? 'Terminé' :
                         operation.status === 'failed' ? 'Échec' :
                         operation.status === 'conflict' ? 'Conflit' : operation.status}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {operation.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefreshCwOperation(operation.id, 'retry')}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {(operation.status === 'pending' || operation.status === 'in_progress') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefreshCwOperation(operation.id, 'cancel')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Mode hors-ligne</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Activer le mode hors-ligne</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">Permet de travailler sans connexion internet</p>
                  </div>
                  <Switch
                    checked={offlineMode}
                    onCheckedChange={setOfflineMode}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>RefreshCwhronisation automatique</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">RefreshCw auto dès que la connexion est rétablie</p>
                  </div>
                  <Switch
                    checked={autoRefreshCw}
                    onCheckedChange={setAutoRefreshCw}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mode économie de données</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">Réduire l'utilisation de la bande passante</p>
                  </div>
                  <Switch />
                </div>

                <div>
                  <Label>Intervalle de synchronisation</Label>
                  <Select defaultValue="15">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 heure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wifi className="h-5 w-5" />
                  <span>Détection réseau</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Détection automatique</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">Basculer automatiquement entre online/offline</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label>Timeout de connexion</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 secondes</SelectItem>
                      <SelectItem value="30">30 secondes</SelectItem>
                      <SelectItem value="60">1 minute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Serveur de test</Label>
                  <Input defaultValue="https://api.atlasfinance.com/ping" />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notifications de statut</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">Alertes lors des changements de connexion</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Taille des lots de synchronisation</Label>
                  <Select defaultValue="100">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 enregistrements</SelectItem>
                      <SelectItem value="100">100 enregistrements</SelectItem>
                      <SelectItem value="500">500 enregistrements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Threads de synchronisation</Label>
                  <Select defaultValue="3">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 thread</SelectItem>
                      <SelectItem value="3">3 threads</SelectItem>
                      <SelectItem value="5">5 threads</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Optimisation mémoire</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">Libérer la mémoire après synchronisation</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Sécurité</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Chiffrement en transit</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">TLS 1.3 pour toutes les communications</p>
                  </div>
                  <Switch defaultChecked disabled />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Validation des certificats</Label>
                    <p className="text-sm text-[var(--color-text-secondary)]">Vérifier l'authenticité du serveur</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div>
                  <Label>Algorithme de chiffrement</Label>
                  <Select defaultValue="aes256">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aes128">AES-128</SelectItem>
                      <SelectItem value="aes256">AES-256</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Conflits de synchronisation</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select defaultValue="all">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les conflits</SelectItem>
                        <SelectItem value="pending">{t('status.pending')}</SelectItem>
                        <SelectItem value="resolved">Résolus</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtrer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conflicts.map((conflict) => (
                    <div key={conflict.id} className="border rounded-lg">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center space-x-4">
                          <Checkbox
                            checked={selectedConflicts.includes(conflict.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedConflicts([...selectedConflicts, conflict.id]);
                              } else {
                                setSelectedConflicts(selectedConflicts.filter(id => id !== conflict.id));
                              }
                            }}
                          />
                          <div>
                            <p className="font-medium">
                              {conflict.recordType} - {conflict.recordId}
                            </p>
                            <div className="flex items-center space-x-2 text-sm text-[var(--color-text-secondary)]">
                              <span>{conflict.module}</span>
                              <span>•</span>
                              <span>Champ: {conflict.field}</span>
                              <span>•</span>
                              <Badge className={getStatusColor(conflict.status)}>
                                {conflict.status === 'pending' ? 'En attente' :
                                 conflict.status === 'resolved' ? 'Résolu' : 'Auto-résolu'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConflictDetails(
                              showConflictDetails === conflict.id ? null : conflict.id
                            )}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConflictResolution(conflict.id, 'manual')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {showConflictDetails === conflict.id && (
                        <div className="border-t p-4 bg-gray-50">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center space-x-2">
                                <GitBranch className="h-4 w-4" />
                                <span>Version locale</span>
                              </h4>
                              <div className="bg-white p-3 rounded border">
                                <p className="font-mono text-sm">{JSON.stringify(conflict.localValue)}</p>
                                <p className="text-xs text-gray-700 mt-2">
                                  Modifié: {conflict.lastModifiedLocal.toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConflictResolution(conflict.id, 'local')}
                                className="w-full"
                              >
                                Utiliser cette version
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <h4 className="font-medium flex items-center space-x-2">
                                <Cloud className="h-4 w-4" />
                                <span>Version serveur</span>
                              </h4>
                              <div className="bg-white p-3 rounded border">
                                <p className="font-mono text-sm">{JSON.stringify(conflict.serverValue)}</p>
                                <p className="text-xs text-gray-700 mt-2">
                                  Modifié: {conflict.lastModifiedServer.toLocaleString('fr-FR')}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConflictResolution(conflict.id, 'server')}
                                className="w-full"
                              >
                                Utiliser cette version
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
                            <Button
                              size="sm"
                              onClick={() => handleConflictResolution(conflict.id, 'manual')}
                            >
                              <GitMerge className="h-4 w-4 mr-2" />
                              Fusion manuelle
                            </Button>
                            <Button variant="ghost" size="sm">
                              <History className="h-4 w-4 mr-2" />
                              Voir l'historique
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedConflicts.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg mt-4">
                    <p className="font-medium">
                      {selectedConflicts.length} conflit(s) sélectionné(s)
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        Résoudre en faveur du local
                      </Button>
                      <Button variant="outline" size="sm">
                        Résoudre en faveur du serveur
                      </Button>
                      <Button size="sm">
                        Résolution automatique
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Stratégies de résolution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Résolution automatique</Label>
                    <Select defaultValue="timestamp">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="timestamp">Plus récent gagne</SelectItem>
                        <SelectItem value="local">Priorité locale</SelectItem>
                        <SelectItem value="server">Priorité serveur</SelectItem>
                        <SelectItem value="manual">Toujours manuel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Notification des conflits</Label>
                      <p className="text-sm text-[var(--color-text-secondary)]">Alerter lors de nouveaux conflits</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Sauvegarde avant résolution</Label>
                      <p className="text-sm text-[var(--color-text-secondary)]">Conserver une copie de sécurité</p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div>
                    <Label>Délai d'attente auto-résolution</Label>
                    <Select defaultValue="24">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 heure</SelectItem>
                        <SelectItem value="24">24 heures</SelectItem>
                        <SelectItem value="168">7 jours</SelectItem>
                        <SelectItem value="never">Jamais</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5" />
                    <span>Historique des résolutions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Client CLI-2024-042</p>
                        <p className="text-xs text-gray-600">Résolu automatiquement - Version serveur</p>
                      </div>
                      <span className="text-xs text-[var(--color-text-tertiary)]">Il y a 2h</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Article ART-2024-098</p>
                        <p className="text-xs text-gray-600">Résolu manuellement - Fusion</p>
                      </div>
                      <span className="text-xs text-[var(--color-text-tertiary)]">Il y a 5h</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Écriture ECR-2024-156</p>
                        <p className="text-xs text-gray-600">Résolu automatiquement - Version locale</p>
                      </div>
                      <span className="text-xs text-[var(--color-text-tertiary)]">{t('common.yesterday')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal d'édition manuelle des conflits */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[#6A8A82] bg-opacity-10 p-2 rounded-lg">
                  <GitMerge className="w-5 h-5 text-[#6A8A82]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Résolution Manuelle du Conflit</h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(null);
                  setEditValue('');
                }}
                className="text-gray-700 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info sur le conflit */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Informations du conflit</h4>
                      <p className="text-sm text-blue-800">
                        Module: {showEditModal.module} •
                        Enregistrement: {showEditModal.recordId} •
                        Champ: {showEditModal.field}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Comparaison des valeurs */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                      <GitBranch className="w-4 h-4 text-[#6A8A82]" />
                      <span>Valeur locale</span>
                    </h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(showEditModal.localValue, null, 2)}
                      </pre>
                      <p className="text-xs text-gray-700 mt-2">
                        Modifié: {showEditModal.lastModifiedLocal.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                      <Cloud className="w-4 h-4 text-[#7A99AC]" />
                      <span>Valeur serveur</span>
                    </h4>
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(showEditModal.serverValue, null, 2)}
                      </pre>
                      <p className="text-xs text-gray-700 mt-2">
                        Modifié: {showEditModal.lastModifiedServer.toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Champ d'édition */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                    <Edit className="w-4 h-4 text-[#B87333]" />
                    <span>Valeur de fusion manuelle</span>
                  </h4>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82] focus:border-[#6A8A82] font-mono text-sm"
                    rows={8}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Entrez la valeur JSON pour résoudre le conflit..."
                  />
                  <p className="text-xs text-gray-700">
                    Modifiez la valeur JSON ci-dessus pour créer une fusion manuelle des données
                  </p>
                </div>

                {/* Options rapides */}
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">Actions rapides:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditValue(JSON.stringify(showEditModal.localValue, null, 2))}
                  >
                    Utiliser valeur locale
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditValue(JSON.stringify(showEditModal.serverValue, null, 2))}
                  >
                    Utiliser valeur serveur
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Tentative de fusion automatique simple
                      if (typeof showEditModal.localValue === 'object' && typeof showEditModal.serverValue === 'object') {
                        const merged = { ...showEditModal.serverValue, ...showEditModal.localValue };
                        setEditValue(JSON.stringify(merged, null, 2));
                      }
                    }}
                  >
                    Fusion automatique
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(null);
                  setEditValue('');
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveManualEdit}
                className="bg-[#6A8A82] hover:bg-[#7A99AC] text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Sauvegarder la fusion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineModePage;