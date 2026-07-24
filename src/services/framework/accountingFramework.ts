/**
 * Référentiel comptable de l'entité (SYSCOHADA / SYCEBNL, Normal / SMT).
 *
 * OHADA distingue deux référentiels et deux systèmes :
 *   - SYSCOHADA révisé : entités à but LUCRATIF (commerciales).
 *   - SYCEBNL (2023)    : entités à but NON LUCRATIF (associations, ONG,
 *                         fondations, projets sur financement bailleur).
 * et pour les très petites entités des deux mondes :
 *   - Système Normal (SN)                : comptabilité d'engagement (accrual).
 *   - Système Minimal de Trésorerie (SMT): comptabilité de TRÉSORERIE (cash).
 *
 * Ce module déclare les 4 combinaisons et résout celle du tenant (paramètre
 * `accounting_framework` dans settings). Il pilote le vocabulaire (résultat vs
 * excédent/déficit), la base (engagement vs trésorerie) et le jeu d'états.
 */

import type { DataAdapter } from '@atlas/data';

export type AccountingFramework =
  | 'SYSCOHADA_SN'   // commercial, engagement
  | 'SYSCOHADA_SMT'  // commercial, trésorerie (micro-entreprise)
  | 'SYCEBNL_SN'     // à but non lucratif, engagement
  | 'SYCEBNL_SMT';   // à but non lucratif, trésorerie (petite association)

export type AccountingBasis = 'accrual' | 'cash';
export type EntityPurpose = 'lucratif' | 'non_lucratif';

export interface FrameworkMeta {
  code: AccountingFramework;
  label: string;
  referentiel: 'SYSCOHADA' | 'SYCEBNL';
  systeme: 'SN' | 'SMT';
  basis: AccountingBasis;
  purpose: EntityPurpose;
  /** Libellé du solde de gestion (résultat vs excédent/déficit). */
  resultLabel: string;
  /** Positif = « bénéfice / excédent », négatif = « perte / déficit ». */
  resultPositiveLabel: string;
  resultNegativeLabel: string;
  /** États produits par ce cadre. */
  statements: string[];
}

export const FRAMEWORKS: Record<AccountingFramework, FrameworkMeta> = {
  SYSCOHADA_SN: {
    code: 'SYSCOHADA_SN',
    label: 'SYSCOHADA révisé — Système Normal',
    referentiel: 'SYSCOHADA', systeme: 'SN', basis: 'accrual', purpose: 'lucratif',
    resultLabel: 'Résultat net', resultPositiveLabel: 'Bénéfice', resultNegativeLabel: 'Perte',
    statements: ['Bilan', 'Compte de résultat', 'TAFIRE', 'Notes annexes'],
  },
  SYSCOHADA_SMT: {
    code: 'SYSCOHADA_SMT',
    label: 'SYSCOHADA — Système Minimal de Trésorerie',
    referentiel: 'SYSCOHADA', systeme: 'SMT', basis: 'cash', purpose: 'lucratif',
    resultLabel: 'Excédent/insuffisance de trésorerie',
    resultPositiveLabel: 'Excédent', resultNegativeLabel: 'Insuffisance',
    statements: ['État des recettes et des dépenses', 'Situation de trésorerie'],
  },
  SYCEBNL_SN: {
    code: 'SYCEBNL_SN',
    label: 'SYCEBNL — Système Normal (entité à but non lucratif)',
    referentiel: 'SYCEBNL', systeme: 'SN', basis: 'accrual', purpose: 'non_lucratif',
    resultLabel: 'Résultat de l’exercice (excédent/déficit)',
    resultPositiveLabel: 'Excédent', resultNegativeLabel: 'Déficit',
    statements: ['Bilan', 'Compte de résultat (ressources/emplois)', 'Notes annexes'],
  },
  SYCEBNL_SMT: {
    code: 'SYCEBNL_SMT',
    label: 'SYCEBNL — Système Minimal de Trésorerie (petite association)',
    referentiel: 'SYCEBNL', systeme: 'SMT', basis: 'cash', purpose: 'non_lucratif',
    resultLabel: 'Excédent/insuffisance de trésorerie',
    resultPositiveLabel: 'Excédent', resultNegativeLabel: 'Insuffisance',
    statements: ['État des recettes et des dépenses', 'Situation de trésorerie'],
  },
};

export const DEFAULT_FRAMEWORK: AccountingFramework = 'SYSCOHADA_SN';

const SETTINGS_KEY = 'accounting_framework';

export function isValidFramework(v: unknown): v is AccountingFramework {
  return typeof v === 'string' && v in FRAMEWORKS;
}

export function frameworkMeta(code: AccountingFramework): FrameworkMeta {
  return FRAMEWORKS[code] ?? FRAMEWORKS[DEFAULT_FRAMEWORK];
}

export const isCashBasis = (code: AccountingFramework): boolean =>
  frameworkMeta(code).basis === 'cash';
export const isNonProfit = (code: AccountingFramework): boolean =>
  frameworkMeta(code).purpose === 'non_lucratif';

/** Résout le référentiel du tenant (défaut SYSCOHADA_SN). */
export async function resolveFramework(adapter: DataAdapter): Promise<AccountingFramework> {
  try {
    const row = await adapter.getById<{ value?: string }>('settings', SETTINGS_KEY);
    const raw = row?.value;
    if (isValidFramework(raw)) return raw;
    // La valeur peut être stockée en JSON ({"value":"..."}).
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (isValidFramework(parsed)) return parsed;
        if (isValidFramework(parsed?.value)) return parsed.value;
      } catch { /* pas du JSON */ }
    }
  } catch { /* settings absent → défaut */ }
  return DEFAULT_FRAMEWORK;
}

/** Enregistre le référentiel du tenant. */
export async function setFramework(adapter: DataAdapter, code: AccountingFramework): Promise<void> {
  if (!isValidFramework(code)) throw new Error(`Référentiel inconnu : ${code}`);
  const now = new Date().toISOString();
  const existing = await adapter.getById('settings', SETTINGS_KEY).catch(() => null);
  if (existing) {
    await adapter.update('settings', SETTINGS_KEY, { key: SETTINGS_KEY, value: code, updatedAt: now } as any);
  } else {
    await adapter.create('settings', { key: SETTINGS_KEY, value: code, updatedAt: now } as any);
  }
}

/** Formate un solde de gestion selon le vocabulaire du cadre. */
export function formatResult(code: AccountingFramework, amount: number): { label: string; amount: number } {
  const m = frameworkMeta(code);
  return {
    label: amount >= 0 ? m.resultPositiveLabel : m.resultNegativeLabel,
    amount: Math.abs(amount),
  };
}
