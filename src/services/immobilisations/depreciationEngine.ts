/**
 * Moteur d'amortissement SYSCOHADA — SOURCE UNIQUE partagée par la page
 * Amortissements, les cessions et la clôture.
 *
 * Gère :
 *  - linéaire (base amortissable = brut − valeur résiduelle) ;
 *  - dégressif (taux = coefficient SYSCOHADA / durée, sur VNC) avec bascule
 *    automatique en linéaire quand le taux linéaire sur la durée restante
 *    devient plus favorable, et plafonnement pour ne jamais sur-amortir ;
 *  - prorata temporis en année commerciale 360 jours (12 × 30) ;
 *  - cumul théorique à une date quelconque (utile pour la dotation
 *    complémentaire jusqu'à la date de cession).
 *
 * Invariant : le cumul ne dépasse JAMAIS la base amortissable (brut − résiduel).
 */
import { Money } from '@/utils/money';

export interface DepreciableAsset {
  acquisitionValue: number;
  residualValue?: number;
  usefulLifeYears: number;
  depreciationMethod?: string; // 'linear' | 'declining' | ...
  acquisitionDate: string;     // ISO
  cumulDepreciation?: number;
}

/** Coefficient dégressif SYSCOHADA selon la durée d'utilité. */
export function syscohadaDegressiveCoefficient(usefulLifeYears: number): number {
  if (usefulLifeYears <= 4) return 1.5;
  if (usefulLifeYears <= 6) return 2.0;
  return 2.5;
}

/** Années écoulées entre deux dates en base commerciale 360 jours. */
export function yearsElapsed360(fromISO: string, toISO: string): number {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const moisDebut = a.getFullYear() * 12 + a.getMonth();
  const moisFin = b.getFullYear() * 12 + b.getMonth();
  const joursDebut = Math.min(a.getDate(), 30);
  const joursFin = Math.min(b.getDate(), 30);
  const totalJours = (moisFin - moisDebut) * 30 + (joursFin - joursDebut);
  return Math.max(0, totalJours) / 360;
}

/**
 * Plan d'amortissement annuel (dotation par année pleine), méthode-aware,
 * avec bascule dégressif→linéaire et dernière annuité soldant la base.
 */
export function annualDotations(asset: DepreciableAsset): number[] {
  const N = asset.usefulLifeYears;
  const residual = asset.residualValue ?? 0;
  const base = new Money(asset.acquisitionValue).subtract(new Money(residual)).toNumber();
  const rows: number[] = [];
  if (N <= 0 || base <= 0) return rows;

  if (asset.depreciationMethod === 'declining') {
    const rate = syscohadaDegressiveCoefficient(N) / N;
    let vnc = asset.acquisitionValue; // le dégressif s'applique à la VNC
    let cumul = 0;
    const maxYears = Math.ceil(N);
    for (let y = 1; y <= maxYears; y++) {
      const remaining = N - (y - 1);
      const linRateRemaining = remaining > 0 ? 1 / remaining : 1;
      // Bascule en linéaire dès que le linéaire sur durée restante ≥ dégressif.
      let dot = linRateRemaining >= rate
        ? new Money(vnc - residual).divide(remaining).toNumber()
        : new Money(vnc).multiply(rate).toNumber();
      // Ne jamais dépasser la base amortissable.
      dot = Math.min(dot, base - cumul);
      if (dot < 0) dot = 0;
      rows.push(new Money(dot).round().toNumber());
      cumul += dot;
      vnc -= dot;
      if (cumul >= base - 0.005) break;
    }
  } else {
    const annu = new Money(base).divide(N).toNumber();
    let cumul = 0;
    const maxYears = Math.ceil(N);
    for (let y = 1; y <= maxYears; y++) {
      // Dernière annuité = solde résiduel (évite tout sur-amortissement).
      let dot = Math.min(annu, base - cumul);
      if (dot < 0) dot = 0;
      rows.push(new Money(dot).round().toNumber());
      cumul += dot;
      if (cumul >= base - 0.005) break;
    }
  }
  return rows;
}

/** Dotation d'une année pleine donnée (1-based). */
export function annualDotationForYear(asset: DepreciableAsset, year: number): number {
  const rows = annualDotations(asset);
  return rows[year - 1] ?? 0;
}

/**
 * Cumul d'amortissement THÉORIQUE à une date, prorata temporis 360 j,
 * plafonné à la base amortissable.
 */
export function accumulatedDepreciationAt(asset: DepreciableAsset, asOfISO: string): number {
  const N = asset.usefulLifeYears;
  const residual = asset.residualValue ?? 0;
  const base = new Money(asset.acquisitionValue).subtract(new Money(residual)).toNumber();
  if (N <= 0 || base <= 0) return 0;
  const rows = annualDotations(asset);
  const elapsed = Math.min(yearsElapsed360(asset.acquisitionDate, asOfISO), N);
  if (elapsed <= 0) return 0;
  const fullYears = Math.floor(elapsed);
  const frac = elapsed - fullYears;
  let acc = new Money(0);
  for (let i = 0; i < fullYears && i < rows.length; i++) acc = acc.add(new Money(rows[i]));
  if (frac > 0 && fullYears < rows.length) {
    acc = acc.add(new Money(rows[fullYears]).multiply(frac));
  }
  const capped = Math.min(acc.round().toNumber(), base);
  return capped;
}

/**
 * Dotation à comptabiliser pour un exercice (borne inférieure = max(début
 * exercice, acquisition)). Renvoie l'incrément d'amortissement théorique sur
 * la période. Utilisé par la page Amortissements et la clôture.
 */
export function depreciationForPeriod(
  asset: DepreciableAsset,
  periodStartISO: string,
  periodEndISO: string,
): number {
  const accStart = accumulatedDepreciationAt(asset, periodStartISO);
  const accEnd = accumulatedDepreciationAt(asset, periodEndISO);
  return Math.max(0, new Money(accEnd).subtract(new Money(accStart)).round().toNumber());
}

/**
 * Dotation complémentaire à passer lors d'une cession/sortie à `asOf` :
 * différence entre le cumul théorique à la date de sortie et le cumul déjà
 * comptabilisé (jamais négatif). Sert à obtenir une VNC juste au jour de sortie.
 */
export function complementaryDepreciationForDisposal(asset: DepreciableAsset, asOfISO: string): number {
  const theoretical = accumulatedDepreciationAt(asset, asOfISO);
  const stored = asset.cumulDepreciation ?? 0;
  return Math.max(0, new Money(theoretical).subtract(new Money(stored)).round().toNumber());
}

/** Compte de dotation (681x) déduit du compte d'immobilisation. */
export function dotationAccountFor(accountCode: string | undefined): string {
  const c = String(accountCode || '2');
  // 681 + classe de l'immobilisation (2e chiffre du compte 2x).
  const cls = c.length >= 2 ? c[1] : '1';
  return '681' + cls;
}

/** Compte d'amortissement (28x) déduit du compte d'immobilisation. */
export function amortAccountFor(accountCode: string | undefined, depreciationAccountCode?: string): string {
  if (depreciationAccountCode && String(depreciationAccountCode).trim()) return String(depreciationAccountCode);
  const c = String(accountCode || '2');
  return '28' + c.slice(1);
}
