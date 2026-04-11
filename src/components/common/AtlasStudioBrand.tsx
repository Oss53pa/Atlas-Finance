/**
 * AtlasStudioBrand — Composant réutilisable pour le branding "Atlas Studio".
 * Cliquer dessus redirige vers le site principal Atlas Studio.
 *
 * URL cible configurable via VITE_ATLAS_STUDIO_URL (défaut: https://www.atlasstudio.org)
 */
import React from 'react';

export const ATLAS_STUDIO_URL =
  (import.meta.env.VITE_ATLAS_STUDIO_URL as string) || 'https://www.atlas-studio.org';

interface AtlasStudioBrandProps {
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
  /** Ouvrir dans un nouvel onglet (défaut: false — même onglet pour contourner popup blockers) */
  newTab?: boolean;
}

export const AtlasStudioBrand: React.FC<AtlasStudioBrandProps> = ({
  className = 'atlas-brand',
  style,
  children = 'Atlas Studio',
  newTab = false,
}) => {
  return (
    <a
      href={ATLAS_STUDIO_URL}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      style={style}
      title="Accéder au site principal Atlas Studio"
      aria-label="Atlas Studio — site principal"
    >
      {children}
    </a>
  );
};

export default AtlasStudioBrand;
