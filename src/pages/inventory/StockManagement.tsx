import React, { useState } from 'react';
import {
  Package,
  MapPin,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  ArrowUpDown,
  Eye,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Truck,
  Clock
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DBInventoryItem } from '../../lib/db';
import { InventoryFilters, SortOption } from './types';
import FilterComponent from './components/InventoryFilters';
import StockStatusBadge from './components/StockStatusBadge';
import ValuationMethodBadge from './components/ValuationMethodBadge';
import CurrencyDisplay from './components/CurrencyDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import Pagination from './components/Pagination';
import ExportButton from './components/ExportButton';

/** Adapted view-model mapped from DBInventoryItem for the stock table */
interface StockLevelWithItem {
  itemId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAvailable: number;
  quantityAllocated: number;
  quantityOnOrder: number;
  totalValue: number;
  valuationMethod: 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE' | 'SPECIFIC_IDENTIFICATION' | 'STANDARD_COST';
  lastMovementDate: string;
  item: {
    name: string;
    sku: string;
    description: string;
    category: { id: string; name: string; code: string };
    type: string;
  };
  location: {
    id: string;
    name: string;
  };
  reorderRule?: {
    minimumStock: number;
    maximumStock: number;
    reorderPoint: number;
  };
}

/** Convert a DBInventoryItem to the view-model used by the table */
function toStockLevelWithItem(item: DBInventoryItem): StockLevelWithItem {
  return {
    itemId: item.id,
    locationId: item.location,
    quantityOnHand: item.quantity,
    quantityAvailable: item.quantity,
    quantityAllocated: 0,
    quantityOnOrder: 0,
    totalValue: item.quantity * item.unitCost,
    valuationMethod: 'WEIGHTED_AVERAGE',
    lastMovementDate: item.lastMovementDate || item.updatedAt,
    item: {
      name: item.name,
      sku: item.code,
      description: item.name,
      category: { id: item.category, name: item.category, code: item.category },
      type: 'merchandise',
    },
    location: {
      id: item.location,
      name: item.location,
    },
    reorderRule: {
      minimumStock: item.minStock,
      maximumStock: item.maxStock,
      reorderPoint: item.minStock,
    },
  };
}

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockLevel: StockLevelWithItem | null;
  type: 'adjustment' | 'transfer' | 'view';
  locations: Array<{ id: string; name: string }>;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  stockLevel,
  type,
  locations
}) => {
  const [formData, setFormData] = useState({
    quantity: 0,
    reason: '',
    notes: '',
    toLocationId: '',
    unitCost: 0
  });

  if (!isOpen || !stockLevel) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle stock movement submission
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {type === 'view' ? 'Stock Details' :
               type === 'adjustment' ? 'Stock Adjustment' : 'Stock Transfer'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-700 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {type === 'view' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item
                </label>
                <p className="text-sm text-gray-900">{stockLevel.item.name}</p>
                <p className="text-xs text-gray-700">{stockLevel.item.sku}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <p className="text-sm text-gray-900">{stockLevel.location.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    On Hand
                  </label>
                  <p className="text-sm font-semibold text-gray-900">
                    {stockLevel.quantityOnHand.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Available
                  </label>
                  <p className="text-sm font-semibold text-green-600">
                    {stockLevel.quantityAvailable.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allocated
                  </label>
                  <p className="text-sm text-yellow-600">
                    {stockLevel.quantityAllocated.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    On Order
                  </label>
                  <p className="text-sm text-[#171717]">
                    {stockLevel.quantityOnOrder.toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Value
                </label>
                <p className="text-lg font-semibold text-gray-900">
                  <CurrencyDisplay amount={stockLevel.totalValue} currency="USD" />
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valuation Method
                </label>
                <ValuationMethodBadge method={stockLevel.valuationMethod} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <StockStatusBadge
                  quantity={stockLevel.quantityOnHand}
                  minimumStock={stockLevel.reorderRule?.minimumStock}
                  maximumStock={stockLevel.reorderRule?.maximumStock}
                  reorderPoint={stockLevel.reorderRule?.reorderPoint}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item
                </label>
                <p className="text-sm text-gray-900">{stockLevel.item.name}</p>
                <p className="text-xs text-gray-700">{stockLevel.item.sku}</p>
              </div>

              {type === 'transfer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Location
                  </label>
                  <select
                    value={formData.toLocationId}
                    onChange={(e) => setFormData({ ...formData, toLocationId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                    required
                  >
                    <option value="">Select location...</option>
                    {locations
                      .filter(loc => loc.id !== stockLevel.locationId)
                      .map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  min={type === 'adjustment' ? -stockLevel.quantityOnHand : 0}
                  max={type === 'transfer' ? stockLevel.quantityAvailable : undefined}
                  required
                />
                <p className="text-xs text-gray-700 mt-1">
                  {type === 'transfer'
                    ? `Available: ${stockLevel.quantityAvailable}`
                    : `Current: ${stockLevel.quantityOnHand}`
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  required
                >
                  <option value="">Select reason...</option>
                  {type === 'adjustment' ? (
                    <>
                      <option value="physical_count">Physical Count Variance</option>
                      <option value="damage">Damage</option>
                      <option value="obsolescence">Obsolescence</option>
                      <option value="theft">Theft/Loss</option>
                      <option value="error_correction">Error Correction</option>
                    </>
                  ) : (
                    <>
                      <option value="restock">Restocking</option>
                      <option value="customer_request">Customer Request</option>
                      <option value="optimization">Inventory Optimization</option>
                      <option value="emergency">Emergency Transfer</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-[#171717] text-white py-2 px-4 rounded-md hover:bg-[#262626] transition-colors"
                >
                  {type === 'adjustment' ? 'Adjust Stock' : 'Transfer Stock'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const StockManagement: React.FC = () => {
  const inventoryItems = useLiveQuery(() => db.inventoryItems.toArray()) || [];

  const stockLevels = React.useMemo(
    () => inventoryItems.map(toStockLevelWithItem),
    [inventoryItems]
  );

  // Derive unique locations for the transfer modal
  const uniqueLocations = React.useMemo(() => {
    const locSet = new Map<string, string>();
    inventoryItems.forEach(item => {
      if (!locSet.has(item.location)) {
        locSet.set(item.location, item.location);
      }
    });
    return Array.from(locSet.entries()).map(([id, name]) => ({ id, name }));
  }, [inventoryItems]);

  const isLoading = inventoryItems === undefined;
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'item.name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedStock, setSelectedStock] = useState<StockLevelWithItem | null>(null);
  const [modalType, setModalType] = useState<'adjustment' | 'transfer' | 'view'>('view');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter and sort data
  const filteredAndSortedData = React.useMemo(() => {
    let filtered = [...stockLevels];

    // Apply filters
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(stock =>
        stock.item.name.toLowerCase().includes(searchTerm) ||
        stock.item.sku.toLowerCase().includes(searchTerm) ||
        stock.item.description.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.locations?.length) {
      filtered = filtered.filter(stock => filters.locations!.includes(stock.locationId));
    }

    if (filters.categories?.length) {
      filtered = filtered.filter(stock => filters.categories!.includes(stock.item.category.id));
    }

    if (filters.types?.length) {
      filtered = filtered.filter(stock => filters.types!.includes(stock.item.type));
    }

    if (filters.valuationMethods?.length) {
      filtered = filtered.filter(stock => filters.valuationMethods!.includes(stock.valuationMethod));
    }

    if (filters.showOnlyLowStock) {
      filtered = filtered.filter(stock => {
        const reorderPoint = stock.reorderRule?.reorderPoint || 0;
        return stock.quantityOnHand <= reorderPoint;
      });
    }

    if (filters.showOnlyOverstock) {
      filtered = filtered.filter(stock => {
        const maxStock = stock.reorderRule?.maximumStock || Infinity;
        return stock.quantityOnHand > maxStock;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const direction = sortOption.direction === 'asc' ? 1 : -1;

      switch (sortOption.field) {
        case 'item.name':
          return direction * a.item.name.localeCompare(b.item.name);
        case 'item.sku':
          return direction * a.item.sku.localeCompare(b.item.sku);
        case 'location.name':
          return direction * a.location.name.localeCompare(b.location.name);
        case 'quantityOnHand':
          return direction * (a.quantityOnHand - b.quantityOnHand);
        case 'quantityAvailable':
          return direction * (a.quantityAvailable - b.quantityAvailable);
        case 'totalValue':
          return direction * (a.totalValue - b.totalValue);
        case 'lastMovementDate':
          return direction * (new Date(a.lastMovementDate).getTime() - new Date(b.lastMovementDate).getTime());
        default:
          return 0;
      }
    });

    return filtered;
  }, [stockLevels, filters, sortOption]);

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

  const handleStockAction = (stock: StockLevelWithItem, action: 'view' | 'adjust' | 'transfer') => {
    setSelectedStock(stock);
    setModalType(action);
    setIsModalOpen(true);
  };

  const getStockAlerts = () => {
    return stockLevels.reduce((alerts, stock) => {
      const reorderPoint = stock.reorderRule?.reorderPoint || 0;
      const maxStock = stock.reorderRule?.maximumStock || Infinity;

      if (stock.quantityOnHand <= 0) {
        alerts.outOfStock++;
      } else if (stock.quantityOnHand <= reorderPoint) {
        alerts.lowStock++;
      } else if (stock.quantityOnHand > maxStock) {
        alerts.overstock++;
      }

      return alerts;
    }, { outOfStock: 0, lowStock: 0, overstock: 0 });
  };

  const alerts = getStockAlerts();

  if (isLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading stock levels..." />
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Stock Management</h1>
          <p className="text-gray-600">
            Real-time stock levels and inventory movements across all locations
          </p>
        </div>

        <div className="flex gap-4 mt-4 lg:mt-0">
          <ExportButton
            data={filteredAndSortedData}
            filename="stock_levels"
            title="Stock Levels Report"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Stock Movement
          </button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <p className="text-lg font-semibold text-red-800">{alerts.outOfStock}</p>
              <p className="text-sm text-red-600">Out of Stock</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="text-lg font-semibold text-yellow-800">{alerts.lowStock}</p>
              <p className="text-sm text-yellow-600">Low Stock</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-orange-600" />
            <div>
              <p className="text-lg font-semibold text-orange-800">{alerts.overstock}</p>
              <p className="text-sm text-orange-600">Overstock</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <FilterComponent
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({})}
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('item.name')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#171717]"
                  >
                    Item
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('location.name')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#171717]"
                  >
                    Location
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('quantityOnHand')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#171717]"
                  >
                    On Hand
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-right py-3 px-4">Available</th>
                <th className="text-right py-3 px-4">Allocated</th>
                <th className="text-right py-3 px-4">On Order</th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('totalValue')}
                    className="flex items-center gap-1 font-medium text-gray-900 hover:text-[#171717]"
                  >
                    Value
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-center py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Valuation</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedData.map((stock) => (
                <tr key={`${stock.itemId}-${stock.locationId}`} className="hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-medium text-gray-900">{stock.item.name}</div>
                      <div className="text-sm text-gray-700">{stock.item.sku}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-700" />
                      <span className="text-sm text-gray-900">{stock.location.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    {stock.quantityOnHand.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-green-600">
                    {stock.quantityAvailable.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-yellow-600">
                    {stock.quantityAllocated.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right font-mono text-[#171717]">
                    {stock.quantityOnOrder.toLocaleString()}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <CurrencyDisplay amount={stock.totalValue} currency="USD" size="sm" />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <StockStatusBadge
                      quantity={stock.quantityOnHand}
                      minimumStock={stock.reorderRule?.minimumStock}
                      maximumStock={stock.reorderRule?.maximumStock}
                      reorderPoint={stock.reorderRule?.reorderPoint}
                    />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <ValuationMethodBadge method={stock.valuationMethod} showIcon={false} />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleStockAction(stock, 'view')}
                        className="p-1 text-gray-700 hover:text-[#171717]"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStockAction(stock, 'adjust')}
                        className="p-1 text-gray-700 hover:text-green-600"
                        title="Adjust Stock"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStockAction(stock, 'transfer')}
                        className="p-1 text-gray-700 hover:text-purple-600"
                        title="Transfer Stock"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
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

      {/* Stock Movement Modal */}
      <StockMovementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stockLevel={selectedStock}
        type={modalType}
        locations={uniqueLocations}
      />
    </div>
  );
};

export default StockManagement;