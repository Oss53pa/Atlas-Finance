import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
import {
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calculator,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Eye,
  Settings,
  FileCheck,
  Building,
  Calendar,
  PieChart,
  DollarSign
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress
} from '../../components/ui';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface FiscalDocument {
  id: string;
  nom: string;
  type: string;
  statut: 'complété' | 'en_cours' | 'non_commence';
  progression: number;
  obligatoire: boolean;
  echeance: string;
  montant?: number;
}

interface FiscalRatio {
  nom: string;
  valeur: number;
  unite: string;
  evolution: number;
  seuil_alerte?: number;
  statut: 'bon' | 'moyen' | 'critique';
}

interface CompanyInfo {
  raison_sociale: string;
  numero_rccm: string;
  numero_contribuable: string;
  regime_fiscal: string;
  exercice_debut: string;
  exercice_fin: string;
  capital_social: number;
  chiffre_affaires: number;
}

const LiasseFiscalePage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<string>('2024');
  const [selectedRegime, setSelectedRegime] = useState<string>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const { adapter } = useData();
  const [dbFiscalYears, setDbFiscalYears] = useState<any[]>([]);
  const [dbJournalEntries, setDbJournalEntries] = useState<any[]>([]);
  const [companyInfoSetting, setCompanyInfoSetting] = useState<any>(undefined);
  const [fiscalDocsSetting, setFiscalDocsSetting] = useState<any>(undefined);
  const [fiscalRatiosSetting, setFiscalRatiosSetting] = useState<any>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [fy, je, ci, fd, fr] = await Promise.all([
        adapter.getAll('fiscalYears'),
        adapter.getAll('journalEntries'),
        adapter.getById('settings', 'company_info'),
        adapter.getById('settings', 'fiscal_documents'),
        adapter.getById('settings', 'fiscal_ratios'),
      ]);
      setDbFiscalYears(fy as any[]);
      setDbJournalEntries(je as any[]);
      setCompanyInfoSetting(ci);
      setFiscalDocsSetting(fd);
      setFiscalRatiosSetting(fr);
      setIsLoading(false);
    };
    load();
  }, [adapter]);

  // Build company info from settings or fiscal year data
  const mockCompanyInfo: CompanyInfo = useMemo(() => {
    // Try to parse from settings
    try {
      if (companyInfoSetting?.value) {
        const parsed = JSON.parse(companyInfoSetting.value);
        if (parsed.raison_sociale) return parsed;
      }
    } catch { /* ignore */ }

    // Derive from fiscal year data
    const selectedFY = dbFiscalYears.find(fy => fy.code === selectedYear || fy.name.includes(selectedYear));
    const fyEntries = selectedFY
      ? dbJournalEntries.filter(e => e.date >= selectedFY.startDate && e.date <= selectedFY.endDate)
      : dbJournalEntries;

    // Compute chiffre d'affaires from class 7 accounts
    let chiffreAffaires = 0;
    for (const entry of fyEntries) {
      for (const line of entry.lines) {
        if (line.accountCode.startsWith('7')) {
          chiffreAffaires += line.credit - line.debit;
        }
      }
    }

    return {
      raison_sociale: '',
      numero_rccm: '',
      numero_contribuable: '',
      regime_fiscal: '',
      exercice_debut: selectedFY?.startDate || `${selectedYear}-01-01`,
      exercice_fin: selectedFY?.endDate || `${selectedYear}-12-31`,
      capital_social: 0,
      chiffre_affaires: chiffreAffaires,
    };
  }, [companyInfoSetting, dbFiscalYears, dbJournalEntries, selectedYear]);

  // Build fiscal documents from settings
  const documents: FiscalDocument[] = useMemo(() => {
    try {
      if (fiscalDocsSetting?.value) {
        const parsed = JSON.parse(fiscalDocsSetting.value);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }, [fiscalDocsSetting]);

  // Build fiscal ratios from settings
  const ratios: FiscalRatio[] = useMemo(() => {
    try {
      if (fiscalRatiosSetting?.value) {
        const parsed = JSON.parse(fiscalRatiosSetting.value);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }, [fiscalRatiosSetting]);

  const handleGenerateLiasse = async () => {
    setIsGenerating(true);
    toast.success('Génération de la liasse fiscale en cours...');
    
    // Simulate generation process
    await new Promise(resolve => setTimeout(resolve, 4000));
    
    setIsGenerating(false);
    toast.success('Liasse fiscale générée avec succès!');
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'complété':
        return 'text-green-600 bg-green-100';
      case 'en_cours':
        return 'text-orange-600 bg-orange-100';
      case 'non_commence':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'complété':
        return <CheckCircle className="h-4 w-4" />;
      case 'en_cours':
        return <Clock className="h-4 w-4" />;
      case 'non_commence':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getRatioStatusColor = (statut: string) => {
    switch (statut) {
      case 'bon':
        return 'text-green-600 bg-green-100';
      case 'moyen':
        return 'text-orange-600 bg-orange-100';
      case 'critique':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const completedDocs = documents.filter(doc => doc.statut === 'complété').length;
  const totalDocs = documents.length;
  const overallProgress = (completedDocs / totalDocs) * 100;
  const obligatoryDocs = documents.filter(doc => doc.obligatoire).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <FileCheck className="mr-3 h-7 w-7 text-blue-600" />
              Liasse Fiscale
            </h1>
            <p className="mt-2 text-gray-600">
              Génération et gestion de la liasse fiscale selon les normes SYSCOHADA
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleGenerateLiasse}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <Clock className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileCheck className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? 'Génération...' : 'Générer Liasse'}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter PDF
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Company Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="mr-2 h-5 w-5" />
              Informations Société
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Raison Sociale</p>
                <p className="text-lg font-bold text-gray-900">{mockCompanyInfo.raison_sociale}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">N° RCCM</p>
                <p className="text-sm font-mono text-gray-900">{mockCompanyInfo.numero_rccm}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">N° Contribuable</p>
                <p className="text-sm font-mono text-gray-900">{mockCompanyInfo.numero_contribuable}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Régime Fiscal</p>
                <Badge variant="outline">{mockCompanyInfo.regime_fiscal}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Exercice</p>
                <p className="text-sm text-gray-900">
                  {formatDate(mockCompanyInfo.exercice_debut)} au {formatDate(mockCompanyInfo.exercice_fin)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Capital Social</p>
                <p className="text-sm font-bold text-blue-700">
                  {formatCurrency(mockCompanyInfo.capital_social)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Chiffre d'Affaires</p>
                <p className="text-sm font-bold text-green-700">
                  {formatCurrency(mockCompanyInfo.chiffre_affaires)}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Documents</p>
                  <p className="text-lg font-bold text-gray-900">
                    {completedDocs}/{totalDocs}
                  </p>
                  <Progress value={overallProgress} className="w-24 mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Obligatoires</p>
                  <p className="text-lg font-bold text-red-700">{obligatoryDocs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Complétés</p>
                  <p className="text-lg font-bold text-green-700">{completedDocs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Échéance</p>
                  <p className="text-lg font-bold text-purple-700">30 Avril</p>
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
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="ratios">Ratios Financiers</TabsTrigger>
            <TabsTrigger value="preview">Aperçu Liasse</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Documents de la Liasse Fiscale</span>
                  <div className="flex space-x-2">
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2022">2022</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des documents..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Progression</TableHead>
                          <TableHead>Échéance</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((document) => (
                          <TableRow key={document.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {document.obligatoire && (
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                )}
                                <div>
                                  <p className="font-medium text-gray-900">{document.nom}</p>
                                  {document.obligatoire && (
                                    <p className="text-xs text-red-600">Obligatoire</p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{document.type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.statut)}`}>
                                {getStatusIcon(document.statut)}
                                <span className="ml-1 capitalize">{document.statut.replace('_', ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={document.progression} className="w-20" />
                                <span className="text-sm text-gray-600">{document.progression}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-gray-600">
                                {formatDate(document.echeance)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {document.montant && (
                                <span className="font-semibold text-green-700">
                                  {formatCurrency(document.montant)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center space-x-1">
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Ratios Financiers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ratios.map((ratio, index) => (
                    <motion.div
                      key={ratio.nom}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{ratio.nom}</h3>
                        <Badge className={getRatioStatusColor(ratio.statut)} size="sm">
                          {ratio.statut}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {ratio.unite === '%' ? formatPercentage(ratio.valeur) : ratio.valeur.toFixed(2)}
                        </span>
                        {ratio.unite !== '%' && (
                          <span className="text-sm text-gray-600">{ratio.unite}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center space-x-1 text-sm ${
                          ratio.evolution >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {ratio.evolution >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>{Math.abs(ratio.evolution * 100).toFixed(1)}%</span>
                        </div>
                        {ratio.seuil_alerte && (
                          <span className="text-xs text-gray-700">
                            Seuil: {ratio.seuil_alerte}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aperçu de la Liasse Fiscale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aperçu de la Liasse</h3>
                  <p className="text-gray-700 mb-6">
                    L'aperçu de la liasse fiscale complète sera généré ici avec tous les documents obligatoires.
                  </p>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerateLiasse}>
                    <FileCheck className="mr-2 h-4 w-4" />
                    Générer Aperçu
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Liasses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Historique des Déclarations</h3>
                  <p className="text-gray-700 mb-6">
                    L'historique des liasses fiscales précédemment générées sera affiché ici.
                  </p>
                  <Button variant="outline">
                    <Eye className="mr-2 h-4 w-4" />
                    Voir l'Historique Complet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Generation Progress */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-white p-6 rounded-lg shadow-lg border z-50"
        >
          <div className="flex items-center space-x-4">
            <div className="animate-spin">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Génération en cours...</p>
              <p className="text-sm text-gray-600">Compilation des documents fiscaux</p>
              <Progress value={75} className="w-48 mt-2" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LiasseFiscalePage;