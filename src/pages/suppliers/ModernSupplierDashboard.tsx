/**
 * Module Fournisseur - Dashboard Principal WiseBook
 * Interface moderne conforme au cahier des charges sections 2.1-2.5
 * Gestion complète des fournisseurs avec échéances et lettrage
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
  Building2, Users, TrendingUp, AlertTriangle, Search, Filter,
  Plus, Download, Upload, Eye, Edit, Trash, MoreHorizontal,
  Phone, Mail, MapPin, Calendar, Star, ChevronRight,
  BarChart3, PieChart, Activity, DollarSign, Clock,
  CheckCircle, XCircle, AlertCircle, Target, CreditCard,
  Truck, FileText, Calculator, Zap, Settings, ArrowUpDown
} from 'lucide-react';

// Types selon le cahier des charges
interface Supplier {
  id: string;
  code: string;
  legal_name: string;
  commercial_name?: string;
  supplier_type: string;
  legal_form: string;
  status: 'ACTIVE' | 'QUALIFIED' | 'BLOCKED' | 'SUSPENDED' | 'ARCHIVED';
  supplier_rating: 'A' | 'B' | 'C' | 'D' | 'E';
  overall_performance: number;
  current_outstanding: number;
  city: string;
  main_phone?: string;
  email?: string;
  last_order_date?: string;
  created_at: string;
}

interface DashboardStats {
  total_fournisseurs: number;
  fournisseurs_actifs: number;
  fournisseurs_bloques: number;
  fournisseurs_evalues: number;
  encours_total: number;
  performance_moyenne: number;
  repartition_type: Record<string, number>;
  top_encours: Array<{ code: string; legal_name: string; current_outstanding: number }>;
}

interface EcheancesDashboard {
  echeances: {
    aujourd_hui: { nombre: number; montant_total: number; factures: any[] };
    cette_semaine: { nombre: number; montant_total: number; factures: any[] };
    ce_mois: { nombre: number; montant_total: number; factures: any[] };
    en_retard: { nombre: number; montant_total: number; retard_moyen_jours: number };
  };
  statistiques_globales: any;
  top_fournisseurs_encours: any[];
}

const ModernSupplierDashboard: React.FC = () => {
  // État principal
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [echeancesData, setEcheancesData] = useState<EcheancesDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // États de filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedRating, setSelectedRating] = useState<string>('');

  // Vue active
  const [activeTab, setActiveTab] = useState('overview');

  // Chargement initial
  useEffect(() => {
    chargerDashboardStats();
    chargerFournisseurs();
    chargerEcheances();
  }, []);

  const chargerDashboardStats = async () => {
    try {
      const response = await fetch('/api/suppliers/api/suppliers/dashboard-stats/', {
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

  const chargerFournisseurs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/suppliers/api/suppliers/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : data.results || []);
      } else {
        setError('Erreur lors du chargement des fournisseurs');
      }
    } catch (error) {
      setError('Erreur de connexion');
      console.error('Erreur fournisseurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const chargerEcheances = async () => {
    try {
      const response = await fetch('/api/suppliers/api/echeances/tableau-bord/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEcheancesData(data);
      }
    } catch (error) {
      console.error('Erreur échéances:', error);
    }
  };

  const rechercheAvancee = async () => {
    setLoading(true);
    try {
      const criteres = {
        query: searchQuery,
        filters: {
          supplier_type: selectedType || undefined,
          status: selectedStatus || undefined,
          rating: selectedRating || undefined,
        }
      };

      const response = await fetch('/api/suppliers/api/suppliers/search/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(criteres),
      });

      if (response.ok) {
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      setError('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  // Formatage des données
  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const getBadgeColor = (rating: string) => {
    const colors = {
      'A': 'bg-green-100 text-green-800',
      'B': 'bg-blue-100 text-blue-800',
      'C': 'bg-yellow-100 text-yellow-800',
      'D': 'bg-orange-100 text-orange-800',
      'E': 'bg-red-100 text-red-800',
    };
    return colors[rating as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'QUALIFIED': 'bg-blue-100 text-blue-800',
      'BLOCKED': 'bg-red-100 text-red-800',
      'SUSPENDED': 'bg-orange-100 text-orange-800',
      'ARCHIVED': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
                <p className="text-sm text-gray-600">Total Fournisseurs</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total_fournisseurs}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-green-600">
                {stats.fournisseurs_actifs} actifs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Encours Total</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formaterMontant(stats.encours_total)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-blue-600">
                {stats.top_encours.length} fournisseurs principaux
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Performance Moyenne</p>
                <p className="text-3xl font-bold text-gray-900">
                  {Math.round(stats.performance_moyenne)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <Progress value={stats.performance_moyenne} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Fournisseurs Bloqués</p>
                <p className="text-3xl font-bold text-red-600">{stats.fournisseurs_bloques}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-red-600">
                Nécessitent une attention
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Rendu du tableau des échéances
  const renderEcheancesOverview = () => {
    if (!echeancesData) return null;

    const { echeances } = echeancesData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Aujourd'hui</p>
                <p className="text-2xl font-bold">{echeances.aujourd_hui.nombre}</p>
                <p className="text-xs text-gray-600">
                  {formaterMontant(echeances.aujourd_hui.montant_total)}
                </p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Cette Semaine</p>
                <p className="text-2xl font-bold">{echeances.cette_semaine.nombre}</p>
                <p className="text-xs text-gray-600">
                  {formaterMontant(echeances.cette_semaine.montant_total)}
                </p>
              </div>
              <Calendar className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Ce Mois</p>
                <p className="text-2xl font-bold">{echeances.ce_mois.nombre}</p>
                <p className="text-xs text-gray-600">
                  {formaterMontant(echeances.ce_mois.montant_total)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">En Retard</p>
                <p className="text-2xl font-bold">{echeances.en_retard.nombre}</p>
                <p className="text-xs text-gray-600">
                  {formaterMontant(echeances.en_retard.montant_total)}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
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
          Recherche et Filtres Fournisseurs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <Label htmlFor="search">Recherche générale</Label>
            <Input
              id="search"
              placeholder="Nom, code, SIRET..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="type">Type Fournisseur</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                <SelectItem value="GOODS">Biens</SelectItem>
                <SelectItem value="SERVICES">Services</SelectItem>
                <SelectItem value="SUBCONTRACTOR">Sous-traitant</SelectItem>
                <SelectItem value="CONSULTING">Conseil</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Tous" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                <SelectItem value="ACTIVE">Actif</SelectItem>
                <SelectItem value="QUALIFIED">Qualifié</SelectItem>
                <SelectItem value="BLOCKED">Bloqué</SelectItem>
                <SelectItem value="SUSPENDED">Suspendu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="rating">Notation</Label>
            <Select value={selectedRating} onValueChange={setSelectedRating}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes</SelectItem>
                <SelectItem value="A">A - Excellent</SelectItem>
                <SelectItem value="B">B - Bon</SelectItem>
                <SelectItem value="C">C - Moyen</SelectItem>
                <SelectItem value="D">D - Faible</SelectItem>
                <SelectItem value="E">E - Non recommandé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={rechercheAvancee} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Rechercher
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Rendu d'une carte fournisseur
  const renderSupplierCard = (supplier: Supplier) => (
    <Card key={supplier.id} className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 mb-1">
              {supplier.legal_name}
            </h3>
            <p className="text-sm text-gray-500">{supplier.code}</p>
            {supplier.commercial_name && (
              <p className="text-sm text-blue-600 italic">{supplier.commercial_name}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={getBadgeColor(supplier.supplier_rating)}>
              {supplier.supplier_rating}
            </Badge>
            <Badge className={getStatusColor(supplier.status)} variant="outline">
              {supplier.status}
            </Badge>
          </div>
        </div>

        {/* Informations principales */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Building2 className="h-4 w-4" />
            <span>{supplier.supplier_type}</span>
            <span className="text-xs">• {supplier.legal_form}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{supplier.city}</span>
          </div>

          {supplier.main_phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4" />
              <span>{supplier.main_phone}</span>
            </div>
          )}

          {supplier.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              <span>{supplier.email}</span>
            </div>
          )}
        </div>

        {/* Encours et performance */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Encours</p>
            <p className="font-semibold text-blue-600">
              {formaterMontant(supplier.current_outstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Performance</p>
            <p className="font-semibold text-green-600">
              {Math.round(supplier.overall_performance)}%
            </p>
          </div>
        </div>

        {/* Barre de performance */}
        <div className="mb-4">
          <Progress value={supplier.overall_performance} className="h-2" />
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
              <CreditCard className="h-4 w-4" />
            </Button>
          </div>
          {supplier.last_order_date && (
            <p className="text-xs text-gray-500">
              Dernière cmd: {new Date(supplier.last_order_date).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Rendu de la liste des fournisseurs
  const renderSuppliersList = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des fournisseurs...</p>
        </div>
      );
    }

    if (suppliers.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">Aucun fournisseur trouvé</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un fournisseur
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(renderSupplierCard)}
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
            <CardTitle>Répartition par Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.repartition_type).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{count}</span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count / stats.total_fournisseurs) * 100}%` }}
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
            <CardTitle>Top Encours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.top_encours.map((supplier, index) => (
                <div key={supplier.code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs flex items-center justify-center font-semibold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{supplier.legal_name}</p>
                      <p className="text-xs text-gray-500">{supplier.code}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formaterMontant(supplier.current_outstanding)}
                  </span>
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
            Module Fournisseur
          </h1>
          <p className="text-gray-600 mt-2">
            Gestion complète des fournisseurs - WiseBook
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
            Nouveau Fournisseur
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

      {/* Statistiques principales */}
      {renderStatsCards()}

      {/* Vue échéances rapide */}
      {renderEcheancesOverview()}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
          <TabsTrigger value="echeances">Échéances</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="lettrage">Lettrage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {renderSearchFilters()}
          {renderSuppliersList()}
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          {renderSearchFilters()}
          {renderSuppliersList()}
        </TabsContent>

        <TabsContent value="echeances" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tableau de Bord des Échéances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Module échéances détaillé en cours de développement</p>
                <p className="text-sm text-gray-500 mt-2">
                  Planification paiements, génération SEPA, prévisionnel trésorerie
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          {renderAnalytics()}
        </TabsContent>

        <TabsContent value="lettrage" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Lettrage Fournisseurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calculator className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Module lettrage automatique en cours de développement</p>
                <p className="text-sm text-gray-500 mt-2">
                  Lettrage automatique avec IA, gestion écarts, délettrage
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernSupplierDashboard;