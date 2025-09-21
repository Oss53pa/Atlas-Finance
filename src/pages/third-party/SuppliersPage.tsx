import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  Building,
  Package,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Star,
  Clock
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
import { thirdPartyService } from '../../services/thirdparty.service';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface SuppliersFilters {
  search: string;
  statut: string;
  ville: string;
  categorie: string;
  evaluation: string;
}

const SuppliersPage: React.FC = () => {
  const [filters, setFilters] = useState<SuppliersFilters>({
    search: '',
    statut: '',
    ville: '',
    categorie: '',
    evaluation: ''
  });
  const [page, setPage] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch suppliers
  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', 'list', page, filters],
    queryFn: () => thirdPartyService.getSuppliers({ 
      page, 
      search: filters.search,
      statut: filters.statut,
      ville: filters.ville,
      categorie: filters.categorie,
      evaluation: filters.evaluation
    }),
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: thirdPartyService.deleteSupplier,
    onSuccess: () => {
      toast.success('Fournisseur supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteSupplier = (supplierId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) {
      deleteSupplierMutation.mutate(supplierId);
    }
  };

  const handleFilterChange = (key: keyof SuppliersFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      statut: '',
      ville: '',
      categorie: '',
      evaluation: ''
    });
    setPage(1);
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-gray-100 text-gray-800';
      case 'bloque': return 'bg-red-100 text-red-800';
      case 'en_evaluation': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'bloque': return 'Bloqué';
      case 'en_evaluation': return 'En évaluation';
      default: return statut;
    }
  };

  const getCategoryColor = (categorie: string) => {
    switch (categorie) {
      case 'fourniture_bureau': return 'bg-blue-100 text-blue-800';
      case 'informatique': return 'bg-purple-100 text-purple-800';
      case 'transport': return 'bg-orange-100 text-orange-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'services': return 'bg-green-100 text-green-800';
      case 'matiere_premiere': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderRating = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <Truck className="mr-3 h-7 w-7" />
              Fournisseurs
            </h1>
            <p className="mt-2 text-rolling-stone">
              Gestion des fournisseurs et prestataires
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
              Nouveau Fournisseur
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
                <Truck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Fournisseurs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {suppliersData?.count || 0}
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
                <p className="text-sm font-medium text-gray-600">Fournisseurs Actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {suppliersData?.active_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Achats Annuels</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(suppliersData?.total_purchases || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Dettes</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(suppliersData?.total_debt || 0)}
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
                placeholder="Rechercher un fournisseur..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
                <SelectItem value="bloque">Bloqué</SelectItem>
                <SelectItem value="en_evaluation">En évaluation</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.categorie} onValueChange={(value) => handleFilterChange('categorie', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les catégories</SelectItem>
                <SelectItem value="fourniture_bureau">Fourniture de bureau</SelectItem>
                <SelectItem value="informatique">Informatique</SelectItem>
                <SelectItem value="transport">Transport</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="services">Services</SelectItem>
                <SelectItem value="matiere_premiere">Matière première</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Ville"
                value={filters.ville}
                onChange={(e) => handleFilterChange('ville', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.evaluation} onValueChange={(value) => handleFilterChange('evaluation', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les évaluations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les évaluations</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ (5/5)</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ (4/5)</SelectItem>
                <SelectItem value="3">⭐⭐⭐ (3/5)</SelectItem>
                <SelectItem value="2">⭐⭐ (2/5)</SelectItem>
                <SelectItem value="1">⭐ (1/5)</SelectItem>
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

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Fournisseurs</span>
            {suppliersData && (
              <Badge variant="outline">
                {suppliersData.count} fournisseur(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des fournisseurs..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Dénomination</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Évaluation</TableHead>
                      <TableHead>Achats Annuels</TableHead>
                      <TableHead>Solde</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliersData?.results?.map((supplier) => (
                      <TableRow key={supplier.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-semibold">
                          {supplier.code_fournisseur}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-100 rounded-full">
                              {supplier.type_fournisseur === 'entreprise' ? (
                                <Building className="h-4 w-4 text-orange-600" />
                              ) : (
                                <Truck className="h-4 w-4 text-orange-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-tuatara">{supplier.denomination}</p>
                              {supplier.forme_juridique && (
                                <p className="text-sm text-rolling-stone">{supplier.forme_juridique}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {supplier.contact_principal && (
                              <div className="flex items-center text-sm">
                                <Users className="h-3 w-3 text-gray-400 mr-1" />
                                {supplier.contact_principal}
                              </div>
                            )}
                            {supplier.telephone && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 text-gray-400 mr-1" />
                                {supplier.telephone}
                              </div>
                            )}
                            {supplier.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 text-gray-400 mr-1" />
                                {supplier.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                            <div>
                              <p>{supplier.ville}</p>
                              {supplier.pays && (
                                <p className="text-xs text-gray-500">{supplier.pays}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(supplier.categorie)}>
                            {supplier.categorie === 'fourniture_bureau' && 'Fournitures'}
                            {supplier.categorie === 'informatique' && 'Informatique'}
                            {supplier.categorie === 'transport' && 'Transport'}
                            {supplier.categorie === 'maintenance' && 'Maintenance'}
                            {supplier.categorie === 'services' && 'Services'}
                            {supplier.categorie === 'matiere_premiere' && 'Mat. Première'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {supplier.evaluation ? renderRating(supplier.evaluation) : (
                            <span className="text-gray-400 text-sm">Non évalué</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-blue-700">
                            {formatCurrency(supplier.achats_annuels || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            (supplier.solde_compte || 0) <= 0 
                              ? 'text-green-700' 
                              : 'text-red-700'
                          }`}>
                            {formatCurrency(Math.abs(supplier.solde_compte || 0))}
                            {(supplier.solde_compte || 0) <= 0 ? ' C' : ' D'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(supplier.statut)}>
                            {getStatusLabel(supplier.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedSupplier(supplier)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
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
                              onClick={() => handleDeleteSupplier(supplier.id)}
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
              {suppliersData && suppliersData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(suppliersData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!suppliersData?.results || suppliersData.results.length === 0) && (
                <div className="text-center py-12">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun fournisseur trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    {filters.search || filters.statut || filters.ville || filters.categorie || filters.evaluation
                      ? 'Aucun fournisseur ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier fournisseur.'}
                  </p>
                  <Button 
                    className="bg-tuatara hover:bg-rolling-stone text-swirl"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un fournisseur
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

export default SuppliersPage;