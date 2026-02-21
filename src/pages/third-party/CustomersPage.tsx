import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Users,
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
  CreditCard,
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
import { useClients, useDeleteThirdParty } from '../../hooks';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { CreateCustomerModal, EditCustomerModal, CustomerDetailModal } from '../../features/clients/components/CustomerModals';

interface CustomersFilters {
  search: string;
  statut: string;
  ville: string;
  segment: string;
  commercial: string;
}

const CustomersPage: React.FC = () => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<CustomersFilters>({
    search: '',
    statut: '',
    ville: '',
    segment: '',
    commercial: ''
  });
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, unknown> | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Utilisation des nouveaux hooks
  const { data: customersData, isLoading } = useClients({
    page,
    page_size: 20,
    search: filters.search || undefined,
    statut: filters.statut || undefined,
    ville: filters.ville || undefined,
    segment: filters.segment || undefined,
    commercial: filters.commercial || undefined,
  });

  const deleteCustomer = useDeleteThirdParty();

  const handleDeleteCustomer = (customerId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) {
      deleteCustomer.mutate(customerId, {
        onSuccess: () => {
          toast.success('Client supprimé avec succès');
        },
        onError: (error: Error) => {
          toast.error(error?.message || 'Erreur lors de la suppression');
        }
      });
    }
  };

  const handleViewDetails = (customer: Record<string, unknown>) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleEditCustomer = (customer: Record<string, unknown>) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleRefreshData = () => {
    setPage(page);
  };

  const handleFilterChange = (key: keyof CustomersFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      statut: '',
      ville: '',
      segment: '',
      commercial: ''
    });
    setPage(1);
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-gray-100 text-gray-800';
      case 'suspect': return 'bg-red-100 text-red-800';
      case 'prospect': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'suspect': return 'Suspect';
      case 'prospect': return 'Prospect';
      default: return statut;
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'grand_compte': return 'bg-purple-100 text-purple-800';
      case 'pme': return 'bg-blue-100 text-blue-800';
      case 'particulier': return 'bg-green-100 text-green-800';
      case 'administration': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <Users className="mr-3 h-7 w-7" />
              Clients
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Gestion de la base clients et prospects
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
              Nouveau Client
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
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-lg font-bold text-gray-900">
                  {customersData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Clients Actifs</p>
                <p className="text-lg font-bold text-gray-900">
                  {customersData?.active_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">CA Total</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(customersData?.total_ca || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Impayés</p>
                <p className="text-lg font-bold text-red-700">
                  {formatCurrency(customersData?.total_unpaid || 0)}
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
                placeholder="Rechercher un client..."
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
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="suspect">Suspect</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.segment} onValueChange={(value) => handleFilterChange('segment', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les segments</SelectItem>
                <SelectItem value="grand_compte">Grand compte</SelectItem>
                <SelectItem value="pme">PME</SelectItem>
                <SelectItem value="particulier">Particulier</SelectItem>
                <SelectItem value="administration">Administration</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder="Ville"
                value={filters.ville}
                onChange={(e) => handleFilterChange('ville', e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Input
                placeholder="Commercial"
                value={filters.commercial}
                onChange={(e) => handleFilterChange('commercial', e.target.value)}
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

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Clients</span>
            {customersData && (
              <Badge variant="outline">
                {customersData.count} client(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des clients..." />
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
                      <TableHead>Segment</TableHead>
                      <TableHead>CA Annuel</TableHead>
                      <TableHead>{t('accounting.balance')}</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customersData?.results?.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono font-semibold">
                          {customer.code_client}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              {customer.type_client === 'entreprise' ? (
                                <Building className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Users className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)]">{customer.denomination}</p>
                              {customer.forme_juridique && (
                                <p className="text-sm text-[var(--color-text-secondary)]">{customer.forme_juridique}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {customer.contact_principal && (
                              <div className="flex items-center text-sm">
                                <Users className="h-3 w-3 text-gray-700 mr-1" />
                                {customer.contact_principal}
                              </div>
                            )}
                            {customer.telephone && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 text-gray-700 mr-1" />
                                {customer.telephone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 text-gray-700 mr-1" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 text-gray-700 mr-2" />
                            <div>
                              <p>{customer.ville}</p>
                              {customer.pays && (
                                <p className="text-xs text-gray-700">{customer.pays}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSegmentColor(customer.segment)}>
                            {customer.segment === 'grand_compte' && 'Grand Compte'}
                            {customer.segment === 'pme' && 'PME'}
                            {customer.segment === 'particulier' && 'Particulier'}
                            {customer.segment === 'administration' && 'Administration'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-700">
                            {formatCurrency(customer.ca_annuel || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${
                            (customer.solde_compte || 0) >= 0 
                              ? 'text-green-700' 
                              : 'text-red-700'
                          }`}>
                            {formatCurrency(Math.abs(customer.solde_compte || 0))}
                            {(customer.solde_compte || 0) >= 0 ? ' D' : ' C'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(customer.statut)}>
                            {getStatusLabel(customer.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(customer)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCustomer(customer)}
                              aria-label="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCustomer(customer.id)}
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
              {customersData && customersData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(customersData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!customersData?.results || customersData.results.length === 0) && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun client trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.statut || filters.ville || filters.segment || filters.commercial
                      ? 'Aucun client ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier client.'}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un client
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      <CreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleRefreshData}
      />

      <EditCustomerModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        customer={selectedCustomer}
        onSuccess={handleRefreshData}
      />

      <CustomerDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        customer={selectedCustomer}
        onEdit={() => {
          setShowDetailModal(false);
          setShowEditModal(true);
        }}
      />
    </div>
  );
};

export default CustomersPage;