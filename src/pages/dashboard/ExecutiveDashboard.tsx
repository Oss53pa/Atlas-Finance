import React, { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Target, Award,
  Activity, Briefcase, Globe, BarChart3, PieChart, LineChart,
  ArrowUpRight, ArrowDownRight, Calendar, Clock, AlertCircle,
  CheckCircle, XCircle, Info, Filter, Download, RefreshCw
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

const ExecutiveDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  // Executive KPIs
  const executiveMetrics = {
    revenue: {
      current: 12500000,
      previous: 10800000,
      target: 12000000,
      growth: 15.7,
      achievement: 104.2
    },
    profitability: {
      grossMargin: 42.5,
      netMargin: 18.3,
      ebitda: 2287500,
      roe: 22.5,
      roa: 15.8
    },
    operational: {
      customerSatisfaction: 92,
      employeeEngagement: 85,
      marketShare: 18.5,
      innovationIndex: 78,
      operationalEfficiency: 88
    }
  };

  // Strategic Goals Progress
  const strategicGoals = [
    { name: 'Expansion Marché', progress: 78, status: 'on-track', target: '100M€' },
    { name: 'Transformation Digitale', progress: 65, status: 'at-risk', target: 'Q4 2024' },
    { name: 'Excellence Opérationnelle', progress: 82, status: 'on-track', target: '95%' },
    { name: 'Développement Durable', progress: 45, status: 'delayed', target: '2025' },
    { name: 'Innovation Produit', progress: 90, status: 'ahead', target: '10 lancements' }
  ];

  // Department Performance
  const departmentPerformance = [
    { name: 'Commercial', score: 92, budget: 95, headcount: 48, efficiency: 88 },
    { name: 'Production', score: 85, budget: 78, headcount: 125, efficiency: 92 },
    { name: 'R&D', score: 78, budget: 102, headcount: 32, efficiency: 75 },
    { name: 'Marketing', score: 88, budget: 88, headcount: 22, efficiency: 85 },
    { name: 'Finance', score: 95, budget: 92, headcount: 18, efficiency: 94 },
    { name: 'RH', score: 82, budget: 85, headcount: 15, efficiency: 80 }
  ];

  // Revenue Trend Data
  const revenueTrendData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Revenu Réel',
        data: [950000, 980000, 1020000, 1050000, 1080000, 1100000, 1120000, 1150000, 1180000, 1200000, 1220000, 1250000],
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Objectif',
        data: [1000000, 1000000, 1000000, 1100000, 1100000, 1100000, 1200000, 1200000, 1200000, 1200000, 1200000, 1200000],
        borderColor: 'var(--color-secondary)',
        borderDash: [5, 5],
        tension: 0.4,
        fill: false
      }
    ]
  };

  // Market Position Radar
  const marketPositionData = {
    labels: ['Prix', 'Qualité', 'Innovation', 'Service', 'Délais', 'Réputation'],
    datasets: [
      {
        label: 'Notre Position',
        data: [75, 90, 85, 88, 82, 92],
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
        borderColor: 'var(--color-primary)',
        pointBackgroundColor: 'var(--color-primary)'
      },
      {
        label: 'Moyenne Marché',
        data: [70, 75, 70, 75, 80, 78],
        backgroundColor: 'rgba(var(--color-secondary-rgb), 0.2)',
        borderColor: 'var(--color-secondary)',
        pointBackgroundColor: 'var(--color-secondary)'
      }
    ]
  };

  // Profitability Breakdown mémorisé
  const profitabilityData = useMemo(() => ({
    labels: ['Ventes Produits', 'Services', 'Licences', 'Maintenance', 'Autres'],
    datasets: [{
      data: [45, 25, 15, 10, 5],
      backgroundColor: [
        'var(--color-primary)',
        'var(--color-success)',
        'var(--color-warning)',
        'var(--color-info)',
        'var(--color-secondary)'
      ]
    }]
  }), []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'text-green-600 bg-green-100';
      case 'on-track': return 'text-blue-600 bg-blue-100';
      case 'at-risk': return 'text-orange-600 bg-orange-100';
      case 'delayed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return <TrendingUp className="w-4 h-4" />;
      case 'on-track': return <CheckCircle className="w-4 h-4" />;
      case 'at-risk': return <AlertCircle className="w-4 h-4" />;
      case 'delayed': return <XCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
              Tableau de Bord Exécutif
            </h1>
            <p className="text-[var(--color-text-secondary)] mt-1">
              Vue stratégique et performance globale de l'entreprise
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={useCallback((e) => setSelectedPeriod(e.target.value), [])}
              className="px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-card-bg)] text-[var(--color-text-primary)]"
            >
              <option value="day">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors">
              <RefreshCw className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
            <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-xs text-green-600 font-medium">
                +{executiveMetrics.revenue.growth}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {(executiveMetrics.revenue.current / 1000000).toFixed(1)}M€
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] mt-1">
              Chiffre d'Affaires
            </div>
            <div className="mt-3 flex items-center text-xs">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${executiveMetrics.revenue.achievement}%` }}
                />
              </div>
              <span className="ml-2 text-[var(--color-text-secondary)]">
                {executiveMetrics.revenue.achievement}%
              </span>
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {executiveMetrics.profitability.netMargin}%
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {(executiveMetrics.profitability.ebitda / 1000000).toFixed(2)}M€
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] mt-1">
              EBITDA
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--color-text-secondary)]">Marge Brute:</span>
                <span className="ml-1 font-medium">{executiveMetrics.profitability.grossMargin}%</span>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">ROE:</span>
                <span className="ml-1 font-medium">{executiveMetrics.profitability.roe}%</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-xs text-purple-600 font-medium">
                NPS: 72
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {executiveMetrics.operational.customerSatisfaction}%
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] mt-1">
              Satisfaction Client
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--color-text-secondary)]">Engagement:</span>
                <span className="ml-1 font-medium">{executiveMetrics.operational.employeeEngagement}%</span>
              </div>
              <div>
                <span className="text-[var(--color-text-secondary)]">Efficacité:</span>
                <span className="ml-1 font-medium">{executiveMetrics.operational.operationalEfficiency}%</span>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Globe className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-xs text-orange-600 font-medium">
                +2.3pts
              </span>
            </div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {executiveMetrics.operational.marketShare}%
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] mt-1">
              Part de Marché
            </div>
            <div className="mt-3 flex items-center text-xs">
              <span className="text-[var(--color-text-secondary)]">Innovation Index:</span>
              <span className="ml-auto font-medium text-[var(--color-text-primary)]">
                {executiveMetrics.operational.innovationIndex}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategic Goals Progress - REMOVED
      <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] mb-6">
        <div className="p-6 border-b border-[var(--color-border)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <Target className="w-5 h-5" />
            Objectifs Stratégiques
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {strategicGoals.map((goal, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${getStatusColor(goal.status)}`}>
                  {getStatusIcon(goal.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {goal.name}
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)]">
                      {goal.target}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          goal.status === 'ahead' ? 'bg-green-500' :
                          goal.status === 'on-track' ? 'bg-blue-500' :
                          goal.status === 'at-risk' ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {goal.progress}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      */}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend */}
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Évolution du Chiffre d'Affaires
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Line 
              data={revenueTrendData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      padding: 15,
                      usePointStyle: true,
                      font: { size: 12 }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Market Position */}
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Position Concurrentielle
          </h3>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Radar 
              data={marketPositionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                    labels: {
                      padding: 15,
                      usePointStyle: true,
                      font: { size: 12 }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Department Performance - REMOVED
      <div className="bg-[var(--color-card-bg)] rounded-lg border border-[var(--color-border)] mb-6">
        <div className="p-6 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Performance par Département
            </h2>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-1 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text-primary)] text-sm"
            >
              <option value="all">Tous les départements</option>
              <option value="commercial">Commercial</option>
              <option value="production">Production</option>
              <option value="rd">R&D</option>
            </select>
          </div>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Département
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Score Global
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Budget
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Effectif
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--color-text-secondary)]">
                    Efficacité
                  </th>
                </tr>
              </thead>
              <tbody>
                {departmentPerformance.map((dept, index) => (
                  <tr key={index} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {dept.name}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              dept.score >= 90 ? 'bg-green-500' :
                              dept.score >= 75 ? 'bg-blue-500' :
                              dept.score >= 60 ? 'bg-orange-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${dept.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{dept.score}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${
                        dept.budget > 100 ? 'text-red-600' :
                        dept.budget > 90 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {dept.budget}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--color-text-primary)]">
                      {dept.headcount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        dept.efficiency >= 90 ? 'bg-green-100 text-green-700' :
                        dept.efficiency >= 80 ? 'bg-blue-100 text-blue-700' :
                        dept.efficiency >= 70 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {dept.efficiency}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      */}

      {/* Profitability Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Répartition des Revenus
          </h3>
          <div style={{ position: 'relative', height: '250px', width: '100%' }}>
            <Doughnut 
              data={profitabilityData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right' as const,
                    labels: {
                      padding: 15,
                      usePointStyle: true,
                      font: { size: 11 }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="lg:col-span-2 bg-[var(--color-card-bg)] rounded-lg p-6 border border-[var(--color-border)]">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Indicateurs Clés de Performance
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Taux de Conversion</span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">24.5%</div>
              <div className="text-xs text-green-600">+2.3% vs mois dernier</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Délai Moyen</span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">3.2 jours</div>
              <div className="text-xs text-green-600">-0.5j vs objectif</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Qualité</span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">98.5%</div>
              <div className="text-xs text-green-600">Top niveau</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Coût d'Acquisition</span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">125€</div>
              <div className="text-xs text-orange-600">+5€ vs objectif</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Rétention</span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">94%</div>
              <div className="text-xs text-green-600">+1% vs trimestre</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Objectifs Atteints</span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">87%</div>
              <div className="text-xs text-blue-600">12/14 objectifs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;