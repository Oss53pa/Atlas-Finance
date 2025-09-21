import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const handleDelete = (budget: Budget) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le budget "${budget.name}" ?`)) {
      deleteBudgetMutation.mutate(budget.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Budgets</h1>
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
              <p className="text-2xl font-bold text-gray-900">{activeBudgets.length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudgetAmount)}</p>
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
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalConsumed)}</p>
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
              <p className={`text-2xl font-bold ${getConsumptionColor(averageConsumption)}`}>
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
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                <option value="treasury">Trésorerie</option>
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
                <option value="draft">Brouillon</option>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Période
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Consommation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Aucun budget trouvé
                  </td>
                </tr>
              ) : (
                filteredBudgets.map((budget) => (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{budget.name}</div>
                        <div className="text-sm text-gray-500">{budget.code}</div>
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
                      <div className="text-sm text-gray-500">Restant: {formatCurrency(budget.remainingAmount)}</div>
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
                      <div className="text-sm text-gray-500">{budget.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowViewModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Voir les détails"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedBudget(budget);
                            setShowEditModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Modifier"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(budget)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Dupliquer"
                          disabled={duplicateBudgetMutation.isPending}
                        >
                          <DocumentDuplicateIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(budget)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Supprimer"
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
    </div>
  );
};

export default BudgetsPage;