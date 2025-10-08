import React from 'react';
import { DollarSign, Euro, Coins } from 'lucide-react';

interface CurrencyDisplayProps {
  amount: number;
  currency: string;
  showSymbol?: boolean;
  showCode?: boolean;
  precision?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency,
  showSymbol = true,
  showCode = false,
  precision = 2,
  className = '',
  size = 'md'
}) => {
  const currencyConfig: Record<string, { symbol: string; icon?: React.ComponentType<any> }> = {
    USD: { symbol: '$', icon: DollarSign },
    EUR: { symbol: '€', icon: Euro },
    GBP: { symbol: '£' },
    CAD: { symbol: 'C$' },
    XOF: { symbol: 'CFA', icon: Coins },
    JPY: { symbol: '¥' },
    CHF: { symbol: 'CHF' },
    AUD: { symbol: 'A$' },
    CNY: { symbol: '¥' },
    INR: { symbol: '₹' }
  };

  const config = currencyConfig[currency] || { symbol: currency };
  const IconComponent = config.icon;

  const formatAmount = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision
    }).format(value);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg font-semibold';
      default:
        return 'text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-5 h-5';
      default:
        return 'w-4 h-4';
    }
  };

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const colorClass = isNegative ? 'text-red-600' : 'text-gray-900';

  return (
    <span className={`inline-flex items-center gap-1 ${getSizeClasses()} ${colorClass} ${className}`}>
      {isNegative && <span>-</span>}
      {showSymbol && IconComponent && (
        <IconComponent className={`${getIconSize()} text-gray-700`} />
      )}
      {showSymbol && !IconComponent && (
        <span className="text-gray-700">{config.symbol}</span>
      )}
      <span className="font-mono">
        {!showSymbol && config.symbol !== currency && config.symbol}
        {formatAmount(absAmount)}
      </span>
      {showCode && (
        <span className="text-gray-700 text-xs ml-1">
          {currency}
        </span>
      )}
    </span>
  );
};

export default CurrencyDisplay;