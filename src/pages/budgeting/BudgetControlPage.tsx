import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  BanknotesIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface BudgetControl {
  id: string;
  budgetId: string;
  budgetName: string;
  department: string;
  period: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePercentage: number;
  status: 'on_track' | 'at_risk' | 'over_budget' | 'under_budget';
  category: string;
  responsible: string;
  lastUpdate: string;
  alerts: {
    type: 'warning' | 'danger' | 'info';
    message: string;
    date: string;
  }[];
}

interface MonthlyData {
  month: string;
  budgeted: number;
  actual: number;
  variance: number;
}

const BudgetControlPage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('2024');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');

  // États pour le modal de sélection de période
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const { data: budgetControls = [], isLoading } = useQuery({
    queryKey: ['budget-controls', selectedPeriod, selectedDepartment, selectedStatus, searchTerm],
    queryFn: async () => {
      const mockControls: BudgetControl[] = [
        {
          id: '1',
          budgetId: 'BUDG-EXP-2024',
          budgetName: 'Budget Exploitation 2024',
          department: 'Exploitation',
          period: '2024',
          budgetedAmount: 5000000,
          actualAmount: 4200000,
          variance: -800000,
          variancePercentage: -16,
          status: 'under_budget',
          category: 'Opérationnel',
          responsible: 'Marie Dubois',
          lastUpdate: '2024-08-25T00:00:00Z',
          alerts: [
            {
              type: 'info',
              message: 'Économies réalisées sur les fournitures de bureau',
              date: '2024-08-20T00:00:00Z'
            }
          ]
        },
        {
          id: '2',
          budgetId: 'BUDG-INV-IT24',
          budgetName: 'Budget Investissements IT',
          department: 'IT',
          period: '2024',
          budgetedAmount: 2000000,
          actualAmount: 2300000,
          variance: 300000,
          variancePercentage: 15,
          status: 'over_budget',
          category: 'Investissement',
          responsible: 'Paul Martin',
          lastUpdate: '2024-08-24T00:00:00Z',
          alerts: [
            {
              type: 'danger',
              message: 'Dépassement budgétaire de 15% - Achat serveur non planifié',
              date: '2024-08-22T00:00:00Z'
            },
            {
              type: 'warning',
              message: 'Prévision de dépassement supplémentaire en Q4',
              date: '2024-08-20T00:00:00Z'
            }
          ]
        },
        {
          id: '3',
          budgetId: 'BUDG-COM-2024',
          budgetName: 'Budget Commercial',
          department: 'Commercial',
          period: '2024',
          budgetedAmount: 3000000,
          actualAmount: 3100000,
          variance: 100000,
          variancePercentage: 3.33,
          status: 'at_risk',
          category: 'Opérationnel',
          responsible: 'Jean Kouassi',
          lastUpdate: '2024-08-23T00:00:00Z',
          alerts: [
            {
              type: 'warning',
              message: 'Dépassement léger sur les frais de déplacement',
              date: '2024-08-18T00:00:00Z'
            }
          ]
        }
      ];
      
      return mockControls.filter(control =>
        (selectedDepartment === 'all' || control.department === selectedDepartment) &&
        (selectedStatus === 'all' || control.status === selectedStatus) &&
        (searchTerm === '' || 
         control.budgetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         control.responsible.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
  });

  const { data: monthlyData = [] } = useQuery({
    queryKey: ['monthly-budget-data', selectedPeriod],
    queryFn: async () => {
      const mockData: MonthlyData[] = [
        { month: 'Jan', budgeted: 800000, actual: 750000, variance: -50000 },
        { month: 'Fév', budgeted: 800000, actual: 820000, variance: 20000 },
        { month: 'Mar', budgeted: 800000, actual: 780000, variance: -20000 },
        { month: 'Avr', budgeted: 850000, actual: 900000, variance: 50000 },
        { month: 'Mai', budgeted: 850000, actual: 830000, variance: -20000 },
        { month: 'Jun', budgeted: 850000, actual: 870000, variance: 20000 },
        { month: 'Jul', budgeted: 900000, actual: 950000, variance: 50000 },
        { month: 'Aoû', budgeted: 900000, actual: 880000, variance: -20000 }
      ];
      
      return mockData;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'over_budget': return 'bg-red-100 text-red-800';
      case 'under_budget': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'on_track': return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'at_risk': return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'over_budget': return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      case 'under_budget': return <ArrowTrendingDownIcon className="h-5 w-5 text-blue-600" />;
      default: return <ChartBarIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600';
    if (variance < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const totalBudgeted = budgetControls.reduce((sum, control) => sum + control.budgetedAmount, 0);
  const totalActual = budgetControls.reduce((sum, control) => sum + control.actualAmount, 0);
  const totalVariance = totalActual - totalBudgeted;
  const totalVariancePercentage = totalBudgeted > 0 ? (totalVariance / totalBudgeted) * 100 : 0;

  const statusCounts = budgetControls.reduce((acc, control) => {
    acc[control.status] = (acc[control.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: status === 'on_track' ? 'En cours' :
          status === 'at_risk' ? 'À risque' :
          status === 'over_budget' ? 'Dépassé' : 'Sous-budget',
    value: count,
    color: status === 'on_track' ? '#6A8A82' :
           status === 'at_risk' ? '#B87333' :
           status === 'over_budget' ? '#B85450' : '#7A99AC'
  }));

  const COLORS = ['#6A8A82', '#B87333', '#B85450', '#7A99AC'];

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrôle Budgétaire</h1>
          <p className="text-gray-600">Suivi des écarts et analyse des performances</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'charts' : 'table')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <ChartBarIcon className="h-5 w-5" />
            <span>{viewMode === 'table' ? 'Vue Graphiques' : 'Vue Tableau'}</span>
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors" aria-label="Télécharger">
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>{t('common.export')}</span>
          </button>
        </div>
      </div>

      {/* Indicateurs globaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BanknotesIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Réalisé</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalActual)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Écart</p>
              <p className={`text-2xl font-bold ${getVarianceColor(totalVariance)}`}>
                {formatCurrency(Math.abs(totalVariance))}
              </p>
              <p className={`text-sm ${getVarianceColor(totalVariance)}`}>
                {totalVariancePercentage > 0 ? '+' : ''}{totalVariancePercentage.toFixed(1)}%
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              {totalVariance >= 0 ? 
                <ChartBarIcon className="h-6 w-6 text-red-600" /> :
                <ArrowTrendingDownIcon className="h-6 w-6 text-green-600" />
              }
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budgets Suivis</p>
              <p className="text-2xl font-bold text-gray-900">{budgetControls.length}</p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
              <button
                type="button"
                onClick={() => setShowPeriodModal(true)}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {dateRange.start && dateRange.end
                    ? `Du ${new Date(dateRange.start).toLocaleDateString('fr-FR')} au ${new Date(dateRange.end).toLocaleDateString('fr-FR')}`
                    : 'Sélectionner une période'
                  }
                </span>
              </button>
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
                <option value="Commercial">Commercial</option>
                <option value="Finance">Finance</option>
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
                <option value="on_track">{t('status.inProgress')}</option>
                <option value="at_risk">À risque</option>
                <option value="over_budget">Dépassé</option>
                <option value="under_budget">Sous-budget</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'charts' ? (
        /* Vue Graphiques */
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Évolution mensuelle */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Évolution Mensuelle</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="budgeted" stroke="#7A99AC" name="Budgété" />
                  <Line type="monotone" dataKey="actual" stroke="#6A8A82" name="Réalisé" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition par statut */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Répartition par Statut</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Écarts par département */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Écarts par Département</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={budgetControls.map(control => ({
                  name: control.department,
                  budgeted: control.budgetedAmount,
                  actual: control.actualAmount,
                  variance: control.variance
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `${value / 1000000}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="budgeted" fill="#7A99AC" name="Budgété" />
                <Bar dataKey="actual" fill="#6A8A82" name="Réalisé" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        /* Vue Tableau */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Budgété
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Réalisé
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Écart
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Responsable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Alertes
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
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 w-8 bg-gray-200 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : budgetControls.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-700">
                      Aucun contrôle budgétaire trouvé
                    </td>
                  </tr>
                ) : (
                  budgetControls.map((control) => (
                    <tr key={control.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{control.budgetName}</div>
                          <div className="text-sm text-gray-700">{control.department} - {control.period}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(control.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(control.status)}`}>
                            {control.status === 'on_track' ? 'En cours' :
                             control.status === 'at_risk' ? 'À risque' :
                             control.status === 'over_budget' ? 'Dépassé' : 'Sous-budget'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(control.budgetedAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(control.actualAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${getVarianceColor(control.variance)}`}>
                          {control.variance > 0 ? '+' : ''}{formatCurrency(control.variance)}
                        </div>
                        <div className={`text-xs ${getVarianceColor(control.variance)}`}>
                          {control.variancePercentage > 0 ? '+' : ''}{control.variancePercentage.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{control.responsible}</div>
                        <div className="text-sm text-gray-700">{control.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          {control.alerts.map((alert, index) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full ${
                                alert.type === 'danger' ? 'bg-red-500' :
                                alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                              }`}
                              title={alert.message}
                            ></div>
                          ))}
                          {control.alerts.length === 0 && (
                            <span className="text-sm text-gray-700">Aucune</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="p-2 text-gray-700 hover:text-indigo-600 transition-colors"
                          title="Voir les détails" aria-label="Voir les détails">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Mettre à jour la logique de filtrage avec la nouvelle période
          // Ici on pourrait déterminer automatiquement la période basée sur les dates
          const startDate = new Date(newDateRange.start);
          const endDate = new Date(newDateRange.end);
          const year = startDate.getFullYear().toString();
          setSelectedPeriod(year);
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};

export default BudgetControlPage;