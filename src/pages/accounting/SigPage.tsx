import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { useData } from '../../contexts/DataContext';
import type { DBJournalEntry } from '../../lib/db';
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
import { Money } from '@/utils/money';

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
  const { adapter } = useData();
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: '2024-12-31' });
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [viewMode, setViewMode] = useState('sig'); // sig, ratios
  
  // Load journal entries from Dexie
  const { data: entriesN = [] } = useQuery({
    queryKey: ['sig-entries-n', selectedPeriod],
    queryFn: async () => {
      const all = await adapter.getAll('journalEntries') as DBJournalEntry[];
      return all.filter(e => e.date.startsWith(selectedPeriod));
    },
  });
  const prevYear = String(parseInt(selectedPeriod) - 1);
  const { data: entriesN1 = [] } = useQuery({
    queryKey: ['sig-entries-n1', prevYear],
    queryFn: async () => {
      const all = await adapter.getAll('journalEntries') as DBJournalEntry[];
      return all.filter(e => e.date.startsWith(prevYear));
    },
  });

  // Helpers
  const net = (entries: DBJournalEntry[], ...prefixes: string[]) => {
    let t = 0;
    for (const e of entries) for (const l of e.lines)
      if (prefixes.some(p => l.accountCode.startsWith(p))) t += l.debit - l.credit;
    return t;
  };
  const creditN = (entries: DBJournalEntry[], ...prefixes: string[]) => {
    let t = 0;
    for (const e of entries) for (const l of e.lines)
      if (prefixes.some(p => l.accountCode.startsWith(p))) t += l.credit - l.debit;
    return t;
  };

  // SIG computed from real data
  const sigComputed = useMemo(() => {
    const compute = (entries: DBJournalEntry[]) => {
      const venteMarch = creditN(entries, '701');
      const coutAchat = net(entries, '601');
      const mc = venteMarch - coutAchat;
      const production = creditN(entries, '70', '71', '72', '73');
      const consoExt = net(entries, '60', '61', '62', '63');
      const va = mc + production - consoExt;
      const subventions = creditN(entries, '74');
      const personnel = net(entries, '66');
      const impotsTaxes = net(entries, '64');
      const ebe = va + subventions - personnel - impotsTaxes;
      const autresProduits = creditN(entries, '75');
      const autresCharges = net(entries, '65');
      const dotations = net(entries, '68');
      const reprises = creditN(entries, '79');
      const re = ebe + autresProduits - autresCharges - dotations + reprises;
      const prodsFinanciers = creditN(entries, '76', '786', '796');
      const chargesFinancieres = net(entries, '67', '686', '696');
      const rf = prodsFinanciers - chargesFinancieres;
      const rao = re + rf;
      const prodsHAO = creditN(entries, '82', '84', '86', '88');
      const chargesHAO = net(entries, '81', '83', '85', '87');
      const rHAO = prodsHAO - chargesHAO;
      const rai = rao + rHAO;
      const impotBenef = net(entries, '89');
      const rn = rai - impotBenef;
      const ca = creditN(entries, '70');
      return { mc, production, va, ebe, re, rf, rao, rHAO, rai, rn, ca };
    };
    return { n: compute(entriesN), n1: compute(entriesN1) };
  }, [entriesN, entriesN1]);

  const safePct = (val: number, base: number) => base !== 0 ? new Money(val).divide(base).multiply(100).round(1).toNumber() : 0;
  const safeVar = (n: number, n1: number) => n1 !== 0 ? new Money(n).subtract(n1).divide(Math.abs(n1)).multiply(100).round(1).toNumber() : 0;

  const soldesIntermediaires: SigItem[] = useMemo(() => {
    const { n, n1 } = sigComputed;
    const items: Array<{ id: string; libelle: string; n: number; n1: number; formule: string }> = [
      { id: 'sf1', libelle: 'Marge commerciale', n: n.mc, n1: n1.mc, formule: 'Ventes marchandises - Coût achat marchandises vendues' },
      { id: 'sf2', libelle: 'Production de l\'exercice', n: n.production, n1: n1.production, formule: 'Production vendue + Production stockée + Production immobilisée' },
      { id: 'sf3', libelle: 'Valeur ajoutée', n: n.va, n1: n1.va, formule: 'Marge commerciale + Production - Consommations externes' },
      { id: 'sf4', libelle: 'Excédent brut d\'exploitation (EBE)', n: n.ebe, n1: n1.ebe, formule: 'Valeur ajoutée + Subventions - Charges de personnel - Impôts et taxes' },
      { id: 'sf5', libelle: 'Résultat d\'exploitation', n: n.re, n1: n1.re, formule: 'EBE + Autres produits - Autres charges - Dotations amortissements' },
      { id: 'sf6', libelle: 'Résultat financier', n: n.rf, n1: n1.rf, formule: 'Produits financiers - Charges financières' },
      { id: 'sf7', libelle: 'Résultat des activités ordinaires', n: n.rao, n1: n1.rao, formule: 'Résultat exploitation + Résultat financier' },
      { id: 'sf8', libelle: 'Résultat exceptionnel', n: n.rHAO, n1: n1.rHAO, formule: 'Produits exceptionnels - Charges exceptionnelles' },
      { id: 'sf9', libelle: 'Résultat avant impôt', n: n.rai, n1: n1.rai, formule: 'Résultat activités ordinaires + Résultat exceptionnel' },
      { id: 'sf10', libelle: 'Résultat net de l\'exercice', n: n.rn, n1: n1.rn, formule: 'Résultat avant impôt - Impôts sur les bénéfices' },
    ];
    return items.map(i => ({
      id: i.id,
      libelle: i.libelle,
      montant_n: i.n,
      montant_n1: i.n1,
      variation: safeVar(i.n, i.n1),
      pourcentage_ca: safePct(i.n, n.ca),
      formule: i.formule,
    }));
  }, [sigComputed]);

  // Ratios computed from real data
  const ratiosFinanciers: Ratio[] = useMemo(() => {
    const { n, n1 } = sigComputed;
    const computeRatios = (entries: DBJournalEntry[], sig: typeof n) => {
      const actifCirculant = net(entries, '3', '41', '5');
      const dettesCT = Math.abs(net(entries, '40', '42', '43', '44'));
      const disponibilites = net(entries, '5');
      const totalActif = net(entries, '2', '3', '4', '5');
      const capitauxPropres = Math.abs(net(entries, '1'));
      const dettesTotales = Math.abs(net(entries, '16', '17', '40', '42', '43', '44'));
      const stocks = net(entries, '3');
      const creancesClients = net(entries, '41');
      const safe = (a: number, b: number) => b !== 0 ? new Money(a).divide(b).round().toNumber() : 0;
      return {
        liqGenerale: safe(actifCirculant, dettesCT),
        liqImmediate: safe(disponibilites, dettesCT),
        roa: totalActif !== 0 ? new Money(sig.rn).divide(totalActif).multiply(100).round(1).toNumber() : 0,
        roe: capitauxPropres !== 0 ? new Money(sig.rn).divide(capitauxPropres).multiply(100).round(1).toNumber() : 0,
        margeNette: sig.ca !== 0 ? new Money(sig.rn).divide(sig.ca).multiply(100).round(1).toNumber() : 0,
        endettement: (totalActif + capitauxPropres) !== 0 ? new Money(dettesTotales).divide(totalActif + capitauxPropres).multiply(100).round(1).toNumber() : 0,
        rotationStocks: stocks !== 0 ? new Money(net(entries, '601')).divide(stocks).round(1).toNumber() : 0,
        delaiClients: sig.ca !== 0 ? new Money(creancesClients).multiply(360).divide(sig.ca).round(0).toNumber() : 0,
      };
    };
    const rN = computeRatios(entriesN, n);
    const rN1 = computeRatios(entriesN1, n1);
    const interp = (val: number, bench: number, higher: boolean) =>
      higher ? (val >= bench ? 'bon' : val >= bench * 0.7 ? 'moyen' : 'mauvais')
        : (val <= bench ? 'bon' : val <= bench * 1.3 ? 'moyen' : 'mauvais');

    return [
      { categorie: 'Liquidité', nom: 'Liquidité générale', valeur_n: rN.liqGenerale, valeur_n1: rN1.liqGenerale, unite: '', interpretation: interp(rN.liqGenerale, 1.2, true) as Ratio['interpretation'], benchmark: 1.2, description: 'Actif circulant / Dettes à court terme' },
      { categorie: 'Liquidité', nom: 'Liquidité immédiate', valeur_n: rN.liqImmediate, valeur_n1: rN1.liqImmediate, unite: '', interpretation: interp(rN.liqImmediate, 0.8, true) as Ratio['interpretation'], benchmark: 0.8, description: 'Disponibilités / Dettes à court terme' },
      { categorie: 'Rentabilité', nom: 'Rentabilité économique (ROA)', valeur_n: rN.roa, valeur_n1: rN1.roa, unite: '%', interpretation: interp(rN.roa, 10, true) as Ratio['interpretation'], benchmark: 10.0, description: 'Résultat net / Total actif' },
      { categorie: 'Rentabilité', nom: 'Rentabilité financière (ROE)', valeur_n: rN.roe, valeur_n1: rN1.roe, unite: '%', interpretation: interp(rN.roe, 15, true) as Ratio['interpretation'], benchmark: 15.0, description: 'Résultat net / Capitaux propres' },
      { categorie: 'Rentabilité', nom: 'Marge nette', valeur_n: rN.margeNette, valeur_n1: rN1.margeNette, unite: '%', interpretation: interp(rN.margeNette, 10, true) as Ratio['interpretation'], benchmark: 10.0, description: 'Résultat net / Chiffre d\'affaires' },
      { categorie: 'Endettement', nom: 'Taux d\'endettement', valeur_n: rN.endettement, valeur_n1: rN1.endettement, unite: '%', interpretation: interp(rN.endettement, 50, false) as Ratio['interpretation'], benchmark: 50.0, description: 'Dettes totales / Total passif' },
      { categorie: 'Activité', nom: 'Rotation des stocks', valeur_n: rN.rotationStocks, valeur_n1: rN1.rotationStocks, unite: 'fois/an', interpretation: interp(rN.rotationStocks, 4, true) as Ratio['interpretation'], benchmark: 4.0, description: 'CAMV / Stock moyen' },
      { categorie: 'Activité', nom: 'Délai de recouvrement clients', valeur_n: rN.delaiClients, valeur_n1: rN1.delaiClients, unite: 'jours', interpretation: interp(rN.delaiClients, 60, false) as Ratio['interpretation'], benchmark: 60, description: 'Créances clients × 360 / CA TTC' },
    ];
  }, [entriesN, entriesN1, sigComputed]);


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
                <p className="text-lg font-bold text-blue-900">
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
                <p className="text-lg font-bold text-green-900">
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
                <p className="text-lg font-bold text-purple-900">
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
                <p className="text-lg font-bold text-amber-900">
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
                            <span className="text-lg font-bold text-gray-900">
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
            <h1 className="text-lg font-bold text-white flex items-center gap-3">
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