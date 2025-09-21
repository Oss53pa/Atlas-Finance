import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign,
  Users,
  Target,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react';

const ManagerDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [activeTab, setActiveTab] = useState('financial');

  // KPIs Executive style Kads Agency
  const kpis = [
    {
      title: 'Chiffre d\'Affaires',
      value: '€2.4M',
      change: '+15.3%',
      trend: 'up',
      color: 'blue',
      icon: DollarSign,
      description: 'vs mois précédent',
      target: '€2.8M'
    },
    {
      title: 'Marge Brute',
      value: '38.5%',
      change: '+2.1%',
      trend: 'up',
      color: 'green',
      icon: TrendingUp,
      description: 'Amélioration continue',
      target: '40%'
    },
    {
      title: 'DSO Clients',
      value: '32 jours',
      change: '-5 jours',
      trend: 'up',
      color: 'orange',
      icon: Target,
      description: 'Recouvrement optimisé',
      target: '30 jours'
    },
    {
      title: 'Trésorerie Nette',
      value: '€890K',
      change: '+12.8%',
      trend: 'up',
      color: 'purple',
      icon: BarChart3,
      description: 'Position renforcée',
      target: '€1M'
    }
  ];

  const alerts = [
    {
      type: 'warning',
      title: 'Factures impayées',
      message: '12 factures dépassent 60 jours',
      action: 'Voir détails',
      time: '2h'
    },
    {
      type: 'info',
      title: 'Clôture mensuelle',
      message: 'Clôture septembre à finaliser',
      action: 'Finaliser',
      time: '1j'
    },
    {
      type: 'success',
      title: 'Objectif atteint',
      message: 'CA mensuel objectif dépassé de 15%',
      action: 'Analyser',
      time: '3h'
    }
  ];

  const tabs = [
    { id: 'financial', label: 'Financier', icon: DollarSign },
    { id: 'operational', label: 'Opérationnel', icon: BarChart3 },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'forecasts', label: 'Prévisions', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Executive */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Manager</h1>
            <p className="text-gray-600">Vue consolidée et pilotage</p>
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="year">Cette année</option>
            </select>
            <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation par onglets */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-green-500 text-green-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Contenu principal */}
      <main className="p-6">
        {/* KPIs Executive - Style Kads Agency Premium */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, index) => {
            const IconComponent = kpi.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 group">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-r from-${kpi.color}-500 to-${kpi.color}-600 group-hover:shadow-md transition-shadow`}>
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <div className={`flex items-center space-x-1 text-sm font-medium ${
                    kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.trend === 'up' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    <span>{kpi.change}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-gray-900">{kpi.value}</h3>
                  <p className="text-gray-600 font-medium">{kpi.title}</p>
                  <p className="text-gray-500 text-sm">{kpi.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-400">Objectif: {kpi.target}</span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full bg-${kpi.color}-500 rounded-full`} style={{width: '75%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Graphique principal */}
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Évolution du Chiffre d'Affaires</h2>
              <div className="flex items-center space-x-2">
                <button className="text-sm text-gray-500 hover:text-gray-700">Mensuel</button>
                <button className="text-sm text-blue-600 font-medium">Trimestriel</button>
                <button className="text-sm text-gray-500 hover:text-gray-700">Annuel</button>
              </div>
            </div>
            
            {/* Graphique placeholder - à remplacer par Chart.js/Recharts */}
            <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600">Graphique CA - À intégrer avec Chart.js</p>
                <p className="text-sm text-gray-500 mt-2">Tendance: +15.3% vs période précédente</p>
              </div>
            </div>
          </div>

          {/* Alertes et notifications */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Alertes</h2>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${
                  alert.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                  alert.type === 'info' ? 'bg-blue-50 border-blue-400' :
                  'bg-green-50 border-green-400'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                        <h3 className="text-sm font-medium text-gray-900">{alert.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <div className="flex items-center justify-between">
                        <button className={`text-xs font-medium ${
                          alert.type === 'warning' ? 'text-yellow-700' :
                          alert.type === 'info' ? 'text-blue-700' :
                          'text-green-700'
                        }`}>
                          {alert.action} →
                        </button>
                        <span className="text-xs text-gray-400">Il y a {alert.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tableaux de données style Kads Agency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Clients */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Clients</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { name: 'SARL CONGO BUSINESS', amount: '€245K', growth: '+18%', color: 'green' },
                  { name: 'STE AFRICAINE TECH', amount: '€189K', growth: '+12%', color: 'green' },
                  { name: 'CAMEROUN INDUSTRIES', amount: '€156K', growth: '-3%', color: 'red' },
                  { name: 'GABON LOGISTICS', amount: '€134K', growth: '+25%', color: 'green' },
                ].map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{client.name}</p>
                        <p className="text-gray-500 text-xs">CA annuel</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{client.amount}</p>
                      <p className={`text-xs ${client.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                        {client.growth}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Répartition par secteur */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">CA par Secteur</h2>
            </div>
            <div className="p-6">
              <div className="h-40 bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg flex items-center justify-center mb-4">
                <div className="text-center">
                  <PieChart className="w-12 h-12 text-purple-500 mx-auto mb-2" />
                  <p className="text-gray-600 text-sm">Graphique secteurs</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { sector: 'Services', percentage: '45%', color: 'blue' },
                  { sector: 'Commerce', percentage: '30%', color: 'green' },
                  { sector: 'Industrie', percentage: '15%', color: 'purple' },
                  { sector: 'Autres', percentage: '10%', color: 'orange' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full bg-${item.color}-500`}></div>
                      <span className="text-sm text-gray-700">{item.sector}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{item.percentage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;