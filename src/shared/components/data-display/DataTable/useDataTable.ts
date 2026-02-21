import { useState, useMemo } from 'react';
import { Column, UseDataTableOptions, UseDataTableReturn } from './DataTable.types';

export const useDataTable = <T,>({
  data,
  columns,
  defaultSortColumn,
  defaultSortDirection = 'asc',
  defaultPageSize = 10,
}: UseDataTableOptions<T>): UseDataTableReturn<T> => {
  const [sortedColumn, setSortedColumn] = useState<string | null>(defaultSortColumn || null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(defaultSortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const sortedData = useMemo(() => {
    if (!sortedColumn) return data;

    const column = columns.find(col => col.key === sortedColumn);
    if (!column || !column.sortable) return data;

    return [...data].sort((a, b) => {
      let aVal: unknown;
      let bVal: unknown;

      if (column.accessor) {
        if (typeof column.accessor === 'function') {
          aVal = column.accessor(a);
          bVal = column.accessor(b);
        } else {
          aVal = a[column.accessor];
          bVal = b[column.accessor];
        }
      } else {
        aVal = a[column.key as keyof T];
        bVal = b[column.key as keyof T];
      }

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortedColumn, sortDirection, columns]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (column: string) => {
    if (sortedColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortedColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  return {
    displayData: paginatedData,
    sortedColumn,
    sortDirection,
    handleSort,
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
  };
};