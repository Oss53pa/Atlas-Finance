/**
 * FICHIER DÉPRÉCIÉ — Les données d'inventaire doivent provenir de Dexie.
 * Les exports sont conservés vides pour compatibilité avec les imports existants.
 */
import {
  InventoryItem,
  StockLevel,
  InventoryMovement,
  PhysicalCount,
  Location,
  Currency,
  BatchLot,
  SerialNumber,
  ReorderRules,
  InventoryKPIs,
  ABCAnalysis,
  InventoryTurnover
} from '../types';

export const mockCurrencies: Currency[] = [];
export const mockLocations: Location[] = [];
export const mockInventoryItems: InventoryItem[] = [];
export const mockStockLevels: StockLevel[] = [];
export const mockReorderRules: ReorderRules[] = [];
export const mockInventoryMovements: InventoryMovement[] = [];
export const mockPhysicalCounts: PhysicalCount[] = [];

export const mockInventoryKPIs: InventoryKPIs = {
  totalItems: 0,
  totalValue: 0,
  lowStockItems: 0,
  outOfStockItems: 0,
  overStockItems: 0,
  averageTurnover: 0,
  inventoryAccuracy: 100,
  fillRate: 0,
  stockoutRate: 0,
  carryingCost: 0,
  shrinkageRate: 0,
  daysOfSupply: 0,
} as unknown as InventoryKPIs;

export const mockABCAnalysis: ABCAnalysis = {
  categories: [],
  totalItems: 0,
  totalValue: 0,
} as unknown as ABCAnalysis;

export const mockBatchLots: BatchLot[] = [];
export const mockSerialNumbers: SerialNumber[] = [];
export const mockInventoryTurnover: InventoryTurnover[] = [];

export const generateMockMovements = (_count: number): InventoryMovement[] => [];
