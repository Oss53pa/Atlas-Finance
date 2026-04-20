/**
 * Landing Page Theme Configuration
 * Mode nuit (dark) ou jour (light), configurable depuis la console admin Atlas Studio.
 * Persisté dans localStorage pour un accès rapide côté client.
 */

export type LandingThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'atlas-landing-theme';

/** Palette dark — cohérente avec Atlas Studio */
export const DARK = {
  bg: '#0d0d0d',
  bgAlt: '#141414',
  surface: 'rgba(255,255,255,0.03)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  text: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.50)',
  textTertiary: 'rgba(255,255,255,0.30)',
  textMuted: 'rgba(255,255,255,0.20)',
  gold: '#c9a96e',
  goldLight: '#dbc396',
  goldDark: '#a88b4a',
  goldBg: 'rgba(201,169,110,0.10)',
  goldBorder: 'rgba(201,169,110,0.20)',
  check: '#34d399',
  navBg: 'rgba(13,13,13,0.90)',
} as const;

/** Palette light — propre et pro */
export const LIGHT = {
  bg: '#ffffff',
  bgAlt: '#f8f7f4',
  surface: '#ffffff',
  surfaceHover: '#f5f4f1',
  border: '#e8e5de',
  borderHover: '#d4d0c8',
  text: '#1a1a1a',
  textSecondary: '#5c5c5c',
  textTertiary: '#8c8c8c',
  textMuted: '#b5b5b5',
  gold: '#9a7d3e',
  goldLight: '#b8944f',
  goldDark: '#7d6430',
  goldBg: 'rgba(154,125,62,0.08)',
  goldBorder: 'rgba(154,125,62,0.20)',
  check: '#16a34a',
  navBg: 'rgba(255,255,255,0.92)',
} as const;

export function getLandingTheme(): LandingThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (err) { /* silent */}
  return 'dark'; // default
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
