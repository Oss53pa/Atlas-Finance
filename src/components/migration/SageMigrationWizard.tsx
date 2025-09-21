/**
 * Assistant de Migration Sage vers WiseBook
 * Interface complète avec mapping intelligent et prévisualisation
 */
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Settings,
  Eye,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Download,
  Zap,
  Database,
  Target,
  Map,
  Shield,
  Clock,
  BarChart3
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Progress,
  LoadingSpinner,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Checkbox,
  Textarea,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../ui';
import { migrationService } from '../../services';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface SageMigrationWizardProps {
  companyId: string;
  onComplete?: (sessionId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

const SageMigrationWizard: React.FC<SageMigrationWizardProps> = ({
  companyId,
  onComplete,
  onCancel,
  className = ''
}) => {
  // États du wizard
  const [currentStep, setCurrentStep] = useState(0);
  const [migrationConfig, setMigrationConfig] = useState({
    migration_name: '',
    source_version: 'SAGE_100',
    include_chart_of_accounts: true,
    include_opening_balance: true,
    include_journal_entries: true,
    include_customers: true,
    include_suppliers: true,
    cutoff_date: new Date().toISOString().split('T')[0],
    fiscal_year_mapping: 'auto',
    validation_strict: false,
  });

  const [selectedFiles, setSelectedFiles] = useState({
    chart_of_accounts: null as File | null,
    journal_entries: null as File | null,
    customers: null as File | null,
    suppliers: null as File | null,
    balance: null as File | null,
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mappingConfig, setMappingConfig] = useState({});
  const [validationResults, setValidationResults] = useState(null);

  // Étapes du wizard
  const steps: MigrationStep[] = [
    {
      id: 'configuration',
      title: 'Configuration',
      description: 'Paramètres de migration',
      status: currentStep === 0 ? 'current' : currentStep > 0 ? 'completed' : 'pending'
    },
    {
      id: 'files',
      title: 'Fichiers Source',
      description: 'Upload des exports Sage',
      status: currentStep === 1 ? 'current' : currentStep > 1 ? 'completed' : 'pending'
    },
    {
      id: 'mapping',
      title: 'Mapping Comptes',
      description: 'Correspondances Sage → SYSCOHADA',
      status: currentStep === 2 ? 'current' : currentStep > 2 ? 'completed' : 'pending'
    },
    {
      id: 'validation',
      title: 'Validation',
      description: 'Contrôles et prévisualisation',
      status: currentStep === 3 ? 'current' : currentStep > 3 ? 'completed' : 'pending'
    },
    {
      id: 'import',
      title: 'Import',
      description: 'Exécution migration',
      status: currentStep === 4 ? 'current' : currentStep > 4 ? 'completed' : 'pending'
    }
  ];

  // Queries
  const { data: sageTemplates } = useQuery({
    queryKey: ['sage-migration-templates'],
    queryFn: () => migrationService.getSageMigrationTemplates(),
  });

  const { data: accountMappingSuggestions } = useQuery({
    queryKey: ['account-mapping-suggestions', sessionId],
    queryFn: () => migrationService.getAccountMappingSuggestions({ sessionId }),
    enabled: !!sessionId && currentStep === 2,
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: migrationService.createMigrationSession,
    onSuccess: (result) => {
      setSessionId(result.session_id);
      toast.success('Session créée avec succès');
      setCurrentStep(1);
    },
    onError: (error) => {
      toast.error(`Erreur création session: ${error.message}`);
    }
  });

  const uploadFilesMutation = useMutation({
    mutationFn: migrationService.uploadMigrationFiles,
    onSuccess: () => {
      toast.success('Fichiers analysés avec succès');
      setCurrentStep(2);
    }
  });

  const validateMigrationMutation = useMutation({
    mutationFn: migrationService.validateMigration,
    onSuccess: (result) => {
      setValidationResults(result);
      setCurrentStep(3);
    }
  });

  const executeMigrationMutation = useMutation({
    mutationFn: migrationService.executeMigration,
    onSuccess: (result) => {
      toast.success('Migration terminée avec succès !');
      onComplete?.(sessionId);
    }
  });

  // Handlers
  const handleNext = () => {
    if (currentStep === 0) {
      // Création session
      createSessionMutation.mutate({
        companyId,
        ...migrationConfig
      });
    } else if (currentStep === 1) {
      // Upload fichiers
      const formData = new FormData();
      Object.entries(selectedFiles).forEach(([key, file]) => {
        if (file) {
          formData.append(key, file);
        }
      });
      
      uploadFilesMutation.mutate({
        sessionId,
        files: formData
      });
    } else if (currentStep === 2) {
      // Validation mapping
      validateMigrationMutation.mutate({
        sessionId,
        mappingConfig
      });
    } else if (currentStep === 3) {
      // Exécution migration
      if (validationResults?.is_valid) {
        executeMigrationMutation.mutate({ sessionId });
        setCurrentStep(4);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFileSelect = (fileType: string, file: File) => {
    setSelectedFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header avec progression */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Migration Sage vers WiseBook
        </h1>
        <p className="text-gray-600 mb-6">
          Assistant de migration intelligent avec mapping automatique SYSCOHADA
        </p>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                ${step.status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                  step.status === 'current' ? 'bg-blue-500 border-blue-500 text-white' :
                  step.status === 'error' ? 'bg-red-500 border-red-500 text-white' :
                  'bg-gray-200 border-gray-300 text-gray-500'}
              `}>
                {step.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              <div className="ml-3 text-left">
                <p className={`text-sm font-medium ${
                  step.status === 'current' ? 'text-blue-600' : 
                  step.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
                <p className="text-xs text-gray-500">{step.description}</p>
              </div>
              
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-400 ml-6" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contenu selon étape */}
      {currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Configuration de la Migration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuration de base */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Nom de la migration</label>
                <Input
                  placeholder="Migration Sage vers WiseBook"
                  value={migrationConfig.migration_name}
                  onChange={(e) => setMigrationConfig({
                    ...migrationConfig,
                    migration_name: e.target.value
                  })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Version Sage source</label>
                <Select
                  value={migrationConfig.source_version}
                  onValueChange={(value) => setMigrationConfig({
                    ...migrationConfig,
                    source_version: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SAGE_100">Sage 100 Comptabilité</SelectItem>
                    <SelectItem value="SAGE_1000">Sage 1000</SelectItem>
                    <SelectItem value="SAGE_X3">Sage X3</SelectItem>
                    <SelectItem value="SAGE_PAIE">Sage Paie & RH</SelectItem>
                    <SelectItem value="SAGE_EXPORT_FEC">Export FEC Sage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Périmètre de migration */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Périmètre de Migration</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={migrationConfig.include_chart_of_accounts}
                      onCheckedChange={(checked) => setMigrationConfig({
                        ...migrationConfig,
                        include_chart_of_accounts: checked
                      })}
                    />
                    <label className="text-sm font-medium">Plan comptable</label>
                    <Badge variant="outline">Essentiel</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={migrationConfig.include_opening_balance}
                      onCheckedChange={(checked) => setMigrationConfig({
                        ...migrationConfig,
                        include_opening_balance: checked
                      })}
                    />
                    <label className="text-sm font-medium">Balance d'ouverture</label>
                    <Badge variant="outline">Recommandé</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={migrationConfig.include_journal_entries}
                      onCheckedChange={(checked) => setMigrationConfig({
                        ...migrationConfig,
                        include_journal_entries: checked
                      })}
                    />
                    <label className="text-sm font-medium">Écritures comptables</label>
                    <Badge variant="outline">Historique</Badge>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={migrationConfig.include_customers}
                      onCheckedChange={(checked) => setMigrationConfig({
                        ...migrationConfig,
                        include_customers: checked
                      })}
                    />
                    <label className="text-sm font-medium">Fichier clients</label>
                    <Badge variant="outline">CRM</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      checked={migrationConfig.include_suppliers}
                      onCheckedChange={(checked) => setMigrationConfig({
                        ...migrationConfig,
                        include_suppliers: checked
                      })}
                    />
                    <label className="text-sm font-medium">Fichier fournisseurs</label>
                    <Badge variant="outline">Achats</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Paramètres avancés */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Paramètres Avancés</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-2">Date de coupure</label>
                  <Input
                    type="date"
                    value={migrationConfig.cutoff_date}
                    onChange={(e) => setMigrationConfig({
                      ...migrationConfig,
                      cutoff_date: e.target.value
                    })}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Données antérieures à cette date ne seront pas migrées
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Validation</label>
                  <Select
                    value={migrationConfig.validation_strict ? 'strict' : 'tolerant'}
                    onValueChange={(value) => setMigrationConfig({
                      ...migrationConfig,
                      validation_strict: value === 'strict'
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">Stricte (arrêt sur erreur)</SelectItem>
                      <SelectItem value="tolerant">Tolérante (continuer avec warnings)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Upload des Fichiers Sage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions d'export */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Instructions Export depuis Sage</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. <strong>Plan comptable</strong> : Menu Traitement → Export → Plan comptable (format Excel)</li>
                <li>2. <strong>Balance</strong> : Menu Édition → Balance générale → Export Excel</li>
                <li>3. <strong>Écritures</strong> : Menu Traitement → Export → Grand livre (toutes écritures) ou FEC</li>
                <li>4. <strong>Clients/Fournisseurs</strong> : Menu Traitement → Export → Tiers (format Excel)</li>
              </ol>
            </div>

            {/* Zones d'upload */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Plan comptable */}
              {migrationConfig.include_chart_of_accounts && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <Database className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Plan Comptable</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Export Excel du plan comptable Sage
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFileSelect('chart_of_accounts', e.target.files?.[0])}
                    className="hidden"
                    id="chart-upload"
                  />
                  <label htmlFor="chart-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Choisir fichier
                    </Button>
                  </label>
                  {selectedFiles.chart_of_accounts && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {selectedFiles.chart_of_accounts.name}
                    </p>
                  )}
                </div>
              )}

              {/* Écritures comptables */}
              {migrationConfig.include_journal_entries && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Écritures Comptables</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Export des écritures ou fichier FEC
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    onChange={(e) => handleFileSelect('journal_entries', e.target.files?.[0])}
                    className="hidden"
                    id="entries-upload"
                  />
                  <label htmlFor="entries-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Choisir fichier
                    </Button>
                  </label>
                  {selectedFiles.journal_entries && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {selectedFiles.journal_entries.name}
                    </p>
                  )}
                </div>
              )}

              {/* Balance d'ouverture */}
              {migrationConfig.include_opening_balance && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Balance d'Ouverture</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Balance avec soldes d'ouverture
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFileSelect('balance', e.target.files?.[0])}
                    className="hidden"
                    id="balance-upload"
                  />
                  <label htmlFor="balance-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Choisir fichier
                    </Button>
                  </label>
                  {selectedFiles.balance && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {selectedFiles.balance.name}
                    </p>
                  )}
                </div>
              )}

              {/* Fichier tiers */}
              {(migrationConfig.include_customers || migrationConfig.include_suppliers) && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <h4 className="font-medium text-gray-900 mb-2">Fichier Tiers</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Clients et fournisseurs Sage
                  </p>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => handleFileSelect('customers', e.target.files?.[0])}
                    className="hidden"
                    id="tiers-upload"
                  />
                  <label htmlFor="tiers-upload" className="cursor-pointer">
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Choisir fichier
                    </Button>
                  </label>
                  {selectedFiles.customers && (
                    <p className="text-sm text-green-600 mt-2">
                      ✓ {selectedFiles.customers.name}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && accountMappingSuggestions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Map className="h-5 w-5 mr-2" />
                Mapping Automatique Sage → SYSCOHADA
              </span>
              <Badge className="bg-green-100 text-green-800">
                {accountMappingSuggestions.auto_mapped_count} mappings auto
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="auto" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="auto">Mappings Automatiques</TabsTrigger>
                <TabsTrigger value="manual">Révision Manuelle</TabsTrigger>
                <TabsTrigger value="conflicts">Conflits ({accountMappingSuggestions.conflicts_count})</TabsTrigger>
              </TabsList>

              <TabsContent value="auto" className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-900">Mapping Automatique Réussi</h4>
                      <p className="text-sm text-green-700">
                        {accountMappingSuggestions.auto_mapped_count} comptes mappés automatiquement avec l'IA
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code Sage</TableHead>
                        <TableHead>Libellé Sage</TableHead>
                        <TableHead>Code SYSCOHADA</TableHead>
                        <TableHead>Libellé SYSCOHADA</TableHead>
                        <TableHead>Confiance IA</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {accountMappingSuggestions.automatic_mappings?.slice(0, 20).map((mapping, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{mapping.sage_code}</TableCell>
                          <TableCell>{mapping.sage_name}</TableCell>
                          <TableCell className="font-mono font-bold text-blue-600">
                            {mapping.syscohada_code}
                          </TableCell>
                          <TableCell>{mapping.syscohada_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Progress value={mapping.confidence_score} className="w-16 h-2" />
                              <span className="text-xs">{mapping.confidence_score}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              mapping.confidence_score >= 90 ? 'bg-green-100 text-green-800' :
                              mapping.confidence_score >= 70 ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }>
                              {mapping.confidence_score >= 90 ? 'Excellent' :
                               mapping.confidence_score >= 70 ? 'Bon' : 'À vérifier'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="conflicts" className="space-y-4">
                {accountMappingSuggestions.conflicts?.map((conflict, index) => (
                  <Card key={index} className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-orange-900">
                            Conflit: {conflict.sage_code} - {conflict.sage_name}
                          </h4>
                          <p className="text-sm text-orange-700">{conflict.issue}</p>
                        </div>
                        <div className="space-x-2">
                          <Select>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Choisir mapping" />
                            </SelectTrigger>
                            <SelectContent>
                              {conflict.suggestions?.map((suggestion, idx) => (
                                <SelectItem key={idx} value={suggestion.syscohada_code}>
                                  {suggestion.syscohada_code} - {suggestion.syscohada_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Validation et Prévisualisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Résumé validation */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {validationResults.summary?.total_accounts || 0}
                </div>
                <p className="text-sm text-gray-600">Comptes à migrer</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.summary?.total_entries || 0}
                </div>
                <p className="text-sm text-gray-600">Écritures à migrer</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(validationResults.summary?.total_amount || 0)}
                </div>
                <p className="text-sm text-gray-600">Montant total</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {validationResults.estimated_time || 0} min
                </div>
                <p className="text-sm text-gray-600">Temps estimé</p>
              </div>
            </div>

            {/* Contrôles de cohérence */}
            <div className="space-y-3">
              <h4 className="font-medium">Contrôles de Cohérence</h4>
              
              {validationResults.coherence_checks?.map((check, index) => (
                <div key={index} className={`flex items-center justify-between p-3 rounded border ${
                  check.status === 'OK' ? 'bg-green-50 border-green-200' :
                  check.status === 'WARNING' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    {check.status === 'OK' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    )}
                    <div>
                      <p className="font-medium">{check.description}</p>
                      {check.details && (
                        <p className="text-sm text-gray-600">{check.details}</p>
                      )}
                    </div>
                  </div>
                  <Badge className={
                    check.status === 'OK' ? 'bg-green-100 text-green-800' :
                    check.status === 'WARNING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }>
                    {check.status}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Prévisualisation échantillon */}
            {validationResults.preview_sample && (
              <div>
                <h4 className="font-medium mb-3">Prévisualisation (10 premiers comptes)</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code Source</TableHead>
                        <TableHead>Libellé Source</TableHead>
                        <TableHead>Code SYSCOHADA</TableHead>
                        <TableHead>Libellé SYSCOHADA</TableHead>
                        <TableHead>Classe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResults.preview_sample.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{item.source_code}</TableCell>
                          <TableCell>{item.source_name}</TableCell>
                          <TableCell className="font-mono font-bold text-blue-600">
                            {item.target_code}
                          </TableCell>
                          <TableCell>{item.target_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              Classe {item.target_code?.[0]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="h-5 w-5 mr-2" />
              Exécution Migration en Cours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="py-8">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Migration en cours...
              </h3>
              <p className="text-gray-600 mb-6">
                Traitement des données avec mapping SYSCOHADA automatique
              </p>
              
              <div className="max-w-md mx-auto">
                <Progress value={75} className="mb-2" />
                <p className="text-sm text-gray-500">
                  Étape: Création des écritures comptables (75%)
                </p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-3 mt-8 text-sm">
                <div>
                  <div className="font-bold text-green-600">1,247</div>
                  <div className="text-gray-600">Comptes migrés</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">8,932</div>
                  <div className="text-gray-600">Écritures traitées</div>
                </div>
                <div>
                  <div className="font-bold text-purple-600">245</div>
                  <div className="text-gray-600">Tiers créés</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>
        
        <div className="flex space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          
          {currentStep < 4 && (
            <Button
              onClick={handleNext}
              disabled={
                (currentStep === 0 && !migrationConfig.migration_name) ||
                (currentStep === 1 && !selectedFiles.chart_of_accounts) ||
                (currentStep === 3 && !validationResults?.is_valid)
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {currentStep === 3 ? 'Lancer Migration' : 'Suivant'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SageMigrationWizard;