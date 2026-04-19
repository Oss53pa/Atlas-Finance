/**
 * MoneyFormatToggle — Toggle segmenté pour l'affichage des montants.
 *
 *   ┌──────────┬──────┐
 *   │ # Entier │ K/M  │   ← segment actif en relief
 *   └──────────┴──────┘
 *
 * Mode 'full'    : 1 234 567 890
 * Mode 'compact' : 1,23 Md
 *
 * Le choix est global (toute l'app) et persisté dans localStorage.
 */
import React from 'react';
import { Hash, Gauge } from 'lucide-react';
import { useMoneyFormatMode } from '../../hooks/useMoneyFormat';

export interface MoneyFormatToggleProps {
  /** Affiche uniquement les icônes (pour les écrans étroits) */
  iconOnly?: boolean;
  className?: string;
}

export const MoneyFormatToggle: React.FC<MoneyFormatToggleProps> = ({
  iconOnly = false,
  className = '',
}) => {
  const { mode, setMode } = useMoneyFormatMode();

  const baseBtn =
    'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400';
  const active =
    'bg-neutral-900 text-white shadow-sm dark:bg-white dark:text-neutral-900';
  const inactive =
    'bg-transparent text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-neutral-800';

  return (
    <div
      role="group"
      aria-label="Format des montants"
      className={`inline-flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900 ${className}`}
    >
      <button
        type="button"
        onClick={() => setMode('full')}
        aria-pressed={mode === 'full'}
        aria-label="Afficher les montants en nombre entier"
        title="Afficher les montants en entier (ex: 1 234 567 890)"
        className={`${baseBtn} ${mode === 'full' ? active : inactive} rounded-l-lg`}
      >
        <Hash className="w-3.5 h-3.5" aria-hidden="true" />
        {!iconOnly && <span>Entier</span>}
      </button>
      <div className="w-px h-5 bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setMode('compact')}
        aria-pressed={mode === 'compact'}
        aria-label="Afficher les montants en abréviation K/M/Md"
        title="Afficher les montants abrégés (ex: 1,23 Md)"
        className={`${baseBtn} ${mode === 'compact' ? active : inactive} rounded-r-lg`}
      >
        <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
        {!iconOnly && <span>K/M</span>}
      </button>
    </div>
  );
};

export default MoneyFormatToggle;
