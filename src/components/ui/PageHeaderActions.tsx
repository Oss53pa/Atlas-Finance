/**
 * PageHeaderActions — paire d'actions STANDARD des écrans de travail :
 * « Filtre » (entonnoir) + « Impression » (imprimante), en boutons-icônes
 * compacts (style de la maquette du 13/06/2026).
 *
 * Objectif : UN SEUL composant filtre+impression dans toute l'application, à
 * poser dans le header d'un écran de travail (slot `header` de DataPageLayout
 * ou barre d'actions d'une page). Les écrans à base de `DataTable` ont déjà
 * cette barre intégrée ; ce composant couvre les tables « maison ».
 *
 *  - Entonnoir : `onToggleFilters` (ouvre/replie le panneau de filtres de l'écran,
 *    ex. FilterSidebar). Pastille du nombre de filtres actifs (`activeFilters`).
 *    Omis si `onToggleFilters` n'est pas fourni.
 *  - Imprimante : `onPrint`. Si non fourni, impression intégrée par défaut
 *    (window.print via le CSS @media print global : chrome masqué, .print-area).
 *    Mettre `printable={false}` pour masquer le bouton.
 *
 * Réutilisable, sans état métier : l'écran fournit ses handlers.
 */
import React, { useEffect, useState } from 'react';
import { Filter, Printer } from 'lucide-react';

export interface PageHeaderActionsProps {
  /** Ouvre/replie le panneau de filtres de l'écran. Omis ⇒ pas de bouton filtre. */
  onToggleFilters?: () => void;
  /** Nombre de filtres actifs (pastille sur l'entonnoir). */
  activeFilters?: number;
  /** État ouvert du panneau (surligne l'entonnoir). */
  filtersOpen?: boolean;
  /** Handler d'impression. Absent ⇒ impression intégrée (window.print). */
  onPrint?: () => void;
  /** Affiche le bouton imprimante (défaut: true). */
  printable?: boolean;
  /** Actions additionnelles rendues à droite (export, etc.). */
  children?: React.ReactNode;
  className?: string;
}

const btnCls =
  'relative p-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] ' +
  'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors print-hide';

export const PageHeaderActions: React.FC<PageHeaderActionsProps> = ({
  onToggleFilters,
  activeFilters = 0,
  filtersOpen = false,
  onPrint,
  printable = true,
  children,
  className = '',
}) => {
  const [printing, setPrinting] = useState(false);

  // Impression intégrée (si pas d'onPrint) : réutilise le CSS @media print global.
  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('printing');
    const id = window.setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
      setPrinting(false);
    }, 150);
    return () => { window.clearTimeout(id); document.body.classList.remove('printing'); };
  }, [printing]);

  const handlePrint = onPrint || (() => setPrinting(true));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onToggleFilters && (
        <button
          type="button"
          onClick={onToggleFilters}
          aria-pressed={filtersOpen}
          aria-label={`Filtres${activeFilters > 0 ? ` (${activeFilters} actifs)` : ''}`}
          title="Filtres"
          className={
            btnCls +
            (filtersOpen
              ? ' !border-[var(--color-primary)] !text-[var(--color-primary)] !bg-[var(--color-primary)]/10'
              : '')
          }
        >
          <Filter className="w-4 h-4" />
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
      )}

      {printable && (
        <button
          type="button"
          onClick={handlePrint}
          aria-label="Imprimer"
          title="Imprimer"
          className={btnCls}
        >
          <Printer className="w-4 h-4" />
        </button>
      )}

      {children}
    </div>
  );
};

export default PageHeaderActions;
