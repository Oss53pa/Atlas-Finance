import React, { useState, useMemo } from 'react';
import {
  TrendingUp, Target, AlertTriangle, CheckCircle, XCircle,
  PlusCircle, Edit, Trash2, Save, X, Copy, FileText,
  BarChart3, PieChart, TrendingDown, Calculator, Calendar,
  DollarSign, Percent, Eye, Download, Upload, RefreshCw,
  AlertCircle, ChevronRight, Filter, Search, Settings,
  FileBarChart, Activity, Zap, Shield, Clock, ArrowUpRight,
  ArrowDownRight, Layers, GitBranch, Database, Lock
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  Filler
);

interface Budget {
  id: string;
  exercice: string;
  type: 'Annuel' | 'Trimestriel' | 'Mensuel' | 'Projet';
  name: string;
  description: string;
  status: 'Brouillon' | 'Validé' | 'En cours' | 'Clôturé' | 'Révisé';
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalActual: number;
  variance: number;
  variancePercent: number;
  version: number;
  approvedBy?: string;
  approvedDate?: string;
  departments: string[];
  categories: BudgetCategory[];
  allocations: BudgetAllocation[];
  lastModified: string;
}

interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  type: 'Revenus' | 'Charges' | 'Investissements';
  budgeted: number;
  actual: number;
  committed: number;
  available: number;
  variance: number;
  variancePercent: number;
  subCategories?: BudgetSubCategory[];
}

interface BudgetSubCategory {
  id: string;
  code: string;
  name: string;
  budgeted: number;
  actual: number;
  variance: number;
}

interface BudgetAllocation {
  id: string;
  month: string;
  revenues: number;
  expenses: number;
  investments: number;
  actualRevenues: number;
  actualExpenses: number;
  actualInvestments: number;
}

interface BudgetRevision {
  id: string;
  budgetId: string;
  version: number;
  date: string;
  reason: string;
  changes: string;
  approvedBy: string;
  previousAmount: number;
  newAmount: number;
  impact: string;
}

interface BudgetControl {
  id: string;
  type: string;
  description: string;
  status: 'OK' | 'Alerte' | 'Critique';
  value: number;
  threshold: number;
  message: string;
}

const CompleteBudgetingModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('2024');

  // Sample data
  const [budgets] = useState<Budget[]>([
    {
      id: 'BUD001',
      exercice: '2024',
      type: 'Annuel',
      name: 'Budget Général 2024',
      description: 'Budget annuel de fonctionnement et investissement',
      status: 'En cours',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      totalBudget: 50000000,
      totalActual: 41250000,
      variance: 8750000,
      variancePercent: 17.5,
      version: 2,
      approvedBy: 'Direction Générale',
      approvedDate: '2023-12-15',
      departments: ['Commercial', 'Production', 'Administration', 'R&D'],
      categories: [
        {
          id: 'CAT001',
          code: '70',
          name: 'Ventes de produits',
          type: 'Revenus',
          budgeted: 45000000,
          actual: 38500000,
          committed: 0,
          available: 6500000,
          variance: -6500000,
          variancePercent: -14.4,
          subCategories: [
            { id: 'SUB001', code: '701', name: 'Produits finis', budgeted: 35000000, actual: 30000000, variance: -5000000 },
            { id: 'SUB002', code: '702', name: 'Services', budgeted: 10000000, actual: 8500000, variance: -1500000 }
          ]
        },
        {
          id: 'CAT002',
          code: '60',
          name: 'Achats et charges externes',
          type: 'Charges',
          budgeted: 25000000,
          actual: 20500000,
          committed: 2000000,
          available: 2500000,
          variance: 4500000,
          variancePercent: 18.0
        }
      ],
      allocations: [
        { id: 'ALL001', month: 'Janvier', revenues: 3750000, expenses: 2080000, investments: 500000, actualRevenues: 3200000, actualExpenses: 1900000, actualInvestments: 450000 },
        { id: 'ALL002', month: 'Février', revenues: 3750000, expenses: 2080000, investments: 400000, actualRevenues: 3500000, actualExpenses: 2000000, actualInvestments: 380000 }
      ],
      lastModified: '2024-11-15'
    },
    {
      id: 'BUD002',
      exercice: '2024',
      type: 'Projet',
      name: 'Budget Projet ERP',
      description: 'Budget d\'implémentation du nouveau système ERP',
      status: 'Validé',
      startDate: '2024-03-01',
      endDate: '2024-09-30',
      totalBudget: 5000000,
      totalActual: 0,
      variance: 5000000,
      variancePercent: 100,
      version: 1,
      approvedBy: 'Comité de Projet',
      approvedDate: '2024-02-20',
      departments: ['IT', 'Finance', 'Operations'],
      categories: [],
      allocations: [],
      lastModified: '2024-02-20'
    }
  ]);

  const [revisions] = useState<BudgetRevision[]>([
    {
      id: 'REV001',
      budgetId: 'BUD001',
      version: 2,
      date: '2024-06-15',
      reason: 'Ajustement mi-année',
      changes: 'Réallocation des fonds marketing vers R&D',
      approvedBy: 'Direction Financière',
      previousAmount: 48000000,
      newAmount: 50000000,
      impact: 'Augmentation de 4.2% du budget global'
    }
  ]);

  const [controls] = useState<BudgetControl[]>([
    {
      id: 'CTRL001',
      type: 'Dépassement',
      description: 'Charges de personnel',
      status: 'Alerte',
      value: 95,
      threshold: 90,
      message: 'Consommation à 95% du budget annuel'
    },
    {
      id: 'CTRL002',
      type: 'Sous-utilisation',
      description: 'Budget Marketing',
      status: 'OK',
      value: 45,
      threshold: 50,
      message: 'Utilisation normale à ce stade de l\'année'
    },
    {
      id: 'CTRL003',
      type: 'Variance',
      description: 'Revenus Q3',
      status: 'Critique',
      value: -15,
      threshold: -10,
      message: 'Écart défavorable de 15% sur les revenus'
    }
  ]);

  // Filter budgets
  const filteredBudgets = useMemo(() => {
    return budgets.filter(budget => {
      const matchesSearch = budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          budget.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || budget.type === filterType;
      const matchesStatus = filterStatus === 'all' || budget.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [budgets, searchTerm, filterType, filterStatus]);

  // Calculate statistics
  const stats = useMemo(() => {
    const activeBudgets = budgets.filter(b => b.status === 'En cours');
    const totalBudgeted = activeBudgets.reduce((sum, b) => sum + b.totalBudget, 0);
    const totalActual = activeBudgets.reduce((sum, b) => sum + b.totalActual, 0);
    const totalVariance = totalBudgeted - totalActual;
    const executionRate = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

    return {
      totalBudgets: budgets.length,
      activeBudgets: activeBudgets.length,
      totalBudgeted,
      totalActual,
      totalVariance,
      executionRate,
      alertsCount: controls.filter(c => c.status === 'Alerte' || c.status === 'Critique').length
    };
  }, [budgets, controls]);

  // Chart data
  const evolutionChartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Budget',
        data: [4000000, 4000000, 4200000, 4200000, 4200000, 4500000, 4500000, 4500000, 4300000, 4300000, 4300000, 4500000],
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Réel',
        data: [3800000, 3900000, 4100000, 4000000, 4300000, 4400000, 4200000, 4100000, null, null, null, null],
        borderColor: 'var(--color-success)',
        backgroundColor: 'rgba(var(--color-success-rgb), 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const categoryChartData = {
    labels: ['Revenus', 'Charges Personnel', 'Charges Externes', 'Investissements', 'Autres'],
    datasets: [{
      data: [45000000, 15000000, 10000000, 8000000, 7000000],
      backgroundColor: [
        'var(--color-success)',
        'var(--color-primary)',
        'var(--color-warning)',
        'var(--color-info)',
        'var(--color-secondary)'
      ]
    }]
  };

  const performanceRadarData = {
    labels: ['Commercial', 'Production', 'R&D', 'Marketing', 'Administration', 'Logistique'],
    datasets: [{
      label: 'Taux d\'exécution (%)',
      data: [85, 92, 78, 65, 88, 90],
      backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
      borderColor: 'var(--color-primary)',
      pointBackgroundColor: 'var(--color-primary)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'var(--color-primary)'
    }]
  };

  const handleSaveBudget = () => {
    // Logic to save budget
    setShowBudgetModal(false);
    setEditingBudget(null);
  };

  const handleDeleteBudget = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce budget ?')) {
      // Logic to delete budget
    }
  };

  const handleDuplicateBudget = (budget: Budget) => {
    // Logic to duplicate budget
    const newBudget = { ...budget, id: `BUD${Date.now()}`, name: `${budget.name} (Copie)` };
    setEditingBudget(newBudget);
    setShowBudgetModal(true);
  };

  const handleValidateBudget = (budget: Budget) => {
    if (confirm('Êtes-vous sûr de vouloir valider ce budget ?')) {
      // Logic to validate budget
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Validé': return 'bg-green-100 text-green-800';
      case 'En cours': return 'bg-blue-100 text-blue-800';
      case 'Brouillon': return 'bg-gray-100 text-gray-800';
      case 'Clôturé': return 'bg-purple-100 text-purple-800';
      case 'Révisé': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < -10) return 'text-red-600';
    if (variance < 0) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getControlStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Alerte': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'Critique': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">
              Module Budgétisation
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Gestion complète des budgets, allocations et contrôle budgétaire
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Importer
            </button>
            <button className="px-4 py-2 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button 
              onClick={() => {
                setEditingBudget(null);
                setShowBudgetModal(true);
              }}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Nouveau Budget
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[var(--color-border)]">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
            { id: 'budgets', label: 'Budgets', icon: Calculator },
            { id: 'allocations', label: 'Allocations', icon: Layers },
            { id: 'monitoring', label: 'Suivi & Contrôle', icon: Activity },
            { id: 'analysis', label: 'Analyses', icon: FileBarChart },
            { id: 'revisions', label: 'Révisions', icon: GitBranch },
            { id: 'reports', label: 'Rapports', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calculator className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">Total</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.totalBudgets}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Budgets créés
              </div>
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">Budget</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {(stats.totalBudgeted / 1000000).toFixed(1)}M
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Total budgété
              </div>
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Percent className="w-6 h-6 text-orange-600" />
                </div>
                <span className={`text-xs ${stats.executionRate > 80 ? 'text-orange-600' : 'text-green-600'}`}>
                  {stats.executionRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.executionRate.toFixed(1)}%
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Taux d'exécution
              </div>
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <span className="text-xs text-red-600">{stats.alertsCount} actives</span>
              </div>
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                {stats.alertsCount}
              </div>
              <div className="text-sm text-[var(--color-text-secondary)] mt-1">
                Alertes budgétaires
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Évolution Budget vs Réel
              </h3>
              <Line data={evolutionChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>

            <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                Répartition par Catégorie
              </h3>
              <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: false }} height={300} />
            </div>
          </div>

          {/* Budget Controls */}
          <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="p-6 border-b border-[var(--color-border)]">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Contrôles Budgétaires
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {controls.map(control => (
                  <div key={control.id} className="flex items-center justify-between p-4 bg-[var(--color-background)] rounded-lg">
                    <div className="flex items-center gap-4">
                      {getControlStatusIcon(control.status)}
                      <div>
                        <div className="font-medium text-[var(--color-text-primary)]">
                          {control.description}
                        </div>
                        <div className="text-sm text-[var(--color-text-secondary)]">
                          {control.message}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-semibold ${
                        control.status === 'OK' ? 'text-green-600' :
                        control.status === 'Alerte' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {control.value > 0 ? '+' : ''}{control.value}%
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        Seuil: {control.threshold}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-text-secondary)] w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher un budget..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="all">Tous les types</option>
              <option value="Annuel">Annuel</option>
              <option value="Trimestriel">Trimestriel</option>
              <option value="Mensuel">Mensuel</option>
              <option value="Projet">Projet</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="all">Tous les statuts</option>
              <option value="Brouillon">Brouillon</option>
              <option value="Validé">Validé</option>
              <option value="En cours">En cours</option>
              <option value="Clôturé">Clôturé</option>
              <option value="Révisé">Révisé</option>
            </select>
          </div>

          {/* Budgets List */}
          <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Budget</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Type</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Période</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Statut</th>
                    <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">Budgété</th>
                    <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">Réalisé</th>
                    <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">Variance</th>
                    <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">Taux</th>
                    <th className="text-center p-4 font-medium text-[var(--color-text-secondary)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBudgets.map(budget => (
                    <tr key={budget.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-[var(--color-text-primary)]">
                            {budget.name}
                          </div>
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            {budget.description}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] rounded text-sm">
                          {budget.type}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {new Date(budget.startDate).toLocaleDateString()} - {new Date(budget.endDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-sm ${getStatusColor(budget.status)}`}>
                          {budget.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-[var(--color-text-primary)]">
                        {(budget.totalBudget / 1000000).toFixed(2)}M
                      </td>
                      <td className="p-4 text-right font-medium text-[var(--color-text-primary)]">
                        {(budget.totalActual / 1000000).toFixed(2)}M
                      </td>
                      <td className={`p-4 text-right font-medium ${getVarianceColor(budget.variancePercent)}`}>
                        {budget.variancePercent > 0 ? '+' : ''}{budget.variancePercent.toFixed(1)}%
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[var(--color-text-primary)]">
                            {((budget.totalActual / budget.totalBudget) * 100).toFixed(0)}%
                          </span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[var(--color-primary)] h-2 rounded-full"
                              style={{ width: `${Math.min(100, (budget.totalActual / budget.totalBudget) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedBudget(budget)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Voir détails"
                          >
                            <Eye className="w-4 h-4 text-[var(--color-text-secondary)]" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingBudget(budget);
                              setShowBudgetModal(true);
                            }}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleDuplicateBudget(budget)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Dupliquer"
                          >
                            <Copy className="w-4 h-4 text-green-600" />
                          </button>
                          {budget.status === 'Brouillon' && (
                            <button
                              onClick={() => handleValidateBudget(budget)}
                              className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                              title="Valider"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBudget(budget.id)}
                            className="p-1 hover:bg-[var(--color-background)] rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Performance Radar */}
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Performance par Département
            </h3>
            <div className="h-96">
              <Radar data={performanceRadarData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>

          {/* Budget Details */}
          {selectedBudget && (
            <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
              <div className="p-6 border-b border-[var(--color-border)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  Détails: {selectedBudget.name}
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Categories */}
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-4">
                      Catégories Budgétaires
                    </h4>
                    <div className="space-y-3">
                      {selectedBudget.categories.map(category => (
                        <div key={category.id} className="border border-[var(--color-border)] rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-medium text-[var(--color-text-primary)]">
                              {category.code} - {category.name}
                            </div>
                            <span className={`px-2 py-1 rounded text-sm ${
                              category.type === 'Revenus' ? 'bg-green-100 text-green-800' :
                              category.type === 'Charges' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {category.type}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-[var(--color-text-secondary)]">Budgété:</span>
                              <span className="ml-2 font-medium text-[var(--color-text-primary)]">
                                {(category.budgeted / 1000000).toFixed(2)}M
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--color-text-secondary)]">Réalisé:</span>
                              <span className="ml-2 font-medium text-[var(--color-text-primary)]">
                                {(category.actual / 1000000).toFixed(2)}M
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--color-text-secondary)]">Disponible:</span>
                              <span className="ml-2 font-medium text-green-600">
                                {(category.available / 1000000).toFixed(2)}M
                              </span>
                            </div>
                            <div>
                              <span className="text-[var(--color-text-secondary)]">Variance:</span>
                              <span className={`ml-2 font-medium ${getVarianceColor(category.variancePercent)}`}>
                                {category.variancePercent > 0 ? '+' : ''}{category.variancePercent.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  (category.actual / category.budgeted) > 0.9 ? 'bg-red-500' :
                                  (category.actual / category.budgeted) > 0.7 ? 'bg-orange-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(100, (category.actual / category.budgeted) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Monthly Allocations */}
                  <div>
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-4">
                      Allocations Mensuelles
                    </h4>
                    <div className="space-y-2">
                      {selectedBudget.allocations.map(allocation => (
                        <div key={allocation.id} className="flex items-center justify-between p-3 bg-[var(--color-background)] rounded-lg">
                          <div className="font-medium text-[var(--color-text-primary)]">
                            {allocation.month}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <div className="text-green-600">
                              <ArrowUpRight className="w-4 h-4 inline" />
                              {(allocation.actualRevenues / 1000000).toFixed(1)}M
                            </div>
                            <div className="text-red-600">
                              <ArrowDownRight className="w-4 h-4 inline" />
                              {(allocation.actualExpenses / 1000000).toFixed(1)}M
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revisions Tab */}
      {activeTab === 'revisions' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Historique des Révisions
            </h3>
            <button
              onClick={() => setShowRevisionModal(true)}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Nouvelle Révision
            </button>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Date</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Budget</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Version</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Motif</th>
                    <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">Montant Précédent</th>
                    <th className="text-right p-4 font-medium text-[var(--color-text-secondary)]">Nouveau Montant</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Impact</th>
                    <th className="text-left p-4 font-medium text-[var(--color-text-secondary)]">Approuvé par</th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map(revision => (
                    <tr key={revision.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {new Date(revision.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {budgets.find(b => b.id === revision.budgetId)?.name}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary)] rounded text-sm">
                          v{revision.version}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--color-text-primary)]">
                        {revision.reason}
                      </td>
                      <td className="p-4 text-right font-medium text-[var(--color-text-primary)]">
                        {(revision.previousAmount / 1000000).toFixed(2)}M
                      </td>
                      <td className="p-4 text-right font-medium text-[var(--color-text-primary)]">
                        {(revision.newAmount / 1000000).toFixed(2)}M
                      </td>
                      <td className="p-4">
                        <span className={`font-medium ${
                          revision.newAmount > revision.previousAmount ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {revision.impact}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--color-text-secondary)]">
                        {revision.approvedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
                {editingBudget ? 'Modifier le Budget' : 'Nouveau Budget'}
              </h2>
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                }}
                className="p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Nom du Budget
                  </label>
                  <input
                    type="text"
                    defaultValue={editingBudget?.name}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                    placeholder="Ex: Budget Général 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Type de Budget
                  </label>
                  <select
                    defaultValue={editingBudget?.type || 'Annuel'}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  >
                    <option value="Annuel">Annuel</option>
                    <option value="Trimestriel">Trimestriel</option>
                    <option value="Mensuel">Mensuel</option>
                    <option value="Projet">Projet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  defaultValue={editingBudget?.description}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  rows={3}
                  placeholder="Description du budget..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Date de Début
                  </label>
                  <input
                    type="date"
                    defaultValue={editingBudget?.startDate}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                    Date de Fin
                  </label>
                  <input
                    type="date"
                    defaultValue={editingBudget?.endDate}
                    className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Départements Concernés
                </label>
                <select
                  multiple
                  defaultValue={editingBudget?.departments}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                >
                  <option value="Commercial">Commercial</option>
                  <option value="Production">Production</option>
                  <option value="Administration">Administration</option>
                  <option value="R&D">R&D</option>
                  <option value="Marketing">Marketing</option>
                  <option value="IT">IT</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                  Montant Total Budgété
                </label>
                <input
                  type="number"
                  defaultValue={editingBudget?.totalBudget}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)]"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                }}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingBudget ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteBudgetingModule;