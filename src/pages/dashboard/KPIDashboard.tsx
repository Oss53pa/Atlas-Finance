import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Target, TrendingUp, TrendingDown, Activity, Gauge, Award,
  CheckCircle, XCircle, AlertTriangle, Info, Clock, Calendar,
  Filter, Download, RefreshCw, Settings, BarChart3, LineChart,
  PieChart, Users, DollarSign, ShoppingCart, Package, Zap,
  ThumbsUp, Star, Flag, Layers, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
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

interface KPI {
  id: string;
  name: string;
  category: string;
  current: number;
  target: number;
  previous: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status: 'success' | 'warning' | 'danger';
  achievement: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

const KPIDashboard: React.FC = () => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // KPI Data
  const kpis: KPI[] = [
    // Financial KPIs
    {
      id: 'kpi-1',
      name: 'Chiffre d\'Affaires',
      category: 'Financier',
      current: 1250000,
      target: 1200000,
      previous: 1080000,
      unit: '€',
      trend: 'up',
      status: 'success',
      achievement: 104.2,
      importance: 'critical',
      frequency: 'monthly'
    },
    {
      id: 'kpi-2',
      name: 'Marge Brute',
      category: 'Financier',
      current: 42.5,
      target: 40,
      previous: 38.2,
      unit: '%',
      trend: 'up',
      status: 'success',
      achievement: 106.3,
      importance: 'critical',
      frequency: 'monthly'
    },
    {
      id: 'kpi-3',
      name: 'Coût d\'Acquisition Client',
      category: 'Financier',
      current: 125,
      target: 100,
      previous: 145,
      unit: '€',
      trend: 'down',
      status: 'warning',
      achievement: 80,
      importance: 'high',
      frequency: 'monthly'
    },
    // Commercial KPIs
    {
      id: 'kpi-4',
      name: 'Nouveaux Clients',
      category: 'Commercial',
      current: 145,
      target: 150,
      previous: 120,
      unit: '',
      trend: 'up',
      status: 'warning',
      achievement: 96.7,
      importance: 'high',
      frequency: 'monthly'
    },
    {
      id: 'kpi-5',
      name: 'Taux de Conversion',
      category: 'Commercial',
      current: 24.5,
      target: 25,
      previous: 22.1,
      unit: '%',
      trend: 'up',
      status: 'success',
      achievement: 98,
      importance: 'high',
      frequency: 'weekly'
    },
    {
      id: 'kpi-6',
      name: 'Valeur Panier Moyen',
      category: 'Commercial',
      current: 285,
      target: 300,
      previous: 265,
      unit: '€',
      trend: 'up',
      status: 'warning',
      achievement: 95,
      importance: 'medium',
      frequency: 'daily'
    },
    // Opérationnel KPIs
    {
      id: 'kpi-7',
      name: 'Délai de Livraison',
      category: 'Opérationnel',
      current: 3.2,
      target: 3,
      previous: 3.8,
      unit: 'jours',
      trend: 'down',
      status: 'warning',
      achievement: 93.8,
      importance: 'high',
      frequency: 'daily'
    },
    {
      id: 'kpi-8',
      name: 'Taux de Qualité',
      category: 'Opérationnel',
      current: 98.5,
      target: 99,
      previous: 97.2,
      unit: '%',
      trend: 'up',
      status: 'warning',
      achievement: 99.5,
      importance: 'critical',
      frequency: 'daily'
    },
    {
      id: 'kpi-9',
      name: 'Productivité',
      category: 'Opérationnel',
      current: 88,
      target: 85,
      previous: 82,
      unit: '%',
      trend: 'up',
      status: 'success',
      achievement: 103.5,
      importance: 'high',
      frequency: 'weekly'
    },
    // RH KPIs
    {
      id: 'kpi-10',
      name: 'Satisfaction Employés',
      category: 'RH',
      current: 85,
      target: 90,
      previous: 82,
      unit: '%',
      trend: 'up',
      status: 'warning',
      achievement: 94.4,
      importance: 'high',
      frequency: 'quarterly'
    },
    {
      id: 'kpi-11',
      name: 'Taux de Rotation',
      category: 'RH',
      current: 8,
      target: 10,
      previous: 12,
      unit: '%',
      trend: 'down',
      status: 'success',
      achievement: 120,
      importance: 'medium',
      frequency: 'quarterly'
    },
    {
      id: 'kpi-12',
      name: 'Formation par Employé',
      category: 'RH',
      current: 24,
      target: 20,
      previous: 18,
      unit: 'heures',
      trend: 'up',
      status: 'success',
      achievement: 120,
      importance: 'low',
      frequency: 'quarterly'
    }
  ];

  // Filter KPIs
  const filteredKPIs = selectedCategory === 'all' 
    ? kpis 
    : kpis.filter(kpi => kpi.category === selectedCategory);

  // Categories for filtering
  const categories = ['all', 'Financier', 'Commercial', 'Opérationnel', 'RH'];

  // KPI by Category Chart
  const kpiCategoryData = {
    labels: ['Financier', 'Commercial', 'Opérationnel', 'RH'],
    datasets: [{
      label: 'Nombre de KPIs',
      data: [
        kpis.filter(k => k.category === 'Financier').length,
        kpis.filter(k => k.category === 'Commercial').length,
        kpis.filter(k => k.category === 'Opérationnel').length,
        kpis.filter(k => k.category === 'RH').length
      ],
      backgroundColor: [
        'var(--color-primary)',
        'var(--color-success)',
        'var(--color-warning)',
        'var(--color-info)'
      ]
    }]
  };

  // Achievement Distribution
  const achievementData = {
    labels: ['> 100%', '90-100%', '80-90%', '< 80%'],
    datasets: [{
      data: [
        kpis.filter(k => k.achievement > 100).length,
        kpis.filter(k => k.achievement >= 90 && k.achievement <= 100).length,
        kpis.filter(k => k.achievement >= 80 && k.achievement < 90).length,
        kpis.filter(k => k.achievement < 80).length
      ],
      backgroundColor: [
        'var(--color-success)',
        'var(--color-info)',
        'var(--color-warning)',
        'var(--color-danger)'
      ]
    }]
  };

  // Performance Radar
  const performanceRadarData = {
    labels: ['Financier', 'Commercial', 'Opérationnel', 'RH', 'Innovation', 'Qualité'],
    datasets: [{
      label: 'Performance Actuelle',
      data: [92, 85, 88, 82, 78, 95],
      backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
      borderColor: 'var(--color-primary)',
      pointBackgroundColor: 'var(--color-primary)'
    },
    {
      label: 'Objectif',
      data: [90, 90, 85, 85, 80, 95],
      backgroundColor: 'rgba(var(--color-secondary-rgb), 0.2)',
      borderColor: 'var(--color-secondary)',
      pointBackgroundColor: 'var(--color-secondary)'
    }]
  };

  // Trend Line Chart
  const trendData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
    datasets: [
      {
        label: 'Score Global KPI',
        data: [78, 82, 85, 88, 91, 94],
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Objectif',
        data: [85, 85, 85, 90, 90, 90],
        borderColor: 'var(--color-secondary)',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false
      }
    ]
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'danger': return <XCircle className="w-5 h-5 text-[var(--color-error)]" />;
      default: return <Info className="w-5 h-5 text-[var(--color-text-secondary)]" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />;
      default: return <Activity className="w-4 h-4 text-[var(--color-text-secondary)]" />;
    }
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'critical': return 'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]';
      case 'high': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]';
      case 'medium': return 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]';
      case 'low': return 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]';
      default: return 'bg-[var(--color-background-hover)] text-[var(--color-text-primary)]';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '€') {
      return new Intl.NumberFormat('fr-FR', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    }
    return `${value}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`;
  };

  // Calculate global score
  const globalScore = Math.round(
    kpis.reduce((acc, kpi) => acc + kpi.achievement, 0) / kpis.length
  );

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Tableau de Bord KPI
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              Suivi en temps réel des indicateurs clés de performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={dateRange.startDate ? 'custom' : 'month'
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="day">{t('common.today')}</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <div className="flex items-center bg-[var(--color-card-bg)] border border-[var(--color-border)] rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'} rounded-l-lg transition-colors`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)]'} rounded-r-lg transition-colors`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
            <button className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors" aria-label="Actualiser">
              <RefreshCw className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
            <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Global Score Card */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] rounded-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Score Global de Performance</h2>
              <p className="opacity-90">Moyenne pondérée de tous les KPIs</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{globalScore}%</div>
              <div className="flex items-center gap-2 mt-2">
                {globalScore >= 90 ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Excellent</span>
                  </>
                ) : globalScore >= 80 ? (
                  <>
                    <ThumbsUp className="w-5 h-5" />
                    <span>Bon</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    <span>À améliorer</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">KPIs Atteints</span>
              <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {kpis.filter(k => k.achievement >= 100).length}/{kpis.length}
            </div>
            <div className="text-xs text-[var(--color-success)] mt-1">
              {Math.round((kpis.filter(k => k.achievement >= 100).length / kpis.length) * 100)}% de réussite
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">En Alerte</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {kpis.filter(k => k.status === 'warning').length}
            </div>
            <div className="text-xs text-[var(--color-warning)] mt-1">
              Nécessitent une attention
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Critiques</span>
              <Flag className="w-4 h-4 text-[var(--color-error)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {kpis.filter(k => k.importance === 'critical').length}
            </div>
            <div className="text-xs text-[var(--color-text-secondary)] mt-1">
              KPIs prioritaires
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Tendance Positive</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {kpis.filter(k => k.trend === 'up').length}
            </div>
            <div className="text-xs text-[var(--color-success)] mt-1">
              En progression
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-card-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-background)]'
              }`}
            >
              {category === 'all' ? 'Tous' : category}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {filteredKPIs.map(kpi => (
            <div key={kpi.id} className="bg-[var(--color-card-bg)] rounded-lg p-4 border border-[var(--color-border)]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-[var(--color-text-primary)] text-sm">
                    {kpi.name}
                  </h4>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs mt-1 ${getImportanceColor(kpi.importance)}`}>
                    {kpi.importance}
                  </span>
                </div>
                {getStatusIcon(kpi.status)}
              </div>

              <div className="mb-3">
                <div className="text-2xl font-bold text-[var(--color-text-primary)]">
                  {formatValue(kpi.current, kpi.unit)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getTrendIcon(kpi.trend)}
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    vs {formatValue(kpi.previous, kpi.unit)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">Objectif</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {formatValue(kpi.target, kpi.unit)}
                  </span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      kpi.achievement >= 100 ? 'bg-[var(--color-success)]' :
                      kpi.achievement >= 90 ? 'bg-[var(--color-primary)]' :
                      kpi.achievement >= 80 ? 'bg-[var(--color-warning)]' :
                      'bg-[var(--color-error)]'
                    }`}
                    style={{ width: `${Math.min(100, kpi.achievement)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-text-secondary)]">Réalisation</span>
                  <span className={`font-medium ${
                    kpi.achievement >= 100 ? 'text-[var(--color-success)]' :
                    kpi.achievement >= 90 ? 'text-[var(--color-primary)]' :
                    kpi.achievement >= 80 ? 'text-[var(--color-warning)]' :
                    'text-[var(--color-error)]'
                  }`}>
                    {kpi.achievement.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-secondary)]">KPI</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-secondary)]">Catégorie</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">Importance</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">Actuel</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">Objectif</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">Tendance</th>
                  <th className="text-right py-3 px-4 font-medium text-[var(--color-text-secondary)]">Réalisation</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {filteredKPIs.map(kpi => (
                  <tr key={kpi.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {kpi.name}
                    </td>
                    <td className="py-3 px-4 text-[var(--color-text-secondary)]">
                      {kpi.category}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs ${getImportanceColor(kpi.importance)}`}>
                        {kpi.importance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[var(--color-text-primary)]">
                      {formatValue(kpi.current, kpi.unit)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                      {formatValue(kpi.target, kpi.unit)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getTrendIcon(kpi.trend)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 bg-[var(--color-border)] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              kpi.achievement >= 100 ? 'bg-[var(--color-success)]' :
                              kpi.achievement >= 90 ? 'bg-[var(--color-primary)]' :
                              kpi.achievement >= 80 ? 'bg-[var(--color-warning)]' :
                              'bg-[var(--color-error)]'
                            }`}
                            style={{ width: `${Math.min(100, kpi.achievement)}%` }}
                          />
                        </div>
                        <span className={`font-medium ${
                          kpi.achievement >= 100 ? 'text-[var(--color-success)]' :
                          kpi.achievement >= 90 ? 'text-[var(--color-primary)]' :
                          kpi.achievement >= 80 ? 'text-[var(--color-warning)]' :
                          'text-[var(--color-error)]'
                        }`}>
                          {kpi.achievement.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatusIcon(kpi.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Évolution du Score Global
          </h3>
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Line data={trendData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Performance par Domaine
          </h3>
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Radar data={performanceRadarData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Répartition par Catégorie
          </h3>
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Doughnut data={kpiCategoryData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Distribution des Performances
          </h3>
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Bar data={achievementData} options={{ 
              responsive: true, 
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false }
              }
            }} />
          </div>
        </div>
      </div>

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onPeriodSelect={(period) => {
          setDateRange(period);
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default KPIDashboard;