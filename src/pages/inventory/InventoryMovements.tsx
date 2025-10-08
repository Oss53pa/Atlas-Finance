import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ArrowUpDown,
  Package,
  Truck,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Calendar,
  MapPin,
  User,
  FileText,
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw
} from 'lucide-react';
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
  Area,
  AreaChart
} from 'recharts';
import { InventoryMovement, InventoryFilters, SortOption } from './types';
import { mockInventoryMovements, mockInventoryItems, mockLocations, generateMockMovements } from './utils/mockData';
import CurrencyDisplay from './components/CurrencyDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Pagination from './components/Pagination';
import ExportButton from './components/ExportButton';

interface MovementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: InventoryMovement | null;
}

const MovementDetailsModal: React.FC<MovementDetailsModalProps> = ({
  const { t } = useLanguage();
  isOpen,
  onClose,
  movement
}) => {
  if (!isOpen || !movement) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{movement.movementNumber}</h3>
              <p className="text-gray-600">{movement.subType}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-700 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Movement Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
              <p className="text-sm text-gray-900">{new Date(movement.date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                movement.status === 'posted' ? 'bg-green-100 text-green-800' :
                movement.status === 'approved' ? 'bg-[#6A8A82]/10 text-[#6A8A82]' :
                movement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {movement.status === 'posted' ? <CheckCircle className="w-3 h-3" /> :
                 movement.status === 'approved' ? <Clock className="w-3 h-3" /> :
                 movement.status === 'pending' ? <AlertTriangle className="w-3 h-3" /> :
                 <XCircle className="w-3 h-3" />}
                {movement.status.toUpperCase()}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Value</label>
              <p className="text-lg font-semibold text-gray-900">
                <CurrencyDisplay amount={movement.totalValue} currency={movement.currency} />
              </p>
            </div>
          </div>

          {/* Reference Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-2">Reference Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Reference Type:</span>
                <p className="font-medium">{movement.reference.type.replace('_', ' ').toUpperCase()}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Reference Number:</span>
                <p className="font-medium">{movement.reference.number}</p>
              </div>
            </div>
          </div>

          {/* Movement Items */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Items</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Item</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Quantity</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Unit Cost</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-900">Total Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Tracking</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {movement.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-700">{item.sku}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-mono">
                        {item.quantity.toLocaleString()} {item.unitOfMeasure}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <CurrencyDisplay amount={item.unitCost} currency={movement.currency} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">
                        <CurrencyDisplay amount={item.totalCost} currency={movement.currency} size="sm" />
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {item.fromLocationId && (
                          <div className="text-red-600 mb-1">
                            From: {mockLocations.find(l => l.id === item.fromLocationId)?.name}
                          </div>
                        )}
                        <div className="text-green-600">
                          To: {mockLocations.find(l => l.id === item.toLocationId)?.name}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {item.batchNumber && <div>Batch: {item.batchNumber}</div>}
                        {item.lotNumber && <div>Lot: {item.lotNumber}</div>}
                        {item.serialNumbers && item.serialNumbers.length > 0 && (
                          <div>Serials: {item.serialNumbers.slice(0, 2).join(', ')}
                            {item.serialNumbers.length > 2 && ` +${item.serialNumbers.length - 2} more`}
                          </div>
                        )}
                        {item.expirationDate && (
                          <div>Exp: {new Date(item.expirationDate).toLocaleDateString()}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Audit Trail</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Created by:</span>
                <span className="font-medium">{movement.createdBy} on {new Date(movement.createdAt).toLocaleString()}</span>
              </div>
              {movement.approvedBy && movement.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved by:</span>
                  <span className="font-medium">{movement.approvedBy} on {new Date(movement.approvedAt).toLocaleString()}</span>
                </div>
              )}
              {movement.postedBy && movement.postedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Posted by:</span>
                  <span className="font-medium">{movement.postedBy} on {new Date(movement.postedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {movement.notes && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{movement.notes}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const InventoryMovements: React.FC = () => {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMovement, setSelectedMovement] = useState<InventoryMovement | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    searchTerm: '',
    type: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    locationId: 'all'
  });
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate more mock movements
      const additionalMovements = generateMockMovements(20);
      setMovements([...mockInventoryMovements, ...additionalMovements]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = [...movements];

    // Apply filters
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(movement =>
        movement.movementNumber.toLowerCase().includes(searchTerm) ||
        movement.reference.number.toLowerCase().includes(searchTerm) ||
        movement.items.some(item =>
          item.name.toLowerCase().includes(searchTerm) ||
          item.sku.toLowerCase().includes(searchTerm)
        )
      );
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(movement => movement.type === filters.type);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(movement => movement.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(movement =>
        new Date(movement.date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(movement =>
        new Date(movement.date) <= new Date(filters.dateTo)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const direction = sortOption.direction === 'asc' ? 1 : -1;

      switch (sortOption.field) {
        case 'date':
          return direction * (new Date(a.date).getTime() - new Date(b.date).getTime());
        case 'movementNumber':
          return direction * a.movementNumber.localeCompare(b.movementNumber);
        case 'type':
          return direction * a.type.localeCompare(b.type);
        case 'status':
          return direction * a.status.localeCompare(b.status);
        case 'totalValue':
          return direction * (a.totalValue - b.totalValue);
        default:
          return 0;
      }
    });

    return filtered;
  }, [movements, filters, sortOption]);

  // Pagination
  const totalItems = filteredAndSortedData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: string) => {
    setSortOption(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getMovementIcon = (type: InventoryMovement['type']) => {
    switch (type) {
      case 'receipt':
        return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'issue':
        return <ArrowUp className="w-4 h-4 text-red-600" />;
      case 'transfer':
        return <ArrowRight className="w-4 h-4 text-[#6A8A82]" />;
      case 'adjustment':
        return <ArrowUpDown className="w-4 h-4 text-yellow-600" />;
      case 'production':
        return <Package className="w-4 h-4 text-purple-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: InventoryMovement['status']) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-[#6A8A82]/10 text-[#6A8A82]', icon: CheckCircle },
      posted: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <IconComponent className="w-3 h-3" />
        {status.toUpperCase()}
      </span>
    );
  };

  // Analytics data
  const movementsByType = movements.reduce((acc, movement) => {
    acc[movement.type] = (acc[movement.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const dailyMovements = movements.reduce((acc, movement) => {
    const date = new Date(movement.date).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { date, count: 0, value: 0 };
    }
    acc[date].count += 1;
    acc[date].value += movement.totalValue;
    return acc;
  }, {} as Record<string, { date: string; count: number; value: number }>);

  const chartData = Object.values(dailyMovements)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-7); // Last 7 days

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading inventory movements..." />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Movements</h1>
          <p className="text-gray-600">
            Track all inventory transactions including receipts, issues, transfers, and adjustments
          </p>
        </div>

        <div className="flex gap-4 mt-4 lg:mt-0">
          <ExportButton
            data={filteredAndSortedData}
            filename="inventory_movements"
            title="Inventory Movements Report"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] transition-colors">
            <Plus className="w-4 h-4" />
            New Movement
          </button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <ArrowUpDown className="w-8 h-8 text-[#6A8A82]" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{movements.length}</p>
              <p className="text-sm text-gray-600">Total Movements</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <ArrowDown className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {movements.filter(m => m.type === 'receipt').length}
              </p>
              <p className="text-sm text-gray-600">Receipts</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <ArrowUp className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {movements.filter(m => m.type === 'issue').length}
              </p>
              <p className="text-sm text-gray-600">Issues</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <ArrowRight className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {movements.filter(m => m.type === 'transfer').length}
              </p>
              <p className="text-sm text-gray-600">Transfers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Movement Types Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Movement Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={Object.entries(movementsByType).map(([type, count]) => ({
                  name: type.charAt(0).toUpperCase() + type.slice(1),
                  value: count
                }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {Object.entries(movementsByType).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Daily Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Daily Activity (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString()} />
              <YAxis />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  name === 'value' ? `$${value.toLocaleString()}` : value,
                  name === 'value' ? 'Total Value' : 'Movement Count'
                ]}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.1}
                yAxisId="value"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-4 h-4" />
              <input
                type="text"
                placeholder="Search movements..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="receipt">Receipt</option>
              <option value="issue">Issue</option>
              <option value="transfer">Transfer</option>
              <option value="adjustment">Adjustment</option>
              <option value="production">Production</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
            />
          </div>

          {/* Date To */}
          <div>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#6A8A82] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('movementNumber')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#6A8A82]"
                  >
                    Movement #
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('type')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#6A8A82]"
                  >
                    Type
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('date')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#6A8A82]"
                  >
                    Date
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">Reference</th>
                <th className="text-right py-3 px-4">Items</th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('totalValue')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#6A8A82]"
                  >
                    Value
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center py-3 px-4">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#6A8A82]"
                  >
                    Status
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">Created By</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">{movement.movementNumber}</div>
                    <div className="text-sm text-gray-700">{movement.subType}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {getMovementIcon(movement.type)}
                      <span className="capitalize">{movement.type}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {new Date(movement.date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{movement.reference.number}</div>
                      <div className="text-gray-700">{movement.reference.type.replace('_', ' ')}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    {movement.items.length}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <CurrencyDisplay amount={movement.totalValue} currency={movement.currency} size="sm" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    {getStatusBadge(movement.status)}
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-900">
                    {movement.createdBy}
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedMovement(movement);
                          setIsDetailsModalOpen(true);
                        }}
                        className="p-1 text-gray-700 hover:text-[#6A8A82]"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {movement.status === 'draft' && (
                        <button
                          className="p-1 text-gray-700 hover:text-green-600"
                          title="Edit Movement"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-gray-200 p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {/* Movement Details Modal */}
      <MovementDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        movement={selectedMovement}
      />
    </div>
  );
};

export default InventoryMovements;