import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, TrendingUp, FileText, Download, Calendar,
  Filter, Eye, Share2, Settings, Target, DollarSign,
  Users, Package, CreditCard, Activity, PieChart,
  LineChart, ArrowUpRight, ArrowDownRight, RefreshCw,
  Clock, CheckCircle, AlertCircle, Star, Globe
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Enregistrer tous les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Report {
  id: string;
  title: string;
  description: string;
  category: 'financial' | 'sales' | 'customers' | 'inventory' | 'performance';
  type: 'chart' | 'table' | 'dashboard';
  lastGenerated: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'scheduled' | 'draft';
  views: number;
  exports: number;
}

interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  category: string;
}

const ModernReportsAndAnalytics: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // KPIs principaux
  const kpis: KPI[] = [
    {
      id: '1',
      name: 'Chiffre d\'affaires',
      value: 524320,
      target: 500000,
      unit: '€',
      trend: 'up',
      change: 12.5,
      category: 'financial'
    },
    {
      id: '2',
      name: 'Marge brute',
      value: 65.8,
      target: 70,
      unit: '%',
      trend: 'down',
      change: -2.3,
      category: 'financial'
    },
    {
      id: '3',
      name: 'Nouveaux clients',
      value: 143,
      target: 120,
      unit: '',
      trend: 'up',
      change: 19.2,
      category: 'sales'
    },
    {
      id: '4',
      name: 'Satisfaction client',
      value: 4.7,
      target: 4.5,
      unit: '/5',
      trend: 'up',
      change: 4.4,
      category: 'customers'
    },
    {
      id: '5',
      name: 'Rotation stock',
      value: 8.2,
      target: 10,
      unit: 'x/an',
      trend: 'stable',
      change: 0.8,
      category: 'inventory'
    },
    {
      id: '6',
      name: 'Productivité',
      value: 92.3,
      target: 95,
      unit: '%',
      trend: 'up',
      change: 3.2,
      category: 'performance'
    }
  ];

  // Rapports disponibles
  const reports: Report[] = [
    {
      id: '1',
      title: 'Analyse des ventes',
      description: 'Performance commerciale détaillée par produit et période',
      category: 'sales',
      type: 'dashboard',
      lastGenerated: '2024-01-15T10:30:00',
      frequency: 'monthly',
      status: 'active',
      views: 156,
      exports: 23
    },
    {
      id: '2',
      title: 'États financiers',
      description: 'Bilan, compte de résultat et flux de trésorerie',
      category: 'financial',
      type: 'table',
      lastGenerated: '2024-01-15T08:15:00',
      frequency: 'monthly',
      status: 'active',
      views: 89,
      exports: 45
    },
    {
      id: '3',
      title: 'Analyse clients',
      description: 'Segmentation et comportement des clients',
      category: 'customers',
      type: 'chart',
      lastGenerated: '2024-01-14T16:45:00',
      frequency: 'weekly',
      status: 'active',
      views: 234,
      exports: 12
    },
    {
      id: '4',
      title: 'Suivi des stocks',
      description: 'Niveau des stocks et prévisions de réapprovisionnement',
      category: 'inventory',
      type: 'dashboard',
      lastGenerated: '2024-01-14T14:20:00',
      frequency: 'weekly',
      status: 'scheduled',
      views: 67,
      exports: 8
    },
    {
      id: '5',
      title: 'Performance équipes',
      description: 'Productivité et objectifs par département',
      category: 'performance',
      type: 'chart',
      lastGenerated: '2024-01-13T11:30:00',
      frequency: 'monthly',
      status: 'draft',
      views: 12,
      exports: 2
    }
  ];

  // Configuration des graphiques
  const chartColors = {
    primary: 'rgba(106, 138, 130, 1)',
    primaryLight: 'rgba(106, 138, 130, 0.1)',
    secondary: 'rgba(184, 115, 51, 1)',
    secondaryLight: 'rgba(184, 115, 51, 0.1)',
    success: 'rgba(34, 197, 94, 1)',
    successLight: 'rgba(34, 197, 94, 0.1)',
    error: 'rgba(239, 68, 68, 1)',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    info: 'rgba(59, 130, 246, 1)',
    infoLight: 'rgba(59, 130, 246, 0.1)',
    warning: 'rgba(245, 158, 11, 1)',
    warningLight: 'rgba(245, 158, 11, 0.1)'
  };

  // Données pour les graphiques d'exemple
  const salesTrendData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: '2024',
        data: [65000, 72000, 68000, 85000, 92000, 88000, 95000, 102000, 98000, 105000, 112000, 125000],
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primaryLight,
        fill: true,
        tension: 0.4
      },
      {
        label: '2023',
        data: [58000, 63000, 61000, 75000, 82000, 79000, 85000, 91000, 88000, 94000, 99000, 108000],
        borderColor: chartColors.secondary,
        backgroundColor: chartColors.secondaryLight,
        fill: false,
        borderDash: [5, 5]
      }
    ]
  };

  const categoryBreakdownData = {
    labels: ['Produits A', 'Produits B', 'Produits C', 'Services', 'Consultations'],
    datasets: [
      {
        data: [35, 25, 20, 15, 5],
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.info,
          chartColors.success,
          chartColors.warning
        ]
      }
    ]
  };

  const performanceRadarData = {
    labels: ['Ventes', 'Marketing', 'Service Client', 'Qualité', 'Innovation', 'Efficacité'],
    datasets: [
      {
        label: 'Performance actuelle',
        data: [85, 92, 78, 88, 75, 90],
        backgroundColor: chartColors.primaryLight,
        borderColor: chartColors.primary,
        borderWidth: 2
      },
      {
        label: 'Objectifs',
        data: [90, 85, 80, 90, 85, 95],
        backgroundColor: chartColors.secondaryLight,
        borderColor: chartColors.secondary,
        borderWidth: 2,
        borderDash: [5, 5]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(25, 25, 25, 0.95)',
        padding: 10,
        borderRadius: 6
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { size: 10 } }
      }
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      financial: DollarSign,
      sales: TrendingUp,
      customers: Users,
      inventory: Package,
      performance: Target
    };
    return icons[category as keyof typeof icons] || BarChart3;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Actif' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Programmé' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon' }
    };
    const badge = badges[status as keyof typeof badges];
    return (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getFrequencyBadge = (frequency: string) => {
    const badges = {
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
      monthly: 'Mensuel',
      quarterly: 'Trimestriel',
      yearly: 'Annuel'
    };
    return badges[frequency as keyof typeof badges] || frequency;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Rapports & Analytics
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Analyses et tableaux de bord personnalisés
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <ModernButton
            variant="outline"
            size="sm"
            leftIcon={<Settings className="w-4 h-4" />}
          >
            Personnaliser
          </ModernButton>
          <ModernButton
            variant="primary"
            size="sm"
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Nouveau rapport
          </ModernButton>
        </div>
      </div>

      {/* KPIs Grid */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
          Indicateurs Clés de Performance (KPI)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi) => {
            const Icon = getCategoryIcon(kpi.category);
            const progress = Math.min((kpi.value / kpi.target) * 100, 100);
            
            return (
              <ModernCard key={kpi.id} className="p-4" hoverable>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-[var(--color-primary-light)] rounded-lg">
                    <Icon className="w-4 h-4 text-[var(--color-primary)]" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    kpi.trend === 'up' ? 'text-green-500' :
                    kpi.trend === 'down' ? 'text-red-500' :
                    'text-gray-500'
                  }`}>
                    {kpi.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                    {kpi.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                  </div>
                </div>
                
                <h4 className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">
                  {kpi.name}
                </h4>
                
                <p className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                  {kpi.unit === '€' ? '€' : ''}{kpi.value.toLocaleString('fr-FR')}{kpi.unit === '€' ? '' : kpi.unit}
                </p>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-tertiary)]">Objectif</span>
                    <span className="text-[var(--color-text-secondary)]">
                      {kpi.unit === '€' ? '€' : ''}{kpi.target.toLocaleString('fr-FR')}{kpi.unit === '€' ? '' : kpi.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        progress >= 100 ? 'bg-green-500' :
                        progress >= 80 ? 'bg-[var(--color-primary)]' :
                        progress >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </ModernCard>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <ModernCard>
          <CardHeader
            title="Tendance des ventes"
            subtitle="Évolution mensuelle"
            icon={LineChart}
          />
          <CardBody>
            <div className="h-60">
              <Line data={salesTrendData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>

        {/* Category Breakdown */}
        <ModernCard>
          <CardHeader
            title="Répartition par catégorie"
            subtitle="Chiffre d'affaires"
            icon={PieChart}
          />
          <CardBody>
            <div className="h-60">
              <Doughnut 
                data={categoryBreakdownData} 
                options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 10,
                        usePointStyle: true,
                        font: { size: 10 }
                      }
                    }
                  }
                }} 
              />
            </div>
          </CardBody>
        </ModernCard>

        {/* Performance Radar */}
        <ModernCard>
          <CardHeader
            title="Performance globale"
            subtitle="Radar des KPIs"
            icon={Target}
          />
          <CardBody>
            <div className="h-60">
              <Radar 
                data={performanceRadarData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: { size: 11 }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(25, 25, 25, 0.95)',
                      padding: 10,
                      borderRadius: 6
                    }
                  },
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 100,
                      ticks: { display: false },
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                      }
                    }
                  }
                }} 
              />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Reports Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Rapports disponibles
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-white border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">Toutes catégories</option>
              <option value="financial">Financier</option>
              <option value="sales">Ventes</option>
              <option value="customers">Clients</option>
              <option value="inventory">Stock</option>
              <option value="performance">Performance</option>
            </select>
            <button className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors">
              <Filter className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports
            .filter(report => selectedCategory === 'all' || report.category === selectedCategory)
            .map((report) => {
              const Icon = getCategoryIcon(report.category);
              return (
                <ModernCard key={report.id} hoverable>
                  <CardHeader
                    title={report.title}
                    subtitle={report.description}
                    icon={Icon}
                    action={
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Voir">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Partager">
                          <Share2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Télécharger">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    }
                  />
                  <CardBody>
                    <div className="flex items-center justify-between mb-3">
                      {getStatusBadge(report.status)}
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        {getFrequencyBadge(report.frequency)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)]">
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{report.views} vues</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{report.exports} exports</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(report.lastGenerated).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </ModernCard>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default ModernReportsAndAnalytics;