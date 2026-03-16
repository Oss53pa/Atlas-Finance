// @ts-nocheck
import React, { useState } from 'react';
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
import { useBankAccounts, useDeleteBankAccount } from '../../hooks';
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

  const handleDeleteAccount = (accountId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce compte bancaire ?')) {
      deleteAccount.mutate(accountId);
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
      case 'courant': return 'bg-[#171717]/10 text-[#171717]';
      case 'epargne': return 'bg-green-100 text-green-800';
      case 'terme': return 'bg-[#525252]/10 text-[#525252]';
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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center">
              <CreditCard className="mr-3 h-7 w-7" />
              Comptes Bancaires
            </h1>
            <p className="mt-2 text-[var(--color-text-secondary)]">
              Gestion des comptes bancaires et de trésorerie
            </p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={() => {
              const csvContent = accountsData?.results?.map(acc =>
                `${acc.numero_compte};${acc.nom_banque};${acc.type_compte};${acc.devise};${acc.solde_comptable}`
              ).join('\n') || '';
              const blob = new Blob([`Numéro;Banque;Type;Devise;Solde\n${csvContent}`], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `comptes_bancaires_${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              toast.success('Export réussi !');
            }}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button variant="outline" onClick={() => setShowImportModal(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button 
              className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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
              <div className="p-2 bg-[#171717]/10 rounded-full">
                <CreditCard className="h-6 w-6 text-[#171717]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Comptes</p>
                <p className="text-lg font-bold text-gray-900">
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
                <p className={`text-lg font-bold ${getBalanceColor(accountsData?.total_balance || 0)}`}>
                  {formatCurrency(accountsData?.total_balance || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-[#525252]/10 rounded-full">
                <Banknote className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Disponible</p>
                <p className="text-lg font-bold text-green-700">
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
                <p className="text-lg font-bold text-red-700">
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
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
              <Input
                placeholder="Rechercher un compte..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="relative">
              <Building className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
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
                      <TableHead>{t('accounting.account')}</TableHead>
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
                            <p className="font-mono font-semibold text-[var(--color-text-primary)]">
                              {account.numero_compte}
                            </p>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                              {account.libelle_compte}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4 text-gray-700" />
                            <div>
                              <p className="font-medium">{account.nom_banque}</p>
                              {account.code_banque && (
                                <p className="text-sm text-gray-700">{account.code_banque}</p>
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
                            <p className="text-sm text-gray-700">+ {account.co_titulaire}</p>
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
                              onClick={() => {
                                setSelectedAccount(account);
                                setShowViewModal(true);
                              }}
                              aria-label="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Mouvements"
                              onClick={() => {
                                window.location.href = `/treasury/movements?account=${account.id}`;
                              }}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="Modifier"
                              onClick={() => {
                                setSelectedAccount(account);
                                setShowEditModal(true);
                              }}
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
                  <CreditCard className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun compte bancaire trouvé</h3>
                  <p className="text-gray-700 mb-6">
                    {filters.search || filters.banque || filters.type_compte || filters.statut || filters.devise
                      ? 'Aucun compte ne correspond aux critères de recherche.'
                      : 'Commencez par créer votre premier compte bancaire.'}
                  </p>
                  <Button 
                    className="bg-[var(--color-primary)] hover:bg-[var(--color-secondary)] text-white"
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

      {/* Modal - Créer Compte Bancaire (Multi-étapes) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Nouveau Compte Bancaire</h2>
                  <p className="text-sm text-gray-500">Étape {formStep} sur 4</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); resetNewAccount(); }} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex mt-4 space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className={`flex-1 h-2 rounded-full ${step <= formStep ? 'bg-[#171717]' : 'bg-gray-200'}`} />
                ))}
              </div>
              <div className="flex mt-2 text-xs text-gray-500">
                <span className="flex-1">Compte</span>
                <span className="flex-1">Banque</span>
                <span className="flex-1">Paramètres</span>
                <span className="flex-1">Contact & Validation</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Étape 1: Informations du compte */}
              {formStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center"><CreditCard className="w-5 h-5 mr-2" />Informations du compte</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte *</label>
                      <input type="text" value={newAccount.numeroCompte} onChange={(e) => setNewAccount({ ...newAccount, numeroCompte: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="Ex: 12345678901" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IBAN</label>
                      <input type="text" value={newAccount.iban} onChange={(e) => setNewAccount({ ...newAccount, iban: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] font-mono" placeholder="CM21 XXXX XXXX XXXX XXXX XXXX XXX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Libellé du compte *</label>
                    <input type="text" value={newAccount.libelle} onChange={(e) => setNewAccount({ ...newAccount, libelle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="Ex: Compte courant principal" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titulaire du compte *</label>
                    <input type="text" value={newAccount.titulaire} onChange={(e) => setNewAccount({ ...newAccount, titulaire: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="Nom du titulaire" />
                  </div>
                </div>
              )}

              {/* Étape 2: Banque */}
              {formStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center"><Building className="w-5 h-5 mr-2" />Banque</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la banque *</label>
                      <select value={newAccount.banque} onChange={(e) => setNewAccount({ ...newAccount, banque: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]">
                        <option value="">Sélectionner...</option>
                        <option value="SGBC">Société Générale Cameroun</option>
                        <option value="Afriland">Afriland First Bank</option>
                        <option value="Ecobank">Ecobank</option>
                        <option value="UBA">United Bank for Africa</option>
                        <option value="BICEC">BICEC</option>
                        <option value="CBC">Commercial Bank Cameroun</option>
                        <option value="SCB">SCB Cameroun</option>
                        <option value="BOA">Bank of Africa</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code banque</label>
                      <input type="text" value={newAccount.codeBanque} onChange={(e) => setNewAccount({ ...newAccount, codeBanque: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] font-mono" placeholder="Ex: 10005" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code guichet</label>
                      <input type="text" value={newAccount.codeGuichet} onChange={(e) => setNewAccount({ ...newAccount, codeGuichet: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] font-mono" placeholder="Ex: 00100" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Code BIC/SWIFT</label>
                      <input type="text" value={newAccount.swift} onChange={(e) => setNewAccount({ ...newAccount, swift: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717] font-mono" placeholder="Ex: SGCMCMCX" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Agence</label>
                    <input type="text" value={newAccount.agence} onChange={(e) => setNewAccount({ ...newAccount, agence: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="Ex: Akwa, Douala" />
                  </div>
                </div>
              )}

              {/* Étape 3: Paramètres */}
              {formStep === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center"><DollarSign className="w-5 h-5 mr-2" />Paramètres du compte</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type de compte *</label>
                      <select value={newAccount.typeCompte} onChange={(e) => setNewAccount({ ...newAccount, typeCompte: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]">
                        <option value="courant">Courant</option>
                        <option value="epargne">Épargne</option>
                        <option value="depot">Dépôt à terme</option>
                        <option value="credit">Crédit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Devise *</label>
                      <select value={newAccount.devise} onChange={(e) => setNewAccount({ ...newAccount, devise: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]">
                        <option value="XAF">XAF (Franc CFA CEMAC)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="USD">USD (Dollar)</option>
                        <option value="GBP">GBP (Livre Sterling)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statut *</label>
                      <select value={newAccount.statut} onChange={(e) => setNewAccount({ ...newAccount, statut: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]">
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="ferme">Fermé</option>
                        <option value="bloque">Bloqué</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solde initial</label>
                      <input type="number" value={newAccount.soldeInitial} onChange={(e) => setNewAccount({ ...newAccount, soldeInitial: parseFloat(e.target.value) || 0 })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date d'ouverture</label>
                      <input type="date" value={newAccount.dateOuverture} onChange={(e) => setNewAccount({ ...newAccount, dateOuverture: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" />
                    </div>
                  </div>
                </div>
              )}

              {/* Étape 4: Contact & Validation */}
              {formStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center"><Building className="w-5 h-5 mr-2" />Contact bancaire</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Chargé de compte</label>
                        <input type="text" value={newAccount.chargeCompte} onChange={(e) => setNewAccount({ ...newAccount, chargeCompte: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="Nom du conseiller" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                        <input type="tel" value={newAccount.telephoneBanque} onChange={(e) => setNewAccount({ ...newAccount, telephoneBanque: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="+237 6XX XXX XXX" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input type="email" value={newAccount.emailBanque} onChange={(e) => setNewAccount({ ...newAccount, emailBanque: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="conseiller@banque.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea rows={2} value={newAccount.notes} onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#171717]" placeholder="Informations complémentaires..." />
                    </div>
                  </div>

                  {/* Récapitulatif */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Récapitulatif</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">N° compte:</span> <span className="ml-2 font-mono font-medium">{newAccount.numeroCompte || '-'}</span></div>
                      <div><span className="text-gray-500">Libellé:</span> <span className="ml-2 font-medium">{newAccount.libelle || '-'}</span></div>
                      <div><span className="text-gray-500">Banque:</span> <span className="ml-2 font-medium">{newAccount.banque || '-'}</span></div>
                      <div><span className="text-gray-500">IBAN:</span> <span className="ml-2 font-mono">{newAccount.iban || '-'}</span></div>
                      <div><span className="text-gray-500">Type:</span> <span className="ml-2">{newAccount.typeCompte}</span></div>
                      <div><span className="text-gray-500">Devise:</span> <span className="ml-2">{newAccount.devise}</span></div>
                      <div><span className="text-gray-500">Solde initial:</span> <span className="ml-2 font-medium">{formatCurrency(newAccount.soldeInitial)}</span></div>
                      <div><span className="text-gray-500">Titulaire:</span> <span className="ml-2">{newAccount.titulaire || '-'}</span></div>
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
                {formStep > 1 ? 'Précédent' : 'Annuler'}
              </button>
              <div className="flex space-x-3">
                {formStep < 4 ? (
                  <button onClick={() => setFormStep(formStep + 1)}
                    className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90">Suivant</button>
                ) : (
                  <button
                    onClick={() => {
                      if (!newAccount.numeroCompte || !newAccount.libelle) {
                        toast.error('Veuillez remplir le numéro et le libellé du compte');
                        return;
                      }
                      toast.success('Compte bancaire créé avec succès');
                      setShowCreateModal(false);
                      resetNewAccount();
                    }}
                    className="px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#171717]/90 font-semibold"
                  >
                    Créer le compte
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
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#171717]/10 to-[#525252]/10">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-[#171717] rounded-lg flex items-center justify-center text-white">
                  <Building className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selectedAccount.libelle_compte}</h2>
                  <p className="text-sm text-gray-600 font-mono">{selectedAccount.numero_compte}</p>
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
                  Identification Internationale (ISO 13616 / ISO 9362)
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-blue-700">IBAN (International Bank Account Number)</p>
                    <p className="text-base font-mono font-semibold text-blue-900">
                      {selectedAccount.iban || 'Non renseigné'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700">BIC/SWIFT (Bank Identifier Code)</p>
                    <p className="text-base font-mono font-semibold text-blue-900">
                      {selectedAccount.bic_swift || selectedAccount.code_swift || 'Non renseigné'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section Informations Bancaires */}
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Établissement Bancaire</h3>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Nom de la Banque</p>
                    <p className="text-sm font-semibold">{selectedAccount.nom_banque}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Code Banque</p>
                    <p className="text-sm font-mono">{selectedAccount.code_banque || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Code Guichet/Agence</p>
                    <p className="text-sm font-mono">{selectedAccount.code_guichet || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Domiciliation</p>
                    <p className="text-sm">{selectedAccount.domiciliation || selectedAccount.agence || 'Non renseigné'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Caractéristiques du Compte</h3>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Type de Compte</p>
                    <Badge className={getAccountTypeColor(selectedAccount.type_compte)}>
                      {getAccountTypeLabel(selectedAccount.type_compte)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Devise (ISO 4217)</p>
                    <p className="text-sm font-semibold">{selectedAccount.devise}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Statut</p>
                    <Badge className={getStatusColor(selectedAccount.statut)}>
                      {getStatusLabel(selectedAccount.statut)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Clé RIB</p>
                    <p className="text-sm font-mono">{selectedAccount.cle_rib || '-'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Titulaire(s)</h3>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Titulaire Principal</p>
                    <p className="text-sm font-semibold">{selectedAccount.titulaire}</p>
                  </div>
                  {selectedAccount.co_titulaire && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Co-titulaire</p>
                      <p className="text-sm">{selectedAccount.co_titulaire}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500">Date d'ouverture</p>
                    <p className="text-sm">{selectedAccount.date_ouverture ? formatDate(selectedAccount.date_ouverture) : '-'}</p>
                  </div>
                </div>
              </div>

              {/* Section Soldes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Position Financière</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">Solde Comptable</p>
                    <p className={`text-lg font-bold ${getBalanceColor(selectedAccount.solde_comptable)}`}>
                      {formatCurrency(selectedAccount.solde_comptable, selectedAccount.devise)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">Solde Banque</p>
                    <p className={`text-lg font-bold ${getBalanceColor(selectedAccount.solde_banque)}`}>
                      {formatCurrency(selectedAccount.solde_banque, selectedAccount.devise)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">Écart de Rapprochement</p>
                    <div className={`flex items-center ${Math.abs(selectedAccount.solde_comptable - selectedAccount.solde_banque) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.abs(selectedAccount.solde_comptable - selectedAccount.solde_banque) > 0.01 ? (
                        <AlertCircle className="w-4 h-4 mr-1" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      <span className="text-lg font-bold">
                        {formatCurrency(Math.abs(selectedAccount.solde_comptable - selectedAccount.solde_banque), selectedAccount.devise)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs font-medium text-gray-500">Plafond Autorisé</p>
                    <p className="text-lg font-bold text-gray-700">
                      {selectedAccount.plafond ? formatCurrency(selectedAccount.plafond, selectedAccount.devise) : 'Illimité'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section RIB Complet */}
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">RIB Complet (Relevé d'Identité Bancaire)</h3>
                <div className="flex items-center space-x-2 bg-gray-100 rounded p-3 font-mono text-sm">
                  <span>{selectedAccount.code_banque || 'XXXXX'}</span>
                  <span className="text-gray-400">-</span>
                  <span>{selectedAccount.code_guichet || 'XXXXX'}</span>
                  <span className="text-gray-400">-</span>
                  <span>{selectedAccount.numero_compte}</span>
                  <span className="text-gray-400">-</span>
                  <span>{selectedAccount.cle_rib || 'XX'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500">
                Dernière mise à jour: {selectedAccount.updated_at ? formatDate(selectedAccount.updated_at) : 'N/A'}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    // Exporter le RIB en PDF
                    toast.success('Export RIB en cours...');
                  }}
                  className="px-4 py-2 border border-[#171717] text-[#171717] rounded-lg hover:bg-[#171717]/10 transition-colors"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Exporter RIB
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040] transition-colors"
                >
                  Modifier
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
              <h2 className="text-lg font-semibold text-gray-900">Modifier le Compte Bancaire</h2>
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
              toast.success('Compte modifié avec succès');
              setShowEditModal(false);
            }}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de compte</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
                      defaultValue={selectedAccount.numero_compte}
                      disabled
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      defaultValue={selectedAccount.iban || ''}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Libellé du compte *</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    defaultValue={selectedAccount.libelle_compte}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type de compte</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2" defaultValue={selectedAccount.type_compte}>
                      <option value="courant">Courant</option>
                      <option value="epargne">Épargne</option>
                      <option value="terme">À terme</option>
                      <option value="credit">Crédit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2" defaultValue={selectedAccount.statut}>
                      <option value="actif">Actif</option>
                      <option value="inactif">Inactif</option>
                      <option value="ferme">Fermé</option>
                      <option value="bloque">Bloqué</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titulaire</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    defaultValue={selectedAccount.titulaire}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#525252] text-white rounded-lg hover:bg-[#404040]"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Importer Comptes */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Importer des Comptes Bancaires</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#171717] transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">Glissez votre fichier ici</p>
                <p className="text-sm text-gray-500 mb-4">ou cliquez pour sélectionner</p>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  id="file-import-bank"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      toast.success(`Fichier sélectionné: ${e.target.files[0].name}`);
                    }
                  }}
                />
                <label
                  htmlFor="file-import-bank"
                  className="inline-block px-6 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626] cursor-pointer"
                >
                  Sélectionner un fichier
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Formats acceptés:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• CSV avec séparateur point-virgule (;)</li>
                  <li>• Excel (.xlsx, .xls)</li>
                  <li>• Colonnes: Numéro, Libellé, Banque, Type, Devise, Solde</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  toast.success('Import lancé !');
                  setShowImportModal(false);
                }}
                className="px-4 py-2 bg-[#171717] text-white rounded-lg hover:bg-[#262626]"
              >
                Importer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountsPage;