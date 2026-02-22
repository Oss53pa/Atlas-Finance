import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { motion } from 'framer-motion';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  BarChart3,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Play,
  RefreshCw,
  Eye,
  Calendar,
  Filter
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
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '../../components/ui';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface TaxCalculation {
  id: string;
  type: string;
  libelle: string;
  base_calcul: number;
  taux: number;
  montant_calcule: number;
  statut: 'calculé' | 'en_cours' | 'erreur';
  date_calcul: string;
  periode: string;
  compte_associe?: string;
}

interface CalculationRule {
  id: string;
  nom: string;
  type_taxe: string;
  formule: string;
  conditions: string[];
  actif: boolean;
  derniere_maj: string;
}

const CalculsAutomatiquesPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedType, setSelectedType] = useState<string>('tous');
  const [isCalculating, setIsCalculating] = useState(false);
  const { adapter } = useData();
  const [taxCalcsSetting, setTaxCalcsSetting] = useState<any>(undefined);
  const [taxRulesSetting, setTaxRulesSetting] = useState<any>(undefined);
  const [dbJournalEntries, setDbJournalEntries] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [tc, tr, je] = await Promise.all([
        adapter.getById('settings', 'tax_calculations'),
        adapter.getById('settings', 'calculation_rules'),
        adapter.getAll('journalEntries'),
      ]);
      setTaxCalcsSetting(tc);
      setTaxRulesSetting(tr);
      setDbJournalEntries(je as any[]);
    };
    load();
  }, [adapter]);

  // Parse calculations from settings, computing from journal entries if available
  const calculations: TaxCalculation[] = useMemo(() => {
    // Try stored calculations first
    try {
      if (taxCalcsSetting?.value) {
        const parsed = JSON.parse(taxCalcsSetting.value);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }

    // Derive basic tax calculations from journal entries for the selected period
    if (dbJournalEntries.length === 0) return [];

    const periodEntries = dbJournalEntries.filter(e => e.date.startsWith(selectedPeriod));
    if (periodEntries.length === 0) return [];

    // Compute TVA collected (4434x accounts) and deductible (4455x accounts)
    let tvaCollected = 0;
    let tvaDeductible = 0;
    for (const entry of periodEntries) {
      for (const line of entry.lines) {
        if (line.accountCode.startsWith('4434')) {
          tvaCollected += line.credit - line.debit;
        } else if (line.accountCode.startsWith('4455')) {
          tvaDeductible += line.debit - line.credit;
        }
      }
    }

    const result: TaxCalculation[] = [];
    if (tvaCollected > 0) {
      result.push({
        id: 'tva-coll',
        type: 'TVA',
        libelle: 'TVA Collectée sur Ventes',
        base_calcul: Math.round(tvaCollected / 0.18),
        taux: 0.18,
        montant_calcule: tvaCollected,
        statut: 'calculé',
        date_calcul: new Date().toISOString().split('T')[0],
        periode: selectedPeriod,
        compte_associe: '4434',
      });
    }
    if (tvaDeductible > 0) {
      result.push({
        id: 'tva-ded',
        type: 'TVA',
        libelle: 'TVA Déductible sur Achats',
        base_calcul: Math.round(tvaDeductible / 0.18),
        taux: 0.18,
        montant_calcule: tvaDeductible,
        statut: 'calculé',
        date_calcul: new Date().toISOString().split('T')[0],
        periode: selectedPeriod,
        compte_associe: '4455',
      });
    }
    return result;
  }, [taxCalcsSetting, dbJournalEntries, selectedPeriod]);

  // Parse rules from settings
  const rules: CalculationRule[] = useMemo(() => {
    try {
      if (taxRulesSetting?.value) {
        const parsed = JSON.parse(taxRulesSetting.value);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }, [taxRulesSetting]);

  const isLoading = taxCalcsSetting === undefined;

  const handleRunCalculations = async () => {
    setIsCalculating(true);
    toast.success('Calcul des taxes en cours...');
    
    // Simulate calculation process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsCalculating(false);
    toast.success('Calculs fiscaux terminés avec succès!');
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'calculé':
        return 'text-green-600 bg-green-100';
      case 'en_cours':
        return 'text-orange-600 bg-orange-100';
      case 'erreur':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'calculé':
        return <CheckCircle className="h-4 w-4" />;
      case 'en_cours':
        return <Clock className="h-4 w-4" />;
      case 'erreur':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const totalCalculated = calculations.filter(c => c.statut === 'calculé').length;
  const totalAmount = calculations.reduce((sum, calc) => sum + calc.montant_calcule, 0);
  const tvaNet = calculations
    .filter(c => c.type === 'TVA')
    .reduce((sum, calc) => 
      calc.libelle.includes('Collectée') ? sum + calc.montant_calcule : sum - calc.montant_calcule, 0
    );

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
              <Calculator className="mr-3 h-7 w-7 text-blue-600" />
              Calculs Automatiques
            </h1>
            <p className="mt-2 text-gray-600">
              Calcul automatique des taxes et impôts selon la réglementation SYSCOHADA
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleRunCalculations}
              disabled={isCalculating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCalculating ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {isCalculating ? 'Calcul en cours...' : 'Lancer Calculs'}
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calculator className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Calculs Réalisés</p>
                  <p className="text-lg font-bold text-gray-900">
                    {totalCalculated}/{calculations.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Taxes</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(totalAmount)}
                  </p>
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
                  <TrendingUp className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">TVA Nette</p>
                  <p className="text-lg font-bold text-red-700">
                    {formatCurrency(tvaNet)}
                  </p>
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
                <div className="p-2 bg-purple-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Règles Actives</p>
                  <p className="text-lg font-bold text-purple-700">
                    {rules.filter(r => r.actif).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres et Paramètres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                  <Input
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type de Taxe
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les types</SelectItem>
                    <SelectItem value="TVA">TVA</SelectItem>
                    <SelectItem value="IS">Impôt sur Sociétés</SelectItem>
                    <SelectItem value="IRPP">IRPP</SelectItem>
                    <SelectItem value="TCA">Taxe sur CA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres Avancés
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Tabs defaultValue="calculations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calculations">Calculs Effectués</TabsTrigger>
            <TabsTrigger value="rules">Règles de Calcul</TabsTrigger>
            <TabsTrigger value="history">Historique</TabsTrigger>
          </TabsList>

          <TabsContent value="calculations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Résultats des Calculs</span>
                  <Badge variant="outline">
                    {calculations.length} calcul(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des calculs..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>{t('accounting.label')}</TableHead>
                          <TableHead className="text-right">Base de Calcul</TableHead>
                          <TableHead className="text-right">Taux</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>{t('accounting.account')}</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {calculations.map((calculation) => (
                          <TableRow key={calculation.id} className="hover:bg-gray-50">
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {calculation.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-gray-900">{calculation.libelle}</p>
                                <p className="text-sm text-gray-700">
                                  Période: {calculation.periode}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-blue-700">
                                {formatCurrency(calculation.base_calcul)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium">
                                {formatPercentage(calculation.taux)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-bold text-green-700">
                                {formatCurrency(calculation.montant_calcule)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(calculation.statut)}`}>
                                {getStatusIcon(calculation.statut)}
                                <span className="ml-1 capitalize">{calculation.statut.replace('_', ' ')}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {calculation.compte_associe && (
                                <Badge variant="outline" className="font-mono">
                                  {calculation.compte_associe}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
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

          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Règles de Calcul</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Settings className="mr-2 h-4 w-4" />
                    Nouvelle Règle
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-semibold text-gray-900">{rule.nom}</h3>
                            <Badge variant={rule.actif ? 'default' : 'outline'}>
                              {rule.actif ? 'Actif' : 'Inactif'}
                            </Badge>
                            <Badge variant="outline">{rule.type_taxe}</Badge>
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <strong>Formule:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{rule.formule}</code>
                            </p>
                            <div className="mt-1">
                              <strong className="text-sm text-gray-600">Conditions:</strong>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {rule.conditions.map((condition, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {condition}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-700 mt-2">
                              Dernière modification: {formatDate(rule.derniere_maj)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
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

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des Calculs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Historique des Calculs</h3>
                  <p className="text-gray-700 mb-6">
                    L'historique détaillé des calculs fiscaux sera affiché ici.
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

      {/* Calculation Progress */}
      {isCalculating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-white p-6 rounded-lg shadow-lg border z-50"
        >
          <div className="flex items-center space-x-4">
            <div className="animate-spin">
              <RefreshCw className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Calcul en cours...</p>
              <Progress value={66} className="w-48 mt-2" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CalculsAutomatiquesPage;