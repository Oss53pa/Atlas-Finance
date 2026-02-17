import React from 'react';
import { Package, TrendingUp, Calculator, Target, DollarSign } from 'lucide-react';
import { ValuationMethod } from '../types';

interface ValuationMethodBadgeProps {
  method: ValuationMethod;
  showIcon?: boolean;
  showDescription?: boolean;
  className?: string;
}

const ValuationMethodBadge: React.FC<ValuationMethodBadgeProps> = ({
  method,
  showIcon = true,
  showDescription = false,
  className = ''
}) => {
  const methodConfig = {
    FIFO: {
      label: 'FIFO',
      fullLabel: 'First In, First Out',
      description: 'Items purchased first are sold first',
      icon: TrendingUp,
      bgColor: 'bg-[#6A8A82]/10',
      textColor: 'text-[#6A8A82]',
      iconColor: 'text-[#6A8A82]',
      compliance: 'IFRS, US GAAP, SYSCOHADA'
    },
    LIFO: {
      label: 'LIFO',
      fullLabel: 'Last In, First Out',
      description: 'Items purchased last are sold first',
      icon: TrendingUp,
      bgColor: 'bg-[#B87333]/10',
      textColor: 'text-[#B87333]',
      iconColor: 'text-[#B87333]',
      compliance: 'US GAAP only'
    },
    WEIGHTED_AVERAGE: {
      label: 'Weighted Avg',
      fullLabel: 'Weighted Average',
      description: 'Average cost of all units in inventory',
      icon: Calculator,
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
      compliance: 'IFRS, US GAAP, SYSCOHADA'
    },
    SPECIFIC_IDENTIFICATION: {
      label: 'Specific ID',
      fullLabel: 'Specific Identification',
      description: 'Track actual cost of each specific item',
      icon: Target,
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      iconColor: 'text-orange-600',
      compliance: 'IFRS, US GAAP, SYSCOHADA'
    },
    STANDARD_COST: {
      label: 'Standard',
      fullLabel: 'Standard Cost',
      description: 'Predetermined cost for each unit',
      icon: DollarSign,
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      iconColor: 'text-gray-600',
      compliance: 'Management Accounting'
    }
  };

  const config = methodConfig[method];
  const IconComponent = config.icon;

  if (showDescription) {
    return (
      <div className={`p-3 rounded-lg ${config.bgColor} ${className}`}>
        <div className="flex items-center gap-2 mb-1">
          {showIcon && <IconComponent className={`w-4 h-4 ${config.iconColor}`} />}
          <span className={`font-medium ${config.textColor}`}>
            {config.fullLabel}
          </span>
        </div>
        <p className={`text-sm ${config.textColor} opacity-80`}>
          {config.description}
        </p>
        <p className={`text-xs ${config.textColor} opacity-60 mt-1`}>
          Compliance: {config.compliance}
        </p>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
      title={`${config.fullLabel} - ${config.description}`}
    >
      {showIcon && <IconComponent className={`w-3 h-3 ${config.iconColor}`} />}
      {config.label}
    </span>
  );
};

export default ValuationMethodBadge;