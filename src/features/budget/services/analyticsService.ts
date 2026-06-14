/**
 * analyticsService — Comptabilité analytique Atlas FNA (CDC V3 §1/§4 · étape 1).
 *
 * CRUD axes/sections (peupler) + performance par section depuis la vue live
 * v_actual_by_section (réalisé attribué par analytical_code ; les ventilations
 * explicites viendront ensuite). Tenancy = societes (RLS).
 */
import type { DataAdapter } from '@atlas/data';

export interface Axe {
  id: string;
  code: string;
  libelle: string;
  type_axe: string | null;
  obligatoire: boolean;
  actif: boolean;
}

export interface Section {
  id: string;
  axe_id: string | null;
  code: string;
  libelle: string;
  parent_id: string | null;
  responsable: string | null;
  budget_annuel: number;
  actif: boolean;
}

export interface SectionPerformance extends Section {
  produits: number;
  charges: number;
  resultat: number;
  ecartBudget: number; // résultat - budget_annuel
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export async function listAxes(adapter: DataAdapter): Promise<Axe[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('axes_analytiques').select('*').order('code');
  return (data ?? []) as Axe[];
}

export async function createAxe(adapter: DataAdapter, axe: { code: string; libelle: string; type_axe?: string; obligatoire?: boolean }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('axes_analytiques').insert({
    tenant_id: tenantOf(adapter), code: axe.code.trim(), libelle: axe.libelle.trim(),
    type_axe: axe.type_axe || null, obligatoire: axe.obligatoire ?? false, actif: true,
  });
  if (error) throw new Error(error.message);
}

export async function listSections(adapter: DataAdapter): Promise<Section[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('sections_analytiques').select('*').order('code');
  return (data ?? []).map((s: any) => ({ ...s, budget_annuel: Number(s.budget_annuel) || 0 }));
}

export async function createSection(adapter: DataAdapter, sec: { axe_id?: string | null; code: string; libelle: string; responsable?: string; budget_annuel?: number }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('sections_analytiques').insert({
    tenant_id: tenantOf(adapter), axe_id: sec.axe_id || null, code: sec.code.trim(), libelle: sec.libelle.trim(),
    responsable: sec.responsable || null, budget_annuel: sec.budget_annuel ?? 0, actif: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateSection(adapter: DataAdapter, id: string, patch: Partial<Pick<Section, 'libelle' | 'responsable' | 'budget_annuel' | 'actif' | 'axe_id'>>): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('sections_analytiques').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Performance par section : réalisé (vue) + budget annuel (table). */
export async function getSectionPerformance(adapter: DataAdapter, annee: string): Promise<SectionPerformance[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const [sections, { data: actual }] = await Promise.all([
    listSections(adapter),
    client.from('v_actual_by_section').select('*').eq('annee', annee),
  ]);
  const byCode = new Map<string, { produits: number; charges: number }>();
  for (const r of (actual ?? [])) {
    const code = String(r.section_code);
    if (!byCode.has(code)) byCode.set(code, { produits: 0, charges: 0 });
    const agg = byCode.get(code)!;
    const m = Number(r.montant) || 0;
    if (r.classe === '7') agg.produits += m; else if (r.classe === '6') agg.charges += m;
  }
  return sections.map(s => {
    const a = byCode.get(s.code) || { produits: 0, charges: 0 };
    const resultat = a.produits - a.charges;
    return { ...s, produits: a.produits, charges: a.charges, resultat, ecartBudget: resultat - s.budget_annuel };
  });
}
