import React from 'react';

export const RadioGroup: React.FC<{
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {children}
  </div>
);

export const RadioGroupItem: React.FC<{
  value: string;
  id?: string;
}> = ({ value, id }) => (
  <input
    type="radio"
    value={value}
    id={id}
    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
  />
);