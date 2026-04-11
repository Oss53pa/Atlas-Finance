import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: React.ReactNode;
  children?: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Show as a help icon (?) instead of wrapping children */
  asIcon?: boolean;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  placement = 'top',
  asIcon = false,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const offsets: Record<string, { top: number; left: number }> = {
      top: { top: rect.top - 8, left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + 8, left: rect.left + rect.width / 2 },
      left: { top: rect.top + rect.height / 2, left: rect.left - 8 },
      right: { top: rect.top + rect.height / 2, left: rect.right + 8 },
    };
    setCoords(offsets[placement]);
  }, [visible, placement]);

  return (
    <>
      <span
        ref={triggerRef}
        className={`inline-flex items-center ${className}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        tabIndex={asIcon ? 0 : undefined}
        role={asIcon ? 'button' : undefined}
        aria-label={asIcon ? 'Aide' : undefined}
      >
        {asIcon ? (
          <HelpCircle className="w-4 h-4 text-neutral-400 hover:text-neutral-600 cursor-help" />
        ) : (
          children
        )}
      </span>
      {visible && coords && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: coords.top,
            left: coords.left,
            transform: placement === 'top' ? 'translate(-50%, -100%)' :
                       placement === 'bottom' ? 'translate(-50%, 0)' :
                       placement === 'left' ? 'translate(-100%, -50%)' :
                       'translate(0, -50%)',
          }}
        >
          <div className="bg-neutral-900 text-white text-xs rounded-lg px-3 py-2 max-w-xs shadow-lg">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

export default Tooltip;
