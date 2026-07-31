/**
 * Palette & typographie « Atlas FnA » pour les charts ECharts.
 * ECharts rend sur <canvas> qui NE lit PAS les var(--color-*) CSS → couleurs en hex de marque.
 * (règle : jamais de var() dans une config ECharts/canvas, sinon rendu noir).
 */
export const ATLAS_SERIES = [
  '#235A6E', // pétrole
  '#E89A2E', // ambre
  '#15803D', // vert
  '#4E7E8D', // pétrole clair
  '#C77E2C', // ambre profond
  '#7FA3AF', // ardoise
  '#13323D', // pétrole profond
  '#B4532A', // rouille
];

export const ATLAS_INK = '#261E15';
export const ATLAS_INK2 = '#5C5347';
export const ATLAS_INK3 = '#8B8272';
export const ATLAS_SUCCESS = '#15803D';
export const ATLAS_ERROR = '#C0322B';
export const ATLAS_AMBER = '#E89A2E';
export const ATLAS_PETROL = '#235A6E';
export const ATLAS_HAIRLINE = '#F0EBE0';

export const FONT_SANS = 'Dosis, system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';
