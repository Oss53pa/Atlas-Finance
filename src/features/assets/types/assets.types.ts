export interface Asset {
  id: string | number;
  assetNumber: string;
  description: string;
  assetClass: string;
  assetCategory: string;
  assetIdentification?: string;
  uomGroup?: string;
  capitalAppropriationNumber?: string;
  location: string;
  technician?: string;
  employee?: string;
  capitalizationDate: string;
  acquisitionDate: string;
  warrantyEnd?: string;
  lastInventory?: string;
  acquisitionCost: number;
  historicalApc: number;
  netBookValue: number;
  historicalNbc: number;
  ordinaryDepreciation: number;
  unplannedDepreciation?: number;
  specialDepreciation?: number;
  writeUp?: number;
  salvageValue?: number;
  assetGroup?: string;
  depreciationGroup?: string;
  depreciationMethod?: string;
  usefulLife?: number;
  status: 'active' | 'disposed' | 'under_maintenance' | 'retired';
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  notes?: string;
}

export interface AssetStats {
  totalAssets: number;
  totalValue: number;
  totalDepreciation: number;
  netBookValue: number;
  activeAssets: number;
  disposedAssets: number;
  maintenanceAssets: number;
}

export interface AssetCategory {
  id: string | number;
  code: string;
  name: string;
  description?: string;
  depreciationRate?: number;
  usefulLife?: number;
  count?: number;
}

export interface AssetClass {
  id: string | number;
  code: string;
  name: string;
  description?: string;
  categories?: AssetCategory[];
}

export interface AssetMaintenance {
  id: string | number;
  assetId: string | number;
  assetNumber: string;
  maintenanceType: 'preventive' | 'corrective' | 'inspection';
  description: string;
  scheduledDate: string;
  completedDate?: string;
  technician?: string;
  cost?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export interface AssetTransaction {
  id: string | number;
  assetId: string | number;
  assetNumber: string;
  transactionType: 'acquisition' | 'disposal' | 'transfer' | 'depreciation' | 'revaluation';
  date: string;
  amount: number;
  fromLocation?: string;
  toLocation?: string;
  description: string;
  performedBy: string;
  status: 'pending' | 'completed' | 'cancelled';
}

export interface AssetDisposal {
  id: string | number;
  assetId: string | number;
  assetNumber: string;
  assetDescription: string;
  disposalDate: string;
  disposalMethod: 'sale' | 'scrap' | 'donation' | 'trade_in';
  disposalValue: number;
  netBookValue: number;
  gainLoss: number;
  approvedBy?: string;
  notes?: string;
}

export interface AssetDepreciation {
  assetId: string | number;
  assetNumber: string;
  period: string;
  depreciationType: 'ordinary' | 'unplanned' | 'special';
  amount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  calculationMethod: string;
}