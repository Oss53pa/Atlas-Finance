import React, { useState, useEffect } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  FileText,
  Globe,
  DollarSign,
  BarChart3,
  RefreshCw,
  Download,
  Calendar,
  CheckCircle,
  XCircle,
  Info
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ValuationMethod, InventoryValuation, StockLevel } from './types';
import { mockStockLevels, mockInventoryItems, mockLocations } from './utils/mockData';
import { InventoryCalculations } from './utils/calculations';
import CurrencyDisplay from './components/CurrencyDisplay';
import ValuationMethodBadge from './components/ValuationMethodBadge';
import LoadingSpinner from './components/LoadingSpinner';
import ExportButton from './components/ExportButton';

interface ValuationComparisonProps {
  methods: ValuationMethod[];
  onMethodSelect: (method: ValuationMethod) => void;
  selectedMethod: ValuationMethod;
}

const ValuationComparison: React.FC<ValuationComparisonProps> = ({
  methods,
  onMethodSelect,
  selectedMethod
}) => {
  // Mock valuation data for different methods
  const valuationData = [
    { method: 'FIFO', value: 3250000, variance: 0, items: 1250 },
    { method: 'LIFO', value: 3180000, variance: -70000, items: 1250 },
    { method: 'WEIGHTED_AVERAGE', value: 3215000, variance: -35000, items: 1250 },
    { method: 'SPECIFIC_IDENTIFICATION', value: 3245000, variance: -5000, items: 1250 }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Valuation Methods Comparison
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={valuationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Inventory Value']}
              />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Method Cards */}
        <div className="space-y-4">
          {valuationData.map((data, index) => (
            <div
              key={data.method}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                selectedMethod === data.method
                  ? 'border-[#6A8A82] bg-[#6A8A82]/10'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onMethodSelect(data.method as ValuationMethod)}
            >
              <div className="flex items-center justify-between mb-2">
                <ValuationMethodBadge
                  method={data.method as ValuationMethod}
                  showDescription={false}
                />
                {selectedMethod === data.method && (
                  <CheckCircle className="w-5 h-5 text-[#6A8A82]" />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Total Value:</span>
                  <div className="font-semibold">
                    <CurrencyDisplay amount={data.value} currency="USD" size="sm" />
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Variance:</span>
                  <div className={`font-semibold ${data.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <CurrencyDisplay amount={data.variance} currency="USD" size="sm" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface LCMTestingProps {
  onTestComplete: (results: any) => void;
}

const LCMTesting: React.FC<LCMTestingProps> = ({ onTestComplete }) => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [complianceStandard, setComplianceStandard] = useState<'IFRS_IAS2' | 'US_GAAP_ASC330'>('IFRS_IAS2');

  const runLCMTest = async () => {
    setIsRunning(true);

    // Simulate LCM testing
    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockResults = [
      {
        itemId: 'ITEM001',
        sku: 'LAP-DEL-5520',
        name: 'Dell Latitude 5520 Laptop',
        cost: 1220.00,
        marketValue: 1180.00,
        nrv: 1150.00,
        lcmValue: 1150.00,
        impairmentLoss: 70.00,
        quantity: 25,
        totalImpairment: 1750.00,
        status: 'impaired'
      },
      {
        itemId: 'ITEM002',
        sku: 'PHN-APL-IP14',
        name: 'Apple iPhone 14 Pro',
        cost: 999.00,
        marketValue: 1050.00,
        nrv: 1080.00,
        lcmValue: 999.00,
        impairmentLoss: 0.00,
        quantity: 45,
        totalImpairment: 0.00,
        status: 'ok'
      },
      {
        itemId: 'ITEM003',
        sku: 'COFF-BEAN-ARB',
        name: 'Premium Arabica Coffee Beans',
        cost: 12.80,
        marketValue: 11.50,
        nrv: 11.20,
        lcmValue: 11.20,
        impairmentLoss: 1.60,
        quantity: 500,
        totalImpairment: 800.00,
        status: 'impaired'
      }
    ];

    setTestResults(mockResults);
    setIsRunning(false);
    onTestComplete(mockResults);
  };

  const totalImpairment = testResults.reduce((sum, item) => sum + item.totalImpairment, 0);
  const impairedItems = testResults.filter(item => item.status === 'impaired').length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Lower of Cost or Market (LCM) Testing
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={complianceStandard}
            onChange={(e) => setComplianceStandard(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="IFRS_IAS2">IFRS IAS 2</option>
            <option value="US_GAAP_ASC330">US GAAP ASC 330</option>
          </select>
          <button
            onClick={runLCMTest}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] disabled:opacity-50"
          >
            {isRunning ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {isRunning ? 'Running Test...' : 'Run LCM Test'}
          </button>
        </div>
      </div>

      {/* Compliance Information */}
      <div className="bg-[#6A8A82]/10 border border-[#6A8A82]/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#6A8A82] mt-0.5" />
          <div className="text-sm">
            <h4 className="font-medium text-[#6A8A82] mb-1">
              {complianceStandard === 'IFRS_IAS2' ? 'IFRS IAS 2 - Inventories' : 'US GAAP ASC 330 - Inventory'}
            </h4>
            <p className="text-blue-700">
              {complianceStandard === 'IFRS_IAS2'
                ? 'Inventories shall be measured at the lower of cost and net realizable value. Net realizable value is the estimated selling price in the ordinary course of business less the estimated costs of completion and the estimated costs necessary to make the sale.'
                : 'Inventory is generally required to be measured at the lower of cost or market. Market value cannot exceed net realizable value and cannot be less than net realizable value reduced by an allowance for an approximately normal profit margin.'
              }
            </p>
          </div>
        </div>
      </div>

      {testResults.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-lg font-semibold text-red-800">{impairedItems}</p>
                  <p className="text-sm text-red-600">Items Requiring Write-down</p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-lg font-semibold text-yellow-800">
                    <CurrencyDisplay amount={totalImpairment} currency="USD" size="sm" />
                  </p>
                  <p className="text-sm text-yellow-600">Total Impairment Loss</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-lg font-semibold text-green-800">
                    {testResults.length - impairedItems}
                  </p>
                  <p className="text-sm text-green-600">Items Passed Test</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Item</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Cost</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Market Value</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">NRV</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">LCM Value</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Impairment</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {testResults.map((result) => (
                  <tr key={result.itemId} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{result.name}</div>
                        <div className="text-sm text-gray-700">{result.sku}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay amount={result.cost} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay amount={result.marketValue} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay amount={result.nrv} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right font-semibold">
                      <CurrencyDisplay amount={result.lcmValue} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay
                        amount={result.totalImpairment}
                        currency="USD"
                        size="sm"
                        className={result.totalImpairment > 0 ? 'text-red-600' : 'text-green-600'}
                      />
                    </td>
                    <td className="py-4 px-4 text-center">
                      {result.status === 'impaired' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3" />
                          Impaired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const InventoryValuation: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<ValuationMethod>('FIFO');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [valuationData, setValuationData] = useState<InventoryValuation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lcmResults, setLcmResults] = useState<any[]>([]);

  const valuationMethods: ValuationMethod[] = ['FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'SPECIFIC_IDENTIFICATION'];

  const runValuation = async () => {
    setIsLoading(true);

    // Simulate valuation calculation
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock valuation data
    const mockValuation: InventoryValuation = {
      date: selectedDate,
      method: selectedMethod,
      items: [
        {
          itemId: 'ITEM001',
          sku: 'LAP-DEL-5520',
          name: 'Dell Latitude 5520 Laptop',
          quantity: 25,
          unitCost: 1220.00,
          totalCost: 30500.00,
          marketValue: 1180.00,
          nrv: 1150.00,
          lcm: 1150.00,
          impairmentLoss: 1750.00,
          category: 'Electronics',
          location: 'New York'
        },
        {
          itemId: 'ITEM002',
          sku: 'PHN-APL-IP14',
          name: 'Apple iPhone 14 Pro',
          quantity: 45,
          unitCost: 1016.00,
          totalCost: 45720.00,
          marketValue: 1050.00,
          nrv: 1080.00,
          lcm: 1016.00,
          category: 'Electronics',
          location: 'New York'
        },
        {
          itemId: 'ITEM003',
          sku: 'COFF-BEAN-ARB',
          name: 'Premium Arabica Coffee Beans',
          quantity: 500,
          unitCost: 12.80,
          totalCost: 6400.00,
          marketValue: 11.50,
          nrv: 11.20,
          lcm: 11.20,
          impairmentLoss: 800.00,
          category: 'Food & Beverage',
          location: 'Abidjan'
        }
      ],
      totalInventoryValue: 82620.00,
      totalMarketValue: 79470.00,
      totalImpairment: 2550.00,
      complianceStandard: 'IFRS_IAS2',
      reviewedBy: 'Inventory Manager',
      approvedBy: 'CFO'
    };

    setValuationData(mockValuation);
    setIsLoading(false);
  };

  useEffect(() => {
    runValuation();
  }, [selectedMethod, dateRange]);

  const categoryBreakdown = valuationData?.items.reduce((acc, item) => {
    const existing = acc.find(cat => cat.category === item.category);
    if (existing) {
      existing.value += item.totalCost;
      existing.items += 1;
      existing.impairment += item.impairmentLoss || 0;
    } else {
      acc.push({
        category: item.category,
        value: item.totalCost,
        items: 1,
        impairment: item.impairmentLoss || 0
      });
    }
    return acc;
  }, [] as Array<{ category: string; value: number; items: number; impairment: number }>);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Valuation</h1>
          <p className="text-gray-600">
            International accounting standards compliant inventory valuation and impairment testing
          </p>
        </div>

        <div className="flex gap-4 mt-4 lg:mt-0">
          <button
            onClick={() => setShowPeriodModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
          >
            <Calendar className="w-4 h-4 text-gray-700" />
            {dateRange.startDate && dateRange.endDate
              ? `${dateRange.startDate} - ${dateRange.endDate}`
              : 'Sélectionner une période'
            }
          </button>
          <button
            onClick={runValuation}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] disabled:opacity-50" aria-label="Actualiser">
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isLoading ? 'Calculating...' : 'Recalculate'}
          </button>
          {valuationData && (
            <ExportButton
              data={valuationData.items}
              filename="inventory_valuation"
              title="Inventory Valuation Report"
            />
          )}
        </div>
      </div>

      {/* Compliance Standards Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#6A8A82]/10 border border-[#6A8A82]/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <Globe className="w-5 h-5 text-[#6A8A82]" />
            <h3 className="font-semibold text-[#6A8A82]">IFRS IAS 2</h3>
          </div>
          <p className="text-sm text-blue-700">
            International Financial Reporting Standards for inventory measurement at lower of cost and net realizable value.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <FileText className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-800">US GAAP ASC 330</h3>
          </div>
          <p className="text-sm text-green-700">
            US Generally Accepted Accounting Principles for inventory costing and lower of cost or market testing.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-3">
            <BarChart3 className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">SYSCOHADA</h3>
          </div>
          <p className="text-sm text-yellow-700">
            African accounting framework compliance for inventory valuation in West and Central Africa.
          </p>
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

      {/* Valuation Methods Comparison */}
      <ValuationComparison
        methods={valuationMethods}
        onMethodSelect={setSelectedMethod}
        selectedMethod={selectedMethod}
      />

      {/* Current Valuation Summary */}
      {valuationData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Valuation Summary
            </h3>
            <div className="flex items-center gap-4">
              <ValuationMethodBadge method={selectedMethod} showDescription />
              <span className="text-sm text-gray-700">
                As of {new Date(selectedDate).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="text-center p-4 bg-[#6A8A82]/10 rounded-lg">
              <div className="text-2xl font-bold text-[#6A8A82] mb-1">
                <CurrencyDisplay amount={valuationData.totalInventoryValue} currency="USD" size="lg" />
              </div>
              <div className="text-sm text-[#6A8A82]">Total Inventory Value</div>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                <CurrencyDisplay amount={valuationData.totalMarketValue || 0} currency="USD" size="lg" />
              </div>
              <div className="text-sm text-green-800">Market Value</div>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-1">
                <CurrencyDisplay amount={valuationData.totalImpairment || 0} currency="USD" size="lg" />
              </div>
              <div className="text-sm text-red-800">Impairment Loss</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600 mb-1">
                {valuationData.items.length.toLocaleString()}
              </div>
              <div className="text-sm text-gray-800">Items Valued</div>
            </div>
          </div>

          {/* Category Breakdown */}
          {categoryBreakdown && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Value by Category</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      dataKey="value"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ category, value }) => `${category}: $${(value / 1000).toFixed(0)}K`}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-4">Impairment by Category</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Impairment']} />
                    <Bar dataKey="impairment" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Item</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Quantity</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Unit Cost</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Total Cost</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Market Value</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">LCM Value</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900">Impairment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {valuationData.items.map((item) => (
                  <tr key={item.itemId} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-700">{item.sku}</div>
                        <div className="text-xs text-gray-700">{item.category} • {item.location}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      {item.quantity.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay amount={item.unitCost} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right font-semibold">
                      <CurrencyDisplay amount={item.totalCost} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay amount={item.marketValue || 0} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay amount={item.lcm || 0} currency="USD" size="sm" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <CurrencyDisplay
                        amount={item.impairmentLoss || 0}
                        currency="USD"
                        size="sm"
                        className={item.impairmentLoss ? 'text-red-600' : 'text-green-600'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LCM Testing */}
      <div className="mt-8">
        <LCMTesting onTestComplete={setLcmResults} />
      </div>
    </div>
  );
};

export default InventoryValuation;