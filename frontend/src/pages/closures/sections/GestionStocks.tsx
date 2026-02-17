import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Clock,
  Truck,
  ShoppingCart,
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
  Layers,
  Archive,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Warehouse
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/Progress';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';

interface Article {
  id: string;
  code: string;
  designation: string;
  categorie: string;
  famille: string;
  unite: string;
  prixUnitaire: number;
  stockPhysique: number;
  stockTheorique: number;
  stockMinimum: number;
  stockMaximum: number;
  stockSecurite: number;
  valeurStock: number;
  emplacement: string;
  fournisseurPrincipal: string;
  delaiApprovisionnement: number;
  methodeValorisaton: 'FIFO' | 'LIFO' | 'CMUP';
  tvaCode: string;
  dateDernierInventaire: string;
  statutQualite: 'bon' | 'defectueux' | 'obsolete' | 'perime';
  rotationStock: number;
  consommationMoyenne: number;
}

interface MouvementStock {
  id: string;
  articleId: string;
  articleCode: string;
  articleDesignation: string;
  type: 'entree' | 'sortie' | 'transfert' | 'ajustement' | 'inventaire';
  quantite: number;
  prixUnitaire: number;
  valeurTotale: number;
  reference: string;
  motif: string;
  emplacementSource?: string;
  emplacementDestination?: string;
  dateOperation: string;
  utilisateur: string;
  statut: 'valide' | 'en_attente' | 'annule';
  pieceJustificative?: string;
}

interface Inventaire {
  id: string;
  numero: string;
  type: 'complet' | 'tournant' | 'exceptionnel';
  dateDebut: string;
  dateFin?: string;
  statut: 'en_cours' | 'termine' | 'valide' | 'annule';
  responsable: string;
  nbArticles: number;
  nbArticlesComptes: number;
  ecartValeur: number;
  pourcentageEcart: number;
  observations?: string;
}

interface PrevisionDemande {
  articleId: string;
  periode: string;
  demandePrevue: number;
  demandeReelle?: number;
  fiabilite: number;
  tendance: 'hausse' | 'baisse' | 'stable';
  saisonnalite: boolean;
}

interface ProvisionStock {
  articleId: string;
  typeProvision: 'obsolescence' | 'depreciation' | 'deterioration';
  tauxProvision: number;
  montantProvision: number;
  justification: string;
  dateCreation: string;
  dateRevision?: string;
}

const GestionStocks: React.FC = () => {
  const { t } = useLanguage();
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [filterCategorie, setFilterCategorie] = useState<string>('toutes');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventaireModal, setShowInventaireModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMouvement, setSelectedMouvement] = useState<MouvementStock | null>(null);

  // Données simulées
  const mockArticles: Article[] = [
    {
      id: '1',
      code: 'ART001',
      designation: 'Ordinateur Portable HP EliteBook',
      categorie: 'Informatique',
      famille: 'Matériel Informatique',
      unite: 'Pièce',
      prixUnitaire: 850000,
      stockPhysique: 25,
      stockTheorique: 28,
      stockMinimum: 5,
      stockMaximum: 50,
      stockSecurite: 8,
      valeurStock: 21250000,
      emplacement: 'MAGASIN-A-01',
      fournisseurPrincipal: 'HP Distribution CI',
      delaiApprovisionnement: 15,
      methodeValorisaton: 'FIFO',
      tvaCode: '18%',
      dateDernierInventaire: '2024-11-01',
      statutQualite: 'bon',
      rotationStock: 4.2,
      consommationMoyenne: 6
    },
    {
      id: '2',
      code: 'ART002',
      designation: 'Papier A4 80g - Ramette 500 feuilles',
      categorie: 'Bureautique',
      famille: 'Consommables',
      unite: 'Ramette',
      prixUnitaire: 3500,
      stockPhysique: 150,
      stockTheorique: 150,
      stockMinimum: 20,
      stockMaximum: 200,
      stockSecurite: 30,
      valeurStock: 525000,
      emplacement: 'MAGASIN-B-02',
      fournisseurPrincipal: 'Papeterie Moderne',
      delaiApprovisionnement: 3,
      methodeValorisaton: 'CMUP',
      tvaCode: '18%',
      dateDernierInventaire: '2024-12-01',
      statutQualite: 'bon',
      rotationStock: 12.5,
      consommationMoyenne: 45
    },
    {
      id: '3',
      code: 'ART003',
      designation: 'Imprimante Laser Canon i-SENSYS',
      categorie: 'Informatique',
      famille: 'Périphériques',
      unite: 'Pièce',
      prixUnitaire: 450000,
      stockPhysique: 8,
      stockTheorique: 12,
      stockMinimum: 3,
      stockMaximum: 15,
      stockSecurite: 5,
      valeurStock: 3600000,
      emplacement: 'MAGASIN-A-02',
      fournisseurPrincipal: 'Canon Côte d\'Ivoire',
      delaiApprovisionnement: 10,
      methodeValorisaton: 'FIFO',
      tvaCode: '18%',
      dateDernierInventaire: '2024-10-15',
      statutQualite: 'bon',
      rotationStock: 2.8,
      consommationMoyenne: 2
    }
  ];

  const mockMouvements: MouvementStock[] = [
    {
      id: '1',
      articleId: '1',
      articleCode: 'ART001',
      articleDesignation: 'Ordinateur Portable HP EliteBook',
      type: 'entree',
      quantite: 10,
      prixUnitaire: 850000,
      valeurTotale: 8500000,
      reference: 'BL-2024-0234',
      motif: 'Réapprovisionnement stock',
      emplacementDestination: 'MAGASIN-A-01',
      dateOperation: '2024-12-18',
      utilisateur: 'Marie KOUAME',
      statut: 'valide',
      pieceJustificative: 'BL-2024-0234.pdf'
    },
    {
      id: '2',
      articleId: '2',
      articleCode: 'ART002',
      articleDesignation: 'Papier A4 80g - Ramette 500 feuilles',
      type: 'sortie',
      quantite: -25,
      prixUnitaire: 3500,
      valeurTotale: -87500,
      reference: 'DEM-2024-0156',
      motif: 'Distribution service comptabilité',
      emplacementSource: 'MAGASIN-B-02',
      dateOperation: '2024-12-19',
      utilisateur: 'Jean TRAORE',
      statut: 'valide'
    },
    {
      id: '3',
      articleId: '1',
      articleCode: 'ART001',
      articleDesignation: 'Ordinateur Portable HP EliteBook',
      type: 'ajustement',
      quantite: -3,
      prixUnitaire: 850000,
      valeurTotale: -2550000,
      reference: 'ADJ-2024-0045',
      motif: 'Écart inventaire - matériel défaillant',
      emplacementSource: 'MAGASIN-A-01',
      dateOperation: '2024-12-20',
      utilisateur: 'Paul KONE',
      statut: 'en_attente'
    }
  ];

  const mockInventaires: Inventaire[] = [
    {
      id: '1',
      numero: 'INV-2024-12',
      type: 'complet',
      dateDebut: '2024-12-01',
      dateFin: '2024-12-05',
      statut: 'termine',
      responsable: 'Sophie DIABATE',
      nbArticles: 450,
      nbArticlesComptes: 445,
      ecartValeur: -2850000,
      pourcentageEcart: -1.2,
      observations: 'Écarts mineurs sur articles informatiques'
    },
    {
      id: '2',
      numero: 'INV-2024-11',
      type: 'tournant',
      dateDebut: '2024-11-15',
      dateFin: '2024-11-16',
      statut: 'valide',
      responsable: 'Marc KOFFI',
      nbArticles: 120,
      nbArticlesComptes: 120,
      ecartValeur: 125000,
      pourcentageEcart: 0.8,
      observations: 'Inventaire tournant - Zone A'
    }
  ];

  const mockPrevisions: PrevisionDemande[] = [
    {
      articleId: '1',
      periode: '2025-01',
      demandePrevue: 8,
      fiabilite: 85,
      tendance: 'stable',
      saisonnalite: false
    },
    {
      articleId: '2',
      periode: '2025-01',
      demandePrevue: 65,
      fiabilite: 92,
      tendance: 'hausse',
      saisonnalite: true
    }
  ];

  const mockProvisions: ProvisionStock[] = [
    {
      articleId: '3',
      typeProvision: 'obsolescence',
      tauxProvision: 15,
      montantProvision: 540000,
      justification: 'Modèle remplacé par nouvelle génération',
      dateCreation: '2024-12-01',
      dateRevision: '2024-12-20'
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const valeurTotaleStock = mockArticles.reduce((sum, art) => sum + art.valeurStock, 0);
    const nbArticlesCritiques = mockArticles.filter(art => art.stockPhysique <= art.stockMinimum).length;
    const nbArticlesObsoletes = mockArticles.filter(art => art.statutQualite === 'obsolete').length;
    const rotationMoyenne = mockArticles.reduce((sum, art) => sum + art.rotationStock, 0) / mockArticles.length;
    const totalProvisions = mockProvisions.reduce((sum, prov) => sum + prov.montantProvision, 0);
    const tauxCouverture = mockArticles.filter(art => art.stockPhysique >= art.stockMinimum).length / mockArticles.length * 100;

    return {
      valeurTotaleStock,
      nbArticlesCritiques,
      nbArticlesObsoletes,
      rotationMoyenne,
      totalProvisions,
      tauxCouverture,
      nbMouvementsJour: mockMouvements.filter(mouv => mouv.dateOperation === '2024-12-20').length,
      ecartInventairePourcentage: -1.2
    };
  }, []);

  // Filtrage des articles
  const articlesFiltres = useMemo(() => {
    return mockArticles.filter(article => {
      const matchCategorie = filterCategorie === 'toutes' || article.categorie === filterCategorie;
      const matchStatut = filterStatut === 'tous' ||
        (filterStatut === 'critique' && article.stockPhysique <= article.stockMinimum) ||
        (filterStatut === 'normal' && article.stockPhysique > article.stockMinimum) ||
        (filterStatut === 'obsolete' && article.statutQualite === 'obsolete');
      const matchSearch = searchTerm === '' ||
        article.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategorie && matchStatut && matchSearch;
    });
  }, [filterCategorie, filterStatut, searchTerm]);

  const getStatutStockBadge = (article: Article) => {
    if (article.stockPhysique <= article.stockMinimum) {
      return 'bg-[var(--color-error-lighter)] text-red-800';
    } else if (article.stockPhysique <= article.stockSecurite) {
      return 'bg-[var(--color-warning-lighter)] text-yellow-800';
    } else {
      return 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]';
    }
  };

  const getStatutStockLabel = (article: Article) => {
    if (article.stockPhysique <= article.stockMinimum) {
      return 'Critique';
    } else if (article.stockPhysique <= article.stockSecurite) {
      return 'Alerte';
    } else {
      return 'Normal';
    }
  };

  const getTypeMouvementIcon = (type: string) => {
    switch (type) {
      case 'entree': return <ArrowUpRight className="w-4 h-4 text-[var(--color-success)]" />;
      case 'sortie': return <ArrowDownRight className="w-4 h-4 text-[var(--color-error)]" />;
      case 'transfert': return <RefreshCw className="w-4 h-4 text-[var(--color-primary)]" />;
      case 'ajustement': return <Edit className="w-4 h-4 text-[var(--color-warning)]" />;
      case 'inventaire': return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default: return <Activity className="w-4 h-4 text-[var(--color-text-primary)]" />;
    }
  };

  // Handler functions
  const handleViewArticleDetail = (article: Article) => {
    setSelectedArticle(article);
    setShowDetailModal(true);
    toast.success(`Affichage de l'article: ${article.designation}`);
  };

  const handleEditArticle = (article: Article) => {
    toast.success(`Édition de l'article: ${article.code}`);
  };

  const handleViewMouvementDetail = (mouvement: MouvementStock) => {
    setSelectedMouvement(mouvement);
    toast.success(`Affichage du mouvement: ${mouvement.reference}`);
  };

  const handleValidateMouvement = (mouvement: MouvementStock) => {
    toast.success(`Mouvement ${mouvement.reference} validé`);
  };

  const handleNouvelArticle = () => {
    toast.success('Création d\'un nouvel article');
  };

  const handleExportArticles = () => {
    toast.success('Export des articles en cours...');
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Valeur Stock Total</p>
                <p className="text-lg font-bold">{(kpis.valeurTotaleStock / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-[var(--color-success)] mt-1">+5% vs mois dernier</p>
              </div>
              <Warehouse className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Articles Critiques</p>
                <p className="text-lg font-bold text-[var(--color-error)]">{kpis.nbArticlesCritiques}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Réapprovisionnement urgent</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-[var(--color-error)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Rotation Moyenne</p>
                <p className="text-lg font-bold">{kpis.rotationMoyenne.toFixed(1)}x</p>
                <Progress value={kpis.rotationMoyenne * 10} className="mt-2" />
              </div>
              <RefreshCw className="w-8 h-8 text-[var(--color-success)]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Taux Couverture</p>
                <p className="text-lg font-bold">{kpis.tauxCouverture.toFixed(1)}%</p>
                <p className="text-xs text-[var(--color-success)] mt-1">Objectif: 95%</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes IA */}
      <Alert className="border-l-4 border-l-orange-500">
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Analyse IA:</strong> {kpis.nbArticlesCritiques} articles nécessitent un réapprovisionnement urgent.
          Prévision d'augmentation de 15% de la demande pour les consommables bureautiques en janvier.
        </AlertDescription>
      </Alert>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="mouvements">Mouvements</TabsTrigger>
          <TabsTrigger value="inventaires">Inventaires</TabsTrigger>
          <TabsTrigger value="valorisation">Valorisation</TabsTrigger>
          <TabsTrigger value="ia-previsions">IA & Prévisions</TabsTrigger>
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
                  {['Informatique', 'Bureautique', 'Mobilier', 'Consommables'].map((categorie, index) => {
                    const pourcentage = [45, 30, 15, 10][index];
                    const valeur = [11.25, 7.5, 3.75, 2.5][index];
                    return (
                      <div key={categorie} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${['bg-[var(--color-primary)]', 'bg-[var(--color-success)]', 'bg-[var(--color-warning)]', 'bg-purple-500'][index]}`} />
                          <span className="font-medium">{categorie}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{valeur}M FCFA</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{pourcentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analyse de Rotation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[var(--color-success-lightest)] rounded">
                    <div>
                      <p className="font-medium">Rotation Rapide (&gt;10x)</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Articles consommables</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-success)]">12</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">articles</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--color-warning-lightest)] rounded">
                    <div>
                      <p className="font-medium">Rotation Normale (2-10x)</p>
                      <p className="text-sm text-[var(--color-text-primary)]">Équipements standards</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-warning)]">25</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">articles</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[var(--color-error-lightest)] rounded">
                    <div>
                      <p className="font-medium">Rotation Lente (&lt;2x)</p>
                      <p className="text-sm text-[var(--color-text-primary)]">{t('navigation.assets')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[var(--color-error)]">8</p>
                      <p className="text-sm text-[var(--color-text-secondary)]">articles</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Évolution Mensuelle du Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4">
                {['Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'].map((mois, index) => {
                  const valeurs = [22.5, 23.8, 24.2, 25.1, 24.8, 25.5];
                  return (
                    <div key={mois} className="text-center p-3 border rounded">
                      <p className="text-sm text-[var(--color-text-primary)]">{mois}</p>
                      <p className="text-lg font-bold">{valeurs[index]}M</p>
                      <div className="w-full bg-[var(--color-border)] rounded-full h-2 mt-2">
                        <div
                          className="bg-[var(--color-primary)] h-2 rounded-full"
                          style={{ width: `${(valeurs[index] / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Articles */}
        <TabsContent value="articles" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-secondary)]" />
                <input
                  type="text"
                  placeholder="Rechercher un article..."
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
                <option value="Informatique">Informatique</option>
                <option value="Bureautique">Bureautique</option>
                <option value="Mobilier">Mobilier</option>
              </select>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous statuts</option>
                <option value="normal">Normal</option>
                <option value="critique">Critique</option>
                <option value="obsolete">Obsolète</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleNouvelArticle}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nouvel Article
              </button>
              <button
                onClick={handleExportArticles}
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Article</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Stock Physique</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Stock Mini</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Valeur</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Rotation</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articlesFiltres.map(article => (
                    <tr key={article.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{article.designation}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{article.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">
                          {article.categorie}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {article.stockPhysique} {article.unite}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {article.stockMinimum} {article.unite}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(article.valeurStock / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatutStockBadge(article)}>
                          {getStatutStockLabel(article)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={article.rotationStock > 5 ? 'text-[var(--color-success)] font-medium' :
                          article.rotationStock > 2 ? 'text-[var(--color-warning)]' : 'text-[var(--color-error)]'}>
                          {article.rotationStock.toFixed(1)}x
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewArticleDetail(article)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          <button
                            onClick={() => handleEditArticle(article)}
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

        {/* Mouvements */}
        <TabsContent value="mouvements" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Entrées du Jour</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">3</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Sorties du Jour</p>
                    <p className="text-lg font-bold text-[var(--color-error)]">8</p>
                  </div>
                  <ArrowDownRight className="w-6 h-6 text-[var(--color-error)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Ajustements</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">2</p>
                  </div>
                  <Edit className="w-6 h-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">En Attente</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">1</p>
                  </div>
                  <Clock className="w-6 h-6 text-[var(--color-primary)]" />
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Article</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Quantité</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Valeur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Référence</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMouvements.map(mouvement => (
                    <tr key={mouvement.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3">
                        {new Date(mouvement.dateOperation).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getTypeMouvementIcon(mouvement.type)}
                          <span className="capitalize">{mouvement.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{mouvement.articleCode}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{mouvement.articleDesignation}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={mouvement.quantite > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                          {mouvement.quantite > 0 ? '+' : ''}{mouvement.quantite}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={mouvement.valeurTotale > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>
                          {(mouvement.valeurTotale / 1000000).toFixed(2)}M
                        </span>
                      </td>
                      <td className="px-4 py-3">{mouvement.reference}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          mouvement.statut === 'valide' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          mouvement.statut === 'en_attente' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                          'bg-[var(--color-error-lighter)] text-red-800'
                        }>
                          {mouvement.statut === 'valide' ? 'Validé' :
                           mouvement.statut === 'en_attente' ? 'En attente' : 'Annulé'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewMouvementDetail(mouvement)}
                            className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                            aria-label="Voir les détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-primary)]" />
                          </button>
                          {mouvement.statut === 'en_attente' && (
                            <button
                              onClick={() => handleValidateMouvement(mouvement)}
                              className="p-1 hover:bg-[var(--color-background-hover)] rounded"
                              aria-label="Valider"
                            >
                              <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventaires */}
        <TabsContent value="inventaires" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Gestion des Inventaires</h3>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              onClick={() => setShowInventaireModal(true)}
            >
              <Plus className="w-4 h-4" />
              Nouvel Inventaire
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Inventaire en Cours</p>
                    <p className="text-lg font-bold">1</p>
                    <p className="text-xs text-[var(--color-primary)] mt-1">45% complété</p>
                  </div>
                  <Activity className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Écart Moyen</p>
                    <p className="text-lg font-bold">-1.2%</p>
                    <p className="text-xs text-[var(--color-success)] mt-1">Dans la norme</p>
                  </div>
                  <Calculator className="w-8 h-8 text-[var(--color-success)]" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--color-text-primary)]">Dernier Inventaire</p>
                    <p className="text-lg font-bold">5j</p>
                    <p className="text-xs text-[var(--color-text-primary)] mt-1">INV-2024-12</p>
                  </div>
                  <Calendar className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historique des Inventaires</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-[var(--color-background-secondary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Numéro</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Période</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-primary)]">Responsable</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Articles</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-primary)]">Écart</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-[var(--color-text-primary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInventaires.map(inventaire => (
                    <tr key={inventaire.id} className="border-t hover:bg-[var(--color-background-secondary)]">
                      <td className="px-4 py-3 font-medium">{inventaire.numero}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-purple-100 text-purple-800 capitalize">
                          {inventaire.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p>{new Date(inventaire.dateDebut).toLocaleDateString()}</p>
                          {inventaire.dateFin && (
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              → {new Date(inventaire.dateFin).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{inventaire.responsable}</td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="font-medium">{inventaire.nbArticlesComptes}</p>
                          <p className="text-sm text-[var(--color-text-secondary)]">/ {inventaire.nbArticles}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className={`font-medium ${inventaire.ecartValeur < 0 ? 'text-[var(--color-error)]' : 'text-[var(--color-success)]'}`}>
                            {(inventaire.ecartValeur / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-sm text-[var(--color-text-secondary)]">{inventaire.pourcentageEcart}%</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          inventaire.statut === 'valide' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          inventaire.statut === 'termine' ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]' :
                          inventaire.statut === 'en_cours' ? 'bg-[var(--color-warning-lighter)] text-yellow-800' :
                          'bg-[var(--color-error-lighter)] text-red-800'
                        }>
                          {inventaire.statut === 'valide' ? 'Validé' :
                           inventaire.statut === 'termine' ? 'Terminé' :
                           inventaire.statut === 'en_cours' ? 'En cours' : 'Annulé'}
                        </Badge>
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

        {/* Valorisation */}
        <TabsContent value="valorisation" className="space-y-4">
          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Méthodes de Valorisation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">FIFO</h4>
                      <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">65%</Badge>
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)]">Premier Entré, Premier Sorti</p>
                    <p className="text-lg font-bold text-[var(--color-primary)]">16.5M FCFA</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">CMUP</h4>
                      <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">30%</Badge>
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)]">Coût Moyen Unitaire Pondéré</p>
                    <p className="text-lg font-bold text-[var(--color-success)]">7.6M FCFA</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">LIFO</h4>
                      <Badge className="bg-[var(--color-warning-lighter)] text-orange-800">5%</Badge>
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)]">Dernier Entré, Premier Sorti</p>
                    <p className="text-lg font-bold text-[var(--color-warning)]">1.4M FCFA</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Provisions pour Dépréciation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert className="border-l-4 border-l-orange-500">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Provisions requises selon SYSCOHADA pour articles obsolètes et dépréciés
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-orange-50 rounded">
                      <div>
                        <p className="font-medium">Obsolescence</p>
                        <p className="text-sm text-[var(--color-text-primary)]">8 articles concernés</p>
                      </div>
                      <p className="text-lg font-bold text-[var(--color-warning)]">540K</p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[var(--color-error-lightest)] rounded">
                      <div>
                        <p className="font-medium">Dépréciation</p>
                        <p className="text-sm text-[var(--color-text-primary)]">3 articles concernés</p>
                      </div>
                      <p className="text-lg font-bold text-[var(--color-error)]">275K</p>
                    </div>
                  </div>
                  <button
                    className="w-full px-4 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-orange-700"
                    onClick={() => setShowProvisionModal(true)}
                  >
                    Comptabiliser Provisions
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Impact Fiscal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-[var(--color-primary-lightest)] rounded-lg">
                    <h4 className="font-medium mb-2">Conformité SYSCOHADA</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Valorisation stocks</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Provisions obligatoires</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Documentation</span>
                        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)]" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Économies Fiscales</h4>
                    <p className="text-lg font-bold text-[var(--color-success)]">245K FCFA</p>
                    <p className="text-sm text-[var(--color-text-primary)]">Provisions déductibles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* IA & Prévisions */}
        <TabsContent value="ia-previsions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                Prévisions de Demande par IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Prévisions Janvier 2025</h4>
                  <div className="space-y-3">
                    {mockPrevisions.map(prevision => {
                      const article = mockArticles.find(a => a.id === prevision.articleId);
                      return (
                        <div key={prevision.articleId} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium">{article?.designation}</p>
                            <Badge className={
                              prevision.tendance === 'hausse' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                              prevision.tendance === 'baisse' ? 'bg-[var(--color-error-lighter)] text-red-800' :
                              'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]'
                            }>
                              {prevision.tendance}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-[var(--color-text-primary)]">Demande prévue</p>
                              <p className="text-lg font-bold">{prevision.demandePrevue}</p>
                            </div>
                            <div>
                              <p className="text-sm text-[var(--color-text-primary)]">Fiabilité</p>
                              <div className="flex items-center gap-2">
                                <Progress value={prevision.fiabilite} className="flex-1" />
                                <span className="text-sm font-medium">{prevision.fiabilite}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Recommandations Automatiques</h4>
                  <div className="space-y-3">
                    <Alert className="border-l-4 border-l-green-500">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Commande suggérée:</strong> Papier A4 - 100 ramettes.
                        Approvisionnement recommandé avant le 15 janvier.
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-l-4 border-l-orange-500">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Stock critique:</strong> Ordinateurs portables sous le minimum.
                        Délai d'approvisionnement: 15 jours.
                      </AlertDescription>
                    </Alert>
                    <Alert className="border-l-4 border-l-blue-500">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Optimisation:</strong> Réviser le stock maximum des imprimantes.
                        Rotation lente détectée.
                      </AlertDescription>
                    </Alert>
                  </div>

                  <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      Actions Automatisées
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Commandes automatiques activées</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Alertes stock critique</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rapport hebdomadaire</span>
                        <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Analyse Prédictive des Tendances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                    <Badge className="bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]">+15%</Badge>
                  </div>
                  <p className="font-medium">Bureautique</p>
                  <p className="text-sm text-[var(--color-text-primary)]">Forte demande prévue</p>
                </div>
                <div className="p-4 bg-[var(--color-primary-lightest)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-[var(--color-primary)]" />
                    <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">Stable</Badge>
                  </div>
                  <p className="font-medium">Informatique</p>
                  <p className="text-sm text-[var(--color-text-primary)]">Demande stable</p>
                </div>
                <div className="p-4 bg-[var(--color-warning-lightest)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-[var(--color-warning)]" />
                    <Badge className="bg-[var(--color-warning-lighter)] text-yellow-800">-5%</Badge>
                  </div>
                  <p className="font-medium">Mobilier</p>
                  <p className="text-sm text-[var(--color-text-primary)]">Baisse saisonnière</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <Badge className="bg-purple-100 text-purple-800">95%</Badge>
                  </div>
                  <p className="font-medium">Précision IA</p>
                  <p className="text-sm text-[var(--color-text-primary)]">Modèle fiable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Inventaire Modal */}
      {showInventaireModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-primary-lighter)] rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Nouvel inventaire</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Démarrer un inventaire des stocks</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInventaireModal(false)}
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
                <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-4">
                  <div className="flex gap-3">
                    <Warehouse className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-primary-darker)]">Inventaire physique</p>
                      <p className="text-sm text-[var(--color-primary-dark)] mt-1">
                        Enregistrez un comptage physique des stocks pour ajuster les écarts
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Date d'inventaire <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Type d'inventaire <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="total">Inventaire total</option>
                      <option value="partiel">Inventaire partiel</option>
                      <option value="tournant">Inventaire tournant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Entrepôt / Site <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="">Sélectionner un site</option>
                    <option value="principal">Entrepôt Principal</option>
                    <option value="secondaire">Entrepôt Secondaire</option>
                    <option value="magasin1">Magasin 1</option>
                    <option value="magasin2">Magasin 2</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Catégorie de produits
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Toutes les catégories</option>
                      <option value="matieres">Matières premières</option>
                      <option value="produits">Produits finis</option>
                      <option value="encours">En-cours</option>
                      <option value="marchandises">Marchandises</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Responsable <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="Marie Kouam">Marie Kouam</option>
                      <option value="Jean Dupont">Jean Dupont</option>
                      <option value="Sophie Martin">Sophie Martin</option>
                    </select>
                  </div>
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-3">Méthode de comptage</h4>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                      <input type="radio" name="methode" value="manuel" className="mt-0.5" defaultChecked />
                      <div>
                        <p className="font-medium text-sm">Comptage manuel</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Saisie manuelle des quantités</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                      <input type="radio" name="methode" value="scanner" className="mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Scanner codes-barres</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Scan avec lecteur de codes-barres</p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] transition-colors">
                      <input type="radio" name="methode" value="import" className="mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Import fichier</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Importer depuis Excel/CSV</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Commentaires ou observations sur cet inventaire..."
                  />
                </div>

                <div className="flex items-start gap-2 p-3 bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    L'inventaire bloquera temporairement les mouvements de stock sur le site sélectionné
                  </p>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-[var(--color-background-secondary)] px-6 py-4 rounded-b-lg border-t border-[var(--color-border)] flex justify-end gap-3">
              <button
                onClick={() => setShowInventaireModal(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-background-hover)] rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-lg transition-colors flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Démarrer l'inventaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-[var(--color-border)] px-6 py-4 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--color-warning-lighter)] rounded-lg flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-[var(--color-warning)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Nouvelle provision</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">Enregistrer une dépréciation de stock</p>
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
                      <p className="text-sm font-medium text-orange-900">Provision pour dépréciation</p>
                      <p className="text-sm text-[var(--color-warning-dark)] mt-1">
                        Provisionner la perte de valeur des stocks obsolètes, endommagés ou à rotation lente
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
                      Type de provision <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                      <option value="">Sélectionner</option>
                      <option value="obsolescence">Obsolescence</option>
                      <option value="deterioration">Détérioration</option>
                      <option value="rotation">Rotation lente</option>
                      <option value="peremption">Péremption</option>
                      <option value="depreciation">Dépréciation marché</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Produit / Catégorie <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                    <option value="">Sélectionner un produit</option>
                    <option value="produit1">Produit A - REF001</option>
                    <option value="produit2">Produit B - REF002</option>
                    <option value="categorie1">Catégorie: Matières premières</option>
                    <option value="categorie2">Catégorie: Produits finis</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Valeur comptable (€)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="10000"
                      step="0.01"
                      disabled
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Valeur estimée (€) <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="7000"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Montant provision (€)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 bg-[var(--color-background-hover)] font-mono font-semibold text-[var(--color-warning)]"
                      value="3000"
                      disabled
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Taux de dépréciation (%)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="30"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                      Compte comptable <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <select className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm">
                      <option value="">Sélectionner</option>
                      <option value="6817">6817 - Dotation provisions stocks</option>
                      <option value="3917">3917 - Provision dépréciation stocks</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Méthode d'évaluation
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                      <input type="radio" name="methode-eval" value="individuelle" className="mr-3" defaultChecked />
                      <div>
                        <p className="font-medium text-sm">Individuelle</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Par produit</p>
                      </div>
                    </label>
                    <label className="flex items-center p-3 border border-[var(--color-border-dark)] rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                      <input type="radio" name="methode-eval" value="globale" className="mr-3" />
                      <div>
                        <p className="font-medium text-sm">Globale</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Par catégorie</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Justification <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    className="w-full border border-[var(--color-border-dark)] rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Expliquez les raisons de cette provision (obsolescence technique, changement de normes, baisse du marché...)"
                  />
                </div>

                <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-background-secondary)]">
                  <h4 className="font-semibold text-sm text-[var(--color-text-primary)] mb-2">Impact financier</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--color-text-primary)]">Résultat:</p>
                      <p className="font-semibold text-[var(--color-error)]">- 3 000,00 €</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-text-primary)]">Valeur nette stocks:</p>
                      <p className="font-semibold">7 000,00 €</p>
                    </div>
                  </div>
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
              <button
                onClick={() => {
                  toast.success('Provision enregistrée avec succès');
                  setShowProvisionModal(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-warning)] hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Enregistrer la provision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionStocks;