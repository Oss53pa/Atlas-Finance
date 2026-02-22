import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { DataTableProps, Column } from './DataTable.types';
import { useDataTable } from './useDataTable';

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  selectedRows,
  onSelectionChange,
  getRowId = (row, index) => row.id || index.toString(),
  pagination,
  sorting,
  selectable = false,
  stickyHeader = false,
  striped = true,
  hoverable = true,
  bordered = false,
  compact = false,
  className = '',
  actions,
}: DataTableProps<T>) => {
  const { t } = useLanguage();
  const internalTableState = useDataTable({
    data,
    columns,
    defaultPageSize: pagination?.pageSize || 10,
  });

  const displayData = pagination ? data : internalTableState.displayData;
  const isControlled = !!pagination || !!sorting;

  const handleSort = (column: string) => {
    if (sorting) {
      const newDirection = sorting.column === column && sorting.direction === 'asc' ? 'desc' : 'asc';
      sorting.onSortChange(column, newDirection);
    } else {
      internalTableState.handleSort(column);
    }
  };

  const activeSortColumn = sorting?.column || internalTableState.sortedColumn;
  const activeSortDirection = sorting?.direction || internalTableState.sortDirection;

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allIds = new Set(data.map((row, index) => getRowId(row, index)));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (!onSelectionChange || !selectedRows) return;

    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(rowId);
    } else {
      newSelection.delete(rowId);
    }
    onSelectionChange(newSelection);
  };

  const getCellValue = (row: T, column: Column<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === 'function') {
        return column.accessor(row);
      }
      return row[column.accessor];
    }
    return row[column.key];
  };

  const renderCell = (row: T, column: Column<T>) => {
    const value = getCellValue(row, column);
    if (column.render) {
      return column.render(value, row);
    }
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#171717]" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-[#737373]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-[#d4d4d4] bg-white ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full ${compact ? 'text-sm' : ''}`}>
          <thead className={`bg-[#FAFAFA] border-b border-[#e5e5e5] ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows?.size === data.length && data.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-[#d4d4d4] text-[#171717] focus:ring-[#171717]"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-4 ${compact ? 'py-2' : 'py-3'}
                    text-left text-xs font-semibold text-[#404040] uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer select-none hover:bg-[#e5e5e5]' : ''}
                    ${column.align === 'center' ? 'text-center' : ''}
                    ${column.align === 'right' ? 'text-right' : ''}
                    ${column.className || ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="inline-flex">
                        {activeSortColumn === column.key ? (
                          activeSortDirection === 'asc' ? (
                            <ChevronUp className="h-4 w-4 text-[#171717]" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-[#171717]" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 text-[#737373]" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#404040] uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#e5e5e5]">
            {displayData.map((row, index) => {
              const rowId = getRowId(row, index);
              const isSelected = selectedRows?.has(rowId);

              return (
                <tr
                  key={rowId}
                  className={`
                    ${striped && index % 2 === 1 ? 'bg-[#FAFAFA]' : ''}
                    ${hoverable ? 'hover:bg-[#F5F5F5] transition-colors' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${isSelected ? 'bg-[#171717]/5' : ''}
                    ${bordered ? 'border-b border-[#e5e5e5]' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(rowId, e.target.checked);
                        }}
                        className="rounded border-[#d4d4d4] text-[#171717] focus:ring-[#171717]"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        px-4 ${compact ? 'py-2' : 'py-3'}
                        text-sm text-[#171717]
                        ${column.align === 'center' ? 'text-center' : ''}
                        ${column.align === 'right' ? 'text-right' : ''}
                        ${column.className || ''}
                      `}
                    >
                      {renderCell(row, column)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 py-3 border-t border-[#e5e5e5] bg-[#FAFAFA] flex items-center justify-between">
          <div className="text-sm text-[#737373]">
            Affichage {Math.min((pagination.currentPage - 1) * pagination.pageSize + 1, pagination.totalItems)} à{' '}
            {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} sur {pagination.totalItems} résultats
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pagination.pageSize}
              onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-[#d4d4d4] rounded text-sm text-[#171717] focus:outline-none focus:ring-2 focus:ring-[#171717]"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <div className="flex gap-1">
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1}
                className="px-3 py-1 border border-[#d4d4d4] rounded text-sm text-[#171717] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage * pagination.pageSize >= pagination.totalItems}
                className="px-3 py-1 border border-[#d4d4d4] rounded text-sm text-[#171717] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

DataTable.displayName = 'DataTable';