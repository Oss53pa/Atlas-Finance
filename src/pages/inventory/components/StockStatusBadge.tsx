import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface StockStatusBadgeProps {
  quantity: number;
  minimumStock?: number;
  maximumStock?: number;
  reorderPoint?: number;
  className?: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock' | 'reorder_needed';

const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({
  quantity,
  minimumStock,
  maximumStock,
  reorderPoint,
  className = ''
}) => {
  const getStockStatus = (): StockStatus => {
    if (quantity <= 0) return 'out_of_stock';
    if (maximumStock && quantity > maximumStock) return 'overstock';
    if (reorderPoint && quantity <= reorderPoint) return 'reorder_needed';
    if (minimumStock && quantity <= minimumStock) return 'low_stock';
    return 'in_stock';
  };

  const status = getStockStatus();

  const statusConfig = {
    in_stock: {
      label: 'In Stock',
      icon: CheckCircle,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-600'
    },
    low_stock: {
      label: 'Low Stock',
      icon: AlertTriangle,
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    out_of_stock: {
      label: 'Out of Stock',
      icon: XCircle,
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      iconColor: 'text-red-600'
    },
    overstock: {
      label: 'Overstock',
      icon: AlertTriangle,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600'
    },
    reorder_needed: {
      label: 'Reorder Needed',
      icon: Clock,
      bgColor: 'bg-[#171717]/10',
      textColor: 'text-[#171717]',
      iconColor: 'text-[#171717]'
    }
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <IconComponent className={`w-3 h-3 ${config.iconColor}`} />
      {config.label}
    </span>
  );
};

export default StockStatusBadge;