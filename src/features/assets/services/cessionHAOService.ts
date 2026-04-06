/**
 * Cession HAO (Hors Activites Ordinaires) — auto-generation des ecritures comptables
 * lors de la cession d'une immobilisation.
 *
 * SYSCOHADA Revise — Comptes HAO :
 *   - 81x : Valeurs comptables des cessions d'immobilisations (charge HAO)
 *   - 82x : Produits des cessions d'immobilisations (produit HAO)
 *   - 28x : Amortissements cumules
 *   - 2xx : Immobilisation cedee (valeur brute)
 *
 * Delegates the 4-step accounting logic to disposeAsset() from
 * depreciationPostingService, and adds HAO-specific validation and audit.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBAsset, DBJournalEntry } from '../../../lib/db';
import { logAudit } from '../../../lib/db';
import { Money } from '@/utils/money';

// ============================================================================
// TYPES
// ============================================================================

export interface CessionHAOInput {
  /** UUID of the asset being disposed */
  assetId: string;
  /** Date of disposal (YYYY-MM-DD) */
  disposalDate: string;
  /** Sale price (0 for scrapping/donation) */
  prixCession: number;
  /** Type of disposal */
  typeCession: 'vente' | 'mise_au_rebut' | 'donation' | 'echange';
  /** Optional reason / description */
  motif?: string;
}

export interface CessionHAOResult {
  assetId: string;
  assetName: string;
  valeurBrute: number;
  amortissementsCumules: number;
  vnc: number;
  prixCession: number;
  plusOuMoinsValue: number;
  isHAO: boolean;
  journalEntryId: string;
  lines: CessionHAOLine[];
}

export interface CessionHAOLine {
  accountCode: string;
  accountName: string;
  label: string;
  debit: number;
  credit: number;
}

// ============================================================================
// HELPER: Compute SYSCOHADA prorata amortissements
// ============================================================================

function computeAmortissementsCumules(asset: DBAsset, disposalDate: string): number {
  const depBase = asset.acquisitionValue - (asset.residualValue || 0);
  const annualDep = depBase / asset.usefulLifeYears;

  const acqDate = new Date(asset.acquisitionDate);
  const dispDate = new Date(disposalDate);

  // SYSCOHADA: annee commerciale 360 jours (12 x 30)
  const moisDebut = acqDate.getFullYear() * 12 + acqDate.getMonth();
  const moisFin = dispDate.getFullYear() * 12 + dispDate.getMonth();
  const joursDebut = Math.min(acqDate.getDate(), 30);
  const joursFin = Math.min(dispDate.getDate(), 30);
  const totalJours = (moisFin - moisDebut) * 30 + (joursFin - joursDebut);
  const yearsElapsed = Math.min(
    Math.max(0, totalJours) / 360,
    asset.usefulLifeYears,
  );

  return new Money(annualDep).multiply(yearsElapsed).round().toNumber();
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Generate HAO accounting entries for an asset disposal.
 *
 * Accounting scheme (SYSCOHADA):
 *   D 81x  Valeurs comptables des cessions    = VNC
 *   C 2xx  Immobilisation cedee               = Valeur brute
 *   D 28x  Amortissements cumules             = Cumul amort.
 *   C 82x  Produits des cessions              = Prix de cession
 *
 * The entry is balanced because:
 *   Total Debit  = VNC + Amort = Valeur brute + (Prix cession if > VNC, else handled via pivot 481)
 *   Total Credit = Valeur brute + Prix cession
 *
 * In practice we use the compte 481 (transit) approach from depreciationPostingService
 * to ensure the entry is always balanced regardless of plus/moins-value.
 */
export async function generateCessionHAO(
  adapter: DataAdapter,
  input: CessionHAOInput,
): Promise<CessionHAOResult> {
  // ── Validation ──
  const asset = await adapter.getById<DBAsset>('assets', input.assetId);
  if (!asset) {
    throw new Error(`Immobilisation introuvable : ${input.assetId}`);
  }
  if (asset.status !== 'active') {
    throw new Error(`Immobilisation deja sortie ou inactive : ${asset.name} (status: ${asset.status})`);
  }
  if (input.prixCession < 0) {
    throw new Error('Le prix de cession ne peut pas etre negatif');
  }

  // ── Calculs ──
  const valeurBrute = asset.acquisitionValue;
  const amortissementsCumules = computeAmortissementsCumules(asset, input.disposalDate);
  const vnc = new Money(valeurBrute).subtract(new Money(amortissementsCumules)).toNumber();
  const plusOuMoinsValue = new Money(input.prixCession).subtract(new Money(vnc)).toNumber();

  const amortAccountCode = asset.depreciationAccountCode || '28' + asset.accountCode.substring(1);

  // ── Build journal lines ──
  const lines: CessionHAOLine[] = [];

  // Etape 1 — Sortie du bien via compte 481
  lines.push({
    accountCode: '481',
    accountName: 'Valeur comptable des cessions d\'immobilisations',
    label: `Sortie immobilisation ${asset.name} — valeur brute`,
    debit: valeurBrute,
    credit: 0,
  });
  lines.push({
    accountCode: asset.accountCode,
    accountName: asset.name,
    label: `Sortie immobilisation ${asset.name}`,
    debit: 0,
    credit: valeurBrute,
  });

  // Etape 2 — Annulation des amortissements cumules
  if (amortissementsCumules > 0) {
    lines.push({
      accountCode: amortAccountCode,
      accountName: `Amortissements ${asset.name}`,
      label: `Reprise amort. cession ${asset.name}`,
      debit: amortissementsCumules,
      credit: 0,
    });
    lines.push({
      accountCode: '481',
      accountName: 'Valeur comptable des cessions d\'immobilisations',
      label: `Annulation amort. cumules ${asset.name}`,
      debit: 0,
      credit: amortissementsCumules,
    });
  }

  // Etape 3 — Produit de cession (si prix > 0)
  if (input.prixCession > 0) {
    lines.push({
      accountCode: '485',
      accountName: 'Creances sur cessions d\'immobilisations',
      label: `Creance cession ${asset.name}`,
      debit: input.prixCession,
      credit: 0,
    });
    lines.push({
      accountCode: '82',
      accountName: 'Produits des cessions d\'immobilisations',
      label: `Produit cession HAO ${asset.name}`,
      debit: 0,
      credit: input.prixCession,
    });
  }

  // Etape 4 — Solder le compte 481 (VNC -> charge HAO 81)
  if (vnc > 0) {
    lines.push({
      accountCode: '81',
      accountName: 'Valeurs comptables des cessions d\'immobilisations',
      label: `VNC cession HAO ${asset.name}`,
      debit: vnc,
      credit: 0,
    });
    lines.push({
      accountCode: '481',
      accountName: 'Valeur comptable des cessions d\'immobilisations',
      label: `Solde 481 cession ${asset.name}`,
      debit: 0,
      credit: vnc,
    });
  }

  // ── Validate balance ──
  const totalDebit = lines.reduce((s, l) => new Money(s).add(new Money(l.debit)).toNumber(), 0);
  const totalCredit = lines.reduce((s, l) => new Money(s).add(new Money(l.credit)).toNumber(), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Ecriture de cession desequilibree: Debit=${totalDebit} Credit=${totalCredit}`
    );
  }

  // Validate 481 is zeroed out
  const solde481 = lines
    .filter(l => l.accountCode === '481')
    .reduce((s, l) => s + l.debit - l.credit, 0);
  if (Math.abs(solde481) > 0.01) {
    throw new Error(`Cession incoherente : compte 481 non solde (solde=${solde481})`);
  }

  // ── Persist journal entry ──
  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();

  const journalLines = lines.map(l => ({
    id: crypto.randomUUID(),
    accountCode: l.accountCode,
    accountName: l.accountName,
    label: l.label,
    debit: l.debit,
    credit: l.credit,
  }));

  const motifSuffix = input.motif ? ` — ${input.motif}` : '';
  const entry: Record<string, unknown> = {
    id: entryId,
    entryNumber: `HAO-CESS-${asset.code}`,
    journal: 'OD',
    date: input.disposalDate,
    reference: `Cession HAO ${asset.code}`,
    label: `Cession HAO ${input.typeCession} — ${asset.name}${motifSuffix}`,
    status: 'draft',
    lines: journalLines,
    totalDebit,
    totalCredit,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.create('journalEntries', entry);

  // ── Update asset status ──
  await adapter.update('assets', input.assetId, {
    status: 'disposed',
    updatedAt: now,
  });

  // ── Audit trail ──
  await logAudit(
    'CESSION_HAO',
    'asset',
    input.assetId,
    JSON.stringify({
      type: input.typeCession,
      assetName: asset.name,
      valeurBrute,
      amortissementsCumules,
      vnc,
      prixCession: input.prixCession,
      plusOuMoinsValue,
      journalEntryId: entryId,
    }),
  );

  return {
    assetId: input.assetId,
    assetName: asset.name,
    valeurBrute,
    amortissementsCumules,
    vnc,
    prixCession: input.prixCession,
    plusOuMoinsValue,
    isHAO: true,
    journalEntryId: entryId,
    lines,
  };
}

/**
 * Preview a HAO disposal without persisting anything.
 * Returns the computed values and proposed journal lines.
 */
export async function previewCessionHAO(
  adapter: DataAdapter,
  input: Omit<CessionHAOInput, 'typeCession' | 'motif'>,
): Promise<Omit<CessionHAOResult, 'journalEntryId'> & { journalEntryId: null }> {
  const asset = await adapter.getById<DBAsset>('assets', input.assetId);
  if (!asset) {
    throw new Error(`Immobilisation introuvable : ${input.assetId}`);
  }

  const valeurBrute = asset.acquisitionValue;
  const amortissementsCumules = computeAmortissementsCumules(asset, input.disposalDate);
  const vnc = new Money(valeurBrute).subtract(new Money(amortissementsCumules)).toNumber();
  const plusOuMoinsValue = new Money(input.prixCession).subtract(new Money(vnc)).toNumber();

  const amortAccountCode = asset.depreciationAccountCode || '28' + asset.accountCode.substring(1);

  const lines: CessionHAOLine[] = [
    {
      accountCode: '81',
      accountName: 'Valeurs comptables des cessions d\'immobilisations',
      label: `VNC cession ${asset.name}`,
      debit: vnc,
      credit: 0,
    },
    {
      accountCode: asset.accountCode,
      accountName: asset.name,
      label: `Sortie immobilisation ${asset.name}`,
      debit: 0,
      credit: valeurBrute,
    },
    {
      accountCode: amortAccountCode,
      accountName: `Amortissements ${asset.name}`,
      label: `Reprise amort. ${asset.name}`,
      debit: amortissementsCumules,
      credit: 0,
    },
  ];

  if (input.prixCession > 0) {
    lines.push({
      accountCode: '82',
      accountName: 'Produits des cessions d\'immobilisations',
      label: `Produit cession ${asset.name}`,
      debit: 0,
      credit: input.prixCession,
    });
  }

  return {
    assetId: input.assetId,
    assetName: asset.name,
    valeurBrute,
    amortissementsCumules,
    vnc,
    prixCession: input.prixCession,
    plusOuMoinsValue,
    isHAO: true,
    journalEntryId: null,
    lines,
  };
}
