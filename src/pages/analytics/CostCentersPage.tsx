import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
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
import { analyticsService, createCentreSchema } from '../../services/modules/analytics.service';
import { z } from 'zod';
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
  const { t } = useLanguage();
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
  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    axe_id: '',
    type: 'operationnel' as 'operationnel' | 'support' | 'structure' | 'projet',
    responsable: '',
    budget_annuel: 0,
    suivi_budget: false,
    parent_id: '',
    actif: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Create centre mutation
  const createMutation = useMutation({
    mutationFn: analyticsService.createCentre,
    onSuccess: () => {
      toast.success('Centre de coût créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['centres-analytiques'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

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

  const resetForm = () => {
    setFormData({
      code: '',
      libelle: '',
      axe_id: '',
      type: 'operationnel',
      responsable: '',
      budget_annuel: 0,
      suivi_budget: false,
      parent_id: '',
      actif: true,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: any) => {
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
      const validatedData = createCentreSchema.parse(formData);

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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Users className="mr-3 h-7 w-7" />
              Centres de Coûts
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
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
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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
                <p className="text-lg font-bold text-gray-900">
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
                <p className="text-lg font-bold text-green-700">
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
                <p className="text-lg font-bold text-purple-700">
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
                <p className="text-lg font-bold text-orange-700">
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
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
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
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
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
                      <TableHead className="text-right">{t('navigation.budget')}</TableHead>
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
                              <p className="font-medium text-[var(--color-text-primary)]">{center.libelle}</p>
                              <p className="text-sm text-[var(--color-text-secondary)] font-mono">
                                {center.code}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{center.nom_axe}</p>
                            <p className="text-xs text-gray-700">{center.code_axe}</p>
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
                                  <p className="text-xs text-gray-700">{center.email_responsable}</p>
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
                  <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun centre de coût trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.axe || filters.type || filters.statut || filters.responsable
                      ? 'Aucun centre ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier centre de coût.'}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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

      {/* Create/Edit Cost Center Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 text-purple-600 p-2 rounded-lg">
                  <Target className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  Nouveau Centre de Coûts
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-700 hover:text-gray-700"
                disabled={isSubmitting}
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-purple-900 mb-1">Centres de Coûts</h4>
                      <p className="text-sm text-purple-800">
                        Les centres de coûts permettent de répartir et suivre les dépenses par département, projet ou activité.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Identification */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Identification</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="CC001"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={formData.code}
                        onChange={(e) => handleInputChange('code', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.code && (
                        <p className="mt-1 text-sm text-red-600">{errors.code}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">Sélectionner un type</option>
                        <option value="operationnel">Opérationnel</option>
                        <option value="support">Support</option>
                        <option value="structure">Structure</option>
                        <option value="projet">Projet</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Libellé <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Nom du centre de coûts"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.libelle}
                      onChange={(e) => handleInputChange('libelle', e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.libelle && (
                      <p className="mt-1 text-sm text-red-600">{errors.libelle}</p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Axe analytique <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      value={formData.axe_id}
                      onChange={(e) => handleInputChange('axe_id', e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">Sélectionner un axe</option>
                      {axes?.results?.map((axe) => (
                        <option key={axe.id} value={axe.id}>
                          {axe.libelle}
                        </option>
                      ))}
                    </select>
                    {errors.axe_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.axe_id}</p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Description du centre de coûts..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Responsabilité */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Responsabilité</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Responsable
                      </label>
                      <input
                        type="text"
                        placeholder="Nom du responsable"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={formData.responsable}
                        onChange={(e) => handleInputChange('responsable', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.responsable && (
                        <p className="mt-1 text-sm text-red-600">{errors.responsable}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email du responsable
                      </label>
                      <input
                        type="email"
                        placeholder="responsable@company.com"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Budget */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('navigation.budget')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budget annuel (XAF)
                      </label>
                      <input
                        type="number"
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        value={formData.budget_annuel}
                        onChange={(e) => handleInputChange('budget_annuel', parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                      {errors.budget_annuel && (
                        <p className="mt-1 text-sm text-red-600">{errors.budget_annuel}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut <span className="text-red-500">*</span>
                      </label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="archive">Archivé</option>
                        <option value="ferme">Fermé</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Options</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="suivi_budget"
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        checked={formData.suivi_budget}
                        onChange={(e) => handleInputChange('suivi_budget', e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="suivi_budget" className="ml-2 text-sm text-gray-700">
                        Activer le suivi budgétaire et alertes de dépassement
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="imputation"
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="imputation" className="ml-2 text-sm text-gray-700">
                        Imputation automatique des écritures comptables
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="reporting"
                        defaultChecked
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <label htmlFor="reporting" className="ml-2 text-sm text-gray-700">
                        Inclure dans les rapports analytiques
                      </label>
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
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Valider">
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Créer le centre</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CostCentersPage;