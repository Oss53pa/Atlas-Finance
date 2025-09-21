import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreditCard,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Building,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Download,
  Upload,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft
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
import { treasuryService } from '../../services/treasury.service';
import { formatCurrency, formatDate } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface BankAccountsFilters {
  search: string;
  banque: string;
  type_compte: string;
  statut: string;
  devise: string;
}

const BankAccountsPage: React.FC = () => {
  const [filters, setFilters] = useState<BankAccountsFilters>({
    search: '',
    banque: '',
    type_compte: '',
    statut: '',
    devise: ''
  });
  const [page, setPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch bank accounts
  const { data: accountsData, isLoading } = useQuery({
    queryKey: ['bank-accounts', 'list', page, filters],
    queryFn: () => treasuryService.getBankAccounts({ 
      page, 
      search: filters.search,
      banque: filters.banque,
      type_compte: filters.type_compte,
      statut: filters.statut,
      devise: filters.devise
    }),
  });

  // Delete bank account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: treasuryService.deleteBankAccount,
    onSuccess: () => {
      toast.success('Compte bancaire supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    }
  });

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce compte bancaire ?')) {
      deleteAccountMutation.mutate(accountId);
    }
  };

  const handleFilterChange = (key: keyof BankAccountsFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      banque: '',
      type_compte: '',
      statut: '',
      devise: ''
    });
    setPage(1);
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif': return 'bg-green-100 text-green-800';
      case 'inactif': return 'bg-gray-100 text-gray-800';
      case 'ferme': return 'bg-red-100 text-red-800';
      case 'bloque': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      case 'ferme': return 'Fermé';
      case 'bloque': return 'Bloqué';
      default: return statut;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'courant': return 'bg-[#6A8A82]/10 text-[#6A8A82]';
      case 'epargne': return 'bg-green-100 text-green-800';
      case 'terme': return 'bg-[#B87333]/10 text-[#B87333]';
      case 'credit': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'courant': return 'Courant';
      case 'epargne': return 'Épargne';
      case 'terme': return 'À terme';
      case 'credit': return 'Crédit';
      default: return type;
    }
  };

  const getBalanceColor = (solde: number) => {
    if (solde > 0) return 'text-green-700';
    if (solde < 0) return 'text-red-700';
    return 'text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-tuatara flex items-center">
              <CreditCard className="mr-3 h-7 w-7" />
              Comptes Bancaires
            </h1>
            <p className="mt-2 text-rolling-stone">
              Gestion des comptes bancaires et de trésorerie
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
              Nouveau Compte
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#6A8A82]/10 rounded-full">
                <CreditCard className="h-6 w-6 text-[#6A8A82]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comptes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {accountsData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Solde Total</p>
                <p className={`text-2xl font-bold ${getBalanceColor(accountsData?.total_balance || 0)}`}>
                  {formatCurrency(accountsData?.total_balance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#B87333]/10 rounded-full">
                <Banknote className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Disponible</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(accountsData?.available_balance || 0)}
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
                <p className="text-sm font-medium text-gray-600">Découverts</p>
                <p className="text-2xl font-bold text-red-700">
                  {formatCurrency(Math.abs(accountsData?.overdraft_total || 0))}
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
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un compte..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Banque"
                value={filters.banque}
                onChange={(e) => handleFilterChange('banque', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.type_compte} onValueChange={(value) => handleFilterChange('type_compte', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les types</SelectItem>
                <SelectItem value="courant">Compte courant</SelectItem>
                <SelectItem value="epargne">Compte d'épargne</SelectItem>
                <SelectItem value="terme">Compte à terme</SelectItem>
                <SelectItem value="credit">Ligne de crédit</SelectItem>
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
                <SelectItem value="ferme">Fermé</SelectItem>
                <SelectItem value="bloque">Bloqué</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.devise} onValueChange={(value) => handleFilterChange('devise', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les devises" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes les devises</SelectItem>
                <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                <SelectItem value="EUR">EUR (Euro)</SelectItem>
                <SelectItem value="USD">USD (Dollar)</SelectItem>
                <SelectItem value="GBP">GBP (Livre Sterling)</SelectItem>
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

      {/* Bank Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Comptes Bancaires</span>
            {accountsData && (
              <Badge variant="outline">
                {accountsData.count} compte(s)
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text="Chargement des comptes..." />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compte</TableHead>
                      <TableHead>Banque</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Titulaire</TableHead>
                      <TableHead>Devise</TableHead>
                      <TableHead>Solde Comptable</TableHead>
                      <TableHead>Solde Banque</TableHead>
                      <TableHead>Différence</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsData?.results?.map((account) => (
                      <TableRow key={account.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-mono font-semibold text-tuatara">
                              {account.numero_compte}
                            </p>
                            <p className="text-sm text-rolling-stone">
                              {account.libelle_compte}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{account.nom_banque}</p>
                              {account.code_banque && (
                                <p className="text-sm text-gray-500">{account.code_banque}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAccountTypeColor(account.type_compte)}>
                            {getAccountTypeLabel(account.type_compte)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{account.titulaire}</p>
                          {account.co_titulaire && (
                            <p className="text-sm text-gray-500">+ {account.co_titulaire}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {account.devise}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getBalanceColor(account.solde_comptable)}`}>
                            {formatCurrency(account.solde_comptable, account.devise)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getBalanceColor(account.solde_banque)}`}>
                            {formatCurrency(account.solde_banque, account.devise)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {Math.abs(account.solde_comptable - account.solde_banque) > 0.01 ? (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="font-semibold text-red-700">
                                {formatCurrency(Math.abs(account.solde_comptable - account.solde_banque), account.devise)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-green-700 text-sm">OK</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(account.statut)}>
                            {getStatusLabel(account.statut)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAccount(account)}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Mouvements"
                            >
                              <ArrowUpRight className="h-4 w-4" />
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
                              onClick={() => handleDeleteAccount(account.id)}
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
              {accountsData && accountsData.count > 0 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={page}
                    totalPages={Math.ceil(accountsData.count / 20)}
                    onPageChange={setPage}
                  />
                </div>
              )}

              {(!accountsData?.results || accountsData.results.length === 0) && (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun compte bancaire trouvé</h3>
                  <p className="text-gray-500 mb-6">
                    {filters.search || filters.banque || filters.type_compte || filters.statut || filters.devise
                      ? 'Aucun compte ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier compte bancaire.'}
                  </p>
                  <Button 
                    className="bg-tuatara hover:bg-rolling-stone text-swirl"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer un compte
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

export default BankAccountsPage;