import React from 'react';

interface ProgressProps {
  value: number;
  className?: string;
  max?: number;
}

export const Progress: React.FC<ProgressProps> = ({ value, className = '', max = 100 }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};