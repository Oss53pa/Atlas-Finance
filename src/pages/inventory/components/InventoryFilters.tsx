import React, { useState } from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { InventoryFilters as IInventoryFilters, ValuationMethod } from '../types';
import { mockLocations } from '../utils/mockData';
import PeriodSelectorModal from '../../../components/shared/PeriodSelectorModal';

interface InventoryFiltersProps {
  filters: IInventoryFilters;
  onFiltersChange: (filters: IInventoryFilters) => void;
  onClearFilters: () => void;
}

const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const itemTypes = [
    { value: 'raw_material', label: 'Raw Materials' },
    { value: 'work_in_progress', label: 'Work in Progress' },
    { value: 'finished_goods', label: 'Finished Goods' },
    { value: 'merchandise', label: 'Merchandise' },
    { value: 'supplies', label: 'Supplies' }
  ];

  const categories = [
    { value: 'CAT001', label: 'Electronics' },
    { value: 'CAT002', label: 'Food & Beverage' },
    { value: 'CAT003', label: 'Construction Materials' },
    { value: 'CAT004', label: 'Office Supplies' },
    { value: 'CAT005', label: 'Automotive' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'discontinued', label: 'Discontinued' }
  ];

  const valuationMethods: Array<{ value: ValuationMethod; label: string }> = [
    { value: 'FIFO', label: 'FIFO (First In, First Out)' },
    { value: 'LIFO', label: 'LIFO (Last In, First Out)' },
    { value: 'WEIGHTED_AVERAGE', label: 'Weighted Average' },
    { value: 'SPECIFIC_IDENTIFICATION', label: 'Specific Identification' },
    { value: 'STANDARD_COST', label: 'Standard Cost' }
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      searchTerm: e.target.value
    });
  };

  const handleMultiSelectChange = (
    field: keyof IInventoryFilters,
    value: string,
    checked: boolean
  ) => {
    const currentValues = (filters[field] as string[]) || [];
    let newValues: string[];

    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }

    onFiltersChange({
      ...filters,
      [field]: newValues.length > 0 ? newValues : undefined
    });
  };

  const handleBooleanChange = (field: keyof IInventoryFilters, value: boolean) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  const handlePeriodSelect = (period: { startDate: string; endDate: string }) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        from: period.startDate,
        to: period.endDate
      }
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.searchTerm ||
      filters.locations?.length ||
      filters.categories?.length ||
      filters.types?.length ||
      filters.status?.length ||
      filters.valuationMethods?.length ||
      filters.dateRange?.from ||
      filters.dateRange?.to ||
      filters.showOnlyActiveItems ||
      filters.showOnlyLowStock ||
      filters.showOnlyOverstock
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Search and Toggle */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 w-4 h-4" />
          <input
            type="text"
            placeholder="Search items by SKU, name, or description..."
            value={filters.searchTerm || ''}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#171717] focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {hasActiveFilters() && (
            <span className="bg-[#171717]/100 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              !
            </span>
          )}
        </button>
        {hasActiveFilters() && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md"
          >
            <X className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t pt-4 space-y-4">
          {/* Date Range */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Période de filtrage
            </label>
            <button
              onClick={() => setShowPeriodModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:ring-2 focus:ring-[#171717] focus:border-transparent"
            >
              <Calendar className="w-4 h-4 text-gray-700" />
              {filters.dateRange?.from && filters.dateRange?.to
                ? `${filters.dateRange.from} - ${filters.dateRange.to}`
                : 'Sélectionner une période'
              }
            </button>
          </div>

          <PeriodSelectorModal
            isOpen={showPeriodModal}
            onClose={() => setShowPeriodModal(false)}
            onPeriodSelect={(period) => {
              handlePeriodSelect(period);
              setShowPeriodModal(false);
            }}
          />

          {/* Multi-select filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Locations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Locations
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                {mockLocations.map((location) => (
                  <label key={location.id} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.locations?.includes(location.id) || false}
                      onChange={(e) => handleMultiSelectChange('locations', location.id, e.target.checked)}
                      className="mr-2 text-[#171717] focus:ring-[#171717]"
                    />
                    {location.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                {categories.map((category) => (
                  <label key={category.value} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.categories?.includes(category.value) || false}
                      onChange={(e) => handleMultiSelectChange('categories', category.value, e.target.checked)}
                      className="mr-2 text-[#171717] focus:ring-[#171717]"
                    />
                    {category.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Item Types */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Types
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                {itemTypes.map((type) => (
                  <label key={type.value} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.types?.includes(type.value) || false}
                      onChange={(e) => handleMultiSelectChange('types', type.value, e.target.checked)}
                      className="mr-2 text-[#171717] focus:ring-[#171717]"
                    />
                    {type.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Single select and boolean filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="space-y-2">
                {statusOptions.map((status) => (
                  <label key={status.value} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.status?.includes(status.value) || false}
                      onChange={(e) => handleMultiSelectChange('status', status.value, e.target.checked)}
                      className="mr-2 text-[#171717] focus:ring-[#171717]"
                    />
                    {status.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Valuation Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valuation Methods
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {valuationMethods.map((method) => (
                  <label key={method.value} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={filters.valuationMethods?.includes(method.value) || false}
                      onChange={(e) => handleMultiSelectChange('valuationMethods', method.value, e.target.checked)}
                      className="mr-2 text-[#171717] focus:ring-[#171717]"
                    />
                    {method.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Boolean filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Filters
              </label>
              <div className="space-y-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyActiveItems || false}
                    onChange={(e) => handleBooleanChange('showOnlyActiveItems', e.target.checked)}
                    className="mr-2 text-[#171717] focus:ring-[#171717]"
                  />
                  Active Items Only
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyLowStock || false}
                    onChange={(e) => handleBooleanChange('showOnlyLowStock', e.target.checked)}
                    className="mr-2 text-orange-600 focus:ring-orange-500"
                  />
                  Low Stock Only
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyOverstock || false}
                    onChange={(e) => handleBooleanChange('showOnlyOverstock', e.target.checked)}
                    className="mr-2 text-red-600 focus:ring-red-500"
                  />
                  Overstock Only
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryFilters;