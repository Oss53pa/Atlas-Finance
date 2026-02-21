import React, { useState, useEffect } from 'react';
import {
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  MapPin,
  Package,
  DollarSign,
  Download,
  Eye,
  Settings,
  Filter,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  Globe,
  CheckCircle,
  AlertTriangle
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts';
import { InventoryReport, ValuationMethod, ABCAnalysis, InventoryTurnover } from './types';
import { mockABCAnalysis, mockInventoryTurnover, mockLocations } from './utils/mockData';
import CurrencyDisplay from './components/CurrencyDisplay';
import ValuationMethodBadge from './components/ValuationMethodBadge';
import LoadingSpinner from './components/LoadingSpinner';
import ExportButton from './components/ExportButton';

interface ReportParams {
  locations: string[];
  categories: string[];
  valuationMethod: ValuationMethod;
  format: string;
  includeZeroQty: boolean;
  includeInactive: boolean;
  dateFrom: string;
  dateTo: string;
}

interface ReportTemplateProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  reportType: string;
  onGenerate: (type: string, params: ReportParams) => void;
  isGenerating: boolean;
}

const ReportTemplate: React.FC<ReportTemplateProps> = ({
  title,
  description,
  icon: Icon,
  reportType,
  onGenerate,
  isGenerating
}) => {
  const [showParams, setShowParams] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [params, setParams] = useState({
    locations: [] as string[],
    categories: [] as string[],
    valuationMethod: 'FIFO' as ValuationMethod,
    format: 'excel',
    includeZeroQty: false,
    includeInactive: false
  });

  const categories = [
    { id: 'CAT001', name: 'Electronics' },
    { id: 'CAT002', name: 'Food & Beverage' },
    { id: 'CAT003', name: 'Construction Materials' },
    { id: 'CAT004', name: 'Office Supplies' },
    { id: 'CAT005', name: 'Automotive' }
  ];

  const handleGenerate = () => {
    const reportParams = {
      ...params,
      dateFrom: dateRange.startDate,
      dateTo: dateRange.endDate
    };
    onGenerate(reportType, reportParams);
    setShowParams(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#6A8A82]/10 rounded-lg">
          <Icon className="w-6 h-6 text-[#6A8A82]" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-4">{description}</p>

          <div className="flex gap-2">
            <button
              onClick={() => setShowParams(!showParams)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] disabled:opacity-50 transition-colors text-sm" aria-label="Télécharger">
              {isGenerating ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {showParams && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <PeriodSelectorModal
                isOpen={showPeriodModal}
                onClose={() => setShowPeriodModal(false)}
                onPeriodSelect={(period) => {
                  setDateRange(period);
                  setShowPeriodModal(false);
                }}
              />
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Période de rapport
                </label>
                <button
                  onClick={() => setShowPeriodModal(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
                >
                  <Calendar className="w-4 h-4 text-gray-700" />
                  {dateRange.startDate && dateRange.endDate
                    ? `${dateRange.startDate} - ${dateRange.endDate}`
                    : 'Sélectionner une période'
                  }
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Locations (optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {mockLocations.map(location => (
                    <label key={location.id} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={params.locations.includes(location.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setParams({
                              ...params,
                              locations: [...params.locations, location.id]
                            });
                          } else {
                            setParams({
                              ...params,
                              locations: params.locations.filter(id => id !== location.id)
                            });
                          }
                        }}
                        className="mr-2 text-[#6A8A82] focus:ring-[#6A8A82]"
                      />
                      {location.name}
                    </label>
                  ))}
                </div>
              </div>

              {(reportType === 'valuation' || reportType === 'aging') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valuation Method
                  </label>
                  <select
                    value={params.valuationMethod}
                    onChange={(e) => setParams({ ...params, valuationMethod: e.target.value as ValuationMethod })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="FIFO">FIFO</option>
                    <option value="LIFO">LIFO</option>
                    <option value="WEIGHTED_AVERAGE">Weighted Average</option>
                    <option value="SPECIFIC_IDENTIFICATION">Specific Identification</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Export Format
                  </label>
                  <select
                    value={params.format}
                    onChange={(e) => setParams({ ...params, format: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    <option value="excel">Excel</option>
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={params.includeZeroQty}
                      onChange={(e) => setParams({ ...params, includeZeroQty: e.target.checked })}
                      className="mr-2 text-[#6A8A82] focus:ring-[#6A8A82]"
                    />
                    Include Zero Quantity Items
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={params.includeInactive}
                      onChange={(e) => setParams({ ...params, includeInactive: e.target.checked })}
                      className="mr-2 text-[#6A8A82] focus:ring-[#6A8A82]"
                    />
                    Include Inactive Items
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ComplianceReportProps {
  standard: 'IFRS_IAS2' | 'US_GAAP_ASC330' | 'SYSCOHADA';
  onGenerate: (standard: string) => void;
  isGenerating: boolean;
}

const ComplianceReport: React.FC<ComplianceReportProps> = ({
  standard,
  onGenerate,
  isGenerating
}) => {
  const standardConfig = {
    IFRS_IAS2: {
      title: 'IFRS IAS 2 Compliance Report',
      description: 'International Financial Reporting Standards for inventory accounting',
      requirements: [
        'Lower of cost and net realizable value testing',
        'Inventory measurement and recognition policies',
        'Cost flow assumption disclosures',
        'Write-down and reversal documentation'
      ],
      icon: Globe,
      color: 'blue'
    },
    US_GAAP_ASC330: {
      title: 'US GAAP ASC 330 Compliance Report',
      description: 'US Generally Accepted Accounting Principles for inventory',
      requirements: [
        'Lower of cost or market testing',
        'Inventory costing method consistency',
        'LIFO layer tracking (if applicable)',
        'Market value determination procedures'
      ],
      icon: FileText,
      color: 'green'
    },
    SYSCOHADA: {
      title: 'SYSCOHADA Compliance Report',
      description: 'West and Central African accounting framework',
      requirements: [
        'Inventory classification standards',
        'Valuation method compliance',
        'Provision for depreciation requirements',
        'Detailed inventory listings'
      ],
      icon: Package,
      color: 'yellow'
    }
  };

  const config = standardConfig[standard];
  const IconComponent = config.icon;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className={`p-3 bg-${config.color}-50 rounded-lg`}>
          <IconComponent className={`w-6 h-6 text-${config.color}-600`} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{config.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{config.description}</p>

          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Key Requirements:</h4>
            <ul className="space-y-1">
              {config.requirements.map((req, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {req}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => onGenerate(standard)}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 bg-${config.color}-600 text-white rounded-md hover:bg-${config.color}-700 disabled:opacity-50 transition-colors text-sm`}
          >
            {isGenerating ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

const InventoryReports: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [generatedReports, setGeneratedReports] = useState<InventoryReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<InventoryReport | null>(null);

  const reportTemplates = [
    {
      type: 'valuation',
      title: 'Inventory Valuation Report',
      description: 'Complete inventory valuation by item, location, and category with multiple costing methods',
      icon: DollarSign
    },
    {
      type: 'aging',
      title: 'Inventory Aging Analysis',
      description: 'Analyze inventory aging patterns to identify slow-moving and obsolete stock',
      icon: Clock
    },
    {
      type: 'turnover',
      title: 'Inventory Turnover Analysis',
      description: 'Calculate turnover ratios and days in inventory for performance optimization',
      icon: TrendingUp
    },
    {
      type: 'abc',
      title: 'ABC Analysis Report',
      description: 'Pareto analysis to classify inventory items by value and volume',
      icon: BarChart3
    },
    {
      type: 'movement',
      title: 'Movement Summary Report',
      description: 'Summary of all inventory movements including receipts, issues, and transfers',
      icon: Package
    },
    {
      type: 'variance',
      title: 'Physical Count Variance Report',
      description: 'Analysis of physical count variances and adjustments',
      icon: AlertTriangle
    }
  ];

  const handleGenerateReport = async (type: string, params: ReportParams) => {
    setIsGenerating(prev => ({ ...prev, [type]: true }));

    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newReport: InventoryReport = {
      id: `RPT${Date.now()}`,
      name: reportTemplates.find(t => t.type === type)?.title || 'Unknown Report',
      type: type as InventoryReport['type'],
      parameters: {
        dateRange: {
          from: params.dateFrom,
          to: params.dateTo
        },
        locations: params.locations,
        categories: params.categories,
        currency: 'USD',
        valuationMethod: params.valuationMethod
      },
      data: generateMockReportData(type),
      generatedAt: new Date().toISOString(),
      generatedBy: 'current.user',
      format: params.format
    };

    setGeneratedReports(prev => [newReport, ...prev]);
    setIsGenerating(prev => ({ ...prev, [type]: false }));
  };

  const handleGenerateComplianceReport = async (standard: string) => {
    setIsGenerating(prev => ({ ...prev, [standard]: true }));

    // Simulate compliance report generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newReport: InventoryReport = {
      id: `COMP${Date.now()}`,
      name: `${standard} Compliance Report`,
      type: 'compliance',
      parameters: {
        dateRange: {
          from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        },
        complianceStandard: standard as InventoryReport['parameters']['complianceStandard']
      },
      data: generateMockComplianceData(standard),
      generatedAt: new Date().toISOString(),
      generatedBy: 'current.user',
      format: 'pdf'
    };

    setGeneratedReports(prev => [newReport, ...prev]);
    setIsGenerating(prev => ({ ...prev, [standard]: false }));
  };

  const generateMockReportData = (type: string) => {
    switch (type) {
      case 'abc':
        return mockABCAnalysis;
      case 'turnover':
        return mockInventoryTurnover;
      case 'valuation':
        return {
          totalValue: 3250000,
          itemCount: 1250,
          categories: [
            { name: 'Electronics', value: 1800000, items: 450 },
            { name: 'Food & Beverage', value: 650000, items: 300 },
            { name: 'Construction', value: 800000, items: 500 }
          ]
        };
      default:
        return { message: 'Report generated successfully' };
    }
  };

  const generateMockComplianceData = (standard: string) => {
    return {
      standard,
      complianceScore: 95.2,
      findings: [
        {
          type: 'recommendation',
          description: 'Consider implementing automated reorder point calculations',
          severity: 'medium'
        },
        {
          type: 'requirement',
          description: 'Inventory counting procedures meet regulatory requirements',
          severity: 'low'
        }
      ],
      certificationStatus: 'compliant'
    };
  };

  // Mock data for analytics
  const reportMetrics = {
    totalGenerated: 45,
    thisMonth: 12,
    avgGenerationTime: 3.2,
    mostPopular: 'Valuation'
  };

  const monthlyReports = [
    { month: 'Jan', count: 8, automated: 3 },
    { month: 'Feb', count: 12, automated: 5 },
    { month: 'Mar', count: 15, automated: 7 },
    { month: 'Apr', count: 10, automated: 4 },
    { month: 'May', count: 18, automated: 9 },
    { month: 'Jun', count: 12, automated: 6 }
  ];

  const reportTypeDistribution = [
    { name: 'Valuation', value: 35, color: '#3B82F6' },
    { name: 'ABC Analysis', value: 25, color: '#10B981' },
    { name: 'Turnover', value: 20, color: '#F59E0B' },
    { name: 'Aging', value: 15, color: '#EF4444' },
    { name: 'Compliance', value: 5, color: '#8B5CF6' }
  ];

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Inventory Reports & Analytics</h1>
          <p className="text-gray-600">
            Generate comprehensive inventory reports and compliance documentation
          </p>
        </div>

        <div className="flex gap-4 mt-4 lg:mt-0">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
            <Calendar className="w-4 h-4" />
            Schedule Reports
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] transition-colors">
            <Settings className="w-4 h-4" />
            Report Builder
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-[#6A8A82]" />
            <div>
              <p className="text-lg font-bold text-gray-900">{reportMetrics.totalGenerated}</p>
              <p className="text-sm text-gray-600">Total Reports</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">{reportMetrics.thisMonth}</p>
              <p className="text-sm text-gray-600">This Month</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">{reportMetrics.avgGenerationTime}s</p>
              <p className="text-sm text-gray-600">Avg Generation Time</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">{reportMetrics.mostPopular}</p>
              <p className="text-sm text-gray-600">Most Popular</p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Report Generation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Report Generation</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyReports}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Total Reports"
              />
              <Area
                type="monotone"
                dataKey="automated"
                stackId="1"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.6}
                name="Automated Reports"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Report Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Report Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={reportTypeDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {reportTypeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Standard Reports */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Standard Reports</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reportTemplates.map((template) => (
            <ReportTemplate
              key={template.type}
              title={template.title}
              description={template.description}
              icon={template.icon}
              reportType={template.type}
              onGenerate={handleGenerateReport}
              isGenerating={isGenerating[template.type] || false}
            />
          ))}
        </div>
      </div>

      {/* Compliance Reports */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Compliance Reports</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ComplianceReport
            standard="IFRS_IAS2"
            onGenerate={handleGenerateComplianceReport}
            isGenerating={isGenerating['IFRS_IAS2'] || false}
          />
          <ComplianceReport
            standard="US_GAAP_ASC330"
            onGenerate={handleGenerateComplianceReport}
            isGenerating={isGenerating['US_GAAP_ASC330'] || false}
          />
          <ComplianceReport
            standard="SYSCOHADA"
            onGenerate={handleGenerateComplianceReport}
            isGenerating={isGenerating['SYSCOHADA'] || false}
          />
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Reports</h3>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              Filter
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Report Name</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Type</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Generated</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Generated By</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Format</th>
                <th className="text-center py-3 px-6 font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {generatedReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{report.name}</div>
                    <div className="text-sm text-gray-700">
                      {report.parameters.dateRange?.from} to {report.parameters.dateRange?.to}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#6A8A82]/10 text-[#6A8A82]">
                      {report.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-900">
                    {new Date(report.generatedAt).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-900">
                    {report.generatedBy}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <FileSpreadsheet className="w-4 h-4" />
                      {report.format.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="p-1 text-gray-700 hover:text-[#6A8A82]"
                        title="View Report"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-700 hover:text-green-600"
                        title="Download Report" aria-label="Télécharger">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {generatedReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-gray-700">
                    No reports generated yet. Generate your first report above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;