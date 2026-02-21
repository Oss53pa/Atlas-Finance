import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
  Upload,
  Monitor,
  Truck,
  Wrench,
  QrCode,
  X
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
import { assetsService, createImmobilisationSchema } from '../../services/modules/assets.service';
import { z } from 'zod';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
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
  const { t } = useLanguage();
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
  const [selectedAsset, setSelectedAsset] = useState<Record<string, unknown> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    designation: '',
    categorie: '',
    localisation: '',
    fournisseur: '',
    date_acquisition: '',
    montant_acquisition: 0,
    duree_amortissement: 5,
    methode_amortissement: 'lineaire' as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle',
    statut: 'en_service' as 'en_service' | 'en_maintenance' | 'hors_service' | 'cede',
    numero_serie: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const queryClient = useQueryClient();

  // Create immobilisation mutation
  const createMutation = useMutation({
    mutationFn: assetsService.createImmobilisation,
    onSuccess: () => {
      toast.success('Immobilisation créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['immobilisations'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

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

  const resetForm = () => {
    setFormData({
      code: '',
      designation: '',
      categorie: '',
      localisation: '',
      fournisseur: '',
      date_acquisition: '',
      montant_acquisition: 0,
      duree_amortissement: 5,
      methode_amortissement: 'lineaire',
      statut: 'en_service',
      numero_serie: '',
      description: '',
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrors({});

      // Validate with Zod
      const validatedData = createImmobilisationSchema.parse(formData);

      // Submit to backend
      await createMutation.mutateAsync(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les erreurs du formulaire');
      } else {
        toast.error('Erreur lors de la création');
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Building className="mr-3 h-7 w-7" />
              Immobilisations Corporelles
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Gestion des actifs immobilisés et suivi des amortissements
            </p>
          </div>
          <div className="flex space-x-3">
            <ExportMenu
              data={assetsData?.results || []}
              filename="immobilisations"
              columns={{
                code_immobilisation: 'Code',
                designation: 'Désignation',
                nom_categorie: 'Catégorie',
                date_acquisition: 'Date Acquisition',
                localisation: 'Localisation',
                valeur_acquisition: 'Valeur Acquisition',
                amortissements_cumules: 'Amortissements',
                valeur_nette: 'Valeur Nette',
                pourcentage_amortissement: '% Amorti',
                statut: 'Statut'
              }}
            />
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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
                <p className="text-lg font-bold text-gray-900">
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
                <p className="text-lg font-bold text-green-700">
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
                <p className="text-lg font-bold text-purple-700">
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
                <p className="text-lg font-bold text-red-700">
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
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
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

            <Button
              variant="outline"
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Sélectionner période
            </Button>

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
                              <p className="font-medium text-[var(--color-text-primary)]">{asset.designation}</p>
                              <p className="text-sm text-[var(--color-text-secondary)] font-mono">
                                {asset.code_immobilisation}
                              </p>
                              {asset.numero_serie && (
                                <p className="text-xs text-gray-700">
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
                            <Calendar className="h-4 w-4 text-gray-700 mr-2" />
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
                  <Building className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun actif trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {Object.values(filters).some(f => f)
                      ? 'Aucun actif ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier actif immobilisé.'}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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

      {/* Create Asset Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Nouvel Actif Immobilisé</h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="text-gray-700 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info alert */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Nouvelle Immobilisation</h4>
                      <p className="text-sm text-blue-800">Enregistrez un nouvel actif immobilisé avec ses informations comptables et de gestion.</p>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations Générales</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Code immobilisation *</label>
                      <Input
                        placeholder="IMM-2024-001"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Désignation *</label>
                      <Input
                        placeholder="Ordinateur portable Dell..."
                        value={formData.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.designation && (
                        <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                      <Select
                        value={formData.categorie}
                        onValueChange={(value) => handleInputChange('categorie', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.code}>
                              {category.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.categorie && (
                        <p className="mt-1 text-sm text-red-600">{errors.categorie}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de série</label>
                      <Input
                        placeholder="ABC123XYZ..."
                        value={formData.numero_serie}
                        onChange={(e) => handleInputChange('numero_serie', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.numero_serie && (
                        <p className="mt-1 text-sm text-red-600">{errors.numero_serie}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations Financières</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Valeur d'acquisition (XOF) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={formData.montant_acquisition}
                        onChange={(e) => handleInputChange('montant_acquisition', parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                      {errors.montant_acquisition && (
                        <p className="mt-1 text-sm text-red-600">{errors.montant_acquisition}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date d'acquisition *</label>
                      <Input
                        type="date"
                        value={formData.date_acquisition}
                        onChange={(e) => handleInputChange('date_acquisition', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_acquisition && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_acquisition}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Durée d'amortissement (années) *</label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        placeholder="5"
                        value={formData.duree_amortissement}
                        onChange={(e) => handleInputChange('duree_amortissement', parseInt(e.target.value) || 1)}
                        disabled={isSubmitting}
                      />
                      {errors.duree_amortissement && (
                        <p className="mt-1 text-sm text-red-600">{errors.duree_amortissement}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Méthode d'amortissement *</label>
                      <Select
                        value={formData.methode_amortissement}
                        onValueChange={(value) => handleInputChange('methode_amortissement', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner la méthode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lineaire">Linéaire</SelectItem>
                          <SelectItem value="degressive">Dégressive</SelectItem>
                          <SelectItem value="unites_oeuvre">Unités d'œuvre</SelectItem>
                          <SelectItem value="exceptionnelle">Exceptionnelle</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.methode_amortissement && (
                        <p className="mt-1 text-sm text-red-600">{errors.methode_amortissement}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location and Status */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Localisation et Statut</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Localisation</label>
                      <Input
                        placeholder="Bureau 201, Bâtiment A"
                        value={formData.localisation}
                        onChange={(e) => handleInputChange('localisation', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.localisation && (
                        <p className="mt-1 text-sm text-red-600">{errors.localisation}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
                      <Input
                        placeholder="Nom du fournisseur"
                        value={formData.fournisseur}
                        onChange={(e) => handleInputChange('fournisseur', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.fournisseur && (
                        <p className="mt-1 text-sm text-red-600">{errors.fournisseur}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                      <Select
                        value={formData.statut}
                        onValueChange={(value) => handleInputChange('statut', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_service">En service</SelectItem>
                          <SelectItem value="en_maintenance">En maintenance</SelectItem>
                          <SelectItem value="hors_service">Hors service</SelectItem>
                          <SelectItem value="cede">Cédé</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.statut && (
                        <p className="mt-1 text-sm text-red-600">{errors.statut}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations Complémentaires</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Description détaillée de l'actif..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('actions.create')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Update filter logic
          handleFilterChange('date_acquisition_debut', newDateRange.start);
          handleFilterChange('date_acquisition_fin', newDateRange.end);
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default FixedAssetsPage;