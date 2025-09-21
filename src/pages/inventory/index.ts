// Inventory Management Module Exports
// Complete enterprise-grade inventory management system

// Main Components
export { default as InventoryDashboard } from './InventoryDashboard';
export { default as StockManagement } from './StockManagement';
export { default as InventoryValuation } from './InventoryValuation';
export { default as PhysicalInventory } from './PhysicalInventory';
export { default as InventoryMovements } from './InventoryMovements';
export { default as InventoryReports } from './InventoryReports';

// Shared Components
export { default as InventoryFilters } from './components/InventoryFilters';
export { default as ExportButton } from './components/ExportButton';
export { default as StockStatusBadge } from './components/StockStatusBadge';
export { default as ValuationMethodBadge } from './components/ValuationMethodBadge';
export { default as CurrencyDisplay } from './components/CurrencyDisplay';
export { default as LoadingSpinner } from './components/LoadingSpinner';
export { default as Pagination } from './components/Pagination';

// Types and Interfaces
export * from './types';

// Utilities
export { InventoryCalculations } from './utils/calculations';
export * from './utils/mockData';

// Module Information
export const InventoryModuleInfo = {
  name: 'Inventory Management',
  version: '1.0.0',
  description: 'Complete inventory management system with international accounting standards compliance',
  features: [
    'Real-time stock tracking',
    'Multiple valuation methods (FIFO, LIFO, Weighted Average)',
    'International compliance (IFRS IAS 2, US GAAP ASC 330, SYSCOHADA)',
    'Physical inventory management',
    'Cycle counting and variance analysis',
    'Comprehensive movement tracking',
    'Advanced analytics and reporting',
    'Multi-currency and multi-location support',
    'Batch and serial number tracking',
    'Automated reorder management'
  ],
  compliance: ['IFRS IAS 2', 'US GAAP ASC 330', 'SYSCOHADA', 'SOX'],
  author: 'WiseBook ERP Team',
  lastUpdated: '2024-01-30'
};