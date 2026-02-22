import React, { useState, useEffect } from 'react';
import {
  Activity, TrendingUp, Users, DollarSign, Package, Clock,
  Target, Zap, BarChart3, PieChart, AlertCircle, CheckCircle,
  XCircle, RefreshCw, Download, Settings, Eye, Maximize2,
  Minimize2, Bell, Filter, Calendar, ArrowUp, ArrowDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  status: 'success' | 'warning' | 'danger';
  trend: number;
  lastUpdate: Date;
  history: { time: string; value: number }[];
  category: string;
}

interface RealTimeData {
  timestamp: Date;
  sales: number;
  orders: number;
  visitors: number;
  conversion: number;
}

const KPIsRealTime: React.FC = () => {
  const [realTimeData, setRealTimeData] = useState<RealTimeData[]>([]);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [fullscreenKPI, setFullscreenKPI] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('all');

  // KPIs en temps réel
  const [kpis, setKpis] = useState<KPIMetric[]>([
    {
      id: 'revenue',
      name: 'Chiffre d\'Affaires',
      value: 125789,
      unit: '',
      target: 120000,
      status: 'success',
      trend: 4.8,
      lastUpdate: new Date(),
      history: [],
      category: 'financier'
    },
    {
      id: 'margin',
      name: 'Marge Brute',
      value: 28.5,
      unit: '%',
      target: 30,
      status: 'warning',
      trend: -2.3,
      lastUpdate: new Date(),
      history: [],
      category: 'financier'
    },
    {
      id: 'cashflow',
      name: 'Cash Flow',
      value: 456000,
      unit: '',
      target: 400000,
      status: 'success',
      trend: 14.0,
      lastUpdate: new Date(),
      history: [],
      category: 'financier'
    }
  ]);

  // TODO: wire to Dexie query for real KPI data
  useEffect(() => {
    if (!autoRefresh) return;
    // KPI data should come from Dexie queries, not random generation
    return () => {};
  }, [autoRefresh, refreshInterval]);

  // Données pour le graphique radar
  const radarData = [
    { subject: 'Ventes', A: 85, fullMark: 100 },
    { subject: 'Clients', A: 92, fullMark: 100 },
    { subject: 'Qualité', A: 88, fullMark: 100 },
    { subject: 'Finance', A: 78, fullMark: 100 },
    { subject: 'Opérations', A: 83, fullMark: 100 },
    { subject: 'Innovation', A: 75, fullMark: 100 }
  ];

  // Filtrer les KPIs par catégorie
  const filteredKPIs = filterCategory === 'all'
    ? kpis
    : kpis.filter(kpi => kpi.category === filterCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'danger': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'danger': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(kpis, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `kpis_${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">KPIs Temps Réel</h1>
          <p className="text-gray-600 mt-1">Surveillance en direct des indicateurs clés</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresh Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
            <Activity className={cn("w-4 h-4", autoRefresh ? "text-green-600" : "text-gray-700")} />
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#A1BBB4] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#6A8A82]"></div>
            </label>
            <span className="text-sm font-medium">Live</span>
          </div>

          {/* Refresh Interval */}
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg text-sm"
            disabled={!autoRefresh}
          >
            <option value={1000}>1s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#588075]"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 p-4 bg-white rounded-lg shadow">
        <Filter className="w-5 h-5 text-gray-700" />
        <div className="flex gap-2">
          {['all', 'financier'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                filterCategory === cat
                  ? "bg-[#6A8A82] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat === 'all' ? 'Tous' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredKPIs.map((kpi) => (
          <div
            key={kpi.id}
            className={cn(
              "bg-white rounded-lg shadow p-4 cursor-pointer transition-all hover:shadow-lg",
              selectedKPI === kpi.id && "ring-2 ring-[#78998F]",
              fullscreenKPI === kpi.id && "fixed inset-4 z-50"
            )}
            onClick={() => setSelectedKPI(kpi.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-600">{kpi.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-lg font-bold text-gray-900">
                    {kpi.value}
                  </span>
                  <span className="text-sm text-gray-700">{kpi.unit}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1", getStatusColor(kpi.status))}>
                  {getStatusIcon(kpi.status)}
                  {kpi.status}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenKPI(fullscreenKPI === kpi.id ? null : kpi.id);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {fullscreenKPI === kpi.id ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-700 mb-1">
                <span>Objectif: {kpi.target}{kpi.unit}</span>
                <span>{((kpi.value / kpi.target) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    kpi.status === 'success' && "bg-green-500",
                    kpi.status === 'warning' && "bg-amber-500",
                    kpi.status === 'danger' && "bg-red-500"
                  )}
                  style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Trend */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {kpi.trend > 0 ? (
                  <ArrowUp className="w-4 h-4 text-green-600" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-red-600" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  kpi.trend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {Math.abs(kpi.trend).toFixed(1)}%
                </span>
              </div>
              <span className="text-xs text-gray-700">
                Mis à jour: {kpi.lastUpdate.toLocaleTimeString()}
              </span>
            </div>

            {/* Mini Chart */}
            {kpi.history.length > 0 && (
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={60}>
                  <AreaChart data={kpi.history}>
                    <defs>
                      <linearGradient id={`gradient-${kpi.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#78998F" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#78998F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#78998F"
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

      {/* Real-time Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Temps Réel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={realTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                stroke="#6B7280"
              />
              <YAxis stroke="#6B7280" />
              <Tooltip
                labelFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <Legend />
              <Line type="monotone" dataKey="sales" stroke="#78998F" name="Ventes" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="orders" stroke="#10B981" name="Commandes" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="conversion" stroke="#F59E0B" name="Conversion (%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Global Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#D1D5DB" />
              <PolarAngleAxis dataKey="subject" stroke="#6B7280" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6B7280" />
              <Radar name="Performance" dataKey="A" stroke="#78998F" fill="#78998F" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Performances</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Meilleur Vendeur', 'Produit Star', 'Client VIP'].map((title, index) => (
            <div key={title} className="text-center">
              <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
              <div className="flex items-center justify-center mb-2">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl",
                  index === 0 && "bg-gradient-to-br from-amber-400 to-amber-600",
                  index === 1 && "bg-gradient-to-br from-[#8BA99F] to-[#6A8A82]",
                  index === 2 && "bg-gradient-to-br from-purple-400 to-purple-600"
                )}>
                  #{index + 1}
                </div>
              </div>
              <p className="font-semibold text-gray-900">
                {index === 0 && "Ahmed B."}
                {index === 1 && "Produit XYZ"}
                {index === 2 && "Société ABC"}
              </p>
              <p className="text-sm text-gray-700">
                {index === 0 && "250,000 DH ce mois"}
                {index === 1 && "500 unités vendues"}
                {index === 2 && "1.2M DH de CA"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="bg-gradient-to-r from-[#E8EEEC] to-indigo-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-6 h-6 text-[#6A8A82]" />
          <h2 className="text-lg font-semibold text-gray-900">Alertes KPI</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border-l-4 border-amber-500">
            <h4 className="font-medium text-gray-900">Marge en baisse</h4>
            <p className="text-sm text-gray-600 mt-1">La marge brute est passée sous le seuil de 30%</p>
            <p className="text-xs text-gray-700 mt-2">Il y a 5 minutes</p>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500">
            <h4 className="font-medium text-gray-900">Objectif dépassé</h4>
            <p className="text-sm text-gray-600 mt-1">Le CA journalier a dépassé l'objectif de 10%</p>
            <p className="text-xs text-gray-700 mt-2">Il y a 15 minutes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIsRealTime;