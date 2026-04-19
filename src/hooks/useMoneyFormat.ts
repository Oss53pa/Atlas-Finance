/**
 * useMoneyFormat — Hook global pour formater les montants selon la préférence utilisateur.
 *
 * Utilisation :
 *   const fmt = useMoneyFormat();
 *   fmt(1234567890)  // mode full: "1 234 567 890" | mode compact: "1,23 Md"
 *
 * Pour les cas hors-React (services, utilitaires), utiliser `formatMoney()` directement.
 */
import { useMoneyFormatStore, type MoneyFormatMode } from '../stores/moneyFormatStore';

/**
 * Formate un nombre selon le mode choisi.
 * Mode 'full'    : 1 234 567 890
 * Mode 'compact' : 1,23 Md  (K = millier, M = million, Md = milliard)
 *
 * @param amount nombre à formater
 * @param mode   mode d'affichage
 * @param decimals décimales en mode full (défaut 0 pour FCFA)
 */
export function formatMoney(
  amount: number | null | undefined,
  mode: MoneyFormatMode = 'full',
  decimals: number = 0
): string {
  if (amount == null || Number.isNaN(amount)) return '—';

  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);

  if (mode === 'compact') {
    // 2 décimales pour les abréviations
    if (abs >= 1_000_000_000) {
      return `${sign}${formatNumber(abs / 1_000_000_000, 2)} Md`;
    }
    if (abs >= 1_000_000) {
      return `${sign}${formatNumber(abs / 1_000_000, 2)} M`;
    }
    if (abs >= 1_000) {
      return `${sign}${formatNumber(abs / 1_000, 2)} K`;
    }
    // < 1000 : on affiche le nombre entier
    return `${sign}${formatNumber(abs, 0)}`;
  }

  // Mode 'full'
  return `${sign}${formatNumber(abs, decimals)}`;
}

/**
 * Formate un nombre avec séparateur d'espace pour les milliers et virgule décimale.
 * Convention FR/FCFA. Espace insécable utilisé pour éviter les césures.
 */
function formatNumber(value: number, decimals: number): string {
  const rounded = value.toFixed(decimals);
  const [intPart, decPart] = rounded.split('.');
  // Séparateur milliers : espace insécable (\u00A0) — pas de césure à l'affichage
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return decPart ? `${withThousands},${decPart}` : withThousands;
}

/**
 * Hook React : retourne une fonction de formatage qui respecte le mode choisi.
 */
export function useMoneyFormat(): (amount: number | null | undefined, decimals?: number) => string {
  const mode = useMoneyFormatStore((s) => s.mode);
  return (amount, decimals) => formatMoney(amount, mode, decimals);
}

/**
 * Hook React : retourne le mode courant + setter, pour les composants de contrôle.
 */
export function useMoneyFormatMode(): {
  mode: MoneyFormatMode;
  setMode: (m: MoneyFormatMode) => void;
  toggle: () => void;
} {
  const mode = useMoneyFormatStore((s) => s.mode);
  const setMode = useMoneyFormatStore((s) => s.setMode);
  const toggle = useMoneyFormatStore((s) => s.toggle);
  return { mode, setMode, toggle };
}

/**
 * Hook React : retourne une fonction de formatage de devise qui respecte le mode choisi.
 * Remplacement du helper externe `formatCurrency(amount, currency)` par un hook
 * qui réagit au toggle Entier / K-M.
 *
 * Exemple :
 *   const fmtCur = useFormattedCurrency();
 *   fmtCur(1234567890)          // mode full: "1 234 567 890 FCFA" | compact: "1,23 Md FCFA"
 *   fmtCur(1234567890, 'EUR')   // devise explicite
 */
export function useFormattedCurrency(): (amount: number | null | undefined, currency?: string) => string {
  const fmt = useMoneyFormat();
  return (amount, currency = 'FCFA') => {
    if (amount == null || Number.isNaN(amount)) return '—';
    const suffix = currency === 'XOF' || currency === 'XAF' ? 'FCFA' : currency;
    return `${fmt(amount)} ${suffix}`;
  };
}
