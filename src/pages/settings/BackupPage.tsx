import React, { useState } from 'react';
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
  const [activeTab, setActiveTab] = useState('overview');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

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
    toast.success(`Restauration de la sauvegarde ${backupId} lancée`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-gray-200 pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <HardDrive className="mr-3 h-7 w-7 text-blue-600" />
              Sauvegardes & Restauration
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gérez vos sauvegardes automatiques et manuelles
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <History className="mr-2 h-4 w-4" />
              Historique
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dernière sauvegarde</p>
                <p className="text-lg font-bold">Il y a 2 heures</p>
                <p className="text-xs text-gray-500">10/02/2024 22:00</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Espace utilisé</p>
                <p className="text-lg font-bold">15.2 GB</p>
                <p className="text-xs text-gray-500">Sur 100 GB</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sauvegardes</p>
                <p className="text-lg font-bold">24 actives</p>
                <p className="text-xs text-gray-500">3 planifiées</p>
              </div>
              <Archive className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prochaine</p>
                <p className="text-lg font-bold">Dans 20h</p>
                <p className="text-xs text-gray-500">11/02 22:00</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
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
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
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
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium">Protection active</p>
                      <p className="text-sm text-gray-600">Toutes les données sont sauvegardées</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Optimal</Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Sauvegarde automatique</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Chiffrement AES-256</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Réplication cloud</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vérification intégrité</span>
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
                    <span className="text-sm text-gray-600">Local</span>
                    <span className="text-sm font-medium">8.5 GB / 50 GB</span>
                  </div>
                  <Progress value={17} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Cloud (AWS S3)</span>
                    <span className="text-sm font-medium">6.7 GB / 100 GB</span>
                  </div>
                  <Progress value={6.7} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Archives</span>
                    <span className="text-sm font-medium">12.3 GB</span>
                  </div>
                  <Progress value={100} className="h-2 bg-gray-200" />
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
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
                  <div key={backup.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${
                        backup.location === 'cloud' ? 'bg-blue-100' :
                        backup.location === 'local' ? 'bg-gray-100' : 'bg-green-100'
                      }`}>
                        {backup.location === 'cloud' ? (
                          <Cloud className="h-5 w-5 text-blue-600" />
                        ) : backup.location === 'local' ? (
                          <HardDrive className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Server className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{backup.name}</p>
                        <p className="text-sm text-gray-600">
                          {backup.size} • {backup.date.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {backup.encrypted && (
                        <Lock className="h-4 w-4 text-gray-400" />
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
                      selectedBackup === backup.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedBackup(backup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          backup.type === 'automatic' ? 'bg-blue-100' :
                          backup.type === 'scheduled' ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {backup.type === 'automatic' ? (
                            <Zap className="h-6 w-6 text-blue-600" />
                          ) : backup.type === 'scheduled' ? (
                            <Calendar className="h-6 w-6 text-purple-600" />
                          ) : (
                            <Upload className="h-6 w-6 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{backup.name}</h4>
                          <p className="text-sm text-gray-600">
                            {backup.modules.join(', ')}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {backup.date.toLocaleString()} • {backup.size}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          {backup.location === 'both' || backup.location === 'local' ? (
                            <HardDrive className="h-4 w-4 text-gray-400" />
                          ) : null}
                          {backup.location === 'both' || backup.location === 'cloud' ? (
                            <Cloud className="h-4 w-4 text-blue-400" />
                          ) : null}
                          {backup.encrypted && (
                            <Lock className="h-4 w-4 text-green-400" />
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
                <Button>
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
                          schedule.active ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Calendar className={`h-5 w-5 ${
                            schedule.active ? 'text-green-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium flex items-center">
                            {schedule.name}
                            {schedule.active && (
                              <Badge className="ml-2 bg-green-100 text-green-800">Actif</Badge>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {schedule.frequency === 'daily' ? 'Quotidien' :
                             schedule.frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel'} à {schedule.time}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Prochaine: {schedule.nextRun.toLocaleString()}
                            {schedule.lastRun && ` • Dernière: ${schedule.lastRun.toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Rétention</p>
                          <p className="text-sm font-medium">{schedule.retention} jours</p>
                        </div>
                        <Switch
                          checked={schedule.active}
                          onCheckedChange={() => toast.success(`Planification ${schedule.active ? 'désactivée' : 'activée'}`)}
                        />
                        <Button variant="ghost" size="sm">
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
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
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
                    <span className="text-sm">Comptabilité</span>
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

              <Button className="w-full bg-orange-600 hover:bg-orange-700">
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
                    <Input defaultValue="/var/backups/wisebook" readOnly />
                    <Button variant="outline">
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
                    <Button variant="outline">
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

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <Wifi className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium">Connexion établie</p>
                      <p className="text-sm text-gray-600">AWS S3 - eu-west-1</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Tester la connexion
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BackupPage;