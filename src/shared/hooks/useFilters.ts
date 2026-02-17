import { useState, useMemo, useCallback } from 'react';

export type FilterValue = string | number | boolean | null | undefined;
export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface Filter {
  field: string;
  value: FilterValue;
  operator?: FilterOperator;
}

export interface UseFiltersOptions<T> {
  data: T[];
  initialFilters?: Filter[];
}

export interface UseFiltersReturn<T> {
  filteredData: T[];
  filters: Filter[];
  setFilter: (field: string, value: FilterValue, operator?: FilterOperator) => void;
  removeFilter: (field: string) => void;
  clearFilters: () => void;
  hasFilters: boolean;
  filterCount: number;
}

export const useFilters = <T extends Record<string, any>>({
  data,
  initialFilters = [],
}: UseFiltersOptions<T>): UseFiltersReturn<T> => {
  const [filters, setFilters] = useState<Filter[]>(initialFilters);

  const setFilter = useCallback((field: string, value: FilterValue, operator: FilterOperator = 'equals') => {
    setFilters(prev => {
      const existingIndex = prev.findIndex(f => f.field === field);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { field, value, operator };
        return updated;
      }
      return [...prev, { field, value, operator }];
    });
  }, []);

  const removeFilter = useCallback((field: string) => {
    setFilters(prev => prev.filter(f => f.field !== field));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const matchesFilter = useCallback((item: T, filter: Filter): boolean => {
    const fieldValue = item[filter.field];
    const filterValue = filter.value;

    if (filterValue === null || filterValue === undefined || filterValue === '') {
      return true;
    }

    const operator = filter.operator || 'equals';

    switch (operator) {
      case 'equals':
        return fieldValue === filterValue;

      case 'contains':
        if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
          return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
        }
        return false;

      case 'startsWith':
        if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
          return fieldValue.toLowerCase().startsWith(filterValue.toLowerCase());
        }
        return false;

      case 'endsWith':
        if (typeof fieldValue === 'string' && typeof filterValue === 'string') {
          return fieldValue.toLowerCase().endsWith(filterValue.toLowerCase());
        }
        return false;

      case 'gt':
        return Number(fieldValue) > Number(filterValue);

      case 'gte':
        return Number(fieldValue) >= Number(filterValue);

      case 'lt':
        return Number(fieldValue) < Number(filterValue);

      case 'lte':
        return Number(fieldValue) <= Number(filterValue);

      case 'in':
        if (Array.isArray(filterValue)) {
          return filterValue.includes(fieldValue);
        }
        return false;

      default:
        return true;
    }
  }, []);

  const filteredData = useMemo(() => {
    if (filters.length === 0) {
      return data;
    }

    return data.filter(item =>
      filters.every(filter => matchesFilter(item, filter))
    );
  }, [data, filters, matchesFilter]);

  return {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    hasFilters: filters.length > 0,
    filterCount: filters.length,
  };
};