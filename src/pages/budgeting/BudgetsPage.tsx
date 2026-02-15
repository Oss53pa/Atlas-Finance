import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Budget {
  id: string;
  name: string;
  code: string;
  type: 'operational' | 'investment' | 'treasury';
  status: 'draft' | 'active' | 'closed' | 'archived';
  period: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  consumedAmount: number;
  remainingAmount: number;
  consumptionRate: number;
  department: string;
  responsible: string;
  currency: string;
  description?: string;
  createdAt: string;
  lastModified: string;
}

const BudgetsPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showEditPeriodModal, setShowEditPeriodModal] = useState(false);
  const [createDateRange, setCreateDateRange] = useState({ start: '', end: '' });
  const [editDateRange, setEditDateRange] = useState({ start: '', end: '' });

  const queryClient = useQueryClient();

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ['budgets', searchTerm, selectedType, selectedStatus, selectedDepartment],
    queryFn: async () => {
      const mockBudgets: Budget[] = [
        {
          id: '1',
          name: 'Budget Exploitation 2024',
          code: 'BUDG-EXP-2024',
          type: 'operational',
          status: 'active',
          period: '2024',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          totalAmount: 5000000,
          consumedAmount: 3200000,
          remainingAmount: 1800000,
          consumptionRate: 64,
          department: 'Exploitation',
          responsible: 'Marie Dubois',
          currency: 'XOF',
          description: 'Budget opérationnel pour l\'exercice 2024',
          createdAt: '2024-01-01T00:00:00Z',
          lastModified: '2024-08-15T10:30:00Z'
        },
        {
          id: '2',
          name: 'Budget Investissements IT',
          code: 'BUDG-INV-IT24',
          type: 'investment',
          status: 'active',
          period: '2024',
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          totalAmount: 2000000,
          consumedAmount: 800000,
          remainingAmount: 1200000,
          consumptionRate: 40,
          department: 'IT',
          responsible: 'Paul Martin',
          currency: 'XOF',
          description: 'Investissements en matériel et logiciels IT',
          createdAt: '2024-01-01T00:00:00Z',
          lastModified: '2024-07-20T14:15:00Z'
        },
        {
          id: '3',
          name: 'Budget Trésorerie Q4',
          code: 'BUDG-TRES-Q4',
          type: 'treasury',
          status: 'draft',
          period: 'Q4 2024',
          startDate: '2024-10-01',
          endDate: '2024-12-31',
          totalAmount: 1500000,
          consumedAmount: 0,
          remainingAmount: 1500000,
          consumptionRate: 0,
          department: 'Finance',
          responsible: 'Sophie Koné',
          currency: 'XOF',
          description: 'Budget de trésorerie pour le quatrième trimestre',
          createdAt: '2024-09-01T00:00:00Z',
          lastModified: '2024-09-15T09:00:00Z'
        }
      ];
      
      return mockBudgets.filter(budget => 
        (searchTerm === '' || 
         budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         budget.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
         budget.responsible.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedType === 'all' || budget.type === selectedType) &&
        (selectedStatus === 'all' || budget.status === selectedStatus) &&
        (selectedDepartment === 'all' || budget.department === selectedDepartment)
      );
    }
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return budgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const duplicateBudgetMutation = useMutation({
    mutationFn: async (budgetId: string) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return budgetId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'operational': return 'bg-blue-100 text-blue-800';
      case 'investment': return 'bg-purple-100 text-purple-800';
      case 'treasury': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConsumptionColor = (rate: number) => {
    if (rate <= 50) return 'text-green-600';
    if (rate <= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; budget: Budget | null }>({
    isOpen: false,
    budget: null
  });

  const handleDeleteClick = (budget: Budget) => {
    setDeleteConfirm({ isOpen: true, budget });
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirm.budget) {
      deleteBudgetMutation.mutate(deleteConfirm.budget.id);
      setDeleteConfirm({ isOpen: false, budget: null });
    }
  };

  const handleDuplicate = (budget: Budget) => {
    duplicateBudgetMutation.mutate(budget.id);
  };

  const filteredBudgets = budgets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(budgets.length / itemsPerPage);

  const activeBudgets = budgets.filter(b => b.status === 'active');
  const totalBudgetAmount = activeBudgets.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalConsumed = activeBudgets.reduce((sum, b) => sum + b.consumedAmount, 0);
  const averageConsumption = activeBudgets.length > 0 
    ? activeBudgets.reduce((sum, b) => sum + b.consumptionRate, 0) / activeBudgets.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600">Gestion des budgets par département et projet</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Nouveau Budget</span>
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budgets Actifs</p>
              <p className="text-lg font-bold text-gray-900">{activeBudgets.length}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant Total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalBudgetAmount)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant Consommé</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalConsumed)}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux Moyen</p>
              <p className={`text-lg font-bold ${getConsumptionColor(averageConsumption)}`}>
                {averageConsumption.toFixed(1)}%
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
              <input
                type="text"
                placeholder="Rechercher un budget..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtres</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les types</option>
                <option value="operational">Opérationnel</option>
                <option value="investment">Investissement</option>
                <option value="treasury">{t('navigation.treasury')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">{t('accounting.draft')}</option>
                <option value="active">Actif</option>
                <option value="closed">Clôturé</option>
                <option value="archived">Archivé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Tous les départements</option>
                <option value="Exploitation">Exploitation</option>
                <option value="IT">IT</option>
                <option value="Finance">Finance</option>
                <option value="RH">RH</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tableau des budgets */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Consommation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-48"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-700">
                    Aucun budget trouvé
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{budget.name}</div>
                        <div className="text-sm text-gray-700">{budget.code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(budget.type)}`}>
                        {budget.type === 'operational' ? 'Opérationnel' : 
                         budget.type === 'investment' ? 'Investissement' : 'Trésorerie'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(budget.status)}`}>
                        {budget.status === 'active' ? 'Actif' :
                         budget.status === 'draft' ? 'Brouillon' :
                         budget.status === 'closed' ? 'Clôturé' : 'Archivé'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {budget.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(budget.totalAmount)}</div>
                      <div className="text-sm text-gray-700">Restant: {formatCurrency(budget.remainingAmount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${getConsumptionColor(budget.consumptionRate)}`}>
                              {budget.consumptionRate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                budget.consumptionRate <= 50 ? 'bg-green-500' :
                                budget.consumptionRate <= 80 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(budget.consumptionRate, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{budget.responsible}</div>
                      <div className="text-sm text-gray-700">{budget.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title="Voir les détails"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(budget)}
                          className="p-2 text-gray-700 hover:text-blue-600 transition-colors"
                          title="Dupliquer"
                          disabled={duplicateBudgetMutation.isPending}
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(budget)}
                          className="p-2 text-gray-700 hover:text-red-600 transition-colors"
                          title={t('common.delete')}
                          disabled={deleteBudgetMutation.isPending}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Affichage de{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, budgets.length)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{budgets.length}</span>
                  {' '}résultats
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Créer Budget */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Créer un nouveau budget</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom du budget *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Budget Marketing Q1 2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Code *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: MKT-Q1-2025"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="operational">Opérationnel</option>
                    <option value="investment">Investissement</option>
                    <option value="treasury">{t('navigation.treasury')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut *
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="active">Actif</option>
                    <option value="closed">Clôturé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Période
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ex: Q1 2025"
                  />
                </div>
              </div>

              {/* Période */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPeriodModal(true)}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {createDateRange.start && createDateRange.end
                      ? `Du ${new Date(createDateRange.start).toLocaleDateString('fr-FR')} au ${new Date(createDateRange.end).toLocaleDateString('fr-FR')}`
                      : 'Sélectionner une période'
                    }
                  </span>
                </button>
              </div>

              {/* Montants */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant total *
                  </label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Devise *
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Assignation */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Département *
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                    <option value="">Sélectionner...</option>
                    <option value="Marketing">Marketing</option>
                    <option value="IT">IT</option>
                    <option value="RH">RH</option>
                    <option value="Finance">Finance</option>
                    <option value="Opérations">Opérations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Responsable *
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Nom du responsable"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Décrivez les objectifs et périmètre de ce budget..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Créer le budget
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Modifier Budget */}
      {showEditModal && selectedBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Modifier le budget</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-700 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du budget *</label>
                  <input
                    type="text"
                    defaultValue={selectedBudget.name}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Code *</label>
                  <input
                    type="text"
                    defaultValue={selectedBudget.code}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                  <select
                    defaultValue={selectedBudget.type}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="operational">Opérationnel</option>
                    <option value="investment">Investissement</option>
                    <option value="treasury">{t('navigation.treasury')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                  <select
                    defaultValue={selectedBudget.status}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="draft">{t('accounting.draft')}</option>
                    <option value="active">Actif</option>
                    <option value="closed">Clôturé</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                  <input
                    type="text"
                    defaultValue={selectedBudget.period}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Période pour modification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setEditDateRange({
                      start: selectedBudget.startDate,
                      end: selectedBudget.endDate
                    });
                    setShowEditPeriodModal(true);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <CalendarIcon className="h-4 w-4" />
                  <span>
                    {editDateRange.start && editDateRange.end
                      ? `Du ${new Date(editDateRange.start).toLocaleDateString('fr-FR')} au ${new Date(editDateRange.end).toLocaleDateString('fr-FR')}`
                      : `Du ${new Date(selectedBudget.startDate).toLocaleDateString('fr-FR')} au ${new Date(selectedBudget.endDate).toLocaleDateString('fr-FR')}`
                    }
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant total *</label>
                  <input
                    type="number"
                    defaultValue={selectedBudget.totalAmount}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise *</label>
                  <select
                    defaultValue={selectedBudget.currency}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Département *</label>
                  <input
                    type="text"
                    defaultValue={selectedBudget.department}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Responsable *</label>
                  <input
                    type="text"
                    defaultValue={selectedBudget.responsible}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  rows={3}
                  defaultValue={selectedBudget.description}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Voir Budget */}
      {showViewModal && selectedBudget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedBudget.name}</h2>
                <p className="text-sm text-gray-700 mt-1">Code: {selectedBudget.code}</p>
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
              {/* Statistiques */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium mb-1">Montant Total</div>
                  <div className="text-lg font-bold text-blue-900">
                    {selectedBudget.totalAmount.toLocaleString()} {selectedBudget.currency}
                  </div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-orange-600 font-medium mb-1">Consommé</div>
                  <div className="text-lg font-bold text-orange-900">
                    {selectedBudget.consumedAmount.toLocaleString()} {selectedBudget.currency}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    {selectedBudget.consumptionRate}% du budget
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium mb-1">Restant</div>
                  <div className="text-lg font-bold text-green-900">
                    {selectedBudget.remainingAmount.toLocaleString()} {selectedBudget.currency}
                  </div>
                </div>
              </div>

              {/* Barre de progression */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium">Taux de consommation</span>
                  <span className="text-gray-600">{selectedBudget.consumptionRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      selectedBudget.consumptionRate > 90
                        ? 'bg-red-500'
                        : selectedBudget.consumptionRate > 75
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${selectedBudget.consumptionRate}%` }}
                  />
                </div>
              </div>

              {/* Informations générales */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Informations générales</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-700">Type</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1 capitalize">
                        {selectedBudget.type}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Statut</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedBudget.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : selectedBudget.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedBudget.status === 'active' ? 'Actif' :
                           selectedBudget.status === 'draft' ? 'Brouillon' :
                           selectedBudget.status === 'closed' ? 'Clôturé' : 'Archivé'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Période</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">{selectedBudget.period}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Date de début</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">
                        {new Date(selectedBudget.startDate).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Date de fin</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">
                        {new Date(selectedBudget.endDate).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Assignation</h3>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm text-gray-700">Département</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">{selectedBudget.department}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Responsable</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">{selectedBudget.responsible}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Créé le</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">
                        {new Date(selectedBudget.createdAt).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-700">Dernière modification</dt>
                      <dd className="text-sm font-medium text-gray-900 mt-1">
                        {new Date(selectedBudget.lastModified).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Description */}
              {selectedBudget.description && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600">{selectedBudget.description}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setShowEditModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période pour création */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setCreateDateRange(newDateRange);
        }}
        initialDateRange={createDateRange}
      />

      {/* Modal de sélection de période pour modification */}
      <PeriodSelectorModal
        isOpen={showEditPeriodModal}
        onClose={() => setShowEditPeriodModal(false)}
        onApply={(newDateRange) => {
          setEditDateRange(newDateRange);
        }}
        initialDateRange={editDateRange}
      />

      {/* Modal de confirmation de suppression */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, budget: null })}
        onConfirm={handleConfirmDelete}
        title="Confirmer la suppression"
        message={`Êtes-vous sûr de vouloir supprimer le budget "${deleteConfirm.budget?.name}" ? Cette action est irréversible.`}
        variant="danger"
        confirmText="Supprimer"
        cancelText="Annuler"
        confirmLoading={deleteBudgetMutation.isPending}
      />
    </div>
  );
};

export default BudgetsPage;