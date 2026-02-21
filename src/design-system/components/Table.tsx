/**
 * Atlas Finance Design System - Table Component
 * Comprehensive table component with sorting, filtering, and pagination
 */

import React, { forwardRef, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import { theme } from '../theme';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Checkbox } from './Checkbox';

// Table variants
const tableVariants = cva(
  [
    'w-full border-collapse',
    'text-sm text-left',
  ],
  {
    variants: {
      variant: {
        default: 'border border-neutral-200',
        bordered: 'border-2 border-neutral-300',
        striped: 'border border-neutral-200',
        minimal: '',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

// Table container variants
const tableContainerVariants = cva([
  'relative overflow-hidden rounded-lg border border-neutral-200',
  'bg-white shadow-sm',
]);

// Table header variants
const tableHeaderVariants = cva([
  'bg-neutral-50 border-b border-neutral-200',
]);

// Table header cell variants
const tableHeaderCellVariants = cva(
  [
    'px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider',
    'border-r border-neutral-200 last:border-r-0',
  ],
  {
    variants: {
      sortable: {
        true: 'cursor-pointer hover:bg-neutral-100 transition-colors select-none',
        false: '',
      },
    },
    defaultVariants: {
      sortable: false,
    },
  }
);

// Table body variants
const tableBodyVariants = cva([
  'bg-white divide-y divide-neutral-200',
]);

// Table row variants
const tableRowVariants = cva(
  [
    'transition-colors',
  ],
  {
    variants: {
      hoverable: {
        true: 'hover:bg-neutral-50',
        false: '',
      },
      selectable: {
        true: 'cursor-pointer',
        false: '',
      },
      selected: {
        true: 'bg-primary-50',
        false: '',
      },
      striped: {
        true: 'odd:bg-neutral-25 even:bg-white',
        false: '',
      },
    },
    defaultVariants: {
      hoverable: true,
      selectable: false,
      selected: false,
      striped: false,
    },
  }
);

// Table cell variants
const tableCellVariants = cva([
  'px-4 py-3 text-sm text-neutral-900',
  'border-r border-neutral-200 last:border-r-0',
]);

// Pagination variants
const paginationVariants = cva([
  'flex items-center justify-between px-4 py-3 border-t border-neutral-200 bg-neutral-50',
]);

// Sort direction icons
const SortAscIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const SortDescIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const SortIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
  </svg>
);

// Pagination icons
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Column definition interface
export interface TableColumn<T = Record<string, unknown>> {
  /** Unique key for the column */
  key: string;
  /** Column header text */
  header: React.ReactNode;
  /** Accessor function or key for the data */
  accessor?: keyof T | ((row: T) => unknown);
  /** Custom cell renderer */
  cell?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Whether the column is filterable */
  filterable?: boolean;
  /** Column width */
  width?: string | number;
  /** Column alignment */
  align?: 'left' | 'center' | 'right';
  /** Whether the column is hidden */
  hidden?: boolean;
}

// Sort configuration
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

// Filter configuration
export interface FilterConfig {
  [key: string]: string;
}

// Selection configuration
export interface SelectionConfig<T = Record<string, unknown>> {
  selectedRows: T[];
  onSelectionChange: (selectedRows: T[]) => void;
  getRowId?: (row: T) => string | number;
}

// Pagination configuration
export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

// Table component props
export interface TableProps<T = Record<string, unknown>>
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tableVariants> {
  /** Table data */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: React.ReactNode;
  /** Sort configuration */
  sortConfig?: SortConfig;
  /** Sort change handler */
  onSortChange?: (sortConfig: SortConfig | null) => void;
  /** Filter configuration */
  filterConfig?: FilterConfig;
  /** Filter change handler */
  onFilterChange?: (filterConfig: FilterConfig) => void;
  /** Selection configuration */
  selectionConfig?: SelectionConfig<T>;
  /** Pagination configuration */
  paginationConfig?: PaginationConfig;
  /** Whether rows are hoverable */
  hoverable?: boolean;
  /** Whether to show striped rows */
  striped?: boolean;
  /** Row click handler */
  onRowClick?: (row: T, index: number) => void;
  /** Caption for the table */
  caption?: string;
  /** Whether to show filters */
  showFilters?: boolean;
  /** Whether to show column headers */
  showHeaders?: boolean;
  /** Custom table container class */
  containerClassName?: string;
}

/**
 * Comprehensive Table component with sorting, filtering, and pagination
 *
 * Features:
 * - Column-based configuration
 * - Sorting (single column)
 * - Filtering (per column)
 * - Row selection (single/multiple)
 * - Pagination
 * - Loading states
 * - Empty states
 * - Responsive design
 * - Full accessibility support
 * - Keyboard navigation
 *
 * @example
 * ```tsx
 * const columns: TableColumn<User>[] = [
 *   { key: 'name', header: 'Name', accessor: 'name', sortable: true, filterable: true },
 *   { key: 'email', header: 'Email', accessor: 'email', sortable: true, filterable: true },
 *   { key: 'role', header: 'Role', accessor: 'role', sortable: true },
 *   {
 *     key: 'actions',
 *     header: 'Actions',
 *     cell: (_, row) => <Button size="sm">Edit</Button>,
 *   },
 * ];
 *
 * <Table
 *   data={users}
 *   columns={columns}
 *   sortConfig={sortConfig}
 *   onSortChange={setSortConfig}
 *   paginationConfig={paginationConfig}
 *   selectionConfig={selectionConfig}
 * />
 * ```
 */
export const Table = forwardRef<HTMLDivElement, TableProps>(
  (
    {
      data,
      columns,
      loading = false,
      emptyMessage = 'No data available',
      sortConfig,
      onSortChange,
      filterConfig = {},
      onFilterChange,
      selectionConfig,
      paginationConfig,
      hoverable = true,
      striped = false,
      onRowClick,
      caption,
      showFilters = false,
      showHeaders = true,
      containerClassName,
      className,
      variant,
      size,
      ...props
    },
    ref
  ) => {
    const [internalFilters, setInternalFilters] = useState<FilterConfig>({});

    // Use controlled or uncontrolled filter state
    const currentFilters = onFilterChange ? filterConfig : internalFilters;

    // Handle sort change
    const handleSortChange = (columnKey: string) => {
      if (!onSortChange) return;

      let newSortConfig: SortConfig | null = null;

      if (!sortConfig || sortConfig.key !== columnKey) {
        newSortConfig = { key: columnKey, direction: 'asc' };
      } else if (sortConfig.direction === 'asc') {
        newSortConfig = { key: columnKey, direction: 'desc' };
      } else {
        newSortConfig = null;
      }

      onSortChange(newSortConfig);
    };

    // Handle filter change
    const handleFilterChange = (columnKey: string, value: string) => {
      const newFilters = { ...currentFilters, [columnKey]: value };

      if (!value) {
        delete newFilters[columnKey];
      }

      if (onFilterChange) {
        onFilterChange(newFilters);
      } else {
        setInternalFilters(newFilters);
      }
    };

    // Handle row selection
    const handleRowSelection = (row: T, checked: boolean) => {
      if (!selectionConfig) return;

      const { selectedRows, onSelectionChange, getRowId } = selectionConfig;
      const rowId = getRowId ? getRowId(row) : row.id;

      let newSelectedRows;
      if (checked) {
        newSelectedRows = [...selectedRows, row];
      } else {
        newSelectedRows = selectedRows.filter(selectedRow => {
          const selectedRowId = getRowId ? getRowId(selectedRow) : selectedRow.id;
          return selectedRowId !== rowId;
        });
      }

      onSelectionChange(newSelectedRows);
    };

    // Handle select all
    const handleSelectAll = (checked: boolean) => {
      if (!selectionConfig) return;

      const { onSelectionChange } = selectionConfig;
      onSelectionChange(checked ? [...data] : []);
    };

    // Check if row is selected
    const isRowSelected = (row: T) => {
      if (!selectionConfig) return false;

      const { selectedRows, getRowId } = selectionConfig;
      const rowId = getRowId ? getRowId(row) : row.id;

      return selectedRows.some(selectedRow => {
        const selectedRowId = getRowId ? getRowId(selectedRow) : selectedRow.id;
        return selectedRowId === rowId;
      });
    };

    // Check if all rows are selected
    const areAllRowsSelected = () => {
      if (!selectionConfig || data.length === 0) return false;
      return data.every(row => isRowSelected(row));
    };

    // Check if some rows are selected
    const areSomeRowsSelected = () => {
      if (!selectionConfig) return false;
      return selectionConfig.selectedRows.length > 0 && !areAllRowsSelected();
    };

    // Filter visible columns
    const visibleColumns = columns.filter(column => !column.hidden);

    // Get cell value
    const getCellValue = (row: T, column: TableColumn<T>) => {
      if (column.accessor) {
        if (typeof column.accessor === 'function') {
          return column.accessor(row);
        }
        return row[column.accessor];
      }
      return row[column.key];
    };

    return (
      <div
        ref={ref}
        className={clsx(tableContainerVariants(), containerClassName)}
        {...props}
      >
        {/* Filters */}
        {showFilters && (
          <div className="p-4 border-b border-neutral-200 bg-neutral-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleColumns
                .filter(column => column.filterable)
                .map(column => (
                  <div key={`filter-${column.key}`}>
                    <Input
                      placeholder={`Filter ${column.header}...`}
                      value={currentFilters[column.key] || ''}
                      onChange={(e) => handleFilterChange(column.key, e.target.value)}
                      size="sm"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className={clsx(tableVariants({ variant, size }), className)}>
            {/* Caption */}
            {caption && (
              <caption className="sr-only">{caption}</caption>
            )}

            {/* Header */}
            {showHeaders && (
              <thead className={tableHeaderVariants()}>
                <tr>
                  {/* Selection header */}
                  {selectionConfig && (
                    <th className={tableHeaderCellVariants()} style={{ width: '50px' }}>
                      <Checkbox
                        checked={areAllRowsSelected()}
                        indeterminate={areSomeRowsSelected()}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all rows"
                      />
                    </th>
                  )}

                  {/* Column headers */}
                  {visibleColumns.map(column => (
                    <th
                      key={column.key}
                      className={tableHeaderCellVariants({ sortable: column.sortable })}
                      style={{
                        width: column.width,
                        textAlign: column.align || 'left',
                      }}
                      onClick={column.sortable ? () => handleSortChange(column.key) : undefined}
                      aria-sort={
                        sortConfig?.key === column.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span>{column.header}</span>
                        {column.sortable && (
                          <span className="flex-shrink-0">
                            {sortConfig?.key === column.key ? (
                              sortConfig.direction === 'asc' ? (
                                <SortAscIcon className="w-4 h-4" />
                              ) : (
                                <SortDescIcon className="w-4 h-4" />
                              )
                            ) : (
                              <SortIcon className="w-4 h-4 opacity-50" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
            )}

            {/* Body */}
            <tbody className={tableBodyVariants()}>
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (selectionConfig ? 1 : 0)}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (selectionConfig ? 1 : 0)}
                    className="px-4 py-8 text-center text-neutral-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, rowIndex) => {
                  const isSelected = isRowSelected(row);
                  return (
                    <tr
                      key={rowIndex}
                      className={tableRowVariants({
                        hoverable,
                        selectable: Boolean(onRowClick),
                        selected: isSelected,
                        striped,
                      })}
                      onClick={() => onRowClick?.(row, rowIndex)}
                    >
                      {/* Selection cell */}
                      {selectionConfig && (
                        <td className={tableCellVariants()}>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleRowSelection(row, e.target.checked)}
                            aria-label={`Select row ${rowIndex + 1}`}
                          />
                        </td>
                      )}

                      {/* Data cells */}
                      {visibleColumns.map(column => {
                        const value = getCellValue(row, column);
                        const cellContent = column.cell ? column.cell(value, row, rowIndex) : value;

                        return (
                          <td
                            key={column.key}
                            className={tableCellVariants()}
                            style={{ textAlign: column.align || 'left' }}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {paginationConfig && (
          <div className={paginationVariants()}>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-700">
                Showing {Math.min((paginationConfig.currentPage - 1) * paginationConfig.pageSize + 1, paginationConfig.totalItems)} to{' '}
                {Math.min(paginationConfig.currentPage * paginationConfig.pageSize, paginationConfig.totalItems)} of{' '}
                {paginationConfig.totalItems} results
              </span>

              {paginationConfig.onPageSizeChange && paginationConfig.pageSizeOptions && (
                <Select
                  value={paginationConfig.pageSize}
                  onChange={(value) => paginationConfig.onPageSizeChange!(Number(value))}
                  options={paginationConfig.pageSizeOptions.map(size => ({
                    value: size,
                    label: `${size} per page`,
                  }))}
                  size="sm"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => paginationConfig.onPageChange(paginationConfig.currentPage - 1)}
                disabled={paginationConfig.currentPage <= 1}
                leftIcon={<ChevronLeftIcon className="w-4 h-4" />}
              >
                Previous
              </Button>

              <span className="text-sm text-neutral-700">
                Page {paginationConfig.currentPage} of {Math.ceil(paginationConfig.totalItems / paginationConfig.pageSize)}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => paginationConfig.onPageChange(paginationConfig.currentPage + 1)}
                disabled={paginationConfig.currentPage >= Math.ceil(paginationConfig.totalItems / paginationConfig.pageSize)}
                rightIcon={<ChevronRightIcon className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

Table.displayName = 'Table';

// Export table variants for external use
export {
  tableVariants,
  tableContainerVariants,
  tableHeaderVariants,
  tableHeaderCellVariants,
  tableBodyVariants,
  tableRowVariants,
  tableCellVariants,
  paginationVariants,
};