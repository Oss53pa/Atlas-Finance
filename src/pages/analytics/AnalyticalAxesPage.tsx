import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../lib/db';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { createAxeSchema } from '../../services/modules/analytics.service';
import { z } from 'zod';
import { formatCurrency, formatDate } from '../../lib/utils';
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
  const [filters, setFilters] = useState<AxesFilters>({
    search: '',
    type: '',
    statut: '',
    niveau: ''
  });
  const [page, setPage] = useState(1);
  const [selectedAxe, setSelectedAxe] = useState<AxeData | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    libelle: '',
    type: 'centre_cout' as 'centre_cout' | 'centre_profit' | 'projet' | 'produit' | 'region' | 'activite',
    description: '',
    hierarchique: false,
    obligatoire_classes: [] as string[],
    actif: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Load analytical axes from Dexie settings
  const axesSetting = useLiveQuery(() => db.settings.get('analytical_axes'));
  const allAxes: AxeData[] = axesSetting ? JSON.parse(axesSetting.value) : [];
  const isLoading = axesSetting === undefined;

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
      total_centers: allAxes.reduce((sum: number, a: AxeData) => sum + (Number(a.nb_centres) || 0), 0),
      total_allocations: allAxes.reduce((sum: number, a: AxeData) => sum + (Number(a.nb_ventilations) || 0), 0),
      results,
      type_distribution: Object.entries(
        allAxes.reduce((acc: Record<string, number>, a: AxeData) => {
          const type = a.type as string || 'unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {})
      ).map(([type, count]) => ({ type, count })),
      top_axes: [...allAxes]
        .sort((a, b) => (Number(b.montant_total) || 0) - (Number(a.montant_total) || 0))
        .slice(0, 5)
        .map(a => ({ libelle: a.libelle as string, montant_total: Number(a.montant_total) || 0 })),
    };
  }, [allAxes, filters, page]);

  // Create axe mutation - saves to Dexie settings
  const createMutation = useMutation({
    mutationFn: async (data: AxeData) => {
      const current = await db.settings.get('analytical_axes');
      const axes = current ? JSON.parse(current.value) : [];
      const newAxe = { ...data, id: crypto.randomUUID(), statut: 'actif', niveau: 1, nb_centres: 0, nb_ventilations: 0, montant_total: 0 };
      axes.push(newAxe);
      await db.settings.put({ key: 'analytical_axes', value: JSON.stringify(axes), updatedAt: new Date().toISOString() });
      return newAxe;
    },
    onSuccess: () => {
      toast.success('Axe analytique cree avec succes');
      setShowCreateModal(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la creation');
    },
  });

  // Delete axe mutation - removes from Dexie settings
  const deleteAxeMutation = useMutation({
    mutationFn: async (axeId: string) => {
      const current = await db.settings.get('analytical_axes');
      const axes = current ? JSON.parse(current.value) : [];
      const updated = axes.filter((a: AxeData) => a.id !== axeId);
      await db.settings.put({ key: 'analytical_axes', value: JSON.stringify(updated), updatedAt: new Date().toISOString() });
    },
    onSuccess: () => {
      toast.success('Axe supprime avec succes');
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

  const resetForm = () => {
    setFormData({
      code: '',
      libelle: '',
      type: 'centre_cout',
      description: '',
      hierarchique: false,
      obligatoire_classes: [],
      actif: true,
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

      // Validate with Zod
      const validatedData = createAxeSchema.parse(formData);

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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Layers className="mr-3 h-7 w-7" />
              Axes Analytiques
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
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
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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
                <p className="text-sm font-medium text-gray-600">Axes Actifs</p>
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
              <div className="p-2 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Centres Associés</p>
                <p className="text-lg font-bold text-purple-700">
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
                <p className="text-lg font-bold text-orange-700">
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
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
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
                            <Users className="h-4 w-4 text-gray-700" />
                            <span className="font-medium">{axe.nb_centres || 0}</span>
                            <span className="text-sm text-gray-700">centre(s)</span>
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
                  <Layers className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun axe analytique trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.type || filters.statut || filters.niveau
                      ? 'Aucun axe ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier axe analytique.'}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Répartition par Type</h4>
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
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Top Axes par Volume</h4>
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

      {/* Create/Edit Axe Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Layers className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedAxe ? 'Modifier l\'Axe Analytique' : 'Nouvel Axe Analytique'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSelectedAxe(null);
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 mb-1">Axes Analytiques</h4>
                      <p className="text-sm text-blue-800">
                        Les axes analytiques permettent d'analyser vos données comptables selon différentes dimensions
                        (centres de coûts, projets, produits, régions, etc.).
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
                        placeholder="AXE001"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        Type d'axe <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">Sélectionner un type</option>
                        <option value="centre_cout">Centre de Coût</option>
                        <option value="centre_profit">Centre de Profit</option>
                        <option value="projet">Projet</option>
                        <option value="produit">Produit</option>
                        <option value="region">Région</option>
                        <option value="activite">Activité</option>
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
                      placeholder="Nom de l'axe analytique"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Description détaillée de l'axe analytique..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <h3 className="text-md font-medium text-gray-900 mb-3">Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Niveau <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        defaultValue={selectedAxe?.niveau}
                      >
                        <option value="">Sélectionner</option>
                        <option value="1">Niveau 1 - Stratégique</option>
                        <option value="2">Niveau 2 - Tactique</option>
                        <option value="3">Niveau 3 - Opérationnel</option>
                        <option value="4">Niveau 4 - Détaillé</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        defaultValue={selectedAxe?.statut || 'actif'}
                      >
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="archive">Archivé</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsable
                    </label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedAxe?.responsable}
                    >
                      <option value="">Sélectionner un responsable</option>
                      <option value="user1">Jean Dupont - Directeur Financier</option>
                      <option value="user2">Marie Martin - Contrôleur de Gestion</option>
                      <option value="user3">Pierre Durand - Chef Comptable</option>
                      <option value="user4">Sophie Bernard - Analyste Financier</option>
                    </select>
                  </div>
                </div>

                {/* Options avancées */}
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Options avancées</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="obligatoire"
                        checked={formData.actif}
                        onChange={(e) => handleInputChange('actif', e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="obligatoire" className="ml-2 text-sm text-gray-700">
                        Axe actif
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="hierarchique"
                        checked={formData.hierarchique}
                        onChange={(e) => handleInputChange('hierarchique', e.target.checked)}
                        disabled={isSubmitting}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="hierarchique" className="ml-2 text-sm text-gray-700">
                        Structure hiérarchique (sections parent/enfant)
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="budget"
                        defaultChecked={selectedAxe?.budget}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="budget" className="ml-2 text-sm text-gray-700">
                        Activer le suivi budgétaire pour cet axe
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="reporting"
                        defaultChecked={selectedAxe?.reporting}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="reporting" className="ml-2 text-sm text-gray-700">
                        Inclure dans les rapports analytiques automatiques
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
                    <span>Créer l'axe</span>
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