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

export async function createAxe(adapter: DataAdapter, axe: { code: string; libelle: string; type_axe?: string; obligatoire?: boolean; actif?: boolean }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('axes_analytiques').insert({
    tenant_id: tenantOf(adapter), code: axe.code.trim(), libelle: axe.libelle.trim(),
    type_axe: axe.type_axe || null, obligatoire: axe.obligatoire ?? false, actif: axe.actif ?? true,
  });
  if (error) throw new Error(error.message);
}

export async function updateAxe(adapter: DataAdapter, id: string, patch: Partial<Pick<Axe, 'libelle' | 'type_axe' | 'obligatoire' | 'actif'>>): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('axes_analytiques').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAxe(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('axes_analytiques').delete().eq('id', id);
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
  // Une section appartient OBLIGATOIREMENT à un axe (sections_analytiques.axe_id
  // NOT NULL en base) → garde explicite : sans axe, l'INSERT échouait avec un
  // message SQL cryptique (« null value in column axe_id »).
  if (!sec.axe_id) throw new Error('Sélectionnez un axe analytique pour la section.');
  const { error } = await client.from('sections_analytiques').insert({
    tenant_id: tenantOf(adapter), axe_id: sec.axe_id, code: sec.code.trim(), libelle: sec.libelle.trim(),
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

/** Supprime une section ET ses ventilations rattachées (FK section_id). */
export async function deleteSection(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  await client.from('ventilations_analytiques').delete().eq('section_id', id);
  const { error } = await client.from('sections_analytiques').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Amorce une structure analytique standard (axes + sections) de façon IDEMPOTENTE :
 * n'ajoute que ce qui manque (par code). Écrit dans axes_analytiques /
 * sections_analytiques (RLS société). Renvoie ce qui a été réellement créé.
 */
export async function seedStandardAnalyticalStructure(
  adapter: DataAdapter,
  structure: {
    axes: Array<{ code: string; libelle: string; type_axe?: string }>;
    sections: Array<{ code: string; libelle: string; axeCode: string; budget_annuel?: number }>;
  },
): Promise<{ axesCreated: number; sectionsCreated: number; axesSkipped: number; sectionsSkipped: number }> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');

  const existingAxes = await listAxes(adapter);
  const axeCodes = new Set(existingAxes.map(a => a.code));
  let axesCreated = 0, axesSkipped = 0;
  for (const ax of structure.axes) {
    if (axeCodes.has(ax.code)) { axesSkipped++; continue; }
    await createAxe(adapter, { code: ax.code, libelle: ax.libelle, type_axe: ax.type_axe });
    axesCreated++;
  }

  const axesNow = await listAxes(adapter);
  const idByCode = new Map(axesNow.map(a => [a.code, a.id]));
  const existingSections = await listSections(adapter);
  const secCodes = new Set(existingSections.map(s => s.code));
  let sectionsCreated = 0, sectionsSkipped = 0;
  for (const s of structure.sections) {
    if (secCodes.has(s.code)) { sectionsSkipped++; continue; }
    const axeId = idByCode.get(s.axeCode);
    if (!axeId) { sectionsSkipped++; continue; }
    await createSection(adapter, { axe_id: axeId, code: s.code, libelle: s.libelle, budget_annuel: s.budget_annuel ?? 0 });
    sectionsCreated++;
  }
  return { axesCreated, sectionsCreated, axesSkipped, sectionsSkipped };
}

// ── Ventilation (attribution de sections aux écritures) ──────────────────────

export interface VentilationRule {
  accountPrefix: string;   // ex. '6' ou '601' ou '601100'
  journal?: string | null; // ex. 'AC' (optionnel)
  tiersCode?: string | null; // code tiers (optionnel)
  sectionId: string;
}

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

/**
 * Applique une règle de ventilation : toutes les lignes correspondant au
 * préfixe de compte (+ journal/tiers optionnels) sont attribuées à 100% à la
 * section. Idempotent : remplace les ventilations existantes de ces lignes.
 */
export async function applyVentilationRule(adapter: DataAdapter, rule: VentilationRule): Promise<{ matched: number }> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = tenantOf(adapter);

  let q = client
    .from('journal_lines')
    .select('id,debit,credit,account_code,third_party_code, journal_entries!inner(journal,status)')
    .like('account_code', `${rule.accountPrefix.trim()}%`)
    .in('journal_entries.status', ['validated', 'posted']);
  if (rule.journal) q = q.eq('journal_entries.journal', rule.journal);
  if (rule.tiersCode) q = q.eq('third_party_code', rule.tiersCode);

  const { data: lines, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (lines ?? []) as any[];
  if (rows.length === 0) return { matched: 0 };

  const lineIds = rows.map(l => l.id);
  // Idempotence : supprimer les ventilations existantes de ces lignes
  for (const c of chunk(lineIds, 200)) {
    await client.from('ventilations_analytiques').delete().in('ligne_ecriture_id', c);
  }
  // Insérer les nouvelles ventilations (100% sur la section)
  const ventRows = rows.map(l => ({
    tenant_id: tenantId,
    ligne_ecriture_id: l.id,
    section_id: rule.sectionId,
    pourcentage: 100,
    montant: Math.round(((Number(l.debit) || 0) - (Number(l.credit) || 0)) * 100) / 100,
  }));
  for (const c of chunk(ventRows, 500)) {
    const { error: insErr } = await client.from('ventilations_analytiques').insert(c);
    if (insErr) throw new Error(insErr.message);
  }
  return { matched: rows.length };
}

/** Couverture de ventilation : nb de lignes ventilées sur le total (classes 6/7/2). */
export async function getVentilationCoverage(adapter: DataAdapter): Promise<{ ventilated: number }> {
  const client = getClient(adapter);
  if (!client) return { ventilated: 0 };
  const { count } = await client
    .from('ventilations_analytiques')
    .select('id', { count: 'exact', head: true });
  return { ventilated: count ?? 0 };
}

/** Ventilation agrégée par section : nb de lignes + montant net attribué. */
export async function listVentilationBySection(adapter: DataAdapter): Promise<Map<string, { lignes: number; montant: number }>> {
  const client = getClient(adapter);
  const m = new Map<string, { lignes: number; montant: number }>();
  if (!client) return m;
  const { data } = await client.from('ventilations_analytiques').select('section_id,montant');
  for (const r of (data ?? []) as any[]) {
    const cur = m.get(r.section_id) || { lignes: 0, montant: 0 };
    cur.lignes += 1;
    cur.montant += Number(r.montant) || 0;
    m.set(r.section_id, cur);
  }
  return m;
}

/** Retire TOUTES les ventilations d'une section (annulation). Retourne le nb supprimé. */
export async function clearSectionVentilation(adapter: DataAdapter, sectionId: string): Promise<number> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { count } = await client
    .from('ventilations_analytiques')
    .select('id', { count: 'exact', head: true })
    .eq('section_id', sectionId);
  const { error } = await client.from('ventilations_analytiques').delete().eq('section_id', sectionId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Détail d'une section : montant net réalisé par compte (drill-down). */
export async function getSectionAccountBreakdown(adapter: DataAdapter, sectionId: string): Promise<Array<{ account_code: string; account_name: string; montant: number; lignes: number }>> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client
    .from('ventilations_analytiques')
    .select('montant, journal_lines!inner(account_code,account_name)')
    .eq('section_id', sectionId);
  const byAccount = new Map<string, { account_code: string; account_name: string; montant: number; lignes: number }>();
  for (const r of (data ?? []) as any[]) {
    const jl = Array.isArray(r.journal_lines) ? r.journal_lines[0] : r.journal_lines;
    const code = String(jl?.account_code || '—');
    const cur = byAccount.get(code) || { account_code: code, account_name: jl?.account_name || '', montant: 0, lignes: 0 };
    cur.montant += Number(r.montant) || 0;
    cur.lignes += 1;
    byAccount.set(code, cur);
  }
  return Array.from(byAccount.values()).sort((a, b) => Math.abs(b.montant) - Math.abs(a.montant));
}

/** Performance par section : réalisé (vue) + budget annuel (table).
 * Inclut la répartition SECONDAIRE : les coûts des sections auxiliaires sont
 * déversés sur les principales (charges en coût complet). */
export async function getSectionPerformance(adapter: DataAdapter, annee: string): Promise<SectionPerformance[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const exercice = parseInt(annee, 10);
  const [sections, { data: actual }, { data: transfers }] = await Promise.all([
    listSections(adapter),
    client.from('v_actual_by_section').select('*').eq('annee', annee),
    client.from('fna_secondary_transfer').select('from_section_id,to_section_id,montant').eq('exercice', exercice),
  ]);
  const byCode = new Map<string, { produits: number; charges: number }>();
  for (const r of (actual ?? [])) {
    const code = String(r.section_code);
    if (!byCode.has(code)) byCode.set(code, { produits: 0, charges: 0 });
    const agg = byCode.get(code)!;
    const m = Number(r.montant) || 0;
    if (r.classe === '7') agg.produits += m; else if (r.classe === '6') agg.charges += m;
  }
  // Delta de charges par section (id) issu du secondaire : −sur l'auxiliaire, +sur la principale.
  const deltaById = new Map<string, number>();
  for (const t of (transfers ?? [])) {
    const m = Number(t.montant) || 0;
    deltaById.set(t.from_section_id, (deltaById.get(t.from_section_id) || 0) - m);
    deltaById.set(t.to_section_id, (deltaById.get(t.to_section_id) || 0) + m);
  }
  return sections.map(s => {
    const a = byCode.get(s.code) || { produits: 0, charges: 0 };
    const charges = a.charges + (deltaById.get(s.id) || 0); // coût complet après secondaire
    const resultat = a.produits - charges;
    return { ...s, produits: a.produits, charges, resultat, ecartBudget: resultat - s.budget_annuel };
  });
}
