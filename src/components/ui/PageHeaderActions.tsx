/**
 * PageHeaderActions — paire d'actions STANDARD des écrans de travail :
 * « Filtre » (entonnoir) + « Impression » (imprimante), en boutons-icônes
 * compacts (style de la maquette du 13/06/2026).
 *
 * Objectif : UN SEUL composant filtre+impression dans toute l'application, à
 * poser dans le header d'un écran de travail.
 *
 *  - Entonnoir : `onToggleFilters` (ouvre/replie le panneau de filtres de l'écran).
 *    Pastille du nombre de filtres actifs (`activeFilters`). Omis si non fourni.
 *  - Imprimante : choix A4 portrait/paysage → impression « rapport » pro,
 *    STRICTEMENT limitée aux tableaux de données de la page (cf. printReport).
 *    `onPrint` permet d'imposer un handler maison (impression désactivable via
 *    `printable={false}`).
 */
import React from 'react';
import { Filter, Printer } from 'lucide-react';
import PrintButton from './PrintButton';
import { collectTablesHtml, getReportTitle } from '../../utils/printReport';

export interface PageHeaderActionsProps {
  /** Ouvre/replie le panneau de filtres de l'écran. Omis ⇒ pas de bouton filtre. */
  onToggleFilters?: () => void;
  /** Nombre de filtres actifs (pastille sur l'entonnoir). */
  activeFilters?: number;
  /** État ouvert du panneau (surligne l'entonnoir). */
  filtersOpen?: boolean;
  /** Handler d'impression maison (bypass de l'impression rapport intégrée). */
  onPrint?: () => void;
  /** Affiche le bouton imprimante (défaut: true). */
  printable?: boolean;
  /** Titre du rapport imprimé (défaut: déduit du 1er h1/h2 de la page). */
  printTitle?: string;
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
  printTitle,
  children,
  className = '',
}) => {
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

      {printable && onPrint && (
        <button
          type="button"
          onClick={onPrint}
          aria-label="Imprimer"
          title="Imprimer"
          className={btnCls}
        >
          <Printer className="w-4 h-4" />
        </button>
      )}

      {printable && !onPrint && (
        <PrintButton
          buildBody={(orientation, anchor) => {
            const root =
              (anchor.closest('[data-print-root]') as HTMLElement | null) ||
              (anchor.closest('main') as HTMLElement | null) ||
              document.body;
            const bodyHtml = collectTablesHtml(root);
            return { title: printTitle || getReportTitle(root), bodyHtml };
          }}
        />
      )}

      {children}
    </div>
  );
};

export default PageHeaderActions;
