import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Users,
  Calendar,
  Lock,
  Unlock,
  Send,
  Download,
  Eye,
  Edit,
  Play,
  Pause,
  RotateCcw,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Target,
  Award,
  Workflow,
  GitBranch,
  Activity,
  MessageSquare,
  Bell,
  Settings,
  Search,
  Filter,
  ChevronRight,
  Info,
  Star,
  Save,
  RefreshCw,
  Database,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';

interface EtapeValidation {
  id: string;
  nom: string;
  description: string;
  responsable: string;
  dateEcheance: string;
  statut: 'en_attente' | 'en_cours' | 'complete' | 'bloque' | 'erreur';
  progression: number;
  controles: ControleValidation[];
  dependances: string[];
  commentaires?: string;
  documentsRequis: string[];
  documentsJoints: string[];
}

interface ControleValidation {
  id: string;
  nom: string;
  type: 'automatique' | 'manuel' | 'mixte';
  criticite: 'faible' | 'moyenne' | 'elevee' | 'critique';
  statut: 'non_execute' | 'en_cours' | 'reussi' | 'echec' | 'alerte';
  resultat?: string;
  valeurAttendue?: string;
  valeurObtenue?: string;
  dernierExecution?: string;
  tempsExecution?: number;
}

interface Approbation {
  id: string;
  etapeId: string;
  utilisateur: string;
  role: string;
  dateApprobation: string;
  statut: 'approuve' | 'refuse' | 'en_attente';
  commentaire?: string;
  signature?: string;
}

interface PeriodeCloture {
  id: string;
  periode: string;
  type: 'mensuelle' | 'trimestrielle' | 'annuelle';
  dateDebut: string;
  dateFin: string;
  dateEcheance: string;
  statut: 'ouverte' | 'en_cours' | 'validee' | 'cloturee' | 'bloquee';
  responsableFinal: string;
  progression: number;
  etapes: EtapeValidation[];
  approbations: Approbation[];
}

const ValidationFinale: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('progression');
  const [selectedPeriode, setSelectedPeriode] = useState<PeriodeCloture | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedEtape, setSelectedEtape] = useState<EtapeValidation | null>(null);

  // Données simulées
  const mockPeriodes: PeriodeCloture[] = [
    {
      id: '1',
      periode: '2024-12',
      type: 'mensuelle',
      dateDebut: '2024-12-01',
      dateFin: '2024-12-31',
      dateEcheance: '2025-01-10',
      statut: 'en_cours',
      responsableFinal: 'Marie KOUASSI - Directrice Financière',
      progression: 85,
      etapes: [
        {
          id: '1',
          nom: 'Vérification Trésorerie',
          description: 'Contrôle des soldes de caisse et rapprochements bancaires',
          responsable: 'Jean OULAI - Comptable',
          dateEcheance: '2025-01-05',
          statut: 'complete',
          progression: 100,
          controles: [
            {
              id: '1',
              nom: 'Rapprochement Bancaire',
              type: 'automatique',
              criticite: 'elevee',
              statut: 'reussi',
              resultat: 'Tous les comptes rapprochés',
              dernierExecution: '2025-01-02'
            }
          ],
          dependances: [],
          documentsRequis: ['Relevés bancaires', 'Bordereaux de caisse'],
          documentsJoints: ['releve_dec_2024.pdf', 'bordereau_caisse.xlsx']
        },
        {
          id: '2',
          nom: 'Validation Cycle Clients',
          description: 'Contrôle des créances et provisions clients',
          responsable: 'Fatou DIALLO - Responsable Crédit',
          dateEcheance: '2025-01-07',
          statut: 'en_cours',
          progression: 75,
          controles: [
            {
              id: '2',
              nom: 'Balance âgée créances',
              type: 'mixte',
              criticite: 'elevee',
              statut: 'alerte',
              resultat: '3 créances douteuses détectées',
              valeurAttendue: '< 5% créances &gt; 90j',
              valeurObtenue: '7.2% créances &gt; 90j'
            }
          ],
          dependances: ['1'],
          documentsRequis: ['Balance clients', 'Justificatifs provisions'],
          documentsJoints: ['balance_clients_dec.xlsx']
        },
        {
          id: '3',
          nom: 'Contrôle États SYSCOHADA',
          description: 'Validation finale des états financiers',
          responsable: 'Marie KOUASSI - Directrice Financière',
          dateEcheance: '2025-01-10',
          statut: 'en_attente',
          progression: 0,
          controles: [
            {
              id: '3',
              nom: 'Cohérence Bilan/Résultat',
              type: 'automatique',
              criticite: 'critique',
              statut: 'non_execute'
            }
          ],
          dependances: ['1', '2'],
          documentsRequis: ['Bilan SYSCOHADA', 'Compte de résultat', 'TAFIRE'],
          documentsJoints: []
        }
      ],
      approbations: [
        {
          id: '1',
          etapeId: '1',
          utilisateur: 'Jean OULAI',
          role: 'Comptable',
          dateApprobation: '2025-01-05',
          statut: 'approuve',
          commentaire: 'Trésorerie conforme'
        }
      ]
    },
    {
      id: '2',
      periode: '2024-Q4',
      type: 'trimestrielle',
      dateDebut: '2024-10-01',
      dateFin: '2024-12-31',
      dateEcheance: '2025-01-31',
      statut: 'en_attente',
      responsableFinal: 'Marie KOUASSI - Directrice Financière',
      progression: 0,
      etapes: [],
      approbations: []
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const periodeEnCours = mockPeriodes.find(p => p.statut === 'en_cours');
    const totalEtapes = periodeEnCours?.etapes.length || 0;
    const etapesCompletes = periodeEnCours?.etapes.filter(e => e.statut === 'complete').length || 0;
    const controlesEchoues = periodeEnCours?.etapes.reduce((total, etape) =>
      total + etape.controles.filter(c => c.statut === 'echec').length, 0) || 0;
    const approbationsPendantes = periodeEnCours?.etapes.filter(e =>
      e.statut === 'complete' && !periodeEnCours.approbations.some(a => a.etapeId === e.id)).length || 0;

    return {
      totalEtapes,
      etapesCompletes,
      controlesEchoues,
      approbationsPendantes,
      progressionGlobale: periodeEnCours?.progression || 0,
      tempsRestant: 3, // jours
      alertesCritiques: 2
    };
  }, []);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'en_attente': 'bg-gray-100 text-gray-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'complete': 'bg-green-100 text-green-800',
      'bloque': 'bg-red-100 text-red-800',
      'erreur': 'bg-red-100 text-red-800'
    };
    return variants[statut] || 'bg-gray-100 text-gray-800';
  };

  const getCriticiteColor = (criticite: string) => {
    const colors: Record<string, string> = {
      'faible': 'text-green-600',
      'moyenne': 'text-yellow-600',
      'elevee': 'text-orange-600',
      'critique': 'text-red-600'
    };
    return colors[criticite] || 'text-gray-600';
  };

  const getControleIcon = (statut: string) => {
    switch (statut) {
      case 'reussi': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'echec': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'alerte': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'en_cours': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
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
                <p className="text-sm text-gray-600">Progression Globale</p>
                <p className="text-2xl font-bold">{kpis.progressionGlobale}%</p>
                <Progress value={kpis.progressionGlobale} className="mt-2" />
              </div>
              <Target className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Étapes Complètes</p>
                <p className="text-2xl font-bold">{kpis.etapesCompletes}/{kpis.totalEtapes}</p>
                <p className="text-xs text-green-600">{Math.round((kpis.etapesCompletes / kpis.totalEtapes) * 100)}% terminées</p>
              </div>
              <CheckSquare className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approbations Pendantes</p>
                <p className="text-2xl font-bold">{kpis.approbationsPendantes}</p>
                <p className="text-xs text-orange-600">En attente validation</p>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Temps Restant</p>
                <p className="text-2xl font-bold">{kpis.tempsRestant}j</p>
                <p className="text-xs text-red-600">Échéance proche</p>
              </div>
              <Clock className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes critiques */}
      {kpis.alertesCritiques > 0 && (
        <Alert className="border-l-4 border-l-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention:</strong> {kpis.alertesCritiques} alertes critiques nécessitent votre attention immédiate.
            Vérifiez les contrôles en échec avant la validation finale.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="progression">Progression</TabsTrigger>
          <TabsTrigger value="etapes">Étapes de Validation</TabsTrigger>
          <TabsTrigger value="controles">Contrôles</TabsTrigger>
          <TabsTrigger value="approbations">Approbations</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* Progression */}
        <TabsContent value="progression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tableau de Bord de Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Sélection de période */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Période: {mockPeriodes[0].periode}</h3>
                    <p className="text-sm text-gray-600">
                      Échéance: {new Date(mockPeriodes[0].dateEcheance).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Lancer Validation
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Valider Définitivement
                    </button>
                  </div>
                </div>

                {/* Workflow visuel */}
                <div className="space-y-4">
                  <h4 className="font-medium">Workflow de Validation</h4>
                  <div className="space-y-3">
                    {mockPeriodes[0].etapes.map((etape, index) => (
                      <div key={etape.id} className="relative">
                        <div className={`flex items-center p-4 border rounded-lg ${
                          etape.statut === 'complete' ? 'bg-green-50 border-green-200' :
                          etape.statut === 'en_cours' ? 'bg-blue-50 border-blue-200' :
                          etape.statut === 'bloque' ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              etape.statut === 'complete' ? 'bg-green-500' :
                              etape.statut === 'en_cours' ? 'bg-blue-500' :
                              etape.statut === 'bloque' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}>
                              {etape.statut === 'complete' ? (
                                <CheckCircle className="w-5 h-5 text-white" />
                              ) : etape.statut === 'en_cours' ? (
                                <Clock className="w-5 h-5 text-white" />
                              ) : etape.statut === 'bloque' ? (
                                <XCircle className="w-5 h-5 text-white" />
                              ) : (
                                <span className="text-white font-bold">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium">{etape.nom}</h5>
                              <p className="text-sm text-gray-600">{etape.description}</p>
                              <p className="text-xs text-gray-500">Responsable: {etape.responsable}</p>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatutBadge(etape.statut)}>
                                {etape.statut}
                              </Badge>
                              <div className="mt-2 w-32">
                                <Progress value={etape.progression} className="h-2" />
                                <p className="text-xs text-gray-500 mt-1">{etape.progression}%</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedEtape(etape)}
                              className="p-2 hover:bg-gray-100 rounded"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        {index < mockPeriodes[0].etapes.length - 1 && (
                          <div className="absolute left-5 top-16 w-0.5 h-4 bg-gray-300"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Étapes de Validation */}
        <TabsContent value="etapes" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Détail des Étapes</CardTitle>
              <div className="flex gap-2">
                <select className="px-3 py-2 border rounded-lg text-sm">
                  <option value="tous">Tous les statuts</option>
                  <option value="en_attente">En attente</option>
                  <option value="en_cours">En cours</option>
                  <option value="complete">Complète</option>
                  <option value="bloque">Bloquée</option>
                </select>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Actualiser
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockPeriodes[0].etapes.map(etape => (
                  <div key={etape.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{etape.nom}</h4>
                        <p className="text-sm text-gray-600 mt-1">{etape.description}</p>
                      </div>
                      <Badge className={getStatutBadge(etape.statut)}>
                        {etape.statut}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Responsable</p>
                        <p className="text-sm font-medium">{etape.responsable}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Échéance</p>
                        <p className="text-sm">{new Date(etape.dateEcheance).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Progression</p>
                        <div className="flex items-center gap-2">
                          <Progress value={etape.progression} className="flex-1 h-2" />
                          <span className="text-sm font-medium">{etape.progression}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Contrôles ({etape.controles.length})</p>
                      <div className="space-y-2">
                        {etape.controles.map(controle => (
                          <div key={controle.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              {getControleIcon(controle.statut)}
                              <span className="text-sm">{controle.nom}</span>
                              <Badge className={`text-xs ${getCriticiteColor(controle.criticite)}`}>
                                {controle.criticite}
                              </Badge>
                            </div>
                            {controle.resultat && (
                              <span className="text-xs text-gray-600">{controle.resultat}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {etape.documentsJoints.length}/{etape.documentsRequis.length} documents
                        </span>
                        {etape.dependances.length > 0 && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            {etape.dependances.length} dépendances
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <FileText className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded">
                          <Edit className="w-4 h-4 text-gray-600" />
                        </button>
                        {etape.statut === 'complete' && (
                          <button className="p-2 hover:bg-green-100 rounded">
                            <Shield className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contrôles */}
        <TabsContent value="controles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matrice des Contrôles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">12</p>
                    <p className="text-sm text-gray-600">Réussis</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">2</p>
                    <p className="text-sm text-gray-600">Échecs</p>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">3</p>
                    <p className="text-sm text-gray-600">Alertes</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">5</p>
                    <p className="text-sm text-gray-600">En cours</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {mockPeriodes[0].etapes.flatMap(etape =>
                    etape.controles.map(controle => (
                      <div key={`${etape.id}-${controle.id}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              {getControleIcon(controle.statut)}
                              <h5 className="font-medium">{controle.nom}</h5>
                              <Badge className={`text-xs ${getCriticiteColor(controle.criticite)}`}>
                                {controle.criticite}
                              </Badge>
                              <Badge className="text-xs bg-gray-100 text-gray-700">
                                {controle.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">Étape: {etape.nom}</p>
                            {controle.resultat && (
                              <p className="text-sm text-gray-800">{controle.resultat}</p>
                            )}
                            {controle.valeurAttendue && controle.valeurObtenue && (
                              <div className="mt-2 text-xs">
                                <span className="text-gray-500">Attendu: </span>
                                <span>{controle.valeurAttendue}</span>
                                <span className="text-gray-500 ml-4">Obtenu: </span>
                                <span className={controle.statut === 'echec' ? 'text-red-600' : 'text-green-600'}>
                                  {controle.valeurObtenue}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {controle.dernierExecution && (
                              <p className="text-xs text-gray-500">
                                {new Date(controle.dernierExecution).toLocaleDateString()}
                              </p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <RefreshCw className="w-4 h-4 text-gray-600" />
                              </button>
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Info className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approbations */}
        <TabsContent value="approbations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Circuit d'Approbation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">1</p>
                    <p className="text-sm text-gray-600">Approuvées</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-600">2</p>
                    <p className="text-sm text-gray-600">En attente</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">0</p>
                    <p className="text-sm text-gray-600">Refusées</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Approbations requises</h4>
                  {mockPeriodes[0].etapes
                    .filter(etape => etape.statut === 'complete')
                    .map(etape => {
                      const approbation = mockPeriodes[0].approbations.find(a => a.etapeId === etape.id);
                      return (
                        <div key={etape.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h5 className="font-medium">{etape.nom}</h5>
                              <p className="text-sm text-gray-600">Responsable: {etape.responsable}</p>
                            </div>
                            <div className="text-right">
                              {approbation ? (
                                <div>
                                  <Badge className="bg-green-100 text-green-800">
                                    Approuvé
                                  </Badge>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {approbation.utilisateur} - {new Date(approbation.dateApprobation).toLocaleDateString()}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                                    Approuver
                                  </button>
                                  <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                                    Refuser
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {approbation?.commentaire && (
                            <div className="mt-3 p-3 bg-gray-50 rounded">
                              <p className="text-sm">"{approbation.commentaire}"</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  }
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Validation Finale</h4>
                      <p className="text-sm text-gray-600">
                        Toutes les étapes doivent être approuvées avant la validation finale
                      </p>
                    </div>
                    <button
                      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      disabled={mockPeriodes[0].etapes.some(e => e.statut !== 'complete')}
                    >
                      <Shield className="w-5 h-5" />
                      Valider Définitivement
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historique */}
        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option value="tous">Toutes les périodes</option>
                      <option value="mensuelle">Mensuelles</option>
                      <option value="trimestrielle">Trimestrielles</option>
                      <option value="annuelle">Annuelles</option>
                    </select>
                    <select className="px-3 py-2 border rounded-lg text-sm">
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                    </select>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                </div>

                <div className="space-y-3">
                  {[
                    { periode: '2024-11', statut: 'cloturee', dateValidation: '2024-12-15', delai: 'Dans les temps' },
                    { periode: '2024-10', statut: 'cloturee', dateValidation: '2024-11-12', delai: 'Dans les temps' },
                    { periode: '2024-09', statut: 'cloturee', dateValidation: '2024-10-18', delai: 'Retard 3j' },
                    { periode: '2024-Q3', statut: 'cloturee', dateValidation: '2024-10-25', delai: 'Dans les temps' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Award className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Période {item.periode}</p>
                          <p className="text-sm text-gray-600">
                            Validée le {new Date(item.dateValidation).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-100 text-green-800">
                          {item.statut}
                        </Badge>
                        <p className={`text-xs mt-1 ${
                          item.delai.includes('Retard') ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {item.delai}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ValidationFinale;