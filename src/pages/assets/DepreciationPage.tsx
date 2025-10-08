import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingDown,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Calculator,
  DollarSign,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Upload,
  Play,
  Pause,
  RefreshCw,
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
import { assetsService, createAmortissementSchema } from '../../services/modules/assets.service';
import { z } from 'zod';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';

interface DepreciationFilters {
  search: string;
  actif: string;
  methode: string;
  periode: string;
  statut: string;
  date_debut: string;
  date_fin: string;
}

const DepreciationPage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<DepreciationFilters>({
    search: '',
    actif: '',
    methode: '',
    periode: '',
    statut: '',
    date_debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    date_fin: new Date().toISOString().split('T')[0]
  });
  const [page, setPage] = useState(1);
  const [selectedDepreciation, setSelectedDepreciation] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'manuel' | 'auto'>('auto');
  const [formData, setFormData] = useState({
    immobilisation_id: '',
    exercice: new Date().getFullYear().toString(),
    montant: 0,
    date_debut: '',
    date_fin: '',
    methode: 'lineaire' as 'lineaire' | 'degressive' | 'unites_oeuvre' | 'exceptionnelle',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const queryClient = useQueryClient();

  // Create amortissement mutation
  const createMutation = useMutation({
    mutationFn: assetsService.createAmortissement,
    onSuccess: () => {
      toast.success('Amortissement créé avec succès');
      queryClient.invalidateQueries({ queryKey: ['amortissements'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création');
    },
  });

  // Fetch depreciation data
  const { data: depreciationData, isLoading } = useQuery({
    queryKey: ['depreciation', 'list', page, filters],
    queryFn: () => assetsService.getDepreciationData({ 
      page, 
      ...filters
    }),
  });

  // Fetch assets for selection
  const { data: assets } = useQuery({
    queryKey: ['fixed-assets', 'list'],
    queryFn: () => assetsService.getFixedAssets({ page: 1, limit: 1000 }),
  });

  // Calculate depreciation mutation
  const calculateDepreciationMutation = useMutation({
    mutationFn: assetsService.calculateDepreciation,
    onSuccess: (result) => {
      toast.success(`${result.count} amortissements calculés`);
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
    },
    onError: () => {
      toast.error('Erreur lors du calcul des amortissements');
    }
  });

  // Delete depreciation mutation
  const deleteDepreciationMutation = useMutation({
    mutationFn: assetsService.deleteDepreciation,
    onSuccess: () => {
      toast.success('Amortissement supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['depreciation'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteDepreciation = (depreciationId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet amortissement ?')) {
      deleteDepreciationMutation.mutate(depreciationId);
    }
  };

  const handleCalculateDepreciation = () => {
    if (confirm('Lancer le calcul automatique des amortissements pour la période ?')) {
      calculateDepreciationMutation.mutate({
        date_debut: filters.date_debut,
        date_fin: filters.date_fin,
        methode: filters.methode || 'lineaire'
      });
    }
  };

  const handleFilterChange = (key: keyof DepreciationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      actif: '',
      methode: '',
      periode: '',
      statut: '',
      date_debut: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      date_fin: new Date().toISOString().split('T')[0]
    });
    setPage(1);
  };

  const resetForm = () => {
    setFormData({
      immobilisation_id: '',
      exercice: new Date().getFullYear().toString(),
      montant: 0,
      date_debut: '',
      date_fin: '',
      methode: 'lineaire',
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
      const validatedData = createAmortissementSchema.parse(formData);

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

  const getMethodeColor = (methode: string) => {
    switch (methode) {
      case 'lineaire': return 'bg-var(--color-blue-light) text-var(--color-blue-dark)';
      case 'degressive': return 'bg-var(--color-green-light) text-var(--color-green-dark)';
      case 'unites_oeuvre': return 'bg-var(--color-purple-light) text-var(--color-purple-dark)';
      case 'exceptionnelle': return 'bg-var(--color-red-light) text-var(--color-red-dark)';
      default: return 'bg-var(--color-gray-light) text-var(--color-gray-dark)';
    }
  };

  const getMethodeLabel = (methode: string) => {
    switch (methode) {
      case 'lineaire': return 'Linéaire';
      case 'degressive': return 'Dégressive';
      case 'unites_oeuvre': return 'Unités d\'œuvre';
      case 'exceptionnelle': return 'Exceptionnelle';
      default: return methode;
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'calcule': return 'bg-var(--color-blue-light) text-var(--color-blue-dark)';
      case 'comptabilise': return 'bg-var(--color-green-light) text-var(--color-green-dark)';
      case 'annule': return 'bg-var(--color-red-light) text-var(--color-red-dark)';
      case 'provisoire': return 'bg-var(--color-yellow-light) text-var(--color-yellow-dark)';
      default: return 'bg-var(--color-gray-light) text-var(--color-gray-dark)';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'calcule': return 'Calculé';
      case 'comptabilise': return 'Comptabilisé';
      case 'annule': return 'Annulé';
      case 'provisoire': return 'Provisoire';
      default: return statut;
    }
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-var(--color-border) pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center">
              <TrendingDown className="mr-3 h-7 w-7" />
              Amortissements
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Calcul et suivi des amortissements des immobilisations
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setCalculationMode(calculationMode === 'manuel' ? 'auto' : 'manuel')}
            >
              {calculationMode === 'manuel' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Mode Auto
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Mode Manuel
                </>
              )}
            </Button>
            <ExportMenu
              data={depreciationData?.results || []}
              filename="amortissements"
              columns={{
                date_amortissement: 'Date',
                nom_actif: 'Actif',
                code_actif: 'Code Actif',
                methode: 'Méthode',
                periode: 'Période',
                valeur_base: 'Valeur Base',
                taux_amortissement: 'Taux (%)',
                montant_dotation: 'Dotation',
                cumul_amortissements: 'Cumul',
                valeur_nette_comptable: 'VNC',
                statut: 'Statut'
              }}
            />
            {calculationMode === 'auto' && (
              <Button 
                className="bg-var(--color-blue-primary) hover:bg-var(--color-blue-dark) text-var(--color-text-inverse)"
                onClick={handleCalculateDepreciation}
                disabled={calculateDepreciationMutation.isPending}
              >
                {calculateDepreciationMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Calcul...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calculer
                  </>
                )}
              </Button>
            )}
            {calculationMode === 'manuel' && (
              <Button 
                className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nouvel Amortissement
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-var(--color-text-secondary)">Total Période</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(depreciationData?.total_periode || 0)}
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
                <p className="text-sm font-medium text-var(--color-text-secondary)">Comptabilisés</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(depreciationData?.total_comptabilise || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-var(--color-text-secondary)">{t('status.pending')}</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {formatCurrency(depreciationData?.total_en_attente || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-var(--color-text-secondary)">Nb. Opérations</p>
                <p className="text-2xl font-bold text-purple-700">
                  {depreciationData?.count || 0}
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
            Filtres et Paramètres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-var(--color-text-muted)" />
              <Input
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.actif} onValueChange={(value) => handleFilterChange('actif', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les actifs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les actifs</SelectItem>
                {assets?.results?.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.designation} ({asset.code_immobilisation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.methode} onValueChange={(value) => handleFilterChange('methode', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes méthodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les méthodes</SelectItem>
                <SelectItem value="lineaire">Linéaire</SelectItem>
                <SelectItem value="degressive">Dégressive</SelectItem>
                <SelectItem value="unites_oeuvre">Unités d'œuvre</SelectItem>
                <SelectItem value="exceptionnelle">Exceptionnelle</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="calcule">Calculé</SelectItem>
                <SelectItem value="comptabilise">Comptabilisé</SelectItem>
                <SelectItem value="provisoire">Provisoire</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.periode} onValueChange={(value) => handleFilterChange('periode', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes périodes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les périodes</SelectItem>
                <SelectItem value="mensuel">Mensuel</SelectItem>
                <SelectItem value="trimestriel">Trimestriel</SelectItem>
                <SelectItem value="annuel">Annuel</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Sélectionner période
            </Button>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Depreciation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tableau des Amortissements</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-var(--color-text-secondary)">
                Du {formatDate(filters.date_debut)} au {formatDate(filters.date_fin)}
              </span>
              {depreciationData && (
                <Badge variant="outline">
                  {depreciationData.count} opération(s)
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des amortissements..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Actif</TableHead>
                      <TableHead>Méthode</TableHead>
                      <TableHead>Période</TableHead>
                      <TableHead className="text-right">Valeur Base</TableHead>
                      <TableHead className="text-right">Taux</TableHead>
                      <TableHead className="text-right">Dotation</TableHead>
                      <TableHead className="text-right">Cumul</TableHead>
                      <TableHead className="text-right">VNC</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depreciationData?.results?.map((depreciation) => (
                      <TableRow key={depreciation.id} className="hover:bg-var(--color-background-secondary)">
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-var(--color-text-muted) mr-2" />
                            {formatDate(depreciation.date_amortissement)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)]">{depreciation.nom_actif}</p>
                            <p className="text-sm text-var(--color-text-secondary) font-mono">
                              {depreciation.code_actif}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getMethodeColor(depreciation.methode)}>
                            {getMethodeLabel(depreciation.methode)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {depreciation.periode}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-var(--color-text-primary)">
                            {formatCurrency(depreciation.valeur_base)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium text-blue-700">
                            {depreciation.taux_amortissement}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-bold text-red-700">
                            {formatCurrency(depreciation.montant_dotation)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-orange-700">
                            {formatCurrency(depreciation.cumul_amortissements)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-700">
                            {formatCurrency(depreciation.valeur_nette_comptable)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(depreciation.statut)}>
                            {getStatusLabel(depreciation.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedDepreciation(depreciation)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {depreciation.statut === 'calcule' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  aria-label="Comptabiliser"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Modifier"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {depreciation.statut !== 'comptabilise' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDepreciation(depreciation.id)}
                                className="text-red-600 hover:text-red-700"
                                aria-label="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Row */}
              {depreciationData && depreciationData.results && depreciationData.results.length > 0 && (
                <div className="mt-4 p-4 bg-var(--color-background-secondary) rounded-lg">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-var(--color-text-secondary)">Total Dotations</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(depreciationData.total_dotations || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-var(--color-text-secondary)">Total Cumul</p>
                      <p className="text-lg font-bold text-orange-700">
                        {formatCurrency(depreciationData.total_cumul || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-var(--color-text-secondary)">Total VNC</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(depreciationData.total_vnc || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-var(--color-text-secondary)">Taux Moyen</p>
                      <p className="text-lg font-bold text-blue-700">
                        {depreciationData.taux_moyen || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {depreciationData && depreciationData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(depreciationData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!depreciationData?.results || depreciationData.results.length === 0) && (
                <div className="text-center py-12">
                  <TrendingDown className="h-12 w-12 text-var(--color-text-muted) mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-var(--color-text-primary) mb-2">Aucun amortissement trouvé</h3>
                  <p className="text-var(--color-text-secondary) mb-6">
                    Aucun amortissement calculé pour la période et les critères sélectionnés.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button 
                      className="bg-var(--color-blue-primary) hover:bg-var(--color-blue-dark) text-var(--color-text-inverse)"
                      onClick={handleCalculateDepreciation}
                      disabled={calculateDepreciationMutation.isPending}
                    >
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculer les amortissements
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Depreciation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Nouvel Amortissement Manuel</h2>
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
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Amortissement Manuel</h4>
                      <p className="text-sm text-blue-800">Créez un amortissement manuel pour des situations particulières non couvertes par le calcul automatique.</p>
                    </div>
                  </div>
                </div>

                {/* Asset Selection */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Sélection de l'Actif</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Immobilisation *</label>
                      <Select
                        value={formData.immobilisation_id}
                        onValueChange={(value) => handleInputChange('immobilisation_id', value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une immobilisation" />
                        </SelectTrigger>
                        <SelectContent>
                          {assets?.results?.map((asset) => (
                            <SelectItem key={asset.id} value={asset.id}>
                              {asset.designation} - {asset.code_immobilisation}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.immobilisation_id && (
                        <p className="mt-1 text-sm text-red-600">{errors.immobilisation_id}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Calculation Parameters */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Paramètres de Calcul</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Exercice *</label>
                      <Input
                        placeholder="2024"
                        value={formData.exercice}
                        onChange={(e) => handleInputChange('exercice', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.exercice && (
                        <p className="mt-1 text-sm text-red-600">{errors.exercice}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date début *</label>
                      <Input
                        type="date"
                        value={formData.date_debut}
                        onChange={(e) => handleInputChange('date_debut', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_debut && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_debut}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date fin *</label>
                      <Input
                        type="date"
                        value={formData.date_fin}
                        onChange={(e) => handleInputChange('date_fin', e.target.value)}
                        disabled={isSubmitting}
                      />
                      {errors.date_fin && (
                        <p className="mt-1 text-sm text-red-600">{errors.date_fin}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Méthode d'amortissement *</label>
                      <Select
                        value={formData.methode}
                        onValueChange={(value) => handleInputChange('methode', value)}
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
                      {errors.methode && (
                        <p className="mt-1 text-sm text-red-600">{errors.methode}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Amount Details */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Montants</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Montant *</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.montant}
                        onChange={(e) => handleInputChange('montant', parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                      {errors.montant && (
                        <p className="mt-1 text-sm text-red-600">{errors.montant}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Informations Complémentaires</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Justification</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Justification de cet amortissement manuel..."
                      />
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
          handleFilterChange('date_debut', newDateRange.start);
          handleFilterChange('date_fin', newDateRange.end);
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default DepreciationPage;