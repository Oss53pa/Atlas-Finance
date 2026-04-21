import React from 'react';

export const Label: React.FC<{
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}> = ({ children, htmlFor, className = '' }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-[var(--color-text-secondary)] ${className}`}>
    {children}
  </label>
);