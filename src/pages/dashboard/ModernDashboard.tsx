import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Activity, DollarSign, Users, Package,
  Clock, AlertTriangle, CheckCircle, Info, ChevronUp, ChevronDown,
  BarChart3, PieChart, LineChart, Target, Zap, Calendar,
  ArrowUpRight, ArrowDownRight, RefreshCw, Download, Filter,
  Eye, Bell, Shield, Cpu, Globe, Database, Wallet, Receipt
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { LineChart as RechartsLineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

interface KPICard {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down' | 'stable';
  sparklineData?: number[];
}

interface ActivityItem {
  id: string;
  type: 'payment' | 'invoice' | 'expense' | 'alert' | 'approval';
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  amount?: number;
  status?: 'pending' | 'completed' | 'failed';
}

const ModernDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Données KPI principales
  const kpiData: KPICard[] = [
    {
      id: 'revenue',
      title: 'Chiffre d\'Affaires',
      value: '2,456,789',
      change: 12.5,
      changeLabel: 'vs mois dernier',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'blue',
      trend: 'up',
      sparklineData: [45, 52, 48, 61, 58, 63, 70, 68, 75, 82, 89, 95]
    },
    {
      id: 'profit',
      title: 'Bénéfice Net',
      value: '456,123',
      change: 8.2,
      changeLabel: 'vs mois dernier',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'green',
      trend: 'up',
      sparklineData: [30, 35, 32, 38, 42, 45, 48, 52, 55, 58, 62, 65]
    },
    {
      id: 'expenses',
      title: 'Dépenses',
      value: '1,234,567',
      change: -3.4,
      changeLabel: 'vs mois dernier',
      icon: <Receipt className="w-5 h-5" />,
      color: 'red',
      trend: 'down',
      sparklineData: [95, 92, 88, 85, 83, 80, 78, 75, 73, 70, 68, 65]
    },
    {
      id: 'cash',
      title: 'Trésorerie',
      value: '789,012',
      change: 15.8,
      changeLabel: 'vs mois dernier',
      icon: <Wallet className="w-5 h-5" />,
      color: 'purple',
      trend: 'up',
      sparklineData: [40, 42, 45, 48, 52, 55, 58, 62, 65, 68, 72, 78]
    },
    {
      id: 'clients',
      title: 'Clients Actifs',
      value: '1,234',
      change: 5.2,
      changeLabel: 'nouveaux ce mois',
      icon: <Users className="w-5 h-5" />,
      color: 'indigo',
      trend: 'up',
      sparklineData: [20, 22, 25, 28, 30, 32, 35, 38, 40, 42, 45, 48]
    },
    {
      id: 'invoices',
      title: 'Factures en Attente',
      value: '89',
      change: -12.3,
      changeLabel: 'vs semaine dernière',
      icon: <Clock className="w-5 h-5" />,
      color: 'orange',
      trend: 'down',
      sparklineData: [50, 48, 45, 42, 40, 38, 35, 32, 30, 28, 25, 22]
    }
  ];

  // Données pour les graphiques
  const revenueData = [
    { month: 'Jan', revenue: 1850000, profit: 320000, expenses: 1530000 },
    { month: 'Fév', revenue: 1920000, profit: 350000, expenses: 1570000 },
    { month: 'Mar', revenue: 2100000, profit: 380000, expenses: 1720000 },
    { month: 'Avr', revenue: 2050000, profit: 365000, expenses: 1685000 },
    { month: 'Mai', revenue: 2200000, profit: 400000, expenses: 1800000 },
    { month: 'Juin', revenue: 2350000, profit: 425000, expenses: 1925000 },
    { month: 'Juil', revenue: 2280000, profit: 410000, expenses: 1870000 },
    { month: 'Août', revenue: 2180000, profit: 390000, expenses: 1790000 },
    { month: 'Sep', revenue: 2300000, profit: 420000, expenses: 1880000 },
    { month: 'Oct', revenue: 2400000, profit: 445000, expenses: 1955000 },
    { month: 'Nov', revenue: 2520000, profit: 470000, expenses: 2050000 },
    { month: 'Déc', revenue: 2456789, profit: 456123, expenses: 2000666 }
  ];

  const cashFlowData = [
    { name: 'Semaine 1', entrees: 450000, sorties: 320000, net: 130000 },
    { name: 'Semaine 2', entrees: 520000, sorties: 380000, net: 140000 },
    { name: 'Semaine 3', entrees: 480000, sorties: 350000, net: 130000 },
    { name: 'Semaine 4', entrees: 550000, sorties: 400000, net: 150000 }
  ];

  const expenseCategories = [
    { name: 'Salaires', value: 45, color: '#6A8A82' },
    { name: 'Achats', value: 25, color: '#10B981' },
    { name: 'Marketing', value: 15, color: '#F59E0B' },
    { name: 'Loyer', value: 10, color: '#EF4444' },
    { name: 'Autres', value: 5, color: '#B87333' }
  ];

  const performanceData = [
    { subject: 'Ventes', A: 85, B: 90, fullMark: 100 },
    { subject: 'Clients', A: 78, B: 82, fullMark: 100 },
    { subject: 'Productivité', A: 92, B: 88, fullMark: 100 },
    { subject: 'Qualité', A: 88, B: 85, fullMark: 100 },
    { subject: 'Innovation', A: 75, B: 80, fullMark: 100 },
    { subject: 'Satisfaction', A: 82, B: 87, fullMark: 100 }
  ];

  // Activités récentes
  const [activities] = useState<ActivityItem[]>([
    {
      id: '1',
      type: 'payment',
      title: 'Paiement reçu',
      description: 'Client ABC - Facture #2024-001',
      amount: 25000,
      timestamp: new Date(),
      status: 'completed'
    },
    {
      id: '2',
      type: 'invoice',
      title: 'Nouvelle facture',
      description: 'Client XYZ - 3 articles',
      amount: 15000,
      timestamp: new Date(Date.now() - 3600000),
      status: 'pending'
    },
    {
      id: '3',
      type: 'alert',
      title: 'Seuil de trésorerie',
      description: 'Trésorerie en dessous du seuil défini',
      timestamp: new Date(Date.now() - 7200000),
      status: 'pending'
    },
    {
      id: '4',
      type: 'approval',
      title: 'Approbation requise',
      description: 'Commande fournisseur > 50,000',
      amount: 52000,
      timestamp: new Date(Date.now() - 10800000),
      user: 'Admin',
      status: 'pending'
    }
  ]);

  // Alertes intelligentes
  const [alerts] = useState([
    {
      id: '1',
      type: 'warning',
      title: 'Créances à risque',
      message: '5 factures clients dépassent 60 jours',
      priority: 'high'
    },
    {
      id: '2',
      type: 'info',
      title: 'Opportunité détectée',
      message: 'Augmentation de 20% des commandes ce mois',
      priority: 'medium'
    },
    {
      id: '3',
      type: 'success',
      title: 'Objectif atteint',
      message: 'CA mensuel dépassé de 5%',
      priority: 'low'
    }
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setRefreshing(false);
  };

  const getColorClass = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-[#6A8A82]/10 text-[#6A8A82] border-[#6A8A82]/20',
      green: 'bg-green-100 text-green-700 border-green-200',
      red: 'bg-red-100 text-red-700 border-red-200',
      purple: 'bg-[#B87333]/10 text-[#B87333] border-[#B87333]/20',
      indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      orange: 'bg-orange-100 text-orange-700 border-orange-200'
    };
    return colors[color] || colors.blue;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'payment': return <DollarSign className="w-4 h-4" />;
      case 'invoice': return <Receipt className="w-4 h-4" />;
      case 'expense': return <TrendingDown className="w-4 h-4" />;
      case 'alert': return <AlertTriangle className="w-4 h-4" />;
      case 'approval': return <CheckCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // Sparkline Component
  const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const height = 40;
    const width = 100;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / (max - min)) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="ml-auto">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
        />
      </svg>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-gray-600 mt-1">Vue d'ensemble de votre activité</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6A8A82]"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>

          <button
            onClick={handleRefresh}
            className={cn(
              "p-2 rounded-lg border hover:bg-gray-50 transition-all",
              refreshing && "animate-spin"
            )}
            disabled={refreshing}
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#6A8A82]/90">
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi) => (
          <div
            key={kpi.id}
            className={cn(
              "bg-white rounded-lg border p-4 hover:shadow-lg transition-all cursor-pointer",
              expandedCard === kpi.id && "col-span-2 row-span-2"
            )}
            onClick={() => setExpandedCard(expandedCard === kpi.id ? null : kpi.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={cn("p-2 rounded-lg", getColorClass(kpi.color))}>
                {kpi.icon}
              </div>
              {kpi.trend === 'up' ? (
                <ChevronUp className="w-4 h-4 text-green-600" />
              ) : kpi.trend === 'down' ? (
                <ChevronDown className="w-4 h-4 text-red-600" />
              ) : null}
            </div>

            <h3 className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</h3>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>

            <div className="flex items-center justify-between mt-3">
              <span className={cn(
                "text-sm font-medium",
                kpi.change > 0 ? "text-green-600" : "text-red-600"
              )}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}%
              </span>
              <span className="text-xs text-gray-500">{kpi.changeLabel}</span>
            </div>

            {kpi.sparklineData && expandedCard !== kpi.id && (
              <div className="mt-3">
                <Sparkline
                  data={kpi.sparklineData}
                  color={kpi.change > 0 ? '#10B981' : '#EF4444'}
                />
              </div>
            )}

            {expandedCard === kpi.id && (
              <div className="mt-4 pt-4 border-t">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={kpi.sparklineData.map((v, i) => ({ x: i, y: v }))}>
                    <defs>
                      <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6A8A82" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#6A8A82" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="#6A8A82"
                      fillOpacity={1}
                      fill={`url(#gradient-${kpi.id})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Évolution du CA</h2>
            <div className="flex items-center gap-2">
              <button className="p-1 hover:bg-gray-100 rounded">
                <Filter className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-gray-100 rounded">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6A8A82" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6A8A82" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="revenue" stroke="#6A8A82" fillOpacity={1} fill="url(#colorRevenue)" name="Chiffre d'affaires" />
              <Area type="monotone" dataKey="profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" name="Bénéfice" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Cash Flow Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Flux de Trésorerie</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Dernières 4 semaines</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="entrees" fill="#10B981" name="Entrées" />
              <Bar dataKey="sorties" fill="#EF4444" name="Sorties" />
              <Bar dataKey="net" fill="#6A8A82" name="Net" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Expense Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des Dépenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={expenseCategories}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name} ${entry.value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expenseCategories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Radar */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicateurs de Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" data={performanceData}>
              <RadialBar
                minAngle={15}
                label={{ position: 'insideStart', fill: '#fff' }}
                background
                clockWise
                dataKey="A"
                fill="#6A8A82"
              />
              <Legend />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                <div className={cn(
                  "p-2 rounded-lg",
                  activity.type === 'payment' && "bg-green-100 text-green-600",
                  activity.type === 'invoice' && "bg-[#6A8A82]/10 text-[#6A8A82]",
                  activity.type === 'alert' && "bg-yellow-100 text-yellow-600",
                  activity.type === 'approval' && "bg-[#B87333]/10 text-[#B87333]"
                )}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                  <p className="text-xs text-gray-500">{activity.description}</p>
                  {activity.amount && (
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {activity.amount.toLocaleString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Alertes Intelligentes</h2>
          <Bell className="w-5 h-5 text-gray-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "p-4 rounded-lg border-l-4",
                alert.type === 'warning' && "bg-yellow-50 border-yellow-400",
                alert.type === 'info' && "bg-[#6A8A82]/5 border-[#6A8A82]",
                alert.type === 'success' && "bg-green-50 border-green-400"
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{alert.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                </div>
                {alert.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                {alert.type === 'info' && <Info className="w-5 h-5 text-[#6A8A82]" />}
                {alert.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="flex items-center justify-center gap-2 p-4 bg-[#6A8A82]/10 text-[#6A8A82] rounded-lg hover:bg-[#6A8A82]/20">
          <Receipt className="w-5 h-5" />
          <span className="font-medium">Nouvelle Facture</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
          <DollarSign className="w-5 h-5" />
          <span className="font-medium">Enregistrer Paiement</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-[#B87333]/10 text-[#B87333] rounded-lg hover:bg-[#B87333]/20">
          <Users className="w-5 h-5" />
          <span className="font-medium">Nouveau Client</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100">
          <BarChart3 className="w-5 h-5" />
          <span className="font-medium">Générer Rapport</span>
        </button>
      </div>
    </div>
  );
};

export default ModernDashboard;