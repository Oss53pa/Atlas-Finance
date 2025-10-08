export type AssetStatus = 'EN_SERVICE' | 'HORS_SERVICE' | 'EN_MAINTENANCE' | 'CEDE' | 'REFORME';
export type AssetCondition = 'EXCELLENT' | 'BON' | 'MOYEN' | 'MAUVAIS';

export interface AssetMasterData {
  id: string;
  asset_number: string;
  capital_appropriation_number?: string;
  description: string;
  status: AssetStatus;
  condition?: AssetCondition;
  photo_url?: string;
  qr_code?: string;

  general: {
    asset_class: string;
    asset_subclass?: string;
    manufacturer?: string;
    model?: string;
    serial_number?: string;
    location: string;
    department?: string;
    responsible_person?: string;
  };

  acquisition: {
    acquisition_date: Date;
    acquisition_cost: number;
    supplier?: string;
    invoice_number?: string;
    payment_method?: string;
    warranty_expiry?: Date;
  };

  immobilisation: {
    account_number: string;
    depreciation_method: 'LINEAR' | 'DECLINING' | 'UNITS';
    useful_life_years: number;
    salvage_value: number;
    depreciation_start_date: Date;
    accumulated_depreciation: number;
    net_book_value: number;
  };

  sale?: {
    sale_date?: Date;
    sale_price?: number;
    buyer?: string;
    disposal_reason?: string;
  };

  maintenance: {
    last_maintenance_date?: Date;
    next_maintenance_date?: Date;
    maintenance_frequency?: string;
    maintenance_cost_ytd?: number;
  };

  components?: AssetComponent[];
  attachments?: AssetAttachment[];
  notes?: string;
}

export interface AssetComponent {
  id: string;
  name: string;
  quantity: number;
  unit_cost: number;
  replacement_date?: Date;
}

export interface AssetAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploaded_at: Date;
  uploaded_by: string;
}

export interface AssetFilters {
  status?: AssetStatus[];
  asset_class?: string[];
  location?: string[];
  search?: string;
}

export interface AssetStats {
  total: number;
  en_service: number;
  en_maintenance: number;
  hors_service: number;
  total_value: number;
  avg_age: number;
}