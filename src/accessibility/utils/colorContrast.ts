/**
 * Color Contrast Utilities
 * WCAG 2.1 color contrast ratio calculations
 */

/**
 * Parses a hex color string (#RGB or #RRGGBB) into [r, g, b] values (0-255).
 */
function parseHexColor(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const expanded =
    cleaned.length === 3
      ? cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2]
      : cleaned;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Computes the relative luminance of an sRGB color per WCAG 2.1.
 */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Returns the WCAG contrast ratio between two hex colors.
 * The ratio ranges from 1 (identical) to 21 (black vs white).
 */
export function getContrastRatio(fg: string, bg: string): number {
  const [r1, g1, b1] = parseHexColor(fg);
  const [r2, g2, b2] = parseHexColor(bg);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
