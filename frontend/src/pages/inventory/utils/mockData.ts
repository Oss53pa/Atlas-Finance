// Mock data for Inventory Management
// International business scenarios with multi-currency and multi-location support

import {
  InventoryItem,
  StockLevel,
  InventoryMovement,
  PhysicalCount,
  InventoryAdjustment,
  Location,
  Currency,
  BatchLot,
  SerialNumber,
  ReorderRules,
  InventoryKPIs,
  ABCAnalysis,
  InventoryTurnover
} from '../types';

export const mockCurrencies: Currency[] = [
  {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    exchangeRate: 1.0,
    isBaseCurrency: true
  },
  {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    exchangeRate: 0.85,
    isBaseCurrency: false
  },
  {
    code: 'XOF',
    symbol: 'CFA',
    name: 'West African CFA Franc',
    exchangeRate: 585.0,
    isBaseCurrency: false
  },
  {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    exchangeRate: 0.73,
    isBaseCurrency: false
  },
  {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    exchangeRate: 1.25,
    isBaseCurrency: false
  }
];

export const mockLocations: Location[] = [
  {
    id: 'LOC001',
    code: 'WH-NYC',
    name: 'New York Central Warehouse',
    type: 'warehouse',
    address: {
      street: '123 Industrial Blvd',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001'
    },
    isActive: true,
    manager: 'John Smith',
    capacity: {
      volume: 50000,
      weight: 10000,
      unit: 'cubic_meters'
    }
  },
  {
    id: 'LOC002',
    code: 'WH-LAX',
    name: 'Los Angeles Distribution Center',
    type: 'warehouse',
    address: {
      street: '456 Logistics Way',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      postalCode: '90210'
    },
    isActive: true,
    manager: 'Maria Garcia',
    capacity: {
      volume: 75000,
      weight: 15000,
      unit: 'cubic_meters'
    }
  },
  {
    id: 'LOC003',
    code: 'WH-ABJ',
    name: 'Abidjan Central Warehouse',
    type: 'warehouse',
    address: {
      street: 'Zone Industrielle de Vridi',
      city: 'Abidjan',
      state: 'Lagunes',
      country: 'Côte d\'Ivoire',
      postalCode: '00225'
    },
    isActive: true,
    manager: 'Kouadio Kouassi',
    capacity: {
      volume: 30000,
      weight: 8000,
      unit: 'cubic_meters'
    }
  },
  {
    id: 'LOC004',
    code: 'ST-NYC-01',
    name: 'Manhattan Retail Store',
    type: 'store',
    address: {
      street: '789 Fifth Avenue',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10022'
    },
    isActive: true,
    parentLocationId: 'LOC001',
    manager: 'Sarah Johnson'
  },
  {
    id: 'LOC005',
    code: 'PROD-01',
    name: 'Manufacturing Plant Alpha',
    type: 'production',
    address: {
      street: '100 Factory Road',
      city: 'Detroit',
      state: 'MI',
      country: 'USA',
      postalCode: '48201'
    },
    isActive: true,
    manager: 'Robert Wilson'
  }
];

export const mockInventoryItems: InventoryItem[] = [
  {
    id: 'ITEM001',
    sku: 'LAP-DEL-5520',
    name: 'Dell Latitude 5520 Laptop',
    description: '15.6" Business Laptop with Intel i7, 16GB RAM, 512GB SSD',
    category: {
      id: 'CAT001',
      name: 'Electronics',
      code: 'ELEC'
    },
    type: 'finished_goods',
    unitOfMeasure: {
      base: 'each',
      alternatives: [
        { unit: 'dozen', conversionFactor: 12 },
        { unit: 'case', conversionFactor: 6 }
      ]
    },
    specifications: {
      weight: 1.8,
      dimensions: {
        length: 35.7,
        width: 23.5,
        height: 1.99,
        unit: 'cm'
      }
    },
    tracking: {
      serialNumbers: true,
      batchNumbers: false,
      expirationDates: false,
      lotNumbers: false
    },
    accounting: {
      assetAccount: '1300-01',
      cogsAccount: '5000-01',
      adjustmentAccount: '5100-01'
    },
    taxation: {
      taxable: true,
      taxRates: [
        { jurisdiction: 'NY', rate: 8.25, type: 'Sales Tax' },
        { jurisdiction: 'CA', rate: 7.25, type: 'Sales Tax' }
      ]
    },
    isActive: true,
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-20T10:30:00Z',
    createdBy: 'system'
  },
  {
    id: 'ITEM002',
    sku: 'PHN-APL-IP14',
    name: 'Apple iPhone 14 Pro',
    description: '128GB Smartphone in Deep Purple',
    category: {
      id: 'CAT001',
      name: 'Electronics',
      code: 'ELEC'
    },
    type: 'finished_goods',
    unitOfMeasure: {
      base: 'each',
      alternatives: []
    },
    specifications: {
      weight: 0.206,
      dimensions: {
        length: 14.75,
        width: 7.15,
        height: 0.78,
        unit: 'cm'
      },
      color: 'Deep Purple',
      size: '128GB'
    },
    tracking: {
      serialNumbers: true,
      batchNumbers: false,
      expirationDates: false,
      lotNumbers: false
    },
    accounting: {
      assetAccount: '1300-01',
      cogsAccount: '5000-01',
      adjustmentAccount: '5100-01'
    },
    taxation: {
      taxable: true,
      taxRates: [
        { jurisdiction: 'NY', rate: 8.25, type: 'Sales Tax' },
        { jurisdiction: 'EU', rate: 20.0, type: 'VAT' }
      ]
    },
    isActive: true,
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-25T14:15:00Z',
    createdBy: 'system'
  },
  {
    id: 'ITEM003',
    sku: 'COFF-BEAN-ARB',
    name: 'Premium Arabica Coffee Beans',
    description: 'Single Origin Ethiopian Arabica Coffee Beans - 1kg bag',
    category: {
      id: 'CAT002',
      name: 'Food & Beverage',
      code: 'FOOD'
    },
    type: 'raw_material',
    unitOfMeasure: {
      base: 'kg',
      alternatives: [
        { unit: 'g', conversionFactor: 0.001 },
        { unit: 'lb', conversionFactor: 2.20462 },
        { unit: 'bag', conversionFactor: 1 }
      ]
    },
    specifications: {
      weight: 1.0
    },
    tracking: {
      serialNumbers: false,
      batchNumbers: true,
      expirationDates: true,
      lotNumbers: true
    },
    accounting: {
      assetAccount: '1310-01',
      cogsAccount: '5000-02',
      adjustmentAccount: '5100-02'
    },
    taxation: {
      taxable: true,
      taxRates: [
        { jurisdiction: 'XOF', rate: 18.0, type: 'VAT' }
      ]
    },
    isActive: true,
    createdAt: '2024-01-05T07:30:00Z',
    updatedAt: '2024-01-22T16:45:00Z',
    createdBy: 'system'
  },
  {
    id: 'ITEM004',
    sku: 'STEEL-ROD-12MM',
    name: 'Steel Reinforcement Rod 12mm',
    description: 'High-grade steel reinforcement rod, 12mm diameter, 12m length',
    category: {
      id: 'CAT003',
      name: 'Construction Materials',
      code: 'CONST'
    },
    type: 'raw_material',
    unitOfMeasure: {
      base: 'piece',
      alternatives: [
        { unit: 'ton', conversionFactor: 0.01062 },
        { unit: 'kg', conversionFactor: 10.62 }
      ]
    },
    specifications: {
      weight: 10.62,
      dimensions: {
        length: 1200,
        width: 1.2,
        height: 1.2,
        unit: 'cm'
      }
    },
    tracking: {
      serialNumbers: false,
      batchNumbers: true,
      expirationDates: false,
      lotNumbers: true
    },
    accounting: {
      assetAccount: '1310-02',
      cogsAccount: '5000-03',
      adjustmentAccount: '5100-03'
    },
    taxation: {
      taxable: true,
      taxRates: [
        { jurisdiction: 'XOF', rate: 18.0, type: 'VAT' }
      ]
    },
    isActive: true,
    createdAt: '2024-01-08T10:00:00Z',
    updatedAt: '2024-01-28T11:20:00Z',
    createdBy: 'system'
  }
];

export const mockStockLevels: StockLevel[] = [
  {
    itemId: 'ITEM001',
    locationId: 'LOC001',
    quantityOnHand: 25,
    quantityAllocated: 5,
    quantityAvailable: 20,
    quantityOnOrder: 50,
    quantityInTransit: 10,
    quantityReserved: 3,
    lastMovementDate: '2024-01-25T14:30:00Z',
    costLayers: [
      {
        id: 'CL001',
        date: '2024-01-15T08:00:00Z',
        quantity: 15,
        unitCost: 1200.00,
        totalCost: 18000.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseCurrencyCost: 18000.00,
        source: 'purchase',
        sourceDocumentId: 'PO-2024-001'
      },
      {
        id: 'CL002',
        date: '2024-01-20T10:30:00Z',
        quantity: 10,
        unitCost: 1250.00,
        totalCost: 12500.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseCurrencyCost: 12500.00,
        source: 'purchase',
        sourceDocumentId: 'PO-2024-002'
      }
    ],
    valuationMethod: 'FIFO',
    averageCost: 1220.00,
    totalValue: 30500.00,
    lastCountDate: '2024-01-01T00:00:00Z',
    cycleCounting: {
      frequency: 'monthly',
      lastCountDate: '2024-01-01T00:00:00Z',
      nextCountDate: '2024-02-01T00:00:00Z',
      variance: 0
    }
  },
  {
    itemId: 'ITEM002',
    locationId: 'LOC001',
    quantityOnHand: 45,
    quantityAllocated: 8,
    quantityAvailable: 37,
    quantityOnOrder: 100,
    quantityInTransit: 25,
    quantityReserved: 5,
    lastMovementDate: '2024-01-28T16:15:00Z',
    costLayers: [
      {
        id: 'CL003',
        date: '2024-01-10T09:00:00Z',
        quantity: 30,
        unitCost: 999.00,
        totalCost: 29970.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseCurrencyCost: 29970.00,
        source: 'purchase',
        sourceDocumentId: 'PO-2024-003'
      },
      {
        id: 'CL004',
        date: '2024-01-25T14:15:00Z',
        quantity: 15,
        unitCost: 1050.00,
        totalCost: 15750.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseCurrencyCost: 15750.00,
        source: 'purchase',
        sourceDocumentId: 'PO-2024-004'
      }
    ],
    valuationMethod: 'WEIGHTED_AVERAGE',
    averageCost: 1016.00,
    totalValue: 45720.00,
    lastCountDate: '2024-01-15T00:00:00Z',
    cycleCounting: {
      frequency: 'weekly',
      lastCountDate: '2024-01-15T00:00:00Z',
      nextCountDate: '2024-01-22T00:00:00Z',
      variance: -2
    }
  },
  {
    itemId: 'ITEM003',
    locationId: 'LOC003',
    quantityOnHand: 500,
    quantityAllocated: 50,
    quantityAvailable: 450,
    quantityOnOrder: 1000,
    quantityInTransit: 200,
    quantityReserved: 25,
    lastMovementDate: '2024-01-29T12:00:00Z',
    costLayers: [
      {
        id: 'CL005',
        date: '2024-01-05T07:30:00Z',
        quantity: 300,
        unitCost: 12.50,
        totalCost: 3750.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseCurrencyCost: 3750.00,
        source: 'purchase',
        sourceDocumentId: 'PO-2024-005',
        batchNumber: 'ETH-2024-001',
        expirationDate: '2025-01-05T00:00:00Z'
      },
      {
        id: 'CL006',
        date: '2024-01-22T16:45:00Z',
        quantity: 200,
        unitCost: 13.25,
        totalCost: 2650.00,
        currency: 'USD',
        exchangeRate: 1.0,
        baseCurrencyCost: 2650.00,
        source: 'purchase',
        sourceDocumentId: 'PO-2024-006',
        batchNumber: 'ETH-2024-002',
        expirationDate: '2025-01-22T00:00:00Z'
      }
    ],
    valuationMethod: 'FIFO',
    averageCost: 12.80,
    totalValue: 6400.00,
    lastCountDate: '2024-01-10T00:00:00Z',
    cycleCounting: {
      frequency: 'quarterly',
      lastCountDate: '2024-01-10T00:00:00Z',
      nextCountDate: '2024-04-10T00:00:00Z'
    }
  }
];

export const mockReorderRules: ReorderRules[] = [
  {
    itemId: 'ITEM001',
    locationId: 'LOC001',
    minimumStock: 10,
    maximumStock: 100,
    reorderPoint: 15,
    reorderQuantity: 50,
    safetyStock: 5,
    leadTimeDays: 7,
    demandRate: 2.5,
    isActive: true,
    supplier: {
      id: 'SUP001',
      name: 'Dell Technologies',
      leadTime: 5,
      minimumOrderQuantity: 25
    }
  },
  {
    itemId: 'ITEM002',
    locationId: 'LOC001',
    minimumStock: 20,
    maximumStock: 200,
    reorderPoint: 30,
    reorderQuantity: 100,
    safetyStock: 10,
    leadTimeDays: 14,
    demandRate: 3.2,
    isActive: true,
    supplier: {
      id: 'SUP002',
      name: 'Apple Inc.',
      leadTime: 10,
      minimumOrderQuantity: 50
    }
  },
  {
    itemId: 'ITEM003',
    locationId: 'LOC003',
    minimumStock: 100,
    maximumStock: 2000,
    reorderPoint: 200,
    reorderQuantity: 1000,
    safetyStock: 50,
    leadTimeDays: 21,
    demandRate: 8.5,
    isActive: true,
    supplier: {
      id: 'SUP003',
      name: 'Ethiopian Coffee Cooperative',
      leadTime: 18,
      minimumOrderQuantity: 500
    }
  }
];

export const mockInventoryMovements: InventoryMovement[] = [
  {
    id: 'MOV001',
    movementNumber: 'REC-2024-001',
    date: '2024-01-20T10:30:00Z',
    type: 'receipt',
    subType: 'Purchase Receipt',
    status: 'posted',
    reference: {
      type: 'purchase_order',
      number: 'PO-2024-002',
      id: 'PO002'
    },
    items: [
      {
        itemId: 'ITEM001',
        sku: 'LAP-DEL-5520',
        name: 'Dell Latitude 5520 Laptop',
        quantity: 10,
        unitCost: 1250.00,
        totalCost: 12500.00,
        unitOfMeasure: 'each',
        toLocationId: 'LOC001'
      }
    ],
    totalValue: 12500.00,
    currency: 'USD',
    exchangeRate: 1.0,
    createdBy: 'john.smith',
    approvedBy: 'mary.jones',
    postedBy: 'system',
    createdAt: '2024-01-20T10:30:00Z',
    approvedAt: '2024-01-20T11:00:00Z',
    postedAt: '2024-01-20T11:15:00Z',
    notes: 'Regular purchase order receipt'
  },
  {
    id: 'MOV002',
    movementNumber: 'ISS-2024-001',
    date: '2024-01-25T14:30:00Z',
    type: 'issue',
    subType: 'Sales Issue',
    status: 'posted',
    reference: {
      type: 'sales_order',
      number: 'SO-2024-001',
      id: 'SO001'
    },
    items: [
      {
        itemId: 'ITEM002',
        sku: 'PHN-APL-IP14',
        name: 'Apple iPhone 14 Pro',
        quantity: 3,
        unitCost: 999.00,
        totalCost: 2997.00,
        unitOfMeasure: 'each',
        fromLocationId: 'LOC001',
        toLocationId: 'CUST001',
        serialNumbers: ['SN001234567', 'SN001234568', 'SN001234569']
      }
    ],
    totalValue: 2997.00,
    currency: 'USD',
    exchangeRate: 1.0,
    createdBy: 'sarah.johnson',
    approvedBy: 'mary.jones',
    postedBy: 'system',
    createdAt: '2024-01-25T14:30:00Z',
    approvedAt: '2024-01-25T14:45:00Z',
    postedAt: '2024-01-25T15:00:00Z'
  },
  {
    id: 'MOV003',
    movementNumber: 'TRF-2024-001',
    date: '2024-01-28T16:15:00Z',
    type: 'transfer',
    subType: 'Inter-location Transfer',
    status: 'posted',
    reference: {
      type: 'transfer_order',
      number: 'TR-2024-001',
      id: 'TR001'
    },
    items: [
      {
        itemId: 'ITEM003',
        sku: 'COFF-BEAN-ARB',
        name: 'Premium Arabica Coffee Beans',
        quantity: 100,
        unitCost: 12.50,
        totalCost: 1250.00,
        unitOfMeasure: 'kg',
        fromLocationId: 'LOC003',
        toLocationId: 'LOC001',
        batchNumber: 'ETH-2024-001',
        expirationDate: '2025-01-05T00:00:00Z'
      }
    ],
    totalValue: 1250.00,
    currency: 'USD',
    exchangeRate: 1.0,
    createdBy: 'warehouse.manager',
    approvedBy: 'supply.chain.manager',
    postedBy: 'system',
    createdAt: '2024-01-28T16:15:00Z',
    approvedAt: '2024-01-28T16:30:00Z',
    postedAt: '2024-01-28T16:45:00Z'
  }
];

export const mockPhysicalCounts: PhysicalCount[] = [
  {
    id: 'PC001',
    countNumber: 'PC-2024-001',
    type: 'cycle',
    status: 'completed',
    locationId: 'LOC001',
    scheduledDate: '2024-01-15T08:00:00Z',
    startDate: '2024-01-15T08:30:00Z',
    completedDate: '2024-01-15T17:00:00Z',
    items: [
      {
        itemId: 'ITEM001',
        sku: 'LAP-DEL-5520',
        name: 'Dell Latitude 5520 Laptop',
        bookQuantity: 27,
        countedQuantity: 25,
        variance: -2,
        varianceValue: -2440.00,
        countedBy: 'counter1',
        countDate: '2024-01-15T10:00:00Z'
      },
      {
        itemId: 'ITEM002',
        sku: 'PHN-APL-IP14',
        name: 'Apple iPhone 14 Pro',
        bookQuantity: 47,
        countedQuantity: 45,
        variance: -2,
        varianceValue: -2032.00,
        countedBy: 'counter2',
        countDate: '2024-01-15T14:00:00Z'
      }
    ],
    totalBookValue: 77792.00,
    totalCountValue: 73320.00,
    totalVariance: -4472.00,
    counters: [
      {
        userId: 'counter1',
        name: 'John Counter',
        assignedItems: ['ITEM001']
      },
      {
        userId: 'counter2',
        name: 'Jane Counter',
        assignedItems: ['ITEM002']
      }
    ],
    createdBy: 'inventory.manager',
    approvedBy: 'warehouse.manager',
    createdAt: '2024-01-14T16:00:00Z',
    approvedAt: '2024-01-16T09:00:00Z'
  }
];

export const mockInventoryKPIs: InventoryKPIs = {
  totalInventoryValue: 3250000.00,
  totalItems: 1250,
  totalLocations: 5,
  averageTurnoverRatio: 8.5,
  averageDaysInInventory: 43,
  stockoutItems: 12,
  overstockItems: 35,
  obsoleteItems: 8,
  deadStockValue: 45000.00,
  shrinkageRate: 0.8,
  accuracyRate: 97.5,
  fillRate: 95.2,
  carryingCostRate: 18.5,
  reorderSuggestions: 23
};

export const mockABCAnalysis: ABCAnalysis = {
  date: '2024-01-30T00:00:00Z',
  period: {
    from: '2023-01-01T00:00:00Z',
    to: '2023-12-31T23:59:59Z'
  },
  items: [
    {
      itemId: 'ITEM002',
      sku: 'PHN-APL-IP14',
      name: 'Apple iPhone 14 Pro',
      annualUsage: 1200,
      unitCost: 999.00,
      annualValue: 1198800.00,
      percentageOfTotal: 45.2,
      cumulativePercentage: 45.2,
      classification: 'A',
      turnoverRatio: 12.5,
      daysInInventory: 29
    },
    {
      itemId: 'ITEM001',
      sku: 'LAP-DEL-5520',
      name: 'Dell Latitude 5520 Laptop',
      annualUsage: 800,
      unitCost: 1220.00,
      annualValue: 976000.00,
      percentageOfTotal: 36.8,
      cumulativePercentage: 82.0,
      classification: 'A',
      turnoverRatio: 10.2,
      daysInInventory: 36
    },
    {
      itemId: 'ITEM003',
      sku: 'COFF-BEAN-ARB',
      name: 'Premium Arabica Coffee Beans',
      annualUsage: 12000,
      unitCost: 12.80,
      annualValue: 153600.00,
      percentageOfTotal: 5.8,
      cumulativePercentage: 87.8,
      classification: 'B',
      turnoverRatio: 24.0,
      daysInInventory: 15
    },
    {
      itemId: 'ITEM004',
      sku: 'STEEL-ROD-12MM',
      name: 'Steel Reinforcement Rod 12mm',
      annualUsage: 5000,
      unitCost: 65.00,
      annualValue: 325000.00,
      percentageOfTotal: 12.2,
      cumulativePercentage: 100.0,
      classification: 'B',
      turnoverRatio: 6.8,
      daysInInventory: 54
    }
  ],
  summary: {
    classA: {
      items: 2,
      percentage: 50.0,
      value: 2174800.00,
      valuePercentage: 82.0
    },
    classB: {
      items: 2,
      percentage: 50.0,
      value: 478600.00,
      valuePercentage: 18.0
    },
    classC: {
      items: 0,
      percentage: 0.0,
      value: 0.00,
      valuePercentage: 0.0
    }
  }
};

export const mockBatchLots: BatchLot[] = [
  {
    id: 'BATCH001',
    number: 'ETH-2024-001',
    type: 'batch',
    itemId: 'ITEM003',
    quantity: 300,
    status: 'active',
    dates: {
      received: '2024-01-05T07:30:00Z',
      manufactured: '2023-12-20T00:00:00Z',
      expiration: '2025-01-05T00:00:00Z',
      tested: '2024-01-06T09:00:00Z'
    },
    supplier: {
      id: 'SUP003',
      name: 'Ethiopian Coffee Cooperative'
    },
    qualityTests: [
      {
        parameter: 'Moisture Content',
        result: '10.5%',
        specification: '≤12%',
        status: 'pass',
        testDate: '2024-01-06T09:00:00Z'
      },
      {
        parameter: 'Acidity',
        result: 'pH 5.8',
        specification: 'pH 5.5-6.5',
        status: 'pass',
        testDate: '2024-01-06T09:15:00Z'
      }
    ],
    traceability: [
      {
        date: '2024-01-05T07:30:00Z',
        event: 'Received',
        location: 'LOC003',
        quantity: 300,
        reference: 'PO-2024-005'
      },
      {
        date: '2024-01-28T16:15:00Z',
        event: 'Transferred',
        location: 'LOC001',
        quantity: 100,
        reference: 'TR-2024-001'
      }
    ]
  }
];

export const mockSerialNumbers: SerialNumber[] = [
  {
    id: 'SER001',
    number: 'SN001234567',
    itemId: 'ITEM002',
    status: 'sold',
    location: 'CUST001',
    dates: {
      received: '2024-01-10T09:00:00Z',
      manufactured: '2024-01-05T00:00:00Z',
      shipped: '2024-01-25T15:00:00Z',
      warrantyExpiry: '2025-01-25T00:00:00Z'
    },
    customer: {
      id: 'CUST001',
      name: 'Tech Solutions Inc.'
    },
    warranty: {
      period: 1,
      unit: 'years',
      terms: 'Standard manufacturer warranty'
    },
    history: [
      {
        date: '2024-01-10T09:00:00Z',
        event: 'Received',
        location: 'LOC001',
        reference: 'PO-2024-003',
        notes: 'Initial receipt from supplier'
      },
      {
        date: '2024-01-25T15:00:00Z',
        event: 'Sold',
        location: 'CUST001',
        reference: 'SO-2024-001',
        notes: 'Sold to customer'
      }
    ]
  }
];

export const mockInventoryTurnover: InventoryTurnover[] = [
  {
    itemId: 'ITEM001',
    sku: 'LAP-DEL-5520',
    name: 'Dell Latitude 5520 Laptop',
    period: {
      from: '2023-01-01T00:00:00Z',
      to: '2023-12-31T23:59:59Z'
    },
    beginningInventory: 920000.00,
    endingInventory: 1080000.00,
    averageInventory: 1000000.00,
    costOfGoodsSold: 10200000.00,
    turnoverRatio: 10.2,
    daysInInventory: 36,
    classification: 'normal',
    recommendations: [
      'Maintain current inventory levels',
      'Consider negotiating better supplier terms',
      'Monitor seasonal demand patterns'
    ]
  },
  {
    itemId: 'ITEM002',
    sku: 'PHN-APL-IP14',
    name: 'Apple iPhone 14 Pro',
    period: {
      from: '2023-01-01T00:00:00Z',
      to: '2023-12-31T23:59:59Z'
    },
    beginningInventory: 850000.00,
    endingInventory: 1150000.00,
    averageInventory: 1000000.00,
    costOfGoodsSold: 12500000.00,
    turnoverRatio: 12.5,
    daysInInventory: 29,
    classification: 'fast_moving',
    recommendations: [
      'Consider increasing safety stock',
      'Evaluate supplier lead times',
      'Implement just-in-time delivery'
    ]
  },
  {
    itemId: 'ITEM003',
    sku: 'COFF-BEAN-ARB',
    name: 'Premium Arabica Coffee Beans',
    period: {
      from: '2023-01-01T00:00:00Z',
      to: '2023-12-31T23:59:59Z'
    },
    beginningInventory: 6000.00,
    endingInventory: 7000.00,
    averageInventory: 6500.00,
    costOfGoodsSold: 156000.00,
    turnoverRatio: 24.0,
    daysInInventory: 15,
    classification: 'fast_moving',
    recommendations: [
      'Excellent turnover rate',
      'Consider volume discounts from supplier',
      'Monitor expiration dates closely'
    ]
  }
];

// Export functions to generate additional mock data
export const generateMockMovements = (count: number): InventoryMovement[] => {
  const movements: InventoryMovement[] = [];
  const types = ['receipt', 'issue', 'transfer', 'adjustment'];
  const statuses = ['posted', 'pending', 'approved'];

  for (let i = 1; i <= count; i++) {
    const type = types[Math.floor(Math.random() * types.length)] as any;
    const status = statuses[Math.floor(Math.random() * statuses.length)] as any;

    movements.push({
      id: `MOV${(i + 3).toString().padStart(3, '0')}`,
      movementNumber: `${type.toUpperCase()}-2024-${(i + 1).toString().padStart(3, '0')}`,
      date: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString(),
      type,
      subType: `${type.charAt(0).toUpperCase() + type.slice(1)} Transaction`,
      status,
      reference: {
        type: 'purchase_order',
        number: `REF-2024-${(i + 1).toString().padStart(3, '0')}`,
        id: `REF${(i + 1).toString().padStart(3, '0')}`
      },
      items: [
        {
          itemId: mockInventoryItems[Math.floor(Math.random() * mockInventoryItems.length)].id,
          sku: mockInventoryItems[Math.floor(Math.random() * mockInventoryItems.length)].sku,
          name: mockInventoryItems[Math.floor(Math.random() * mockInventoryItems.length)].name,
          quantity: Math.floor(Math.random() * 100) + 1,
          unitCost: Math.floor(Math.random() * 1000) + 50,
          totalCost: 0, // Will be calculated
          unitOfMeasure: 'each',
          toLocationId: mockLocations[Math.floor(Math.random() * mockLocations.length)].id
        }
      ],
      totalValue: 0, // Will be calculated
      currency: 'USD',
      exchangeRate: 1.0,
      createdBy: 'system',
      createdAt: new Date(2024, 0, Math.floor(Math.random() * 30) + 1).toISOString()
    });

    // Calculate totals
    movements[i - 1].items[0].totalCost = movements[i - 1].items[0].quantity * movements[i - 1].items[0].unitCost;
    movements[i - 1].totalValue = movements[i - 1].items[0].totalCost;
  }

  return movements;
};