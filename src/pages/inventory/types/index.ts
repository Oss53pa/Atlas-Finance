// International Inventory Management Types for Atlas Finance
// Compliant with IFRS IAS 2, US GAAP ASC 330, and SYSCOHADA

export interface Currency {
  code: string; // ISO 4217 currency code (USD, EUR, XOF, etc.)
  symbol: string;
  name: string;
  exchangeRate: number;
  isBaseCurrency: boolean;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  type: 'warehouse' | 'store' | 'transit' | 'production' | 'quarantine';
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  isActive: boolean;
  parentLocationId?: string;
  manager: string;
  capacity?: {
    volume: number;
    weight: number;
    unit: string;
  };
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: {
    id: string;
    name: string;
    code: string;
  };
  type: 'raw_material' | 'work_in_progress' | 'finished_goods' | 'merchandise' | 'supplies';
  unitOfMeasure: {
    base: string;
    alternatives: Array<{
      unit: string;
      conversionFactor: number;
    }>;
  };
  specifications: {
    weight?: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit: string;
    };
    color?: string;
    size?: string;
  };
  tracking: {
    serialNumbers: boolean;
    batchNumbers: boolean;
    expirationDates: boolean;
    lotNumbers: boolean;
  };
  accounting: {
    assetAccount: string;
    cogsAccount: string;
    adjustmentAccount: string;
  };
  taxation: {
    taxable: boolean;
    taxRates: Array<{
      jurisdiction: string;
      rate: number;
      type: 'VAT' | 'Sales Tax' | 'GST';
    }>;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ValuationMethod = 'FIFO' | 'LIFO' | 'WEIGHTED_AVERAGE' | 'SPECIFIC_IDENTIFICATION' | 'STANDARD_COST';

export interface CostLayer {
  id: string;
  date: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  currency: string;
  exchangeRate: number;
  baseCurrencyCost: number;
  source: 'purchase' | 'production' | 'adjustment' | 'transfer';
  sourceDocumentId: string;
  batchNumber?: string;
  lotNumber?: string;
  expirationDate?: string;
}

export interface StockLevel {
  itemId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAllocated: number;
  quantityAvailable: number;
  quantityOnOrder: number;
  quantityInTransit: number;
  quantityReserved: number;
  lastMovementDate: string;
  costLayers: CostLayer[];
  valuationMethod: ValuationMethod;
  averageCost: number;
  totalValue: number;
  lastCountDate?: string;
  cycleCounting: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    lastCountDate?: string;
    nextCountDate?: string;
    variance?: number;
  };
}

export interface ReorderRules {
  itemId: string;
  locationId: string;
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  reorderQuantity: number;
  safetyStock: number;
  leadTimeDays: number;
  demandRate: number; // units per day
  isActive: boolean;
  supplier?: {
    id: string;
    name: string;
    leadTime: number;
    minimumOrderQuantity: number;
  };
}

export interface InventoryMovement {
  id: string;
  movementNumber: string;
  date: string;
  type: 'receipt' | 'issue' | 'transfer' | 'adjustment' | 'production' | 'consumption' | 'return' | 'disposal';
  subType: string; // Purchase Receipt, Sales Issue, Stock Transfer, etc.
  status: 'draft' | 'pending' | 'approved' | 'posted' | 'cancelled';
  reference: {
    type: 'purchase_order' | 'sales_order' | 'production_order' | 'adjustment' | 'transfer_order';
    number: string;
    id: string;
  };
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    unitOfMeasure: string;
    batchNumber?: string;
    lotNumber?: string;
    serialNumbers?: string[];
    expirationDate?: string;
    fromLocationId?: string;
    toLocationId: string;
    reasonCode?: string;
  }>;
  totalValue: number;
  currency: string;
  exchangeRate: number;
  createdBy: string;
  approvedBy?: string;
  postedBy?: string;
  createdAt: string;
  approvedAt?: string;
  postedAt?: string;
  notes?: string;
}

export interface PhysicalCount {
  id: string;
  countNumber: string;
  type: 'full' | 'cycle' | 'spot' | 'reconciliation';
  status: 'planned' | 'in_progress' | 'completed' | 'approved' | 'posted';
  locationId: string;
  scheduledDate: string;
  startDate?: string;
  completedDate?: string;
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    bookQuantity: number;
    countedQuantity?: number;
    variance?: number;
    varianceValue?: number;
    countedBy?: string;
    countDate?: string;
    batchNumber?: string;
    lotNumber?: string;
    serialNumbers?: string[];
    notes?: string;
  }>;
  totalBookValue: number;
  totalCountValue: number;
  totalVariance: number;
  counters: Array<{
    userId: string;
    name: string;
    assignedItems: string[];
  }>;
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface InventoryAdjustment {
  id: string;
  adjustmentNumber: string;
  type: 'quantity' | 'value' | 'write_off' | 'write_down' | 'revaluation';
  reason: 'physical_count' | 'obsolescence' | 'damage' | 'theft' | 'market_decline' | 'error_correction' | 'other';
  status: 'draft' | 'pending_approval' | 'approved' | 'posted';
  date: string;
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    locationId: string;
    currentQuantity: number;
    adjustedQuantity: number;
    quantityVariance: number;
    currentValue: number;
    adjustedValue: number;
    valueVariance: number;
    reasonCode: string;
    notes?: string;
  }>;
  totalValueImpact: number;
  accountingEntries: Array<{
    account: string;
    description: string;
    debit: number;
    credit: number;
  }>;
  approvalRequired: boolean;
  createdBy: string;
  approvedBy?: string;
  postedBy?: string;
  createdAt: string;
  approvedAt?: string;
  postedAt?: string;
  supportingDocuments?: string[];
}

export interface InventoryValuation {
  date: string;
  method: ValuationMethod;
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    marketValue?: number; // For LCM/NRV testing
    nrv?: number; // Net Realizable Value
    lcm?: number; // Lower of Cost or Market
    impairmentLoss?: number;
    category: string;
    location: string;
  }>;
  totalInventoryValue: number;
  totalMarketValue?: number;
  totalImpairment?: number;
  complianceStandard: 'IFRS_IAS2' | 'US_GAAP_ASC330' | 'SYSCOHADA';
  methodJustification?: string;
  reviewedBy?: string;
  approvedBy?: string;
}

export interface ABCAnalysis {
  date: string;
  period: {
    from: string;
    to: string;
  };
  items: Array<{
    itemId: string;
    sku: string;
    name: string;
    annualUsage: number;
    unitCost: number;
    annualValue: number;
    percentageOfTotal: number;
    cumulativePercentage: number;
    classification: 'A' | 'B' | 'C';
    turnoverRatio: number;
    daysInInventory: number;
  }>;
  summary: {
    classA: {
      items: number;
      percentage: number;
      value: number;
      valuePercentage: number;
    };
    classB: {
      items: number;
      percentage: number;
      value: number;
      valuePercentage: number;
    };
    classC: {
      items: number;
      percentage: number;
      value: number;
      valuePercentage: number;
    };
  };
}

export interface InventoryTurnover {
  itemId: string;
  sku: string;
  name: string;
  period: {
    from: string;
    to: string;
  };
  beginningInventory: number;
  endingInventory: number;
  averageInventory: number;
  costOfGoodsSold: number;
  turnoverRatio: number;
  daysInInventory: number;
  classification: 'fast_moving' | 'normal' | 'slow_moving' | 'obsolete';
  recommendations: string[];
}

export interface InventoryKPIs {
  totalInventoryValue: number;
  totalItems: number;
  totalLocations: number;
  averageTurnoverRatio: number;
  averageDaysInInventory: number;
  stockoutItems: number;
  overstockItems: number;
  obsoleteItems: number;
  deadStockValue: number;
  shrinkageRate: number;
  accuracyRate: number;
  fillRate: number;
  carryingCostRate: number;
  reorderSuggestions: number;
}

export interface BatchLot {
  id: string;
  number: string;
  type: 'batch' | 'lot';
  itemId: string;
  quantity: number;
  status: 'active' | 'quarantine' | 'expired' | 'consumed';
  dates: {
    received: string;
    manufactured?: string;
    expiration?: string;
    tested?: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  qualityTests?: Array<{
    parameter: string;
    result: string;
    specification: string;
    status: 'pass' | 'fail' | 'pending';
    testDate: string;
  }>;
  traceability: Array<{
    date: string;
    event: string;
    location: string;
    quantity: number;
    reference: string;
  }>;
}

export interface SerialNumber {
  id: string;
  number: string;
  itemId: string;
  status: 'available' | 'allocated' | 'sold' | 'returned' | 'scrapped';
  location: string;
  dates: {
    received: string;
    manufactured?: string;
    shipped?: string;
    warrantyExpiry?: string;
  };
  customer?: {
    id: string;
    name: string;
  };
  warranty?: {
    period: number;
    unit: 'days' | 'months' | 'years';
    terms: string;
  };
  history: Array<{
    date: string;
    event: string;
    location: string;
    reference: string;
    notes?: string;
  }>;
}

export interface InventoryReport {
  id: string;
  name: string;
  type: 'valuation' | 'movement' | 'aging' | 'turnover' | 'abc' | 'variance' | 'compliance';
  parameters: {
    dateRange: {
      from: string;
      to: string;
    };
    locations?: string[];
    categories?: string[];
    items?: string[];
    currency?: string;
    valuationMethod?: ValuationMethod;
    complianceStandard?: 'IFRS_IAS2' | 'US_GAAP_ASC330' | 'SYSCOHADA';
  };
  data: any;
  generatedAt: string;
  generatedBy: string;
  format: 'excel' | 'pdf' | 'csv' | 'json';
}

// Form interfaces for UI components
export interface InventoryItemForm {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  type: string;
  unitOfMeasure: string;
  trackSerialNumbers: boolean;
  trackBatchNumbers: boolean;
  trackExpirationDates: boolean;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  standardCost?: number;
  assetAccount: string;
  cogsAccount: string;
  adjustmentAccount: string;
}

export interface MovementForm {
  type: string;
  date: string;
  reference?: string;
  notes?: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitCost?: number;
    locationId: string;
    batchNumber?: string;
    lotNumber?: string;
    serialNumbers?: string[];
    expirationDate?: string;
  }>;
}

export interface PhysicalCountForm {
  type: 'full' | 'cycle' | 'spot';
  locationId: string;
  scheduledDate: string;
  includeCategories?: string[];
  excludeCategories?: string[];
  includeItems?: string[];
  excludeItems?: string[];
  counters: Array<{
    userId: string;
    name: string;
  }>;
}

// Filter and search interfaces
export interface InventoryFilters {
  locations?: string[];
  categories?: string[];
  types?: string[];
  status?: string[];
  valuationMethods?: ValuationMethod[];
  dateRange?: {
    from: string;
    to: string;
  };
  searchTerm?: string;
  showOnlyActiveItems?: boolean;
  showOnlyLowStock?: boolean;
  showOnlyOverstock?: boolean;
}

export interface SortOption {
  field: string;
  direction: 'asc' | 'desc';
}

// API response interfaces
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}