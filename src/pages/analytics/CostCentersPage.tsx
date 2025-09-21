import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  User,
  Building
} from 'lucide-react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../components/ui';
import { analyticsService } from '../../services/analytics.service';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface CostCentersFilters {
  search: string;
  axe: string;
  type: string;
  statut: string;
  responsable: string;
}

const CostCentersPage: React.FC = () => {
  const [filters, setFilters] = useState<CostCentersFilters>({
    search: '',
    axe: '',
    type: '',
    statut: '',
    responsable: ''
  });
  const [page, setPage] = useState(1);
  const [selectedCenter, setSelectedCenter] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch cost centers
  const { data: centersData, isLoading } = useQuery({
    queryKey: ['cost-centers', 'list', page, filters],
    queryFn: () => analyticsService.getCostCenters({ 
      page, 
      search: filters.search,
      axe: filters.axe,
      type: filters.type,
      statut: filters.statut,
      responsable: filters.responsable
    }),
  });

  // Fetch analytical axes for selection
  const { data: axes } = useQuery({
    queryKey: ['analytical-axes', 'list'],
    queryFn: () => analyticsService.getAnalyticalAxes({ page: 1, limit: 100 }),
  });

  // Delete cost center mutation
  const deleteCenterMutation = useMutation({
    mutationFn: analyticsService.deleteCostCenter,
    onSuccess: () => {
      toast.success('Centre supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteCenter = (centerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce centre de coût ?')) {
      deleteCenterMutation.mutate(centerId);
    }
  };

  const handleFilterChange = (key: keyof CostCentersFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      axe: '',
      type: '',
      statut: '',
      responsable: ''
    });
    setPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'operationnel': return 'bg-blue-100 text-blue-800';
      case 'support': return 'bg-green-100 text-green-800';
      case 'structure': return 'bg-purple-100 text-purple-800';
      case 'projet': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'operationnel': return 'Opérationnel';
      case 'support': return 'Support';
      case 'structure': return 'Structure';
      case 'projet': return 'Projet';
      default: return type;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-gray-100 text-gray-800';
      case 'archive': return 'bg-yellow-100 text-yellow-800';
      case 'ferme': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'archive': return 'Archivé';
      case 'ferme': return 'Fermé';
      default: return statut;
    }
  };

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return 'text-green-700';
    if (performance >= 70) return 'text-yellow-700';
    return 'text-red-700';
  };

  const getPerformanceIcon = (performance: number) => {
    if (performance >= 90) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (performance >= 70) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Target className="h-4 w-4 text-gray-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <Users className="mr-3 h-7 w-7" />
              Centres de Coûts
            </h1>
            <p className="mt-2 text-rolling-stone">
              Gestion des centres de coûts et d'analyse de performance
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button 
              className="bg-tuatara hover:bg-rolling-stone text-swirl"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Centre
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Centres</p>
                <p className="text-2xl font-bold text-gray-900">
                  {centersData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Centres Actifs</p>
                <p className="text-2xl font-bold text-green-700">
                  {centersData?.active_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Coûts Totaux</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatCurrency(centersData?.total_costs || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <Target className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Performance Moy.</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatPercentage(centersData?.average_performance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un centre..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.axe} onValueChange={(value) => handleFilterChange('axe', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les axes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les axes</SelectItem>
                {axes?.results?.map((axe) => (
                  <SelectItem key={axe.id} value={axe.code}>
                    {axe.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                <SelectItem value="operationnel">Opérationnel</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="structure">Structure</SelectItem>
                <SelectItem value="projet">Projet</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
                <SelectItem value="ferme">Fermé</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Responsable"
                value={filters.responsable}
                onChange={(e) => handleFilterChange('responsable', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cost Centers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Centres de Coûts</span>
            {centersData && (
              <Badge variant="outline">
                {centersData.count} centre(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des centres..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code/Libellé</TableHead>
                      <TableHead>Axe</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Coûts Réels</TableHead>
                      <TableHead className="text-right">Écart</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {centersData?.results?.map((center) => (
                      <TableRow key={center.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              {center.type === 'operationnel' ? (
                                <Building className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Users className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-tuatara">{center.libelle}</p>
                              <p className="text-sm text-rolling-stone font-mono">
                                {center.code}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{center.nom_axe}</p>
                            <p className="text-xs text-gray-500">{center.code_axe}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(center.type)}>
                            {getTypeLabel(center.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {center.responsable && (
                            <div className="flex items-center space-x-2">
                              <div className="p-1 bg-gray-100 rounded-full">
                                <User className="h-3 w-3 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{center.responsable}</p>
                                {center.email_responsable && (
                                  <p className="text-xs text-gray-500">{center.email_responsable}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-blue-700">
                            {formatCurrency(center.budget || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-700">
                            {formatCurrency(center.couts_reels || 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            {getVariationIcon(center.ecart_budget || 0)}
                            <span className={`font-bold ${
                              (center.ecart_budget || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(Math.abs(center.ecart_budget || 0))}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getPerformanceIcon(center.performance || 0)}
                            <span className={`font-medium ${getPerformanceColor(center.performance || 0)}`}>
                              {formatPercentage(center.performance || 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(center.statut)}>
                            {getStatusLabel(center.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCenter(center)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Analyse"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCenter(center.id)}
                              className="text-red-600 hover:text-red-700"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              {centersData && centersData.results && centersData.results.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Budget Total</p>
                      <p className="text-lg font-bold text-blue-700">
                        {formatCurrency(centersData.total_budget || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Coûts Réels</p>
                      <p className="text-lg font-bold text-gray-700">
                        {formatCurrency(centersData.total_actual_costs || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Écart Global</p>
                      <p className={`text-lg font-bold ${
                        (centersData.total_variance || 0) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(Math.abs(centersData.total_variance || 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Taux de Réalisation</p>
                      <p className="text-lg font-bold text-purple-700">
                        {formatPercentage(centersData.realization_rate || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {centersData && centersData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(centersData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!centersData?.results || centersData.results.length === 0) && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun centre de coût trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    {filters.search || filters.axe || filters.type || filters.statut || filters.responsable
                      ? 'Aucun centre ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier centre de coût.'}
                  </p>
                  <Button 
                    className="bg-tuatara hover:bg-rolling-stone text-swirl"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un centre
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CostCentersPage;