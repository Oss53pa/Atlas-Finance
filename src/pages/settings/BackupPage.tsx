import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  Filter
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
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

  // Mock backups data
  const backups: Backup[] = [
    {
      id: '1',
      name: 'Sauvegarde complète - Février 2024',
      type: 'automatic',
      size: '2.5 GB',
      date: new Date('2024-02-10T03:00:00'),
      status: 'completed',
      location: 'both',
      encrypted: true,
      modules: ['Comptabilité', 'CRM', 'Stock', 'RH']
    },
    {
      id: '2',
      name: 'Sauvegarde journalière',
      type: 'scheduled',
      size: '450 MB',
      date: new Date('2024-02-10T22:00:00'),
      status: 'in_progress',
      location: 'cloud',
      encrypted: true,
      modules: ['Comptabilité', 'Trésorerie']
    },
    {
      id: '3',
      name: 'Export manuel - Audit',
      type: 'manual',
      size: '1.2 GB',
      date: new Date('2024-02-09T14:30:00'),
      status: 'completed',
      location: 'local',
      encrypted: false,
      modules: ['Toutes les données']
    }
  ];

  // Mock schedules
  const schedules: BackupSchedule[] = [
    {
      id: '1',
      name: 'Sauvegarde quotidienne',
      frequency: 'daily',
      time: '22:00',
      nextRun: new Date('2024-02-11T22:00:00'),
      lastRun: new Date('2024-02-10T22:00:00'),
      active: true,
      retention: 30
    },
    {
      id: '2',
      name: 'Archive mensuelle',
      frequency: 'monthly',
      time: '03:00',
      nextRun: new Date('2024-03-01T03:00:00'),
      lastRun: new Date('2024-02-01T03:00:00'),
      active: true,
      retention: 365
    },
    {
      id: '3',
      name: 'Sauvegarde hebdomadaire',
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
      toast.success('Sauvegarde lancée avec succès');
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
              Sauvegardes & Restauration
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Gérez vos sauvegardes automatiques et manuelles
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              Historique
            </Button>
            <Button
              className="bg-[var(--color-info)] hover:bg-[var(--color-info)]"
              onClick={handleBackup}
              disabled={isBackingUp}
            >
              {isBackingUp ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde en cours...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Nouvelle sauvegarde
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
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Dernière sauvegarde</p>
                <p className="text-lg font-bold">Il y a 2 heures</p>
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
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Espace utilisé</p>
                <p className="text-lg font-bold">15.2 GB</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Sur 100 GB</p>
              </div>
              <Database className="h-8 w-8 text-[var(--color-info)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Sauvegardes</p>
                <p className="text-lg font-bold">24 actives</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">3 planifiées</p>
              </div>
              <Archive className="h-8 w-8 text-[var(--color-accent)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Prochaine</p>
                <p className="text-lg font-bold">Dans 20h</p>
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
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="backups">Sauvegardes</TabsTrigger>
          <TabsTrigger value="schedule">Planification</TabsTrigger>
          <TabsTrigger value="restore">Restauration</TabsTrigger>
          <TabsTrigger value="settings">{t('navigation.settings')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status général */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  État de Protection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-[var(--color-success-light)] rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-[var(--color-success)] mr-3" />
                    <div>
                      <p className="font-medium">Protection active</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">Toutes les données sont sauvegardées</p>
                    </div>
                  </div>
                  <Badge className="bg-[var(--color-success-light)] text-[var(--color-success)]">Optimal</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Sauvegarde automatique</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Chiffrement AES-256</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Réplication cloud</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--color-text-secondary)]">Vérification intégrité</span>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stockage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="mr-2 h-5 w-5" />
                  Stockage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">Local</span>
                    <span className="text-sm font-medium">8.5 GB / 50 GB</span>
                  </div>
                  <Progress value={17} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">Cloud (AWS S3)</span>
                    <span className="text-sm font-medium">6.7 GB / 100 GB</span>
                  </div>
                  <Progress value={6.7} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-[var(--color-text-secondary)]">Archives</span>
                    <span className="text-sm font-medium">12.3 GB</span>
                  </div>
                  <Progress value={100} className="h-2 bg-[var(--color-surface-hover)]" />
                </div>

                <Alert className="bg-[var(--color-info-light)] border-[var(--color-info)]">
                  <Info className="h-4 w-4 text-[var(--color-info)]" />
                  <AlertDescription>
                    Politique de rétention : 30 jours pour les sauvegardes quotidiennes
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Dernières sauvegardes */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières sauvegardes</CardTitle>
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
                        {backup.status === 'completed' ? 'Terminé' :
                         backup.status === 'in_progress' ? 'En cours' : 'Échoué'}
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
                <CardTitle>Liste des sauvegardes</CardTitle>
                <div className="flex space-x-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="completed">Terminées</SelectItem>
                      <SelectItem value="failed">Échouées</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrer
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
                          {backup.status === 'completed' ? 'Terminé' :
                           backup.status === 'in_progress' ? (
                             <>
                               <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                               En cours
                             </>
                           ) : 'Échoué'}
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
                <CardTitle>Planifications de sauvegarde</CardTitle>
                <Button onClick={() => setShowNewScheduleModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle planification
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
                              <Badge className="ml-2 bg-[var(--color-success-light)] text-[var(--color-success)]">Actif</Badge>
                            )}
                          </h4>
                          <p className="text-sm text-[var(--color-text-secondary)]">
                            {schedule.frequency === 'daily' ? 'Quotidien' :
                             schedule.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'} à {schedule.time}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                            Prochaine: {schedule.nextRun.toLocaleString()}
                            {schedule.lastRun && ` • Dernière: ${schedule.lastRun.toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs text-[var(--color-text-tertiary)]">Rétention</p>
                          <p className="text-sm font-medium">{schedule.retention} jours</p>
                        </div>
                        <Switch
                          checked={schedule.active}
                          onCheckedChange={() => toast.success(`Planification ${schedule.active ? 'désactivée' : 'activée'}`)}
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
              <strong>Attention :</strong> La restauration remplacera les données actuelles.
              Une sauvegarde automatique sera créée avant la restauration.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Options de restauration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Sélectionner une sauvegarde</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une sauvegarde" />
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
                <Label>Type de restauration</Label>
                <div className="space-y-2 mt-2">
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="restore-type" defaultChecked />
                    <span>Restauration complète</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="radio" name="restore-type" />
                    <span>Restauration sélective</span>
                  </label>
                </div>
              </div>

              <div>
                <Label>Modules à restaurer</Label>
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
                    <span className="text-sm">Stock</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <span className="text-sm">RH</span>
                  </label>
                </div>
              </div>

              <Button
                className="w-full bg-[var(--color-warning)] hover:bg-[var(--color-warning)]"
                onClick={() => setShowRestoreModal(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Lancer la restauration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Paramètres généraux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Emplacement des sauvegardes locales</Label>
                  <div className="flex space-x-2 mt-2">
                    <Input defaultValue="/var/backups/atlasfinance" readOnly />
                    <Button
                      variant="outline"
                      onClick={() => setShowFolderPicker(true)}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Compression</Label>
                  <Select defaultValue="gzip">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="gzip">GZIP</SelectItem>
                      <SelectItem value="zip">ZIP</SelectItem>
                      <SelectItem value="7z">7-Zip</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <Label>Vérifier l'intégrité après sauvegarde</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch defaultChecked />
                    <Label>Notification email en cas d'échec</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch />
                    <Label>Mode incrémental</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sécurité</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Chiffrement</Label>
                  <Select defaultValue="aes256">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      <SelectItem value="aes128">AES-128</SelectItem>
                      <SelectItem value="aes256">AES-256</SelectItem>
                      <SelectItem value="rsa">RSA-4096</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Clé de chiffrement</Label>
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
                    Les sauvegardes sont chiffrées avec AES-256.
                    Conservez votre clé en lieu sûr.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Configuration Cloud</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Fournisseur</Label>
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
                    <Label>Région</Label>
                    <Select defaultValue="eu-west-1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eu-west-1">Europe (Irlande)</SelectItem>
                        <SelectItem value="eu-central-1">Europe (Francfort)</SelectItem>
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
                      <p className="font-medium">Connexion établie</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">AWS S3 - eu-west-1</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestCloudConnection}
                  >
                    Tester la connexion
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Nouvelle Planification */}
      <Dialog open={showNewScheduleModal} onOpenChange={setShowNewScheduleModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Nouvelle planification de sauvegarde</DialogTitle>
            <DialogDescription>
              Configurez une nouvelle planification automatique de sauvegarde
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nom de la planification</Label>
              <Input placeholder="Ex: Sauvegarde quotidienne" className="mt-2" />
            </div>

            <div>
              <Label>Fréquence</Label>
              <Select defaultValue="daily">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Heure d'exécution</Label>
              <Input type="time" defaultValue="22:00" className="mt-2" />
            </div>

            <div>
              <Label>Rétention (jours)</Label>
              <Input type="number" defaultValue="30" className="mt-2" />
            </div>

            <div>
              <Label>Modules à sauvegarder</Label>
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
                  <span className="text-sm">Stock</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox defaultChecked />
                  <span className="text-sm">RH</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewScheduleModal(false)}>
              Annuler
            </Button>
            <Button onClick={() => {
              toast.success('Planification créée avec succès !');
              setShowNewScheduleModal(false);
            }}>
              Créer la planification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Configuration Planification */}
      <Dialog open={!!showScheduleConfigModal} onOpenChange={() => setShowScheduleConfigModal(null)}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Configuration de la planification</DialogTitle>
            <DialogDescription>
              {showScheduleConfigModal?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nom</Label>
              <Input defaultValue={showScheduleConfigModal?.name} className="mt-2" />
            </div>

            <div>
              <Label>Fréquence</Label>
              <Select defaultValue={showScheduleConfigModal?.frequency}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Quotidienne</SelectItem>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="monthly">Mensuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Heure d'exécution</Label>
              <Input type="time" defaultValue={showScheduleConfigModal?.time} className="mt-2" />
            </div>

            <div>
              <Label>Rétention (jours)</Label>
              <Input type="number" defaultValue={showScheduleConfigModal?.retention} className="mt-2" />
            </div>

            <div className="flex items-center space-x-2">
              <Switch defaultChecked={showScheduleConfigModal?.active} />
              <Label>Planification active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleConfigModal(null)}>
              Annuler
            </Button>
            <Button onClick={() => {
              toast.success('Configuration enregistrée !');
              setShowScheduleConfigModal(null);
            }}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Restauration */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Confirmer la restauration</DialogTitle>
            <DialogDescription>
              <div className="flex items-start space-x-2 mt-2 p-3 bg-[var(--color-warning-light)] rounded-lg">
                <AlertTriangle className="h-5 w-5 text-[var(--color-warning)] mt-0.5" />
                <div>
                  <p className="font-medium text-[var(--color-warning)]">Attention</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Cette action remplacera toutes les données actuelles.
                    Une sauvegarde automatique sera créée avant la restauration.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Sauvegarde sélectionnée</Label>
              <div className="mt-2 p-3 border rounded-lg bg-gray-50">
                <p className="font-medium">
                  {backups.find(b => b.id === selectedBackup)?.name || 'Sauvegarde complète - Février 2024'}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {backups.find(b => b.id === selectedBackup)?.date.toLocaleString() || '10/02/2024 22:00'}
                </p>
              </div>
            </div>

            <div>
              <Label>Type de restauration</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center space-x-2">
                  <input type="radio" name="restore-type-modal" defaultChecked />
                  <span className="text-sm">Restauration complète (toutes les données)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="radio" name="restore-type-modal" />
                  <span className="text-sm">Restauration sélective (modules spécifiques)</span>
                </label>
              </div>
            </div>

            <div>
              <Label className="flex items-center space-x-2">
                <Checkbox defaultChecked />
                <span>Créer une sauvegarde de sécurité avant restauration</span>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[var(--color-warning)] hover:bg-[var(--color-warning)]"
              onClick={() => {
                toast.loading('Démarrage de la restauration...', { duration: 1500 });
                setTimeout(() => {
                  toast.success('Restauration lancée avec succès !');
                  setShowRestoreModal(false);
                }, 1500);
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              Lancer la restauration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Sélection Dossier */}
      <Dialog open={showFolderPicker} onOpenChange={setShowFolderPicker}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Sélectionner l'emplacement de sauvegarde</DialogTitle>
            <DialogDescription>
              Choisissez le dossier où les sauvegardes seront stockées
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Chemin du dossier</Label>
              <Input defaultValue="/var/backups/atlasfinance" className="mt-2" />
            </div>

            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-sm">/var/backups/</span>
                </div>
                <div className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer ml-4">
                  <FolderOpen className="h-4 w-4" />
                  <span className="text-sm">atlasfinance/</span>
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
                Assurez-vous que le dossier dispose de suffisamment d'espace disque
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderPicker(false)}>
              Annuler
            </Button>
            <Button onClick={() => {
              toast.success('Emplacement de sauvegarde mis à jour !');
              setShowFolderPicker(false);
            }}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Générateur de Clé */}
      <Dialog open={showKeyGenerator} onOpenChange={setShowKeyGenerator}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Générateur de clé de chiffrement</DialogTitle>
            <DialogDescription>
              Générez une nouvelle clé de chiffrement sécurisée
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Type de chiffrement</Label>
              <Select defaultValue="aes256">
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aes128">AES-128 (128 bits)</SelectItem>
                  <SelectItem value="aes256">AES-256 (256 bits) - Recommandé</SelectItem>
                  <SelectItem value="rsa">RSA-4096</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Clé générée</Label>
              <div className="mt-2 p-3 bg-gray-900 text-green-400 rounded-lg font-mono text-xs break-all">
                {Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}
              </div>
            </div>

            <Alert className="bg-[var(--color-warning-light)] border-[var(--color-warning)]">
              <Lock className="h-4 w-4 text-[var(--color-warning)]" />
              <AlertDescription>
                <strong>Important :</strong> Conservez cette clé en lieu sûr. Sans elle, vous ne pourrez pas restaurer vos sauvegardes chiffrées.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox />
              <Label className="text-sm">J'ai sauvegardé ma clé de chiffrement en lieu sûr</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowKeyGenerator(false)}>
              Annuler
            </Button>
            <Button onClick={() => {
              toast.success('Clé de chiffrement configurée !');
              setShowKeyGenerator(false);
            }}>
              <Key className="mr-2 h-4 w-4" />
              Utiliser cette clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Test Connexion Cloud */}
      <Dialog open={showCloudTestModal} onOpenChange={setShowCloudTestModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Test de connexion cloud</DialogTitle>
            <DialogDescription>
              Vérification de la connexion avec votre fournisseur cloud
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {cloudConnectionStatus === 'testing' && (
              <div className="flex flex-col items-center justify-center py-8">
                <RefreshCw className="h-12 w-12 text-[var(--color-info)] animate-spin mb-4" />
                <p className="text-lg font-medium">Test en cours...</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Connexion à AWS S3</p>
              </div>
            )}

            {cloudConnectionStatus === 'success' && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="rounded-full bg-[var(--color-success-light)] p-4 mb-4">
                  <CheckCircle className="h-12 w-12 text-[var(--color-success)]" />
                </div>
                <p className="text-lg font-medium text-[var(--color-success)]">Connexion réussie !</p>
                <p className="text-sm text-[var(--color-text-secondary)]">AWS S3 - eu-west-1</p>

                <div className="w-full mt-6 space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">Latence</span>
                    <span className="font-medium">45 ms</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">Espace disponible</span>
                    <span className="font-medium">93.3 GB</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="text-sm text-[var(--color-text-secondary)]">Permissions</span>
                    <Badge className="bg-[var(--color-success-light)] text-[var(--color-success)]">
                      Lecture/Écriture
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
                <p className="text-lg font-medium text-[var(--color-error)]">Échec de la connexion</p>
                <p className="text-sm text-[var(--color-text-secondary)]">Vérifiez vos identifiants</p>
              </div>
            )}
          </div>

          <DialogFooter>
            {cloudConnectionStatus === 'success' ? (
              <Button onClick={() => {
                setShowCloudTestModal(false);
                setCloudConnectionStatus(null);
              }}>
                Fermer
              </Button>
            ) : (
              <Button variant="outline" onClick={() => {
                setShowCloudTestModal(false);
                setCloudConnectionStatus(null);
              }}>
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupPage;