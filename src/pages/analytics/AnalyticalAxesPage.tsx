import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Layers,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Settings,
  BarChart3,
  Target,
  Users,
  AlertCircle,
  CheckCircle,
  Download,
  Upload
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
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface AxesFilters {
  search: string;
  type: string;
  statut: string;
  niveau: string;
}

const AnalyticalAxesPage: React.FC = () => {
  const [filters, setFilters] = useState<AxesFilters>({
    search: '',
    type: '',
    statut: '',
    niveau: ''
  });
  const [page, setPage] = useState(1);
  const [selectedAxe, setSelectedAxe] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch analytical axes
  const { data: axesData, isLoading } = useQuery({
    queryKey: ['analytical-axes', 'list', page, filters],
    queryFn: () => analyticsService.getAnalyticalAxes({ 
      page, 
      search: filters.search,
      type: filters.type,
      statut: filters.statut,
      niveau: filters.niveau
    }),
  });

  // Delete axe mutation
  const deleteAxeMutation = useMutation({
    mutationFn: analyticsService.deleteAxe,
    onSuccess: () => {
      toast.success('Axe supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['analytical-axes'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteAxe = (axeId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet axe analytique ?')) {
      deleteAxeMutation.mutate(axeId);
    }
  };

  const handleFilterChange = (key: keyof AxesFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: '',
      statut: '',
      niveau: ''
    });
    setPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'centre_cout': return 'bg-blue-100 text-blue-800';
      case 'centre_profit': return 'bg-green-100 text-green-800';
      case 'projet': return 'bg-purple-100 text-purple-800';
      case 'produit': return 'bg-orange-100 text-orange-800';
      case 'region': return 'bg-red-100 text-red-800';
      case 'activite': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'centre_cout': return 'Centre de Coût';
      case 'centre_profit': return 'Centre de Profit';
      case 'projet': return 'Projet';
      case 'produit': return 'Produit';
      case 'region': return 'Région';
      case 'activite': return 'Activité';
      default: return type;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-gray-100 text-gray-800';
      case 'archive': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'archive': return 'Archivé';
      default: return statut;
    }
  };

  const getNiveauColor = (niveau: number) => {
    const colors = ['bg-red-100 text-red-800', 'bg-orange-100 text-orange-800', 'bg-yellow-100 text-yellow-800', 'bg-green-100 text-green-800'];
    return colors[Math.min(niveau - 1, colors.length - 1)] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <Layers className="mr-3 h-7 w-7" />
              Axes Analytiques
            </h1>
            <p className="mt-2 text-rolling-stone">
              Configuration des dimensions d'analyse comptable
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
              Nouvel Axe
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
                <Layers className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Axes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {axesData?.count || 0}
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
                <p className="text-sm font-medium text-gray-600">Axes Actifs</p>
                <p className="text-2xl font-bold text-green-700">
                  {axesData?.active_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Centres Associés</p>
                <p className="text-2xl font-bold text-purple-700">
                  {axesData?.total_centers || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ventilations</p>
                <p className="text-2xl font-bold text-orange-700">
                  {axesData?.total_allocations || 0}
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
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un axe..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                <SelectItem value="centre_cout">Centre de Coût</SelectItem>
                <SelectItem value="centre_profit">Centre de Profit</SelectItem>
                <SelectItem value="projet">Projet</SelectItem>
                <SelectItem value="produit">Produit</SelectItem>
                <SelectItem value="region">Région</SelectItem>
                <SelectItem value="activite">Activité</SelectItem>
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
              </SelectContent>
            </Select>

            <Select value={filters.niveau} onValueChange={(value) => handleFilterChange('niveau', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les niveaux" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les niveaux</SelectItem>
                <SelectItem value="1">Niveau 1</SelectItem>
                <SelectItem value="2">Niveau 2</SelectItem>
                <SelectItem value="3">Niveau 3</SelectItem>
                <SelectItem value="4">Niveau 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Axes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Axes Analytiques</span>
            {axesData && (
              <Badge variant="outline">
                {axesData.count} axe(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des axes..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code/Libellé</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Niveau</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Centres</TableHead>
                      <TableHead>Utilisation</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {axesData?.results?.map((axe) => (
                      <TableRow key={axe.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Layers className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-tuatara">{axe.libelle}</p>
                              <p className="text-sm text-rolling-stone font-mono">
                                {axe.code}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(axe.type)}>
                            {getTypeLabel(axe.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getNiveauColor(axe.niveau)} variant="outline">
                            Niveau {axe.niveau}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700 max-w-xs truncate">
                            {axe.description || 'Aucune description'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{axe.nb_centres || 0}</span>
                            <span className="text-sm text-gray-500">centre(s)</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="font-medium">{axe.nb_ventilations || 0} ventilation(s)</p>
                            <p className="text-gray-600">
                              {formatCurrency(axe.montant_total || 0)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(axe.statut)}>
                            {getStatusLabel(axe.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {axe.responsable && (
                            <div className="text-sm">
                              <p className="font-medium">{axe.responsable}</p>
                              {axe.email_responsable && (
                                <p className="text-gray-600">{axe.email_responsable}</p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAxe(axe)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Centres"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Paramètres"
                            >
                              <Settings className="h-4 w-4" />
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
                              onClick={() => handleDeleteAxe(axe.id)}
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

              {/* Pagination */}
              {axesData && axesData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(axesData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!axesData?.results || axesData.results.length === 0) && (
                <div className="text-center py-12">
                  <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun axe analytique trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    {filters.search || filters.type || filters.statut || filters.niveau
                      ? 'Aucun axe ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier axe analytique.'}
                  </p>
                  <Button 
                    className="bg-tuatara hover:bg-rolling-stone text-swirl"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un axe
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {axesData?.results && axesData.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Statistiques d'Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-tuatara mb-3">Répartition par Type</h4>
                <div className="space-y-2">
                  {axesData.type_distribution?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(item.type)} size="sm">
                          {getTypeLabel(item.type)}
                        </Badge>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-tuatara mb-3">Top Axes par Volume</h4>
                <div className="space-y-2">
                  {axesData.top_axes?.map((axe, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{axe.libelle}</span>
                      </div>
                      <span className="text-sm font-semibold text-green-700">
                        {formatCurrency(axe.montant_total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticalAxesPage;