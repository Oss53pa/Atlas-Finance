export type SettingType = 'select' | 'number' | 'boolean' | 'text' | 'date' | 'action';
export type SettingCategory = 'general' | 'fiscal' | 'tva' | 'immobilisations' | 'documents' | 'advanced';
export type ViewMode = 'cards' | 'list' | 'compact';

export interface AccountingSetting {
  id: string;
  label: string;
  description: string;
  value: string | number | boolean;
  type: SettingType;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  required?: boolean;
  category: SettingCategory;
  action?: () => void;
  actionLabel?: string;
}

export interface SettingsGroup {
  [category: string]: AccountingSetting[];
}

export interface SettingsFilters {
  search?: string;
  category?: SettingCategory;
}

export interface ValidationError {
  [settingId: string]: string;
}

export interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}