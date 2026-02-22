/**
 * ScreenReaderOnly Component
 * Renders content that is visually hidden but accessible to screen readers
 */

import React from 'react';

interface ScreenReaderOnlyProps {
  children: React.ReactNode;
}

export const ScreenReaderOnly: React.FC<ScreenReaderOnlyProps> = ({ children }) => {
  return <span className="sr-only">{children}</span>;
};
