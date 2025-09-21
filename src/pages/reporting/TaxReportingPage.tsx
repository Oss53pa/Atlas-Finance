import React, { useState } from 'react';
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
  Eye
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
        return 'bg-green-100 text-green-800';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'planifiee':
        return 'bg-gray-100 text-gray-800';
      case 'en_retard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        className="border-b border-gray-200 pb-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Receipt className="mr-3 h-7 w-7 text-blue-600" />
              Reporting Fiscal
            </h1>
            <p className="mt-1 text-sm text-gray-600">
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
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
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
                  <p className="text-sm font-medium text-gray-600">TVA à Payer</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxStats.tvaAPayer)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Collectée: {formatCurrency(taxStats.tvaCollectee)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Déductible: {formatCurrency(taxStats.tvaDeductible)}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.tva > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {taxStats.variation.tva > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.tva)}%
                  </div>
                  <CreditCard className="h-8 w-8 text-blue-600 mt-2" />
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
                  <p className="text-sm font-medium text-gray-600">IRPP</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxStats.irpp)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Impôt sur le revenu
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.irpp > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
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
                  <p className="text-sm font-medium text-gray-600">IS</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxStats.is)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Impôt sur les sociétés
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.is > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {taxStats.variation.is > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.is)}%
                  </div>
                  <Building className="h-8 w-8 text-green-600 mt-2" />
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
                  <p className="text-sm font-medium text-gray-600">Total Taxes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxStats.totalTaxes)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Toutes taxes confondues
                  </p>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taxStats.variation.global > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {taxStats.variation.global > 0 ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    )}
                    {Math.abs(taxStats.variation.global)}%
                  </div>
                  <DollarSign className="h-8 w-8 text-orange-600 mt-2" />
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
                        <span className="text-sm text-gray-600">TVA Collectée</span>
                        <span className="text-sm font-medium">{formatCurrency(taxStats.tvaCollectee)}</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">TVA Déductible</span>
                        <span className="text-sm font-medium">{formatCurrency(taxStats.tvaDeductible)}</span>
                      </div>
                      <Progress value={55} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">TVA à Payer</span>
                        <span className="text-sm font-bold text-blue-600">{formatCurrency(taxStats.tvaAPayer)}</span>
                      </div>
                      <Progress value={30} className="h-2 bg-blue-100" />
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
                        <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium">TVA Janvier</p>
                          <p className="text-xs text-gray-600">15 Février 2024</p>
                        </div>
                      </div>
                      <Badge variant="destructive">5 jours</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-orange-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium">IRPP T4</p>
                          <p className="text-xs text-gray-600">20 Février 2024</p>
                        </div>
                      </div>
                      <Badge className="bg-orange-100 text-orange-800">10 jours</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium">IS Annuel</p>
                          <p className="text-xs text-gray-600">15 Mars 2024</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800">33 jours</Badge>
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
                    <div className="text-2xl font-bold text-blue-600">38%</div>
                    <div className="text-sm text-gray-600">TVA</div>
                    <div className="text-xs text-gray-500">{formatCurrency(taxStats.tvaAPayer)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">25%</div>
                    <div className="text-sm text-gray-600">IRPP</div>
                    <div className="text-xs text-gray-500">{formatCurrency(taxStats.irpp)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">36%</div>
                    <div className="text-sm text-gray-600">IS</div>
                    <div className="text-xs text-gray-500">{formatCurrency(taxStats.is)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">1%</div>
                    <div className="text-sm text-gray-600">Autres</div>
                    <div className="text-xs text-gray-500">{formatCurrency(500000)}</div>
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
                    <Button size="sm">
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
                              <span className="text-red-600 text-sm">En retard</span>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            {declaration.statut !== 'payee' && (
                              <Button variant="ghost" size="sm">
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm">
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
                  <Button>
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
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <h4 className="font-medium">{report.name}</h4>
                            <p className="text-sm text-gray-600">
                              {report.type} • {report.format} • {report.size}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{report.lastGenerated}</Badge>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-1 h-3 w-3" />
                          Aperçu
                        </Button>
                        <Button size="sm">
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
                      <span className="text-sm text-gray-600">Charge fiscale moyenne</span>
                      <span className="font-semibold">28.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Taux effectif d'imposition</span>
                      <span className="font-semibold">24.3%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Crédit de TVA</span>
                      <span className="font-semibold text-green-600">{formatCurrency(3250000)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Économies fiscales</span>
                      <span className="font-semibold text-green-600">{formatCurrency(5750000)}</span>
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
                    <div className="p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Déductions maximisées</p>
                          <p className="text-xs text-gray-600">+15% vs année précédente</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center">
                        <Activity className="h-4 w-4 text-blue-600 mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Crédits d'impôt utilisés</p>
                          <p className="text-xs text-gray-600">85% du potentiel</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-orange-600 mr-2" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Opportunités identifiées</p>
                          <p className="text-xs text-gray-600">3 nouvelles déductions possibles</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default TaxReportingPage;