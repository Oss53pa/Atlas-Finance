import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
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
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const { adapter } = useData();

  // Executive metrics from DataContext
  const [liveExec, setLiveExec] = useState<{ revenue: number; expenses: number; treasury: number; grossMargin: number; netMargin: number; monthlyRevenue: number[] }>({ revenue: 0, expenses: 0, treasury: 0, grossMargin: 0, netMargin: 0, monthlyRevenue: new Array(12).fill(0) });

  useEffect(() => {
    const load = async () => {
      const entries = await adapter.getAll('journalEntries') as any[];
      let revenue = 0, expenses = 0, treasury = 0;
      const monthlyRevenue = new Array(12).fill(0);
      for (const e of entries) {
        const month = new Date(e.date).getMonth();
        for (const l of e.lines) {
          if (l.accountCode.startsWith('7')) {
            const val = l.credit - l.debit;
            revenue += val;
            if (month >= 0 && month < 12) monthlyRevenue[month] += val;
          }
          if (l.accountCode.startsWith('6')) expenses += l.debit - l.credit;
          if (l.accountCode.startsWith('5')) treasury += l.debit - l.credit;
        }
      }
      const grossMargin = revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0;
      const netMargin = revenue > 0 ? ((revenue - expenses) / revenue * 100) : 0;
      setLiveExec({ revenue, expenses, treasury, grossMargin, netMargin, monthlyRevenue });
    };
    load();
  }, [adapter]);

  const executiveMetrics = {
    revenue: {
      current: liveExec.revenue,
      previous: 0,
      target: 0,
      growth: 0,
      achievement: 0
    },
    profitability: {
      grossMargin: liveExec.grossMargin,
      netMargin: liveExec.netMargin,
      ebitda: liveExec.revenue - liveExec.expenses,
      roe: 0,
      roa: 0
    },
    operational: {
      customerSatisfaction: 0,
      employeeEngagement: 0,
      marketShare: 0,
      innovationIndex: 0,
      operationalEfficiency: 0
    }
  };

  // TODO: wire to real strategic planning module
  const strategicGoals: Array<{ name: string; progress: number; status: string; target: string }> = [];

  // TODO: wire to real department data
  const departmentPerformance: Array<{ name: string; score: number; budget: number; headcount: number; efficiency: number }> = [];

  // Revenue Trend Data from Dexie monthly aggregation
  const revenueTrendData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Revenu Réel',
        data: liveExec.monthlyRevenue,
        borderColor: 'var(--color-primary)',
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Market Position Radar — empty until real survey data available
  const marketPositionData = {
    labels: ['Prix', 'Qualité', 'Innovation', 'Service', 'Délais', 'Réputation'],
    datasets: [
      {
        label: 'Notre Position',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(var(--color-primary-rgb), 0.2)',
        borderColor: 'var(--color-primary)',
        pointBackgroundColor: 'var(--color-primary)'
      }
    ]
  };

  // Profitability Breakdown — empty until real product data available
  const profitabilityData = useMemo(() => ({
    labels: ['Pas de données'],
    datasets: [{
      data: [100],
      backgroundColor: ['var(--color-secondary)']
    }]
  }), []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'text-[var(--color-success)] bg-[var(--color-success-lighter)]';
      case 'on-track': return 'text-[var(--color-primary)] bg-[var(--color-primary-lighter)]';
      case 'at-risk': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      case 'delayed': return 'text-[var(--color-error)] bg-[var(--color-error-lighter)]';
      default: return 'text-[var(--color-text-primary)] bg-[var(--color-background-hover)]';
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
            <h1 className="text-lg font-bold text-[var(--color-text-primary)]">
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
              <option value="day">{t('common.today')}</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button className="p-2 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-background)] transition-colors" aria-label="Actualiser">
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
              <div className="p-2 bg-[var(--color-success-lighter)] rounded-lg">
                <DollarSign className="w-6 h-6 text-[var(--color-success)]" />
              </div>
              <span className="text-xs text-[var(--color-success)] font-medium">
                +{executiveMetrics.revenue.growth}%
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
              {(executiveMetrics.revenue.current / 1000000).toFixed(1)}M€
            </div>
            <div className="text-sm text-[var(--color-text-secondary)] mt-1">
              Chiffre d'Affaires
            </div>
            <div className="mt-3 flex items-center text-xs">
              <div className="flex-1 bg-[var(--color-border)] rounded-full h-2">
                <div 
                  className="bg-[var(--color-success)] h-2 rounded-full"
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
              <div className="p-2 bg-[var(--color-primary-lighter)] rounded-lg">
                <TrendingUp className="w-6 h-6 text-[var(--color-primary)]" />
              </div>
              <span className="text-xs text-[var(--color-primary)] font-medium">
                {executiveMetrics.profitability.netMargin}%
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
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
              <div className="p-2 bg-[var(--color-info-lighter)] rounded-lg">
                <Users className="w-6 h-6 text-[var(--color-info)]" />
              </div>
              <span className="text-xs text-[var(--color-info)] font-medium">
                NPS: 72
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
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
              <div className="p-2 bg-[var(--color-warning-lighter)] rounded-lg">
                <Globe className="w-6 h-6 text-[var(--color-warning)]" />
              </div>
              <span className="text-xs text-[var(--color-warning)] font-medium">
                +2.3pts
              </span>
            </div>
            <div className="text-lg font-bold text-[var(--color-text-primary)]">
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
                    <div className="flex-1 bg-[var(--color-border)] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          goal.status === 'ahead' ? 'bg-[var(--color-success)]' :
                          goal.status === 'on-track' ? 'bg-[var(--color-primary)]' :
                          goal.status === 'at-risk' ? 'bg-[var(--color-warning)]' :
                          'bg-[var(--color-error)]'
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
                        <div className="w-24 bg-[var(--color-border)] rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              dept.score >= 90 ? 'bg-[var(--color-success)]' :
                              dept.score >= 75 ? 'bg-[var(--color-primary)]' :
                              dept.score >= 60 ? 'bg-[var(--color-warning)]' :
                              'bg-[var(--color-error)]'
                            }`}
                            style={{ width: `${dept.score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{dept.score}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${
                        dept.budget > 100 ? 'text-[var(--color-error)]' :
                        dept.budget > 90 ? 'text-[var(--color-warning)]' :
                        'text-[var(--color-success)]'
                      }`}>
                        {dept.budget}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-[var(--color-text-primary)]">
                      {dept.headcount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        dept.efficiency >= 90 ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-dark)]' :
                        dept.efficiency >= 80 ? 'bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)]' :
                        dept.efficiency >= 70 ? 'bg-[var(--color-warning-lighter)] text-[var(--color-warning-dark)]' :
                        'bg-[var(--color-error-lighter)] text-[var(--color-error-dark)]'
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
              <div className="text-lg font-bold text-[var(--color-text-primary)]">24.5%</div>
              <div className="text-xs text-[var(--color-success)]">+2.3% vs mois dernier</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Délai Moyen</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text-primary)]">3.2 jours</div>
              <div className="text-xs text-[var(--color-success)]">-0.5j vs objectif</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Qualité</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text-primary)]">98.5%</div>
              <div className="text-xs text-[var(--color-success)]">Top niveau</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Coût d'Acquisition</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text-primary)]">125€</div>
              <div className="text-xs text-[var(--color-warning)]">+5€ vs objectif</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Rétention</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text-primary)]">94%</div>
              <div className="text-xs text-[var(--color-success)]">+1% vs trimestre</div>
            </div>
            <div className="p-4 bg-[var(--color-background)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-text-secondary)]">Objectifs Atteints</span>
              </div>
              <div className="text-lg font-bold text-[var(--color-text-primary)]">87%</div>
              <div className="text-xs text-[var(--color-primary)]">12/14 objectifs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;