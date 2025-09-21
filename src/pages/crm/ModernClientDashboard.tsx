/**
 * Module CRM Clients - Dashboard Principal WiseBook
 * Interface moderne conforme au cahier des charges v2.0
 * Section 4.1 - Module Liste Clients avec fonctionnalités avancées
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Users, Building2, TrendingUp, AlertTriangle, Search, Filter,
  Plus, Download, Upload, Eye, Edit, Trash, MoreHorizontal,
  Phone, Mail, MapPin, Calendar, Star, ChevronRight,
  BarChart3, PieChart, Activity, DollarSign, Clock,
  CheckCircle, XCircle, AlertCircle, Target
} from 'lucide-react';

// Types selon le cahier des charges
interface Client {
  id: string;
  code_client: string;
  raison_sociale: string;
  nom_commercial?: string;
  forme_juridique: string;
  numero_siret?: string;
  notation_interne: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'E';
  score_risque: number;
  is_active: boolean;
  is_prospect: boolean;
  contact_principal?: Contact;
  adresse_principale?: ClientAddress;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  nom_complet: string;
  fonction: string;
  email_principal: string;
  telephone_mobile?: string;
  is_primary: boolean;
}

interface ClientAddress {
  id: string;
  type_adresse: string;
  ligne_1: string;
  ville: string;
  code_postal: string;
  pays: string;
}

interface DashboardStats {
  total_clients: number;
  clients_actifs: number;
  prospects: number;
  nouveaux_ce_mois: number;
  repartition_notation: Record<string, number>;
  top_villes: Array<{ ville: string; count: number }>;
  score_risque_moyen: number;
}

const ModernClientDashboard: React.FC = () => {
  // État principal
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États de filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotation, setSelectedNotation] = useState<string>('');
  const [selectedFormeJuridique, setSelectedFormeJuridique] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // État des vues
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Chargement initial
  useEffect(() => {
    chargerDashboardStats();
    chargerClients();
  }, []);

  const chargerDashboardStats = async () => {
    try {
      const response = await fetch('/api/crm_clients/api/dashboard/stats/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        setError('Erreur lors du chargement des statistiques');
      }
    } catch (error) {
      setError('Erreur de connexion');
      console.error('Erreur stats:', error);
    }
  };

  const chargerClients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/crm_clients/api/clients/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(Array.isArray(data) ? data : data.results || []);
      } else {
        setError('Erreur lors du chargement des clients');
      }
    } catch (error) {
      setError('Erreur de connexion');
      console.error('Erreur clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const rechercheAvancee = async () => {
    setLoading(true);
    try {
      const criteres = {
        query: searchQuery,
        notation_interne: selectedNotation ? [selectedNotation] : undefined,
        forme_juridique: selectedFormeJuridique ? [selectedFormeJuridique] : undefined,
      };

      const response = await fetch('/api/crm_clients/api/clients/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(criteres),
      });

      if (response.ok) {
        const data = await response.json();
        setClients(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  // Formatage des données
  const getBadgeColor = (notation: string) => {
    const colors = {
      'A+': 'bg-green-100 text-green-800',
      'A': 'bg-green-100 text-green-700',
      'B+': 'bg-blue-100 text-blue-800',
      'B': 'bg-blue-100 text-blue-700',
      'C': 'bg-yellow-100 text-yellow-800',
      'D': 'bg-orange-100 text-orange-800',
      'E': 'bg-red-100 text-red-800',
    };
    return colors[notation as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (score: number) => {
    if (score <= 30) return 'text-green-600';
    if (score <= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Rendu des statistiques principales
  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_clients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-green-600">
                +{stats.nouveaux_ce_mois} ce mois
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clients Actifs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.clients_actifs}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4">
              <Progress
                value={(stats.clients_actifs / stats.total_clients) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Prospects</p>
                <p className="text-3xl font-bold text-gray-900">{stats.prospects}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-purple-600">
                Conversion en cours
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Score Risque Moyen</p>
                <p className={`text-3xl font-bold ${getRiskColor(stats.score_risque_moyen)}`}>
                  {Math.round(stats.score_risque_moyen)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-4">
              <Progress
                value={stats.score_risque_moyen}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Rendu des filtres de recherche
  const renderSearchFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Recherche et Filtres
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Recherche générale</Label>
            <Input
              id="search"
              placeholder="Nom, SIRET, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="notation">Notation</Label>
            <Select value={selectedNotation} onValueChange={setSelectedNotation}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes</SelectItem>
                <SelectItem value="A+">A+ - Excellent</SelectItem>
                <SelectItem value="A">A - Très bon</SelectItem>
                <SelectItem value="B+">B+ - Bon</SelectItem>
                <SelectItem value="B">B - Acceptable</SelectItem>
                <SelectItem value="C">C - Moyen</SelectItem>
                <SelectItem value="D">D - Risqué</SelectItem>
                <SelectItem value="E">E - Très risqué</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="forme">Forme Juridique</Label>
            <Select value={selectedFormeJuridique} onValueChange={setSelectedFormeJuridique}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes</SelectItem>
                <SelectItem value="SARL">SARL</SelectItem>
                <SelectItem value="SAS">SAS</SelectItem>
                <SelectItem value="SA">SA</SelectItem>
                <SelectItem value="EURL">EURL</SelectItem>
                <SelectItem value="SASU">SASU</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={rechercheAvancee} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setSelectedNotation('');
              setSelectedFormeJuridique('');
              chargerClients();
            }}>
              Réinitialiser
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Rendu d'une carte client
  const renderClientCard = (client: Client) => (
    <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {client.raison_sociale}
            </h3>
            <p className="text-sm text-gray-500">{client.code_client}</p>
            {client.nom_commercial && (
              <p className="text-sm text-blue-600 italic">{client.nom_commercial}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getBadgeColor(client.notation_interne)}>
              {client.notation_interne}
            </Badge>
            {client.is_prospect && (
              <Badge variant="outline" className="text-purple-600 border-purple-200">
                Prospect
              </Badge>
            )}
          </div>
        </div>

        {/* Informations principales */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>{client.forme_juridique}</span>
            {client.numero_siret && (
              <span className="text-xs">• {client.numero_siret}</span>
            )}
          </div>

          {client.contact_principal && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{client.contact_principal.nom_complet}</span>
              <span className="text-xs">• {client.contact_principal.fonction}</span>
            </div>
          )}

          {client.contact_principal?.email_principal && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>{client.contact_principal.email_principal}</span>
            </div>
          )}

          {client.adresse_principale && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{client.adresse_principale.ville} ({client.adresse_principale.code_postal})</span>
            </div>
          )}
        </div>

        {/* Score de risque */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-gray-600">Score Risque</span>
            <span className={`text-sm font-bold ${getRiskColor(client.score_risque)}`}>
              {client.score_risque}/100
            </span>
          </div>
          <Progress value={client.score_risque} className="h-2" />
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Créé le {new Date(client.created_at).toLocaleDateString('fr-FR')}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Rendu de la liste des clients
  const renderClientList = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des clients...</p>
        </div>
      );
    }

    if (clients.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Aucun client trouvé</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un client
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(renderClientCard)}
      </div>
    );
  };

  // Rendu des analytics
  const renderAnalytics = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Notation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.repartition_notation).map(([notation, count]) => (
                <div key={notation} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getBadgeColor(notation)} variant="outline">
                      {notation}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.total_clients) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Villes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_villes.map((ville, index) => (
                <div key={ville.ville} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <span className="font-medium">{ville.ville}</span>
                  </div>
                  <span className="text-sm font-semibold">{ville.count} clients</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Module Clients & CRM
          </h1>
          <p className="text-gray-600 mt-2">
            Gestion complète de la relation client - WiseBook v2.0
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importer
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Client
          </Button>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistiques */}
      {renderStatsCards()}

      {/* Onglets principaux */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="clients">Liste Clients</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderSearchFilters()}
          {renderClientList()}
        </TabsContent>

        <TabsContent value="clients" className="mt-6">
          {renderSearchFilters()}
          {renderClientList()}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {renderAnalytics()}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres Module CRM</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Configuration des paramètres de gestion clients en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernClientDashboard;