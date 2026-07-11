import type { DataAdapter } from '@atlas/data';

/**
 * Mise en service d'un projet CAPEX — gate G5 (refonte OPEX/CAPEX, Lot 6, §21).
 *
 * Constitue la fiche d'immobilisation (table assets) à partir des coûts
 * capitalisables du BC, passe le projet en 'mis_en_service', et PROPOSE l'écriture
 * de virement 23 (encours) → 21/22/24 (immobilisation) — proposition soumise à
 * validation comptable, jamais passée en silence (aucune écriture auto-postée ici).
 */

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}
const today = () => new Date().toISOString().slice(0, 10);
/** Compte d'amortissement SYSCOHADA miroir : 2xy → 28xy. */
const amortAccount = (immo: string) => (immo && immo[0] === '2' ? '28' + immo.slice(1) : '28' + immo);

export interface EcritureProposee { debit_account: string; credit_account: string; montant: number; libelle: string; }
export interface CommissioningResult { assetId: string; assetCode: string; base: number; ecriture: EcritureProposee; }

export async function commissionProject(adapter: DataAdapter, projectId: string): Promise<CommissioningResult> {
  const client = getClient(adapter);
  if (!client) throw new Error('Mise en service disponible en mode SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');

  const { data: proj, error: ep } = await client.from('capex_projets').select('*').eq('id', projectId).single();
  if (ep) throw new Error(ep.message);
  if (proj.statut === 'mis_en_service') throw new Error('Projet déjà mis en service.');

  const { data: bc, error: eb } = await client.from('capex_requests')
    .select('account_code,classe_immo,duree_amortissement,methode,valeur_residuelle,libelle,montant').eq('id', proj.request_id).single();
  if (eb) throw new Error(eb.message);

  // base amortissable = Σ coûts capitalisables (sinon montant du BC)
  const { data: costs } = await client.from('capex_bc_lignes_cout').select('montant,capitalisable').eq('request_id', proj.request_id);
  const capi = (costs || []).filter((c: any) => c.capitalisable).reduce((s: number, c: any) => s + (Number(c.montant) || 0), 0);
  const base = capi > 0 ? capi : (Number(bc.montant) || 0);
  const immoAccount = bc.account_code;
  const encoursAccount = '231'; // immobilisations corporelles en cours (proposition)

  const assetCode = `IMMO-${proj.code}`;
  const { data: asset, error: ea } = await client.from('assets').insert({
    tenant_id: tenant, code: assetCode, name: bc.libelle,
    category: bc.classe_immo || immoAccount?.slice(0, 2) || 'CAPEX',
    acquisition_date: today(), acquisition_value: base, residual_value: Number(bc.valeur_residuelle) || 0,
    useful_life_years: Number(bc.duree_amortissement) || 5,
    account_code: immoAccount, depreciation_account_code: amortAccount(immoAccount),
    depreciation_method: bc.methode || 'lineaire', depreciation_start_date: today(),
    date_mise_en_service: today(), commissioning_date: today(), status: 'active',
  }).select('id').single();
  if (ea) throw new Error(ea.message);

  const { error: eu } = await client.from('capex_projets')
    .update({ statut: 'mis_en_service', date_mise_en_service_reelle: today() }).eq('id', projectId);
  if (eu) throw new Error(eu.message);

  return {
    assetId: asset.id, assetCode, base,
    ecriture: { debit_account: immoAccount, credit_account: encoursAccount, montant: base,
      libelle: `Mise en service ${proj.code} — virement encours → immobilisation` },
  };
}
