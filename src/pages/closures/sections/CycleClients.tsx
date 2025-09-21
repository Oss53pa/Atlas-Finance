import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  TrendingUp,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  PieChart,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Download,
  Send,
  Eye,
  Brain,
  Zap,
  AlertTriangle,
  Search,
  ChevronRight,
  TrendingDown,
  RefreshCw,
  Mail,
  Phone,
  Shield,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Alert, AlertDescription } from '../../../components/ui/Alert';
import { Badge } from '../../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/Tabs';
import { Progress } from '../../../components/ui/progress';

interface Client {
  id: string;
  code: string;
  nom: string;
  type: 'particulier' | 'entreprise' | 'administration';
  secteur: string;
  email: string;
  telephone: string;
  adresse: string;
  limiteCredit: number;
  delaiPaiement: number;
  statutRisque: 'faible' | 'modere' | 'eleve' | 'critique';
  chiffreAffaires: number;
  encours: number;
  dernierPaiement?: string;
  dateCreation: string;
}

interface Creance {
  id: string;
  clientId: string;
  clientNom: string;
  numeroFacture: string;
  dateFacture: string;
  dateEcheance: string;
  montantTTC: number;
  montantRegle: number;
  solde: number;
  statut: 'en_cours' | 'echue' | 'contentieux' | 'provision' | 'irrecoverable';
  joursRetard: number;
  tauxProvision?: number;
  montantProvision?: number;
  actionsRelance: RelanceAction[];
}

interface RelanceAction {
  id: string;
  date: string;
  type: 'email' | 'telephone' | 'courrier' | 'visite' | 'mise_en_demeure';
  statut: 'planifie' | 'execute' | 'reporte';
  resultat?: string;
  prochainContact?: string;
}

interface AnalyseRisque {
  clientId: string;
  scoreCredit: number;
  probabiliteDefaut: number;
  expositionMax: number;
  recommandations: string[];
  derniereMiseAJour: string;
}

const CycleClients: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState('vue-ensemble');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterStatut, setFilterStatut] = useState<string>('tous');
  const [searchTerm, setSearchTerm] = useState('');
  const [showProvisionModal, setShowProvisionModal] = useState(false);

  // Données simulées
  const mockClients: Client[] = [
    {
      id: '1',
      code: 'CL001',
      nom: 'SOCIETE IVOIRIENNE DE DISTRIBUTION',
      type: 'entreprise',
      secteur: 'Distribution',
      email: 'contact@sid.ci',
      telephone: '+225 27 20 30 40 50',
      adresse: 'Abidjan, Plateau',
      limiteCredit: 50000000,
      delaiPaiement: 30,
      statutRisque: 'modere',
      chiffreAffaires: 120000000,
      encours: 25000000,
      dernierPaiement: '2024-12-10',
      dateCreation: '2020-01-15'
    },
    {
      id: '2',
      code: 'CL002',
      nom: 'MINISTERE DES FINANCES',
      type: 'administration',
      secteur: 'Public',
      email: 'marches@finances.gouv.ci',
      telephone: '+225 27 20 21 08 00',
      adresse: 'Abidjan, Plateau',
      limiteCredit: 200000000,
      delaiPaiement: 60,
      statutRisque: 'faible',
      chiffreAffaires: 500000000,
      encours: 180000000,
      dernierPaiement: '2024-11-30',
      dateCreation: '2019-06-01'
    },
    {
      id: '3',
      code: 'CL003',
      nom: 'ENTREPRISE KOUASSI & FILS',
      type: 'entreprise',
      secteur: 'BTP',
      email: 'info@kouassi-fils.ci',
      telephone: '+225 07 08 09 10 11',
      adresse: 'Yamoussoukro',
      limiteCredit: 15000000,
      delaiPaiement: 45,
      statutRisque: 'eleve',
      chiffreAffaires: 35000000,
      encours: 18000000,
      dernierPaiement: '2024-10-15',
      dateCreation: '2021-03-20'
    }
  ];

  const mockCreances: Creance[] = [
    {
      id: '1',
      clientId: '1',
      clientNom: 'SOCIETE IVOIRIENNE DE DISTRIBUTION',
      numeroFacture: 'FA2024-0156',
      dateFacture: '2024-10-01',
      dateEcheance: '2024-10-31',
      montantTTC: 5000000,
      montantRegle: 0,
      solde: 5000000,
      statut: 'echue',
      joursRetard: 60,
      tauxProvision: 25,
      montantProvision: 1250000,
      actionsRelance: [
        {
          id: '1',
          date: '2024-11-05',
          type: 'email',
          statut: 'execute',
          resultat: 'Email envoyé, pas de réponse'
        },
        {
          id: '2',
          date: '2024-11-15',
          type: 'telephone',
          statut: 'execute',
          resultat: 'Promesse de paiement sous 15 jours'
        }
      ]
    },
    {
      id: '2',
      clientId: '3',
      clientNom: 'ENTREPRISE KOUASSI & FILS',
      numeroFacture: 'FA2024-0089',
      dateFacture: '2024-08-15',
      dateEcheance: '2024-09-29',
      montantTTC: 8000000,
      montantRegle: 2000000,
      solde: 6000000,
      statut: 'contentieux',
      joursRetard: 92,
      tauxProvision: 50,
      montantProvision: 3000000,
      actionsRelance: [
        {
          id: '3',
          date: '2024-12-01',
          type: 'mise_en_demeure',
          statut: 'execute',
          resultat: 'Mise en demeure envoyée'
        }
      ]
    }
  ];

  // Calculs des KPIs
  const kpis = useMemo(() => {
    const totalCreances = mockCreances.reduce((sum, c) => sum + c.montantTTC, 0);
    const totalRegle = mockCreances.reduce((sum, c) => sum + c.montantRegle, 0);
    const totalEchu = mockCreances.filter(c => c.statut === 'echue').reduce((sum, c) => sum + c.solde, 0);
    const totalProvisions = mockCreances.reduce((sum, c) => sum + (c.montantProvision || 0), 0);

    return {
      totalCreances,
      totalRegle,
      totalEchu,
      totalProvisions,
      tauxRecouvrement: totalCreances > 0 ? (totalRegle / totalCreances * 100) : 0,
      delaiMoyenPaiement: 45,
      nombreClientsRisque: mockClients.filter(c => c.statutRisque === 'eleve' || c.statutRisque === 'critique').length
    };
  }, []);

  // Filtrage des créances
  const creancesFiltrees = useMemo(() => {
    return mockCreances.filter(creance => {
      const matchStatut = filterStatut === 'tous' || creance.statut === filterStatut;
      const matchSearch = searchTerm === '' ||
        creance.clientNom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creance.numeroFacture.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStatut && matchSearch;
    });
  }, [filterStatut, searchTerm]);

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, string> = {
      'en_cours': 'bg-green-100 text-green-800',
      'echue': 'bg-yellow-100 text-yellow-800',
      'contentieux': 'bg-red-100 text-red-800',
      'provision': 'bg-orange-100 text-orange-800',
      'irrecoverable': 'bg-gray-100 text-gray-800'
    };
    return variants[statut] || 'bg-gray-100 text-gray-800';
  };

  const getRisqueBadge = (risque: string) => {
    const variants: Record<string, string> = {
      'faible': 'bg-green-100 text-green-800',
      'modere': 'bg-yellow-100 text-yellow-800',
      'eleve': 'bg-orange-100 text-orange-800',
      'critique': 'bg-red-100 text-red-800'
    };
    return variants[risque] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Créances</p>
                <p className="text-2xl font-bold">{(kpis.totalCreances / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-green-600 mt-1">+12% vs mois dernier</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Créances Échues</p>
                <p className="text-2xl font-bold">{(kpis.totalEchu / 1000000).toFixed(1)}M FCFA</p>
                <p className="text-xs text-red-600 mt-1">{mockCreances.filter(c => c.statut === 'echue').length} factures</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taux Recouvrement</p>
                <p className="text-2xl font-bold">{kpis.tauxRecouvrement.toFixed(1)}%</p>
                <Progress value={kpis.tauxRecouvrement} className="mt-2" />
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients à Risque</p>
                <p className="text-2xl font-bold">{kpis.nombreClientsRisque}</p>
                <p className="text-xs text-orange-600 mt-1">Surveillance renforcée</p>
              </div>
              <Shield className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes IA */}
      <Alert className="border-l-4 border-l-orange-500">
        <Brain className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommandations IA:</strong> 3 clients présentent un risque élevé de défaut.
          Considérer une provision complémentaire de 2.5M FCFA sur les créances de plus de 90 jours.
        </AlertDescription>
      </Alert>

      {/* Tabs principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="creances">Créances</TabsTrigger>
          <TabsTrigger value="relances">Relances</TabsTrigger>
          <TabsTrigger value="provisions">Provisions</TabsTrigger>
          <TabsTrigger value="analyse-risque">Analyse Risque</TabsTrigger>
        </TabsList>

        {/* Vue d'ensemble */}
        <TabsContent value="vue-ensemble" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Âgée des Créances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded">
                    <p className="text-sm text-gray-600">0-30 jours</p>
                    <p className="text-xl font-bold text-green-600">8.5M</p>
                    <p className="text-xs">42% du total</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded">
                    <p className="text-sm text-gray-600">31-60 jours</p>
                    <p className="text-xl font-bold text-yellow-600">5.2M</p>
                    <p className="text-xs">26% du total</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded">
                    <p className="text-sm text-gray-600">61-90 jours</p>
                    <p className="text-xl font-bold text-orange-600">3.8M</p>
                    <p className="text-xs">19% du total</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded">
                    <p className="text-sm text-gray-600">91-120 jours</p>
                    <p className="text-xl font-bold text-red-600">1.5M</p>
                    <p className="text-xs">8% du total</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded">
                    <p className="text-sm text-gray-600">+120 jours</p>
                    <p className="text-xl font-bold text-purple-600">1.0M</p>
                    <p className="text-xs">5% du total</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Clients par Encours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockClients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{client.nom}</p>
                        <p className="text-sm text-gray-500">{client.secteur}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{(client.encours / 1000000).toFixed(1)}M FCFA</p>
                      <Badge className={getRisqueBadge(client.statutRisque)}>
                        {client.statutRisque}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Créances */}
        <TabsContent value="creances" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 pr-4 py-2 border rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
              >
                <option value="tous">Tous les statuts</option>
                <option value="en_cours">En cours</option>
                <option value="echue">Échue</option>
                <option value="contentieux">Contentieux</option>
                <option value="provision">Provisionné</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Analyse IA
              </button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">N° Facture</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Échéance</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Montant</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Solde</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Retard</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {creancesFiltrees.map(creance => (
                    <tr key={creance.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium">{creance.clientNom}</p>
                      </td>
                      <td className="px-4 py-3">{creance.numeroFacture}</td>
                      <td className="px-4 py-3">{new Date(creance.dateEcheance).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {(creance.montantTTC / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {(creance.solde / 1000000).toFixed(2)}M
                      </td>
                      <td className="px-4 py-3 text-center">
                        {creance.joursRetard > 0 ? (
                          <span className="text-red-600 font-medium">{creance.joursRetard}j</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={getStatutBadge(creance.statut)}>
                          {creance.statut}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          <button className="p-1 hover:bg-gray-100 rounded">
                            <Send className="w-4 h-4 text-blue-600" />
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

        {/* Relances */}
        <TabsContent value="relances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campagne de Relance Automatisée</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-500">Niveau 1</span>
                  </div>
                  <p className="font-medium">Rappel Courtois</p>
                  <p className="text-sm text-gray-600 mt-1">J+5 après échéance</p>
                  <p className="text-2xl font-bold text-blue-600 mt-2">12</p>
                  <p className="text-xs text-gray-500">envois programmés</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Phone className="w-5 h-5 text-orange-500" />
                    <span className="text-sm text-gray-500">Niveau 2</span>
                  </div>
                  <p className="font-medium">Relance Téléphonique</p>
                  <p className="text-sm text-gray-600 mt-1">J+15 après échéance</p>
                  <p className="text-2xl font-bold text-orange-600 mt-2">8</p>
                  <p className="text-xs text-gray-500">appels à effectuer</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <FileText className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-gray-500">Niveau 3</span>
                  </div>
                  <p className="font-medium">Mise en Demeure</p>
                  <p className="text-sm text-gray-600 mt-1">J+30 après échéance</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">3</p>
                  <p className="text-xs text-gray-500">courriers à envoyer</p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium mb-3">Historique des Relances</h4>
                <div className="space-y-2">
                  {mockCreances[0].actionsRelance.map(action => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        {action.type === 'email' && <Mail className="w-4 h-4 text-blue-500" />}
                        {action.type === 'telephone' && <Phone className="w-4 h-4 text-orange-500" />}
                        {action.type === 'mise_en_demeure' && <FileText className="w-4 h-4 text-red-500" />}
                        <div>
                          <p className="font-medium capitalize">{action.type.replace('_', ' ')}</p>
                          <p className="text-sm text-gray-600">{action.resultat}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{new Date(action.date).toLocaleDateString()}</p>
                        <Badge className={action.statut === 'execute' ? 'bg-green-100' : 'bg-gray-100'}>
                          {action.statut}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Provisions */}
        <TabsContent value="provisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calcul des Provisions SYSCOHADA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="border-l-4 border-l-blue-500">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Conformément au Référentiel SYSCOHADA, les provisions sont calculées selon l'ancienneté des créances.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">0-90 jours</p>
                    <p className="text-2xl font-bold">0%</p>
                    <p className="text-sm text-gray-500 mt-1">Pas de provision</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">91-180 jours</p>
                    <p className="text-2xl font-bold">25%</p>
                    <p className="text-sm text-gray-500 mt-1">1.25M FCFA</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">181-365 jours</p>
                    <p className="text-2xl font-bold">50%</p>
                    <p className="text-sm text-gray-500 mt-1">3.0M FCFA</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">+365 jours</p>
                    <p className="text-2xl font-bold">100%</p>
                    <p className="text-sm text-gray-500 mt-1">1.0M FCFA</p>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Provisions Requises</p>
                      <p className="text-3xl font-bold text-blue-600">5.25M FCFA</p>
                    </div>
                    <button
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      onClick={() => setShowProvisionModal(true)}
                    >
                      <CheckCircle className="w-5 h-5" />
                      Comptabiliser les Provisions
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse Risque */}
        <TabsContent value="analyse-risque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyse Prédictive des Risques Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Score de Risque par Client</h4>
                    <div className="space-y-3">
                      {mockClients.map(client => (
                        <div key={client.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium">{client.nom}</p>
                            <p className="text-sm text-gray-500">{client.secteur}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32">
                              <Progress
                                value={
                                  client.statutRisque === 'faible' ? 20 :
                                  client.statutRisque === 'modere' ? 50 :
                                  client.statutRisque === 'eleve' ? 75 : 90
                                }
                                className="h-2"
                              />
                            </div>
                            <Badge className={getRisqueBadge(client.statutRisque)}>
                              {client.statutRisque}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Facteurs de Risque Détectés</h4>
                    <div className="space-y-2">
                      <Alert className="border-l-4 border-l-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>ENTREPRISE KOUASSI & FILS:</strong> Retards de paiement récurrents,
                          dégradation du ratio d'endettement
                        </AlertDescription>
                      </Alert>
                      <Alert className="border-l-4 border-l-yellow-500">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>SID:</strong> Dépassement ponctuel de la limite de crédit,
                          secteur en difficulté économique
                        </AlertDescription>
                      </Alert>
                    </div>

                    <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium">Recommandations IA</h4>
                      </div>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span>Réduire la limite de crédit de KOUASSI & FILS à 10M FCFA</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span>Demander une garantie bancaire pour les nouvelles commandes importantes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5" />
                          <span>Mettre en place un suivi hebdomadaire des encours à risque</span>
                        </li>
                      </ul>
                    </div>
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

export default CycleClients;