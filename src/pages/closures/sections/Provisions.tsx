import React, { useState, useMemo } from 'react';
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
import { Progress } from '../../../components/ui/progress';

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
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedProvision, setSelectedProvision] = useState<Provision | null>(null);
  const [filterType, setFilterType] = useState<string>('tous');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showChargeModal, setShowChargeModal] = useState(false);

  // Données simulées
  const mockProvisions: Provision[] = [
    {
      id: '1',
      numero: 'PROV-2024-001',
      designation: 'Provision pour créances douteuses - Client KOUASSI',
      typeProvision: 'creances_douteuses',
      natureRisque: 'Impayé client dépassant 90 jours',
      dateCreation: '2024-03-15',
      dateRevision: '2024-12-01',
      montantInitial: 3000000,
      montantActuel: 4500000,
      dotationExercice: 1500000,
      repriseExercice: 0,
      solde: 4500000,
      tauxCouverture: 75,
      probabiliteRealisation: 80,
      echeancePrevue: '2025-06-30',
      statutJuridique: 'probable',
      baseCalcul: '75% de la créance échue depuis plus de 90 jours',
      methodeEvaluation: 'statistique',
      documentJustificatif: 'Analyse aging des créances',
      responsableGestion: 'Direction Financière',
      derniereMiseAJour: '2024-12-20',
      conformiteSYSCOHADA: true,
      impactFiscal: -1350000,
      observations: 'Client en difficulté financière confirmée'
    },
    {
      id: '2',
      numero: 'PROV-2024-002',
      designation: 'Provision pour litige commercial - Fournisseur ABC',
      typeProvision: 'litiges',
      natureRisque: 'Litige contractuel en cours',
      dateCreation: '2024-07-10',
      montantInitial: 8000000,
      montantActuel: 8000000,
      dotationExercice: 8000000,
      repriseExercice: 0,
      solde: 8000000,
      tauxCouverture: 100,
      probabiliteRealisation: 60,
      echeancePrevue: '2025-12-31',
      statutJuridique: 'possible',
      baseCalcul: 'Évaluation avocat + coûts de procédure',
      methodeEvaluation: 'expertise',
      documentJustificatif: 'Rapport avocat conseil',
      responsableGestion: 'Direction Juridique',
      derniereMiseAJour: '2024-12-15',
      conformiteSYSCOHADA: true,
      impactFiscal: 0,
      observations: 'Procédure en cours devant le tribunal de commerce'
    },
    {
      id: '3',
      numero: 'PROV-2024-003',
      designation: 'Provision pour garanties produits vendus',
      typeProvision: 'garanties',
      natureRisque: 'Garantie contractuelle sur produits',
      dateCreation: '2024-01-01',
      dateRevision: '2024-12-01',
      montantInitial: 12000000,
      montantActuel: 15000000,
      dotationExercice: 5000000,
      repriseExercice: 2000000,
      solde: 15000000,
      tauxCouverture: 3,
      probabiliteRealisation: 95,
      echeancePrevue: '2026-12-31',
      statutJuridique: 'probable',
      baseCalcul: '3% du chiffre d\'affaires produits avec garantie',
      methodeEvaluation: 'statistique',
      documentJustificatif: 'Historique des retours produits',
      responsableGestion: 'Direction Commerciale',
      derniereMiseAJour: '2024-12-20',
      conformiteSYSCOHADA: true,
      impactFiscal: -4500000,
      observations: 'Basé sur historique 5 ans des retours'
    }
  ];

  const mockChargesAPayer: ChargeAPayerAComptabiliser[] = [
    {
      id: '1',
      designation: 'Congés payés non pris exercice 2024',
      categorie: 'charges_personnel',
      montant: 25000000,
      exerciceConcerne: '2024',
      compteComptable: '428100',
      dateEcheance: '2025-03-31',
      statutValidation: 'valide',
      utilisateurCreation: 'Marie KOUAME',
      dateCreation: '2024-12-20'
    },
    {
      id: '2',
      designation: 'Intérêts courus emprunt bancaire',
      categorie: 'charges_financieres',
      montant: 8500000,
      exerciceConcerne: '2024',
      compteComptable: '416000',
      fournisseur: 'SGBCI',
      dateEcheance: '2025-01-15',
      statutValidation: 'valide',
      utilisateurCreation: 'Paul KONE',
      dateCreation: '2024-12-19'
    },
    {
      id: '3',
      designation: 'Facture électricité décembre 2024',
      categorie: 'charges_exploitation',
      montant: 3200000,
      exerciceConcerne: '2024',
      compteComptable: '605100',
      fournisseur: 'CIE',
      dateEcheance: '2025-01-10',
      statutValidation: 'brouillon',
      utilisateurCreation: 'Sophie DIABATE',
      dateCreation: '2024-12-20'
    }
  ];

  const mockProduitsARecevoir: ProduitARecevoir[] = [
    {
      id: '1',
      designation: 'Produits financiers placement bancaire',
      categorie: 'produits_financiers',
      montant: 4500000,
      exerciceConcerne: '2024',
      compteComptable: '438100',
      client: 'BACI',
      dateEncaissement: '2025-01-05',
      statutValidation: 'valide',
      utilisateurCreation: 'Jean TRAORE',
      dateCreation: '2024-12-20'
    },
    {
      id: '2',
      designation: 'Subvention formation professionnelle',
      categorie: 'subventions',
      montant: 15000000,
      exerciceConcerne: '2024',
      compteComptable: '131000',
      client: 'FDFP',
      dateEncaissement: '2025-02-28',
      statutValidation: 'valide',
      utilisateurCreation: 'Marc KOFFI',
      dateCreation: '2024-12-18'
    }
  ];

  const mockRegles: RegleProvisionSYSCOHADA[] = [
    {
      type: 'creances_douteuses',
      description: 'Provisions pour créances douteuses',
      conditionsApplication: [
        'Créances échues depuis plus de 6 mois',
        'Client en difficulté financière avérée',
        'Procédures de recouvrement infructueuses'
      ],
      baseCalcul: 'Pourcentage de la créance selon ancienneté',
      tauxRecommande: 50,
      obligatoire: true,
      exemples: ['25% pour 6-12 mois', '50% pour 12-24 mois', '100% au-delà de 24 mois']
    },
    {
      type: 'depreciation_stocks',
      description: 'Provisions pour dépréciation des stocks',
      conditionsApplication: [
        'Stocks obsolètes ou détériorés',
        'Valeur nette réalisable inférieure au coût',
        'Rotation très lente'
      ],
      baseCalcul: 'Différence entre coût et valeur nette réalisable',
      obligatoire: true,
      exemples: ['Stocks périmés: 100%', 'Rotation lente: 10-30%', 'Obsolescence: 50-100%']
    },
    {
      type: 'litiges',
      description: 'Provisions pour litiges et contentieux',
      conditionsApplication: [
        'Procédure judiciaire en cours',
        'Risque de condamnation probable',
        'Montant évaluable avec fiabilité'
      ],
      baseCalcul: 'Évaluation du risque par expert juridique',
      obligatoire: false,
      exemples: ['Litiges commerciaux', 'Contentieux social', 'Amendes et pénalités']
    }
  ];

  const mockAnalysesRisque: AnalyseRisque[] = [
    {
      domaineRisque: 'Créances clients',
      niveauRisque: 'modere',
      probabilite: 75,
      impactFinancier: 12000000,
      mesuresPreventives: [
        'Renforcement du suivi des créances',
        'Révision des conditions de crédit',
        'Assurance crédit pour gros clients'
      ],
      provisionsRecommandees: 4500000,
      derniereMiseAJour: '2024-12-20'
    },
    {
      domaineRisque: 'Litiges commerciaux',
      niveauRisque: 'eleve',
      probabilite: 60,
      impactFinancier: 8000000,
      mesuresPreventives: [
        'Révision des contrats types',
        'Formation équipes commerciales',
        'Médiation préventive'
      ],
      provisionsRecommandees: 8000000,
      derniereMiseAJour: '2024-12-15'
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalProvisions = mockProvisions.reduce((sum, prov) => sum + prov.solde, 0);
    const dotationsExercice = mockProvisions.reduce((sum, prov) => sum + prov.dotationExercice, 0);
    const reprisesExercice = mockProvisions.reduce((sum, prov) => sum + prov.repriseExercice, 0);
    const impactFiscalTotal = mockProvisions.reduce((sum, prov) => sum + prov.impactFiscal, 0);
    const totalChargesAPayer = mockChargesAPayer.reduce((sum, charge) => sum + charge.montant, 0);
    const totalProduitsARecevoir = mockProduitsARecevoir.reduce((sum, produit) => sum + produit.montant, 0);
    const provisionsConformes = mockProvisions.filter(prov => prov.conformiteSYSCOHADA).length;
    const tauxConformite = provisionsConformes / mockProvisions.length * 100;

    return {
      totalProvisions,
      dotationsExercice,
      reprisesExercice,
      impactFiscalTotal,
      totalChargesAPayer,
      totalProduitsARecevoir,
      tauxConformite,
      nombreProvisions: mockProvisions.length,
      impactNetExercice: dotationsExercice - reprisesExercice
    };
  }, []);

  // Filtrage des provisions
  const provisionsFiltrees = useMemo(() => {
    return mockProvisions.filter(provision => {
      const matchType = filterType === 'tous' || provision.typeProvision === filterType;
      const matchStatut = filterStatut === 'tous' || provision.statutJuridique === filterStatut;
      const matchSearch = searchTerm === '' ||
        provision.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provision.numero.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchStatut && matchSearch;
    });
  }, [filterType, filterStatut, searchTerm]);

  const getTypeProvisionIcon = (type: string) => {
    switch (type) {
      case 'creances_douteuses': return <CreditCard className="w-5 h-5 text-red-600" />;
      case 'litiges': return <Gavel className="w-5 h-5 text-purple-600" />;
      case 'garanties': return <Shield className="w-5 h-5 text-blue-600" />;
      case 'depreciation_stocks': return <Archive className="w-5 h-5 text-orange-600" />;
      case 'retraites': return <Users className="w-5 h-5 text-green-600" />;
      case 'restructuration': return <Factory className="w-5 h-5 text-gray-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'probable': 'bg-red-100 text-red-800',
      'possible': 'bg-yellow-100 text-yellow-800',
      'eventuel': 'bg-blue-100 text-blue-800',
      'certain': 'bg-purple-100 text-purple-800'
    };
    return variants[statut] || 'bg-gray-100 text-gray-800';
  };

  const getRisqueBadge = (niveau: string) => {
    const variants: Record<string, string> = {
      'faible': 'bg-green-100 text-green-800',
      'modere': 'bg-yellow-100 text-yellow-800',
      'eleve': 'bg-orange-100 text-orange-800',
      'critique': 'bg-red-100 text-red-800'
    };
    return variants[niveau] || 'bg-gray-100 text-gray-800';
  };

  const getCategorieChargeIcon = (categorie: string) => {
    switch (categorie) {
      case 'charges_personnel': return <Users className="w-4 h-4 text-blue-600" />;
      case 'charges_financieres': return <DollarSign className="w-4 h-4 text-green-600" />;
      case 'charges_exploitation': return <Factory className="w-4 h-4 text-orange-600" />;
      case 'charges_exceptionnelles': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'impots_taxes': return <Scale className="w-4 h-4 text-purple-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Provisions</p>
                <p className="text-2xl font-bold">{(kpis.totalProvisions / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-blue-600 mt-1">{kpis.nombreProvisions} provisions actives</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dotations 2024</p>
                <p className="text-2xl font-bold text-red-600">{(kpis.dotationsExercice / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-gray-600 mt-1">Impact résultat</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Reprises 2024</p>
                <p className="text-2xl font-bold text-green-600">{(kpis.reprisesExercice / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-green-600 mt-1">Gains sur provisions</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conformité SYSCOHADA</p>
                <p className="text-2xl font-bold">{kpis.tauxConformite.toFixed(0)}%</p>
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
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-red-600" />
                      <div>
                        <p className="font-medium">Créances Douteuses</p>
                        <p className="text-sm text-gray-600">1 provision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">4.5M</p>
                      <p className="text-sm text-gray-500">16% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                    <div className="flex items-center gap-3">
                      <Gavel className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Litiges</p>
                        <p className="text-sm text-gray-600">1 provision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">8.0M</p>
                      <p className="text-sm text-gray-500">29% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Garanties</p>
                        <p className="text-sm text-gray-600">1 provision</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">15.0M</p>
                      <p className="text-sm text-gray-500">55% du total</p>
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
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Solde Début 2024</p>
                      <p className="text-2xl font-bold">13.0M FCFA</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Solde Fin 2024</p>
                      <p className="text-2xl font-bold">27.5M FCFA</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm">Dotations exercice</span>
                      <span className="font-medium text-red-600">+14.5M</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="text-sm">Reprises exercice</span>
                      <span className="font-medium text-green-600">-2.0M</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span className="text-sm">Utilisation</span>
                      <span className="font-medium text-blue-600">-0M</span>
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
                    <span className="text-sm text-gray-600">Total charges à payer</span>
                    <span className="font-bold text-lg">{(kpis.totalChargesAPayer / 1000000).toFixed(1)}M FCFA</span>
                  </div>
                  <div className="space-y-2">
                    {mockChargesAPayer.map(charge => (
                      <div key={charge.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
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
                    <span className="text-sm text-gray-600">Total produits à recevoir</span>
                    <span className="font-bold text-lg">{(kpis.totalProduitsARecevoir / 1000000).toFixed(1)}M FCFA</span>
                  </div>
                  <div className="space-y-2">
                    {mockProduitsARecevoir.map(produit => (
                      <div key={produit.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="w-4 h-4 text-green-600" />
                          <span className="text-sm">{produit.designation}</span>
                        </div>
                        <span className="font-medium text-green-600">{(produit.montant / 1000000).toFixed(1)}M</span>
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                onClick={() => setShowProvisionModal(true)}
              >
                <Plus className="w-4 h-4" />
                Nouvelle Provision
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Provision</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Solde</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Dotation 2024</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Probabilité</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Conformité</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {provisionsFiltrees.map(provision => (
                    <tr key={provision.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getTypeProvisionIcon(provision.typeProvision)}
                          <div>
                            <p className="font-medium">{provision.designation}</p>
                            <p className="text-sm text-gray-500">{provision.numero}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-800 capitalize">
                          {provision.typeProvision.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(provision.solde / 1000000).toFixed(1)}M FCFA
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-red-600 font-medium">
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
                          <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Calculator className="w-4 h-4 text-green-600" />
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
                    <p className="text-sm text-gray-600">Charges Personnel</p>
                    <p className="text-2xl font-bold">25.0M</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Charges Financières</p>
                    <p className="text-2xl font-bold">8.5M</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Charges Exploitation</p>
                    <p className="text-2xl font-bold">3.2M</p>
                  </div>
                  <Factory className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Charge</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Compte</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Échéance</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockChargesAPayer.map(charge => (
                    <tr key={charge.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCategorieChargeIcon(charge.categorie)}
                          <div>
                            <p className="font-medium">{charge.designation}</p>
                            <p className="text-sm text-gray-500">Exercice {charge.exerciceConcerne}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-800 capitalize">
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
                          charge.statutValidation === 'valide' ? 'bg-green-100 text-green-800' :
                          charge.statutValidation === 'comptabilise' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {charge.statutValidation}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4 text-blue-600" />
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
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nouveau Produit
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Produits Financiers</p>
                    <p className="text-2xl font-bold text-green-600">4.5M</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Subventions</p>
                    <p className="text-2xl font-bold text-green-600">15.0M</p>
                  </div>
                  <PiggyBank className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Produit</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Compte</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Encaissement</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockProduitsARecevoir.map(produit => (
                    <tr key={produit.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{produit.designation}</p>
                          <p className="text-sm text-gray-500">Exercice {produit.exerciceConcerne}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-green-100 text-green-800 capitalize">
                          {produit.categorie.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {(produit.montant / 1000000).toFixed(1)}M FCFA
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{produit.compteComptable}</td>
                      <td className="px-4 py-3">
                        {produit.dateEncaissement ? new Date(produit.dateEncaissement).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          produit.statutValidation === 'valide' ? 'bg-green-100 text-green-800' :
                          produit.statutValidation === 'comptabilise' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {produit.statutValidation}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Edit className="w-4 h-4 text-blue-600" />
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
                <BookOpen className="w-5 h-5 text-blue-600" />
                Référentiel SYSCOHADA - Provisions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockRegles.map((regle, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium text-lg capitalize">
                          {regle.type.replace('_', ' ')}
                        </h4>
                        <p className="text-gray-600">{regle.description}</p>
                      </div>
                      <Badge className={regle.obligatoire ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                        {regle.obligatoire ? 'Obligatoire' : 'Facultative'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium mb-2">Conditions d'Application</h5>
                        <ul className="space-y-1 text-sm">
                          {regle.conditionsApplication.map((condition, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                              <span>{condition}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium mb-2">Base de Calcul</h5>
                        <p className="text-sm text-gray-600 mb-2">{regle.baseCalcul}</p>
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
                          <div key={i} className="p-2 bg-gray-50 rounded text-sm">
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
                {mockAnalysesRisque.map((analyse, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-lg">{analyse.domaineRisque}</h4>
                        <p className="text-sm text-gray-600">
                          Dernière mise à jour: {new Date(analyse.derniereMiseAJour).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={getRisqueBadge(analyse.niveauRisque)}>
                        Risque {analyse.niveauRisque}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Probabilité</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <Progress value={analyse.probabilite} className="w-16 h-2" />
                          <span className="font-bold">{analyse.probabilite}%</span>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Impact Financier</p>
                        <p className="text-xl font-bold text-red-600">
                          {(analyse.impactFinancier / 1000000).toFixed(1)}M FCFA
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600">Provisions Recommandées</p>
                        <p className="text-xl font-bold text-blue-600">
                          {(analyse.provisionsRecommandees / 1000000).toFixed(1)}M FCFA
                        </p>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Mesures Préventives Recommandées</h5>
                      <div className="space-y-2">
                        {analyse.mesuresPreventives.map((mesure, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
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
                        <AlertTriangle className="w-3 h-3 text-orange-600 mt-1" />
                        <span>Renforcer le suivi des créances clients</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-orange-600 mt-1" />
                        <span>Réviser les contrats pour réduire les litiges</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-orange-600 mt-1" />
                        <span>Mettre en place une veille juridique</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Optimisations Possibles</h5>
                    <ul className="space-y-1">
                      <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-blue-600 mt-1" />
                        <span>Automatiser le calcul des provisions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-blue-600 mt-1" />
                        <span>Améliorer la documentation des risques</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Target className="w-3 h-3 text-blue-600 mt-1" />
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
    </div>
  );
};

export default Provisions;