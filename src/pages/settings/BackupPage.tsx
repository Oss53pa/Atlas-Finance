import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { db } from '../../lib/db';
import {
  HardDrive,
  Cloud,
  Download,
  Upload,
  Shield,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Pause,
  Plus,
  Settings,
  Archive,
  Database,
  Server,
  Lock,
  Key,
  FolderOpen,
  Zap,
  Wifi,
  WifiOff,
  ChevronRight,
  Info,
  History,
  Filter,
  XCircle
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
  Checkbox
} from '../../components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/Dialog';
import { DiagnosticPanel } from '../../components/common/DiagnosticPanel';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Backup {
  id: string;
  name: string;
  type: 'manual' | 'automatic' | 'scheduled';
  size: string;
  date: Date;
  status: 'completed' | 'in_progress' | 'failed';
  location: 'local' | 'cloud' | 'both';
  encrypted: boolean;
  modules: string[];
}

interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  nextRun: Date;
  lastRun?: Date;
  active: boolean;
  retention: number; // days
}

const BackupPage: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [showNewScheduleModal, setShowNewScheduleModal] = useState(false);
  const [showScheduleConfigModal, setShowScheduleConfigModal] = useState<BackupSchedule | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showKeyGenerator, setShowKeyGenerator] = useState(false);
  const [showCloudTestModal, setShowCloudTestModal] = useState(false);
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<'testing' | 'success' | 'error' | null>(null);

  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState<string | null>(null); // null | 'thirdParties' | 'journalEntries' | 'all'
  const [resetInProgress, setResetInProgress] = useState(false);
  const [resetDone, setResetDone] = useState<string | null>(null);

  const RESET_GROUPS = [
    {
      key: 'thirdParties',
      label: t('backup.groupThirdParties'),
      description: t('backup.groupThirdPartiesDesc'),
      tables: ['thirdParties'],
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      icon: '👥',
    },
    {
      key: 'journalEntries',
      label: t('backup.groupJournalEntries'),
      description: t('backup.groupJournalEntriesDesc'),
      tables: ['journalEntries'],
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: '📒',
    },
    {
      key: 'assets',
      label: t('backup.groupAssets'),
      description: t('backup.groupAssetsDesc'),
      tables: ['assets'],
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: '🏭',
    },
    {
      key: 'budgets',
      label: t('backup.groupBudgets'),
      description: t('backup.groupBudgetsDesc'),
      tables: ['budgetLines'],
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      icon: '📊',
    },
    {
      key: 'treasury',
      label: t('backup.groupTreasury'),
      description: t('backup.groupTreasuryDesc'),
      tables: ['hedgingPositions', 'paymentOrders', 'loanSchedules', 'checks'],
      color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      icon: '💵',
    },
    {
      key: 'all',
      label: t('backup.groupAll'),
      description: t('backup.groupAllDesc'),
      tables: [
        'journalEntries', 'thirdParties', 'assets', 'budgetLines',
        'hedgingPositions', 'paymentOrders', 'loanSchedules', 'checks',
        'recoveryCases', 'taxDeclarations', 'taxRegistry', 'provisions',
        'inventoryItems', 'stockMovements', 'revisionItems', 'closureSessions',
        'exchangeRates', 'fiscalPeriods', 'cashMovements', 'cashRegisterSessions',
      ],
      color: 'bg-red-50 border-red-300 text-red-900',
      icon: '🗑️',
    },
  ] as const;

  const handleReset = async (key: string) => {
    const group = RESET_GROUPS.find(g => g.key === key);
    if (!group) return;
    setResetInProgress(true);
    try {
      for (const table of group.tables) {
        await (db as any)[table]?.clear();
      }
      setResetDone(key);
      setTimeout(() => setResetDone(null), 4000);
    } catch (err) {
      console.error('Erreur réinitialisation:', err);
    } finally {
      setResetInProgress(false);
      setShowResetConfirm(null);
    }
  };

  // Mock backups data
  const backups: Backup[] = [
    {
      id: '1',
      name: t('backup.mockBackupFullFeb'),
      type: 'automatic',
      size: '2.5 GB',
      date: new Date('2024-02-10T03:00:00'),
      status: 'completed',
      location: 'both',
      encrypted: true,
      modules: [t('backup.moduleAccounting'), 'CRM', t('backup.moduleStock'), t('backup.moduleHr')]
    },
    {
      id: '2',
      name: t('backup.mockBackupDaily'),
      type: 'scheduled',
      size: '450 MB',
      date: new Date('2024-02-10T22:00:00'),
      status: 'in_progress',
      location: 'cloud',
      encrypted: true,
      modules: [t('backup.moduleAccounting'), t('backup.moduleTreasury')]
    },
    {
      id: '3',
      name: t('backup.mockBackupManualAudit'),
      type: 'manual',
      size: '1.2 GB',
      date: new Date('2024-02-09T14:30:00'),
      status: 'completed',
      location: 'local',
      encrypted: false,
      modules: [t('backup.moduleAllData')]
    }
  ];

  // Mock schedules
  const schedules: BackupSchedule[] = [
    {
      id: '1',
      name: t('backup.mockScheduleDaily'),
      frequency: 'daily',
      time: '22:00',
      nextRun: new Date('2024-02-11T22:00:00'),
      lastRun: new Date('2024-02-10T22:00:00'),
      active: true,
      retention: 30
    },
    {
      id: '2',
      name: t('backup.mockScheduleMonthlyArchive'),
      frequency: 'monthly',
      time: '03:00',
      nextRun: new Date('2024-03-01T03:00:00'),
      lastRun: new Date('2024-02-01T03:00:00'),
      active: true,
      retention: 365
    },
    {
      id: '3',
      name: t('backup.mockScheduleWeekly'),
      frequency: 'weekly',
      time: '01:00',
      nextRun: new Date('2024-02-17T01:00:00'),
      lastRun: new Date('2024-02-10T01:00:00'),
      active: false,
      retention: 90
    }
  ];

  const handleBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      toast.success(t('backup.toastBackupStarted'));
      setIsBackingUp(false);
    }, 3000);
  };

  const handleRestore = (backupId: string) => {
    setSelectedBackup(backupId);
    setShowRestoreModal(true);
  };

  const handleTestCloudConnection = () => {
    setCloudConnectionStatus('testing');
    setShowCloudTestModal(true);

    setTimeout(() => {
      setCloudConnectionStatus('success');
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-[var(--color-success-light)] text-[var(--color-success)]';
      case 'in_progress':
        return 'bg-[var(--color-info-light)] text-[var(--color-info)]';
      case 'failed':
        return 'bg-[var(--color-error-light)] text-[var(--color-error)]';
      default:
        return 'bg-[var(--color-surface)] text-[var(--color-text-tertiary)]';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--color-border)] pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <HardDrive className="mr-3 h-7 w-7 text-[var(--color-info)]" />
              {t('backup.title')}
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {t('backup.subtitle')}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              {t('backup.history')}
            </Button>
            <Button
              className="bg-[var(--color-info)] hover:bg-[var(--color-info)]"
              onClick={handleBackup}
              disabled={isBackingUp}
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {t('backup.backingUp')}
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  {t('backup.newBackup')}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Panneau de Diagnostic (à retirer en production) */}
      {process.env.NODE_ENV === 'development' && (
        <DiagnosticPanel />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t('backup.lastBackup')}</p>
                <p className="text-lg font-bold">{t('backup.twoHoursAgo')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">10/02/2024 22:00</p>
              </div>
              <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t('backup.usedSpace')}</p>
                <p className="text-lg font-bold">15.2 GB</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('backup.outOfHundredGb')}</p>
              </div>
              <Database className="h-8 w-8 text-[var(--color-info)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t('backup.backupsCount')}</p>
                <p className="text-lg font-bold">{t('backup.activeCount')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">{t('backup.scheduledCount')}</p>
              </div>
              <Archive className="h-8 w-8 text-[var(--color-accent)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">{t('backup.nextLabel')}</p>
                <p className="text-lg font-bold">{t('backup.inTwentyHours')}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">11/02 22:00</p>
              </div>
              <Clock className="h-8 w-8 text-[var(--color-warning)]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('backup.tabOverview')}</TabsTrigger>
          <TabsTrigger value="backups">{t('backup.tabBackups')}</TabsTrigger>
          <TabsTrigger value="schedule">{t('backup.tabSchedule')}</TabsTrigger>
          <TabsTrigger value="restore">{t('backup.tabRestore')}</TabsTrigger>
          <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
          <TabsTrigger value="reset" className="text-red-600">{t('backup.tabReset')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status général */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  {t('backup.protectionStatus')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[var(--color-success-light)] rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-[var(--color-success)] mr-3" />
                    <div>
                      <p className="font-medium">{t('backup.protectionActive')}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">{t('backup.allDataBackedUp')}</p>
                    </div>
                  </div>
                  <Badge className="bg-[var(--color-success-light)] text-[var(--color-success)]">{t('backup.optimal')}</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.autoBackup')}</span>
                    <Switch checked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.encryptionAes256')}</span>
                    <Switch checked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.cloudReplication')}</span>
                    <Switch checked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.integrityCheck')}</span>
                    <Switch checked />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stockage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  {t('backup.storage')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.local')}</span>
                    <span className="text-sm font-medium">8.5 GB / 50 GB</span>
                  </div>
                  <Progress value={17} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.cloudAws')}</span>
                    <span className="text-sm font-medium">6.7 GB / 100 GB</span>
                  </div>
                  <Progress value={6.7} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.archives')}</span>
                    <span className="text-sm font-medium">12.3 GB</span>
                  </div>
                  <Progress value={100} className="h-2 bg-[var(--color-surface-hover)]" />
                </div>

                <Alert className="bg-[var(--color-info-light)] border-[var(--color-info)]">
                  <Info className="h-4 w-4 text-[var(--color-info)]" />
                  <AlertDescription>
                    {t('backup.retentionPolicy')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Dernières sauvegardes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('backup.latestBackups')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {backups.slice(0, 3).map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-[var(--color-surface-hover)]">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        backup.location === 'cloud' ? 'bg-[var(--color-info-light)]' :
                        backup.location === 'local' ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-success-light)]'
                      }`}>
                        {backup.location === 'cloud' ? (
                          <Cloud className="h-5 w-5 text-[var(--color-info)]" />
                        ) : backup.location === 'local' ? (
                          <HardDrive className="h-5 w-5 text-[var(--color-text-secondary)]" />
                        ) : (
                          <Server className="h-5 w-5 text-[var(--color-success)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{backup.name}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">
                          {backup.size} • {backup.date.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {backup.encrypted && (
                        <Lock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                      )}
                      <Badge className={getStatusColor(backup.status)}>
                        {backup.status === 'completed' ? t('backup.statusCompleted') :
                         backup.status === 'in_progress' ? t('backup.statusInProgress') : t('backup.statusFailed')}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('backup.listTitle')}</CardTitle>
                <div className="flex space-x-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('backup.filterAll')}</SelectItem>
                      <SelectItem value="completed">{t('backup.filterCompleted')}</SelectItem>
                      <SelectItem value="failed">{t('backup.filterFailed')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    {t('backup.filter')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {backups.map((backup) => (
                  <div
                    key={backup.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedBackup === backup.id ? 'border-[var(--color-info)] bg-[var(--color-info-light)]' : 'hover:bg-[var(--color-surface-hover)]'
                    }`}
                    onClick={() => setSelectedBackup(backup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          backup.type === 'automatic' ? 'bg-[var(--color-info-light)]' :
                          backup.type === 'scheduled' ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface)]'
                        }`}>
                          {backup.type === 'automatic' ? (
                            <Zap className="h-6 w-6 text-[var(--color-info)]" />
                          ) : backup.type === 'scheduled' ? (
                            <Calendar className="h-6 w-6 text-[var(--color-accent)]" />
                          ) : (
                            <Upload className="h-6 w-6 text-[var(--color-text-secondary)]" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{backup.name}</h4>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {backup.modules.join(', ')}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                            {backup.date.toLocaleString()} • {backup.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          {backup.location === 'both' || backup.location === 'local' ? (
                            <HardDrive className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                          ) : null}
                          {backup.location === 'both' || backup.location === 'cloud' ? (
                            <Cloud className="h-4 w-4 text-[var(--color-info)]" />
                          ) : null}
                          {backup.encrypted && (
                            <Lock className="h-4 w-4 text-[var(--color-success)]" />
                          )}
                        </div>
                        <Badge className={getStatusColor(backup.status)}>
                          {backup.status === 'completed' ? t('backup.statusCompleted') :
                           backup.status === 'in_progress' ? (
                             <>
                               <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                               {t('backup.statusInProgress')}
                             </>
                           ) : t('backup.statusFailed')}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(backup.id);
                            }}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('backup.schedulesTitle')}</CardTitle>
                <Button onClick={() => setShowNewScheduleModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('backup.newSchedule')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-lg ${
                          schedule.active ? 'bg-[var(--color-success-light)]' : 'bg-[var(--color-surface)]'
                        }`}>
                          <Calendar className={`h-5 w-5 ${
                            schedule.active ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium flex items-center">
                            {schedule.name}
                            {schedule.active && (
                              <Badge className="ml-2 bg-[var(--color-success-light)] text-[var(--color-success)]">{t('backup.active')}</Badge>
                            )}
                          </h4>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {schedule.frequency === 'daily' ? t('backup.freqDaily') :
                             schedule.frequency === 'weekly' ? t('backup.freqWeekly') : t('backup.freqMonthly')} {t('backup.at')} {schedule.time}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                            {t('backup.nextRun')}: {schedule.nextRun.toLocaleString()}
                            {schedule.lastRun && ` • ${t('backup.lastRun')}: ${schedule.lastRun.toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-tertiary)]">{t('backup.retention')}</p>
                          <p className="text-sm font-medium">{schedule.retention} {t('backup.days')}</p>
                        </div>
                        <Switch
                          checked={schedule.active}
                          onCheckedChange={() => toast.success(schedule.active ? t('backup.toastScheduleDisabled') : t('backup.toastScheduleEnabled'))}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowScheduleConfigModal(schedule)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Restore Tab */}
        <TabsContent value="restore" className="space-y-4">
          <Alert className="bg-[var(--color-warning-light)] border-[var(--color-warning)]">
            <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" />
            <AlertDescription>
              <strong>{t('backup.warningLabel')}</strong> {t('backup.restoreWarning')}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>{t('backup.restoreOptions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>{t('backup.selectBackup')}</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder={t('backup.chooseBackup')} />
                  </SelectTrigger>
                  <SelectContent>
                    {backups.filter(b => b.status === 'completed').map(backup => (
                      <SelectItem key={backup.id} value={backup.id}>
                        {backup.name} - {backup.date.toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('backup.restoreType')}</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="restore-type" defaultChecked />
                    <span>{t('backup.fullRestore')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="restore-type" />
                    <span>{t('backup.selectiveRestore')}</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>{t('backup.modulesToRestore')}</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">{t('accounting.title')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">CRM</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">{t('backup.moduleStock')}</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">{t('backup.moduleHr')}</span>
                  </label>
                </div>
              </div>

              <Button
                className="w-full bg-[var(--color-warning)] hover:bg-[var(--color-warning)]"
                onClick={() => setShowRestoreModal(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('backup.startRestore')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('backup.generalSettings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('backup.localBackupLocation')}</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input defaultValue="/var/backups/atlasfna" readOnly />
                    <Button
                      variant="outline"
                      onClick={() => setShowFolderPicker(true)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>{t('backup.compression')}</Label>
                  <Select defaultValue="gzip">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('backup.compressionNone')}</SelectItem>
                      <SelectItem value="gzip">GZIP</SelectItem>
                      <SelectItem value="zip">ZIP</SelectItem>
                      <SelectItem value="7z">7-Zip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch checked />
                    <Label>{t('backup.verifyIntegrityAfter')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch checked />
                    <Label>{t('backup.emailOnFailure')}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <Label>{t('backup.incrementalMode')}</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('backup.security')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('backup.encryption')}</Label>
                  <Select defaultValue="aes256">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('backup.encryptionNone')}</SelectItem>
                      <SelectItem value="aes128">AES-128</SelectItem>
                      <SelectItem value="aes256">AES-256</SelectItem>
                      <SelectItem value="rsa">RSA-4096</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{t('backup.encryptionKey')}</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input type="password" placeholder="••••••••" />
                    <Button
                      variant="outline"
                      onClick={() => setShowKeyGenerator(true)}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    {t('backup.encryptionNotice')}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t('backup.cloudConfig')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t('backup.provider')}</Label>
                    <Select defaultValue="aws">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aws">Amazon S3</SelectItem>
                        <SelectItem value="azure">Azure Blob</SelectItem>
                        <SelectItem value="gcp">Google Cloud Storage</SelectItem>
                        <SelectItem value="dropbox">Dropbox</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>{t('backup.region')}</Label>
                    <Select defaultValue="eu-west-1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eu-west-1">{t('backup.regionEuWest')}</SelectItem>
                        <SelectItem value="eu-central-1">{t('backup.regionEuCentral')}</SelectItem>
                        <SelectItem value="us-east-1">US East</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Access Key ID</Label>
                    <Input type="password" placeholder="AKIA••••••••" />
                  </div>
                  <div>
                    <Label>Secret Access Key</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 bg-[var(--color-success-light)] rounded-lg">
                  <div className="flex items-center">
                    <Wifi className="h-5 w-5 text-[var(--color-success)] mr-3" />
                    <div>
                      <p className="font-medium">{t('backup.connectionEstablished')}</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">AWS S3 - eu-west-1</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestCloudConnection}
                  >
                    {t('backup.testConnection')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== RESET TAB ====== */}
        <TabsContent value="reset" className="space-y-6">
          {/* Warning banner */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">{t('backup.resetZoneTitle')}</p>
              <p className="text-sm text-red-700 mt-1">
                {t('backup.resetZoneDescA')}<strong>{t('backup.resetZoneIrreversible')}</strong>{t('backup.resetZoneDescB')}
              </p>
            </div>
          </div>

          {/* Success message */}
          {resetDone && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{t('backup.resetDoneMsg')}</span>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>
                {t('backup.reload')}
              </Button>
            </div>
          )}

          {/* Reset groups grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {RESET_GROUPS.filter(g => g.key !== 'all').map((group) => (
              <Card key={group.key} className={`border-2 ${group.color.includes('border') ? '' : ''}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{group.icon}</span>
                        <p className="font-semibold text-[var(--color-text-primary)]">{group.label}</p>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)]">{group.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-600 hover:bg-red-50 flex-shrink-0"
                      onClick={() => setShowResetConfirm(group.key)}
                      disabled={resetInProgress}
                    >
                      <Database className="mr-1 h-4 w-4" />
                      {t('backup.clear')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Full reset */}
          <Card className="border-2 border-red-400">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-red-800 text-base flex items-center gap-2">
                    🗑️ {t('backup.fullResetTitle')}
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    {t('backup.fullResetDesc')}
                    <br /><strong>{t('backup.appResetsToZero')}</strong>
                  </p>
                </div>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                  onClick={() => setShowResetConfirm('all')}
                  disabled={resetInProgress}
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {t('backup.eraseAll')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Confirmation Réinitialisation */}
      <Dialog open={!!showResetConfirm} onOpenChange={() => setShowResetConfirm(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              {showResetConfirm === 'all'
                ? t('backup.fullResetTitle')
                : t('backup.clearGroup', { label: RESET_GROUPS.find(g => g.key === showResetConfirm)?.label ?? '' })}
            </DialogTitle>
            <DialogDescription>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">⚠️ {t('backup.irreversibleAction')}</p>
                <p className="text-sm text-red-700 mt-1">
                  {showResetConfirm === 'all'
                    ? t('backup.allLocalDataErased')
                    : t('backup.groupDataErased', { label: RESET_GROUPS.find(g => g.key === showResetConfirm)?.label ?? '' })}
                </p>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mt-3">
                {t('backup.typeConfirmA')}<strong>CONFIRMER</strong>{t('backup.typeConfirmB')}
              </p>
              <Input
                id="reset-confirm-input"
                placeholder="CONFIRMER"
                className="mt-2"
                autoFocus
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(null)} disabled={resetInProgress}>
              {t('backup.cancel')}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={resetInProgress}
              onClick={() => {
                const input = document.getElementById('reset-confirm-input') as HTMLInputElement;
                if (input?.value !== 'CONFIRMER') {
                  toast.error(t('backup.toastTypeConfirm'));
                  return;
                }
                handleReset(showResetConfirm!);
              }}
            >
              {resetInProgress ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{t('backup.inProgress')}</>
              ) : (
                <><AlertTriangle className="mr-2 h-4 w-4" />{t('backup.confirmDeletion')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nouvelle Planification */}
      <Dialog open={showNewScheduleModal} onOpenChange={setShowNewScheduleModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('backup.newScheduleTitle')}</DialogTitle>
            <DialogDescription>
              {t('backup.newScheduleDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{t('backup.scheduleName')}</Label>
              <Input placeholder={t('backup.scheduleNamePlaceholder')} className="mt-2" />
            </div>

            <div>
              <Label>{t('backup.frequency')}</Label>
              <Select defaultValue="daily">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('backup.optionDaily')}</SelectItem>
                  <SelectItem value="weekly">{t('backup.optionWeekly')}</SelectItem>
                  <SelectItem value="monthly">{t('backup.optionMonthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('backup.executionTime')}</Label>
              <Input type="time" defaultValue="22:00" className="mt-2" />
            </div>

            <div>
              <Label>{t('backup.retentionDays')}</Label>
              <Input type="number" defaultValue="30" className="mt-2" />
            </div>

            <div>
              <Label>{t('backup.modulesToBackup')}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <label className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">{t('accounting.title')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">CRM</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">{t('backup.moduleStock')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">{t('backup.moduleHr')}</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewScheduleModal(false)}>
              {t('backup.cancel')}
            </Button>
            <Button onClick={() => {
              toast.success(t('backup.toastScheduleCreated'));
              setShowNewScheduleModal(false);
            }}>
              {t('backup.createSchedule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Configuration Planification */}
      <Dialog open={!!showScheduleConfigModal} onOpenChange={() => setShowScheduleConfigModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('backup.scheduleConfigTitle')}</DialogTitle>
            <DialogDescription>
              {showScheduleConfigModal?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{t('backup.name')}</Label>
              <Input defaultValue={showScheduleConfigModal?.name} className="mt-2" />
            </div>

            <div>
              <Label>{t('backup.frequency')}</Label>
              <Select defaultValue={showScheduleConfigModal?.frequency}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t('backup.optionDaily')}</SelectItem>
                  <SelectItem value="weekly">{t('backup.optionWeekly')}</SelectItem>
                  <SelectItem value="monthly">{t('backup.optionMonthly')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('backup.executionTime')}</Label>
              <Input type="time" defaultValue={showScheduleConfigModal?.time} className="mt-2" />
            </div>

            <div>
              <Label>{t('backup.retentionDays')}</Label>
              <Input type="number" defaultValue={showScheduleConfigModal?.retention} className="mt-2" />
            </div>

            <div className="flex items-center space-x-2">
              <Switch checked={showScheduleConfigModal?.active} />
              <Label>{t('backup.scheduleActive')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleConfigModal(null)}>
              {t('backup.cancel')}
            </Button>
            <Button onClick={() => {
              toast.success(t('backup.toastConfigSaved'));
              setShowScheduleConfigModal(null);
            }}>
              {t('backup.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Restauration */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('backup.confirmRestore')}</DialogTitle>
            <DialogDescription>
              <div className="flex items-start space-x-2 mt-2 p-3 bg-[var(--color-warning-light)] rounded-lg">
                <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--color-warning)]">{t('backup.warning')}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {t('backup.restoreModalWarning')}
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{t('backup.selectedBackup')}</Label>
              <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                <p className="font-medium">
                  {backups.find(b => b.id === selectedBackup)?.name || t('backup.mockBackupFullFeb')}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {backups.find(b => b.id === selectedBackup)?.date.toLocaleString() || '10/02/2024 22:00'}
                </p>
              </div>
            </div>

            <div>
              <Label>{t('backup.restoreType')}</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="restore-type-modal" defaultChecked />
                  <span className="text-sm">{t('backup.fullRestoreAll')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="restore-type-modal" />
                  <span className="text-sm">{t('backup.selectiveRestoreModules')}</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="flex items-center space-x-2">
                <Checkbox defaultChecked />
                <span>{t('backup.createSafetyBackup')}</span>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
              {t('backup.cancel')}
            </Button>
            <Button
              className="bg-[var(--color-warning)] hover:bg-[var(--color-warning)]"
              onClick={() => {
                toast.loading(t('backup.toastRestoreStarting'), { duration: 1500 });
                setTimeout(() => {
                  toast.success(t('backup.toastRestoreLaunched'));
                  setShowRestoreModal(false);
                }, 1500);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('backup.startRestore')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Sélection Dossier */}
      <Dialog open={showFolderPicker} onOpenChange={setShowFolderPicker}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('backup.selectLocation')}</DialogTitle>
            <DialogDescription>
              {t('backup.selectLocationDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{t('backup.folderPath')}</Label>
              <Input defaultValue="/var/backups/atlasfna" className="mt-2" />
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-sm">/var/backups/</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer ml-4">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-sm">atlasfna/</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-sm">/home/backups/</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-sm">/mnt/storage/</span>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {t('backup.diskSpaceNotice')}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderPicker(false)}>
              {t('backup.cancel')}
            </Button>
            <Button onClick={() => {
              toast.success(t('backup.toastLocationUpdated'));
              setShowFolderPicker(false);
            }}>
              {t('backup.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Générateur de Clé */}
      <Dialog open={showKeyGenerator} onOpenChange={setShowKeyGenerator}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('backup.keyGenTitle')}</DialogTitle>
            <DialogDescription>
              {t('backup.keyGenDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>{t('backup.encryptionType')}</Label>
              <Select defaultValue="aes256">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aes128">AES-128 (128 bits)</SelectItem>
                  <SelectItem value="aes256">{t('backup.aes256Recommended')}</SelectItem>
                  <SelectItem value="rsa">RSA-4096</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('backup.generatedKey')}</Label>
              <div className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-xs break-all">
                {'••••••••••••••••••••••••••••••••••••••••'}
              </div>
            </div>

            <Alert className="bg-[var(--color-warning-light)] border-[var(--color-warning)]">
              <Lock className="h-4 w-4 text-[var(--color-warning)]" />
              <AlertDescription>
                <strong>{t('backup.importantLabel')}</strong> {t('backup.keyGenWarning')}
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox />
              <Label className="text-sm">{t('backup.keySavedConfirm')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyGenerator(false)}>
              {t('backup.cancel')}
            </Button>
            <Button onClick={() => {
              toast.success(t('backup.toastKeyConfigured'));
              setShowKeyGenerator(false);
            }}>
              <Key className="mr-2 h-4 w-4" />
              {t('backup.useThisKey')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Test Connexion Cloud */}
      <Dialog open={showCloudTestModal} onOpenChange={setShowCloudTestModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{t('backup.cloudTestTitle')}</DialogTitle>
            <DialogDescription>
              {t('backup.cloudTestDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {cloudConnectionStatus === 'testing' && (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="h-12 w-12 text-[var(--color-info)] animate-spin mb-4" />
                <p className="text-lg font-medium">{t('backup.testing')}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('backup.connectingToAws')}</p>
              </div>
            )}

            {cloudConnectionStatus === 'success' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-[var(--color-success-light)] p-4 mb-4">
                  <CheckCircle className="h-12 w-12 text-[var(--color-success)]" />
                </div>
                <p className="text-lg font-medium text-[var(--color-success)]">{t('backup.connectionSuccess')}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">AWS S3 - eu-west-1</p>

                <div className="w-full mt-6 space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.latency')}</span>
                    <span className="font-medium">45 ms</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.availableSpace')}</span>
                    <span className="font-medium">93.3 GB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">{t('backup.permissions')}</span>
                    <Badge className="bg-[var(--color-success-light)] text-[var(--color-success)]">
                      {t('backup.readWrite')}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {cloudConnectionStatus === 'error' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-[var(--color-error-light)] p-4 mb-4">
                  <XCircle className="h-12 w-12 text-[var(--color-error)]" />
                </div>
                <p className="text-lg font-medium text-[var(--color-error)]">{t('backup.connectionFailed')}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{t('backup.checkCredentials')}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {cloudConnectionStatus === 'success' ? (
              <Button onClick={() => {
                setShowCloudTestModal(false);
                setCloudConnectionStatus(null);
              }}>
                {t('backup.close')}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setShowCloudTestModal(false);
                setCloudConnectionStatus(null);
              }}>
                {t('backup.close')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupPage;