import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  InventoryDashboard,
  StockManagement,
  InventoryValuation,
  PhysicalInventory,
  InventoryMovements,
  InventoryReports
} from './index';

const InventoryRouter: React.FC = () => {
  return (
    <Routes>
      {/* Default route redirects to dashboard */}
      <Route path="/" element={<Navigate to="/inventory/dashboard" replace />} />

      {/* Main inventory routes */}
      <Route path="/dashboard" element={<InventoryDashboard />} />
      <Route path="/stock" element={<StockManagement />} />
      <Route path="/valuation" element={<InventoryValuation />} />
      <Route path="/physical" element={<PhysicalInventory />} />
      <Route path="/movements" element={<InventoryMovements />} />
      <Route path="/reports" element={<InventoryReports />} />

      {/* Catch-all route redirects to dashboard */}
      <Route path="*" element={<Navigate to="/inventory/dashboard" replace />} />
    </Routes>
  );
};

export default InventoryRouter;