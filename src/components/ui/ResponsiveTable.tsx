import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Filter, Search, Download } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  className?: string;
  responsive?: {
    hideOn?: 'mobile' | 'tablet';
    showInCard?: boolean;
  };
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  expandable?: boolean;
  renderExpandedRow?: (row: T) => React.ReactNode;
  onSearch?: (query: string) => void;
  onFilter?: (filters: Record<string, unknown>) => void;
  onExport?: () => void;
  className?: string;
  variant?: 'default' | 'striped' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  searchable = false,
  filterable = false,
  exportable = false,
  expandable = false,
  renderExpandedRow,
  onSearch,
  onFilter,
  onExport,
  className = '',
  variant = 'default',
  size = 'md'
}: ResponsiveTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const variantClasses = {
    default: 'bg-white',
    striped: 'bg-white [&>tbody>tr:nth-child(odd)]:bg-gray-50',
    bordered: 'bg-white border border-gray-200'
  };

  // Rendu mobile (cards)
  if (isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Header avec actions */}
        {(searchable || filterable || exportable) && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {searchable && (
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    onSearch?.(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex gap-2">
              {filterable && (
                <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter className="h-4 w-4" />
                  <span>Filtres</span>
                </button>
              )}
              {exportable && (
                <button 
                  onClick={onExport}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Export</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Cards pour mobile */}
        <div className="space-y-3">
          {sortedData.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {expandable && (
                <button
                  onClick={() => toggleRowExpansion(index)}
                  className="flex items-center w-full mb-3 pb-2 border-b border-gray-100"
                >
                  {expandedRows.has(index) ? (
                    <ChevronDown className="h-4 w-4 mr-2" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2" />
                  )}
                  <span className="font-medium text-gray-900">Détails</span>
                </button>
              )}
              
              <div className="space-y-2">
                {columns
                  .filter(col => !col.responsive?.hideOn || col.responsive?.showInCard !== false)
                  .map((column) => {
                    const value = row[column.key as keyof T];
                    const displayValue = column.render 
                      ? column.render(value, row, index)
                      : value;
                    
                    return (
                      <div key={column.key as string} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-600 min-w-0 flex-1">
                          {column.title}:
                        </span>
                        <span className="text-sm text-gray-900 ml-2 flex-1 text-right">
                          {displayValue}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
              
              {expandable && expandedRows.has(index) && renderExpandedRow && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  {renderExpandedRow(row)}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Rendu desktop (table)
  return (
    <div className={className}>
      {/* Header avec actions */}
      {(searchable || filterable || exportable) && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch?.(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="flex gap-2">
            {filterable && (
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="h-4 w-4" />
                <span>Filtres</span>
              </button>
            )}
            {exportable && (
              <button 
                onClick={onExport}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table desktop avec scroll horizontal */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg" ref={tableRef}>
        <table className={`min-w-full ${sizeClasses[size]} ${variantClasses[variant]}`}>
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {expandable && <th className="w-12 px-4 py-3"></th>}
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={`px-4 py-3 text-left font-medium text-gray-900 ${column.className || ''} ${
                    column.responsive?.hideOn === 'tablet' ? 'hidden lg:table-cell' : ''
                  } ${
                    column.responsive?.hideOn === 'mobile' ? 'hidden sm:table-cell' : ''
                  }`}
                  style={{ width: column.width }}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(column.key as string)}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>{column.title}</span>
                      {sortConfig?.key === column.key && (
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform ${
                            sortConfig.direction === 'desc' ? 'rotate-180' : ''
                          }`}
                        />
                      )}
                    </button>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-4 py-8 text-center">
                  <div className="flex justify-center items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span>{t('common.loading')}</span>
                  </div>
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-4 py-8 text-center text-gray-700">
                  Aucune donnée disponible
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <React.Fragment key={index}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-gray-50"
                  >
                    {expandable && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRowExpansion(index)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expandedRows.has(index) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                    )}
                    {columns.map((column) => {
                      const value = row[column.key as keyof T];
                      const displayValue = column.render 
                        ? column.render(value, row, index)
                        : value;
                      
                      return (
                        <td
                          key={column.key as string}
                          className={`px-4 py-3 ${column.className || ''} ${
                            column.responsive?.hideOn === 'tablet' ? 'hidden lg:table-cell' : ''
                          } ${
                            column.responsive?.hideOn === 'mobile' ? 'hidden sm:table-cell' : ''
                          }`}
                        >
                          {displayValue}
                        </td>
                      );
                    })}
                  </motion.tr>
                  {expandable && expandedRows.has(index) && renderExpandedRow && (
                    <tr>
                      <td colSpan={columns.length + 1} className="px-4 py-4 bg-gray-50">
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}