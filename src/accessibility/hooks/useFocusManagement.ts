/**
 * Focus Management Hook
 * Provides ref-based focus control for accessible components
 */

import { useRef, useCallback } from 'react';

interface UseFocusManagementReturn {
  focusRef: React.RefObject<HTMLElement | null>;
  setFocus: () => void;
}

export function useFocusManagement(): UseFocusManagementReturn {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocus = useCallback(() => {
    focusRef.current?.focus();
  }, []);

  return { focusRef, setFocus };
}
