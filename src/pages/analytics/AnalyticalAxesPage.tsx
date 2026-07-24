import React, { useState, useEffect, useMemo } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMutation } from '@tanstack/react-query';
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
  Upload,
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
import { createAxeSchema } from '../../services/modules/analytics.service';
import { listAxes, createAxe, updateAxe, deleteAxe, type Axe } from '../../features/budget/services/analyticsService';
import { z } from 'zod';
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface AxeData {
  id: string;
  code: string;
  libelle: string;
  type: string;
  niveau: number;
  description: string;
  nb_centres: number;
  nb_ventilations: number;
  montant_total: number;
  statut: string;
  responsable: string;
  email_responsable: string;
  [key: string]: unknown;
}

interface AxesFilters {
  search: string;
  type: string;
  statut: string;
  niveau: string;
}

const AnalyticalAxesPage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<AxesFilters>({
    search: '',
    type: '',
    statut: '',
    niveau: ''
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAxe, setSelectedAxe] = useState<AxeData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    type: 'centre_cout' as 'centre_cout' | 'centre_profit' | 'projet' | 'produit' | 'region' | 'activite',
    description: '',
    niveau: '1',
    statut: 'actif',
    responsable: '',
    hierarchique: false,
    obligatoire_classes: [] as string[],
    actif: true,
    budget: false,
    reporting: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { adapter } = useData();

  // Axes analytiques = table canonique `axes_analytiques` (vue par le moteur de ventilation),
  // et NON un blob `settings` parallèle qui rendait les axes invisibles à la ventilation.
  const [allAxes, setAllAxes] = useState<AxeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapAxe = (a: Axe): AxeData => ({
    id: a.id, code: a.code, libelle: a.libelle,
    type: a.type_axe || 'centre_cout',
    niveau: 1, description: '', nb_centres: 0, nb_ventilations: 0, montant_total: 0,
    statut: a.actif ? 'actif' : 'inactif', responsable: '', email_responsable: '',
  });

  const loadAxes = async () => {
    try {
      const rows = await listAxes(adapter);
      setAllAxes(rows.map(mapAxe));
    } catch (err) {
      console.error('[AnalyticalAxesPage] Erreur chargement axes analytiques:', err);
      toast.error(t('analyticalAxes.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadAxes(); }, [adapter]);

  // Compute filtered & paginated axesData from Dexie
  const axesData = useMemo(() => {
    let filtered = allAxes;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter((a: AxeData) =>
        (a.code as string || '').toLowerCase().includes(s) ||
        (a.libelle as string || '').toLowerCase().includes(s)
      );
    }
    if (filters.type) {
      filtered = filtered.filter((a: AxeData) => a.type === filters.type);
    }
    if (filters.statut) {
      filtered = filtered.filter((a: AxeData) => a.statut === filters.statut);
    }
    if (filters.niveau) {
      filtered = filtered.filter((a: AxeData) => String(a.niveau) === filters.niveau);
    }
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    const results = filtered.slice(start, start + pageSize);
    const activeItems = allAxes.filter((a: AxeData) => a.statut === 'actif');
    return {
      count: filtered.length,
      active_count: activeItems.length,
      results,
      type_distribution: Object.entries(
        allAxes.reduce((acc: Record<string, number>, a: AxeData) => {
          const type = a.type as string || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => ({ type, count })),
    };
  }, [allAxes, filters, page]);

  // Create/update axe → table canonique axes_analytiques (create si nouveau, update si édition).
  const createMutation = useMutation({
    mutationFn: async (data: AxeData) => {
      const payload = {
        code: data.code, libelle: data.libelle,
        type_axe: data.type, actif: data.statut === 'actif',
      };
      if (selectedAxe?.id) {
        await updateAxe(adapter, selectedAxe.id, { libelle: payload.libelle, type_axe: payload.type_axe, actif: payload.actif });
      } else {
        await createAxe(adapter, payload);
      }
    },
    onSuccess: async () => {
      toast.success(selectedAxe ? t('analyticalAxes.updated') : t('analyticalAxes.created'));
      setShowCreateModal(false);
      setSelectedAxe(null);
      resetForm();
      await loadAxes();
    },
    onError: (error: Error) => {
      toast.error(error.message || t('analyticalAxes.saveError'));
    },
  });

  const deleteAxeMutation = useMutation({
    mutationFn: async (axeId: string) => { await deleteAxe(adapter, axeId); },
    onSuccess: async () => {
      toast.success(t('analyticalAxes.deleted'));
      await loadAxes();
    },
    onError: () => {
      toast.error(t('analyticalAxes.deleteError'));
    }
  });

  const handleDeleteAxe = (axeId: string) => {
    if (confirm(t('analyticalAxes.confirmDelete'))) {
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

  const resetForm = () => {
    setFormData({
      code: '',
      libelle: '',
      type: 'centre_cout',
      description: '',
      niveau: '1',
      statut: 'actif',
      responsable: '',
      hierarchique: false,
      obligatoire_classes: [],
      actif: true,
      budget: false,
      reporting: false,
    });
    setErrors({});
    setIsSubmitting(false);
  };

  const handleInputChange = (field: string, value: string | boolean | string[]) => {
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

      // Validate with Zod (valide les champs du schéma)
      const validatedData = createAxeSchema.parse(formData);

      // Merge avec les champs contrôlés hors-schéma (niveau, statut, responsable, budget, reporting)
      const fullData: AxeData = {
        ...(validatedData as unknown as AxeData),
        niveau: Number(formData.niveau) || 1,
        statut: formData.statut || 'actif',
        responsable: formData.responsable || '',
        email_responsable: '',
        nb_centres: 0,
        nb_ventilations: 0,
        montant_total: 0,
        id: '',
        budget: formData.budget,
        reporting: formData.reporting,
      };

      // Submit to backend
      await createMutation.mutateAsync(fullData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map Zod errors to form fields
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          fieldErrors[field] = err.message;
        });
        setErrors(fieldErrors);
        toast.error(t('analyticalAxes.formErrors'));
      } else {
        toast.error(t('analyticalAxes.createError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'centre_cout': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
      case 'centre_profit': return 'bg-green-100 text-green-800';
      case 'projet': return 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]';
      case 'produit': return 'bg-orange-100 text-orange-800';
      case 'region': return 'bg-red-100 text-red-800';
      case 'activite': return 'bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'centre_cout': return t('analyticalAxes.typeCostCenter');
      case 'centre_profit': return t('analyticalAxes.typeProfitCenter');
      case 'projet': return t('analyticalAxes.typeProject');
      case 'produit': return t('analyticalAxes.typeProduct');
      case 'region': return t('analyticalAxes.typeRegion');
      case 'activite': return t('analyticalAxes.typeActivity');
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
      case 'actif': return t('analyticalAxes.statusActive');
      case 'inactif': return t('analyticalAxes.statusInactive');
      case 'archive': return t('analyticalAxes.statusArchived');
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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Layers className="mr-3 h-7 w-7" />
              {t('analyticalAxes.title')}
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {t('analyticalAxes.subtitle')}
            </p>
          </div>
          <div className="flex space-x-3">
            <PageHeaderActions
              onToggleFilters={() => setShowFilters((v) => !v)}
              filtersOpen={showFilters}
              activeFilters={[filters.search, filters.type, filters.statut, filters.niveau].filter(Boolean).length}
            />
            <Button variant="outline" onClick={() => toast(t('analyticalAxes.exportInDev'), { icon: '⏳' })}>
              <Download className="mr-2 h-4 w-4" />
              {t('analyticalAxes.export')}
            </Button>
            <Button variant="outline" onClick={() => toast(t('analyticalAxes.importInDev'), { icon: '⏳' })}>
              <Upload className="mr-2 h-4 w-4" />
              {t('analyticalAxes.import')}
            </Button>
            <Button 
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('analyticalAxes.newAxis')}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-full">
                <Layers className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('analyticalAxes.totalAxes')}</p>
                <p className="text-lg font-bold text-gray-900">
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
                <p className="text-sm font-medium text-gray-600">{t('analyticalAxes.activeAxes')}</p>
                <p className="text-lg font-bold text-green-700">
                  {axesData?.active_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[var(--color-text-secondary)]/10 rounded-full">
                <Users className="h-6 w-6 text-[var(--color-text-secondary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('analyticalAxes.associatedCenters')}</p>
                <p className="text-lg font-bold text-primary-700">
                  —
                </p>
                <p className="text-xs text-gray-500">{t('analyticalAxes.notFedByImport')}</p>
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
                <p className="text-sm font-medium text-gray-600">{t('analyticalAxes.allocations')}</p>
                <p className="text-lg font-bold text-orange-700">
                  —
                </p>
                <p className="text-xs text-gray-500">{t('analyticalAxes.costAccountingNotFed')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters (repliable via l'entonnoir de l'en-tête) */}
      {showFilters && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            {t('analyticalAxes.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder={t('analyticalAxes.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.type} onValueChange={(value) => handleFilterChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('analyticalAxes.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('analyticalAxes.allTypes')}</SelectItem>
                <SelectItem value="centre_cout">{t('analyticalAxes.typeCostCenter')}</SelectItem>
                <SelectItem value="centre_profit">{t('analyticalAxes.typeProfitCenter')}</SelectItem>
                <SelectItem value="projet">{t('analyticalAxes.typeProject')}</SelectItem>
                <SelectItem value="produit">{t('analyticalAxes.typeProduct')}</SelectItem>
                <SelectItem value="region">{t('analyticalAxes.typeRegion')}</SelectItem>
                <SelectItem value="activite">{t('analyticalAxes.typeActivity')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('analyticalAxes.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('analyticalAxes.allStatuses')}</SelectItem>
                <SelectItem value="actif">{t('analyticalAxes.statusActive')}</SelectItem>
                <SelectItem value="inactif">{t('analyticalAxes.statusInactive')}</SelectItem>
                <SelectItem value="archive">{t('analyticalAxes.statusArchived')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.niveau} onValueChange={(value) => handleFilterChange('niveau', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('analyticalAxes.allLevels')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('analyticalAxes.allLevels')}</SelectItem>
                <SelectItem value="1">{t('analyticalAxes.level1')}</SelectItem>
                <SelectItem value="2">{t('analyticalAxes.level2')}</SelectItem>
                <SelectItem value="3">{t('analyticalAxes.level3')}</SelectItem>
                <SelectItem value="4">{t('analyticalAxes.level4')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              {t('analyticalAxes.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Axes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('analyticalAxes.listTitle')}</span>
            {axesData && (
              <Badge variant="outline">
                {t('analyticalAxes.axisCount', { count: String(axesData.count) })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text={t('analyticalAxes.loadingAxes')} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('analyticalAxes.colCodeLabel')}</TableHead>
                      <TableHead>{t('analyticalAxes.colType')}</TableHead>
                      <TableHead>{t('analyticalAxes.colLevel')}</TableHead>
                      <TableHead>{t('analyticalAxes.colDescription')}</TableHead>
                      <TableHead>{t('analyticalAxes.colCenters')}</TableHead>
                      <TableHead>{t('analyticalAxes.colUsage')}</TableHead>
                      <TableHead>{t('analyticalAxes.colStatus')}</TableHead>
                      <TableHead>{t('analyticalAxes.colResponsible')}</TableHead>
                      <TableHead className="text-right">{t('analyticalAxes.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {axesData?.results?.map((axe) => (
                      <TableRow key={axe.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-[var(--color-primary)]/10 rounded-full">
                              <Layers className="h-4 w-4 text-[var(--color-primary)]" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)]">{axe.libelle}</p>
                              <p className="text-sm text-[var(--color-text-secondary)] font-mono">
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
                            {t('analyticalAxes.levelLabel', { count: String(axe.niveau) })}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700 max-w-xs truncate">
                            {axe.description || t('analyticalAxes.noDescription')}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-700" />
                            <span className="text-sm text-gray-500">—</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p className="text-gray-500">—</p>
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
                              aria-label={t('analyticalAxes.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t('analyticalAxes.centers')}
                              onClick={() => toast(t('analyticalAxes.centersInDev', { name: axe.libelle }), { icon: '⏳' })}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t('analyticalAxes.settings')}
                              onClick={() => toast(t('analyticalAxes.settingsInDev', { name: axe.libelle }), { icon: '⏳' })}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t('analyticalAxes.edit')}
                              onClick={() => {
                                setSelectedAxe(axe);
                                setFormData({
                                  code: axe.code,
                                  libelle: axe.libelle,
                                  type: axe.type as typeof formData.type,
                                  description: axe.description || '',
                                  niveau: String(axe.niveau || 1),
                                  statut: axe.statut || 'actif',
                                  responsable: axe.responsable || '',
                                  hierarchique: false,
                                  obligatoire_classes: [],
                                  actif: axe.statut === 'actif',
                                  budget: !!(axe.budget),
                                  reporting: !!(axe.reporting),
                                });
                                setShowCreateModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAxe(axe.id)}
                              className="text-red-600 hover:text-red-700"
                              aria-label={t('analyticalAxes.delete')}
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
                  <Layers className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('analyticalAxes.noAxisFound')}</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.type || filters.statut || filters.niveau
                      ? t('analyticalAxes.noMatchCriteria')
                      : t('analyticalAxes.startCreate')}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('analyticalAxes.createAxis')}
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
              {t('analyticalAxes.usageStats')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('analyticalAxes.distributionByType')}</h4>
                <div className="space-y-2">
                  {axesData.type_distribution?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Badge className={getTypeColor(item.type)}>
                          {getTypeLabel(item.type)}
                        </Badge>
                      </div>
                      <span className="font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">{t('analyticalAxes.topAxesByVolume')}</h4>
                <div className="p-4 bg-gray-50 rounded text-center text-sm text-gray-500">
                  {t('analyticalAxes.noDataCostAccounting')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Axe Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-[var(--color-primary)]/10 text-[var(--color-primary)] p-2 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedAxe ? t('analyticalAxes.editModalTitle') : t('analyticalAxes.newModalTitle')}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedAxe(null);
                  resetForm();
                }}
                className="text-gray-700 hover:text-gray-900"
                disabled={isSubmitting}
                aria-label={t('analyticalAxes.close')}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Info */}
                <div className="bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">{t('analyticalAxes.title')}</h4>
                      <p className="text-sm text-blue-800">
                        {t('analyticalAxes.infoText')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Identification */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('analyticalAxes.identification')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('analyticalAxes.code')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="AXE001"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
                        {t('analyticalAxes.axisType')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">{t('analyticalAxes.selectType')}</option>
                        <option value="centre_cout">{t('analyticalAxes.typeCostCenter')}</option>
                        <option value="centre_profit">{t('analyticalAxes.typeProfitCenter')}</option>
                        <option value="projet">{t('analyticalAxes.typeProject')}</option>
                        <option value="produit">{t('analyticalAxes.typeProduct')}</option>
                        <option value="region">{t('analyticalAxes.typeRegion')}</option>
                        <option value="activite">{t('analyticalAxes.typeActivity')}</option>
                      </select>
                      {errors.type && (
                        <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('analyticalAxes.label')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder={t('analyticalAxes.labelPlaceholder')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
                      {t('analyticalAxes.colDescription')}
                    </label>
                    <textarea
                      rows={3}
                      placeholder={t('analyticalAxes.descriptionPlaceholder')}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      disabled={isSubmitting}
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                    )}
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('analyticalAxes.configuration')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('analyticalAxes.colLevel')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        value={formData.niveau}
                        onChange={(e) => handleInputChange('niveau', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="1">{t('analyticalAxes.level1Strategic')}</option>
                        <option value="2">{t('analyticalAxes.level2Tactical')}</option>
                        <option value="3">{t('analyticalAxes.level3Operational')}</option>
                        <option value="4">{t('analyticalAxes.level4Detailed')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('analyticalAxes.colStatus')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        value={formData.statut}
                        onChange={(e) => handleInputChange('statut', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="actif">{t('analyticalAxes.statusActive')}</option>
                        <option value="inactif">{t('analyticalAxes.statusInactive')}</option>
                        <option value="archive">{t('analyticalAxes.statusArchived')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('analyticalAxes.colResponsible')}
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      value={formData.responsable}
                      onChange={(e) => handleInputChange('responsable', e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">{t('analyticalAxes.selectResponsible')}</option>
                      <option value="user1">{t('analyticalAxes.roleCFO')}</option>
                      <option value="user2">{t('analyticalAxes.roleController')}</option>
                      <option value="user3">{t('analyticalAxes.roleChiefAccountant')}</option>
                      <option value="user4">{t('analyticalAxes.roleFinancialAnalyst')}</option>
                    </select>
                  </div>
                </div>

                {/* Options avancées */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">{t('analyticalAxes.advancedOptions')}</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="obligatoire"
                        checked={formData.actif}
                        onChange={(e) => handleInputChange('actif', e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                      <label htmlFor="obligatoire" className="ml-2 text-sm text-gray-700">
                        {t('analyticalAxes.activeAxis')}
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="hierarchique"
                        checked={formData.hierarchique}
                        onChange={(e) => handleInputChange('hierarchique', e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                      <label htmlFor="hierarchique" className="ml-2 text-sm text-gray-700">
                        {t('analyticalAxes.hierarchicalStructure')}
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="budget"
                        checked={!!formData.budget}
                        onChange={(e) => handleInputChange('budget', e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                      <label htmlFor="budget" className="ml-2 text-sm text-gray-700">
                        {t('analyticalAxes.enableBudgetTracking')}
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="reporting"
                        checked={!!formData.reporting}
                        onChange={(e) => handleInputChange('reporting', e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                      <label htmlFor="reporting" className="ml-2 text-sm text-gray-700">
                        {t('analyticalAxes.includeInReports')}
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
                  setSelectedAxe(null);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('analyticalAxes.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label={t('analyticalAxes.validate')}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>{t('analyticalAxes.creating')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t('analyticalAxes.createAxisBtn')}</span>
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

export default AnalyticalAxesPage;