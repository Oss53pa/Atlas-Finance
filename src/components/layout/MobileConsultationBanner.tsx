import { useState, useEffect } from 'react';
import { Monitor, X } from 'lucide-react';

export function MobileConsultationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-amber-50 border-t border-amber-200 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-amber-800">
        <Monitor className="h-4 w-4" />
        <span>Mode consultation — Pour la saisie d'écritures, utilisez un ordinateur.</span>
      </div>
      <button onClick={() => setVisible(false)} className="text-amber-600 hover:text-amber-800">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
