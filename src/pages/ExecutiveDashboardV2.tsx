import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, ArrowUpRight, ArrowDownRight, 
  Calendar, Download, Filter, RefreshCw, Activity, Target, AlertCircle, AlertTriangle,
  CheckCircle, BarChart3, PieChart, Clock, Zap, Eye, Home, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
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
  Filler
} from 'chart.js';

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
  Filler
);

const ExecutiveDashboardV2: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(false);

  // KPIs style workspaces avec vraies couleurs WiseBook
  const executiveKPIs = [
    {
      title: 'Chiffre d\'Affaires',
      value: '€2.4M',
      change: '+15.3%',
      trend: 'up' as const,
      color: '#B87333',
      icon: DollarSign,
      description: 'vs mois précédent',
      path: '/financial-analysis-advanced'
    },
    {
      title: 'Clients Actifs',
      value: '1,245',
      change: '+8.3%',
      trend: 'up' as const,
      color: '#6A8A82', 
      icon: Users,
      description: 'Nouveaux: +127',
      path: '/customers'
    },
    {
      title: 'Marge Brute',
      value: '38.5%',
      change: '+2.1%',
      trend: 'up' as const,
      color: '#7A99AC',
      icon: TrendingUp,
      description: 'Objectif: 40%',
      path: '/accounting/sig'
    },
    {
      title: t('navigation.treasury'),
      value: '€890K',
      change: '+12.8%',
      trend: 'up' as const,
      color: '#6A8A82',
      icon: Activity,
      description: 'Position renforcée',
      path: '/treasury'
    }
  ];

  // Configuration graphique CA
  const revenueChartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep'],
    datasets: [
      {
        label: 'Chiffre d\'Affaires',
        data: [180, 195, 210, 225, 240, 220, 235, 250, 260],
        borderColor: '#B87333',
        backgroundColor: 'rgba(184, 115, 51, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#B87333',
        pointBorderColor: "var(--color-background-primary)",
        pointBorderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "var(--color-background-primary)",
        titleColor: '#191919',
        bodyColor: '#444444',
        borderColor: '#E8E8E8',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#E8E8E8' },
        ticks: { color: '#767676' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#767676' }
      }
    }
  };


  return (
    <div className="p-6 space-y-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header executif avec navigation */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-[var(--color-background-hover)] hover:bg-[var(--color-border)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#444444]" />
            <span className="text-sm font-semibold text-[#444444]">Workspaces</span>
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-[#191919]">Dashboard Exécutif</h1>
            <p className="text-sm text-[#767676]">Vue consolidée temps réel</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#6A8A82]/20"
          >
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-[var(--color-background-secondary)]" aria-label="Actualiser">
            <RefreshCw className="w-4 h-4 text-[#767676]" />
          </button>
          <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* KPIs Executive style workspaces */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {executiveKPIs.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate(kpi.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(kpi.path);
                }
              }}
              aria-label={`${kpi.label}: ${kpi.value}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{backgroundColor: `${kpi.color}20`}}
                >
                  <IconComponent className="w-6 h-6" style={{color: kpi.color}} />
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`text-xs font-medium flex items-center space-x-1 ${
                    kpi.trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                  }`}>
                    {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{kpi.change}</span>
                  </div>
                  <Eye className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-[#191919] mb-1">{kpi.value}</h3>
              <p className="text-sm font-medium text-[#444444] mb-1">{kpi.title}</p>
              <p className="text-xs text-[#767676]">{kpi.description}</p>
              <div className="mt-2 text-xs font-medium" style={{color: kpi.color}}>
                Analyser en détail →
              </div>
            </div>
          );
        })}
      </div>

      {/* Résumé financier SYSCOHADA - DÉPLACÉ DES VUE D'ENSEMBLE */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-[#191919] mb-4">💰 Résumé Financier SYSCOHADA</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-[#B87333]/10 to-[#A86323]/20">
            <h4 className="font-semibold text-[#B87333] mb-2">Chiffre d'Affaires</h4>
            <p className="text-3xl font-bold text-[#191919] mb-1">2.45M€</p>
            <p className="text-sm text-[var(--color-success)]">+15.3% vs mois précédent</p>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-[#6A8A82]/10 to-[#5A7A72]/20">
            <h4 className="font-semibold text-[#6A8A82] mb-2">Résultat Net</h4>
            <p className="text-3xl font-bold text-[#191919] mb-1">535K€</p>
            <p className="text-sm text-[var(--color-success)]">Marge: 21.8%</p>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-gradient-to-br from-[#7A99AC]/10 to-[#6A89AC]/20">
            <h4 className="font-semibold text-[#7A99AC] mb-2">Équilibre</h4>
            <p className="text-3xl font-bold text-[#191919] mb-1">100%</p>
            <p className="text-sm text-[#6A8A82]">Balance équilibrée</p>
          </div>
        </div>
      </div>

      {/* Graphiques et analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Évolution CA - Chart.js réel */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-[#191919]">Évolution du Chiffre d'Affaires</h3>
              <p className="text-sm text-[#767676]">Tendance: +15.3% vs période précédente</p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <button className="px-2 py-1 rounded bg-[#B87333] text-white font-medium">Mensuel</button>
              <button className="px-2 py-1 rounded text-[#767676] hover:text-[#B87333]">Trimestriel</button>
              <button className="px-2 py-1 rounded text-[#767676] hover:text-[#B87333]">Annuel</button>
            </div>
          </div>
          
          <div className="h-64">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>

      </div>


      {/* Performance temps réel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Performance Opérationnelle</h3>
          <div className="space-y-4">
            {[
              { label: 'Écritures validées', current: '156', target: '180', percentage: 87, color: '#6A8A82' },
              { label: 'Lettrage automatique', current: '98%', target: '95%', percentage: 100, color: '#B87333' },
              { label: 'Temps clôture', current: '2j', target: '3j', percentage: 150, color: '#7A99AC' },
              { label: 'Satisfaction utilisateurs', current: '4.8/5', target: '4.5/5', percentage: 96, color: '#6A8A82' },
            ].map((perf, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#444444]">{perf.label}</span>
                  <span className="font-medium text-[#191919]">{perf.current} / {perf.target}</span>
                </div>
                <div className="w-full bg-[var(--color-border)] rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      backgroundColor: perf.color,
                      width: `${Math.min(perf.percentage, 100)}%`
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8] shadow-sm">
          <h3 className="text-lg font-semibold text-[#191919] mb-4">Répartition Activité</h3>
          <div className="h-48 flex items-center justify-center">
            <Doughnut 
              data={{
                labels: ['Comptabilité', 'Trésorerie', 'Clients', 'Reporting'],
                datasets: [{
                  data: [35, 25, 25, 15],
                  backgroundColor: ['#6A8A82', '#B87333', '#7A99AC', '#5A7A72'],
                  borderWidth: 0,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' as const }
                }
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default ExecutiveDashboardV2;