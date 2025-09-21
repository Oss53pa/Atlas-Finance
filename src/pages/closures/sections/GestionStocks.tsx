import React, { useState, useMemo } from 'react';
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
import { Progress } from '../../../components/ui/progress';

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
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [filterCategorie, setFilterCategorie] = useState<string>('toutes');
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInventaireModal, setShowInventaireModal] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);

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
      return 'bg-red-100 text-red-800';
    } else if (article.stockPhysique <= article.stockSecurite) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
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
      case 'entree': return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'sortie': return <ArrowDownRight className="w-4 h-4 text-red-600" />;
      case 'transfert': return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case 'ajustement': return <Edit className="w-4 h-4 text-orange-600" />;
      case 'inventaire': return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
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
                <p className="text-sm text-gray-600">Valeur Stock Total</p>
                <p className="text-2xl font-bold">{(kpis.valeurTotaleStock / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-green-600 mt-1">+5% vs mois dernier</p>
              </div>
              <Warehouse className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Articles Critiques</p>
                <p className="text-2xl font-bold text-red-600">{kpis.nbArticlesCritiques}</p>
                <p className="text-xs text-gray-500 mt-1">Réapprovisionnement urgent</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rotation Moyenne</p>
                <p className="text-2xl font-bold">{kpis.rotationMoyenne.toFixed(1)}x</p>
                <Progress value={kpis.rotationMoyenne * 10} className="mt-2" />
              </div>
              <RefreshCw className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux Couverture</p>
                <p className="text-2xl font-bold">{kpis.tauxCouverture.toFixed(1)}%</p>
                <p className="text-xs text-green-600 mt-1">Objectif: 95%</p>
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
                          <div className={`w-4 h-4 rounded-full ${['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][index]}`} />
                          <span className="font-medium">{categorie}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{valeur}M FCFA</p>
                          <p className="text-sm text-gray-500">{pourcentage}%</p>
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
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                    <div>
                      <p className="font-medium">Rotation Rapide (&gt;10x)</p>
                      <p className="text-sm text-gray-600">Articles consommables</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">12</p>
                      <p className="text-sm text-gray-500">articles</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded">
                    <div>
                      <p className="font-medium">Rotation Normale (2-10x)</p>
                      <p className="text-sm text-gray-600">Équipements standards</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-600">25</p>
                      <p className="text-sm text-gray-500">articles</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                    <div>
                      <p className="font-medium">Rotation Lente (&lt;2x)</p>
                      <p className="text-sm text-gray-600">Immobilisations</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">8</p>
                      <p className="text-sm text-gray-500">articles</p>
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
                      <p className="text-sm text-gray-600">{mois}</p>
                      <p className="text-xl font-bold">{valeurs[index]}M</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
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
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Nouvel Article
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Article</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Catégorie</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Stock Physique</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Stock Mini</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valeur</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Rotation</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {articlesFiltres.map(article => (
                    <tr key={article.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{article.designation}</p>
                          <p className="text-sm text-gray-500">{article.code}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-blue-100 text-blue-800">
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
                        <span className={article.rotationStock > 5 ? 'text-green-600 font-medium' :
                          article.rotationStock > 2 ? 'text-yellow-600' : 'text-red-600'}>
                          {article.rotationStock.toFixed(1)}x
                        </span>
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

        {/* Mouvements */}
        <TabsContent value="mouvements" className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Entrées du Jour</p>
                    <p className="text-2xl font-bold text-green-600">3</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Sorties du Jour</p>
                    <p className="text-2xl font-bold text-red-600">8</p>
                  </div>
                  <ArrowDownRight className="w-6 h-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Ajustements</p>
                    <p className="text-2xl font-bold text-orange-600">2</p>
                  </div>
                  <Edit className="w-6 h-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">En Attente</p>
                    <p className="text-2xl font-bold text-blue-600">1</p>
                  </div>
                  <Clock className="w-6 h-6 text-blue-500" />
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Article</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Quantité</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Valeur</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Référence</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockMouvements.map(mouvement => (
                    <tr key={mouvement.id} className="border-t hover:bg-gray-50">
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
                          <p className="text-sm text-gray-500">{mouvement.articleDesignation}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={mouvement.quantite > 0 ? 'text-green-600' : 'text-red-600'}>
                          {mouvement.quantite > 0 ? '+' : ''}{mouvement.quantite}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className={mouvement.valeurTotale > 0 ? 'text-green-600' : 'text-red-600'}>
                          {(mouvement.valeurTotale / 1000000).toFixed(2)}M
                        </span>
                      </td>
                      <td className="px-4 py-3">{mouvement.reference}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          mouvement.statut === 'valide' ? 'bg-green-100 text-green-800' :
                          mouvement.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {mouvement.statut === 'valide' ? 'Validé' :
                           mouvement.statut === 'en_attente' ? 'En attente' : 'Annulé'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          {mouvement.statut === 'en_attente' && (
                            <button className="p-1 hover:bg-gray-100 rounded">
                              <CheckCircle className="w-4 h-4 text-green-600" />
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
                    <p className="text-sm text-gray-600">Inventaire en Cours</p>
                    <p className="text-2xl font-bold">1</p>
                    <p className="text-xs text-blue-600 mt-1">45% complété</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Écart Moyen</p>
                    <p className="text-2xl font-bold">-1.2%</p>
                    <p className="text-xs text-green-600 mt-1">Dans la norme</p>
                  </div>
                  <Calculator className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Dernier Inventaire</p>
                    <p className="text-2xl font-bold">5j</p>
                    <p className="text-xs text-gray-600 mt-1">INV-2024-12</p>
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
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Numéro</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Période</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Responsable</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Articles</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Écart</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInventaires.map(inventaire => (
                    <tr key={inventaire.id} className="border-t hover:bg-gray-50">
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
                            <p className="text-sm text-gray-500">
                              → {new Date(inventaire.dateFin).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">{inventaire.responsable}</td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="font-medium">{inventaire.nbArticlesComptes}</p>
                          <p className="text-sm text-gray-500">/ {inventaire.nbArticles}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className={`font-medium ${inventaire.ecartValeur < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {(inventaire.ecartValeur / 1000000).toFixed(2)}M
                          </p>
                          <p className="text-sm text-gray-500">{inventaire.pourcentageEcart}%</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          inventaire.statut === 'valide' ? 'bg-green-100 text-green-800' :
                          inventaire.statut === 'termine' ? 'bg-blue-100 text-blue-800' :
                          inventaire.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {inventaire.statut === 'valide' ? 'Validé' :
                           inventaire.statut === 'termine' ? 'Terminé' :
                           inventaire.statut === 'en_cours' ? 'En cours' : 'Annulé'}
                        </Badge>
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
                      <Badge className="bg-blue-100 text-blue-800">65%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Premier Entré, Premier Sorti</p>
                    <p className="text-2xl font-bold text-blue-600">16.5M FCFA</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">CMUP</h4>
                      <Badge className="bg-green-100 text-green-800">30%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Coût Moyen Unitaire Pondéré</p>
                    <p className="text-2xl font-bold text-green-600">7.6M FCFA</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">LIFO</h4>
                      <Badge className="bg-orange-100 text-orange-800">5%</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Dernier Entré, Premier Sorti</p>
                    <p className="text-2xl font-bold text-orange-600">1.4M FCFA</p>
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
                        <p className="text-sm text-gray-600">8 articles concernés</p>
                      </div>
                      <p className="text-xl font-bold text-orange-600">540K</p>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded">
                      <div>
                        <p className="font-medium">Dépréciation</p>
                        <p className="text-sm text-gray-600">3 articles concernés</p>
                      </div>
                      <p className="text-xl font-bold text-red-600">275K</p>
                    </div>
                  </div>
                  <button
                    className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
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
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Conformité SYSCOHADA</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Valorisation stocks</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Provisions obligatoires</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Documentation</span>
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Économies Fiscales</h4>
                    <p className="text-2xl font-bold text-green-600">245K FCFA</p>
                    <p className="text-sm text-gray-600">Provisions déductibles</p>
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
                              prevision.tendance === 'hausse' ? 'bg-green-100 text-green-800' :
                              prevision.tendance === 'baisse' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {prevision.tendance}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Demande prévue</p>
                              <p className="text-xl font-bold">{prevision.demandePrevue}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Fiabilité</p>
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
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Alertes stock critique</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Rapport hebdomadaire</span>
                        <CheckCircle className="w-4 h-4 text-green-600" />
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
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <Badge className="bg-green-100 text-green-800">+15%</Badge>
                  </div>
                  <p className="font-medium">Bureautique</p>
                  <p className="text-sm text-gray-600">Forte demande prévue</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <Badge className="bg-blue-100 text-blue-800">Stable</Badge>
                  </div>
                  <p className="font-medium">Informatique</p>
                  <p className="text-sm text-gray-600">Demande stable</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingDown className="w-5 h-5 text-yellow-600" />
                    <Badge className="bg-yellow-100 text-yellow-800">-5%</Badge>
                  </div>
                  <p className="font-medium">Mobilier</p>
                  <p className="text-sm text-gray-600">Baisse saisonnière</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <Badge className="bg-purple-100 text-purple-800">95%</Badge>
                  </div>
                  <p className="font-medium">Précision IA</p>
                  <p className="text-sm text-gray-600">Modèle fiable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GestionStocks;