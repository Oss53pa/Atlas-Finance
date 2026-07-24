/**
 * marginService — Marge sur coûts variables & point mort (CDC §8.1).
 *
 * S'appuie sur les ventilations du dernier run (qui portent maintenant le
 * comportement fixe/variable/mixte) : par section, cascade
 *   CA → coûts variables → MCV → coûts fixes (directs + déversés) → marge nette,
 * et point mort = coûts fixes ÷ taux de marge sur coûts variables.
 *
 * Classe du compte déduite de la ligne GL : 7x = produit (CA), 6x = charge
 * (ventilée selon comportement), classe 2 ignorée. Les transferts secondaires
 * (déversement des auxiliaires) sont ajoutés aux coûts fixes des sections
 * réceptrices (coût complet).
 */
import type { DataAdapter } from '@atlas/data';
import { defaultComportement, type Comportement } from './ventilationRunService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export interface SectionMargin {
  section_id: string;
  code: string;
  libelle: string;
  ca: number;
  coutsVariables: number;
  mcv: number;                   // CA − coûts variables
  mcvTauxPct: number;            // MCV / CA (%)
  coutsFixes: number;            // directs + déversés
  margeNette: number;            // MCV − coûts fixes
  pointMort: number | null;      // coûts fixes / taux MCV (en CA), null si taux ≤ 0
}

export interface VentForMargin {
  section_id: string;
  accountClass: string;          // '6' | '7' | '2' | …
  montant: number;               // FCFA signé (débit − crédit)
  comportement: Comportement | null;
  pct_variable: number | null;
  account_code?: string;         // pour dériver le comportement si non renseigné
}

export interface TransferForMargin { from_section_id: string; to_section_id: string; montant: number }

/**
 * Cœur de calcul MCV / point mort. Fonction pure.
 * - Produit (7x) : CA += −montant (produits en crédit → montant négatif).
 * - Charge (6x) : ventilée par comportement (mixte = pct_variable %).
 * - Transferts secondaires : ajoutés aux coûts fixes (reçus) / retirés (émis).
 */
export function computeSectionMargins(
  vents: VentForMargin[],
  transfers: TransferForMargin[],
  meta: Map<string, { code: string; libelle: string }>,
): SectionMargin[] {
  const agg = new Map<string, { ca: number; variable: number; fixe: number }>();
  const ensure = (id: string) => {
    if (!agg.has(id)) agg.set(id, { ca: 0, variable: 0, fixe: 0 });
    return agg.get(id)!;
  };

  for (const v of vents) {
    const a = ensure(v.section_id);
    if (v.accountClass === '7') { a.ca += -v.montant; continue; }
    if (v.accountClass !== '6') continue; // classe 2 et autres ignorées
    const comp: Comportement = v.comportement || defaultComportement(v.account_code || '');
    if (comp === 'variable') a.variable += v.montant;
    else if (comp === 'fixe') a.fixe += v.montant;
    else { // mixte
      const part = (Number(v.pct_variable) || 0) / 100;
      a.variable += v.montant * part;
      a.fixe += v.montant * (1 - part);
    }
  }

  // Déversement secondaire = coûts fixes de structure.
  for (const t of transfers) {
    ensure(t.to_section_id).fixe += t.montant;
    ensure(t.from_section_id).fixe -= t.montant;
  }

  const rows: SectionMargin[] = [];
  for (const [section_id, a] of agg) {
    const ca = Math.round(a.ca);
    const coutsVariables = Math.round(a.variable);
    const coutsFixes = Math.round(a.fixe);
    const mcv = ca - coutsVariables;
    const taux = ca > 0 ? mcv / ca : 0;
    const m = meta.get(section_id);
    rows.push({
      section_id,
      code: m?.code || '—',
      libelle: m?.libelle || section_id,
      ca, coutsVariables, mcv,
      mcvTauxPct: Math.round(taux * 1000) / 10,
      coutsFixes,
      margeNette: mcv - coutsFixes,
      pointMort: taux > 0 ? Math.round(coutsFixes / taux) : null,
    });
  }
  return rows.sort((x, y) => y.ca - x.ca);
}

/** Charge les ventilations du dernier run de l'exercice et calcule MCV / point mort. */
export async function getMarginBySection(adapter: DataAdapter, exercice: number): Promise<SectionMargin[]> {
  const client = getClient(adapter);
  if (!client) return [];

  const { data: runs } = await client.from('fna_allocation_run')
    .select('id').eq('exercice', exercice).order('executed_at', { ascending: false }).limit(1);
  const runId = runs?.[0]?.id;
  if (!runId) return [];

  // Ventilations du run (paginé).
  const vents: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from('ventilations_analytiques')
      .select('section_id,montant,comportement,pct_variable,ligne_ecriture_id')
      .eq('run_id', runId).order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    vents.push(...rows);
    if (rows.length < 1000) break;
  }
  if (vents.length === 0) return [];

  // Classe du compte par ligne GL.
  const lineIds = [...new Set(vents.map(v => v.ligne_ecriture_id))];
  const classOf = new Map<string, string>();
  for (const c of chunk(lineIds, 300)) {
    const { data } = await client.from('journal_lines').select('id,account_code').in('id', c);
    for (const l of (data ?? [])) classOf.set(l.id, String(l.account_code || '?').charAt(0));
  }

  // Sections + transferts secondaires.
  const [{ data: secs }, { data: trans }] = await Promise.all([
    client.from('sections_analytiques').select('id,code,libelle'),
    client.from('fna_secondary_transfer').select('from_section_id,to_section_id,montant').eq('exercice', exercice),
  ]);
  const meta = new Map<string, { code: string; libelle: string }>((secs ?? []).map((s: any) => [s.id, { code: s.code, libelle: s.libelle }]));

  const vForMargin: VentForMargin[] = vents.map(v => ({
    section_id: v.section_id,
    accountClass: classOf.get(v.ligne_ecriture_id) || '?',
    montant: Number(v.montant) || 0,
    comportement: v.comportement ?? null,
    pct_variable: v.pct_variable ?? null,
  }));
  const tForMargin: TransferForMargin[] = (trans ?? []).map((t: any) => ({ from_section_id: t.from_section_id, to_section_id: t.to_section_id, montant: Number(t.montant) || 0 }));

  return computeSectionMargins(vForMargin, tForMargin, meta);
}
