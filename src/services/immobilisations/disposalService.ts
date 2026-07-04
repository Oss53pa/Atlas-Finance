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

  const brut = Number(asset.acquisitionValue ?? asset.acquisition_value ?? 0);
  const cumulBrut = Number(asset.cumulDepreciation ?? asset.cumul_depreciation ?? 0);
  // L'amortissement repris ne peut EXCÉDER le brut (sinon Dr 28 > Cr 2x →
  // écriture déséquilibrée en cas de sur-amortissement). amort + vnc = brut.
  const cumul = Math.min(Math.max(0, cumulBrut), brut);
  const vnc = brut - cumul;
  const prix = Number(input.disposalValue) || 0;
  const gainLoss = prix - vnc;

  const compteImmo = String(asset.accountCode ?? asset.account_code ?? '2');
  const compteAmort = String(asset.depreciationAccountCode ?? asset.depreciation_account_code ?? ('28' + compteImmo.slice(1)));
  const nom = String(asset.name ?? asset.code ?? input.assetId);

  // Lignes de l'écriture de cession (équilibrée par construction).
  const L = (accountCode: string, accountName: string, label: string, debit: number, credit: number) =>
    ({ id: crypto.randomUUID(), accountCode, accountName, label, debit, credit });
  const lines: any[] = [];
  if (cumul > 0) lines.push(L(compteAmort, 'Amortissements cumulés', `Sortie ${nom}`, cumul, 0));
  if (vnc > 0) lines.push(L('812', "Valeurs comptables des cessions d'immobilisations", `VNC ${nom}`, vnc, 0));
  lines.push(L(compteImmo, String(asset.name ?? 'Immobilisation'), `Sortie ${nom}`, 0, brut));
  if (prix > 0) {
    lines.push(L('521', 'Banque', `Cession ${nom}`, prix, 0));
    lines.push(L('822', "Produits des cessions d'immobilisations", `Produit cession ${nom}`, 0, prix));
  }

  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const entryNumber = `CESS-${input.disposalDate.replace(/-/g, '')}-${input.assetId.substring(0, 6)}`;
  await safeAddEntry(adapter, {
    id: entryId,
    entryNumber,
    journal: 'OD',
    date: input.disposalDate,
    reference: `CESSION-${input.assetId}`,
    label: `Cession ${input.disposalType} - ${nom}`,
    status: 'draft',
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
