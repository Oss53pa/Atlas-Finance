/**
 * qualificationService — Analytique · Lot A·1 (CDC §5.4).
 *
 * File de qualification : les lignes de GL (cl. 6/7) non fléchées par aucune
 * règle sont proposées à l'affectation manuelle, promouvables en règle en un
 * clic, ou acceptées sur une section « À QUALIFIER » par défaut.
 *
 * Suggestion : DÉTERMINISTE et ADVISORY — on propose la section déjà affectée
 * manuellement à une ligne du même compte (apprentissage des décisions passées).
 * Aucune affectation automatique n'est jamais posée (contrainte plateforme).
 */
import type { DataAdapter } from '@atlas/data';
import { createRule } from './ventilationRunService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export type QualificationStatut = 'en_attente' | 'affecte' | 'defaut_accepte';

export interface QualificationItem {
  id: string;
  ligne_gl_id: string;
  statut: QualificationStatut;
  section_id: string | null;
  promue_en_regle_id: string | null;
  suggestion: { section_id: string; account_code: string } | null;
  account_code: string | null;
  account_name: string | null;
  label: string | null;
  montant: number;        // FCFA signé (débit - crédit)
}

async function loadLines(client: any, ids: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>();
  for (const c of chunk(ids, 200)) {
    const { data } = await client.from('journal_lines')
      .select('id,account_code,account_name,label,debit,credit').in('id', c);
    for (const l of (data ?? [])) map.set(l.id, l);
  }
  return map;
}

/** Nombre de lignes en attente de qualification (KPI de couverture). */
export async function countQueue(adapter: DataAdapter): Promise<number> {
  const client = getClient(adapter);
  if (!client) return 0;
  const { count } = await client.from('ana_qualification')
    .select('id', { count: 'exact', head: true }).eq('statut', 'en_attente');
  return count ?? 0;
}

/**
 * File de qualification. Renseigne une suggestion advisory par similarité de
 * compte à partir des affectations manuelles déjà validées.
 */
export async function listQueue(adapter: DataAdapter, statut: QualificationStatut = 'en_attente'): Promise<QualificationItem[]> {
  const client = getClient(adapter);
  if (!client) return [];

  const { data: q } = await client.from('ana_qualification')
    .select('id,ligne_gl_id,statut,section_id,promue_en_regle_id')
    .eq('statut', statut).order('created_at').limit(500);
  const rows = q ?? [];
  if (!rows.length) return [];

  // Historique des affectations manuelles → carte account_code → section.
  const { data: aff } = await client.from('ana_qualification')
    .select('ligne_gl_id,section_id').eq('statut', 'affecte').not('section_id', 'is', null).limit(2000);
  const affRows = aff ?? [];

  const lineMap = await loadLines(client, [...new Set([...rows.map((r: any) => r.ligne_gl_id), ...affRows.map((a: any) => a.ligne_gl_id)])]);
  const suggByAccount = new Map<string, string>();
  for (const a of affRows) {
    const code = String(lineMap.get(a.ligne_gl_id)?.account_code || '');
    if (code && !suggByAccount.has(code)) suggByAccount.set(code, a.section_id);
  }

  return rows.map((r: any) => {
    const l = lineMap.get(r.ligne_gl_id) || {};
    const code = l.account_code ?? null;
    const suggSection = code ? suggByAccount.get(code) : undefined;
    return {
      id: r.id,
      ligne_gl_id: r.ligne_gl_id,
      statut: r.statut,
      section_id: r.section_id,
      promue_en_regle_id: r.promue_en_regle_id,
      suggestion: suggSection ? { section_id: suggSection, account_code: code as string } : null,
      account_code: code,
      account_name: l.account_name ?? null,
      label: l.label ?? null,
      montant: Math.round((Number(l.debit) || 0) - (Number(l.credit) || 0)),
    };
  });
}

/** Affecte manuellement une ligne à une section (persiste, ré-appliqué à chaque run). */
export async function assign(adapter: DataAdapter, qualifId: string, sectionId: string, userId?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('ana_qualification').update({
    statut: 'affecte', section_id: sectionId, affecte_par: userId || null,
    affecte_le: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', qualifId);
  if (error) throw new Error(error.message);
}

/**
 * Promeut une affectation manuelle en règle DIRECT (compte → section), pour que
 * les prochains runs couvrent automatiquement ce compte. La ligne doit être
 * affectée au préalable.
 */
export async function promoteToRule(adapter: DataAdapter, qualifId: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data: q } = await client.from('ana_qualification')
    .select('id,ligne_gl_id,section_id').eq('id', qualifId).single();
  if (!q?.section_id) throw new Error('Affecter la ligne à une section avant de promouvoir en règle.');
  const { data: l } = await client.from('journal_lines').select('account_code').eq('id', q.ligne_gl_id).single();
  const code = String(l?.account_code || '').trim();
  if (!code) throw new Error('Compte introuvable pour cette ligne.');
  const ruleId = await createRule(adapter, { type: 'DIRECT', compte_pattern: code, section_id: q.section_id, ordre: 50 });
  const { error } = await client.from('ana_qualification')
    .update({ promue_en_regle_id: ruleId, updated_at: new Date().toISOString() }).eq('id', qualifId);
  if (error) throw new Error(error.message);
}

/** Accepte le reliquat sur une section « À QUALIFIER » par défaut (tracé). */
export async function acceptDefault(adapter: DataAdapter, qualifId: string, defaultSectionId: string, userId?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('ana_qualification').update({
    statut: 'defaut_accepte', section_id: defaultSectionId, affecte_par: userId || null,
    affecte_le: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', qualifId);
  if (error) throw new Error(error.message);
}
