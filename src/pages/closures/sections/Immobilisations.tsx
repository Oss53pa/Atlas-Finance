import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building,
  TrendingDown,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  Calculator,
  Activity,
  Clock,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Factory,
  Zap,
  Brain,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Target,
  Archive,
  CheckCircle,
  XCircle,
  Settings,
  HardDrive,
  Car,
  Home,
  Laptop,
  PiggyBank,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';

interface Immobilisation {
  id: string;
  code: string;
  designation: string;
  categorie: 'corporelle' | 'incorporelle' | 'financiere';
  sousCategorie: string;
  dateAcquisition: string;
  dateMiseEnService: string;
  valeurAcquisition: number;
  valeurBrute: number;
  amortissementsCumules: number;
  valeurNette: number;
  dureeAmortissement: number;
  methodeAmortissement: 'lineaire' | 'degressive' | 'unite_oeuvre';
  tauxAmortissement: number;
  amortissementAnnuel: number;
  fournisseur: string;
  localisation: string;
  responsable: string;
  etatPhysique: 'excellent' | 'bon' | 'moyen' | 'mauvais' | 'hors_service';
  statutComptable: 'actif' | 'totalement_amorti' | 'cede' | 'reforme' | 'sinistre';
  valeurAssurance?: number;
  numeroSerie?: string;
  garantieJusquau?: string;
  derniereMaintenance?: string;
  prochaineMaintenance?: string;
}

interface MouvementImmobilisation {
  id: string;
  immobilisationId: string;
  immobilisationCode: string;
  type: 'acquisition' | 'cession' | 'reforme' | 'transfert' | 'reevaluation' | 'amortissement';
  date: string;
  montant: number;
  description: string;
  reference: string;
  utilisateur: string;
  pieceJustificative?: string;
  impactComptable: {
    compteDebit: string;
    compteCredit: string;
    montantDebit: number;
    montantCredit: number;
  };
}

interface TestDepreciation {
  immobilisationId: string;
  dateTest: string;
  valeurComptable: number;
  valeurRecouvrable: number;
  valeurUtilite: number;
  justeValeur: number;
  depreciationCalculee: number;
  depreciationComptabilisee: number;
  resultatTest: 'aucune_depreciation' | 'depreciation_requise' | 'reprise_possible';
  justification: string;
  prochainTest: string;
}

interface CalculAmortissement {
  exercice: string;
  valeurBrute: number;
  amortissementDebut: number;
  dotationExercice: number;
  amortissementFin: number;
  valeurNette: number;
  tauxRealise: number;
}

interface PlanAmortissement {
  immobilisationId: string;
  tableauAmortissement: CalculAmortissement[];
  totalAmortissements: number;
  dureeRestante: number;
  conformiteSYSCOHADA: boolean;
}

const Immobilisations: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedImmobilisation, setSelectedImmobilisation] = useState<Immobilisation | null>(null);
  const [filterCategorie, setFilterCategorie] = useState<string>('toutes');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAmortissementModal, setShowAmortissementModal] = useState(false);
  const [showCessionModal, setShowCessionModal] = useState(false);

  // Données simulées
  const mockImmobilisations: Immobilisation[] = [
    {
      id: '1',
      code: 'IMM001',
      designation: 'Bâtiment Administratif Principal',
      categorie: 'corporelle',
      sousCategorie: 'Constructions',
      dateAcquisition: '2018-03-15',
      dateMiseEnService: '2018-06-01',
      valeurAcquisition: 450000000,
      valeurBrute: 450000000,
      amortissementsCumules: 90000000,
      valeurNette: 360000000,
      dureeAmortissement: 25,
      methodeAmortissement: 'lineaire',
      tauxAmortissement: 4,
      amortissementAnnuel: 18000000,
      fournisseur: 'SOGEA-SATOM',
      localisation: 'Plateau, Abidjan',
      responsable: 'Direction Patrimoine',
      etatPhysique: 'bon',
      statutComptable: 'actif',
      valeurAssurance: 500000000,
      derniereMaintenance: '2024-09-15',
      prochaineMaintenance: '2025-03-15'
    },
    {
      id: '2',
      code: 'IMM002',
      designation: 'Logiciel ERP WiseBook',
      categorie: 'incorporelle',
      sousCategorie: 'Logiciels',
      dateAcquisition: '2023-01-10',
      dateMiseEnService: '2023-02-01',
      valeurAcquisition: 85000000,
      valeurBrute: 85000000,
      amortissementsCumules: 28333333,
      valeurNette: 56666667,
      dureeAmortissement: 3,
      methodeAmortissement: 'lineaire',
      tauxAmortissement: 33.33,
      amortissementAnnuel: 28333333,
      fournisseur: 'WiseBook Solutions',
      localisation: 'Serveurs Cloud',
      responsable: 'Direction Informatique',
      etatPhysique: 'excellent',
      statutComptable: 'actif',
      numeroSerie: 'WB-2023-001',
      garantieJusquau: '2026-01-10'
    },
    {
      id: '3',
      code: 'IMM003',
      designation: 'Véhicule de Service Toyota Prado',
      categorie: 'corporelle',
      sousCategorie: 'Matériel de transport',
      dateAcquisition: '2020-07-20',
      dateMiseEnService: '2020-07-25',
      valeurAcquisition: 35000000,
      valeurBrute: 35000000,
      amortissementsCumules: 21000000,
      valeurNette: 14000000,
      dureeAmortissement: 5,
      methodeAmortissement: 'degressive',
      tauxAmortissement: 20,
      amortissementAnnuel: 5600000,
      fournisseur: 'CFAO Motors',
      localisation: 'Garage Principal',
      responsable: 'Service Logistique',
      etatPhysique: 'bon',
      statutComptable: 'actif',
      valeurAssurance: 25000000,
      numeroSerie: 'TYT-PRD-2020-001',
      derniereMaintenance: '2024-11-10',
      prochaineMaintenance: '2025-05-10'
    },
    {
      id: '4',
      code: 'IMM004',
      designation: 'Serveurs Dell PowerEdge R750',
      categorie: 'corporelle',
      sousCategorie: 'Matériel informatique',
      dateAcquisition: '2022-06-15',
      dateMiseEnService: '2022-07-01',
      valeurAcquisition: 25000000,
      valeurBrute: 25000000,
      amortissementsCumules: 12500000,
      valeurNette: 12500000,
      dureeAmortissement: 4,
      methodeAmortissement: 'lineaire',
      tauxAmortissement: 25,
      amortissementAnnuel: 6250000,
      fournisseur: 'Dell Technologies',
      localisation: 'Salle Serveur',
      responsable: 'Admin Système',
      etatPhysique: 'excellent',
      statutComptable: 'actif',
      valeurAssurance: 30000000,
      numeroSerie: 'DELL-R750-2022',
      garantieJusquau: '2025-06-15'
    }
  ];

  const mockMouvements: MouvementImmobilisation[] = [
    {
      id: '1',
      immobilisationId: '2',
      immobilisationCode: 'IMM002',
      type: 'amortissement',
      date: '2024-12-31',
      montant: 28333333,
      description: 'Dotation aux amortissements exercice 2024',
      reference: 'DOT-2024-002',
      utilisateur: 'Système Comptable',
      impactComptable: {
        compteDebit: '681100',
        compteCredit: '205000',
        montantDebit: 28333333,
        montantCredit: 28333333
      }
    },
    {
      id: '2',
      immobilisationId: '4',
      immobilisationCode: 'IMM004',
      type: 'acquisition',
      date: '2022-06-15',
      montant: 25000000,
      description: 'Acquisition serveurs Dell PowerEdge',
      reference: 'ACQ-2022-004',
      utilisateur: 'Marie KOUAME',
      pieceJustificative: 'Facture-DELL-2022-001.pdf',
      impactComptable: {
        compteDebit: '244000',
        compteCredit: '481000',
        montantDebit: 25000000,
        montantCredit: 25000000
      }
    }
  ];

  const mockTestsDepreciation: TestDepreciation[] = [
    {
      immobilisationId: '3',
      dateTest: '2024-12-31',
      valeurComptable: 14000000,
      valeurRecouvrable: 18000000,
      valeurUtilite: 20000000,
      justeValeur: 18000000,
      depreciationCalculee: 0,
      depreciationComptabilisee: 0,
      resultatTest: 'aucune_depreciation',
      justification: 'Valeur recouvrable supérieure à la valeur comptable',
      prochainTest: '2025-12-31'
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const valeurBruteTotale = mockImmobilisations.reduce((sum, immo) => sum + immo.valeurBrute, 0);
    const amortissementsCumules = mockImmobilisations.reduce((sum, immo) => sum + immo.amortissementsCumules, 0);
    const valeurNetteTotale = mockImmobilisations.reduce((sum, immo) => sum + immo.valeurNette, 0);
    const dotationsAnnuelles = mockImmobilisations.reduce((sum, immo) => sum + immo.amortissementAnnuel, 0);
    const tauxAmortissementMoyen = amortissementsCumules / valeurBruteTotale * 100;
    const immobilisationsObsoletes = mockImmobilisations.filter(immo =>
      immo.etatPhysique === 'hors_service' || immo.statutComptable === 'totalement_amorti'
    ).length;

    return {
      valeurBruteTotale,
      amortissementsCumules,
      valeurNetteTotale,
      dotationsAnnuelles,
      tauxAmortissementMoyen,
      immobilisationsObsoletes,
      nombreImmobilisations: mockImmobilisations.length,
      valeurAssuranceTotale: mockImmobilisations.reduce((sum, immo) => sum + (immo.valeurAssurance || 0), 0)
    };
  }, []);

  // Filtrage des immobilisations
  const immobilisationsFiltrees = useMemo(() => {
    return mockImmobilisations.filter(immo => {
      const matchCategorie = filterCategorie === 'toutes' || immo.categorie === filterCategorie;
      const matchStatut = filterStatut === 'tous' || immo.statutComptable === filterStatut;
      const matchSearch = searchTerm === '' ||
        immo.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        immo.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategorie && matchStatut && matchSearch;
    });
  }, [filterCategorie, filterStatut, searchTerm]);

  const getCategorieIcon = (categorie: string, sousCategorie: string) => {
    if (categorie === 'corporelle') {
      if (sousCategorie.includes('Constructions')) return <Building className="w-5 h-5 text-blue-600" />;
      if (sousCategorie.includes('transport')) return <Car className="w-5 h-5 text-green-600" />;
      if (sousCategorie.includes('informatique')) return <Laptop className="w-5 h-5 text-purple-600" />;
      return <Factory className="w-5 h-5 text-gray-600" />;
    } else if (categorie === 'incorporelle') {
      return <HardDrive className="w-5 h-5 text-orange-600" />;
    } else {
      return <PiggyBank className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'actif': 'bg-green-100 text-green-800',
      'totalement_amorti': 'bg-gray-100 text-gray-800',
      'cede': 'bg-blue-100 text-blue-800',
      'reforme': 'bg-red-100 text-red-800',
      'sinistre': 'bg-purple-100 text-purple-800'
    };
    return variants[statut] || 'bg-gray-100 text-gray-800';
  };

  const getEtatPhysiqueBadge = (etat: string) => {
    const variants: Record<string, string> = {
      'excellent': 'bg-green-100 text-green-800',
      'bon': 'bg-blue-100 text-blue-800',
      'moyen': 'bg-yellow-100 text-yellow-800',
      'mauvais': 'bg-orange-100 text-orange-800',
      'hors_service': 'bg-red-100 text-red-800'
    };
    return variants[etat] || 'bg-gray-100 text-gray-800';
  };

  const getTypeMouvementIcon = (type: string) => {
    switch (type) {
      case 'acquisition': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'cession': return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 'amortissement': return <TrendingDown className="w-4 h-4 text-blue-600" />;
      case 'reevaluation': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'transfert': return <RefreshCw className="w-4 h-4 text-orange-600" />;
      case 'reforme': return <Trash2 className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  // Génération du plan d'amortissement
  const genererPlanAmortissement = (immo: Immobilisation): PlanAmortissement => {
    const dateDebut = new Date(immo.dateMiseEnService);
    const tableauAmortissement: CalculAmortissement[] = [];
    let valeurBrute = immo.valeurBrute;
    let amortissementCumule = 0;

    for (let i = 0; i < immo.dureeAmortissement; i++) {
      const exercice = (dateDebut.getFullYear() + i).toString();
      let dotationExercice = 0;

      if (immo.methodeAmortissement === 'lineaire') {
        dotationExercice = valeurBrute / immo.dureeAmortissement;
      } else if (immo.methodeAmortissement === 'degressive') {
        const valeurNette = valeurBrute - amortissementCumule;
        dotationExercice = Math.min(valeurNette * (immo.tauxAmortissement / 100), valeurNette);
      }

      const amortissementFin = amortissementCumule + dotationExercice;
      const valeurNette = valeurBrute - amortissementFin;

      tableauAmortissement.push({
        exercice,
        valeurBrute,
        amortissementDebut: amortissementCumule,
        dotationExercice,
        amortissementFin,
        valeurNette,
        tauxRealise: (amortissementFin / valeurBrute) * 100
      });

      amortissementCumule = amortissementFin;
    }

    return {
      immobilisationId: immo.id,
      tableauAmortissement,
      totalAmortissements: amortissementCumule,
      dureeRestante: Math.max(0, immo.dureeAmortissement - Math.floor((new Date().getFullYear() - dateDebut.getFullYear()))),
      conformiteSYSCOHADA: true
    };
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valeur Brute Totale</p>
                <p className="text-2xl font-bold">{(kpis.valeurBruteTotale / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-blue-600 mt-1">{kpis.nombreImmobilisations} immobilisations</p>
              </div>
              <Building className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Valeur Nette</p>
                <p className="text-2xl font-bold">{(kpis.valeurNetteTotale / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-green-600 mt-1">Après amortissements</p>
              </div>
              <Calculator className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux Amortissement</p>
                <p className="text-2xl font-bold">{kpis.tauxAmortissementMoyen.toFixed(1)}%</p>
                <Progress value={kpis.tauxAmortissementMoyen} className="mt-2" />
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Dotations Annuelles</p>
                <p className="text-2xl font-bold">{(kpis.dotationsAnnuelles / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-gray-600 mt-1">Exercice 2024</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes IA et Conformité */}
      <div className="space-y-4">
        <Alert className="border-l-4 border-l-green-500">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Conformité SYSCOHADA:</strong> Toutes les immobilisations respectent les règles d'amortissement.
            Méthodes linéaire et dégressive correctement appliquées.
          </AlertDescription>
        </Alert>

        <Alert className="border-l-4 border-l-orange-500">
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <strong>Recommandation IA:</strong> 2 véhicules approchent de la fin de leur période d'amortissement.
            Planifier leur renouvellement ou réviser leur valeur résiduelle.
          </AlertDescription>
        </Alert>
      </div>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="registre">Registre</TabsTrigger>
          <TabsTrigger value="amortissements">Amortissements</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="depreciation">Dépréciation</TabsTrigger>
          <TabsTrigger value="conformite">Conformité</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Immobilisations Corporelles</p>
                        <p className="text-sm text-gray-600">3 éléments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">510M</p>
                      <p className="text-sm text-gray-500">85% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-orange-600" />
                      <div>
                        <p className="font-medium">Immobilisations Incorporelles</p>
                        <p className="text-sm text-gray-600">1 élément</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-orange-600">85M</p>
                      <p className="text-sm text-gray-500">14% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded">
                    <div className="flex items-center gap-3">
                      <PiggyBank className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium">Immobilisations Financières</p>
                        <p className="text-sm text-gray-600">0 élément</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-600">0M</p>
                      <p className="text-sm text-gray-500">0% du total</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>État des Amortissements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Progression globale</span>
                    <span className="font-medium">{kpis.tauxAmortissementMoyen.toFixed(1)}%</span>
                  </div>
                  <Progress value={kpis.tauxAmortissementMoyen} className="h-3" />

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Amortissements Cumulés</p>
                      <p className="text-2xl font-bold">{(kpis.amortissementsCumules / 1000000).toFixed(1)}M</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Dotations 2024</p>
                      <p className="text-2xl font-bold">{(kpis.dotationsAnnuelles / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Immobilisations par Durée d'Amortissement</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { duree: '3 ans', nb: 1, categorie: 'Logiciels', color: 'bg-purple-500' },
                  { duree: '4 ans', nb: 1, categorie: 'Informatique', color: 'bg-blue-500' },
                  { duree: '5 ans', nb: 1, categorie: 'Véhicules', color: 'bg-green-500' },
                  { duree: '10 ans', nb: 0, categorie: 'Mobilier', color: 'bg-yellow-500' },
                  { duree: '25 ans', nb: 1, categorie: 'Bâtiments', color: 'bg-red-500' }
                ].map((item, index) => (
                  <div key={index} className="text-center p-3 border rounded">
                    <div className={`w-full h-2 ${item.color} rounded mb-2`} />
                    <p className="font-medium">{item.duree}</p>
                    <p className="text-2xl font-bold">{item.nb}</p>
                    <p className="text-xs text-gray-500">{item.categorie}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Registre */}
        <TabsContent value="registre" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une immobilisation..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterCategorie}
                onChange={(e) => setFilterCategorie(e.target.value)}
              >
                <option value="toutes">Toutes catégories</option>
                <option value="corporelle">Corporelles</option>
                <option value="incorporelle">Incorporelles</option>
                <option value="financiere">Financières</option>
              </select>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="totalement_amorti">Totalement amorti</option>
                <option value="cede">Cédé</option>
                <option value="reforme">Réformé</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle Immobilisation
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter Registre
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Immobilisation</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Acquisition</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valeur Brute</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amort. Cumulés</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valeur Nette</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">État</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {immobilisationsFiltrees.map(immo => (
                    <tr key={immo.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCategorieIcon(immo.categorie, immo.sousCategorie)}
                          <div>
                            <p className="font-medium">{immo.designation}</p>
                            <p className="text-sm text-gray-500">{immo.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-800 capitalize">
                          {immo.categorie}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(immo.dateAcquisition).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(immo.valeurBrute / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-3 text-right text-red-600">
                        {(immo.amortissementsCumules / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {(immo.valeurNette / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getEtatPhysiqueBadge(immo.etatPhysique)}>
                          {immo.etatPhysique}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatutBadge(immo.statutComptable)}>
                          {immo.statutComptable}
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

        {/* Amortissements */}
        <TabsContent value="amortissements" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Méthode Linéaire</p>
                    <p className="text-2xl font-bold">3</p>
                    <p className="text-xs text-green-600 mt-1">75% des immobilisations</p>
                  </div>
                  <Calculator className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Méthode Dégressive</p>
                    <p className="text-2xl font-bold">1</p>
                    <p className="text-xs text-blue-600 mt-1">25% des immobilisations</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unité d'Œuvre</p>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-xs text-gray-600 mt-1">0% des immobilisations</p>
                  </div>
                  <Settings className="w-8 h-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan d'Amortissement - IMM002</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const logiciel = mockImmobilisations.find(i => i.code === 'IMM002');
                  if (!logiciel) return <p>Immobilisation non trouvée</p>;

                  const plan = genererPlanAmortissement(logiciel);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Valeur d'acquisition</p>
                          <p className="font-bold">{(logiciel.valeurAcquisition / 1000000).toFixed(1)}M FCFA</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Durée d'amortissement</p>
                          <p className="font-bold">{logiciel.dureeAmortissement} ans</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Méthode</p>
                          <p className="font-bold capitalize">{logiciel.methodeAmortissement}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Taux annuel</p>
                          <p className="font-bold">{logiciel.tauxAmortissement}%</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-2 text-left">Exercice</th>
                              <th className="px-2 py-2 text-right">Dotation</th>
                              <th className="px-2 py-2 text-right">Cumul</th>
                              <th className="px-2 py-2 text-right">VN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {plan.tableauAmortissement.map(ligne => (
                              <tr key={ligne.exercice} className="border-t">
                                <td className="px-2 py-2">{ligne.exercice}</td>
                                <td className="px-2 py-2 text-right">{(ligne.dotationExercice / 1000000).toFixed(1)}M</td>
                                <td className="px-2 py-2 text-right">{(ligne.amortissementFin / 1000000).toFixed(1)}M</td>
                                <td className="px-2 py-2 text-right font-medium">{(ligne.valeurNette / 1000000).toFixed(1)}M</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dotations par Exercice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['2022', '2023', '2024', '2025'].map(annee => {
                    const dotation = annee === '2024' ? 60.5 : annee === '2023' ? 58.2 : annee === '2022' ? 45.0 : 62.1;
                    return (
                      <div key={annee} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">Exercice {annee}</p>
                          <p className="text-sm text-gray-600">
                            {annee === '2025' ? 'Prévisionnel' : 'Réalisé'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{dotation}M FCFA</p>
                          <p className="text-sm text-gray-500">
                            {annee === '2024' ? '4 immobilisations' : '3 immobilisations'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Alert className="border-l-4 border-l-blue-500">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Conformité SYSCOHADA:</strong> Les plans d'amortissement respectent les durées minimales et maximales
              définies par le référentiel comptable. Tous les calculs sont conformes.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Mouvements */}
        <TabsContent value="mouvements" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Acquisitions 2024</p>
                    <p className="text-2xl font-bold text-green-600">0</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cessions 2024</p>
                    <p className="text-2xl font-bold text-red-600">0</p>
                  </div>
                  <ArrowDownRight className="w-6 h-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Dotations 2024</p>
                    <p className="text-2xl font-bold text-blue-600">4</p>
                  </div>
                  <TrendingDown className="w-6 h-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Réévaluations</p>
                    <p className="text-2xl font-bold text-purple-600">0</p>
                  </div>
                  <TrendingUp className="w-6 h-6 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historique des Mouvements</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Immobilisation</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Référence</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Impact Comptable</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMouvements.map(mouvement => (
                    <tr key={mouvement.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {new Date(mouvement.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeMouvementIcon(mouvement.type)}
                          <span className="capitalize">{mouvement.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{mouvement.immobilisationCode}</p>
                          <p className="text-sm text-gray-500">{mouvement.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(mouvement.montant / 1000000).toFixed(1)}M FCFA
                      </td>
                      <td className="px-4 py-3">{mouvement.reference}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <p>Débit: {mouvement.impactComptable.compteDebit}</p>
                          <p>Crédit: {mouvement.impactComptable.compteCredit}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dépréciation */}
        <TabsContent value="depreciation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tests de Dépréciation SYSCOHADA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-l-4 border-l-blue-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Tests de dépréciation obligatoires selon SYSCOHADA pour les immobilisations présentant des indices de perte de valeur.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-gray-500">Conformes</span>
                    </div>
                    <p className="font-medium">Aucune Dépréciation</p>
                    <p className="text-2xl font-bold text-green-600">4</p>
                    <p className="text-sm text-gray-600">immobilisations testées</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm text-gray-500">À surveiller</span>
                    </div>
                    <p className="font-medium">Risque Modéré</p>
                    <p className="text-2xl font-bold text-yellow-600">0</p>
                    <p className="text-sm text-gray-600">immobilisations</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="text-sm text-gray-500">Dépréciées</span>
                    </div>
                    <p className="font-medium">Dépréciation Requise</p>
                    <p className="text-2xl font-bold text-red-600">0</p>
                    <p className="text-sm text-gray-600">immobilisations</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Résultats des Tests</h4>
                  <div className="space-y-3">
                    {mockTestsDepreciation.map(test => {
                      const immo = mockImmobilisations.find(i => i.id === test.immobilisationId);
                      return (
                        <div key={test.immobilisationId} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">{immo?.designation}</p>
                              <p className="text-sm text-gray-500">Test du {new Date(test.dateTest).toLocaleDateString()}</p>
                            </div>
                            <Badge className={
                              test.resultatTest === 'aucune_depreciation' ? 'bg-green-100 text-green-800' :
                              test.resultatTest === 'depreciation_requise' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {test.resultatTest === 'aucune_depreciation' ? 'Aucune dépréciation' :
                               test.resultatTest === 'depreciation_requise' ? 'Dépréciation requise' :
                               'Reprise possible'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">Valeur comptable</p>
                              <p className="font-bold">{(test.valeurComptable / 1000000).toFixed(1)}M</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Valeur recouvrable</p>
                              <p className="font-bold">{(test.valeurRecouvrable / 1000000).toFixed(1)}M</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Juste valeur</p>
                              <p className="font-bold">{(test.justeValeur / 1000000).toFixed(1)}M</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Prochain test</p>
                              <p className="font-bold">{new Date(test.prochainTest).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 mt-3">{test.justification}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conformité */}
        <TabsContent value="conformite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Contrôles de Conformité SYSCOHADA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Règles d'Amortissement</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Durées d'amortissement conformes</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Méthodes autorisées utilisées</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Calculs mathématiquement corrects</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Cohérence des taux appliqués</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Documentation et Justification</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Pièces justificatives archivées</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Plans d'amortissement documentés</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                        <span className="text-sm">Tests de dépréciation à jour</span>
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm">Registre des immobilisations tenu</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-blue-600" />
                    Recommandations d'Amélioration
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      <span>Planifier les tests de dépréciation annuels pour toutes les immobilisations de plus de 5 ans</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      <span>Mettre en place une procédure automatisée de calcul des dotations aux amortissements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                      <span>Réviser périodiquement les durées d'amortissement en fonction de l'évolution technologique</span>
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-green-600">98%</p>
                    <p className="text-sm text-gray-600">Taux de Conformité Global</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-blue-600">0</p>
                    <p className="text-sm text-gray-600">Non-conformités Critiques</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold text-yellow-600">1</p>
                    <p className="text-sm text-gray-600">Points d'Amélioration</p>
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

export default Immobilisations;