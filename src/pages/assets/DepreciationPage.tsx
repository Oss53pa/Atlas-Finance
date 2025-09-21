import React, { useState } from 'react';
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
  Download,
  Upload,
  Play,
  Pause,
  RefreshCw
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
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

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

  const queryClient = useQueryClient();

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

  const getMethodeColor = (methode: string) => {
    switch (methode) {
      case 'lineaire': return 'bg-blue-100 text-blue-800';
      case 'degressive': return 'bg-green-100 text-green-800';
      case 'unites_oeuvre': return 'bg-purple-100 text-purple-800';
      case 'exceptionnelle': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      case 'calcule': return 'bg-blue-100 text-blue-800';
      case 'comptabilise': return 'bg-green-100 text-green-800';
      case 'annule': return 'bg-red-100 text-red-800';
      case 'provisoire': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const exportDepreciation = (format: 'pdf' | 'excel' | 'csv') => {
    toast.success(`Export ${format.toUpperCase()} en cours...`);
    // Implementation would go here
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <TrendingDown className="mr-3 h-7 w-7" />
              Amortissements
            </h1>
            <p className="mt-2 text-rolling-stone">
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
            <Select onValueChange={(value) => exportDepreciation(value as 'pdf' | 'excel' | 'csv')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Exporter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            {calculationMode === 'auto' && (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
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
                className="bg-tuatara hover:bg-rolling-stone text-swirl"
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
                <p className="text-sm font-medium text-gray-600">Total Période</p>
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
                <p className="text-sm font-medium text-gray-600">Comptabilisés</p>
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
                <p className="text-sm font-medium text-gray-600">En attente</p>
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
                <p className="text-sm font-medium text-gray-600">Nb. Opérations</p>
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
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filters.date_debut}
                onChange={(e) => handleFilterChange('date_debut', e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={filters.date_fin}
                onChange={(e) => handleFilterChange('date_fin', e.target.value)}
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

      {/* Depreciation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tableau des Amortissements</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
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
                      <TableHead>Date</TableHead>
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
                      <TableRow key={depreciation.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            {formatDate(depreciation.date_amortissement)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-tuatara">{depreciation.nom_actif}</p>
                            <p className="text-sm text-gray-600 font-mono">
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
                          <span className="font-semibold text-gray-700">
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
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Dotations</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(depreciationData.total_dotations || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total Cumul</p>
                      <p className="text-lg font-bold text-orange-700">
                        {formatCurrency(depreciationData.total_cumul || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Total VNC</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(depreciationData.total_vnc || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">Taux Moyen</p>
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
                  <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun amortissement trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    Aucun amortissement calculé pour la période et les critères sélectionnés.
                  </p>
                  <div className="flex justify-center space-x-3">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
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
    </div>
  );
};

export default DepreciationPage;