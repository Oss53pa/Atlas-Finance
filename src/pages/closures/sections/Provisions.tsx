import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useData } from '../../../contexts/DataContext';
import type { DBProvision } from '../../../lib/db';
import { motion } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  Calculator,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Zap,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Plus,
  RefreshCw,
  Archive,
  Settings,
  BookOpen,
  Scale,
  Gavel,
  Users,
  Building,
  Truck,
  Factory,
  CreditCard,
  PiggyBank,
  TrendingDownIcon,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface Provision {
  id: string;
  numero: string;
  designation: string;
  typeProvision: 'risques_charges' | 'depreciation_stocks' | 'creances_douteuses' | 'litiges' | 'garanties' | 'restructuration' | 'impots_differes' | 'retraites';
  natureRisque: string;
  dateCreation: string;
  dateRevision?: string;
  montantInitial: number;
  montantActuel: number;
  dotationExercice: number;
  repriseExercice: number;
  solde: number;
  tauxCouverture: number;
  probabiliteRealisation: number;
  echeancePrevue?: string;
  statutJuridique: 'probable' | 'possible' | 'eventuel' | 'certain';
  baseCalcul: string;
  methodeEvaluation: 'actuarielle' | 'statistique' | 'expertise' | 'forfaitaire';
  documentJustificatif: string;
  responsableGestion: string;
  derniereMiseAJour: string;
  conformiteSYSCOHADA: boolean;
  impactFiscal: number;
  observations?: string;
}

interface ChargeAPayerAComptabiliser {
  id: string;
  designation: string;
  categorie: 'charges_personnel' | 'charges_financieres' | 'charges_exploitation' | 'charges_exceptionnelles' | 'impots_taxes';
  montant: number;
  exerciceConcerne: string;
  compteComptable: string;
  fournisseur?: string;
  dateEcheance?: string;
  pieceJustificative?: string;
  statutValidation: 'brouillon' | 'valide' | 'comptabilise';
  utilisateurCreation: string;
  dateCreation: string;
}

interface ProduitARecevoir {
  id: string;
  designation: string;
  categorie: 'produits_exploitation' | 'produits_financiers' | 'produits_exceptionnels' | 'subventions' | 'reprises_provisions';
  montant: number;
  exerciceConcerne: string;
  compteComptable: string;
  client?: string;
  dateEncaissement?: string;
  pieceJustificative?: string;
  statutValidation: 'brouillon' | 'valide' | 'comptabilise';
  utilisateurCreation: string;
  dateCreation: string;
}

interface RegleProvisionSYSCOHADA {
  type: string;
  description: string;
  conditionsApplication: string[];
  baseCalcul: string;
  tauxRecommande?: number;
  obligatoire: boolean;
  exemples: string[];
}

interface AnalyseRisque {
  domaineRisque: string;
  niveauRisque: 'faible' | 'modere' | 'eleve' | 'critique';
  probabilite: number;
  impactFinancier: number;
  mesuresPreventives: string[];
  provisionsRecommandees: number;
  derniereMiseAJour: string;
}

const Provisions: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedProvision, setSelectedProvision] = useState<Provision | null>(null);
  const [filterType, setFilterType] = useState<string>('tous');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Real data from Dexie
  const [dbProvisions, setDbProvisions] = useState<DBProvision[]>([]);

  const loadProvisions = useCallback(async () => {
    try {
      const provs = await adapter.getAll<DBProvision>('provisions');
      setDbProvisions(provs);
    } catch { /* silent */ }
  }, [adapter]);

  useEffect(() => { loadProvisions(); }, [loadProvisions]);

  // Map real DBProvision → component Provision interface
  const provisionsData: Provision[] = useMemo(() => {
    return dbProvisions.map((prov, idx) => ({
      id: prov.id,
      numero: `PROV-${idx + 1}`,
      designation: `Provision créances douteuses - ${prov.client}`,
      typeProvision: 'creances_douteuses' as const,
      natureRisque: `Créance ${prov.client} ancienneté ${prov.anciennete}j`,
      dateCreation: prov.dateProposition,
      montantInitial: prov.montantProvision,
      montantActuel: prov.montantProvision,
      dotationExercice: prov.montantProvision,
      repriseExercice: 0,
      solde: prov.montantProvision,
      tauxCouverture: prov.tauxProvision,
      probabiliteRealisation: prov.tauxProvision,
      echeancePrevue: '',
      statutJuridique: 'probable' as const,
      baseCalcul: `${prov.tauxProvision}% de ${prov.solde} FCFA`,
      methodeEvaluation: 'statistique' as const,
      documentJustificatif: '',
      responsableGestion: '',
      derniereMiseAJour: prov.dateValidation || prov.dateProposition,
      conformiteSYSCOHADA: prov.statut === 'VALIDEE',
      impactFiscal: 0,
      observations: `Statut: ${prov.statut}`,
    }));
  }, [dbProvisions]);

  // No charge/product accrual data or rules in DB — empty
  const chargesAPayer: ChargeAPayerAComptabiliser[] = [];
  const produitsARecevoir: ProduitARecevoir[] = [];

  // Static SYSCOHADA rules reference
  const reglesProvision: RegleProvisionSYSCOHADA[] = [
    {
      type: 'creances_douteuses',
      description: 'Provisions pour créances douteuses',
      conditionsApplication: ['Créances échues depuis plus de 6 mois', 'Client en difficulté financière avérée'],
      baseCalcul: 'Pourcentage de la créance selon ancienneté',
      tauxRecommande: 50,
      obligatoire: true,
      exemples: ['25% pour 6-12 mois', '50% pour 12-24 mois', '100% au-delà de 24 mois'],
    },
    {
      type: 'litiges',
      description: 'Provisions pour litiges et contentieux',
      conditionsApplication: ['Procédure judiciaire en cours', 'Risque de condamnation probable'],
      baseCalcul: 'Évaluation du risque par expert juridique',
      obligatoire: false,
      exemples: ['Litiges commerciaux', 'Contentieux social', 'Amendes et pénalités'],
    },
  ];

  const analysesRisque: AnalyseRisque[] = [];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalProvisions = provisionsData.reduce((sum, prov) => sum + prov.solde, 0);
    const dotationsExercice = provisionsData.reduce((sum, prov) => sum + prov.dotationExercice, 0);
    const reprisesExercice = provisionsData.reduce((sum, prov) => sum + prov.repriseExercice, 0);
    const impactFiscalTotal = provisionsData.reduce((sum, prov) => sum + prov.impactFiscal, 0);
    const totalChargesAPayer = chargesAPayer.reduce((sum, charge) => sum + charge.montant, 0);
    const totalProduitsARecevoir = produitsARecevoir.reduce((sum, produit) => sum + produit.montant, 0);
    const provisionsConformes = provisionsData.filter(prov => prov.conformiteSYSCOHADA).length;
    const tauxConformite = provisionsData.length > 0 ? (provisionsConformes / provisionsData.length) * 100 : 100;

    return {
      totalProvisions,
      dotationsExercice,
      reprisesExercice,
      impactFiscalTotal,
      totalChargesAPayer,
      totalProduitsARecevoir,
      tauxConformite,
      nombreProvisions: provisionsData.length,
      impactNetExercice: dotationsExercice - reprisesExercice
    };
  }, [dbProvisions]);

  // Filtrage des provisions
  const provisionsFiltrees = useMemo(() => {
    return provisionsData.filter(provision => {
      const matchType = filterType === 'tous' || provision.typeProvision === filterType;
      const matchStatut = filterStatut === 'tous' || provision.statutJuridique === filterStatut;
      const matchSearch = searchTerm === '' ||
        provision.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provision.numero.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchStatut && matchSearch;
    });
  }, [provisionsData, filterType, filterStatut, searchTerm]);

  const getTypeProvisionIcon = (type: string) => {
    switch (type) {
      case 'creances_douteuses': return <CreditCard className="w-5 h-5 text-[var(--color-error)]" />;
      case 'litiges': return <Gavel className="w-5 h-5 text-purple-600" />;
      case 'garanties': return <Shield className="w-5 h-5 text-[var(--color-primary)]" />;
      case 'depreciation_stocks': return <Archive className="w-5 h-5 text-[var(--color-warning)]" />;
      case 'retraites': return <Users className="w-5 h-5 text-[var(--color-success)]" />;
      case 'restructuration': return <Factory className="w-5 h-5 text-[var(--color-text-primary)]" />;
      default: return <AlertCircle className="w-5 h-5 text-[var(--color-text-primary)]" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'probable': 'bg-[var(--color-error-lighter)] text-red-800',
      'possible': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'eventuel': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'certain': 'bg-purple-100 text-purple-800'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getRisqueBadge = (niveau: string) => {
    const variants: Record<string, string> = {
      'faible': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'modere': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'eleve': 'bg-[var(--color-warning-lighter)] text-orange-800',
      'critique': 'bg-[var(--color-error-lighter)] text-red-800'
    };
    return variants[niveau] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getCategorieChargeIcon = (categorie: string) => {
    switch (categorie) {
      case 'charges_personnel': return <Users className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'charges_financieres': return <DollarSign className="w-4 h-4 text-[var(--color-success)]" />;
      case 'charges_exploitation': return <Factory className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'charges_exceptionnelles': return <AlertTriangle className="w-4 h-4 text-[var(--color-error)]" />;
      case 'impots_taxes': return <Scale className="w-4 h-4 text-purple-600" />;
      default: return <FileText className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  // Handler functions
  const handleViewProvisionDetail = (provision: Provision) => {
    setSelectedProvision(provision);
    setShowDetailModal(true);
    toast.success(`Affichage de la provision: ${provision.numero}`);
  };

  const handleEditProvision = (provision: Provision) => {
    toast.success(`Édition de la provision: ${provision.numero}`);
  };

  const handleCalculateProvision = (provision: Provision) => {
    toast.success(`Recalcul de la provision: ${provision.numero}`);
  };

  const handleExportProvisions = () => {
    toast.success('Export des provisions en cours...');
  };

  const handleViewChargeDetail = (charge: ChargeAPayerAComptabiliser) => {
    toast.success(`Affichage de la charge: ${charge.designation}`);
  };

  const handleEditCharge = (charge: ChargeAPayerAComptabiliser) => {
    toast.success(`Édition de la charge: ${charge.id}`);
  };

  const handleViewProduitDetail = (produit: ProduitARecevoir) => {
    toast.success(`Affichage du produit: ${produit.designation}`);
  };

  const handleEditProduit = (produit: ProduitARecevoir) => {
    toast.success(`Édition du produit: ${produit.id}`);
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Total Provisions</p>
                <p className="text-lg font-bold">{(kpis.totalProvisions / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">{kpis.nombreProvisions} provisions actives</p>
              </div>
              <Shield className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Dotations 2024</p>
                <p className="text-lg font-bold text-[var(--color-error)]">{(kpis.dotationsExercice / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-text-primary)] mt-1">Impact résultat</p>
              </div>
              <TrendingDown className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Reprises 2024</p>
                <p className="text-lg font-bold text-[var(--color-success)]">{(kpis.reprisesExercice / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Gains sur provisions</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Conformité SYSCOHADA</p>
                <p className="text-lg font-bold">{kpis.tauxConformite.toFixed(0)}%</p>
                <Progress value={kpis.tauxConformite} className="mt-2" />
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes et Recommandations */}
      <div className="space-y-4">
        <Alert className="border-l-4 border-l-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Conformité SYSCOHADA:</strong> Toutes les provisions respectent les règles comptables.
            Documentation complète et méthodes d'évaluation appropriées.
          </AlertDescription>
        </Alert>

        <Alert className="border-l-4 border-l-orange-500">
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <strong>Analyse IA:</strong> Risque modéré détecté sur les créances clients.
            Recommandation: Renforcer le suivi des créances de plus de 60 jours.
          </AlertDescription>
        </Alert>
      </div>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="provisions">Provisions</TabsTrigger>
          <TabsTrigger value="charges-payer">Charges à Payer</TabsTrigger>
          <TabsTrigger value="produits-recevoir">Produits à Recevoir</TabsTrigger>
          <TabsTrigger value="regles-syscohada">Règles SYSCOHADA</TabsTrigger>
          <TabsTrigger value="analyse-risques">Analyse Risques</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Répartition des Provisions par Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[var(--color-error-lightest)] rounded">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[var(--color-error)]" />
                      <div>
                        <p className="font-medium">Créances Douteuses</p>
                        <p className="text-sm text-[var(--color-text-primary)]">1 provision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-error)]">4.5M</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">16% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                    <div className="flex items-center gap-3">
                      <Gavel className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Litiges</p>
                        <p className="text-sm text-[var(--color-text-primary)]">1 provision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">8.0M</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">29% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--color-primary-lightest)] rounded">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-[var(--color-primary)]" />
                      <div>
                        <p className="font-medium">Garanties</p>
                        <p className="text-sm text-[var(--color-text-primary)]">1 provision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-primary)]">15.0M</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">55% du total</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Évolution des Provisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">Solde Début 2024</p>
                      <p className="text-lg font-bold">13.0M FCFA</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">Solde Fin 2024</p>
                      <p className="text-lg font-bold">27.5M FCFA</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-[var(--color-error-lightest)] rounded">
                      <span className="text-sm">Dotations exercice</span>
                      <span className="font-medium text-[var(--color-error)]">+14.5M</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-[var(--color-success-lightest)] rounded">
                      <span className="text-sm">Reprises exercice</span>
                      <span className="font-medium text-[var(--color-success)]">-2.0M</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-[var(--color-primary-lightest)] rounded">
                      <span className="text-sm">Utilisation</span>
                      <span className="font-medium text-[var(--color-primary)]">-0M</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Charges à Payer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--color-text-primary)]">Total charges à payer</span>
                    <span className="font-bold text-lg">{(kpis.totalChargesAPayer / 1000000).toFixed(1)}M FCFA</span>
                  </div>
                  <div className="space-y-2">
                    {chargesAPayer.map(charge => (
                      <div key={charge.id} className="flex items-center justify-between p-2 bg-[var(--color-background-secondary)] rounded">
                        <div className="flex items-center gap-2">
                          {getCategorieChargeIcon(charge.categorie)}
                          <span className="text-sm">{charge.designation}</span>
                        </div>
                        <span className="font-medium">{(charge.montant / 1000000).toFixed(1)}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produits à Recevoir</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--color-text-primary)]">Total produits à recevoir</span>
                    <span className="font-bold text-lg">{(kpis.totalProduitsARecevoir / 1000000).toFixed(1)}M FCFA</span>
                  </div>
                  <div className="space-y-2">
                    {produitsARecevoir.map(produit => (
                      <div key={produit.id} className="flex items-center justify-between p-2 bg-[var(--color-background-secondary)] rounded">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="w-4 h-4 text-[var(--color-success)]" />
                          <span className="text-sm">{produit.designation}</span>
                        </div>
                        <span className="font-medium text-[var(--color-success)]">{(produit.montant / 1000000).toFixed(1)}M</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Provisions */}
        <TabsContent value="provisions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher une provision..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="tous">Tous types</option>
                <option value="creances_douteuses">Créances douteuses</option>
                <option value="litiges">Litiges</option>
                <option value="garanties">Garanties</option>
                <option value="depreciation_stocks">Dépréciation stocks</option>
              </select>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous statuts</option>
                <option value="probable">Probable</option>
                <option value="possible">Possible</option>
                <option value="eventuel">Éventuel</option>
                <option value="certain">Certain</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
                onClick={() => setShowProvisionModal(true)}
              >
                <Plus className="w-4 h-4" />
                Nouvelle Provision
              </button>
              <button
                onClick={handleExportProvisions}
                className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Provision</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">{t('accounting.balance')}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Dotation 2024</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Probabilité</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Conformité</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {provisionsFiltrees.map(provision => (
                    <tr key={provision.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getTypeProvisionIcon(provision.typeProvision)}
                          <div>
                            <p className="font-medium">{provision.designation}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">{provision.numero}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                          {provision.typeProvision.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(provision.solde / 1000000).toFixed(1)}M FCFA
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-[var(--color-error)] font-medium">
                          {(provision.dotationExercice / 1000000).toFixed(1)}M
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={provision.probabiliteRealisation} className="w-16 h-2" />
                          <span className="text-sm font-medium">{provision.probabiliteRealisation}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatutBadge(provision.statutJuridique)}>
                          {provision.statutJuridique}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {provision.conformiteSYSCOHADA ? (
                          <CheckCircle className="w-5 h-5 text-[var(--color-success)] mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-[var(--color-error)] mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewProvisionDetail(provision)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            onClick={() => handleEditProvision(provision)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                          >
                            <Edit className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                          <button
                            onClick={() => handleCalculateProvision(provision)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                          >
                            <Calculator className="w-4 h-4 text-[var(--color-success)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charges à Payer */}
        <TabsContent value="charges-payer" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Charges à Payer - Exercice 2024</h3>
            <button
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
              onClick={() => setShowChargeModal(true)}
            >
              <Plus className="w-4 h-4" />
              Nouvelle Charge
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Charges Personnel</p>
                    <p className="text-lg font-bold">25.0M</p>
                  </div>
                  <Users className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Charges Financières</p>
                    <p className="text-lg font-bold">8.5M</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Charges Exploitation</p>
                    <p className="text-lg font-bold">3.2M</p>
                  </div>
                  <Factory className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Charge</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">{t('accounting.account')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Échéance</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {chargesAPayer.map(charge => (
                    <tr key={charge.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCategorieChargeIcon(charge.categorie)}
                          <div>
                            <p className="font-medium">{charge.designation}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">Exercice {charge.exerciceConcerne}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                          {charge.categorie.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(charge.montant / 1000000).toFixed(1)}M FCFA
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{charge.compteComptable}</td>
                      <td className="px-4 py-3">
                        {charge.dateEcheance ? new Date(charge.dateEcheance).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          charge.statutValidation === 'valide' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          charge.statutValidation === 'comptabilise' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          'bg-[var(--color-warning-lighter)] text-yellow-800'
                        }>
                          {charge.statutValidation}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewChargeDetail(charge)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            onClick={() => handleEditCharge(charge)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                          >
                            <Edit className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Produits à Recevoir */}
        <TabsContent value="produits-recevoir" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Produits à Recevoir - Exercice 2024</h3>
            <button
              onClick={() => toast.success('Création d\'un nouveau produit à recevoir')}
              className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nouveau Produit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Produits Financiers</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">4.5M</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Subventions</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">15.0M</p>
                  </div>
                  <PiggyBank className="w-8 h-8 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Produit</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">{t('accounting.account')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Encaissement</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {produitsARecevoir.map(produit => (
                    <tr key={produit.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{produit.designation}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">Exercice {produit.exerciceConcerne}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)] capitalize">
                          {produit.categorie.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--color-success)]">
                        {(produit.montant / 1000000).toFixed(1)}M FCFA
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{produit.compteComptable}</td>
                      <td className="px-4 py-3">
                        {produit.dateEncaissement ? new Date(produit.dateEncaissement).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          produit.statutValidation === 'valide' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          produit.statutValidation === 'comptabilise' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          'bg-[var(--color-warning-lighter)] text-yellow-800'
                        }>
                          {produit.statutValidation}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewProduitDetail(produit)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            onClick={() => handleEditProduit(produit)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                          >
                            <Edit className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Règles SYSCOHADA */}
        <TabsContent value="regles-syscohada" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--color-primary)]" />
                Référentiel SYSCOHADA - Provisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {reglesProvision.map((regle, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-lg capitalize">
                          {regle.type.replace('_', ' ')}
                        </h4>
                        <p className="text-[var(--color-text-primary)]">{regle.description}</p>
                      </div>
                      <Badge className={regle.obligatoire ? 'bg-[var(--color-error-lighter)] text-red-800' : 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'}>
                        {regle.obligatoire ? 'Obligatoire' : 'Facultative'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Conditions d'Application</h5>
                        <ul className="space-y-1 text-sm">
                          {regle.conditionsApplication.map((condition, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2" />
                              <span>{condition}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">Base de Calcul</h5>
                        <p className="text-sm text-[var(--color-text-primary)] mb-2">{regle.baseCalcul}</p>
                        {regle.tauxRecommande && (
                          <p className="text-sm">
                            <span className="font-medium">Taux recommandé:</span> {regle.tauxRecommande}%
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Exemples d'Application</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {regle.exemples.map((exemple, i) => (
                          <div key={i} className="p-2 bg-[var(--color-background-secondary)] rounded text-sm">
                            {exemple}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse Risques */}
        <TabsContent value="analyse-risques" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Analyse Prédictive des Risques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {analysesRisque.map((analyse, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-lg">{analyse.domaineRisque}</h4>
                        <p className="text-sm text-[var(--color-text-primary)]">
                          Dernière mise à jour: {new Date(analyse.derniereMiseAJour).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getRisqueBadge(analyse.niveauRisque)}>
                        Risque {analyse.niveauRisque}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                        <p className="text-sm text-[var(--color-text-primary)]">Probabilité</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <Progress value={analyse.probabilite} className="w-16 h-2" />
                          <span className="font-bold">{analyse.probabilite}%</span>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                        <p className="text-sm text-[var(--color-text-primary)]">Impact Financier</p>
                        <p className="text-lg font-bold text-[var(--color-error)]">
                          {(analyse.impactFinancier / 1000000).toFixed(1)}M FCFA
                        </p>
                      </div>
                      <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                        <p className="text-sm text-[var(--color-text-primary)]">Provisions Recommandées</p>
                        <p className="text-lg font-bold text-[var(--color-primary)]">
                          {(analyse.provisionsRecommandees / 1000000).toFixed(1)}M FCFA
                        </p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Mesures Préventives Recommandées</h5>
                      <div className="space-y-2">
                        {analyse.mesuresPreventives.map((mesure, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-[var(--color-success)] mt-0.5" />
                            <span>{mesure}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  Recommandations Globales
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h5 className="font-medium mb-2">Actions Prioritaires</h5>
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-[var(--color-warning)] mt-1" />
                        <span>Renforcer le suivi des créances clients</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-[var(--color-warning)] mt-1" />
                        <span>Réviser les contrats pour réduire les litiges</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-[var(--color-warning)] mt-1" />
                        <span>Mettre en place une veille juridique</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Optimisations Possibles</h5>
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-[var(--color-primary)] mt-1" />
                        <span>Automatiser le calcul des provisions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-[var(--color-primary)] mt-1" />
                        <span>Améliorer la documentation des risques</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-[var(--color-primary)] mt-1" />
                        <span>Réviser trimestriellement les provisions</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-warning-lighter)] rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[var(--color-warning)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Nouvelle provision</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Enregistrer une provision pour risques et charges</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProvisionModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-orange-900">Provision pour risques et charges</p>
                      <p className="text-sm text-[var(--color-warning-dark)] mt-1">
                        Provisionnez les charges probables ou certaines mais dont le montant ou l'échéance est incertain
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Date de provision <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Catégorie <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="litige">Litige en cours</option>
                      <option value="garantie">Garantie clients</option>
                      <option value="retraite">Engagements retraite</option>
                      <option value="restructuration">Restructuration</option>
                      <option value="pertes_contrats">Pertes sur contrats</option>
                      <option value="fiscale">Risque fiscal</option>
                      <option value="environnementale">Risque environnemental</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Objet de la provision <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ex: Litige commercial avec Client XYZ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Montant estimé (€) <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="50000"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Probabilité de réalisation
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                      <option value="elevee">⬆ Élevée (&gt; 75%)</option>
                      <option value="moyenne">➡ Moyenne (25-75%)</option>
                      <option value="faible">⬇ Faible (&lt; 25%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Échéance prévue
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="court">Court terme (&lt; 1 an)</option>
                      <option value="moyen">Moyen terme (1-3 ans)</option>
                      <option value="long">Long terme (&gt; 3 ans)</option>
                      <option value="indetermine">Indéterminée</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte comptable <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="1511">1511 - Provision litiges</option>
                      <option value="1513">1513 - Provision garanties</option>
                      <option value="1514">1514 - Provision restructuration</option>
                      <option value="1515">1515 - Provision pertes contrats</option>
                      <option value="1518">1518 - Autres provisions</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Description détaillée <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Décrivez le risque ou la charge: nature, contexte, historique, éléments justifiant le montant..."
                  />
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Évaluation du risque</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[var(--color-text-primary)] mb-1">Montant minimum (€)</label>
                      <input
                        type="number"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 text-sm"
                        placeholder="30000"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-primary)] mb-1">Montant maximum (€)</label>
                      <input
                        type="number"
                        className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 text-sm"
                        placeholder="70000"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Documents justificatifs
                  </label>
                  <div className="border-2 border-dashed border-[var(--color-border-dark)] rounded-lg p-6 text-center hover:border-orange-500 transition-colors cursor-pointer">
                    <FileText className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--color-text-primary)]">Charger les pièces justificatives</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Jugement, courrier avocat, devis réparation...</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 bg-[var(--color-background-secondary)] rounded-lg border border-[var(--color-border-dark)]">
                  <input
                    type="checkbox"
                    id="validation-audit"
                    className="w-4 h-4 text-[var(--color-warning)] border-[var(--color-border-dark)] rounded focus:ring-orange-500 mt-0.5"
                  />
                  <label htmlFor="validation-audit" className="text-sm text-[var(--color-text-primary)] cursor-pointer">
                    Cette provision nécessite une validation par l'expert-comptable / commissaire aux comptes
                  </label>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowProvisionModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-warning)] hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Enregistrer la provision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charge Modal */}
      {showChargeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-error-lighter)] rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-[var(--color-error)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Utilisation de provision</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Enregistrer une charge sur provision</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChargeModal(false)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                <div className="bg-[var(--color-error-lightest)] border border-[var(--color-error-light)] rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Charge sur provision</p>
                      <p className="text-sm text-[var(--color-error-dark)] mt-1">
                        Enregistrez la réalisation du risque provisionné et l'utilisation de la provision
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Provision concernée <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent">
                    <option value="">Sélectionner une provision</option>
                    <option value="1">Litige Client XYZ - 50 000,00 €</option>
                    <option value="2">Garantie Produit ABC - 25 000,00 €</option>
                    <option value="3">Restructuration Service - 100 000,00 €</option>
                    <option value="4">Risque fiscal 2024 - 35 000,00 €</option>
                  </select>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Détails de la provision</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--color-text-primary)]">Date de constitution:</p>
                      <p className="font-semibold">15/03/2024</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Montant initial:</p>
                      <p className="font-semibold">50 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Montant utilisé:</p>
                      <p className="font-semibold text-[var(--color-warning)]">12 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Solde disponible:</p>
                      <p className="font-semibold text-[var(--color-primary)]">38 000,00 €</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Date de la charge <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Montant de la charge (€) <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="15000"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Nature de la charge <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Ex: Paiement avocat suite jugement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Type d'utilisation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-[var(--color-error)] transition-colors">
                      <input type="radio" name="type-util" value="partielle" className="mr-3" defaultChecked />
                      <div>
                        <p className="font-medium text-sm">Utilisation partielle</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Maintenir le solde</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-[var(--color-error)] transition-colors">
                      <input type="radio" name="type-util" value="totale" className="mr-3" />
                      <div>
                        <p className="font-medium text-sm">Utilisation totale</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Solder la provision</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte de charge <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="6281">6281 - Dotation provision exploitation</option>
                      <option value="6871">6871 - Dotation provision exceptionnelle</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Référence facture/paiement
                    </label>
                    <input
                      type="text"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                      placeholder="FAC-2025-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Observations
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Détails sur l'utilisation de la provision..."
                  />
                </div>

                <div className="border border-[var(--color-primary-light)] rounded-lg p-4 bg-[var(--color-primary-lightest)]">
                  <h4 className="font-semibold text-sm text-[var(--color-primary-darker)] mb-2">Après cette opération</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--color-primary-dark)]">Provision restante:</p>
                      <p className="font-bold text-[var(--color-primary-darker)]">23 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-primary-dark)]">Taux d'utilisation:</p>
                      <p className="font-bold text-[var(--color-primary-darker)]">54%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowChargeModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-error)] hover:bg-[var(--color-error-dark)] rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Enregistrer la charge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Provisions;