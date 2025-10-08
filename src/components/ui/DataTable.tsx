import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  Printer,
  X,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import SearchableDropdown from './SearchableDropdown';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select' | 'date' | 'number' | 'boolean';
  filterOptions?: { value: string; label: string }[];
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSearch?: (searchTerm: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onPrint?: () => void;
  loading?: boolean;
  searchable?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  printable?: boolean;
  selectable?: boolean;
  onSelectionChange?: (selectedItems: T[]) => void;
  actions?: ((item: T) => React.ReactNode) | Array<{icon?: any; label: string; onClick: (item: T) => void}>;
  emptyMessage?: string;
  className?: string;
}

function DataTable<T extends Record<string, any>>({
  columns,
  data,
  totalCount,
  pageSize = 10,
  currentPage = 1,
  onPageChange,
  onPageSizeChange,
  onSort,
  onFilter,
  onSearch,
  onRefresh,
  onExport,
  onPrint,
  loading = false,
  searchable = true,
  exportable = true,
  refreshable = true,
  printable = false,
  selectable = false,
  onSelectionChange,
  actions,
  emptyMessage = 'Aucune donnée disponible',
  className = '',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [localPageSize, setLocalPageSize] = useState(pageSize);
  const [localCurrentPage, setLocalCurrentPage] = useState(currentPage);

  // Calcul des données à afficher
  const displayedData = useMemo(() => {
    let filtered = [...data];

    // Recherche locale si pas de callback onSearch
    if (searchTerm && !onSearch) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filtrage local si pas de callback onFilter
    if (Object.keys(filters).length > 0 && !onFilter) {
      filtered = filtered.filter((item) => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true;
          return String(item[key]).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    // Tri local si pas de callback onSort
    if (sortKey && !onSort) {
      filtered.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        
        if (aVal === bVal) return 0;
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    // Pagination locale si pas de totalCount
    if (!totalCount) {
      const start = (localCurrentPage - 1) * localPageSize;
      const end = start + localPageSize;
      return filtered.slice(start, end);
    }

    return filtered;
  }, [data, searchTerm, filters, sortKey, sortDirection, localCurrentPage, localPageSize, onSearch, onFilter, onSort, totalCount]);

  const totalPages = Math.ceil((totalCount || data.length) / localPageSize);

  // Gestion de la recherche
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
    setLocalCurrentPage(1);
  };

  // Gestion des filtres
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    if (!value) {
      delete newFilters[key];
    }
    setFilters(newFilters);
    if (onFilter) {
      onFilter(newFilters);
    }
    setLocalCurrentPage(1);
  };

  // Gestion du tri
  const handleSort = (key: string) => {
    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    if (onSort) {
      onSort(key, newDirection);
    }
  };

  // Gestion de la pagination
  const handlePageChange = (page: number) => {
    setLocalCurrentPage(page);
    if (onPageChange) {
      onPageChange(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setLocalPageSize(size);
    setLocalCurrentPage(1);
    if (onPageSizeChange) {
      onPageSizeChange(size);
    }
  };

  // Gestion de la sélection
  const handleSelectAll = () => {
    if (selectedRows.size === displayedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(displayedData.map((_, i) => i)));
    }
  };

  const handleSelectRow = (index: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
  };

  useEffect(() => {
    if (onSelectionChange && selectable) {
      const selected = displayedData.filter((_, i) => selectedRows.has(i));
      onSelectionChange(selected);
    }
  }, [selectedRows, displayedData, onSelectionChange, selectable]);

  const renderFilterInput = (column: Column<T>) => {
    switch (column.filterType) {
      case 'select':
        return (
          <SearchableDropdown
            options={column.filterOptions || []}
            value={filters[column.key as string] || ''}
            onChange={(value) => handleFilterChange(column.key as string, value)}
            placeholder="Sélectionner"
            clearable
            className="w-full"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={filters[column.key as string] || ''}
            onChange={(e) => handleFilterChange(column.key as string, e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={filters[column.key as string] || ''}
            onChange={(e) => handleFilterChange(column.key as string, e.target.value)}
            placeholder="Valeur"
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        );
      default:
        return (
          <input
            type="text"
            value={filters[column.key as string] || ''}
            onChange={(e) => handleFilterChange(column.key as string, e.target.value)}
            placeholder="Filtrer..."
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        );
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Barre d'outils */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
          {/* Recherche */}
          {searchable && (
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-700" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg border ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {printable && onPrint && (
              <button
                onClick={onPrint}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 print-hide"
                title={t('common.print')} aria-label="Imprimer">
                <Printer className="w-4 h-4" />
              </button>
            )}

            {refreshable && onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50" aria-label="Actualiser">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {exportable && onExport && (
              <button
                onClick={onExport}
                className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" aria-label="Télécharger">
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {columns
                .filter((col) => col.filterable)
                .map((column) => (
                  <div key={column.key as string}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {column.label}
                    </label>
                    {renderFilterInput(column)}
                  </div>
                ))}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => {
                  setFilters({});
                  if (onFilter) onFilter({});
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === displayedData.length && displayedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={`px-4 py-3 text-${column.align || 'left'} text-xs font-medium text-gray-700 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key as string)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="ml-1">
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-4 h-4" />
                          ) : (
                            <ArrowDown className="w-4 h-4" />
                          )
                        ) : (
                          <ArrowUpDown className="w-4 h-4 text-gray-700" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider" style={{ width: '100px' }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-700"
                >
                  <div className="flex justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                </td>
              </tr>
            ) : displayedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-700"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              displayedData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key as string}
                      className={`px-4 py-3 text-sm text-${column.align || 'left'}`}
                    >
                      {column.render
                        ? column.render(item)
                        : item[column.key as keyof T] as React.ReactNode}
                    </td>
                  ))}
                  {actions && typeof actions === 'function' && (
                    <td className="px-4 py-3 text-center">
                      {actions(item)}
                    </td>
                  )}
                  {actions && Array.isArray(actions) && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {actions.map((action: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => action.onClick(item)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title={action.label}
                          >
                            {action.icon && <action.icon className="w-4 h-4" />}
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Afficher
            </span>
            <select
              value={localPageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="text-sm text-gray-700">
              entrées
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={localCurrentPage === 1}
              className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(localCurrentPage - 1)}
              disabled={localCurrentPage === 1}
              className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-4 py-1 text-sm text-gray-700">
              Page {localCurrentPage} sur {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(localCurrentPage + 1)}
              disabled={localCurrentPage === totalPages}
              className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={localCurrentPage === totalPages}
              className="px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-sm text-gray-700">
            {`${(localCurrentPage - 1) * localPageSize + 1} - ${
              Math.min(localCurrentPage * localPageSize, totalCount || data.length)
            } sur ${totalCount || data.length} entrées`}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataTable;