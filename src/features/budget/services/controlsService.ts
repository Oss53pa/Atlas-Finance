/**
 * controlsService — Analytique · Lot A·1 (CDC §6).
 *
 * Contrôles typés C1..C10 attachés à un run de ventilation. A·1 alimente
 * C1..C4/C6 de façon RÉELLE ; C5/C7..C10 sont posés (typés) et complétés en A·3.
 *
 * `evaluateControls` est PURE (aucun accès base) → testable directement et
 * appelée par le moteur avec les données déjà calculées en mémoire.
 * `listControls` relit le rapport persisté pour l'UI.
 */
import type { DataAdapter } from '@atlas/data';

export type ControlCode = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | 'C7' | 'C8' | 'C9' | 'C10';
export type ControlSeverite = 'bloquant' | 'avertissement';
export type ControlResultat = 'ok' | 'ko' | 'na';

export interface ControlResult {
  code: ControlCode;
  severite: ControlSeverite;
  resultat: ControlResultat;
  detail: Record<string, any>;
}

export interface ControlsInput {
  reconcilie: boolean;
  couverturePct: number;
  reliquatCount: number;                        // lignes cl.6/7 non couvertes
  ventRows: Array<{ section_id: string; ligne_ecriture_id: string; montant: number }>;
  transferRows: Array<{ from_section_id: string; to_section_id: string; montant: number }>;
  lineCode: Map<string, string>;                // ligne_ecriture_id → account_code
  sectionMeta: Map<string, { nature: string | null; type_axe: string | null; statut?: string | null }>;
  hasSecondaire: boolean;
}

const isAux = (nature: string | null | undefined): boolean => !!nature && /aux/i.test(nature);

/**
 * Évalue les contrôles à partir du résultat calculé d'un run. Fonction pure.
 * - C3 : cohérence sémantique — un compte de produit (7x) sur un centre de coût,
 *   ou une charge (6x) sur un centre de revenu, est une incohérence bloquante.
 * - C4 : après déversement, chaque section auxiliaire doit être soldée (net = 0).
 */
export function evaluateControls(input: ControlsInput): ControlResult[] {
  const out: ControlResult[] = [];

  // C1 — Réconciliation Σ ventilé = Σ GL assigné.
  out.push({ code: 'C1', severite: 'bloquant', resultat: input.reconcilie ? 'ok' : 'ko',
    detail: { reconcilie: input.reconcilie } });

  // C2 — Couverture : plus aucune ligne cl.6/7 en attente de qualification.
  out.push({ code: 'C2', severite: 'bloquant', resultat: input.reliquatCount === 0 ? 'ok' : 'ko',
    detail: { reliquat: input.reliquatCount, couverture_pct: input.couverturePct } });

  // C3 — Cohérence sémantique axe/classe.
  const c3: Array<{ ligne_id: string; account_code: string; type_axe: string | null }> = [];
  for (const v of input.ventRows) {
    const code = input.lineCode.get(v.ligne_ecriture_id) || '';
    const meta = input.sectionMeta.get(v.section_id);
    if (!meta) continue;
    const t = meta.type_axe;
    if (/^7/.test(code) && t === 'centre_cout') c3.push({ ligne_id: v.ligne_ecriture_id, account_code: code, type_axe: t });
    if (/^6/.test(code) && t === 'centre_revenu') c3.push({ ligne_id: v.ligne_ecriture_id, account_code: code, type_axe: t });
  }
  out.push({ code: 'C3', severite: 'bloquant', resultat: c3.length ? 'ko' : 'ok',
    detail: { count: c3.length, violations: c3.slice(0, 50) } });

  // C4 — Sections auxiliaires soldées après déversement.
  if (!input.hasSecondaire) {
    out.push({ code: 'C4', severite: 'bloquant', resultat: 'na', detail: { note: 'aucune règle SECONDAIRE active' } });
  } else {
    const net = new Map<string, number>();
    for (const v of input.ventRows) {
      const m = input.sectionMeta.get(v.section_id);
      if (isAux(m?.nature)) net.set(v.section_id, (net.get(v.section_id) || 0) + v.montant);
    }
    for (const t of input.transferRows) {
      if (isAux(input.sectionMeta.get(t.from_section_id)?.nature)) net.set(t.from_section_id, (net.get(t.from_section_id) || 0) - t.montant);
      if (isAux(input.sectionMeta.get(t.to_section_id)?.nature)) net.set(t.to_section_id, (net.get(t.to_section_id) || 0) + t.montant);
    }
    const nonSoldees = [...net.entries()].filter(([, v]) => v !== 0).map(([section_id, v]) => ({ section_id, net: v }));
    out.push({ code: 'C4', severite: 'bloquant', resultat: nonSoldees.length ? 'ko' : 'ok', detail: { aux_non_soldees: nonSoldees } });
  }

  // C5 — une section gelée ou close ne doit rien recevoir sur la période.
  const c5 = new Set<string>();
  for (const v of input.ventRows) {
    const st = input.sectionMeta.get(v.section_id)?.statut;
    if (st === 'gelee' || st === 'close') c5.add(v.section_id);
  }
  out.push({ code: 'C5', severite: 'bloquant', resultat: c5.size ? 'ko' : 'ok',
    detail: { sections_verrouillees: [...c5], count: c5.size } });

  // C6 — Σ % d'une règle multi-sections = 100 : pas de règle multi_pct en V1.
  out.push({ code: 'C6', severite: 'bloquant', resultat: 'na', detail: { note: 'pas de règle multi-sections à pourcentages en V1' } });

  // C7..C10 — posés (typés), implémentés en A·3 vague 2 (clés variables, écarts,
  // double validation, plan Projets).
  const stub = (code: ControlCode, severite: ControlSeverite): ControlResult =>
    ({ code, severite, resultat: 'na', detail: { note: 'implémenté en A·3 vague 2' } });
  out.push(stub('C7', 'avertissement'), stub('C8', 'avertissement'),
    stub('C9', 'avertissement'), stub('C10', 'bloquant'));

  return out;
}

/** Vrai s'il existe au moins un contrôle bloquant en échec (interdit la publication). */
export function hasBlockingFailure(controls: ControlResult[]): boolean {
  return controls.some(c => c.severite === 'bloquant' && c.resultat === 'ko');
}

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

/** Relit le rapport de contrôle persisté d'un run (pour l'UI). */
export async function listControls(adapter: DataAdapter, runId: string): Promise<ControlResult[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('ana_controle').select('code,severite,resultat,detail').eq('run_id', runId).order('code');
  return (data ?? []) as ControlResult[];
}
