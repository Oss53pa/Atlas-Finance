import React, { useState, useRef, useCallback } from 'react';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
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
import { useBankAccounts, useCreateBankAccount, useUpdateBankAccount, useDeleteBankAccount } from '../../hooks';
import type { BankAccount } from '../../services/treasury-complete.service';
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  // Confirmation modale de suppression (remplace window.confirm bloquant)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmLabel, setDeleteConfirmLabel] = useState<string>('');
  const [editForm, setEditForm] = useState({
    label: '', iban: '', account_type: 'courant', status: 'actif', titulaire: '',
  });
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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [newAccount, setNewAccount] = useState({
    numeroCompte: '', iban: '', libelle: '',
    banque: '', codeBanque: '', codeGuichet: '', swift: '', agence: '',
    typeCompte: 'courant', devise: 'XAF', statut: 'actif',
    titulaire: '', soldeInitial: 0, dateOuverture: new Date().toISOString().split('T')[0],
    chargeCompte: '', telephoneBanque: '', emailBanque: '', notes: '',
  });
  const resetNewAccount = () => {
    setNewAccount({
      numeroCompte: '', iban: '', libelle: '',
      banque: '', codeBanque: '', codeGuichet: '', swift: '', agence: '',
      typeCompte: 'courant', devise: 'XAF', statut: 'actif',
      titulaire: '', soldeInitial: 0, dateOuverture: new Date().toISOString().split('T')[0],
      chargeCompte: '', telephoneBanque: '', emailBanque: '', notes: '',
    });
    setFormStep(1);
  };

  // Hooks mutations
  const createAccount = useCreateBankAccount();
  const updateAccount = useUpdateBankAccount();

  // Utilisation des nouveaux hooks
  const { data: accountsData, isLoading } = useBankAccounts({
    page,
    page_size: 20,
    search: filters.search || undefined,
    banque: filters.banque || undefined,
    type_compte: filters.type_compte || undefined,
    statut: filters.statut || undefined,
    devise: filters.devise || undefined,
  });

  const deleteAccount = useDeleteBankAccount();

  const handleDeleteAccount = useCallback((accountId: string, label: string) => {
    setDeleteConfirmId(accountId);
    setDeleteConfirmLabel(label);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteConfirmId) return;
    deleteAccount.mutate(deleteConfirmId, {
      onSuccess: () => {
        toast.success(t('bankAccounts.deleteSuccess'));
        setDeleteConfirmId(null);
      },
      onError: (error) => {
        console.error('[BankAccountsPage] Erreur suppression compte:', error);
        toast.error(t('bankAccounts.deleteError'));
        setDeleteConfirmId(null);
      },
    });
  }, [deleteConfirmId, deleteAccount, t]);

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
      case 'actif': return t('bankAccounts.statusActive');
      case 'inactif': return t('bankAccounts.statusInactive');
      case 'ferme': return t('bankAccounts.statusClosed');
      case 'bloque': return t('bankAccounts.statusBlocked');
      default: return statut;
    }
  };

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case 'courant': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]';
      case 'epargne': return 'bg-green-100 text-green-800';
      case 'terme': return 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]';
      case 'credit': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'courant': return t('bankAccounts.typeCurrent');
      case 'epargne': return t('bankAccounts.typeSavings');
      case 'terme': return t('bankAccounts.typeTerm');
      case 'credit': return t('bankAccounts.typeCredit');
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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <CreditCard className="mr-3 h-7 w-7" />
              {t('bankAccounts.title')}
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              {t('bankAccounts.subtitle')}
            </p>
          </div>
          <div className="flex space-x-3">
            <PageHeaderActions />
            <Button variant="outline" onClick={() => {
              const csvContent = accountsData?.results?.map(acc =>
                `${acc.account_number ?? (acc as any).numero_compte ?? ''};${acc.bank?.name ?? (acc as any).nom_banque ?? ''};${acc.account_type ?? (acc as any).type_compte ?? ''};${acc.currency ?? (acc as any).devise ?? ''};${acc.current_balance ?? (acc as any).solde_comptable ?? 0}`
              ).join('\n') || '';
              const blob = new Blob([`${t('bankAccounts.csvHeader')}\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `comptes_bancaires_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              toast.success(t('bankAccounts.exportSuccess'));
            }}>
              <Download className="mr-2 h-4 w-4" />
              {t('bankAccounts.export')}
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('bankAccounts.import')}
            </Button>
            <Button 
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('bankAccounts.newAccount')}
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
                <CreditCard className="h-6 w-6 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{t('bankAccounts.totalAccounts')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {accountsData?.count || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {(() => {
          const accounts = accountsData?.results ?? [];
          const totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance ?? (acc as any).solde_comptable ?? 0), 0);
          const availableBalance = accounts
            .filter(acc => (acc.current_balance ?? (acc as any).solde_comptable ?? 0) > 0)
            .reduce((sum, acc) => sum + (acc.current_balance ?? (acc as any).solde_comptable ?? 0), 0);
          const overdraftTotal = accounts
            .filter(acc => (acc.current_balance ?? (acc as any).solde_comptable ?? 0) < 0)
            .reduce((sum, acc) => sum + (acc.current_balance ?? (acc as any).solde_comptable ?? 0), 0);
          return (
            <>
              <Card>
                <CardContent className="flex items-center p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('bankAccounts.totalBalance')}</p>
                      <p className={`text-lg font-bold ${getBalanceColor(totalBalance)}`}>
                        {formatCurrency(totalBalance)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-[var(--color-text-secondary)]/10 rounded-full">
                      <Banknote className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">{t('bankAccounts.available')}</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(availableBalance)}
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
                      <p className="text-sm font-medium text-gray-600">{t('bankAccounts.overdrafts')}</p>
                      <p className="text-lg font-bold text-red-700">
                        {formatCurrency(Math.abs(overdraftTotal))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          );
        })()}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            {t('bankAccounts.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder={t('bankAccounts.searchPlaceholder')}
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder={t('bankAccounts.bank')}
                value={filters.banque}
                onChange={(e) => handleFilterChange('banque', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.type_compte} onValueChange={(value) => handleFilterChange('type_compte', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('bankAccounts.allTypes')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('bankAccounts.allTypes')}</SelectItem>
                <SelectItem value="courant">{t('bankAccounts.typeCurrentAccount')}</SelectItem>
                <SelectItem value="epargne">{t('bankAccounts.typeSavingsAccount')}</SelectItem>
                <SelectItem value="terme">{t('bankAccounts.typeTermAccount')}</SelectItem>
                <SelectItem value="credit">{t('bankAccounts.typeCreditLine')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.statut} onValueChange={(value) => handleFilterChange('statut', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('bankAccounts.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('bankAccounts.allStatuses')}</SelectItem>
                <SelectItem value="actif">{t('bankAccounts.statusActive')}</SelectItem>
                <SelectItem value="inactif">{t('bankAccounts.statusInactive')}</SelectItem>
                <SelectItem value="ferme">{t('bankAccounts.statusClosed')}</SelectItem>
                <SelectItem value="bloque">{t('bankAccounts.statusBlocked')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.devise} onValueChange={(value) => handleFilterChange('devise', value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('bankAccounts.allCurrencies')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('bankAccounts.allCurrencies')}</SelectItem>
                <SelectItem value="XAF">{t('bankAccounts.currencyXaf')}</SelectItem>
                <SelectItem value="XOF">{t('bankAccounts.currencyXof')}</SelectItem>
                <SelectItem value="EUR">{t('bankAccounts.currencyEur')}</SelectItem>
                <SelectItem value="USD">{t('bankAccounts.currencyUsd')}</SelectItem>
                <SelectItem value="GBP">{t('bankAccounts.currencyGbp')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={resetFilters}>
              {t('bankAccounts.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bank Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('bankAccounts.listTitle')}</span>
            {accountsData && (
              <Badge variant="outline">
                {t('bankAccounts.accountsCount', { count: String(accountsData.count) })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" text={t('bankAccounts.loadingAccounts')} />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accounting.account')}</TableHead>
                      <TableHead>{t('bankAccounts.bank')}</TableHead>
                      <TableHead>{t('bankAccounts.colType')}</TableHead>
                      <TableHead>{t('bankAccounts.colHolder')}</TableHead>
                      <TableHead>{t('bankAccounts.colCurrency')}</TableHead>
                      <TableHead>{t('bankAccounts.colBookBalance')}</TableHead>
                      <TableHead>{t('bankAccounts.colBankBalance')}</TableHead>
                      <TableHead>{t('bankAccounts.colDifference')}</TableHead>
                      <TableHead>{t('bankAccounts.colStatus')}</TableHead>
                      <TableHead className="text-right">{t('bankAccounts.colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accountsData?.results?.map((account) => {
                      // Map service fields (BankAccount type) to display values
                      const displayLabel = account.label ?? (account as any).libelle_compte ?? '';
                      const displayAccountNumber = account.account_number ?? (account as any).numero_compte ?? '';
                      const displayBankName = account.bank?.name ?? (account as any).nom_banque ?? '';
                      const displayBankCode = account.bank?.code ?? (account as any).code_banque ?? '';
                      const displayType = account.account_type ?? (account as any).type_compte ?? '';
                      const displayStatus = account.status ?? (account as any).statut ?? '';
                      const displayCurrency = account.currency ?? (account as any).devise ?? 'XAF';
                      const displayCurrentBalance = account.current_balance ?? (account as any).solde_comptable ?? 0;
                      // Priorité : solde_banque (relevé réel) > bank_balance > initial_balance (ouverture uniquement)
                      const hasBankBalance = (account as any).solde_banque != null || (account as any).bank_balance != null;
                      const displayBankBalance = (account as any).bank_balance ?? (account as any).solde_banque ?? account.initial_balance ?? 0;
                      const diff = Math.abs(displayCurrentBalance - displayBankBalance);
                      return (
                      <TableRow key={account.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-mono font-semibold text-[var(--color-text-primary)]">
                              {displayAccountNumber}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {displayLabel}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-700" />
                            <div>
                              <p className="font-medium">{displayBankName}</p>
                              {displayBankCode && (
                                <p className="text-sm text-gray-700">{displayBankCode}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAccountTypeColor(displayType)}>
                            {getAccountTypeLabel(displayType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{(account as any).titulaire ?? ''}</p>
                          {(account as any).co_titulaire && (
                            <p className="text-sm text-gray-700">+ {(account as any).co_titulaire}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {displayCurrency}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getBalanceColor(displayCurrentBalance)}`}>
                            {formatCurrency(displayCurrentBalance, displayCurrency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getBalanceColor(displayBankBalance)}`}>
                            {formatCurrency(displayBankBalance, displayCurrency)}
                          </span>
                          {!hasBankBalance && (
                            <p className="text-xs text-amber-600 mt-0.5">{t('bankAccounts.openingBalanceHint')}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {diff > 0.01 ? (
                            <div className="flex items-center space-x-1">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="font-semibold text-red-700">
                                {formatCurrency(diff, displayCurrency)}
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
                          <Badge className={getStatusColor(displayStatus)}>
                            {getStatusLabel(displayStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedAccount(account);
                                setShowViewModal(true);
                              }}
                              aria-label={t('bankAccounts.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t('bankAccounts.movements')}
                              onClick={() => {
                                navigate(`/treasury/movements?account=${account.id}`);
                              }}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={t('bankAccounts.edit')}
                              onClick={() => {
                                setSelectedAccount(account);
                                setEditForm({
                                  label: account.label ?? (account as any).libelle_compte ?? '',
                                  iban: (account as any).iban ?? '',
                                  account_type: account.account_type ?? (account as any).type_compte ?? 'courant',
                                  status: account.status ?? (account as any).statut ?? 'actif',
                                  titulaire: (account as any).titulaire ?? '',
                                });
                                setShowEditModal(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAccount(
                                account.id,
                                account.label ?? (account as any).libelle_compte ?? account.account_number ?? ''
                              )}
                              className="text-red-600 hover:text-red-700"
                              aria-label={t('bankAccounts.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
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
                  <CreditCard className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('bankAccounts.emptyTitle')}</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.banque || filters.type_compte || filters.statut || filters.devise
                      ? t('bankAccounts.emptyFiltered')
                      : t('bankAccounts.emptyNoData')}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t('bankAccounts.createAccount')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal - Créer Compte Bancaire (Multi-étapes) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t('bankAccounts.createModalTitle')}</h2>
                  <p className="text-sm text-gray-500">{t('bankAccounts.stepOfFour', { step: String(formStep) })}</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); resetNewAccount(); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[var(--color-primary)]' : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-gray-500">
                <span className="flex-1">{t('bankAccounts.stepAccount')}</span>
                <span className="flex-1">{t('bankAccounts.stepBank')}</span>
                <span className="flex-1">{t('bankAccounts.stepSettings')}</span>
                <span className="flex-1">{t('bankAccounts.stepContactValidation')}</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Étape 1: Informations du compte */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center"><CreditCard className="w-5 h-5 mr-2" />{t('bankAccounts.accountInfo')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.accountNumberRequired')}</label>
                      <input type="text" value={newAccount.numeroCompte} onChange={(e) => setNewAccount({ ...newAccount, numeroCompte: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('bankAccounts.accountNumberPlaceholder')} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                      <input type="text" value={newAccount.iban} onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.accountLabelRequired')}</label>
                    <input type="text" value={newAccount.libelle} onChange={(e) => setNewAccount({ ...newAccount, libelle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('bankAccounts.accountLabelPlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.holderRequired')}</label>
                    <input type="text" value={newAccount.titulaire} onChange={(e) => setNewAccount({ ...newAccount, titulaire: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('bankAccounts.holderPlaceholder')} />
                  </div>
                </div>
              )}

              {/* Étape 2: Banque */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center"><Building className="w-5 h-5 mr-2" />{t('bankAccounts.stepBank')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.bankNameRequired')}</label>
                      <select value={newAccount.banque} onChange={(e) => setNewAccount({ ...newAccount, banque: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                        <option value="">{t('bankAccounts.selectPlaceholder')}</option>
                        <option value="SGBC">Société Générale Cameroun</option>
                        <option value="Afriland">Afriland First Bank</option>
                        <option value="Ecobank">Ecobank</option>
                        <option value="UBA">United Bank for Africa</option>
                        <option value="BICEC">BICEC</option>
                        <option value="CBC">Commercial Bank Cameroun</option>
                        <option value="SCB">SCB Cameroun</option>
                        <option value="BOA">Bank of Africa</option>
                        <option value="Autre">{t('bankAccounts.otherBank')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.bankCode')}</label>
                      <input type="text" value={newAccount.codeBanque} onChange={(e) => setNewAccount({ ...newAccount, codeBanque: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="Ex: 10005" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.branchCode')}</label>
                      <input type="text" value={newAccount.codeGuichet} onChange={(e) => setNewAccount({ ...newAccount, codeGuichet: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="Ex: 00100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.swiftCode')}</label>
                      <input type="text" value={newAccount.swift} onChange={(e) => setNewAccount({ ...newAccount, swift: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)] font-mono" placeholder="Ex: SGCMCMCX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.branch')}</label>
                    <input type="text" value={newAccount.agence} onChange={(e) => setNewAccount({ ...newAccount, agence: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="Ex: Akwa, Douala" />
                  </div>
                </div>
              )}

              {/* Étape 3: Paramètres */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center"><DollarSign className="w-5 h-5 mr-2" />{t('bankAccounts.accountSettings')}</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.accountTypeRequired')}</label>
                      <select value={newAccount.typeCompte} onChange={(e) => setNewAccount({ ...newAccount, typeCompte: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                        <option value="courant">{t('bankAccounts.typeCurrent')}</option>
                        <option value="epargne">{t('bankAccounts.typeSavings')}</option>
                        <option value="depot">{t('bankAccounts.typeTermDeposit')}</option>
                        <option value="credit">{t('bankAccounts.typeCredit')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.currencyRequired')}</label>
                      <select value={newAccount.devise} onChange={(e) => setNewAccount({ ...newAccount, devise: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                        <option value="XAF">{t('bankAccounts.currencyXaf')}</option>
                        <option value="EUR">{t('bankAccounts.currencyEur')}</option>
                        <option value="USD">{t('bankAccounts.currencyUsd')}</option>
                        <option value="GBP">{t('bankAccounts.currencyGbp')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.statusRequired')}</label>
                      <select value={newAccount.statut} onChange={(e) => setNewAccount({ ...newAccount, statut: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]">
                        <option value="actif">{t('bankAccounts.statusActive')}</option>
                        <option value="inactif">{t('bankAccounts.statusInactive')}</option>
                        <option value="ferme">{t('bankAccounts.statusClosed')}</option>
                        <option value="bloque">{t('bankAccounts.statusBlocked')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.initialBalance')}</label>
                      <input type="number" value={newAccount.soldeInitial} onChange={(e) => setNewAccount({ ...newAccount, soldeInitial: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.openingDate')}</label>
                      <input type="date" value={newAccount.dateOuverture} onChange={(e) => setNewAccount({ ...newAccount, dateOuverture: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 4: Contact & Validation */}
              {formStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center"><Building className="w-5 h-5 mr-2" />{t('bankAccounts.bankContact')}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.accountManager')}</label>
                        <input type="text" value={newAccount.chargeCompte} onChange={(e) => setNewAccount({ ...newAccount, chargeCompte: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('bankAccounts.accountManagerPlaceholder')} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.phone')}</label>
                        <input type="tel" value={newAccount.telephoneBanque} onChange={(e) => setNewAccount({ ...newAccount, telephoneBanque: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="+237 6XX XXX XXX" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.email')}</label>
                      <input type="email" value={newAccount.emailBanque} onChange={(e) => setNewAccount({ ...newAccount, emailBanque: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="conseiller@banque.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('bankAccounts.notes')}</label>
                      <textarea rows={2} value={newAccount.notes} onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[var(--color-primary)]" placeholder={t('bankAccounts.notesPlaceholder')} />
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('bankAccounts.summary')}</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">{t('bankAccounts.summaryAccountNumber')}</span> <span className="ml-2 font-mono font-medium">{newAccount.numeroCompte || '-'}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryLabel')}</span> <span className="ml-2 font-medium">{newAccount.libelle || '-'}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryBank')}</span> <span className="ml-2 font-medium">{newAccount.banque || '-'}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryIban')}</span> <span className="ml-2 font-mono">{newAccount.iban || '-'}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryType')}</span> <span className="ml-2">{newAccount.typeCompte}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryCurrency')}</span> <span className="ml-2">{newAccount.devise}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryInitialBalance')}</span> <span className="ml-2 font-medium">{formatCurrency(newAccount.soldeInitial)}</span></div>
                      <div><span className="text-gray-500">{t('bankAccounts.summaryHolder')}</span> <span className="ml-2">{newAccount.titulaire || '-'}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => formStep > 1 ? setFormStep(formStep - 1) : (setShowCreateModal(false), resetNewAccount())}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                {formStep > 1 ? t('bankAccounts.previous') : t('bankAccounts.cancel')}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button onClick={() => {
                    // Valider les champs obligatoires de l'étape 1 avant d'avancer
                    if (formStep === 1) {
                      if (!newAccount.numeroCompte.trim()) {
                        toast.error(t('bankAccounts.errAccountNumberRequired'));
                        return;
                      }
                      if (!newAccount.libelle.trim()) {
                        toast.error(t('bankAccounts.errLabelRequired'));
                        return;
                      }
                      if (!newAccount.titulaire.trim()) {
                        toast.error(t('bankAccounts.errHolderRequired'));
                        return;
                      }
                    }
                    setFormStep(formStep + 1);
                  }}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90">{t('bankAccounts.next')}</button>
                ) : (
                  <button
                    onClick={() => {
                      if (!newAccount.numeroCompte || !newAccount.libelle) {
                        toast.error(t('bankAccounts.errNumberAndLabel'));
                        return;
                      }
                      createAccount.mutate(
                        {
                          account_number: newAccount.numeroCompte,
                          iban: newAccount.iban || undefined,
                          label: newAccount.libelle,
                          account_type: newAccount.typeCompte,
                          currency: newAccount.devise,
                          status: newAccount.statut,
                          initial_balance: newAccount.soldeInitial,
                          opening_date: newAccount.dateOuverture,
                        } as Partial<BankAccount>,
                        {
                          onSuccess: () => {
                            toast.success(t('bankAccounts.createSuccess'));
                            setShowCreateModal(false);
                            resetNewAccount();
                          },
                          onError: () => {
                            toast.error(t('bankAccounts.createError'));
                          },
                        }
                      );
                    }}
                    disabled={createAccount.isPending}
                    className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary)]/90 font-semibold disabled:opacity-60"
                  >
                    {createAccount.isPending ? t('bankAccounts.creating') : t('bankAccounts.createTheAccount')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Vue Détails Compte (Standards Internationaux) */}
      {showViewModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-text-secondary)]/10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[var(--color-primary)] rounded-lg flex items-center justify-center text-white">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedAccount.label ?? selectedAccount.libelle_compte}</h2>
                  <p className="text-sm text-gray-600 font-mono">{selectedAccount.account_number ?? selectedAccount.numero_compte}</p>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Section Identification Internationale */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('bankAccounts.internationalId')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-blue-700">IBAN (International Bank Account Number)</p>
                    <p className="text-base font-mono font-semibold text-blue-900">
                      {selectedAccount.iban || t('bankAccounts.notProvided')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700">BIC/SWIFT (Bank Identifier Code)</p>
                    <p className="text-base font-mono font-semibold text-blue-900">
                      {selectedAccount.bic_swift || selectedAccount.code_swift || t('bankAccounts.notProvided')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section Informations Bancaires */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{t('bankAccounts.bankInstitution')}</h3>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.bankNameLabel')}</p>
                    <p className="text-sm font-semibold">{selectedAccount.bank?.name ?? selectedAccount.nom_banque}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.bankCodeLabel')}</p>
                    <p className="text-sm font-mono">{selectedAccount.bank?.code ?? selectedAccount.code_banque ?? '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.branchCodeLabel')}</p>
                    <p className="text-sm font-mono">{selectedAccount.code_guichet || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.domiciliation')}</p>
                    <p className="text-sm">{selectedAccount.domiciliation || selectedAccount.agence || t('bankAccounts.notProvided')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{t('bankAccounts.accountFeatures')}</h3>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.accountTypeLabel')}</p>
                    <Badge className={getAccountTypeColor(selectedAccount.account_type ?? selectedAccount.type_compte)}>
                      {getAccountTypeLabel(selectedAccount.account_type ?? selectedAccount.type_compte)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.currencyIso')}</p>
                    <p className="text-sm font-semibold">{selectedAccount.currency ?? selectedAccount.devise}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.statusLabel')}</p>
                    <Badge className={getStatusColor(selectedAccount.status ?? selectedAccount.statut)}>
                      {getStatusLabel(selectedAccount.status ?? selectedAccount.statut)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.ribKeyLabel')}</p>
                    <p className="text-sm font-mono">{selectedAccount.cle_rib || '-'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{t('bankAccounts.holders')}</h3>
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.mainHolder')}</p>
                    <p className="text-sm font-semibold">{selectedAccount.titulaire}</p>
                  </div>
                  {selectedAccount.co_titulaire && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">{t('bankAccounts.coHolder')}</p>
                      <p className="text-sm">{selectedAccount.co_titulaire}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.openingDate')}</p>
                    <p className="text-sm">{(selectedAccount.opening_date ?? selectedAccount.date_ouverture) ? formatDate(selectedAccount.opening_date ?? selectedAccount.date_ouverture) : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Section Soldes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('bankAccounts.financialPosition')}</h3>
                {(() => {
                  const viewCurrency = selectedAccount.currency ?? selectedAccount.devise ?? 'XAF';
                  const viewCurrentBalance = selectedAccount.current_balance ?? selectedAccount.solde_comptable ?? 0;
                  const viewBankBalance = selectedAccount.initial_balance ?? selectedAccount.solde_banque ?? 0;
                  const viewDiff = Math.abs(viewCurrentBalance - viewBankBalance);
                  return (
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.colBookBalance')}</p>
                    <p className={`text-lg font-bold ${getBalanceColor(viewCurrentBalance)}`}>
                      {formatCurrency(viewCurrentBalance, viewCurrency)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.colBankBalance')}</p>
                    <p className={`text-lg font-bold ${getBalanceColor(viewBankBalance)}`}>
                      {formatCurrency(viewBankBalance, viewCurrency)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.reconciliationGap')}</p>
                    <div className={`flex items-center ${viewDiff > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {viewDiff > 0.01 ? (
                        <AlertCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      <span className="text-lg font-bold">
                        {formatCurrency(viewDiff, viewCurrency)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">{t('bankAccounts.authorizedLimit')}</p>
                    <p className="text-lg font-bold text-gray-700">
                      {selectedAccount.overdraft_limit ? formatCurrency(selectedAccount.overdraft_limit, viewCurrency) : t('bankAccounts.unlimited')}
                    </p>
                  </div>
                </div>
                  );
                })()}
              </div>

              {/* Section RIB Complet */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('bankAccounts.fullRib')}</h3>
                <div className="flex items-center space-x-2 bg-gray-100 rounded p-3 font-mono text-sm">
                  <span>{selectedAccount.bank?.code ?? selectedAccount.code_banque ?? 'XXXXX'}</span>
                  <span className="text-gray-400">-</span>
                  <span>{selectedAccount.code_guichet ?? 'XXXXX'}</span>
                  <span className="text-gray-400">-</span>
                  <span>{selectedAccount.account_number ?? selectedAccount.numero_compte}</span>
                  <span className="text-gray-400">-</span>
                  <span>{selectedAccount.cle_rib || 'XX'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                {t('bankAccounts.lastUpdate')} {selectedAccount.updated_at ? formatDate(selectedAccount.updated_at) : 'N/A'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t('bankAccounts.close')}
                </button>
                <button
                  onClick={() => {
                    const acc = selectedAccount;
                    const bankName = acc.bank?.name ?? (acc as any).nom_banque ?? '';
                    const bankCode = acc.bank?.code ?? (acc as any).code_banque ?? '';
                    const accountNumber = acc.account_number ?? (acc as any).numero_compte ?? '';
                    const label = acc.label ?? (acc as any).libelle_compte ?? '';
                    const iban = (acc as any).iban ?? '';
                    const bic = (acc as any).bic_swift ?? (acc as any).code_swift ?? '';
                    const codeGuichet = (acc as any).code_guichet ?? '';
                    const cleRib = (acc as any).cle_rib ?? '';
                    const titulaire = (acc as any).titulaire ?? '';
                    const ribContent = `${t('bankAccounts.ribDocTitle')}\n${'='.repeat(50)}\n\n${t('bankAccounts.ribHolder')} : ${titulaire}\n${t('bankAccounts.ribLabel')} : ${label}\n\n${t('bankAccounts.ribInstitution')} : ${bankName}\n${t('bankAccounts.bankCodeLabel')} : ${bankCode}\n${t('bankAccounts.branchCode')} : ${codeGuichet}\n${t('bankAccounts.ribAccountNumber')} : ${accountNumber}\n${t('bankAccounts.ribKeyLabel')} : ${cleRib}\n\nIBAN : ${iban || t('bankAccounts.notProvided')}\nBIC  : ${bic || t('bankAccounts.notProvided')}\n\n${t('bankAccounts.ribGeneratedOn')} ${new Date().toLocaleDateString('fr-FR')}\n`;
                    const blob = new Blob([ribContent], { type: 'text/plain;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `RIB_${accountNumber || 'compte'}_${new Date().toISOString().split('T')[0]}.txt`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                    toast.success(t('bankAccounts.ribExportSuccess'));
                  }}
                  className="px-4 py-2 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  {t('bankAccounts.exportRib')}
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] transition-colors"
                >
                  {t('bankAccounts.edit')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Modifier Compte */}
      {showEditModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('bankAccounts.editModalTitle')}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!editForm.label.trim()) {
                toast.error(t('bankAccounts.errLabelRequired'));
                return;
              }
              updateAccount.mutate(
                {
                  id: selectedAccount.id,
                  data: {
                    label: editForm.label,
                    iban: editForm.iban || undefined,
                    account_type: editForm.account_type,
                    status: editForm.status,
                  } as Partial<BankAccount>,
                },
                {
                  onSuccess: () => {
                    toast.success(t('bankAccounts.updateSuccess'));
                    setShowEditModal(false);
                  },
                  onError: () => {
                    toast.error(t('bankAccounts.updateError'));
                  },
                }
              );
            }}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bankAccounts.accountNumber')}</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                      value={selectedAccount.account_number ?? (selectedAccount as any).numero_compte ?? ''}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={editForm.iban}
                      onChange={(e) => setEditForm(f => ({ ...f, iban: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('bankAccounts.accountLabelRequired')}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={editForm.label}
                    onChange={(e) => setEditForm(f => ({ ...f, label: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bankAccounts.accountType')}</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={editForm.account_type}
                      onChange={(e) => setEditForm(f => ({ ...f, account_type: e.target.value }))}
                    >
                      <option value="courant">{t('bankAccounts.typeCurrent')}</option>
                      <option value="epargne">{t('bankAccounts.typeSavings')}</option>
                      <option value="terme">{t('bankAccounts.typeTerm')}</option>
                      <option value="credit">{t('bankAccounts.typeCredit')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bankAccounts.statusLabel')}</label>
                    <select
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      value={editForm.status}
                      onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="actif">{t('bankAccounts.statusActive')}</option>
                      <option value="inactif">{t('bankAccounts.statusInactive')}</option>
                      <option value="ferme">{t('bankAccounts.statusClosed')}</option>
                      <option value="bloque">{t('bankAccounts.statusBlocked')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('bankAccounts.colHolder')}</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={editForm.titulaire}
                    onChange={(e) => setEditForm(f => ({ ...f, titulaire: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('bankAccounts.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updateAccount.isPending}
                  className="px-4 py-2 bg-[var(--color-text-secondary)] text-white rounded-lg hover:bg-[#404040] disabled:opacity-60"
                >
                  {updateAccount.isPending ? t('bankAccounts.saving') : t('bankAccounts.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Importer Relevé Bancaire */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{t('bankAccounts.importModalTitle')}</h2>
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                className="text-gray-700 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[var(--color-primary)] transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  {importFile ? importFile.name : t('bankAccounts.dropFileHere')}
                </p>
                <p className="text-sm text-gray-500 mb-4">{t('bankAccounts.orClickToSelect')}</p>
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  id="file-import-bank"
                  ref={importFileRef}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setImportFile(f);
                    if (f) toast.success(t('bankAccounts.fileSelected', { name: f.name }));
                  }}
                />
                <label
                  htmlFor="file-import-bank"
                  className="inline-block px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] cursor-pointer"
                >
                  {t('bankAccounts.selectCsvFile')}
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">{t('bankAccounts.expectedFormat')}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>{t('bankAccounts.formatSeparator')}</li>
                  <li>{t('bankAccounts.formatColumns')}</li>
                  <li>{t('bankAccounts.formatAmountRule')}</li>
                </ul>
                <p className="text-xs text-blue-600 mt-2">
                  {t('bankAccounts.apiImportNote')}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => { setShowImportModal(false); setImportFile(null); }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('bankAccounts.cancel')}
              </button>
              <button
                disabled={!importFile}
                onClick={() => {
                  if (!importFile) {
                    toast.error(t('bankAccounts.selectCsvError'));
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const text = ev.target?.result as string;
                    if (!text) { toast.error(t('bankAccounts.emptyFileError')); return; }
                    // Parse CSV: Date;Libellé;Référence;Montant
                    const lines = text.trim().split('\n').slice(1); // skip header
                    let parsed = 0;
                    const errors: string[] = [];
                    lines.forEach((line, i) => {
                      const cols = line.split(';');
                      if (cols.length < 4) return;
                      const [date, , , montantStr] = cols.map(c => c.trim().replace(/"/g, ''));
                      const montant = parseFloat(montantStr.replace(',', '.'));
                      if (!date || isNaN(montant)) { errors.push(t('bankAccounts.lineIgnored', { line: String(i + 2) })); return; }
                      parsed++;
                    });
                    if (parsed === 0) {
                      toast.error(t('bankAccounts.noValidLine', { count: String(errors.length) }));
                    } else {
                      // NOTE: Le fichier est parsé mais les mouvements ne sont pas encore persistés.
                      // Utilisez la page Rapprochement Bancaire pour importer et valider ce relevé.
                      console.info(`[BankAccountsPage] CSV parsé : ${parsed} ligne(s) valide(s). Redirection vers Rapprochement conseillée.`);
                      toast.success(
                        t('bankAccounts.linesReadNotice', { count: String(parsed) }),
                        { duration: 6000 }
                      );
                      if (errors.length) toast.error(t('bankAccounts.linesIgnored', { count: String(errors.length) }));
                      setShowImportModal(false);
                      setImportFile(null);
                    }
                  };
                  reader.onerror = () => toast.error(t('bankAccounts.fileReadError'));
                  reader.readAsText(importFile, 'utf-8');
                }}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {t('bankAccounts.import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-red-100 rounded-full flex-shrink-0">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('bankAccounts.deleteModalTitle')}</h3>
                <p className="text-sm text-gray-600">
                  {t('bankAccounts.deleteConfirmPrefix')}{' '}
                  <span className="font-semibold">{deleteConfirmLabel}</span>{' '}
                  {t('bankAccounts.deleteConfirmSuffix')}
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                {t('bankAccounts.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteAccount.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center space-x-2"
              >
                {deleteAccount.isPending ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>{t('bankAccounts.deleting')}</span></>
                ) : (
                  <><Trash2 className="h-4 w-4" /><span>{t('bankAccounts.delete')}</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountsPage;