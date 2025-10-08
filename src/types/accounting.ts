/**
 * Types comptables WiseBook
 * Importés depuis les types partagés backend
 */

// Export des types partagés
export * from '../../../shared/types/accounting';

// Types additionnels spécifiques au frontend
export interface UIState {
  loading: boolean;
  error?: string;
  selectedItems: string[];
}

export interface TableColumn {
  key: string;
  title: string;
  width?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: any) => React.ReactNode;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required?: boolean;
  validation?: any;
  options?: { label: string; value: any }[];
}

export interface PrintOptions {
  format: 'A4' | 'A3';
  orientation: 'portrait' | 'landscape';
  includeHeader: boolean;
  includeFooter: boolean;
  showPageNumbers: boolean;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  fileName?: string;
  includeHeaders: boolean;
  dateFormat: string;
}

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'boolean';
  options?: { label: string; value: any }[];
}

// Types pour les hooks
export interface UseTableState<T> {
  data: T[];
  loading: boolean;
  error?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  sorting: {
    field?: string;
    order?: 'asc' | 'desc';
  };
  filters: Record<string, any>;
}

export interface UseFormState<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

// Types pour les modales
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// Types pour les notifications
export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Types pour la navigation
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<any>;
  path?: string;
  children?: MenuItem[];
  badge?: string | number;
  permissions?: string[];
}

// Types pour les widgets/dashboards
export interface WidgetProps {
  title: string;
  loading?: boolean;
  error?: string;
  actions?: Array<{
    label: string;
    icon?: React.ComponentType<any>;
    onClick: () => void;
  }>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// Types pour les préférences utilisateur
export interface UserPreferences {
  language: 'fr' | 'en' | 'es';
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  itemsPerPage: number;
  dateFormat: string;
  currencyFormat: string;
  printDefaults: PrintOptions;
}