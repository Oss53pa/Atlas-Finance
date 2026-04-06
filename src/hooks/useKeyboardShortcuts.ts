import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for Atlas Finance.
 * Alt+S = Search / Alt+N = New entry / Esc = Close modal / Alt+D = Dashboard
 * Alt+B = Balance / Alt+G = Grand Livre / Alt+J = Journaux
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 's': e.preventDefault(); document.querySelector<HTMLInputElement>('[data-search-input]')?.focus(); break;
          case 'n': e.preventDefault(); navigate('/accounting/entries/new'); break;
          case 'd': e.preventDefault(); navigate('/dashboard'); break;
          case 'b': e.preventDefault(); navigate('/accounting/balance'); break;
          case 'g': e.preventDefault(); navigate('/accounting/general-ledger'); break;
          case 'j': e.preventDefault(); navigate('/accounting/journals'); break;
          case 'p': e.preventDefault(); navigate('/proph3t'); break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
