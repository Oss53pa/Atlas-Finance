export interface Column<T = any> {
  key: string;
  header: string;
  accessor?: keyof T | ((row: T) => any);
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string>;
  onSelectionChange?: (selected: Set<string>) => void;
  getRowId?: (row: T) => string;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  };
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
    onSortChange: (column: string, direction: 'asc' | 'desc') => void;
  };
  selectable?: boolean;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  compact?: boolean;
  className?: string;
  actions?: (row: T) => React.ReactNode;
}

export interface UseDataTableOptions<T> {
  data: T[];
  columns: Column<T>[];
  defaultSortColumn?: string;
  defaultSortDirection?: 'asc' | 'desc';
  defaultPageSize?: number;
}

export interface UseDataTableReturn<T> {
  displayData: T[];
  sortedColumn: string | null;
  sortDirection: 'asc' | 'desc';
  handleSort: (column: string) => void;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  handlePageChange: (page: number) => void;
  handlePageSizeChange: (size: number) => void;
}