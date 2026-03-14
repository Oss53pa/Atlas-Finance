/**
 * Assets -> Accounting bridge.
 * Posts depreciation journal entries.
 * SYSCOHADA: DR 681x (dotation), CR 28xx (amortissement cumule).
 */
import type { DataAdapter } from '@atlas/data';
import { logAudit } from '../../../lib/db';
import type { DBJournalEntry, DBAsset } from '../../../lib/db';
import { Money } from '@/utils/money';

export interface DepreciationEntry {
  assetId: string;
  assetName: string;
  dotationAccountCode: string;
  amortissementAccountCode: string;
  amount: number;
  date: string;
  exercice: string;
}

/**
 * Compute annual depreciation for all active assets.
 */
export function computeDepreciations(assets: DBAsset[], date: string): DepreciationEntry[] {
  const entries: DepreciationEntry[] = [];

  for (const asset of assets) {
    if (asset.status !== 'active') continue;
    if (asset.acquisitionDate > date) continue;

    const base = asset.acquisitionValue - asset.residualValue;
    const annualAmount = base / asset.usefulLifeYears;

    // Check if fully depreciated
    const acqDate = new Date(asset.acquisitionDate);
    const currentDate = new Date(date);
    // SYSCOHADA : année commerciale 360 jours (12 × 30)
    const moisDebut = acqDate.getFullYear() * 12 + acqDate.getMonth();
    const moisFin = currentDate.getFullYear() * 12 + currentDate.getMonth();
    const joursDebut = Math.min(acqDate.getDate(), 30);
    const joursFin = Math.min(currentDate.getDate(), 30);
    const totalJours = (moisFin - moisDebut) * 30 + (joursFin - joursDebut);
    const yearsElapsed = Math.max(0, totalJours) / 360;

    if (yearsElapsed >= asset.usefulLifeYears) continue;

    entries.push({
      assetId: asset.id,
      assetName: asset.name,
      dotationAccountCode: '681' + asset.accountCode.substring(0, 1),
      amortissementAccountCode: asset.depreciationAccountCode || '28' + asset.accountCode.substring(1),
      amount: new Money(annualAmount).round().toNumber(),
      date,
      exercice: currentDate.getFullYear().toString(),
    });
  }

  return entries;
}

/**
 * Post depreciation entries to the journal.
 */
export async function postDepreciations(adapter: DataAdapter, depreciations: DepreciationEntry[]): Promise<string[]> {
  const ids: string[] = [];
  const now = new Date().toISOString();

  for (const dep of depreciations) {
    const id = crypto.randomUUID();
    const allEntries = await adapter.getAll('journalEntries', { orderBy: { field: 'entryNumber', direction: 'asc' } });
    const lastEntry = allEntries.length > 0 ? allEntries[allEntries.length - 1] as DBJournalEntry : undefined;
    const nextNum = lastEntry ? parseInt(lastEntry.entryNumber.replace(/\D/g, '') || '0') + 1 : 1;
    const entryNumber = `OD-${String(nextNum).padStart(6, '0')}`;

    const entry: DBJournalEntry = {
      id,
      entryNumber,
      journal: 'OD',
      date: dep.date,
      reference: `AMORT-${dep.assetId.slice(0, 8)}`,
      label: `Dotation amortissement — ${dep.assetName}`,
      status: 'draft',
      lines: [
        {
          id: crypto.randomUUID(),
          accountCode: dep.dotationAccountCode,
          accountName: `Dotation amortissements`,
          label: `Dotation ${dep.assetName}`,
          debit: dep.amount,
          credit: 0,
        },
        {
          id: crypto.randomUUID(),
          accountCode: dep.amortissementAccountCode,
          accountName: `Amortissement ${dep.assetName}`,
          label: `Amort. cumule ${dep.assetName}`,
          debit: 0,
          credit: dep.amount,
        },
      ],
      totalDebit: dep.amount,
      totalCredit: dep.amount,
      createdAt: now,
      updatedAt: now,
    };

    await adapter.create('journalEntries', entry);
    ids.push(id);

    // AF-CL08: Synchroniser cumulDepreciation sur l'immobilisation
    const existingAsset = await adapter.getById<DBAsset>('assets', dep.assetId);
    if (existingAsset) {
      await adapter.update('assets', dep.assetId, {
        cumulDepreciation: (existingAsset.cumulDepreciation || 0) + dep.amount,
      });
    }

    await logAudit(
      'DEPRECIATION_POSTING',
      'journalEntry',
      id,
      `Amortissement ${dep.assetName}: ${dep.amount}`
    );
  }

  return ids;
}

/**
 * Run depreciation for all active assets and post entries.
 */
export async function runDepreciation(adapter: DataAdapter, date: string): Promise<string[]> {
  const assets = await adapter.getAll('assets', { where: { status: 'active' } }) as DBAsset[];
  const depreciations = computeDepreciations(assets, date);
  return postDepreciations(adapter, depreciations);
}

// ============================================================================
// P4-5 : Cession d'immobilisation automatisée
// ============================================================================

export interface DisposalInput {
  assetId: string;
  disposalDate: string;
  prixCession: number;
  motif?: string;
}

export interface DisposalResult {
  assetId: string;
  assetName: string;
  valeurBrute: number;
  amortissementsCumules: number;
  vnc: number;
  prixCession: number;
  plusOuMoinsValue: number;
  journalEntryId: string;
}

/**
 * Cession d'immobilisation SYSCOHADA en 4 étapes via le compte 481.
 *
 * Étape 1 — Sortie du bien :
 *   D 481 (Valeur comptable des cessions) = Valeur brute
 *   C 2xxx (Compte d'immobilisation)      = Valeur brute
 *
 * Étape 2 — Annulation des amortissements cumulés :
 *   D 28xx (Amortissements cumulés) = cumulDepreciation
 *   C 481                           = cumulDepreciation
 *   → Solde 481 = Valeur brute − cumulDepreciation = VNC
 *
 * Étape 3 — Constatation du produit de cession (si prixCession > 0) :
 *   D 485 (Créances sur cessions) = prixCession
 *   C 82 (Produits de cessions)   = prixCession
 *
 * Étape 4 — Résultat de cession (solder le compte 481) :
 *   Si prixCession > VNC (plus-value)  : D 81 = VNC / C 481 = VNC
 *   Si prixCession < VNC (moins-value) : D 81 = VNC / C 481 = VNC
 *   Le résultat (plus/moins-value) ressort de la comparaison 82 − 81.
 *
 * Validation : le compte 481 DOIT être soldé (somme D − C = 0).
 */
export async function disposeAsset(
  adapter: DataAdapter,
  input: DisposalInput,
): Promise<DisposalResult> {
  const asset = await adapter.getById<DBAsset>('assets', input.assetId);
  if (!asset) throw new Error(`Immobilisation introuvable : ${input.assetId}`);
  if (asset.status !== 'active') throw new Error(`Immobilisation déjà sortie : ${asset.name}`);

  const valeurBrute = asset.acquisitionValue;
  const depBase = valeurBrute - asset.residualValue;
  const annualDep = depBase / asset.usefulLifeYears;

  // Calculer amortissements cumulés jusqu'à la date de cession (prorata temporis)
  const acqDate = new Date(asset.acquisitionDate);
  const dispDate = new Date(input.disposalDate);
  // SYSCOHADA : année commerciale 360 jours (12 × 30)
  const moisDebut = acqDate.getFullYear() * 12 + acqDate.getMonth();
  const moisFin = dispDate.getFullYear() * 12 + dispDate.getMonth();
  const joursDebut = Math.min(acqDate.getDate(), 30);
  const joursFin = Math.min(dispDate.getDate(), 30);
  const totalJours = (moisFin - moisDebut) * 30 + (joursFin - joursDebut);
  const yearsElapsed = Math.min(
    Math.max(0, totalJours) / 360,
    asset.usefulLifeYears,
  );
  const amortissementsCumules = new Money(annualDep).multiply(yearsElapsed).round().toNumber();

  const vnc = new Money(valeurBrute).subtract(new Money(amortissementsCumules)).toNumber();
  const plusOuMoinsValue = new Money(input.prixCession).subtract(new Money(vnc)).toNumber();

  const amortAccountCode = asset.depreciationAccountCode || '28' + asset.accountCode.substring(1);

  const lines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    label: string;
    debit: number;
    credit: number;
  }> = [];

  // ── Étape 1 — Sortie du bien ──────────────────────────────────────────
  // D 481 = Valeur brute
  lines.push({
    id: crypto.randomUUID(),
    accountCode: '481',
    accountName: 'Valeur comptable des cessions d\'immobilisations',
    label: `Sortie immobilisation ${asset.name} — valeur brute`,
    debit: valeurBrute,
    credit: 0,
  });
  // C 2xxx = Valeur brute
  lines.push({
    id: crypto.randomUUID(),
    accountCode: asset.accountCode,
    accountName: asset.name,
    label: `Sortie immobilisation ${asset.name}`,
    debit: 0,
    credit: valeurBrute,
  });

  // ── Étape 2 — Annulation des amortissements cumulés ───────────────────
  if (amortissementsCumules > 0) {
    // D 28xx = cumulDepreciation
    lines.push({
      id: crypto.randomUUID(),
      accountCode: amortAccountCode,
      accountName: `Amortissements ${asset.name}`,
      label: `Reprise amort. cession ${asset.name}`,
      debit: amortissementsCumules,
      credit: 0,
    });
    // C 481 = cumulDepreciation
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '481',
      accountName: 'Valeur comptable des cessions d\'immobilisations',
      label: `Annulation amort. cumulés ${asset.name}`,
      debit: 0,
      credit: amortissementsCumules,
    });
  }
  // → Solde 481 = valeurBrute − amortissementsCumules = VNC

  // ── Étape 3 — Constatation du produit de cession ──────────────────────
  if (input.prixCession > 0) {
    // D 485 (créance sur cession d'immobilisation)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '485',
      accountName: 'Créances sur cessions d\'immobilisations',
      label: `Créance cession ${asset.name}`,
      debit: input.prixCession,
      credit: 0,
    });
    // C 82 = prixCession
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '82',
      accountName: 'Produits des cessions d\'immobilisations',
      label: `Produit cession ${asset.name}`,
      debit: 0,
      credit: input.prixCession,
    });
  }

  // ── Étape 4 — Résultat de cession (solder le compte 481) ──────────────
  // Solde 481 = VNC (débiteur). On le vide : D 81 = VNC / C 481 = VNC.
  // Le résultat (plus-value ou moins-value) ressort de la comparaison 82 − 81.
  if (vnc > 0) {
    // D 81 = VNC (Valeurs comptables des cessions d'immobilisations)
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '81',
      accountName: 'Valeurs comptables des cessions d\'immobilisations',
      label: `VNC cession ${asset.name}`,
      debit: vnc,
      credit: 0,
    });
    // C 481 = VNC → solde 481 à zéro
    lines.push({
      id: crypto.randomUUID(),
      accountCode: '481',
      accountName: 'Valeur comptable des cessions d\'immobilisations',
      label: `Solde 481 cession ${asset.name}`,
      debit: 0,
      credit: vnc,
    });
  }

  // ── Validation : le compte 481 doit être soldé ─────────────────────────
  const solde481 = lines
    .filter(l => l.accountCode === '481')
    .reduce((s, l) => s + l.debit - l.credit, 0);
  if (Math.abs(solde481) > 0.01) {
    throw new Error(`Cession incohérente : compte 481 non soldé (solde=${solde481})`);
  }

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const entry: DBJournalEntry = {
    id: entryId,
    entryNumber: `CESS-${asset.code}`,
    journal: 'CL',
    date: input.disposalDate,
    reference: `Cession ${asset.code}`,
    label: `Cession immobilisation — ${asset.name}`,
    status: 'draft',
    nature: 'normal',
    lines,
    totalDebit,
    totalCredit,
    createdAt: now,
    updatedAt: now,
  };

  await adapter.create('journalEntries', entry);

  // Mettre à jour le statut de l'immobilisation
  await adapter.update('assets', input.assetId, { status: 'disposed' });

  await logAudit(
    'ASSET_DISPOSAL',
    'asset',
    input.assetId,
    `Cession ${asset.name}: prix=${input.prixCession}, VNC=${vnc}, PV/MV=${plusOuMoinsValue}`,
  );

  return {
    assetId: input.assetId,
    assetName: asset.name,
    valeurBrute,
    amortissementsCumules,
    vnc,
    prixCession: input.prixCession,
    plusOuMoinsValue,
    journalEntryId: entryId,
  };
}
