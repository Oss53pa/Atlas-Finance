import type { DataAdapter } from '@atlas/data';
import { sha256Hex } from '../../../utils/integrity';

/**
 * Snapshots figés de l'exécution budgétaire (refonte OPEX/CAPEX — Lot 7, §24).
 * À la clôture mensuelle : gel immuable + hashé de v_budget_execution (YTD au mois
 * clos). Les états sur période close relisent le snapshot (rejouable, invariant 12).
 */

export interface SnapshotMaille { account_code: string; section_id: string | null; budget: number; engage: number; realise: number; disponible: number; }
export interface SnapshotPayload { annee: string; period: number; mailles: SnapshotMaille[]; }
export interface BudgetSnapshot { id: string; annee: string; period: number; hash_sha256: string; nb_lignes: number; created_at: string; contenu?: SnapshotPayload; }

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Construit le payload DÉTERMINISTE d'un snapshot : agrégation YTD (period ≤ p) par
 * maille (compte × section), triée. Fonction pure (testable) — hash reproductible.
 */
export function buildSnapshotPayload(
  rows: Array<{ account_code: string; section_id: string | null; period: number; budget: number; engage: number; realise: number; disponible: number }>,
  annee: string, period: number,
): SnapshotPayload {
  const byMaille = new Map<string, SnapshotMaille>();
  for (const r of rows) {
    if (r.period > period) continue;
    const key = `${r.account_code}|${r.section_id ?? ''}`;
    const cur = byMaille.get(key) ?? { account_code: r.account_code, section_id: r.section_id ?? null, budget: 0, engage: 0, realise: 0, disponible: 0 };
    cur.budget += r.budget || 0; cur.engage += r.engage || 0; cur.realise += r.realise || 0; cur.disponible += r.disponible || 0;
    byMaille.set(key, cur);
  }
  const mailles = [...byMaille.values()]
    .map((m) => ({ ...m, budget: r2(m.budget), engage: r2(m.engage), realise: r2(m.realise), disponible: r2(m.disponible) }))
    .sort((a, b) => (a.account_code + (a.section_id ?? '')).localeCompare(b.account_code + (b.section_id ?? '')));
  return { annee, period, mailles };
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
async function tenantOf(client: any): Promise<string | null> {
  const { data } = await client.rpc('get_user_company_id');
  return (data as string) ?? null;
}
async function fetchAll(build: () => any, chunk = 1000): Promise<any[]> {
  const all: any[] = []; let from = 0;
  for (;;) { const { data, error } = await build().range(from, from + chunk - 1); if (error) throw new Error(error.message); const b = (data || []) as any[]; all.push(...b); if (b.length < chunk) break; from += chunk; }
  return all;
}

/** Fige le snapshot du mois `period` de l'exercice `annee` (immuable ; refuse le doublon). */
export async function createSnapshot(adapter: DataAdapter, annee: string, period: number): Promise<BudgetSnapshot> {
  const client = getClient(adapter);
  if (!client) throw new Error('Snapshots disponibles en mode SaaS uniquement.');
  const tenant = await tenantOf(client);
  if (!tenant) throw new Error('Société courante introuvable.');
  const { data: u } = await client.auth.getUser();

  const rows = await fetchAll(() => client
    .from('v_budget_execution').select('account_code,section_id,period,budget,engage,realise,disponible')
    .eq('annee', annee).order('account_code', { ascending: true }));
  const payload = buildSnapshotPayload(rows.map((r: any) => ({
    account_code: r.account_code, section_id: r.section_id ?? null, period: Number(r.period),
    budget: Number(r.budget) || 0, engage: Number(r.engage) || 0, realise: Number(r.realise) || 0, disponible: Number(r.disponible) || 0,
  })), annee, period);
  const hash = await sha256Hex(JSON.stringify(payload));

  const { data, error } = await client.from('budget_snapshots').insert({
    tenant_id: tenant, annee, period, contenu: payload, hash_sha256: hash, nb_lignes: payload.mailles.length, created_by: u?.user?.id ?? null,
  }).select('id,annee,period,hash_sha256,nb_lignes,created_at').single();
  if (error) {
    if ((error.message || '').includes('duplicate') || error.code === '23505') throw new Error(`Le snapshot ${annee}-${String(period).padStart(2, '0')} existe déjà (immuable).`);
    throw new Error(error.message);
  }
  return data as BudgetSnapshot;
}

export async function listSnapshots(adapter: DataAdapter): Promise<BudgetSnapshot[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data, error } = await client.from('budget_snapshots')
    .select('id,annee,period,hash_sha256,nb_lignes,created_at').order('annee', { ascending: false }).order('period', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

/** Vérifie l'intégrité d'un snapshot : recalcule le hash du contenu figé et compare. */
export async function verifySnapshot(adapter: DataAdapter, id: string): Promise<boolean> {
  const client = getClient(adapter);
  if (!client) return false;
  const { data } = await client.from('budget_snapshots').select('contenu,hash_sha256').eq('id', id).single();
  if (!data) return false;
  const recomputed = await sha256Hex(JSON.stringify(data.contenu));
  return recomputed === data.hash_sha256;
}
