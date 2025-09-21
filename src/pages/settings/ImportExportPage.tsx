import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileUp,
  FileDown,
  FileSpreadsheet,
  FileText,
  Database,
  ArrowUpDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Settings,
  Filter,
  Calendar,
  Calculator,
  Package,
  Users,
  DollarSign,
  Building,
  FileCode,
  ChevronRight,
  X,
  Check
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Switch,
  Label,
  Input,
  Alert,
  AlertDescription,
  Checkbox
} from '../../components/ui';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface ImportJob {
  id: string;
  type: string;
  fileName: string;
  size: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  recordsTotal: number;
  recordsProcessed: number;
  startTime: Date;
  endTime?: Date;
  errors?: string[];
}

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: 'excel' | 'csv' | 'json' | 'xml' | 'pdf';
  module: string;
  fields: string[];
  lastUsed?: Date;
  schedule?: string;
}

const ImportExportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [selectedModule, setSelectedModule] = useState('all');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Mock data for import jobs
  const [importJobs] = useState<ImportJob[]>([
    {
      id: '1',
      type: 'Plan Comptable',
      fileName: 'plan_comptable_syscohada.xlsx',
      size: '245 KB',
      status: 'completed',
      progress: 100,
      recordsTotal: 850,
      recordsProcessed: 850,
      startTime: new Date('2024-02-10T10:00:00'),
      endTime: new Date('2024-02-10T10:02:15')
    },
    {
      id: '2',
      type: 'Clients',
      fileName: 'clients_janvier_2024.csv',
      size: '1.2 MB',
      status: 'processing',
      progress: 65,
      recordsTotal: 3500,
      recordsProcessed: 2275,
      startTime: new Date('2024-02-10T14:30:00')
    },
    {
      id: '3',
      type: 'Écritures Comptables',
      fileName: 'ecritures_q4_2023.xlsx',
      size: '5.8 MB',
      status: 'failed',
      progress: 45,
      recordsTotal: 15000,
      recordsProcessed: 6750,
      startTime: new Date('2024-02-10T09:00:00'),
      endTime: new Date('2024-02-10T09:15:00'),
      errors: ['Format de date invalide ligne 6751', 'Compte inexistant ligne 6752']
    }
  ]);

  // Mock export templates
  const exportTemplates: ExportTemplate[] = [
    {
      id: '1',
      name: 'Balance Générale',
      description: 'Export complet de la balance avec soldes',
      format: 'excel',
      module: 'Comptabilité',
      fields: ['Compte', 'Libellé', 'Débit', 'Crédit', 'Solde'],
      lastUsed: new Date('2024-02-09'),
      schedule: 'Mensuel'
    },
    {
      id: '2',
      name: 'Liste Clients',
      description: 'Export des clients avec informations complètes',
      format: 'csv',
      module: 'CRM',
      fields: ['Code', 'Nom', 'Email', 'Téléphone', 'Solde'],
      lastUsed: new Date('2024-02-08')
    },
    {
      id: '3',
      name: 'FEC (Fichier des Écritures Comptables)',
      description: 'Export légal pour l\'administration fiscale',
      format: 'xml',
      module: 'Comptabilité',
      fields: ['JournalCode', 'EcritureNum', 'PieceRef', 'CompteNum', 'Debit', 'Credit'],
      schedule: 'Annuel'
    },
    {
      id: '4',
      name: 'Inventaire Stock',
      description: 'État du stock avec valorisation',
      format: 'excel',
      module: 'Stock',
      fields: ['Article', 'Référence', 'Quantité', 'PrixUnitaire', 'Valeur'],
      lastUsed: new Date('2024-02-07')
    }
  ];

  // Modules disponibles
  const modules = [
    { id: 'accounting', name: 'Comptabilité', icon: Calculator, color: 'blue' },
    { id: 'crm', name: 'CRM', icon: Users, color: 'purple' },
    { id: 'stock', name: 'Stock', icon: Package, color: 'green' },
    { id: 'hr', name: 'RH', icon: Users, color: 'orange' },
    { id: 'assets', name: 'Immobilisations', icon: Building, color: 'indigo' },
    { id: 'treasury', name: 'Trésorerie', icon: DollarSign, color: 'emerald' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => {
      toast.success('Import lancé avec succès');
      setIsImporting(false);
      setSelectedFiles([]);
    }, 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
      case 'xml':
        return <FileCode className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
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
              <ArrowUpDown className="mr-3 h-7 w-7 text-blue-600" />
              Import / Export de Données
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Importez et exportez vos données dans différents formats
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Paramètres
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Calendar className="mr-2 h-4 w-4" />
              Planifier
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="templates">Modèles</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Zone de téléchargement */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Zone d'Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                  <FileUp className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Glissez vos fichiers ici ou
                  </p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      accept=".csv,.xlsx,.xls,.json,.xml"
                    />
                    <Button variant="outline" className="mb-2">
                      Parcourir les fichiers
                    </Button>
                  </label>
                  <p className="text-xs text-gray-500">
                    Formats supportés: CSV, Excel, JSON, XML
                  </p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Fichiers sélectionnés:</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuration Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Configuration d'Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Type de données</Label>
                  <Select defaultValue="auto">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Détection automatique</SelectItem>
                      <SelectItem value="accounts">Plan comptable</SelectItem>
                      <SelectItem value="entries">Écritures comptables</SelectItem>
                      <SelectItem value="customers">Clients</SelectItem>
                      <SelectItem value="suppliers">Fournisseurs</SelectItem>
                      <SelectItem value="products">Articles/Produits</SelectItem>
                      <SelectItem value="employees">Employés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Format de date</Label>
                  <Select defaultValue="dd/mm/yyyy">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">JJ/MM/AAAA</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/JJ/AAAA</SelectItem>
                      <SelectItem value="yyyy-mm-dd">AAAA-MM-JJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Séparateur décimal</Label>
                  <Select defaultValue="comma">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comma">Virgule (,)</SelectItem>
                      <SelectItem value="dot">Point (.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label>Ignorer les doublons</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox defaultChecked />
                    <Label>Valider les données avant import</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox />
                    <Label>Mode test (simuler l'import)</Label>
                  </div>
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={handleImport}
                  disabled={selectedFiles.length === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Import en cours...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Lancer l'import
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Jobs d'import en cours */}
          <Card>
            <CardHeader>
              <CardTitle>Imports en cours et récents</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Progression</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Enregistrements</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.type}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{job.fileName}</p>
                          <p className="text-xs text-gray-500">{job.size}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Progress value={job.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">{job.progress}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status === 'completed' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {job.status === 'processing' && <RefreshCw className="mr-1 h-3 w-3 animate-spin" />}
                          {job.status === 'failed' && <AlertCircle className="mr-1 h-3 w-3" />}
                          {job.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.recordsProcessed} / {job.recordsTotal}
                      </TableCell>
                      <TableCell>
                        {job.endTime ? (
                          <span className="text-sm">
                            {Math.round((job.endTime.getTime() - job.startTime.getTime()) / 1000)}s
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">En cours...</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          {job.status === 'processing' && (
                            <Button variant="ghost" size="sm">
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === 'failed' && (
                            <Button variant="ghost" size="sm">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Sélection du module */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Modules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                      <button
                        key={module.id}
                        className={`w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors ${
                          selectedModule === module.id ? 'bg-blue-50 border-blue-200 border' : ''
                        }`}
                        onClick={() => setSelectedModule(module.id)}
                      >
                        <div className="flex items-center">
                          <Icon className={`h-5 w-5 text-${module.color}-600 mr-3`} />
                          <span className="font-medium">{module.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Export */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Configuration d'Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Format d'export</Label>
                    <Select defaultValue="excel">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                        <SelectItem value="csv">CSV (.csv)</SelectItem>
                        <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                        <SelectItem value="json">JSON (.json)</SelectItem>
                        <SelectItem value="xml">XML (.xml)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Période</Label>
                    <Select defaultValue="current-month">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les données</SelectItem>
                        <SelectItem value="current-month">Mois en cours</SelectItem>
                        <SelectItem value="last-month">Mois dernier</SelectItem>
                        <SelectItem value="current-year">Année en cours</SelectItem>
                        <SelectItem value="custom">Personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Champs à exporter</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox defaultChecked />
                        <Label>Tous les champs</Label>
                      </div>
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">Code</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">Libellé</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">Montants</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox defaultChecked />
                          <Label className="text-sm">Dates</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Download className="mr-2 h-4 w-4" />
                    Exporter maintenant
                  </Button>
                  <Button variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Planifier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Modèles d'Export</CardTitle>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau modèle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {exportTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium flex items-center">
                          {getFormatIcon(template.format)}
                          <span className="ml-2">{template.name}</span>
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                      <Badge variant="outline">{template.module}</Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <FileSpreadsheet className="h-3 w-3 mr-2" />
                        Format: {template.format.toUpperCase()}
                      </div>
                      {template.schedule && (
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-3 w-3 mr-2" />
                          Planifié: {template.schedule}
                        </div>
                      )}
                      {template.lastUsed && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-3 w-3 mr-2" />
                          Dernière utilisation: {template.lastUsed.toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <Button size="sm" className="flex-1">
                        <Play className="mr-1 h-3 w-3" />
                        Utiliser
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Import/Export</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="7days">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Aujourd'hui</SelectItem>
                      <SelectItem value="7days">7 derniers jours</SelectItem>
                      <SelectItem value="30days">30 derniers jours</SelectItem>
                      <SelectItem value="all">Tout</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Rechercher..." className="max-w-xs" />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fichier</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Enregistrements</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>10/02/2024 14:30</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          <Upload className="mr-1 h-3 w-3" />
                          Import
                        </Badge>
                      </TableCell>
                      <TableCell>clients_janvier.csv</TableCell>
                      <TableCell>CRM</TableCell>
                      <TableCell>3,500</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Succès
                        </Badge>
                      </TableCell>
                      <TableCell>Admin</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mapping Tab */}
        <TabsContent value="mapping" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration du Mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configurez la correspondance entre les champs de vos fichiers et les champs de l'application.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label>Type de mapping</Label>
                  <Select defaultValue="customer">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customer">Clients</SelectItem>
                      <SelectItem value="supplier">Fournisseurs</SelectItem>
                      <SelectItem value="product">Produits</SelectItem>
                      <SelectItem value="account">Comptes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Correspondance des champs</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Champ source</Label>
                        <Select defaultValue="customer_id">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="customer_id">customer_id</SelectItem>
                            <SelectItem value="client_code">client_code</SelectItem>
                            <SelectItem value="code">code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Champ destination</Label>
                        <Select defaultValue="code">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="code">Code client</SelectItem>
                            <SelectItem value="reference">Référence</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <Button className="w-full">
                  Sauvegarder le mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportExportPage;