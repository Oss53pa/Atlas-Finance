/**
 * Service de comptabilisation automatique.
 * Pont entre les calculs métier (amortissements, provisions, etc.)
 * et les écritures comptables dans Dexie (journalEntries).
 *
 * Conforme SYSCOHADA révisé.
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../lib/db';
import type { DBJournalLine, DBAsset, DBJournalEntry, DBFiscalYear } from '../lib/db';
import { money } from '../utils/money';
import { safeAddEntry } from './entryGuard';
import { DepreciationService } from '../utils/depreciationService';
import type { Immobilisation } from '../utils/depreciationService';
import { getCoeffDegressif } from '@atlas/core';

// ============================================================================
// TYPES
// ============================================================================

export interface PostingResult {
  success: boolean;
  entryId?: string;
  errors: string[];
}

export interface DepreciationPostingResult {
  success: boolean;
  entries: PostingResult[];
  totalAmount: number;
  assetsProcessed: number;
  errors: string[];
}

// ============================================================================
// HELPERS
// ============================================================================



/** Generate a unique entry number. */
function generateEntryNumber(prefix: string, date: string, index: number): string {
  const datePart = date.replace(/-/g, '').substring(0, 8);
  return `${prefix}-${datePart}-${String(index).padStart(3, '0')}`;
}

/** Map a DBAsset to the Immobilisation interface used by DepreciationService. */
function assetToImmobilisation(asset: DBAsset): Immobilisation {
  const comptesDotation = DepreciationService.getComptesDotationParClasse();
  const comptesAmort = DepreciationService.getComptesAmortissementParClasse();

  // Find the matching dotation/amortissement account by prefix
  const prefix2 = asset.accountCode.substring(0, 2);
  const prefix3 = asset.accountCode.substring(0, 3);

  return {
    id: asset.id,
    code: asset.code,
    libelle: asset.name,
    compteImmobilisation: asset.accountCode,
    compteAmortissement: asset.depreciationAccountCode || comptesAmort[prefix3] || comptesAmort[prefix2] || '28',
    compteDotation: comptesDotation[prefix3] || comptesDotation[prefix2] || '681',
    dateAcquisition: asset.acquisitionDate,
    valeurAcquisition: asset.acquisitionValue,
    dureeAmortissement: asset.usefulLifeYears,
    tauxAmortissement: asset.depreciationMethod === 'declining'
      // F-19 : coefficients SYSCOHADA par tranche de durée (≤3→1.5, 4-5→2.0, 6-10→2.5, >10→3.0)
      ? (100 / asset.usefulLifeYears) * getCoeffDegressif(asset.usefulLifeYears)
      : 100 / asset.usefulLifeYears,
    modeAmortissement: asset.depreciationMethod === 'declining' ? 'degressif' : 'lineaire',
    valeurResiduelle: asset.residualValue,
    amortissementsCumules: 0, // Will be calculated from existing entries
  };
}

// ============================================================================
// DEPRECIATION POSTING
// ============================================================================

/**
 * Calculate cumulated depreciation for an asset from existing journal entries.
 */
async function getCumulatedDepreciation(adapter: DataAdapter, assetKey: string): Promise<number> {
  const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries', { where: { journal: 'OD' } });
  // La référence des dotations contient la clé de l'actif (AMORT-{periode}-{clé}).
  // On filtre par RÉFÉRENCE (le libellé contient le nom, pas la clé).
  const entries = allEntries.filter(e => e.reference?.startsWith('AMORT-') && e.reference?.includes(assetKey));

  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      // Net des 28x : dotations (crédit) − contrepassations/reprises (débit).
      if (line.accountCode.startsWith('28')) {
        total += (line.credit || 0) - (line.debit || 0);
      }
    }
  }
  return Math.max(0, total);
}

/**
 * Check if depreciation entry already exists for an asset/period.
 */
async function hasDepreciationEntry(adapter: DataAdapter, assetCode: string, periode: string): Promise<boolean> {
  const ref = `AMORT-${periode}-${assetCode}`;
  const allEntries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const existing = allEntries.find(e => e.reference === ref);
  return !!existing;
}

/**
 * Post depreciation entries for all active assets for a given period.
 *
 * @param periode Format "YYYY-MM" (e.g. "2025-01")
 * @param dryRun If true, return what would be posted without saving
 */
export async function posterAmortissements(
  adapter: DataAdapter,
  periode: string,
  dryRun = false
): Promise<DepreciationPostingResult> {
  const errors: string[] = [];
  const results: PostingResult[] = [];
  let totalAmount = 0;
  let assetsProcessed = 0;

  // Load active assets
  const assets = await adapter.getAll<DBAsset>('assets', { where: { status: 'active' } });

  if (assets.length === 0) {
    return { success: true, entries: [], totalAmount: 0, assetsProcessed: 0, errors: ['Aucune immobilisation active'] };
  }

  let entryIndex = 1;

  for (const asset of assets) {
    // Skip if already posted for this period (idempotence, par id d'actif)
    if (await hasDepreciationEntry(adapter, asset.id, periode)) {
      continue;
    }

    // Cumul réel = champ stocké sur la fiche (source unique, tenue à jour par
    // le module Amortissements et la cession). getCumulatedDepreciation reste
    // disponible en secours (reconstruction depuis les écritures AMORT-*).
    const immo = assetToImmobilisation(asset);
    immo.amortissementsCumules = Number((asset as any).cumulDepreciation)
      || await getCumulatedDepreciation(adapter, asset.id);

    // Check if asset should still be depreciated
    if (!DepreciationService.doitEtreAmorti(immo, periode)) {
      continue;
    }

    // Generate the depreciation entry
    const ecriture = DepreciationService.genererEcritureAmortissement(immo, periode, '');

    // Validate
    const validation = DepreciationService.validerAmortissementConforme(ecriture, immo);
    if (!validation.valide) {
      errors.push(`${asset.code} (${asset.name}): ${validation.erreurs.join(', ')}`);
      results.push({ success: false, errors: validation.erreurs });
      continue;
    }

    if (dryRun) {
      results.push({ success: true, errors: [] });
      totalAmount += ecriture.montant;
      assetsProcessed++;
      continue;
    }

    // Build DBJournalEntry
    const entryId = crypto.randomUUID();
    const now = new Date().toISOString();

    const lines: DBJournalLine[] = ecriture.lignes.map(l => ({
      id: crypto.randomUUID(),
      accountCode: l.compte,
      accountName: l.libelle,
      label: l.libelle,
      debit: l.debit,
      credit: l.credit,
    }));

    await safeAddEntry(adapter, {
      id: entryId,
      entryNumber: generateEntryNumber('AMORT', ecriture.date, entryIndex++),
      journal: 'OD',
      date: ecriture.date,
      reference: `AMORT-${periode}-${asset.id}`,
      label: ecriture.libelle,
      status: 'validated', // dotation effective (visible bilan/compte de résultat)
      lines,
      createdAt: now,
      createdBy: 'system',
    }, { skipSyncValidation: true });

    // Synchronise le cumul stocké sur la fiche (source unique registre ↔ compta).
    await adapter.update('assets', asset.id, {
      cumulDepreciation: (Number((asset as any).cumulDepreciation) || 0) + ecriture.montant,
    });

    await logAudit(
      'DEPRECIATION_POSTING',
      'journalEntry',
      entryId,
      `Amortissement ${asset.code} - ${asset.name} période ${periode}: ${money(ecriture.montant).toString()} FCFA`
    );

    results.push({ success: true, entryId, errors: [] });
    totalAmount += ecriture.montant;
    assetsProcessed++;
  }

  return {
    success: errors.length === 0,
    entries: results,
    totalAmount,
    assetsProcessed,
    errors,
  };
}

/**
 * Post depreciation entries for a full fiscal year (12 months).
 */
export async function posterAmortissementsAnnuels(
  adapter: DataAdapter,
  exerciceId: string
): Promise<DepreciationPostingResult> {
  const fiscalYear = await adapter.getById<DBFiscalYear>('fiscalYears', exerciceId);
  if (!fiscalYear) {
    return { success: false, entries: [], totalAmount: 0, assetsProcessed: 0, errors: [`Exercice ${exerciceId} introuvable`] };
  }

  const start = new Date(fiscalYear.startDate);
  const end = new Date(fiscalYear.endDate);
  const allResults: PostingResult[] = [];
  const allErrors: string[] = [];
  let totalAmount = 0;
  let assetsProcessed = 0;

  const current = new Date(start);
  while (current <= end) {
    const periode = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    const result = await posterAmortissements(adapter, periode);

    allResults.push(...result.entries);
    allErrors.push(...result.errors);
    totalAmount += result.totalAmount;
    assetsProcessed += result.assetsProcessed;

    current.setMonth(current.getMonth() + 1);
  }

  return {
    success: allErrors.length === 0,
    entries: allResults,
    totalAmount,
    assetsProcessed,
    errors: allErrors,
  };
}
