/**
 * PAGE EXEMPLE - GESTION DES COMPTES BANCAIRES
 *
 * Cette page démontre l'utilisation complète des hooks React Query
 * pour la gestion des comptes bancaires
 */

import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  CreditCard,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
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
} from '../../components/ui';

// ✅ Import des hooks depuis notre nouvelle architecture
import {
  useBankAccounts,
  useActiveBankAccounts,
  useCreateBankAccount,
  useUpdateBankAccount,
  useDeleteBankAccount,
  useBankAccountBalance,
} from '../../hooks';

import { formatCurrency } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import type { BankAccount } from '../../types/api.types';

const BankAccountsExamplePage: React.FC = () => {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  /**
   * ========================================
   * QUERIES - FETCHING DATA
   * ========================================
   */

  // Liste paginée des comptes bancaires avec filtres
  const {
    data: accountsData,
    isLoading: isLoadingAccounts,
    isError: isErrorAccounts,
    error: accountsError,
  } = useBankAccounts({
    page,
    page_size: 20,
    search: search || undefined,
  });

  // Liste des comptes actifs (pour dropdown, etc.)
  const { data: activeAccounts } = useActiveBankAccounts();

  // Solde d'un compte spécifique (si un compte est sélectionné)
  const { data: accountBalance } = useBankAccountBalance(
    selectedAccountId || '',
    new Date().toISOString().split('T')[0]
  );

  /**
   * ========================================
   * MUTATIONS - MODIFYING DATA
   * ========================================
   */

  // Création d'un compte
  const createAccount = useCreateBankAccount();

  // Modification d'un compte
  const updateAccount = useUpdateBankAccount();

  // Suppression d'un compte
  const deleteAccount = useDeleteBankAccount();

  /**
   * ========================================
   * HANDLERS
   * ========================================
   */

  const handleCreateAccount = async (formData: Partial<BankAccount>) => {
    try {
      await createAccount.mutateAsync(formData);
      setShowCreateModal(false);
      // ✅ Le cache est automatiquement invalidé par le hook !
      // ✅ Toast de succès automatique via le service !
    } catch (error) {
      // ✅ Toast d'erreur automatique via le service !
      console.error('Erreur création:', error);
    }
  };

  const handleUpdateAccount = async (id: string, data: Partial<BankAccount>) => {
    try {
      await updateAccount.mutateAsync({ id, data });
      setEditingAccount(null);
      // ✅ Cache invalidé automatiquement !
    } catch (error) {
      console.error('Erreur mise à jour:', error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) return;

    try {
      await deleteAccount.mutateAsync(id);
      // ✅ Cache invalidé automatiquement !
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const handleViewDetails = (account: BankAccount) => {
    setSelectedAccountId(account.id);
    // Le hook useBank AccountBalance se rafraîchit automatiquement
  };

  /**
   * ========================================
   * RENDER
   * ========================================
   */

  // Affichage du loading
  if (isLoadingAccounts) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size="lg" text="Chargement des comptes bancaires..." />
      </div>
    );
  }

  // Affichage des erreurs
  if (isErrorAccounts) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <div>
                <p className="font-semibold">Erreur de chargement</p>
                <p className="text-sm text-gray-600">
                  {accountsError instanceof Error ? accountsError.message : 'Erreur inconnue'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <CreditCard className="mr-3 h-7 w-7" />
              Comptes Bancaires (Exemple)
            </h1>
            <p className="mt-2 text-gray-600">
              Page d'exemple montrant l'utilisation des hooks React Query
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => alert('Fonction export à implémenter')}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setShowCreateModal(true)}
              disabled={createAccount.isPending}
            >
              <Plus className="mr-2 h-4 w-4" />
              {createAccount.isPending ? 'Création...' : 'Nouveau Compte'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comptes</p>
                <p className="text-lg font-bold text-gray-900">{accountsData?.count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Comptes Actifs</p>
                <p className="text-lg font-bold text-gray-900">
                  {activeAccounts?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder="Rechercher un compte bancaire..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to page 1 on search
                }}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Liste des Comptes</span>
            <Badge variant="outline">{accountsData?.count || 0} compte(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>{t('accounting.label')}</TableHead>
                  <TableHead>Banque</TableHead>
                  <TableHead>{t('accounting.balance')}</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsData?.results?.map((account) => (
                  <TableRow key={account.id} className="hover:bg-gray-50">
                    <TableCell>
                      <span className="font-mono font-semibold">{account.numero_compte}</span>
                    </TableCell>
                    <TableCell>{account.libelle}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Building className="h-4 w-4 text-gray-700" />
                        <span>{account.banque}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(account.solde_actuel, account.devise)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          account.actif
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {account.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(account)}
                          aria-label="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingAccount(account)}
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
                          disabled={deleteAccount.isPending}
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
          {accountsData && accountsData.count > 20 && (
            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(accountsData.count / 20)}
                onPageChange={setPage}
              />
            </div>
          )}

          {/* Empty State */}
          {(!accountsData?.results || accountsData.results.length === 0) && (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun compte bancaire trouvé
              </h3>
              <p className="text-gray-700 mb-6">
                {search
                  ? 'Aucun compte ne correspond à votre recherche.'
                  : 'Commencez par créer votre premier compte bancaire.'}
              </p>
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Créer un compte
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Account Balance (if any) */}
      {selectedAccountId && accountBalance && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Solde du compte sélectionné</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(accountBalance.solde)}
                </p>
                <p className="text-xs text-gray-700">Au {accountBalance.date}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAccountId(null)}
              >
                Fermer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Indicators for Mutations */}
      <div className="fixed bottom-4 right-4 space-y-2">
        {createAccount.isPending && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-blue-700">Création en cours...</span>
              </div>
            </CardContent>
          </Card>
        )}
        {updateAccount.isPending && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-blue-700">Mise à jour en cours...</span>
              </div>
            </CardContent>
          </Card>
        )}
        {deleteAccount.isPending && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-red-700">Suppression en cours...</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BankAccountsExamplePage;