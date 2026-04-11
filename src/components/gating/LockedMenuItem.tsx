/**
 * LockedMenuItem — Wrapper pour les entrées du menu latéral verrouillées.
 * Affiche l'icône + le label en grisé + un badge "Premium" amber, non-cliquable.
 * Cliquer dessus affiche un tooltip "Upgrade Premium".
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';

export interface LockedMenuItemProps {
  icon: React.ReactNode;
  label: string;
  /** Feature key (utilisé pour l'aria-label et le tracking) */
  feature?: string;
  /** Version compacte (icon-only, sidebar collapsée) */
  collapsed?: boolean;
  className?: string;
}

export const LockedMenuItem: React.FC<LockedMenuItemProps> = ({
  icon,
  label,
  feature,
  collapsed = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/settings/billing');
  };

  return (
    <div
      className={`relative group ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-disabled="true"
        aria-label={`${label} — réservé au plan Premium`}
        data-feature={feature}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg
          text-neutral-500 cursor-not-allowed opacity-70 hover:opacity-100
          hover:bg-neutral-800/30 transition-opacity
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <span className="shrink-0 relative">
          {icon}
          <Lock
            className="w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5"
            style={{ color: '#EF9F27' }}
          />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm truncate">{label}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1"
              style={{
                background: 'rgba(239,159,39,0.15)',
                color: '#EF9F27',
                border: '1px solid rgba(239,159,39,0.3)',
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              Premium
            </span>
          </>
        )}
      </button>

      {showTooltip && (
        <div
          className={`
            absolute z-50 pointer-events-none
            ${collapsed ? 'left-full ml-2 top-1/2 -translate-y-1/2' : 'left-0 right-0 top-full mt-1'}
          `}
        >
          <div
            className="rounded-lg p-3 shadow-xl max-w-xs"
            style={{
              background: '#1a1a1a',
              border: '1px solid #EF9F27',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5" style={{ color: '#EF9F27' }} />
              <p className="text-xs font-bold" style={{ color: '#EF9F27' }}>
                Fonctionnalité Premium
              </p>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              {label} est réservé au plan Premium. Cliquez pour découvrir les offres.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LockedMenuItem;
