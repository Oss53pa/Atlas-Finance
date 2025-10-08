import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import { 
  Calculator,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Eye,
  Target,
  DollarSign,
  Percent
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '../../components/ui';

interface SigItem {
  id: string;
  libelle: string;
  montant_n: number;
  montant_n1: number;
  variation: number;
  pourcentage_ca: number;
  formule?: string;
}

interface Ratio {
  categorie: string;
  nom: string;
  valeur_n: number;
  valeur_n1: number;
  unite: string;
  interpretation: 'bon' | 'moyen' | 'mauvais';
  benchmark: number;
  description: string;
}

const SigPage: React.FC = () => {
  const { t } = useLanguage();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [viewMode, setViewMode] = useState('sig'); // sig, ratios
  
  // SIG selon SYSCOHADA
  const soldesIntermediaires: SigItem[] = [
    {
      id: 'sf1',
      libelle: 'Marge commerciale',
      montant_n: 10000000,
      montant_n1: 8500000,
      variation: 17.6,
      pourcentage_ca: 33.3,
      formule: 'Ventes marchandises - Coût achat marchandises vendues'
    },
    {
      id: 'sf2', 
      libelle: 'Production de l\'exercice',
      montant_n: 5000000,
      montant_n1: 5700000,
      variation: -12.3,
      pourcentage_ca: 16.7,
      formule: 'Production vendue + Production stockée + Production immobilisée'
    },
    {
      id: 'sf3',
      libelle: 'Valeur ajoutée',
      montant_n: 12500000,
      montant_n1: 11200000,
      variation: 11.6,
      pourcentage_ca: 41.7,
      formule: 'Marge commerciale + Production - Consommations externes'
    },
    {
      id: 'sf4',
      libelle: 'Excédent brut d\'exploitation (EBE)',
      montant_n: 7800000,
      montant_n1: 7200000,
      variation: 8.3,
      pourcentage_ca: 26.0,
      formule: 'Valeur ajoutée + Subventions - Charges de personnel - Impôts et taxes'
    },
    {
      id: 'sf5',
      libelle: 'Résultat d\'exploitation',
      montant_n: 6000000,
      montant_n1: 5550000,
      variation: 8.1,
      pourcentage_ca: 20.0,
      formule: 'EBE + Autres produits - Autres charges - Dotations amortissements'
    },
    {
      id: 'sf6',
      libelle: 'Résultat financier',
      montant_n: -450000,
      montant_n1: -380000,
      variation: 18.4,
      pourcentage_ca: -1.5,
      formule: 'Produits financiers - Charges financières'
    },
    {
      id: 'sf7',
      libelle: 'Résultat des activités ordinaires',
      montant_n: 5550000,
      montant_n1: 5170000,
      variation: 7.3,
      pourcentage_ca: 18.5,
      formule: 'Résultat exploitation + Résultat financier'
    },
    {
      id: 'sf8',
      libelle: 'Résultat exceptionnel',
      montant_n: 150000,
      montant_n1: -50000,
      variation: 400.0,
      pourcentage_ca: 0.5,
      formule: 'Produits exceptionnels - Charges exceptionnelles'
    },
    {
      id: 'sf9',
      libelle: 'Résultat avant impôt',
      montant_n: 5700000,
      montant_n1: 5120000,
      variation: 11.3,
      pourcentage_ca: 19.0,
      formule: 'Résultat activités ordinaires + Résultat exceptionnel'
    },
    {
      id: 'sf10',
      libelle: 'Résultat net de l\'exercice',
      montant_n: 4275000,
      montant_n1: 3840000,
      variation: 11.3,
      pourcentage_ca: 14.25,
      formule: 'Résultat avant impôt - Impôts sur les bénéfices'
    }
  ];

  // Ratios financiers selon SYSCOHADA
  const ratiosFinanciers: Ratio[] = [
    // Ratios de liquidité
    {
      categorie: 'Liquidité',
      nom: 'Liquidité générale',
      valeur_n: 1.35,
      valeur_n1: 1.28,
      unite: '',
      interpretation: 'bon',
      benchmark: 1.2,
      description: 'Actif circulant / Dettes à court terme'
    },
    {
      categorie: 'Liquidité',
      nom: 'Liquidité immédiate',
      valeur_n: 0.65,
      valeur_n1: 0.58,
      unite: '',
      interpretation: 'moyen',
      benchmark: 0.8,
      description: 'Disponibilités / Dettes à court terme'
    },
    
    // Ratios de rentabilité
    {
      categorie: 'Rentabilité',
      nom: 'Rentabilité économique (ROA)',
      valeur_n: 12.8,
      valeur_n1: 11.5,
      unite: '%',
      interpretation: 'bon',
      benchmark: 10.0,
      description: 'Résultat net / Total actif'
    },
    {
      categorie: 'Rentabilité',
      nom: 'Rentabilité financière (ROE)',
      valeur_n: 26.7,
      valeur_n1: 24.2,
      unite: '%',
      interpretation: 'bon',
      benchmark: 15.0,
      description: 'Résultat net / Capitaux propres'
    },
    {
      categorie: 'Rentabilité',
      nom: 'Marge nette',
      valeur_n: 14.25,
      valeur_n1: 13.6,
      unite: '%',
      interpretation: 'bon',
      benchmark: 10.0,
      description: 'Résultat net / Chiffre d\'affaires'
    },
    
    // Ratios d'endettement
    {
      categorie: 'Endettement',
      nom: 'Taux d\'endettement',
      valeur_n: 38.5,
      valeur_n1: 42.3,
      unite: '%',
      interpretation: 'bon',
      benchmark: 50.0,
      description: 'Dettes totales / Total passif'
    },
    {
      categorie: 'Endettement',
      nom: 'Capacité de remboursement',
      valeur_n: 2.8,
      valeur_n1: 3.2,
      unite: 'années',
      interpretation: 'bon',
      benchmark: 4.0,
      description: 'Dettes financières / CAF'
    },
    
    // Ratios d'activité
    {
      categorie: 'Activité',
      nom: 'Rotation des stocks',
      valeur_n: 4.2,
      valeur_n1: 3.8,
      unite: 'fois/an',
      interpretation: 'bon',
      benchmark: 4.0,
      description: 'CAMV / Stock moyen'
    },
    {
      categorie: 'Activité',
      nom: 'Délai de recouvrement clients',
      valeur_n: 45,
      valeur_n1: 52,
      unite: 'jours',
      interpretation: 'bon',
      benchmark: 60,
      description: 'Créances clients × 360 / CA TTC'
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getInterpretationColor = (interpretation: string) => {
    switch (interpretation) {
      case 'bon': return 'bg-green-100 text-green-800 border-green-200';
      case 'moyen': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mauvais': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderSIG = () => (
    <div className="space-y-8">
      {/* Métriques clés */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Chiffre d'Affaires</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(30000000)}
                </p>
                <p className="text-sm text-blue-600">+8.5% vs N-1</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">EBE</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(7800000)}
                </p>
                <p className="text-sm text-green-600">26.0% du CA</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Résultat Net</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(4275000)}
                </p>
                <p className="text-sm text-purple-600">14.25% du CA</p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Valeur Ajoutée</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatCurrency(12500000)}
                </p>
                <p className="text-sm text-amber-600">41.7% du CA</p>
              </div>
              <BarChart3 className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des SIG */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800">
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Soldes Intermédiaires de Gestion - Exercice {selectedPeriod}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">{t('accounting.balance')}</TableHead>
                <TableHead className="font-semibold text-right">N</TableHead>
                <TableHead className="font-semibold text-right">N-1</TableHead>
                <TableHead className="font-semibold text-right">Variation</TableHead>
                <TableHead className="font-semibold text-right">% CA</TableHead>
                <TableHead className="font-semibold">Mode de calcul</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {soldesIntermediaires.map((sig) => (
                <TableRow key={sig.id} className="hover:bg-slate-50">
                  <TableCell className="font-semibold text-slate-800">
                    {sig.libelle}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(sig.montant_n)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-gray-600">
                    {formatCurrency(sig.montant_n1)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${getVariationColor(sig.variation)}`}>
                    {sig.variation > 0 ? '+' : ''}{sig.variation.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {sig.pourcentage_ca.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm text-gray-600 max-w-xs">
                    {sig.formule}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderRatios = () => {
    const categoriesRatios = ratiosFinanciers.reduce((acc, ratio) => {
      if (!acc[ratio.categorie]) acc[ratio.categorie] = [];
      acc[ratio.categorie].push(ratio);
      return acc;
    }, {} as Record<string, Ratio[]>);

    return (
      <div className="space-y-8">
        {Object.entries(categoriesRatios).map(([categorie, ratios]) => (
          <Card key={categorie}>
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700">
              <CardTitle className="text-white flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Ratios de {categorie}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {ratios.map((ratio, index) => (
                  <Card key={index} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{ratio.nom}</h4>
                          <p className="text-sm text-gray-600 mt-1">{ratio.description}</p>
                        </div>
                        <Badge className={getInterpretationColor(ratio.interpretation)}>
                          {ratio.interpretation}
                        </Badge>
                      </div>
                      
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-gray-900">
                              {ratio.valeur_n.toFixed(ratio.unite === '%' ? 1 : 2)}
                            </span>
                            <span className="text-sm text-gray-700">{ratio.unite}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">
                              N-1: {ratio.valeur_n1.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                            </span>
                            <span className={`text-xs font-medium ${
                              ratio.valeur_n > ratio.valeur_n1 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {ratio.valeur_n > ratio.valeur_n1 ? '↗' : '↘'}
                              {Math.abs(((ratio.valeur_n - ratio.valeur_n1) / ratio.valeur_n1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-xs text-gray-700">Benchmark</p>
                          <p className="text-sm font-medium text-gray-700">
                            {ratio.benchmark.toFixed(ratio.unite === '%' ? 1 : 2)}{ratio.unite}
                          </p>
                        </div>
                      </div>
                      
                      {/* Barre de progression */}
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              ratio.interpretation === 'bon' ? 'bg-green-500' : 
                              ratio.interpretation === 'moyen' ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ 
                              width: `${Math.min((ratio.valeur_n / ratio.benchmark) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-8 mb-8 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Calculator className="h-10 w-10" />
              SIG & Ratios Financiers
            </h1>
            <p className="text-slate-200 text-lg mt-2">
              Analyse de performance et diagnostic financier SYSCOHADA
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">Exercice 2024</SelectItem>
                <SelectItem value="2023">Exercice 2023</SelectItem>
                <SelectItem value="2022">Exercice 2022</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-white text-slate-800 hover:bg-slate-100 gap-2">
              <Download className="h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation SIG/Ratios */}
      <div className="bg-white rounded-xl shadow-sm mb-8 p-1">
        <div className="flex gap-1">
          {[
            { key: 'sig', label: 'SIG - Soldes Intermédiaires', icon: Calculator },
            { key: 'ratios', label: 'Ratios Financiers', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-medium transition-all ${
                  viewMode === tab.key
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu */}
      {viewMode === 'sig' && renderSIG()}
      {viewMode === 'ratios' && renderRatios()}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(range) => setDateRange(range)}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default SigPage;