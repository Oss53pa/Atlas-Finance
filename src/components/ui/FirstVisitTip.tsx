import React from 'react';
import { X, Lightbulb } from 'lucide-react';
import { useFirstVisitTip } from '../../hooks/useFirstVisitTip';

interface FirstVisitTipProps {
  /** Unique id stored in localStorage so the tip is shown only once */
  tipId: string;
  /** Tip content / hint text */
  content: React.ReactNode;
  /** The element the tip is attached to */
  children: React.ReactNode;
  /** Placement of the tip bubble relative to children */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Optional title at the top of the tip */
  title?: string;
  className?: string;
}

export const FirstVisitTip: React.FC<FirstVisitTipProps> = ({
  tipId,
  content,
  children,
  placement = 'bottom',
  title,
  className = '',
}) => {
  const { shouldShow, dismiss } = useFirstVisitTip(tipId);

  const positionClass =
    placement === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
    placement === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
    placement === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
    'left-full ml-2 top-1/2 -translate-y-1/2';

  return (
    <span className={`relative inline-block ${className}`}>
      {children}
      {shouldShow && (
        <span
          className={`absolute z-50 ${positionClass}`}
          role="tooltip"
        >
          <span className="block w-64 bg-blue-600 text-white rounded-lg shadow-xl p-3 text-sm">
            <span className="flex items-start justify-between gap-2 mb-1">
              <span className="flex items-center gap-1.5 font-semibold">
                <Lightbulb className="w-4 h-4" />
                {title || 'Astuce'}
              </span>
              <button
                type="button"
                onClick={dismiss}
                className="p-0.5 hover:bg-white/20 rounded"
                aria-label="Fermer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
            <span className="block text-white/90 text-xs leading-relaxed">
              {content}
            </span>
            <span className="block mt-2 text-right">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs underline hover:text-white"
              >
                Compris
              </button>
            </span>
          </span>
        </span>
      )}
    </span>
  );
};

export default FirstVisitTip;
