// @ts-nocheck

/**
 * taxRegistrySeeds — Données de référence fiscales pour la Côte d'Ivoire (CI).
 * Contient les 15 taxes SYSCOHADA + barèmes IRPP progressifs.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBTaxRegistry, DBTaxBracket } from '../../lib/db';

// ============================================================================
// SEED: Registre des taxes CI
// ============================================================================

const CI_TAX_REGISTRY: Partial<DBTaxRegistry>[] = [
  {
    id: 'ci-tva',
    taxCode: 'TVA',
    label: 'Taxe sur la Valeur Ajoutée',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'COLLECTED_MINUS_DEDUCTIBLE',
    ratePct: 18,
    triggerAccounts: ['4431*', '4432*', '4433*', '44551*', '44552*', '44553*'],
    collectedAccounts: ['4431', '4432', '4433'],
    deductibleAccounts: ['44551', '44552', '44553'],
    payableAccounts: ['4441'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-is',
    taxCode: 'IS',
    label: 'Impôt sur les Sociétés',
    countryCode: 'CI',
    periodicity: 'ANNUAL',
    formula: 'MAX_CALCULATED_MINIMUM',
    ratePct: 25,
    ratePctMinimum: 0.5,
    minimumAmount: 3000000,
    triggerAccounts: ['7*', '6*'],
    baseAccounts: ['7', '6'],
    payableAccounts: ['441'],
    declarationDeadlineDays: 120,
    isActive: true,
  },
  {
    id: 'ci-is-acompte',
    taxCode: 'IS_ACOMPTE',
    label: 'Acompte IS trimestriel',
    countryCode: 'CI',
    periodicity: 'QUARTERLY',
    formula: 'RATE_ON_BASE',
    ratePct: 25,
    triggerAccounts: ['441*'],
    baseAccounts: ['441'],
    payableAccounts: ['441'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-irpp-salaires',
    taxCode: 'IRPP_SALAIRES',
    label: 'Impôt sur le Revenu des Personnes Physiques — Salaires',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'PROGRESSIVE_BRACKET',
    triggerAccounts: ['661*', '662*'],
    baseAccounts: ['661', '662'],
    payableAccounts: ['4472'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-cnps-patron',
    taxCode: 'CNPS_PATRON',
    label: 'CNPS — Part patronale',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'FIXED_ON_PAYROLL',
    ratePct: 14.75,
    triggerAccounts: ['431*', '432*'],
    baseAccounts: ['661'],
    payableAccounts: ['431', '432'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-cnps-salarie',
    taxCode: 'CNPS_SALARIE',
    label: 'CNPS — Part salariale',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'FIXED_ON_PAYROLL',
    ratePct: 6.3,
    triggerAccounts: ['431*', '432*'],
    baseAccounts: ['661'],
    payableAccounts: ['431', '432'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-cmu',
    taxCode: 'CMU',
    label: 'Couverture Maladie Universelle',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'FIXED_ON_PAYROLL',
    ratePct: 1,
    triggerAccounts: ['661*'],
    baseAccounts: ['661'],
    payableAccounts: ['4473'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-patente',
    taxCode: 'PATENTE',
    label: 'Contribution des patentes',
    countryCode: 'CI',
    periodicity: 'ANNUAL',
    formula: 'MANUAL',
    triggerAccounts: ['635*'],
    requiresManualInput: true,
    payableAccounts: ['447'],
    declarationDeadlineDays: 90,
    isActive: true,
  },
  {
    id: 'ci-tf',
    taxCode: 'TF',
    label: 'Taxe foncière',
    countryCode: 'CI',
    periodicity: 'ANNUAL',
    formula: 'MANUAL',
    triggerAccounts: ['635*'],
    requiresManualInput: true,
    payableAccounts: ['447'],
    declarationDeadlineDays: 90,
    isActive: true,
  },
  {
    id: 'ci-ras-loyer',
    taxCode: 'RAS_LOYER',
    label: 'Retenue à la source — Loyers',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'RETENUE_SOURCE',
    ratePct: 15,
    triggerAccounts: ['621*', '622*'],
    baseAccounts: ['621', '622'],
    payableAccounts: ['4474'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-ras-honoraires',
    taxCode: 'RAS_HONORAIRES',
    label: 'Retenue à la source — Honoraires',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'RETENUE_SOURCE',
    ratePct: 20,
    triggerAccounts: ['6234*', '6235*'],
    baseAccounts: ['6234', '6235'],
    payableAccounts: ['4475'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-ras-dividendes',
    taxCode: 'RAS_DIVIDENDES',
    label: 'IRVM — Retenue sur dividendes',
    countryCode: 'CI',
    periodicity: 'PUNCTUAL',
    formula: 'RETENUE_SOURCE',
    ratePct: 15,
    triggerAccounts: ['465*'],
    baseAccounts: ['465'],
    payableAccounts: ['4476'],
    declarationDeadlineDays: 30,
    isActive: true,
  },
  {
    id: 'ci-airsi',
    taxCode: 'AIRSI',
    label: 'Acompte IS sur importations',
    countryCode: 'CI',
    periodicity: 'MONTHLY',
    formula: 'RETENUE_SOURCE',
    ratePct: 5,
    triggerAccounts: ['607*', '601*'],
    baseAccounts: ['607', '601'],
    payableAccounts: ['441'],
    declarationDeadlineDays: 15,
    isActive: true,
  },
  {
    id: 'ci-ta',
    taxCode: 'TA',
    label: "Taxe d'apprentissage",
    countryCode: 'CI',
    periodicity: 'ANNUAL',
    formula: 'FIXED_ON_PAYROLL',
    ratePct: 0.6,
    triggerAccounts: ['661*'],
    baseAccounts: ['661'],
    payableAccounts: ['447'],
    declarationDeadlineDays: 90,
    isActive: true,
  },
  {
    id: 'ci-fpc',
    taxCode: 'FPC',
    label: 'Formation Professionnelle Continue',
    countryCode: 'CI',
    periodicity: 'ANNUAL',
    formula: 'FIXED_ON_PAYROLL',
    ratePct: 1.2,
    triggerAccounts: ['661*'],
    baseAccounts: ['661'],
    payableAccounts: ['447'],
    declarationDeadlineDays: 90,
    isActive: true,
  },
];

// ============================================================================
// SEED: Barèmes IRPP progressifs CI
// ============================================================================

const CI_IRPP_BRACKETS: Omit<DBTaxBracket, 'id'>[] = [
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 1, fromAmount: 0,        toAmount: 300000,    ratePct: 0  },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 2, fromAmount: 300001,   toAmount: 547000,    ratePct: 10 },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 3, fromAmount: 547001,   toAmount: 979000,    ratePct: 15 },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 4, fromAmount: 979001,   toAmount: 1519000,   ratePct: 20 },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 5, fromAmount: 1519001,  toAmount: 2644000,   ratePct: 25 },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 6, fromAmount: 2644001,  toAmount: 4669000,   ratePct: 35 },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 7, fromAmount: 4669001,  toAmount: 10106000,  ratePct: 45 },
  { taxRegistryId: 'ci-irpp-salaires', bracketOrder: 8, fromAmount: 10106001, toAmount: null,      ratePct: 60 },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Seed the CI tax registry if not already populated.
 * Checks count first to avoid duplicates on re-run.
 */
export async function seedTaxRegistryCI(adapter: DataAdapter): Promise<void> {
  const existing = await adapter.getAll<DBTaxRegistry>('taxRegistry');
  if (existing.length > 0) return;

  const now = new Date().toISOString();

  for (const tax of CI_TAX_REGISTRY) {
    await adapter.create('taxRegistry', {
      ...tax,
      createdAt: now,
      updatedAt: now,
    } as DBTaxRegistry);
  }
}

/**
 * Seed the IRPP progressive brackets for CI.
 * Checks count first to avoid duplicates on re-run.
 */
export async function seedIRPPBracketsCI(adapter: DataAdapter): Promise<void> {
  const existing = await adapter.getAll<DBTaxBracket>('taxBrackets');
  if (existing.length > 0) return;

  for (const bracket of CI_IRPP_BRACKETS) {
    await adapter.create('taxBrackets', {
      ...bracket,
      id: crypto.randomUUID(),
    } as DBTaxBracket);
  }
}
