/**
 * disposalService — sorties d'immobilisations (cession / mise au rebut).
 *
 * Persiste la sortie (fna_asset_disposal), génère l'ÉCRITURE DE CESSION
 * SYSCOHADA équilibrée, et passe l'actif en 'disposed'/'scrapped'.
 *
 * Écriture (cession) :
 *   Dr 28x  amortissements cumulés       = amort cumulé
 *   Dr 812  valeur comptable des cessions = VNC
 *     Cr 2x  valeur brute de l'immo        = brut
 *   Dr 521  banque (si prix de cession)    = prix
 *     Cr 822  produits des cessions         = prix
 * (Σ Dr = Σ Cr : brut + prix de part et d'autre.)
 */
import type { DataAdapter } from '@atlas/data';
import { safeAddEntry } from '../entryGuard';
import {
  complementaryDepreciationForDisposal,
  dotationAccountFor,
  amortAccountFor,
} from './depreciationEngine';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export interface DisposalInput {
  assetId: string;
  disposalType: string;      // sale|donation|destruction|trade_in|scrap|transfer
  disposalDate: string;
  disposalValue: number;     // prix de cession (0 si destruction/don)
  reason?: string | null;
  method?: string | null;
  buyer?: string | null;
  location?: string | null;
  notes?: string | null;
}

const SCRAP_TYPES = new Set(['destruction', 'scrap']);

export async function listDisposals(adapter: DataAdapter): Promise<any[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_asset_disposal').select('*').order('disposal_date', { ascending: false });
  return data ?? [];
}

/**
 * Crée une sortie d'actif : calcule la VNC, poste l'écriture de cession,
 * passe l'actif en sortie, enregistre la sortie. Renvoie la plus/moins-value.
 */
export async function createDisposal(adapter: DataAdapter, input: DisposalInput, createdBy?: string | null): Promise<{ gainLoss: number; vnc: number }> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');

  const asset: any = await adapter.getById<any>('assets', input.assetId);
  if (!asset) throw new Error('Actif introuvable.');

  // Idempotence : un bien déjà sorti ne peut être cédé une seconde fois.
  const currentStatus = String(asset.status ?? 'active');
  if (currentStatus === 'disposed' || currentStatus === 'scrapped') {
    throw new Error('Actif déjà sorti — cession impossible.');
  }

  const brut = Number(asset.acquisitionValue ?? asset.acquisition_value ?? 0);
  const residual = Number(asset.residualValue ?? asset.residual_value ?? 0);
  const storedCumulRaw = Number(asset.cumulDepreciation ?? asset.cumul_depreciation ?? 0);

  const compteImmo = String(asset.accountCode ?? asset.account_code ?? '').trim();
  // Refuser de produire une écriture fausse sur un compte de regroupement.
  if (!compteImmo || compteImmo.length < 2) {
    throw new Error("Compte d'immobilisation manquant sur la fiche — impossible de céder sans imputation valable.");
  }
  const compteAmort = amortAccountFor(compteImmo, asset.depreciationAccountCode ?? asset.depreciation_account_code);
  const nom = String(asset.name ?? asset.code ?? input.assetId);
  const acquisitionDate = String(asset.acquisitionDate ?? asset.acquisition_date ?? input.disposalDate);

  const now = new Date().toISOString();
  const L = (accountCode: string, accountName: string, label: string, debit: number, credit: number) =>
    ({ id: crypto.randomUUID(), accountCode, accountName, label, debit, credit });

  // ── Dotation complémentaire jusqu'à la DATE DE CESSION ─────────────────
  // Sans elle, la VNC (donc la plus/moins-value) est fausse en cours d'exercice.
  const complement = complementaryDepreciationForDisposal(
    { acquisitionValue: brut, residualValue: residual, usefulLifeYears: Number(asset.usefulLifeYears ?? asset.useful_life_years ?? 0), depreciationMethod: asset.depreciationMethod ?? asset.depreciation_method, acquisitionDate, cumulDepreciation: storedCumulRaw },
    input.disposalDate,
  );
  const base = Math.max(0, brut - residual);
  const cumul = Math.min(Math.max(0, storedCumulRaw) + complement, base); // amort cumulé à la date de sortie
  const vnc = brut - cumul;
  const prix = Number(input.disposalValue) || 0;
  const gainLoss = prix - vnc;

  if (complement > 0) {
    await safeAddEntry(adapter, {
      id: crypto.randomUUID(),
      entryNumber: `AMORT-CESS-${input.disposalDate.replace(/-/g, '')}-${input.assetId.substring(0, 6)}`,
      journal: 'OD',
      date: input.disposalDate,
      reference: `AMORT-COMPL-${input.assetId}`,
      label: `Dotation complémentaire avant cession - ${nom}`,
      status: 'validated',
      lines: [
        L(dotationAccountFor(compteImmo), 'Dotation aux amortissements', `Dotation complémentaire ${nom}`, complement, 0),
        L(compteAmort, 'Amortissements cumulés', `Amort. complémentaire ${nom}`, 0, complement),
      ],
      createdAt: now,
      createdBy: createdBy || 'system',
    }, { skipSyncValidation: true });
    // Aligne le cumul stocké avant la sortie.
    await adapter.update('assets', input.assetId, { cumulDepreciation: cumul });
  }

  // ── Écriture de CESSION SYSCOHADA (équilibrée par construction) ─────────
  //   Dr 28x amort cumulé + Dr 81 VNC / Cr 2x brut
  //   Dr 485 créance sur cession / Cr 82 produit de cession
  const lines: any[] = [];
  if (cumul > 0) lines.push(L(compteAmort, 'Amortissements cumulés', `Sortie ${nom}`, cumul, 0));
  if (vnc > 0) lines.push(L('812', "Valeurs comptables des cessions d'immobilisations", `VNC ${nom}`, vnc, 0));
  lines.push(L(compteImmo, String(asset.name ?? 'Immobilisation'), `Sortie ${nom}`, 0, brut));
  if (prix > 0) {
    // 485 « Créances sur cessions d'immobilisations » — l'encaissement effectif
    // se solde ensuite en trésorerie (Dr 521 / Cr 485), pas ici.
    lines.push(L('485', "Créances sur cessions d'immobilisations", `Cession ${nom}`, prix, 0));
    lines.push(L('822', "Produits des cessions d'immobilisations", `Produit cession ${nom}`, 0, prix));
  }

  const entryId = crypto.randomUUID();
  const entryNumber = `CESS-${input.disposalDate.replace(/-/g, '')}-${input.assetId.substring(0, 6)}`;
  await safeAddEntry(adapter, {
    id: entryId,
    entryNumber,
    journal: 'OD',
    date: input.disposalDate,
    reference: `CESSION-${input.assetId}`,
    label: `Cession ${input.disposalType} - ${nom}`,
    status: 'validated', // écriture de cession effective (visible au bilan/états)
    lines,
    createdAt: now,
    createdBy: createdBy || 'system',
  }, { skipSyncValidation: true });

  // Passe l'actif en sortie.
  const newStatus = SCRAP_TYPES.has(input.disposalType) ? 'scrapped' : 'disposed';
  await adapter.update('assets', input.assetId, { status: newStatus });

  // Enregistre la sortie.
  const { error } = await client.from('fna_asset_disposal').insert({
    tenant_id: tenantOf(adapter),
    asset_id: input.assetId,
    asset_name: nom,
    asset_tag: String(asset.code ?? ''),
    disposal_type: input.disposalType,
    disposal_date: input.disposalDate,
    disposal_value: prix,
    reason: input.reason || null,
    method: input.method || null,
    buyer: input.buyer || null,
    location: input.location || null,
    notes: input.notes || null,
    original_cost: brut,
    book_value: vnc,
    gain_loss: gainLoss,
    status: 'completed',
    journal_entry_id: entryId,
    created_by: createdBy || null,
  });
  if (error) throw new Error(error.message);

  return { gainLoss, vnc };
}
