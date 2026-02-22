import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import ExportMenu from '../../components/shared/ExportMenu';
import {
  GitCompare,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Eye,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Upload,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Zap
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
  SelectValue,
  Checkbox
} from '../../components/ui';
import { useBankAccounts } from '../../hooks';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface ReconciliationItem {
  id: string;
  date: string;
  date_valeur?: string;
  type_mouvement: string;
  libelle: string;
  description?: string;
  reference_comptable?: string;
  reference_banque?: string;
  montant_comptable: number;
  montant_banque: number;
  ecart_montant: number | null;
  type_ecart?: string;
  statut: string;
}

interface ReconciliationFilters {
  compte: string;
  periode_debut: string;
  periode_fin: string;
  statut: string;
  type_ecart: string;
}

const ReconciliationPage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<ReconciliationFilters>({
    compte: '',
    periode_debut: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periode_fin: new Date().toISOString().split('T')[0],
    statut: '',
    type_ecart: ''
  });
  const [page, setPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [reconciliationMode, setReconciliationMode] = useState<'manual' | 'auto'>('manual');

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: filters.periode_debut,
    end: filters.periode_fin
  });

  // États pour le modal de détail
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReconciliationItem | null>(null);

  const { data: bankAccounts } = useBankAccounts({
    page: 1,
    page_size: 100,
  });

  const reconciliationData = {
    count: 0,
    results: [],
  };

  const isLoading = false;

  const autoReconciliationMutation = {
    mutate: (_data: { compte_id: string; periode_debut: string; periode_fin: string }) => {
      toast.success('Rapprochement automatique simulé');
    },
  };

  const manualReconciliationMutation = {
    mutate: (_data: { items: string[] }) => {
      toast.success('Rapprochement manuel simulé');
      setSelectedItems(new Set());
    },
  };

  const handleFilterChange = (key: keyof ReconciliationFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      compte: '',
      periode_debut: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      periode_fin: new Date().toISOString().split('T')[0],
      statut: '',
      type_ecart: ''
    });
    setPage(1);
  };

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === reconciliationData?.results?.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(reconciliationData?.results?.map(item => item.id) || []));
    }
  };

  const handleAutoReconciliation = () => {
    if (confirm('Lancer le rapprochement automatique pour ce compte ?')) {
      autoReconciliationMutation.mutate({
        compte_id: filters.compte,
        periode_debut: filters.periode_debut,
        periode_fin: filters.periode_fin
      });
    }
  };

  const handleManualReconciliation = () => {
    if (selectedItems.size === 0) {
      toast.error('Veuillez sélectionner au moins un élément');
      return;
    }
    
    if (confirm(`Rapprocher ${selectedItems.size} élément(s) sélectionné(s) ?`)) {
      manualReconciliationMutation.mutate({
        items: Array.from(selectedItems)
      });
    }
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'rapproche': return 'bg-green-100 text-green-800';
      case 'non_rapproche': return 'bg-red-100 text-red-800';
      case 'ecart': return 'bg-yellow-100 text-yellow-800';
      case 'en_attente': return 'bg-[#171717]/10 text-[#171717]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'rapproche': return 'Rapproché';
      case 'non_rapproche': return 'Non rapproché';
      case 'ecart': return 'Écart';
      case 'en_attente': return 'En attente';
      default: return statut;
    }
  };

  const getEcartTypeColor = (type: string) => {
    switch (type) {
      case 'montant': return 'bg-red-100 text-red-800';
      case 'date': return 'bg-yellow-100 text-yellow-800';
      case 'reference': return 'bg-[#171717]/10 text-[#171717]';
      case 'absent_comptable': return 'bg-[#525252]/10 text-[#525252]';
      case 'absent_banque': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Handlers pour les actions
  const handleViewDetail = (item: ReconciliationItem) => {
    setSelectedItem(item);
    setShowDetailModal(true);
  };

  const handleReconcileSingle = (item: ReconciliationItem) => {
    if (confirm(`Confirmer le rapprochement de l'élément "${item.libelle}" ?`)) {
      toast.success(`Élément "${item.libelle}" rapproché avec succès`);
      // TODO: Appel API pour rapprocher l'élément
    }
  };

  const handleCancelReconciliation = (item: ReconciliationItem) => {
    if (confirm(`Annuler le rapprochement de l'élément "${item.libelle}" ?`)) {
      toast.success(`Rapprochement annulé pour "${item.libelle}"`);
      // TODO: Appel API pour annuler le rapprochement
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <GitCompare className="mr-3 h-7 w-7" />
              Rapprochement Bancaire
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Rapprochement entre la comptabilité et les relevés bancaires
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setReconciliationMode(reconciliationMode === 'manual' ? 'auto' : 'manual')}
            >
              {reconciliationMode === 'manual' ? (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Mode Auto
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Mode Manuel
                </>
              )}
            </Button>
            <ExportMenu
              data={reconciliationData?.results || []}
              filename="rapprochement_bancaire"
              columns={{
                date: 'Date',
                type_mouvement: 'Type',
                libelle: 'Libellé',
                reference_comptable: 'Réf. Comptable',
                reference_banque: 'Réf. Banque',
                montant_comptable: 'Montant Comptable',
                montant_banque: 'Montant Banque',
                ecart_montant: 'Écart',
                statut: 'Statut',
                type_ecart: 'Type Écart'
              }}
              buttonText="Exporter"
              buttonVariant="outline"
            />
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importer Relevé
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rapprochés</p>
                <p className="text-lg font-bold text-green-700">
                  {reconciliationData?.matched_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-full">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Non rapprochés</p>
                <p className="text-lg font-bold text-red-700">
                  {reconciliationData?.unmatched_count || 0}
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
                <p className="text-sm font-medium text-gray-600">Écarts</p>
                <p className="text-lg font-bold text-yellow-700">
                  {formatCurrency(Math.abs(reconciliationData?.total_difference || 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#171717]/10 rounded-full">
                <GitCompare className="h-6 w-6 text-[#171717]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Taux Rapprochement</p>
                <p className="text-lg font-bold text-[#171717]">
                  {reconciliationData?.match_rate ? `${reconciliationData.match_rate}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Filtres et Actions
            </div>
            <div className="flex space-x-2">
              {reconciliationMode === 'auto' && (
                <Button
                  onClick={handleAutoReconciliation}
                  disabled={!filters.compte || autoReconciliationMutation.isPending}
                  className="bg-[#171717] hover:bg-[#171717]/80 text-white"
                >
                  {autoReconciliationMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Rapprochement...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Rapprochement Auto
                    </>
                  )}
                </Button>
              )}
              {reconciliationMode === 'manual' && selectedItems.size > 0 && (
                <Button
                  onClick={handleManualReconciliation}
                  disabled={manualReconciliationMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Rapprocher ({selectedItems.size})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <Select value={filters.compte} onValueChange={(value) => handleFilterChange('compte', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un compte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les comptes</SelectItem>
                {bankAccounts?.results?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.numero_compte} - {account.libelle_compte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="md:col-span-2">
              <Button
                variant="outline"
                onClick={() => setShowPeriodModal(true)}
                className="w-full justify-start"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.start && dateRange.end
                  ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                  : 'Sélectionner une période'
                }
              </Button>
            </div>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les statuts</SelectItem>
                <SelectItem value="rapproche">Rapproché</SelectItem>
                <SelectItem value="non_rapproche">Non rapproché</SelectItem>
                <SelectItem value="ecart">Écart</SelectItem>
                <SelectItem value="en_attente">{t('status.pending')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.type_ecart} onValueChange={(value) => handleFilterChange('type_ecart', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les écarts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les écarts</SelectItem>
                <SelectItem value="montant">Écart de montant</SelectItem>
                <SelectItem value="date">Écart de date</SelectItem>
                <SelectItem value="reference">Référence différente</SelectItem>
                <SelectItem value="absent_comptable">Absent en comptabilité</SelectItem>
                <SelectItem value="absent_banque">Absent en banque</SelectItem>
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

      {/* Reconciliation Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Éléments de Rapprochement</span>
            <div className="flex items-center space-x-4">
              {reconciliationMode === 'manual' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedItems.size === reconciliationData?.results?.length && selectedItems.size > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-gray-600">Tout sélectionner</span>
                </div>
              )}
              <span className="text-sm text-gray-600">
                Du {formatDate(filters.periode_debut)} au {formatDate(filters.periode_fin)}
              </span>
              {reconciliationData && (
                <Badge variant="outline">
                  {reconciliationData.count} élément(s)
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des données de rapprochement..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {reconciliationMode === 'manual' && <TableHead className="w-12">Sél.</TableHead>}
                      <TableHead>{t('common.date')}</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>{t('accounting.label')}</TableHead>
                      <TableHead>Référence</TableHead>
                      <TableHead>{t('accounting.title')}</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead>Écart</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconciliationData?.results?.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className={`hover:bg-gray-50 ${
                          selectedItems.has(item.id) ? 'bg-[#171717]/5' : ''
                        }`}
                      >
                        {reconciliationMode === 'manual' && (
                          <TableCell>
                            <Checkbox
                              checked={selectedItems.has(item.id)}
                              onCheckedChange={() => handleItemSelect(item.id)}
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 text-gray-700 mr-2" />
                            {formatDate(item.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {item.montant_comptable > 0 ? (
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowDownLeft className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              {item.type_mouvement}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--color-text-primary)] text-sm">
                              {item.libelle}
                            </p>
                            {item.description && (
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {item.reference_comptable && (
                              <p className="font-mono text-xs">
                                Compta: {item.reference_comptable}
                              </p>
                            )}
                            {item.reference_banque && (
                              <p className="font-mono text-xs">
                                Banque: {item.reference_banque}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.montant_comptable !== null ? (
                            <span className={`font-semibold ${
                              item.montant_comptable >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(item.montant_comptable)}
                            </span>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.montant_banque !== null ? (
                            <span className={`font-semibold ${
                              item.montant_banque >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(item.montant_banque)}
                            </span>
                          ) : (
                            <span className="text-gray-700">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.ecart_montant !== null && Math.abs(item.ecart_montant) > 0.01 ? (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <div>
                                <span className="font-semibold text-red-700 text-sm">
                                  {formatCurrency(Math.abs(item.ecart_montant))}
                                </span>
                                {item.type_ecart && (
                                  <Badge className={getEcartTypeColor(item.type_ecart)} size="sm">
                                    {item.type_ecart}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-700 text-sm">OK</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.statut)}>
                            {getStatusLabel(item.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Voir les détails"
                              onClick={() => handleViewDetail(item)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {item.statut === 'non_rapproche' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700"
                                aria-label="Rapprocher"
                                onClick={() => handleReconcileSingle(item)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                            {item.statut === 'rapproche' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                aria-label="Annuler rapprochement"
                                onClick={() => handleCancelReconciliation(item)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {reconciliationData && reconciliationData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(reconciliationData.count / 50)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!reconciliationData?.results || reconciliationData.results.length === 0) && (
                <div className="text-center py-12">
                  <GitCompare className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun élément trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {!filters.compte 
                      ? 'Veuillez sélectionner un compte pour afficher les éléments de rapprochement.'
                      : 'Aucun élément de rapprochement trouvé pour la période et les critères sélectionnés.'}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Mettre à jour les filtres avec les nouvelles dates
          setFilters(prev => ({
            ...prev,
            periode_debut: newDateRange.start,
            periode_fin: newDateRange.end
          }));
        }}
        initialDateRange={dateRange}
      />

      {/* Modal de Détail Rapprochement */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#171717]/10 to-[#525252]/10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#171717] rounded-lg flex items-center justify-center text-white">
                  <GitCompare className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Détail du Rapprochement</h2>
                  <p className="text-sm text-gray-600">{selectedItem.libelle}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations Générales */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Informations Comptables</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date d'Opération</p>
                    <p className="font-semibold">{formatDate(selectedItem.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Référence Comptable</p>
                    <p className="font-mono text-sm">{selectedItem.reference_comptable || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Montant Comptable</p>
                    <p className={`text-lg font-bold ${selectedItem.montant_comptable >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedItem.montant_comptable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Libellé</p>
                    <p className="text-sm">{selectedItem.libelle}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Informations Bancaires</h3>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date Valeur Banque</p>
                    <p className="font-semibold">{selectedItem.date_valeur ? formatDate(selectedItem.date_valeur) : formatDate(selectedItem.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Référence Banque</p>
                    <p className="font-mono text-sm">{selectedItem.reference_banque || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Montant Banque</p>
                    <p className={`text-lg font-bold ${selectedItem.montant_banque >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(selectedItem.montant_banque)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type de Mouvement</p>
                    <div className="flex items-center space-x-2">
                      {selectedItem.montant_banque > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-red-600" />
                      )}
                      <span>{selectedItem.type_mouvement || 'Non spécifié'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyse de l'Écart */}
              <div className={`p-4 rounded-lg ${
                Math.abs(selectedItem.ecart_montant || 0) > 0.01
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <h3 className="font-semibold mb-3 flex items-center">
                  {Math.abs(selectedItem.ecart_montant || 0) > 0.01 ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                      <span className="text-red-900">Écart Détecté</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <span className="text-green-900">Aucun Écart</span>
                    </>
                  )}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Écart de Montant</p>
                    <p className={`text-lg font-bold ${Math.abs(selectedItem.ecart_montant || 0) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(Math.abs(selectedItem.ecart_montant || 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type d'Écart</p>
                    {selectedItem.type_ecart ? (
                      <Badge className={getEcartTypeColor(selectedItem.type_ecart)}>
                        {selectedItem.type_ecart}
                      </Badge>
                    ) : (
                      <span className="text-green-600">Aucun</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Statut</p>
                    <Badge className={getStatusColor(selectedItem.statut)}>
                      {getStatusLabel(selectedItem.statut)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedItem.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                ID: {selectedItem.id}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
                {selectedItem.statut === 'non_rapproche' && (
                  <button
                    onClick={() => {
                      handleReconcileSingle(selectedItem);
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4 inline mr-2" />
                    Rapprocher
                  </button>
                )}
                {selectedItem.statut === 'rapproche' && (
                  <button
                    onClick={() => {
                      handleCancelReconciliation(selectedItem);
                      setShowDetailModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Annuler Rapprochement
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReconciliationPage;