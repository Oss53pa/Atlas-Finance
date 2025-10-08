import React, { useState, useEffect } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  Calendar,
  MapPin,
  DollarSign
} from 'lucide-react';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { InventoryKPIs, ValuationMethod } from './types';
import { mockInventoryKPIs, mockABCAnalysis, mockInventoryTurnover, mockLocations } from './utils/mockData';
import CurrencyDisplay from './components/CurrencyDisplay';
import ValuationMethodBadge from './components/ValuationMethodBadge';
import StockStatusBadge from './components/StockStatusBadge';
import LoadingSpinner from './components/LoadingSpinner';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  format?: 'currency' | 'percentage' | 'number';
  currency?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  trend = 'neutral',
  format = 'number',
  currency = 'USD'
}) => {
  const formatValue = (val: string | number) => {
    if (format === 'currency' && typeof val === 'number') {
      return <CurrencyDisplay amount={val} currency={currency} size="lg" />;
    }
    if (format === 'percentage' && typeof val === 'number') {
      return `${val}%`;
    }
    if (typeof val === 'number' && format === 'number') {
      return val.toLocaleString();
    }
    return val;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-[var(--color-error)]" />;
    return null;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-[var(--color-success)]';
    if (trend === 'down') return 'text-[var(--color-error)]';
    return 'text-[var(--color-text-primary)]';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-full ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
            <p className="text-2xl font-bold text-[var(--color-text-primary)]">
              {formatValue(value)}
            </p>
          </div>
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-sm font-medium">
              {change > 0 ? '+' : ''}{change}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const InventoryDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<InventoryKPIs>(mockInventoryKPIs);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [selectedValuationMethod, setSelectedValuationMethod] = useState<ValuationMethod>('FIFO');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for charts
  const inventoryValueTrend = [
    { month: 'Jan', value: 2800000, forecast: 2850000 },
    { month: 'Feb', value: 3100000, forecast: 3080000 },
    { month: 'Mar', value: 2950000, forecast: 2980000 },
    { month: 'Apr', value: 3250000, forecast: 3220000 },
    { month: 'May', value: 3180000, forecast: 3200000 },
    { month: 'Jun', value: 3250000, forecast: 3300000 }
  ];

  const turnoverByCategory = [
    { category: 'Electronics', turnover: 12.5, value: 1800000 },
    { category: 'Food & Beverage', turnover: 24.0, value: 450000 },
    { category: 'Construction', turnover: 6.8, value: 980000 },
    { category: 'Office Supplies', turnover: 8.2, value: 125000 },
    { category: 'Automotive', turnover: 5.5, value: 195000 }
  ];

  const stockLevelsByLocation = [
    { location: 'New York', value: 1250000, items: 450 },
    { location: 'Los Angeles', value: 980000, items: 380 },
    { location: 'Abidjan', value: 650000, items: 285 },
    { location: 'Manhattan Store', value: 280000, items: 95 },
    { location: 'Detroit Plant', value: 90000, items: 40 }
  ];

  const agingAnalysis = [
    { period: '0-30 days', value: 1850000, percentage: 57 },
    { period: '31-60 days', value: 780000, percentage: 24 },
    { period: '61-90 days', value: 390000, percentage: 12 },
    { period: '91-180 days', value: 165000, percentage: 5 },
    { period: '180+ days', value: 65000, percentage: 2 }
  ];

  const valuationComparison = [
    { method: 'FIFO', value: 3250000 },
    { method: 'LIFO', value: 3180000 },
    { method: 'Weighted Avg', value: 3215000 },
    { method: 'Specific ID', value: 3245000 }
  ];

  const COLORS = ['#6A8A82', '#10B981', '#F59E0B', '#EF4444', '#B87333'];

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getKPITrend = (current: number, previous: number): { change: number; trend: 'up' | 'down' | 'neutral' } => {
    const change = ((current - previous) / previous) * 100;
    return {
      change: Number(change.toFixed(1)),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  // Mock previous period data for trend calculation
  const previousKpis = {
    totalInventoryValue: 3100000,
    averageTurnoverRatio: 8.2,
    averageDaysInInventory: 45,
    accuracyRate: 96.8,
    fillRate: 94.5,
    shrinkageRate: 0.9
  };

  return (
    <div className="p-6 bg-[var(--color-background-secondary)] min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">Inventory Dashboard</h1>
          <p className="text-[var(--color-text-primary)]">
            Real-time inventory analytics and key performance indicators
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 lg:mt-0">
          {/* Location Filter */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="border border-[var(--color-border-dark)] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {mockLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period Filter */}
          <button
            onClick={() => setShowPeriodModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border-dark)] rounded-md text-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
          >
            <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
            {dateRange.startDate && dateRange.endDate
              ? `${dateRange.startDate} - ${dateRange.endDate}`
              : 'Sélectionner une période'
            }
          </button>

          {/* Valuation Method */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <select
              value={selectedValuationMethod}
              onChange={(e) => setSelectedValuationMethod(e.target.value as ValuationMethod)}
              className="border border-[var(--color-border-dark)] rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
            >
              <option value="FIFO">FIFO</option>
              <option value="LIFO">LIFO</option>
              <option value="WEIGHTED_AVERAGE">Weighted Average</option>
              <option value="SPECIFIC_IDENTIFICATION">Specific ID</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onPeriodSelect={(period) => {
          setDateRange(period);
          setShowPeriodModal(false);
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Inventory Value"
          value={kpis.totalInventoryValue}
          change={getKPITrend(kpis.totalInventoryValue, previousKpis.totalInventoryValue).change}
          icon={Package}
          color="bg-[#6A8A82]"
          trend={getKPITrend(kpis.totalInventoryValue, previousKpis.totalInventoryValue).trend}
          format="currency"
        />
        <KPICard
          title="Average Turnover Ratio"
          value={kpis.averageTurnoverRatio}
          change={getKPITrend(kpis.averageTurnoverRatio, previousKpis.averageTurnoverRatio).change}
          icon={TrendingUp}
          color="bg-[var(--color-success)]"
          trend={getKPITrend(kpis.averageTurnoverRatio, previousKpis.averageTurnoverRatio).trend}
        />
        <KPICard
          title="Days in Inventory"
          value={kpis.averageDaysInInventory}
          change={getKPITrend(kpis.averageDaysInInventory, previousKpis.averageDaysInInventory).change}
          icon={Calendar}
          color="bg-[var(--color-warning)]"
          trend={getKPITrend(kpis.averageDaysInInventory, previousKpis.averageDaysInInventory).trend}
        />
        <KPICard
          title="Inventory Accuracy"
          value={kpis.accuracyRate}
          change={getKPITrend(kpis.accuracyRate, previousKpis.accuracyRate).change}
          icon={Activity}
          color="bg-[#B87333]"
          trend={getKPITrend(kpis.accuracyRate, previousKpis.accuracyRate).trend}
          format="percentage"
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--color-error-lightest)] border border-[var(--color-error-light)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" />
            <h3 className="font-semibold text-[var(--color-error-darker)]">Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-error-dark)]">Out of Stock</span>
              <span className="text-sm font-medium text-[var(--color-error-darker)]">{kpis.stockoutItems} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-error-dark)]">Low Stock</span>
              <span className="text-sm font-medium text-[var(--color-error-darker)]">{kpis.reorderSuggestions} items</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-warning-lightest)] border border-[var(--color-warning-light)] rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Package className="w-5 h-5 text-[var(--color-warning)]" />
            <h3 className="font-semibold text-[var(--color-warning-dark)]">Overstock Items</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-warning-dark)]">Excess Inventory</span>
              <span className="text-sm font-medium text-[var(--color-warning-dark)]">{kpis.overstockItems} items</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--color-warning-dark)]">Dead Stock Value</span>
              <span className="text-sm font-medium text-[var(--color-warning-dark)]">
                <CurrencyDisplay amount={kpis.deadStockValue} currency="USD" size="sm" />
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#6A8A82]/10 border border-[#6A8A82]/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-5 h-5 text-[#6A8A82]" />
            <h3 className="font-semibold text-[#6A8A82]">Performance</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[#6A8A82]/80">Fill Rate</span>
              <span className="text-sm font-medium text-[#6A8A82]">{kpis.fillRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[#6A8A82]/80">Shrinkage Rate</span>
              <span className="text-sm font-medium text-[#6A8A82]">{kpis.shrinkageRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Inventory Value Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Inventory Value Trend</h3>
            <ValuationMethodBadge method={selectedValuationMethod} />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={inventoryValueTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6A8A82"
                fill="#6A8A82"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#10B981"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Turnover by Category */}
        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Turnover by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={turnoverByCategory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'turnover' ? `${value}x` : `$${value.toLocaleString()}`,
                  name === 'turnover' ? 'Turnover Ratio' : 'Inventory Value'
                ]}
              />
              <Bar dataKey="turnover" fill="#6A8A82" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Second Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Stock Levels by Location */}
        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Stock Levels by Location</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={stockLevelsByLocation}
                dataKey="value"
                nameKey="location"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ location, percentage }) => `${location} (${percentage}%)`}
              >
                {stockLevelsByLocation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>

        {/* Aging Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Inventory Aging Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={agingAnalysis} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="period" width={80} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']} />
              <Bar dataKey="value" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Valuation Methods Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6 mb-8">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Valuation Methods Comparison</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={valuationComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Inventory Value']} />
              <Bar dataKey="value" fill="#B87333" />
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-4">
            <h4 className="font-medium text-[var(--color-text-primary)]">Impact Analysis</h4>
            {valuationComparison.map((method, index) => {
              const difference = method.value - valuationComparison[0].value;
              const percentage = (difference / valuationComparison[0].value) * 100;

              return (
                <div key={method.method} className="flex items-center justify-between p-3 bg-[var(--color-background-secondary)] rounded-lg">
                  <span className="font-medium">{method.method}</span>
                  <div className="text-right">
                    <div className="font-semibold">
                      <CurrencyDisplay amount={method.value} currency="USD" size="sm" />
                    </div>
                    <div className={`text-xs ${difference >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>
                      {difference >= 0 ? '+' : ''}{percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ABC Analysis Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">ABC Analysis Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-[#6A8A82]/10 rounded-lg">
            <div className="text-2xl font-bold text-[#6A8A82] mb-2">
              {mockABCAnalysis.summary.classA.items}
            </div>
            <div className="text-sm text-[#6A8A82] font-medium mb-1">Class A Items</div>
            <div className="text-xs text-[#6A8A82]/80">
              {mockABCAnalysis.summary.classA.valuePercentage}% of total value
            </div>
          </div>

          <div className="text-center p-6 bg-[var(--color-success-lightest)] rounded-lg">
            <div className="text-2xl font-bold text-[var(--color-success)] mb-2">
              {mockABCAnalysis.summary.classB.items}
            </div>
            <div className="text-sm text-[var(--color-success-darker)] font-medium mb-1">Class B Items</div>
            <div className="text-xs text-[var(--color-success)]">
              {mockABCAnalysis.summary.classB.valuePercentage}% of total value
            </div>
          </div>

          <div className="text-center p-6 bg-[var(--color-warning-lightest)] rounded-lg">
            <div className="text-2xl font-bold text-[var(--color-warning)] mb-2">
              {mockABCAnalysis.summary.classC.items}
            </div>
            <div className="text-sm text-[var(--color-warning-dark)] font-medium mb-1">Class C Items</div>
            <div className="text-xs text-[var(--color-warning)]">
              {mockABCAnalysis.summary.classC.valuePercentage}% of total value
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;