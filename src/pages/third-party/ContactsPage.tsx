import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Contact,
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
  User,
  Calendar,
  MessageCircle,
  Download,
  Upload,
  Users
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
import { formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { CreateContactModal, EditContactModal, ContactDetailModal } from '../../features/contacts/components';

interface ContactsFilters {
  search: string;
  type_tiers: string;
  entreprise: string;
  fonction: string;
  ville: string;
}

const ContactsPage: React.FC = () => {
  const [filters, setFilters] = useState<ContactsFilters>({
    search: '',
    type_tiers: '',
    entreprise: '',
    fonction: '',
    ville: ''
  });
  const [page, setPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch contacts
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', 'list', page, filters],
    queryFn: () => thirdPartyService.getContacts({ 
      page, 
      search: filters.search,
      type_tiers: filters.type_tiers,
      entreprise: filters.entreprise,
      fonction: filters.fonction,
      ville: filters.ville
    }),
  });

  // Fetch companies for selection
  const { data: companies } = useQuery({
    queryKey: ['companies', 'list'],
    queryFn: () => thirdPartyService.getCompanies({ page: 1, limit: 1000 }),
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: thirdPartyService.deleteContact,
    onSuccess: () => {
      toast.success('Contact supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteContact = (contactId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      deleteContactMutation.mutate(contactId);
    }
  };

  const handleViewDetails = (contact: any) => {
    setSelectedContact(contact);
    setShowDetailModal(true);
  };

  const handleEditContact = (contact: any) => {
    setSelectedContact(contact);
    setShowEditModal(true);
  };

  const handleRefreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['contacts'] });
  };

  const handleFilterChange = (key: keyof ContactsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type_tiers: '',
      entreprise: '',
      fonction: '',
      ville: ''
    });
    setPage(1);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client': return 'bg-green-100 text-green-800';
      case 'fournisseur': return 'bg-blue-100 text-blue-800';
      case 'prospect': return 'bg-yellow-100 text-yellow-800';
      case 'partenaire': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'client': return 'Client';
      case 'fournisseur': return 'Fournisseur';
      case 'prospect': return 'Prospect';
      case 'partenaire': return 'Partenaire';
      default: return type;
    }
  };

  const getFunctionColor = (fonction: string) => {
    switch (fonction) {
      case 'directeur_general': return 'bg-red-100 text-red-800';
      case 'directeur_financier': return 'bg-blue-100 text-blue-800';
      case 'directeur_commercial': return 'bg-green-100 text-green-800';
      case 'comptable': return 'bg-purple-100 text-purple-800';
      case 'acheteur': return 'bg-orange-100 text-orange-800';
      case 'commercial': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFunctionLabel = (fonction: string) => {
    switch (fonction) {
      case 'directeur_general': return 'Directeur Général';
      case 'directeur_financier': return 'Directeur Financier';
      case 'directeur_commercial': return 'Directeur Commercial';
      case 'comptable': return 'Comptable';
      case 'acheteur': return 'Acheteur';
      case 'commercial': return 'Commercial';
      default: return fonction;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] flex items-center">
              <Contact className="mr-3 h-7 w-7" />
              Contacts
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Gestion des contacts clients, fournisseurs et partenaires
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
              Nouveau Contact
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
                <Contact className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Contacts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contactsData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Contacts Clients</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contactsData?.clients_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-orange-100 rounded-full">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Contacts Fournisseurs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contactsData?.suppliers_count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-100 rounded-full">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Prospects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {contactsData?.prospects_count || 0}
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
                placeholder="Rechercher un contact..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.type_tiers} onValueChange={(value) => handleFilterChange('type_tiers', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="fournisseur">Fournisseur</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="partenaire">Partenaire</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.entreprise} onValueChange={(value) => handleFilterChange('entreprise', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les entreprises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les entreprises</SelectItem>
                {companies?.results?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.denomination}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.fonction} onValueChange={(value) => handleFilterChange('fonction', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les fonctions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les fonctions</SelectItem>
                <SelectItem value="directeur_general">Directeur Général</SelectItem>
                <SelectItem value="directeur_financier">Directeur Financier</SelectItem>
                <SelectItem value="directeur_commercial">Directeur Commercial</SelectItem>
                <SelectItem value="comptable">Comptable</SelectItem>
                <SelectItem value="acheteur">Acheteur</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
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
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Contacts</span>
            {contactsData && (
              <Badge variant="outline">
                {contactsData.count} contact(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des contacts..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Fonction</TableHead>
                      <TableHead>Entreprise</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Coordonnées</TableHead>
                      <TableHead>Localisation</TableHead>
                      <TableHead>Dernier Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactsData?.results?.map((contact) => (
                      <TableRow key={contact.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <User className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-[var(--color-text-primary)]">
                                {contact.prenom} {contact.nom}
                              </p>
                              {contact.titre && (
                                <p className="text-sm text-[var(--color-text-secondary)]">{contact.titre}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getFunctionColor(contact.fonction)}>
                            {getFunctionLabel(contact.fonction)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-700" />
                            <div>
                              <p className="font-medium text-gray-900">
                                {contact.entreprise_nom}
                              </p>
                              {contact.service && (
                                <p className="text-sm text-gray-700">{contact.service}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(contact.type_tiers)}>
                            {getTypeLabel(contact.type_tiers)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {contact.telephone && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 text-gray-700 mr-1" />
                                {contact.telephone}
                              </div>
                            )}
                            {contact.telephone_mobile && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 text-gray-700 mr-1" />
                                {contact.telephone_mobile}
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center text-sm">
                                <Mail className="h-3 w-3 text-gray-700 mr-1" />
                                {contact.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <MapPin className="h-4 w-4 text-gray-700 mr-2" />
                            <div>
                              <p>{contact.ville}</p>
                              {contact.pays && (
                                <p className="text-xs text-gray-700">{contact.pays}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.dernier_contact ? (
                            <div className="flex items-center text-sm">
                              <Calendar className="h-4 w-4 text-gray-700 mr-2" />
                              <div>
                                <p className="font-medium">
                                  {formatDate(contact.dernier_contact)}
                                </p>
                                <p className="text-xs text-gray-700">
                                  {contact.type_dernier_contact}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-700 text-sm">Jamais</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(contact)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.location.href = `mailto:${contact.email}`}
                              aria-label="Contacter"
                              title="Envoyer un email"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditContact(contact)}
                              aria-label="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteContact(contact.id)}
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
              {contactsData && contactsData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(contactsData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!contactsData?.results || contactsData.results.length === 0) && (
                <div className="text-center py-12">
                  <Contact className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun contact trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.type_tiers || filters.entreprise || filters.fonction || filters.ville
                      ? 'Aucun contact ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier contact.'}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un contact
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CreateContactModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleRefreshData}
      />

      <EditContactModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        contact={selectedContact}
        onSuccess={handleRefreshData}
      />

      <ContactDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        contact={selectedContact}
        onEdit={() => {
          setShowDetailModal(false);
          setShowEditModal(true);
        }}
      />
    </div>
  );
};

export default ContactsPage;