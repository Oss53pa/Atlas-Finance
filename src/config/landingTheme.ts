/**
 * Landing Page Theme Configuration
 * Mode nuit (dark) ou jour (light), configurable depuis la console admin Atlas Studio.
 * Persisté dans localStorage pour un accès rapide côté client.
 */

export type LandingThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'atlas-landing-theme';

/** Palette dark — Petrol Night (accent ambre, cohérent avec l'app en mode sombre) */
export const DARK = {
  bg: '#0C2530',
  bgAlt: '#13323D',
  surface: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(232,154,46,0.45)',
  text: '#F7F5EF',
  textSecondary: 'rgba(247,245,239,0.55)',
  textTertiary: 'rgba(247,245,239,0.32)',
  textMuted: 'rgba(247,245,239,0.20)',
  // "gold" = accent — ambre en mode sombre
  gold: '#E89A2E',
  goldLight: '#F2A93B',
  goldDark: '#C77E2C',
  goldBg: 'rgba(232,154,46,0.12)',
  goldBorder: 'rgba(232,154,46,0.24)',
  check: '#34d399',
  navBg: 'rgba(12,37,48,0.92)',
} as const;

/** Palette light — Petrol Cream (pétrole brand + crème) */
export const LIGHT = {
  bg: '#F7F5EF',
  bgAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceHover: '#FAF8F2',
  border: '#E8E3D6',
  borderHover: '#235A6E',
  text: '#261E15',
  textSecondary: '#5C5347',
  textTertiary: '#8A8170',
  textMuted: '#B0A893',
  // "gold" = accent — pétrole (brand) en mode clair
  gold: '#235A6E',
  goldLight: '#2C6E86',
  goldDark: '#1B4856',
  goldBg: 'rgba(35,90,110,0.10)',
  goldBorder: 'rgba(35,90,110,0.26)',
  check: '#15803D',
  navBg: 'rgba(247,245,239,0.92)',
} as const;

export function getLandingTheme(): LandingThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (err) { /* silent */}
  return 'light'; // default — Obsidian & Champagne (fond crème)
}

export function setLandingTheme(mode: LandingThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (err) { /* silent */}
}

export function getThemePalette(mode: LandingThemeMode) {
  return mode === 'dark' ? DARK : LIGHT;
}

/**
 * Écrit les variables CSS `--landing-*` sur :root pour que les pages landing
 * puissent consommer les couleurs via `var(--landing-bg)` etc. en plus de
 * l'API inline existante (`c.bg`, `c.gold`, ...).
 * Retourne la palette appliquée pour que l'appelant puisse aussi l'utiliser.
 */
export function applyLandingThemeToCSS(mode: LandingThemeMode) {
  const palette = getThemePalette(mode);
  if (typeof document === 'undefined') return palette;
  const root = document.documentElement;
  const entries: Array<[string, string]> = [
    ['--landing-bg', palette.bg],
    ['--landing-bg-alt', palette.bgAlt],
    ['--landing-surface', palette.surface],
    ['--landing-surface-hover', palette.surfaceHover],
    ['--landing-border', palette.border],
    ['--landing-border-hover', palette.borderHover],
    ['--landing-text', palette.text],
    ['--landing-text-secondary', palette.textSecondary],
    ['--landing-text-tertiary', palette.textTertiary],
    ['--landing-text-muted', palette.textMuted],
    ['--landing-gold', palette.gold],
    ['--landing-gold-light', palette.goldLight],
    ['--landing-gold-dark', palette.goldDark],
    ['--landing-gold-bg', palette.goldBg],
    ['--landing-gold-border', palette.goldBorder],
    ['--landing-check', palette.check],
    ['--landing-nav-bg', palette.navBg],
  ];
  entries.forEach(([name, value]) => root.style.setProperty(name, value));
  return palette;
}

/**
 * Synchronise la palette landing (mode dark/light) avec le thème principal
 * de l'application. Les thèmes sombres (midnightDark) mappent en mode dark,
 * tous les autres en mode light. Permet de rester cohérent entre l'app et
 * les pages marketing.
 */
export function syncLandingWithAppTheme(appThemeKey: string): LandingThemeMode {
  const mode: LandingThemeMode = appThemeKey === 'midnightDark' ? 'dark' : 'light';
  setLandingTheme(mode);
  applyLandingThemeToCSS(mode);
  return mode;
}
