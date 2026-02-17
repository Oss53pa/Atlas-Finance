import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  Calculator,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Filter,
  BarChart3,
  PieChart,
  Activity,
  Receipt,
  CreditCard,
  Building,
  Users,
  ChevronRight,
  Plus,
  Eye,
  X
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../../components/ui';
import { motion } from 'framer-motion';

const TaxReportingPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [selectedTaxType, setSelectedTaxType] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewDeclarationModal, setShowNewDeclarationModal] = useState(false);
  const [showDeclarationDetailModal, setShowDeclarationDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showGenerateReportModal, setShowGenerateReportModal] = useState(false);
  const [showReportPreviewModal, setShowReportPreviewModal] = useState(false);
  const [selectedDeclaration, setSelectedDeclaration] = useState<any>(null);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Form states
  const [newDeclaration, setNewDeclaration] = useState({
    type: 'TVA',
    periode: '',
    montant: '',
    dateEcheance: ''
  });

  // Handlers
  const handleImport = () => {
    setShowImportModal(true);
  };

  const handleExport = () => {
    toast.success('Export en cours de téléchargement...');
    setTimeout(() => toast.success('Export terminé avec succès'), 1500);
  };

  const handleNewDeclaration = () => {
    setShowNewDeclarationModal(true);
  };

  const handleViewDeclaration = (declaration: any) => {
    setSelectedDeclaration(declaration);
    setShowDeclarationDetailModal(true);
  };

  const handlePayment = (declaration: any) => {
    setSelectedDeclaration(declaration);
    setShowPaymentModal(true);
  };

  const handleDownloadDeclaration = (declaration: any) => {
    toast.success(`Téléchargement de la déclaration ${declaration.type} - ${declaration.periode}`);
  };

  const handleGenerateReport = () => {
    setShowGenerateReportModal(true);
  };

  const handlePreviewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportPreviewModal(true);
  };

  const handleDownloadReport = (report: any) => {
    toast.success(`Téléchargement du rapport "${report.name}"`);
  };

  const handleSubmitDeclaration = () => {
    if (!newDeclaration.type || !newDeclaration.periode || !newDeclaration.montant) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    toast.success('Déclaration créée avec succès');
    setShowNewDeclarationModal(false);
    setNewDeclaration({ type: 'TVA', periode: '', montant: '', dateEcheance: '' });
  };

  const handleConfirmPayment = () => {
    toast.success(`Paiement de ${formatCurrency(selectedDeclaration?.montant || 0)} enregistré`);
    setShowPaymentModal(false);
    setSelectedDeclaration(null);
  };

  const handleConfirmImport = () => {
    toast.success('Import des données fiscales effectué');
    setShowImportModal(false);
  };

  // Données mockées pour les statistiques fiscales
  const taxStats = {
    tvaCollectee: 45250000,
    tvaDeductible: 32150000,
    tvaAPayer: 13100000,
    irpp: 8750000,
    is: 12500000,
    totalTaxes: 34350000,
    variation: {
      tva: +12.5,
      irpp: -3.2,
      is: +8.7,
      global: +9.3
    }
  };

  // Données pour le tableau des déclarations
  const declarations = [
    {
      id: '1',
      type: 'TVA',
      periode: 'Janvier 2024',
      montant: 13100000,
      statut: 'payee',
      dateEcheance: '2024-02-15',
      datePaiement: '2024-02-10'
    },
    {
      id: '2',
      type: 'IRPP',
      periode: 'T4 2023',
      montant: 8750000,
      statut: 'en_cours',
      dateEcheance: '2024-02-20',
      datePaiement: null
    },
    {
      id: '3',
      type: 'IS',
      periode: '2023',
      montant: 12500000,
      statut: 'planifiee',
      dateEcheance: '2024-03-15',
      datePaiement: null
    },
    {
      id: '4',
      type: 'TVA',
      periode: 'Décembre 2023',
      montant: 11850000,
      statut: 'payee',
      dateEcheance: '2024-01-15',
      datePaiement: '2024-01-12'
    },
    {
      id: '5',
      type: 'Taxe professionnelle',
      periode: '2024',
      montant: 3500000,
      statut: 'en_retard',
      dateEcheance: '2024-01-31',
      datePaiement: null
    }
  ];

  // Données pour les rapports disponibles
  const availableReports = [
    {
      id: '1',
      name: 'État de TVA Mensuel',
      type: 'TVA',
      format: 'PDF',
      size: '245 KB',
      lastGenerated: '2024-02-10'
    },
    {
      id: '2',
      name: 'Synthèse Fiscale Annuelle',
      type: 'Global',
      format: 'Excel',
      size: '1.2 MB',
      lastGenerated: '2024-01-31'
    },
    {
      id: '3',
      name: 'Déclaration IRPP',
      type: 'IRPP',
      format: 'PDF',
      size: '180 KB',
      lastGenerated: '2024-02-05'
    },
    {
      id: '4',
      name: 'Liasse Fiscale',
      type: 'IS',
      format: 'PDF',
      size: '3.5 MB',
      lastGenerated: '2024-01-15'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'payee':
        return 'bg-var(--color-green-light) text-var(--color-green-dark)';
      case 'en_cours':
        return 'bg-var(--color-blue-light) text-var(--color-blue-dark)';
      case 'planifiee':
        return 'bg-var(--color-gray-light) text-var(--color-gray-dark)';
      case 'en_retard':
        return 'bg-var(--color-red-light) text-var(--color-red-dark)';
      default:
        return 'bg-var(--color-gray-light) text-var(--color-gray-dark)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'payee':
        return 'Payée';
      case 'en_cours':
        return 'En cours';
      case 'planifiee':
        return 'Planifiée';
      case 'en_retard':
        return 'En retard';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-var(--color-border) pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-var(--color-text-primary) flex items-center">
              <Receipt className="mr-3 h-7 w-7 text-var(--color-blue-primary)" />
              Reporting Fiscal
            </h1>
            <p className="mt-1 text-sm text-var(--color-text-secondary)">
              Tableaux de bord et rapports fiscaux - TVA, IRPP, IS et autres taxes
            </p>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-month">Mois en cours</SelectItem>
                <SelectItem value="last-month">Mois dernier</SelectItem>
                <SelectItem value="current-quarter">Trimestre en cours</SelectItem>
                <SelectItem value="current-year">Année en cours</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button className="bg-var(--color-blue-primary) hover:bg-var(--color-blue-dark)" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">TVA à Payer</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(taxStats.tvaAPayer)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Collectée: {formatCurrency(taxStats.tvaCollectee)}
                  </p>
                  <p className="text-xs text-gray-700">
                    Déductible: {formatCurrency(taxStats.tvaDeductible)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.tva > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {taxStats.variation.tva > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.tva)}%
                  </div>
                  <CreditCard className="h-8 w-8 text-var(--color-blue-primary) mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">IRPP</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(taxStats.irpp)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Impôt sur le revenu
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.irpp > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {taxStats.variation.irpp > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.irpp)}%
                  </div>
                  <Users className="h-8 w-8 text-purple-600 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">IS</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(taxStats.is)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Impôt sur les sociétés
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.is > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {taxStats.variation.is > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.is)}%
                  </div>
                  <Building className="h-8 w-8 text-var(--color-green-primary) mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-var(--color-text-secondary)">Total Taxes</p>
                  <p className="text-lg font-bold text-var(--color-text-primary)">
                    {formatCurrency(taxStats.totalTaxes)}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Toutes taxes confondues
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.global > 0 ? 'bg-var(--color-red-light) text-var(--color-red-dark)' : 'bg-var(--color-green-light) text-green-800'
                  }`}>
                    {taxStats.variation.global > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.global)}%
                  </div>
                  <DollarSign className="h-8 w-8 text-var(--color-orange-primary) mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="declarations">Déclarations</TabsTrigger>
            <TabsTrigger value="reports">Rapports</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Graphique TVA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Évolution TVA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-var(--color-text-secondary)">TVA Collectée</span>
                        <span className="text-sm font-medium">{formatCurrency(taxStats.tvaCollectee)}</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-var(--color-text-secondary)">TVA Déductible</span>
                        <span className="text-sm font-medium">{formatCurrency(taxStats.tvaDeductible)}</span>
                      </div>
                      <Progress value={55} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">TVA à Payer</span>
                        <span className="text-sm font-bold text-var(--color-blue-primary)">{formatCurrency(taxStats.tvaAPayer)}</span>
                      </div>
                      <Progress value={30} className="h-2 bg-var(--color-blue-light)" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calendrier Fiscal */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Prochaines Échéances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-var(--color-red-primary) mr-2" />
                        <div>
                          <p className="text-sm font-medium">TVA Janvier</p>
                          <p className="text-xs text-var(--color-text-secondary)">15 Février 2024</p>
                        </div>
                      </div>
                      <Badge variant="destructive">5 jours</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-var(--color-orange-primary) mr-2" />
                        <div>
                          <p className="text-sm font-medium">IRPP T4</p>
                          <p className="text-xs text-var(--color-text-secondary)">20 Février 2024</p>
                        </div>
                      </div>
                      <Badge className="bg-var(--color-orange-light) text-orange-800">10 jours</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-var(--color-blue-light) rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-var(--color-blue-primary) mr-2" />
                        <div>
                          <p className="text-sm font-medium">IS Annuel</p>
                          <p className="text-xs text-var(--color-text-secondary)">15 Mars 2024</p>
                        </div>
                      </div>
                      <Badge className="bg-var(--color-blue-light) text-var(--color-blue-dark)">33 jours</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Répartition des taxes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Répartition des Taxes par Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-var(--color-blue-primary)">38%</div>
                    <div className="text-sm text-var(--color-text-secondary)">TVA</div>
                    <div className="text-xs text-gray-700">{formatCurrency(taxStats.tvaAPayer)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">25%</div>
                    <div className="text-sm text-var(--color-text-secondary)">IRPP</div>
                    <div className="text-xs text-gray-700">{formatCurrency(taxStats.irpp)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-var(--color-green-primary)">36%</div>
                    <div className="text-sm text-var(--color-text-secondary)">IS</div>
                    <div className="text-xs text-gray-700">{formatCurrency(taxStats.is)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-var(--color-orange-primary)">1%</div>
                    <div className="text-sm text-var(--color-text-secondary)">Autres</div>
                    <div className="text-xs text-gray-700">{formatCurrency(500000)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="declarations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Déclarations Fiscales</CardTitle>
                  <div className="flex space-x-2">
                    <Select value={selectedTaxType} onValueChange={setSelectedTaxType}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        <SelectItem value="tva">TVA</SelectItem>
                        <SelectItem value="irpp">IRPP</SelectItem>
                        <SelectItem value="is">IS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleNewDeclaration}>
                      <Plus className="mr-1 h-4 w-4" />
                      Nouvelle
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {declarations.map((declaration) => (
                      <TableRow key={declaration.id}>
                        <TableCell className="font-medium">{declaration.type}</TableCell>
                        <TableCell>{declaration.periode}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(declaration.montant)}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(declaration.statut)}>
                            {getStatusLabel(declaration.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell>{declaration.dateEcheance}</TableCell>
                        <TableCell>
                          {declaration.datePaiement || (
                            declaration.statut === 'en_retard' ? (
                              <span className="text-var(--color-red-primary) text-sm">En retard</span>
                            ) : (
                              <span className="text-var(--color-text-muted) text-sm">-</span>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleViewDeclaration(declaration)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {declaration.statut !== 'payee' && (
                              <Button variant="ghost" size="sm" onClick={() => handlePayment(declaration)}>
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadDeclaration(declaration)}>
                              <Download className="h-4 w-4" />
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

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Rapports Fiscaux Disponibles</CardTitle>
                  <Button onClick={handleGenerateReport}>
                    <Plus className="mr-2 h-4 w-4" />
                    Générer Rapport
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {availableReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-var(--color-text-muted) mr-3" />
                          <div>
                            <h4 className="font-medium">{report.name}</h4>
                            <p className="text-sm text-var(--color-text-secondary)">
                              {report.type} • {report.format} • {report.size}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{report.lastGenerated}</Badge>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handlePreviewReport(report)}>
                          <Eye className="mr-1 h-3 w-3" />
                          Aperçu
                        </Button>
                        <Button size="sm" onClick={() => handleDownloadReport(report)}>
                          <Download className="mr-1 h-3 w-3" />
                          Télécharger
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2 h-5 w-5" />
                    Tendances Fiscales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Charge fiscale moyenne</span>
                      <span className="font-semibold">28.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Taux effectif d'imposition</span>
                      <span className="font-semibold">24.3%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Crédit de TVA</span>
                      <span className="font-semibold text-var(--color-green-primary)">{formatCurrency(3250000)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-var(--color-text-secondary)">Économies fiscales</span>
                      <span className="font-semibold text-var(--color-green-primary)">{formatCurrency(5750000)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="mr-2 h-5 w-5" />
                    Optimisation Fiscale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-var(--color-green-light) rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-var(--color-green-primary) mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Déductions maximisées</p>
                          <p className="text-xs text-var(--color-text-secondary)">+15% vs année précédente</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-var(--color-text-muted)" />
                      </div>
                    </div>
                    <div className="p-3 bg-var(--color-blue-light) rounded-lg">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 text-var(--color-blue-primary) mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Crédits d'impôt utilisés</p>
                          <p className="text-xs text-var(--color-text-secondary)">85% du potentiel</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-var(--color-text-muted)" />
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-var(--color-orange-primary) mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Opportunités identifiées</p>
                          <p className="text-xs text-var(--color-text-secondary)">3 nouvelles déductions possibles</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-var(--color-text-muted)" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Importer des données fiscales</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Glissez-déposez vos fichiers ici</p>
                <p className="text-sm text-gray-500">ou</p>
                <Button variant="outline" className="mt-2">Parcourir</Button>
              </div>
              <p className="text-sm text-gray-500">Formats acceptés: CSV, Excel, XML</p>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowImportModal(false)}>Annuler</Button>
              <Button onClick={handleConfirmImport}>Importer</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nouvelle Déclaration */}
      {showNewDeclarationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nouvelle Déclaration Fiscale</h3>
              <button onClick={() => setShowNewDeclarationModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de déclaration *</label>
                <select
                  value={newDeclaration.type}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, type: e.target.value })}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="TVA">TVA</option>
                  <option value="IRPP">IRPP</option>
                  <option value="IS">IS</option>
                  <option value="Taxe professionnelle">Taxe professionnelle</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période *</label>
                <input
                  type="text"
                  value={newDeclaration.periode}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, periode: e.target.value })}
                  placeholder="Ex: Janvier 2024"
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant (XOF) *</label>
                <input
                  type="number"
                  value={newDeclaration.montant}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, montant: e.target.value })}
                  placeholder="0"
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date d'échéance</label>
                <input
                  type="date"
                  value={newDeclaration.dateEcheance}
                  onChange={(e) => setNewDeclaration({ ...newDeclaration, dateEcheance: e.target.value })}
                  className="w-full border rounded-lg p-2"
                />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowNewDeclarationModal(false)}>Annuler</Button>
              <Button onClick={handleSubmitDeclaration}>Créer la déclaration</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Détail Déclaration */}
      {showDeclarationDetailModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Détails de la Déclaration</h3>
              <button onClick={() => setShowDeclarationDetailModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{selectedDeclaration.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Période</p>
                  <p className="font-medium">{selectedDeclaration.periode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Montant</p>
                  <p className="font-medium text-lg">{formatCurrency(selectedDeclaration.montant)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  <Badge className={getStatusColor(selectedDeclaration.statut)}>
                    {getStatusLabel(selectedDeclaration.statut)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Échéance</p>
                  <p className="font-medium">{selectedDeclaration.dateEcheance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de paiement</p>
                  <p className="font-medium">{selectedDeclaration.datePaiement || '-'}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowDeclarationDetailModal(false)}>Fermer</Button>
              <Button onClick={() => handleDownloadDeclaration(selectedDeclaration)}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Paiement */}
      {showPaymentModal && selectedDeclaration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Enregistrer le Paiement</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600">Déclaration</p>
                <p className="font-semibold">{selectedDeclaration.type} - {selectedDeclaration.periode}</p>
                <p className="text-lg font-bold text-blue-700 mt-2">{formatCurrency(selectedDeclaration.montant)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode de paiement</label>
                <select className="w-full border rounded-lg p-2">
                  <option>Virement bancaire</option>
                  <option>Chèque</option>
                  <option>Télépaiement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Référence de paiement</label>
                <input type="text" placeholder="N° de référence" className="w-full border rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date de paiement</label>
                <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full border rounded-lg p-2" />
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Annuler</Button>
              <Button onClick={handleConfirmPayment}>Confirmer le paiement</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Générer Rapport */}
      {showGenerateReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Générer un Rapport Fiscal</h3>
              <button onClick={() => setShowGenerateReportModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type de rapport</label>
                <select className="w-full border rounded-lg p-2">
                  <option>État de TVA Mensuel</option>
                  <option>Synthèse Fiscale Annuelle</option>
                  <option>Déclaration IRPP</option>
                  <option>Liasse Fiscale</option>
                  <option>Rapport personnalisé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                <select className="w-full border rounded-lg p-2">
                  <option>Mois en cours</option>
                  <option>Mois précédent</option>
                  <option>Trimestre en cours</option>
                  <option>Année en cours</option>
                  <option>Personnalisé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <select className="w-full border rounded-lg p-2">
                  <option>PDF</option>
                  <option>Excel</option>
                  <option>CSV</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowGenerateReportModal(false)}>Annuler</Button>
              <Button onClick={() => {
                toast.success('Rapport en cours de génération...');
                setTimeout(() => {
                  toast.success('Rapport généré avec succès');
                  setShowGenerateReportModal(false);
                }, 2000);
              }}>
                Générer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aperçu Rapport */}
      {showReportPreviewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-semibold">Aperçu: {selectedReport.name}</h3>
              <button onClick={() => setShowReportPreviewModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-100 rounded-lg p-8 min-h-96 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">{selectedReport.name}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Type: {selectedReport.type} | Format: {selectedReport.format} | Taille: {selectedReport.size}
                  </p>
                  <p className="text-sm text-gray-500">Dernière génération: {selectedReport.lastGenerated}</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setShowReportPreviewModal(false)}>Fermer</Button>
              <Button onClick={() => {
                handleDownloadReport(selectedReport);
                setShowReportPreviewModal(false);
              }}>
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxReportingPage;