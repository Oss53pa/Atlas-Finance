import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  centered?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = '',
  centered = false
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      default:
        return 'w-6 h-6';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm';
      case 'lg':
        return 'text-lg';
      default:
        return 'text-base';
    }
  };

  const containerClasses = centered
    ? 'flex flex-col items-center justify-center'
    : 'flex items-center gap-2';

  return (
    <div className={`${containerClasses} ${className}`}>
      <Loader2 className={`${getSizeClasses()} animate-spin text-[#6A8A82]`} />
      {text && (
        <span className={`${getTextSize()} text-gray-600 ${centered ? 'mt-2' : ''}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;