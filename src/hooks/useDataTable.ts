import { useState, useEffect, useCallback } from 'react';
import { QueryParams, PaginatedResponse } from '../services/api.service';
import { toast } from 'react-hot-toast';

export interface UseDataTableOptions<T> {
  fetchData: (params: QueryParams) => Promise<PaginatedResponse<T>>;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
  autoFetch?: boolean;
  onError?: (error: any) => void;
  onSuccess?: (data: PaginatedResponse<T>) => void;
}

export interface UseDataTableReturn<T> {
  data: T[];
  loading: boolean;
  error: any;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  search: string;
  filters: Record<string, any>;
  
  // Actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSort: (key: string, direction: 'asc' | 'desc') => void;
  setSearch: (term: string) => void;
  setFilters: (filters: Record<string, any>) => void;
  refresh: () => void;
  
  // Helpers
  isFirstPage: boolean;
  isLastPage: boolean;
  totalPages: number;
}

export function useDataTable<T>(options: UseDataTableOptions<T>): UseDataTableReturn<T> {
  const {
    fetchData,
    initialPageSize = 10,
    initialSortBy = '',
    initialSortOrder = 'asc',
    autoFetch = true,
    onError,
    onSuccess,
  } = options;

  // États
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(initialSortOrder);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Calculs dérivés
  const totalPages = Math.ceil(totalCount / pageSize);
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages || totalPages === 0;

  // Fonction de récupération des données
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: QueryParams = {
        page: currentPage,
        pageSize,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        search: search || undefined,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };

      const response = await fetchData(params);
      
      setData(response.data);
      setTotalCount(response.total);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err);
      setData([]);
      
      const errorMessage = err.response?.data?.message || err.message || 'Une erreur est survenue';
      toast.error(errorMessage);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, sortBy, sortOrder, search, filters, fetchData]);

  // Charger les données automatiquement
  useEffect(() => {
    if (autoFetch) {
      loadData();
    }
  }, [loadData, autoFetch]);

  // Actions
  const setPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const setSort = (key: string, direction: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(direction);
  };

  const handleSetSearch = (term: string) => {
    setSearch(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSetFilters = (newFilters: Record<string, any>) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const refresh = () => {
    loadData();
  };

  return {
    data,
    loading,
    error,
    totalCount,
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    search,
    filters,
    setPage,
    setPageSize: handleSetPageSize,
    setSort,
    setSearch: handleSetSearch,
    setFilters: handleSetFilters,
    refresh,
    isFirstPage,
    isLastPage,
    totalPages,
  };
}

// Hook pour gérer la sélection dans les tables
export function useTableSelection<T>(items: T[], getKey: (item: T) => string) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const selectedItems = items.filter(item => selectedKeys.has(getKey(item)));
  const isAllSelected = items.length > 0 && items.every(item => selectedKeys.has(getKey(item)));
  const isSomeSelected = items.some(item => selectedKeys.has(getKey(item)));

  const selectAll = () => {
    setSelectedKeys(new Set(items.map(getKey)));
  };

  const deselectAll = () => {
    setSelectedKeys(new Set());
  };

  const toggleAll = () => {
    if (isAllSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const select = (item: T) => {
    const key = getKey(item);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  const deselect = (item: T) => {
    const key = getKey(item);
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const toggle = (item: T) => {
    const key = getKey(item);
    if (selectedKeys.has(key)) {
      deselect(item);
    } else {
      select(item);
    }
  };

  const isSelected = (item: T) => {
    return selectedKeys.has(getKey(item));
  };

  const reset = () => {
    setSelectedKeys(new Set());
  };

  return {
    selectedKeys,
    selectedItems,
    isAllSelected,
    isSomeSelected,
    selectAll,
    deselectAll,
    toggleAll,
    select,
    deselect,
    toggle,
    isSelected,
    reset,
  };
}