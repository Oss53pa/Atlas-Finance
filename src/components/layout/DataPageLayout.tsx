/**
 * DataPageLayout — gabarit STANDARD des écrans de travail sur données (tables).
 *
 * Implémente la règle « le contexte est fixe, le contenu défile » :
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ header   (titre, actions)                    │ FIXE
 *   │ toolbar  (filtres, KPI, chips)               │ FIXE (optionnel)
 *   ├──────────────────────────────────┬───────────┤
 *   │ children = LA TABLE              │ sidebar   │ ⬍ SEULE zone défilante
 *   │ (un seul ascenseur vertical)     │ (option.) │
 *   ├──────────────────────────────────┴───────────┤
 *   │ footer   (totaux, pagination)                │ FIXE (optionnel)
 *   └──────────────────────────────────────────────┘
 *
 * Principes appliqués :
 *  - UN SEUL conteneur défilant (la zone children) — pas de double ascenseur ;
 *  - l'en-tête de colonnes du tableau reste figé via `sticky top-0` DANS cette zone
 *    (les composants DataTable/ResponsiveTable le font déjà) ;
 *  - la page ne défile jamais : repères (titre, filtres, totaux) toujours visibles.
 *
 * ⚠️ Réservé aux écrans de TRAVAIL (grosses tables). Les pages « document »
 * (tableaux de bord, rapports, paramètres) doivent garder le défilement normal.
 *
 * Usage :
 *   <DataPageLayout
 *     header={<PageTitle …/>}
 *     toolbar={<Filtres + KPI …/>}
 *     footer={<Totaux …/>}
 *     sidebar={<FilterSidebar …/>}
 *   >
 *     <MaTable />
 *   </DataPageLayout>
 */
import React, { useLayoutEffect, useRef, useState } from 'react';

export interface DataPageLayoutProps {
  /** Zone fixe du haut : titre de page + actions principales. */
  header?: React.ReactNode;
  /** Zone fixe sous le header : filtres, KPI, chips de filtres actifs. */
  toolbar?: React.ReactNode;
  /** Zone fixe du bas : totaux, pagination. */
  footer?: React.ReactNode;
  /** Colonne droite (ex. FilterSidebar) — hors de la zone défilante. */
  sidebar?: React.ReactNode;
  /** LA zone défilante (la table). */
  children: React.ReactNode;
  /**
   * Décalage vertical (px) FORCÉ. Par défaut (undefined), le gabarit MESURE
   * sa position réelle dans la fenêtre (header d'app + paddings du layout)
   * et occupe exactement la hauteur restante — aucun ascenseur parasite.
   */
  viewportOffset?: number;
  className?: string;
}

export const DataPageLayout: React.FC<DataPageLayoutProps> = ({
  header,
  toolbar,
  footer,
  sidebar,
  children,
  viewportOffset,
  className = '',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [autoOffset, setAutoOffset] = useState(0);

  useLayoutEffect(() => {
    if (viewportOffset !== undefined) return;
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      // Position réelle du gabarit dans la fenêtre (header d'app, marges…)
      const top = el.getBoundingClientRect().top + (el.closest('main')?.scrollTop ?? 0);
      // + padding bas du conteneur parent (ex. wrapper p-3/p-4 du layout d'app)
      const parent = el.parentElement;
      const padBottom = parent ? parseFloat(getComputedStyle(parent).paddingBottom) || 0 : 0;
      setAutoOffset(Math.max(0, Math.round(top + padBottom)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [viewportOffset]);

  const offset = viewportOffset !== undefined ? viewportOffset : autoOffset;

  return (
    <div
      ref={rootRef}
      className={`flex flex-col overflow-hidden ${className}`}
      style={{ height: `calc(100dvh - ${offset}px)` }}
    >
      {header && <div className="flex-shrink-0">{header}</div>}
      {toolbar && <div className="flex-shrink-0">{toolbar}</div>}

      <div className="flex flex-1 min-h-0 items-stretch">
        {/* LA zone défilante — l'unique ascenseur vertical de l'écran. */}
        <div className="flex-1 min-w-0 min-h-0 overflow-auto">
          {children}
        </div>
        {sidebar}
      </div>

      {footer && <div className="flex-shrink-0">{footer}</div>}
    </div>
  );
};

export default DataPageLayout;
