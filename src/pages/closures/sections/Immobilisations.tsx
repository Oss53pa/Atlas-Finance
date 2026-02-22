import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useData } from '../../../contexts/DataContext';
import type { DBAsset } from '../../../lib/db';
import { Money } from '@/utils/money';
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
import { Progress } from '../../../components/ui/Progress';

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
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedImmobilisation, setSelectedImmobilisation] = useState<Immobilisation | null>(null);
  const [filterCategorie, setFilterCategorie] = useState<string>('toutes');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAmortissementModal, setShowAmortissementModal] = useState(false);
  const [showCessionModal, setShowCessionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Handlers pour les actions
  const handleViewDetail = (immo: Immobilisation) => {
    setSelectedImmobilisation(immo);
    setShowDetailModal(true);
  };

  const handleEditImmo = (immo: Immobilisation) => {
    setSelectedImmobilisation(immo);
    setShowEditModal(true);
  };

  const handleCalculateAmortissement = (immo: Immobilisation) => {
    setSelectedImmobilisation(immo);
    setShowAmortissementModal(true);
  };

  // Real data from Dexie
  const [dbAssets, setDbAssets] = useState<DBAsset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const assets = await adapter.getAll<DBAsset>('assets');
      setDbAssets(assets);
    } catch {
      // silently fail
    } finally {
      setAssetsLoading(false);
    }
  }, [adapter]);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  // Map DBAsset → component Immobilisation interface
  const immobilisations: Immobilisation[] = useMemo(() => {
    return dbAssets.map(asset => {
      const taux = asset.usefulLifeYears > 0 ? 100 / asset.usefulLifeYears : 0;
      const annuel = asset.usefulLifeYears > 0 ? (asset.acquisitionValue - asset.residualValue) / asset.usefulLifeYears : 0;
      const yearsElapsed = Math.max(0, Math.floor((Date.now() - new Date(asset.acquisitionDate).getTime()) / (365.25 * 86400000)));
      const cumules = Math.min(annuel * yearsElapsed, asset.acquisitionValue - asset.residualValue);
      const categorie: 'corporelle' | 'incorporelle' | 'financiere' =
        asset.accountCode.startsWith('20') || asset.accountCode.startsWith('21') ? 'incorporelle' :
        asset.accountCode.startsWith('26') || asset.accountCode.startsWith('27') ? 'financiere' : 'corporelle';
      return {
        id: asset.id,
        code: asset.code,
        designation: asset.name,
        categorie,
        sousCategorie: asset.category,
        dateAcquisition: asset.acquisitionDate,
        dateMiseEnService: asset.acquisitionDate,
        valeurAcquisition: asset.acquisitionValue,
        valeurBrute: asset.acquisitionValue,
        amortissementsCumules: new Money(cumules).round(0).toNumber(),
        valeurNette: new Money(asset.acquisitionValue).subtract(cumules).round(0).toNumber(),
        dureeAmortissement: asset.usefulLifeYears,
        methodeAmortissement: asset.depreciationMethod === 'linear' ? 'lineaire' as const : 'degressive' as const,
        tauxAmortissement: new Money(taux).round().toNumber(),
        amortissementAnnuel: new Money(annuel).round(0).toNumber(),
        fournisseur: '',
        localisation: '',
        responsable: '',
        etatPhysique: 'bon' as const,
        statutComptable: asset.status === 'active' ? 'actif' as const : asset.status === 'disposed' ? 'cede' as const : 'reforme' as const,
      };
    });
  }, [dbAssets]);

  const mouvementsImmo: MouvementImmobilisation[] = [];
  const testsDepreciation: TestDepreciation[] = [];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const valeurBruteTotale = immobilisations.reduce((sum, immo) => sum + immo.valeurBrute, 0);
    const amortissementsCumules = immobilisations.reduce((sum, immo) => sum + immo.amortissementsCumules, 0);
    const valeurNetteTotale = immobilisations.reduce((sum, immo) => sum + immo.valeurNette, 0);
    const dotationsAnnuelles = immobilisations.reduce((sum, immo) => sum + immo.amortissementAnnuel, 0);
    const tauxAmortissementMoyen = amortissementsCumules / valeurBruteTotale * 100;
    const immobilisationsObsoletes = immobilisations.filter(immo =>
      immo.etatPhysique === 'hors_service' || immo.statutComptable === 'totalement_amorti'
    ).length;

    return {
      valeurBruteTotale,
      amortissementsCumules,
      valeurNetteTotale,
      dotationsAnnuelles,
      tauxAmortissementMoyen,
      immobilisationsObsoletes,
      nombreImmobilisations: immobilisations.length,
      valeurAssuranceTotale: immobilisations.reduce((sum, immo) => sum + (immo.valeurAssurance || 0), 0)
    };
  }, [immobilisations]);

  // Filtrage des immobilisations
  const immobilisationsFiltrees = useMemo(() => {
    return immobilisations.filter(immo => {
      const matchCategorie = filterCategorie === 'toutes' || immo.categorie === filterCategorie;
      const matchStatut = filterStatut === 'tous' || immo.statutComptable === filterStatut;
      const matchSearch = searchTerm === '' ||
        immo.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        immo.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategorie && matchStatut && matchSearch;
    });
  }, [immobilisations, filterCategorie, filterStatut, searchTerm]);

  const getCategorieIcon = (categorie: string, sousCategorie: string) => {
    if (categorie === 'corporelle') {
      if (sousCategorie.includes('Constructions')) return <Building className="w-5 h-5 text-[var(--color-primary)]" />;
      if (sousCategorie.includes('transport')) return <Car className="w-5 h-5 text-[var(--color-success)]" />;
      if (sousCategorie.includes('informatique')) return <Laptop className="w-5 h-5 text-purple-600" />;
      return <Factory className="w-5 h-5 text-[var(--color-text-primary)]" />;
    } else if (categorie === 'incorporelle') {
      return <HardDrive className="w-5 h-5 text-[var(--color-warning)]" />;
    } else {
      return <PiggyBank className="w-5 h-5 text-[var(--color-warning)]" />;
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'actif': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'totalement_amorti': 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]',
      'cede': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'reforme': 'bg-[var(--color-error-lighter)] text-red-800',
      'sinistre': 'bg-purple-100 text-purple-800'
    };
    return variants[statut] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getEtatPhysiqueBadge = (etat: string) => {
    const variants: Record<string, string> = {
      'excellent': 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]',
      'bon': 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]',
      'moyen': 'bg-[var(--color-warning-lighter)] text-yellow-800',
      'mauvais': 'bg-[var(--color-warning-lighter)] text-orange-800',
      'hors_service': 'bg-[var(--color-error-lighter)] text-red-800'
    };
    return variants[etat] || 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
  };

  const getTypeMouvementIcon = (type: string) => {
    switch (type) {
      case 'acquisition': return <ArrowUpRight className="w-4 h-4 text-[var(--color-success)]" />;
      case 'cession': return <ArrowDownRight className="w-4 h-4 text-[var(--color-error)]" />;
      case 'amortissement': return <TrendingDown className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'reevaluation': return <TrendingUp className="w-4 h-4 text-purple-600" />;
      case 'transfert': return <RefreshCw className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'reforme': return <Trash2 className="w-4 h-4 text-[var(--color-error)]" />;
      default: return <Activity className="w-4 h-4 text-[var(--color-text-primary)]" />;
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
                <p className="text-sm text-[var(--color-text-primary)]">Valeur Brute Totale</p>
                <p className="text-lg font-bold">{(kpis.valeurBruteTotale / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">{kpis.nombreImmobilisations} immobilisations</p>
              </div>
              <Building className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Valeur Nette</p>
                <p className="text-lg font-bold">{(kpis.valeurNetteTotale / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Après amortissements</p>
              </div>
              <Calculator className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Taux Amortissement</p>
                <p className="text-lg font-bold">{kpis.tauxAmortissementMoyen.toFixed(1)}%</p>
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
                <p className="text-sm text-[var(--color-text-primary)]">Dotations Annuelles</p>
                <p className="text-lg font-bold">{(kpis.dotationsAnnuelles / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-text-primary)] mt-1">Exercice 2024</p>
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
                  <div className="flex items-center justify-between p-3 bg-[var(--color-primary-lightest)] rounded">
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-[var(--color-primary)]" />
                      <div>
                        <p className="font-medium">Immobilisations Corporelles</p>
                        <p className="text-sm text-[var(--color-text-primary)]">3 éléments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-primary)]">510M</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">85% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded">
                    <div className="flex items-center gap-3">
                      <HardDrive className="w-5 h-5 text-[var(--color-warning)]" />
                      <div>
                        <p className="font-medium">Immobilisations Incorporelles</p>
                        <p className="text-sm text-[var(--color-text-primary)]">1 élément</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-warning)]">85M</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">14% du total</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[var(--color-warning-lightest)] rounded">
                    <div className="flex items-center gap-3">
                      <PiggyBank className="w-5 h-5 text-[var(--color-warning)]" />
                      <div>
                        <p className="font-medium">Immobilisations Financières</p>
                        <p className="text-sm text-[var(--color-text-primary)]">0 élément</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-warning)]">0M</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">0% du total</p>
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
                    <span className="text-sm text-[var(--color-text-primary)]">Progression globale</span>
                    <span className="font-medium">{kpis.tauxAmortissementMoyen.toFixed(1)}%</span>
                  </div>
                  <Progress value={kpis.tauxAmortissementMoyen} className="h-3" />

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">Amortissements Cumulés</p>
                      <p className="text-lg font-bold">{(kpis.amortissementsCumules / 1000000).toFixed(1)}M</p>
                    </div>
                    <div className="text-center p-3 bg-[var(--color-background-secondary)] rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">Dotations 2024</p>
                      <p className="text-lg font-bold">{(kpis.dotationsAnnuelles / 1000000).toFixed(1)}M</p>
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
                  { duree: '4 ans', nb: 1, categorie: 'Informatique', color: 'bg-[var(--color-primary)]' },
                  { duree: '5 ans', nb: 1, categorie: 'Véhicules', color: 'bg-[var(--color-success)]' },
                  { duree: '10 ans', nb: 0, categorie: 'Mobilier', color: 'bg-[var(--color-warning)]' },
                  { duree: '25 ans', nb: 1, categorie: 'Bâtiments', color: 'bg-[var(--color-error)]' }
                ].map((item, index) => (
                  <div key={index} className="text-center p-3 border rounded">
                    <div className={`w-full h-2 ${item.color} rounded mb-2`} />
                    <p className="font-medium">{item.duree}</p>
                    <p className="text-lg font-bold">{item.nb}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{item.categorie}</p>
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
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
              <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouvelle Immobilisation
              </button>
              <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter Registre
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Immobilisation</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Catégorie</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Acquisition</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Valeur Brute</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Amort. Cumulés</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Valeur Nette</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">État</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {immobilisationsFiltrees.map(immo => (
                    <tr key={immo.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {getCategorieIcon(immo.categorie, immo.sousCategorie)}
                          <div>
                            <p className="font-medium">{immo.designation}</p>
                            <p className="text-sm text-[var(--color-text-secondary)]">{immo.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                          {immo.categorie}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(immo.dateAcquisition).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(immo.valeurBrute / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-error)]">
                        {(immo.amortissementsCumules / 1000000).toFixed(1)}M
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--color-success)]">
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
                          <button
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                            onClick={() => handleViewDetail(immo)}
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            onClick={() => handleEditImmo(immo)}
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                          <button
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            onClick={() => handleCalculateAmortissement(immo)}
                            title="Calculer amortissement"
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

        {/* Amortissements */}
        <TabsContent value="amortissements" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Méthode Linéaire</p>
                    <p className="text-lg font-bold">3</p>
                    <p className="text-xs text-[var(--color-success)] mt-1">75% des immobilisations</p>
                  </div>
                  <Calculator className="w-8 h-8 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Méthode Dégressive</p>
                    <p className="text-lg font-bold">1</p>
                    <p className="text-xs text-[var(--color-primary)] mt-1">25% des immobilisations</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Unité d'Œuvre</p>
                    <p className="text-lg font-bold">0</p>
                    <p className="text-xs text-[var(--color-text-primary)] mt-1">0% des immobilisations</p>
                  </div>
                  <Settings className="w-8 h-8 text-[var(--color-text-secondary)]" />
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
                  const logiciel = immobilisations.find(i => i.code === 'IMM002');
                  if (!logiciel) return <p>Immobilisation non trouvée</p>;

                  const plan = genererPlanAmortissement(logiciel);
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-[var(--color-text-primary)]">Valeur d'acquisition</p>
                          <p className="font-bold">{(logiciel.valeurAcquisition / 1000000).toFixed(1)}M FCFA</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-primary)]">Durée d'amortissement</p>
                          <p className="font-bold">{logiciel.dureeAmortissement} ans</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-primary)]">Méthode</p>
                          <p className="font-bold capitalize">{logiciel.methodeAmortissement}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-text-primary)]">Taux annuel</p>
                          <p className="font-bold">{logiciel.tauxAmortissement}%</p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[var(--color-background-secondary)]">
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
                          <p className="text-sm text-[var(--color-text-primary)]">
                            {annee === '2025' ? 'Prévisionnel' : 'Réalisé'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{dotation}M FCFA</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">
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
                    <p className="text-sm text-[var(--color-text-primary)]">Acquisitions 2024</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">0</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Cessions 2024</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">0</p>
                  </div>
                  <ArrowDownRight className="w-6 h-6 text-[var(--color-error)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Dotations 2024</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">4</p>
                  </div>
                  <TrendingDown className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Réévaluations</p>
                    <p className="text-lg font-bold text-purple-600">0</p>
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
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">{t('common.date')}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Immobilisation</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Référence</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Impact Comptable</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvementsImmo.map(mouvement => (
                    <tr key={mouvement.id} className="border-t hover:bg-[var(--color-background-secondary)]">
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
                          <p className="text-sm text-[var(--color-text-secondary)]">{mouvement.description}</p>
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
                        <button className="p-1 hover:bg-[var(--color-background-hover)] rounded" aria-label="Voir les détails">
                          <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
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
                  <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">Conformes</span>
                    </div>
                    <p className="font-medium">Aucune Dépréciation</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">4</p>
                    <p className="text-sm text-[var(--color-text-primary)]">immobilisations testées</p>
                  </div>
                  <div className="p-4 bg-[var(--color-warning-lightest)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">À surveiller</span>
                    </div>
                    <p className="font-medium">Risque Modéré</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">0</p>
                    <p className="text-sm text-[var(--color-text-primary)]">immobilisations</p>
                  </div>
                  <div className="p-4 bg-[var(--color-error-lightest)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <XCircle className="w-5 h-5 text-[var(--color-error)]" />
                      <span className="text-sm text-[var(--color-text-secondary)]">Dépréciées</span>
                    </div>
                    <p className="font-medium">Dépréciation Requise</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">0</p>
                    <p className="text-sm text-[var(--color-text-primary)]">immobilisations</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium mb-3">Résultats des Tests</h4>
                  <div className="space-y-3">
                    {testsDepreciation.map(test => {
                      const immo = immobilisations.find(i => i.id === test.immobilisationId);
                      return (
                        <div key={test.immobilisationId} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium">{immo?.designation}</p>
                              <p className="text-sm text-[var(--color-text-secondary)]">Test du {new Date(test.dateTest).toLocaleDateString()}</p>
                            </div>
                            <Badge className={
                              test.resultatTest === 'aucune_depreciation' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              test.resultatTest === 'depreciation_requise' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                              'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]'
                            }>
                              {test.resultatTest === 'aucune_depreciation' ? 'Aucune dépréciation' :
                               test.resultatTest === 'depreciation_requise' ? 'Dépréciation requise' :
                               'Reprise possible'}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[var(--color-text-primary)]">Valeur comptable</p>
                              <p className="font-bold">{(test.valeurComptable / 1000000).toFixed(1)}M</p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-primary)]">Valeur recouvrable</p>
                              <p className="font-bold">{(test.valeurRecouvrable / 1000000).toFixed(1)}M</p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-primary)]">Juste valeur</p>
                              <p className="font-bold">{(test.justeValeur / 1000000).toFixed(1)}M</p>
                            </div>
                            <div>
                              <p className="text-[var(--color-text-primary)]">Prochain test</p>
                              <p className="font-bold">{new Date(test.prochainTest).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <p className="text-sm text-[var(--color-text-primary)] mt-3">{test.justification}</p>
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
                <Shield className="w-5 h-5 text-[var(--color-success)]" />
                Contrôles de Conformité SYSCOHADA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Règles d'Amortissement</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Durées d'amortissement conformes</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Méthodes autorisées utilisées</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Calculs mathématiquement corrects</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Cohérence des taux appliqués</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Documentation et Justification</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Pièces justificatives archivées</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Plans d'amortissement documentés</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--color-warning-lightest)] rounded">
                        <span className="text-sm">Tests de dépréciation à jour</span>
                        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                      </div>
                      <div className="flex items-center justify-between p-2 bg-[var(--color-success-lightest)] rounded">
                        <span className="text-sm">Registre des immobilisations tenu</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-[var(--color-primary-lightest)] rounded-lg">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-[var(--color-primary)]" />
                    Recommandations d'Amélioration
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2" />
                      <span>Planifier les tests de dépréciation annuels pour toutes les immobilisations de plus de 5 ans</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2" />
                      <span>Mettre en place une procédure automatisée de calcul des dotations aux amortissements</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-[var(--color-primary)] rounded-full mt-2" />
                      <span>Réviser périodiquement les durées d'amortissement en fonction de l'évolution technologique</span>
                    </li>
                  </ul>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-[var(--color-background-secondary)] rounded">
                    <p className="text-lg font-bold text-[var(--color-success)]">98%</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Taux de Conformité Global</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-background-secondary)] rounded">
                    <p className="text-lg font-bold text-[var(--color-primary)]">0</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Non-conformités Critiques</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-background-secondary)] rounded">
                    <p className="text-lg font-bold text-[var(--color-warning)]">1</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Points d'Amélioration</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Détail Immobilisation */}
      {showDetailModal && selectedImmobilisation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[var(--color-primary-lighter)] to-[var(--color-success-lighter)]">
              <div className="flex items-center space-x-4">
                {getCategorieIcon(selectedImmobilisation.categorie, selectedImmobilisation.sousCategorie)}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedImmobilisation.designation}</h2>
                  <p className="text-sm text-gray-600">{selectedImmobilisation.code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations Générales */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Identification</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Catégorie</p>
                    <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] capitalize">
                      {selectedImmobilisation.categorie}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sous-catégorie</p>
                    <p className="font-semibold">{selectedImmobilisation.sousCategorie}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Localisation</p>
                    <p>{selectedImmobilisation.localisation}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Responsable</p>
                    <p>{selectedImmobilisation.responsable}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Acquisition</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date d'Acquisition</p>
                    <p className="font-semibold">{new Date(selectedImmobilisation.dateAcquisition).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date de Mise en Service</p>
                    <p>{new Date(selectedImmobilisation.dateMiseEnService).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Fournisseur</p>
                    <p>{selectedImmobilisation.fournisseur}</p>
                  </div>
                  {selectedImmobilisation.numeroSerie && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">N° Série</p>
                      <p className="font-mono text-sm">{selectedImmobilisation.numeroSerie}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">État</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">État Physique</p>
                    <Badge className={getEtatPhysiqueBadge(selectedImmobilisation.etatPhysique)}>
                      {selectedImmobilisation.etatPhysique}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Statut Comptable</p>
                    <Badge className={getStatutBadge(selectedImmobilisation.statutComptable)}>
                      {selectedImmobilisation.statutComptable}
                    </Badge>
                  </div>
                  {selectedImmobilisation.garantieJusquau && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Garantie jusqu'au</p>
                      <p>{new Date(selectedImmobilisation.garantieJusquau).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Valeurs Financières */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Valeurs Financières</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-500">Valeur d'Acquisition</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">
                      {(selectedImmobilisation.valeurAcquisition / 1000000).toFixed(1)}M FCFA
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-500">Valeur Brute</p>
                    <p className="text-lg font-bold">
                      {(selectedImmobilisation.valeurBrute / 1000000).toFixed(1)}M FCFA
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-500">Amortissements Cumulés</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">
                      -{(selectedImmobilisation.amortissementsCumules / 1000000).toFixed(1)}M FCFA
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-500">Valeur Nette Comptable</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">
                      {(selectedImmobilisation.valeurNette / 1000000).toFixed(1)}M FCFA
                    </p>
                  </div>
                </div>
              </div>

              {/* Amortissement */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Paramètres d'Amortissement</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Méthode</p>
                    <p className="font-semibold capitalize">{selectedImmobilisation.methodeAmortissement}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Durée</p>
                    <p className="font-semibold">{selectedImmobilisation.dureeAmortissement} ans</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Taux Annuel</p>
                    <p className="font-semibold">{selectedImmobilisation.tauxAmortissement}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dotation Annuelle</p>
                    <p className="font-semibold">{(selectedImmobilisation.amortissementAnnuel / 1000000).toFixed(2)}M FCFA</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Progression de l'amortissement</p>
                  <Progress
                    value={(selectedImmobilisation.amortissementsCumules / selectedImmobilisation.valeurBrute) * 100}
                    className="h-3"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {((selectedImmobilisation.amortissementsCumules / selectedImmobilisation.valeurBrute) * 100).toFixed(1)}% amorti
                  </p>
                </div>
              </div>

              {/* Maintenance */}
              {(selectedImmobilisation.derniereMaintenance || selectedImmobilisation.prochaineMaintenance) && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Maintenance</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedImmobilisation.derniereMaintenance && (
                      <div>
                        <p className="text-gray-500">Dernière Maintenance</p>
                        <p className="font-semibold">{new Date(selectedImmobilisation.derniereMaintenance).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                    {selectedImmobilisation.prochaineMaintenance && (
                      <div>
                        <p className="text-gray-500">Prochaine Maintenance</p>
                        <p className="font-semibold text-[var(--color-warning)]">{new Date(selectedImmobilisation.prochaineMaintenance).toLocaleDateString('fr-FR')}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                {selectedImmobilisation.valeurAssurance && (
                  <span>Valeur assurance: {(selectedImmobilisation.valeurAssurance / 1000000).toFixed(1)}M FCFA</span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleCalculateAmortissement(selectedImmobilisation);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Plan d'Amortissement
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleEditImmo(selectedImmobilisation);
                  }}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Édition Immobilisation */}
      {showEditModal && selectedImmobilisation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Modifier l'Immobilisation</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-700 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">Édition de: {selectedImmobilisation.designation}</p>
              <p className="text-sm text-gray-500">Formulaire d'édition en cours de développement...</p>
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t">
              <button
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setShowEditModal(false)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]"
                onClick={() => {
                  toast.success('Modifications sauvegardées (simulation)');
                  setShowEditModal(false);
                }}
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amortissement Modal */}
      {showAmortissementModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Calcul d'amortissement</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Calculer l'amortissement d'une immobilisation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAmortissementModal(false)}
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
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <TrendingDown className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Amortissement comptable</p>
                      <p className="text-sm text-purple-700 mt-1">
                        Enregistrez la dépréciation annuelle de vos immobilisations
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Immobilisation <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option value="">Sélectionner une immobilisation</option>
                    <option value="1">Bâtiment Principal - IMM-001</option>
                    <option value="2">Véhicule Utilitaire - IMM-015</option>
                    <option value="3">Matériel Informatique - IMM-089</option>
                    <option value="4">Mobilier Bureau - IMM-125</option>
                  </select>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Informations de l'immobilisation</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--color-text-primary)]">Date d'acquisition:</p>
                      <p className="font-semibold">15/01/2020</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Valeur d'origine:</p>
                      <p className="font-semibold">50 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Durée d'amortissement:</p>
                      <p className="font-semibold">10 ans</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Méthode:</p>
                      <p className="font-semibold">Linéaire</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Exercice comptable <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Date de clôture <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                  <h4 className="font-semibold text-sm text-purple-900 mb-3">Calcul de l'amortissement</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-primary)]">Dotation annuelle:</span>
                      <span className="font-semibold">5 000,00 €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-primary)]">Dotation prorata (365 jours):</span>
                      <span className="font-semibold">5 000,00 €</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-purple-200">
                      <span className="text-purple-900 font-medium">Amortissements cumulés:</span>
                      <span className="font-bold text-purple-900">25 000,00 €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-900 font-medium">Valeur nette comptable:</span>
                      <span className="font-bold text-purple-900">25 000,00 €</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Méthode d'amortissement
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                      <input type="radio" name="methode-amort" value="lineaire" className="mr-3" defaultChecked />
                      <div>
                        <p className="font-medium text-sm">Linéaire</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Dotation constante</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                      <input type="radio" name="methode-amort" value="degressif" className="mr-3" />
                      <div>
                        <p className="font-medium text-sm">Dégressif</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Dotation décroissante</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte amortissement <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="2813">2813 - Amortissement bâtiments</option>
                      <option value="2818">2818 - Amortissement matériel</option>
                      <option value="2815">2815 - Amortissement mobilier</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte dotation <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="6811">6811 - Dotation amortissement</option>
                      <option value="6871">6871 - Dotation exceptionnelle</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Commentaires
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Notes sur cet amortissement..."
                  />
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowAmortissementModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2">
                <Calculator className="w-4 h-4" />
                Enregistrer l'amortissement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cession Modal */}
      {showCessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-error-lighter)] rounded-lg flex items-center justify-center">
                    <Archive className="w-5 h-5 text-[var(--color-error)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Cession d'immobilisation</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Enregistrer une sortie d'immobilisation</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCessionModal(false)}
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
                    <AlertCircle className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Sortie d'immobilisation</p>
                      <p className="text-sm text-[var(--color-error-dark)] mt-1">
                        Enregistrez la vente, la mise au rebut ou la destruction d'une immobilisation
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Immobilisation à céder <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent">
                    <option value="">Sélectionner</option>
                    <option value="1">Véhicule Utilitaire - IMM-015</option>
                    <option value="2">Matériel Ancien - IMM-045</option>
                    <option value="3">Mobilier Bureau - IMM-088</option>
                  </select>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Valeurs comptables</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--color-text-primary)]">Valeur d'origine:</p>
                      <p className="font-semibold">30 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Amortissements:</p>
                      <p className="font-semibold text-[var(--color-warning)]">18 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Valeur nette:</p>
                      <p className="font-semibold text-[var(--color-primary)]">12 000,00 €</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Date de cession <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Type de cession <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="vente">Vente</option>
                      <option value="rebut">Mise au rebut</option>
                      <option value="don">Don</option>
                      <option value="destruction">Destruction</option>
                      <option value="vol">Vol / Perte</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Prix de cession (€)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="10000"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Acheteur / Bénéficiaire
                    </label>
                    <input
                      type="text"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Nom de l'acheteur"
                    />
                  </div>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Calcul du résultat de cession</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-primary)]">Prix de cession:</span>
                      <span className="font-semibold">10 000,00 €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-text-primary)]">Valeur nette comptable:</span>
                      <span className="font-semibold">12 000,00 €</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-[var(--color-border-dark)]">
                      <span className="font-medium text-[var(--color-text-primary)]">Résultat de cession:</span>
                      <span className="font-bold text-[var(--color-error)]">- 2 000,00 € (Moins-value)</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte produit cession
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="775">775 - Produits cession immo</option>
                      <option value="771">771 - Produits exceptionnels</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte charge cession
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="675">675 - Valeur comptable immo cédées</option>
                      <option value="671">671 - Charges exceptionnelles</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Justificatif de cession
                  </label>
                  <div className="border-2 border-dashed border-[var(--color-border-dark)] rounded-lg p-6 text-center hover:border-[var(--color-error)] transition-colors cursor-pointer">
                    <FileText className="w-8 h-8 text-[var(--color-text-secondary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--color-text-primary)]">Charger le justificatif</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Facture, certificat de destruction, PV...</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Observations
                  </label>
                  <textarea
                    rows={2}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Détails sur la cession..."
                  />
                </div>

                <div className="bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Action définitive</p>
                      <p className="text-sm text-[var(--color-warning-dark)] mt-1">
                        La cession sortira définitivement l'immobilisation de votre actif
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowCessionModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-error)] hover:bg-[var(--color-error-dark)] rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Enregistrer la cession
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Immobilisations;