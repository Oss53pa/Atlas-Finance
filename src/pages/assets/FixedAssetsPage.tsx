import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Package,
  DollarSign,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Monitor,
  Truck,
  Wrench,
  QrCode
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
import { assetsService } from '../../services/assets.service';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface AssetsFilters {
  search: string;
  categorie: string;
  statut: string;
  localisation: string;
  date_acquisition_debut: string;
  date_acquisition_fin: string;
  valeur_min: string;
  valeur_max: string;
}

const FixedAssetsPage: React.FC = () => {
  const [filters, setFilters] = useState<AssetsFilters>({
    search: '',
    categorie: '',
    statut: '',
    localisation: '',
    date_acquisition_debut: '',
    date_acquisition_fin: '',
    valeur_min: '',
    valeur_max: ''
  });
  const [page, setPage] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch fixed assets
  const { data: assetsData, isLoading } = useQuery({
    queryKey: ['fixed-assets', 'list', page, filters],
    queryFn: () => assetsService.getFixedAssets({ 
      page, 
      ...filters
    }),
  });

  // Fetch categories for selection
  const { data: categories } = useQuery({
    queryKey: ['asset-categories', 'list'],
    queryFn: () => assetsService.getAssetCategories(),
  });

  // Delete asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: assetsService.deleteAsset,
    onSuccess: () => {
      toast.success('Actif supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['fixed-assets'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteAsset = (assetId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet actif ?')) {
      deleteAssetMutation.mutate(assetId);
    }
  };

  const handleFilterChange = (key: keyof AssetsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      categorie: '',
      statut: '',
      localisation: '',
      date_acquisition_debut: '',
      date_acquisition_fin: '',
      valeur_min: '',
      valeur_max: ''
    });
    setPage(1);
  };

  const getCategoryIcon = (categorie: string) => {
    switch (categorie) {
      case 'materiel_informatique': return <Monitor className="h-4 w-4" />;
      case 'vehicules': return <Truck className="h-4 w-4" />;
      case 'mobilier': return <Package className="h-4 w-4" />;
      case 'equipements': return <Wrench className="h-4 w-4" />;
      default: return <Building className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (categorie: string) => {
    switch (categorie) {
      case 'materiel_informatique': return 'bg-blue-100 text-blue-800';
      case 'vehicules': return 'bg-green-100 text-green-800';
      case 'mobilier': return 'bg-purple-100 text-purple-800';
      case 'equipements': return 'bg-orange-100 text-orange-800';
      case 'immobilier': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_service': return 'bg-green-100 text-green-800';
      case 'en_maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'hors_service': return 'bg-red-100 text-red-800';
      case 'cede': return 'bg-gray-100 text-gray-800';
      case 'reforme': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_service': return 'En service';
      case 'en_maintenance': return 'Maintenance';
      case 'hors_service': return 'Hors service';
      case 'cede': return 'Cédé';
      case 'reforme': return 'Réformé';
      default: return statut;
    }
  };

  const getDepreciationStatusColor = (pourcentage: number) => {
    if (pourcentage >= 100) return 'bg-gray-100 text-gray-800';
    if (pourcentage >= 80) return 'bg-red-100 text-red-800';
    if (pourcentage >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const generateQRCode = async (assetId: string) => {
    try {
      toast.loading('Génération du QR Code...');
      await assetsService.generateQRCode(assetId);
      toast.success('QR Code généré avec succès');
    } catch (error) {
      toast.error('Erreur lors de la génération du QR Code');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <Building className="mr-3 h-7 w-7" />
              Immobilisations Corporelles
            </h1>
            <p className="mt-2 text-rolling-stone">
              Gestion des actifs immobilisés et suivi des amortissements
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
              Nouvel Actif
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
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Actifs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {assetsData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Valeur Totale</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(assetsData?.total_value || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Amortissements</p>
                <p className="text-2xl font-bold text-purple-700">
                  {formatCurrency(assetsData?.total_depreciation || 0)}
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
                <p className="text-sm font-medium text-gray-600">En Maintenance</p>
                <p className="text-2xl font-bold text-red-700">
                  {assetsData?.maintenance_count || 0}
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
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.categorie} onValueChange={(value) => handleFilterChange('categorie', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes catégories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les catégories</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.code}>
                    {category.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="en_service">En service</SelectItem>
                <SelectItem value="en_maintenance">En maintenance</SelectItem>
                <SelectItem value="hors_service">Hors service</SelectItem>
                <SelectItem value="cede">Cédé</SelectItem>
                <SelectItem value="reforme">Réformé</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Localisation"
              value={filters.localisation}
              onChange={(e) => handleFilterChange('localisation', e.target.value)}
            />

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filters.date_acquisition_debut}
                onChange={(e) => handleFilterChange('date_acquisition_debut', e.target.value)}
                className="pl-10"
                placeholder="Date début"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filters.date_acquisition_fin}
                onChange={(e) => handleFilterChange('date_acquisition_fin', e.target.value)}
                className="pl-10"
                placeholder="Date fin"
              />
            </div>

            <Input
              type="number"
              placeholder="Valeur min"
              value={filters.valeur_min}
              onChange={(e) => handleFilterChange('valeur_min', e.target.value)}
            />

            <Input
              type="number"
              placeholder="Valeur max"
              value={filters.valeur_max}
              onChange={(e) => handleFilterChange('valeur_max', e.target.value)}
            />
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Immobilisations</span>
            {assetsData && (
              <Badge variant="outline">
                {assetsData.count} actif(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des actifs..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code/Désignation</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Date Acquisition</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead className="text-right">Val. Acquisition</TableHead>
                      <TableHead className="text-right">Amortissements</TableHead>
                      <TableHead className="text-right">Valeur Nette</TableHead>
                      <TableHead>% Amorti</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetsData?.results?.map((asset) => (
                      <TableRow key={asset.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gray-100 rounded-full">
                              {getCategoryIcon(asset.categorie)}
                            </div>
                            <div>
                              <p className="font-medium text-tuatara">{asset.designation}</p>
                              <p className="text-sm text-rolling-stone font-mono">
                                {asset.code_immobilisation}
                              </p>
                              {asset.numero_serie && (
                                <p className="text-xs text-gray-500">
                                  S/N: {asset.numero_serie}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(asset.categorie)}>
                            {asset.nom_categorie}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(asset.date_acquisition)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {asset.localisation && (
                              <p className="font-medium">{asset.localisation}</p>
                            )}
                            {asset.responsable && (
                              <p className="text-gray-600">{asset.responsable}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-700">
                            {formatCurrency(asset.valeur_acquisition)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-blue-700">
                            {formatCurrency(asset.amortissements_cumules)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-700">
                            {formatCurrency(asset.valeur_nette)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDepreciationStatusColor(asset.pourcentage_amortissement)}>
                            {formatPercentage(asset.pourcentage_amortissement)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(asset.statut)}>
                            {getStatusLabel(asset.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAsset(asset)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => generateQRCode(asset.id)}
                              aria-label="QR Code"
                            >
                              <QrCode className="h-4 w-4" />
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
                              onClick={() => handleDeleteAsset(asset.id)}
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
              {assetsData && assetsData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(assetsData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!assetsData?.results || assetsData.results.length === 0) && (
                <div className="text-center py-12">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun actif trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    {Object.values(filters).some(f => f)
                      ? 'Aucun actif ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier actif immobilisé.'}
                  </p>
                  <Button 
                    className="bg-tuatara hover:bg-rolling-stone text-swirl"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un actif
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

export default FixedAssetsPage;