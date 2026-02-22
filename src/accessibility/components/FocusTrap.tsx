/**
 * FocusTrap Component
 * Traps focus within its children (stub: renders children as-is)
 */

import React from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({ children, active: _active = true }) => {
  // Stub: extend with actual focus trapping logic as needed
  return <>{children}</>;
};
