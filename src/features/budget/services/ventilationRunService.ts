/**
 * ventilationRunService — Contrôle de Gestion · Lot L1 (CDC §6).
 *
 * Moteur de ventilation auditable : reconstruit l'analytique à partir du seul
 * grand livre (non taggé), de façon DÉTERMINISTE, IDEMPOTENTE, RÉCONCILIÉE.
 *
 *  - Règles persistées (fna_allocation_rule) → runs repeatable & auditables.
 *  - Calcul en centimes ENTIERS (jamais de float ; pas de LLM pour un montant).
 *  - Invariant : pour la part fléchée (direct 100 %), Σ ventilé == Σ GL.
 *  - Chaque run écrit une trace immuable (fna_allocation_run) avec hash d'audit.
 *
 * V1 : fléchage DIRECT (compte / journal / libellé / tiers → section). Les
 * répartitions PRIMAIRE/SECONDAIRE (clés, largest-remainder) sont posées au
 * modèle et viendront en L1.1 — le run les ignore tant qu'aucune règle de ce
 * type n'existe, sans rompre la réconciliation.
 */
import type { DataAdapter } from '@atlas/data';
import { largestRemainderAllocate } from '../../../utils/allocation';
import { evaluateControls, type ControlResult } from './controlsService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export type RuleType = 'DIRECT' | 'PRIMAIRE' | 'SECONDAIRE';
export type Comportement = 'fixe' | 'variable' | 'mixte';

export interface AllocationRule {
  id: string;
  type: RuleType;
  ordre: number;
  compte_pattern: string | null;
  journal_pattern: string | null;
  libelle_pattern: string | null;
  tiers_pattern: string | null;
  section_id: string;
  key_id: string | null;
  source_section_id: string | null;
  actif: boolean;
  comportement: Comportement | null;   // null = dériver du compte par nature
  pct_variable: number | null;         // part variable si comportement='mixte'
}

/**
 * Comportement de charge par défaut selon la nature du compte SYSCOHADA
 * (préchargé plateforme, cf. CDC §5.1) : 60x variable, 61x/62x mixte,
 * 63x/64x/66x/68x fixe. Toute autre nature → fixe. Une règle peut surcharger.
 */
export function defaultComportement(accountCode: string): Comportement {
  const c = String(accountCode || '');
  if (c.startsWith('60')) return 'variable';
  if (c.startsWith('61') || c.startsWith('62')) return 'mixte';
  return 'fixe';
}

export interface AllocationKey {
  id: string;
  code: string;
  libelle: string;
  unite: string | null;
  actif: boolean;
}

export interface KeyValue {
  id: string;
  key_id: string;
  section_id: string;
  valeur: number;
}

export interface ReconciliationClasse {
  classe: string;
  montant_gl: number;        // FCFA (depuis centimes)
  montant_ventile: number;
  residu: number;
  couverture_pct: number;
  nb_lignes: number;
  nb_ventilees: number;
}

export interface AllocationRun {
  id: string;
  exercice: number;
  statut: string;
  phase: 'brouillon' | 'simule' | 'controle' | 'publie';
  version_run: number;
  hash_audit: string | null;
  couverture_pct: number;
  montant_gl: number;
  montant_ventile: number;
  nb_lignes_gl: number;
  nb_lignes_ventilees: number;
  reconcilie: boolean;
  detail: { classes: ReconciliationClasse[] } | null;
  executed_at: string;
  publie_le: string | null;
  publie_par: string | null;
}

export interface SecondaryTransfer {
  from_section_id: string;
  to_section_id: string;
  montant: number;
}

export interface RunReport {
  couverture_pct: number;
  montant_gl: number;
  montant_ventile: number;
  residu: number;
  reconcilie: boolean;
  classes: ReconciliationClasse[];
  topNonFleches: Array<{ account_code: string; account_name: string; montant: number }>;
  secondaryTransfers: SecondaryTransfer[];
  secondaryTotal: number;
  runId: string;
  reliquatCount: number;
  controls: ControlResult[];
}

const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

// Hash d'audit déterministe (FNV-1a 32-bit hex) — token de piste d'audit, pas
// un secret. Garantit qu'un même résultat produit le même hash.
function auditHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// ── Règles ───────────────────────────────────────────────────────────────────
export async function listRules(adapter: DataAdapter): Promise<AllocationRule[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_allocation_rule').select('*').order('ordre').order('created_at');
  return (data ?? []) as AllocationRule[];
}

export async function createRule(adapter: DataAdapter, rule: {
  type?: RuleType; ordre?: number; compte_pattern?: string; journal_pattern?: string;
  libelle_pattern?: string; tiers_pattern?: string; section_id: string;
  key_id?: string | null; source_section_id?: string | null;
  comportement?: Comportement | null; pct_variable?: number | null;
}): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.from('fna_allocation_rule').insert({
    tenant_id: tenantOf(adapter),
    type: rule.type || 'DIRECT',
    ordre: rule.ordre ?? 100,
    compte_pattern: rule.compte_pattern?.trim() || null,
    journal_pattern: rule.journal_pattern?.trim() || null,
    libelle_pattern: rule.libelle_pattern?.trim() || null,
    tiers_pattern: rule.tiers_pattern?.trim() || null,
    section_id: rule.section_id,
    key_id: rule.key_id || null,
    source_section_id: rule.source_section_id || null,
    comportement: rule.comportement || null,
    pct_variable: rule.comportement === 'mixte' ? (rule.pct_variable ?? null) : null,
    actif: true,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return (data as any).id as string;
}

/** Met à jour le comportement d'une règle (fixe/variable/mixte + part variable). */
export async function setRuleComportement(
  adapter: DataAdapter, id: string, comportement: Comportement | null, pctVariable?: number | null,
): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_allocation_rule')
    .update({ comportement: comportement || null, pct_variable: comportement === 'mixte' ? (pctVariable ?? null) : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Clés de répartition (primaire/secondaire & ABC) ──────────────────────────
export async function listKeys(adapter: DataAdapter): Promise<AllocationKey[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_allocation_key').select('*').order('code');
  return (data ?? []) as AllocationKey[];
}

export async function createKey(adapter: DataAdapter, key: { code: string; libelle: string; unite?: string }): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_allocation_key').insert({
    tenant_id: tenantOf(adapter), code: key.code.trim(), libelle: key.libelle.trim(), unite: key.unite?.trim() || null, actif: true,
  });
  if (error) throw new Error(error.message);
}

export async function deleteKey(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_allocation_key').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listKeyValues(adapter: DataAdapter, keyId: string): Promise<KeyValue[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_allocation_key_value').select('*').eq('key_id', keyId);
  return (data ?? []).map((v: any) => ({ ...v, valeur: Number(v.valeur) || 0 })) as KeyValue[];
}

/** Upsert d'une valeur de clé pour une section (poids de répartition). */
export async function setKeyValue(adapter: DataAdapter, keyId: string, sectionId: string, valeur: number): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_allocation_key_value')
    .upsert({ tenant_id: tenantOf(adapter), key_id: keyId, section_id: sectionId, valeur }, { onConflict: 'key_id,section_id' });
  if (error) throw new Error(error.message);
}

export async function deleteRule(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_allocation_rule').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function toggleRule(adapter: DataAdapter, id: string, actif: boolean): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_allocation_rule').update({ actif }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Historique des runs ──────────────────────────────────────────────────────
export async function listRuns(adapter: DataAdapter, limit = 10): Promise<AllocationRun[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_allocation_run').select('*').order('executed_at', { ascending: false }).limit(limit);
  return (data ?? []).map((r: any) => ({
    ...r,
    couverture_pct: Number(r.couverture_pct) || 0,
    montant_gl: (Number(r.montant_gl) || 0) / 100,
    montant_ventile: (Number(r.montant_ventile) || 0) / 100,
  })) as AllocationRun[];
}

/**
 * Publie un run : le fige (immuable via RLS). Refusé si un contrôle BLOQUANT est
 * en échec (CDC §5.4/§7). Après publication, tout nouveau run exige justification.
 */
export async function publishRun(adapter: DataAdapter, runId: string, publishedBy?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data: ctrls } = await client.from('ana_controle').select('severite,resultat').eq('run_id', runId);
  const blocking = (ctrls ?? []).some((c: any) => c.severite === 'bloquant' && c.resultat === 'ko');
  if (blocking) throw new Error('Publication interdite : au moins un contrôle bloquant est en échec.');
  const { error } = await client.from('fna_allocation_run')
    .update({ phase: 'publie', publie_le: new Date().toISOString(), publie_par: publishedBy || null })
    .eq('id', runId);
  if (error) throw new Error(error.message);
}

// Lecture des lignes de GL analytiques (classes 2/6/7) de l'exercice, paginée
// (PostgREST tronque à 1000 → on boucle en .range).
async function loadGlLines(client: any, exercice: number): Promise<any[]> {
  const start = `${exercice}-01-01`;
  const end = `${exercice}-12-31`;
  const all: any[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('journal_lines')
      .select('id,account_code,account_name,label,debit,credit,third_party_code,journal_entries!inner(journal,label,status,date)')
      .in('journal_entries.status', ['validated', 'posted'])
      .gte('journal_entries.date', start)
      .lte('journal_entries.date', end)
      .or('account_code.like.2*,account_code.like.6*,account_code.like.7*')
      .order('id', { ascending: true }) // tri déterministe : pagination fiable (sinon lignes dupliquées/omises)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

// Première règle d'un type donné correspondant à une ligne (ordre croissant).
function matchRuleOfType(line: any, rules: AllocationRule[], type: RuleType): AllocationRule | null {
  const code = String(line.account_code || '');
  const journal = String(line.journal_entries?.journal || '');
  const libelle = `${line.label || ''} ${line.journal_entries?.label || ''}`.toLowerCase();
  const tiers = String(line.third_party_code || '');
  for (const r of rules) {
    if (!r.actif || r.type !== type) continue;
    if (r.compte_pattern && !code.startsWith(r.compte_pattern)) continue;
    if (r.journal_pattern && journal !== r.journal_pattern) continue;
    if (r.libelle_pattern && !libelle.includes(r.libelle_pattern.toLowerCase())) continue;
    if (r.tiers_pattern && tiers !== r.tiers_pattern) continue;
    return r;
  }
  return null;
}

/**
 * Lance un run de ventilation sur l'exercice : applique les règles DIRECT au GL
 * réel, écrit les ventilations (idempotent), calcule couverture & réconciliation,
 * trace le run (immuable). Renvoie le rapport.
 */
export async function runVentilation(adapter: DataAdapter, exercice: number, executedBy?: string | null, justification?: string | null): Promise<RunReport> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = tenantOf(adapter);

  // Versionnage & garde de re-run : après publication, un nouveau run exige une
  // justification (le run publié reste immuable). Version incrémentée par exercice.
  const { data: priorRuns } = await client.from('fna_allocation_run')
    .select('version_run,phase').eq('exercice', exercice).order('version_run', { ascending: false }).limit(1);
  const versionRun = ((priorRuns?.[0]?.version_run as number) || 0) + 1;
  const { data: publishedRuns } = await client.from('fna_allocation_run')
    .select('id').eq('exercice', exercice).eq('phase', 'publie').limit(1);
  if ((publishedRuns?.length ?? 0) > 0 && !(justification && justification.trim())) {
    throw new Error('Une version publiée existe pour cet exercice : une justification est requise pour lancer un nouveau run.');
  }
  // Id de run généré côté client : fna_allocation_run est INSERT-ONLY en RLS (pas
  // d'UPDATE possible), donc on calcule tout en mémoire puis on insère le run
  // AVANT les ventilations (contrainte FK ventilations.run_id → run).
  const runId: string = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const [rules, lines] = await Promise.all([listRules(adapter), loadGlLines(client, exercice)]);

  // Affectations manuelles persistées (file de qualification) : ré-appliquées à
  // chaque run tant qu'aucune règle ne couvre la ligne. Clé = ligne_gl_id.
  const { data: qData } = await client.from('ana_qualification')
    .select('ligne_gl_id,section_id').eq('statut', 'affecte').not('section_id', 'is', null);
  const manualMap = new Map<string, string>((qData ?? []).map((q: any) => [q.ligne_gl_id, q.section_id]));

  // Méta sections (nature, statut) + axes (type sémantique) pour C3/C4/C5.
  const [{ data: secData }, { data: axeData }] = await Promise.all([
    client.from('sections_analytiques').select('id,axe_id,nature,statut'),
    client.from('axes_analytiques').select('id,type_axe'),
  ]);
  const axeType = new Map<string, string | null>((axeData ?? []).map((a: any) => [a.id, a.type_axe ?? null]));
  const sectionMeta = new Map<string, { nature: string | null; type_axe: string | null; statut?: string | null }>(
    (secData ?? []).map((s: any) => [s.id, { nature: s.nature ?? null, type_axe: axeType.get(s.axe_id) ?? null, statut: s.statut ?? null }]));

  // Montant analytique en centimes entiers (debit - credit).
  const cents = (l: any) => Math.round(((Number(l.debit) || 0) - (Number(l.credit) || 0)) * 100);

  const lineIds = lines.map(l => l.id);

  // Charge les valeurs des clés utilisées par les règles PRIMAIRE et SECONDAIRE.
  const primaireRules = rules.filter(r => r.actif && r.type === 'PRIMAIRE' && r.key_id);
  const secondaireRules = rules.filter(r => r.actif && r.type === 'SECONDAIRE' && r.key_id && r.source_section_id);
  const keyWeightsMap = new Map<string, KeyValue[]>();
  for (const kid of new Set([...primaireRules, ...secondaireRules].map(r => r.key_id!))) {
    keyWeightsMap.set(kid, (await listKeyValues(adapter, kid)).filter(w => w.valeur > 0));
  }

  const lineFcfa = (l: any) => Math.round((Number(l.debit) || 0) - (Number(l.credit) || 0));
  // Comportement résolu : override de règle sinon nature du compte.
  const compOf = (l: any, r: AllocationRule | null): { comportement: Comportement; pct_variable: number | null } => {
    const comp = (r?.comportement as Comportement | null) || defaultComportement(l.account_code);
    return { comportement: comp, pct_variable: comp === 'mixte' ? (r?.pct_variable ?? null) : null };
  };
  const ventRows: any[] = [];
  const assigned = new Set<string>();

  // Stage 1 — fléchage DIRECT (100 % sur une section).
  for (const l of lines) {
    const r = matchRuleOfType(l, rules, 'DIRECT');
    if (!r) continue;
    assigned.add(l.id);
    const { comportement, pct_variable } = compOf(l, r);
    ventRows.push({ tenant_id: tenantId, run_id: runId, ligne_ecriture_id: l.id, section_id: r.section_id, pourcentage: 100, montant: lineFcfa(l), etage: 'direct', regle_id: r.id, comportement, pct_variable });
  }

  // Stage 2 — répartition PRIMAIRE du résidu (charges indirectes) par clé,
  // méthode du plus fort reste → Σ parts == montant ligne (exact, zéro fuite).
  for (const l of lines) {
    if (assigned.has(l.id)) continue;
    const r = matchRuleOfType(l, primaireRules, 'PRIMAIRE');
    if (!r || !r.key_id) continue;
    const weights = keyWeightsMap.get(r.key_id) || [];
    if (weights.length === 0) continue;
    const fcfa = lineFcfa(l);
    const { comportement, pct_variable } = compOf(l, r);
    const parts = largestRemainderAllocate(fcfa, weights.map(w => w.valeur));
    weights.forEach((w, i) => {
      if (parts[i] === 0) return;
      // La colonne `pourcentage` a une contrainte CHECK (pourcentage > 0 AND <= 100) et est
      // NUMERIC(5,2). Un pourcentage négatif (produits cl.7, fcfa < 0) ou < 0,005 (arrondi à
      // 0,00) ferait ÉCHOUER l'insert. On clampe en [0,01 ; 100] (valeur absolue). Le `montant`
      // signé reste la source de vérité ; le pourcentage n'est qu'indicatif.
      const pct = fcfa !== 0 ? Math.abs((parts[i] / fcfa) * 100) : 100;
      ventRows.push({ tenant_id: tenantId, run_id: runId, ligne_ecriture_id: l.id, section_id: w.section_id, pourcentage: Math.min(100, Math.max(0.01, Math.round(pct * 100) / 100)), montant: parts[i], etage: 'primaire', regle_id: r.id, comportement, pct_variable });
    });
    assigned.add(l.id);
  }

  // Stage 2bis — affectation MANUELLE persistée : les lignes non couvertes par une
  // règle mais déjà qualifiées à la main sont ré-appliquées (100 % sur la section).
  for (const l of lines) {
    if (assigned.has(l.id)) continue;
    const sectionId = manualMap.get(l.id);
    if (!sectionId) continue;
    assigned.add(l.id);
    const { comportement, pct_variable } = compOf(l, null);
    ventRows.push({ tenant_id: tenantId, run_id: runId, ligne_ecriture_id: l.id, section_id: sectionId, pourcentage: 100, montant: lineFcfa(l), etage: 'manuel', regle_id: null, comportement, pct_variable });
  }

  // Reliquat : lignes attribuables (cl. 6/7) ni fléchées ni qualifiées → file.
  const reliquatRows = lines
    .filter(l => !assigned.has(l.id) && /^[67]/.test(String(l.account_code || '')))
    .map(l => ({ tenant_id: tenantId, run_id: runId, ligne_gl_id: l.id, statut: 'en_attente' }));

  // Stage 3 — SECONDAIRE (méthode step-down) : déverse le pool de coûts de chaque
  // section auxiliaire sur les principales par clé. Transferts section→section de
  // somme nulle (l'invariant per-ligne reste intact). Cascade dans l'ordre des règles.
  const poolBySection = new Map<string, number>();
  for (const v of ventRows) poolBySection.set(v.section_id, (poolBySection.get(v.section_id) || 0) + v.montant);
  const transferRows: any[] = [];
  for (const r of secondaireRules) {
    const pool = poolBySection.get(r.source_section_id!) || 0;
    if (pool <= 0) continue;
    const weights = (keyWeightsMap.get(r.key_id!) || []).filter(w => w.section_id !== r.source_section_id && w.valeur > 0);
    if (weights.length === 0) continue;
    const parts = largestRemainderAllocate(pool, weights.map(w => w.valeur));
    weights.forEach((w, i) => {
      if (parts[i] === 0) return;
      transferRows.push({ tenant_id: tenantId, exercice, from_section_id: r.source_section_id, to_section_id: w.section_id, montant: parts[i] });
      poolBySection.set(w.section_id, (poolBySection.get(w.section_id) || 0) + parts[i]);
    });
    poolBySection.set(r.source_section_id!, 0); // auxiliaire vidée
  }

  // Réconciliation par classe (centimes entiers, valeurs absolues pour la couverture).
  const ventSet = new Set(ventRows.map(v => v.ligne_ecriture_id));
  const byClasse = new Map<string, ReconciliationClasse>();
  const ensure = (cl: string) => {
    if (!byClasse.has(cl)) byClasse.set(cl, { classe: cl, montant_gl: 0, montant_ventile: 0, residu: 0, couverture_pct: 0, nb_lignes: 0, nb_ventilees: 0 });
    return byClasse.get(cl)!;
  };
  const nonFleches = new Map<string, { account_code: string; account_name: string; montant: number }>();
  let totGlCents = 0, totVentCents = 0;
  for (const l of lines) {
    const cl = String(l.account_code || '?').charAt(0);
    const c = cents(l);
    const abs = Math.abs(c);
    const e = ensure(cl);
    e.montant_gl += abs; e.nb_lignes += 1; totGlCents += abs;
    if (ventSet.has(l.id)) { e.montant_ventile += abs; e.nb_ventilees += 1; totVentCents += abs; }
    else {
      const key = String(l.account_code || '');
      if (!nonFleches.has(key)) nonFleches.set(key, { account_code: key, account_name: String(l.account_name || ''), montant: 0 });
      nonFleches.get(key)!.montant += abs / 100;
    }
  }
  const classes = Array.from(byClasse.values()).map(e => ({
    ...e,
    montant_gl: e.montant_gl / 100,
    montant_ventile: e.montant_ventile / 100,
    residu: (e.montant_gl - e.montant_ventile) / 100,
    couverture_pct: e.montant_gl > 0 ? +((e.montant_ventile / e.montant_gl) * 100).toFixed(1) : 0,
  })).sort((a, b) => a.classe.localeCompare(b.classe));

  const couverture = totGlCents > 0 ? +((totVentCents / totGlCents) * 100).toFixed(1) : 0;
  // Réconciliation RÉELLE : la somme des montants ventilés (ce qui est écrit en
  // base) doit égaler EXACTEMENT la somme des soldes GL des lignes assignées
  // (aucune fuite d'allocation). Le plus fort reste garantit l'égalité par ligne
  // → diff attendue = 0 ; sinon le run est marqué 'failed'.
  const sumVentMontant = ventRows.reduce((s, v) => s + (Number(v.montant) || 0), 0);
  const sumAssignedGl = lines.filter(l => assigned.has(l.id)).reduce((s, l) => s + lineFcfa(l), 0);
  const reconcilie = sumVentMontant === sumAssignedGl;
  const hash = auditHash([exercice, totGlCents, totVentCents, ventRows.length, rules.filter(r => r.actif).length].join('|'));

  const detail = { classes };

  // ── Persistance ordonnée ───────────────────────────────────────────────────
  // 1) Idempotence : purge du périmètre (ventilations + reliquat en_attente ; les
  //    affectations manuelles 'affecte' sont conservées). Transferts de l'exercice.
  for (const c of chunk(lineIds, 200)) {
    await client.from('ventilations_analytiques').delete().in('ligne_ecriture_id', c);
    await client.from('ana_qualification').delete().eq('statut', 'en_attente').in('ligne_gl_id', c);
  }
  await client.from('fna_secondary_transfer').delete().eq('exercice', exercice);

  // 2) Run inséré AVANT les ventilations (FK ventilations.run_id → run). Id explicite.
  {
    const { error } = await client.from('fna_allocation_run').insert({
      id: runId,
      tenant_id: tenantId,
      exercice,
      statut: reconcilie ? 'success' : 'failed',
      phase: 'simule',
      version_run: versionRun,
      justification_rerun: justification?.trim() || null,
      hash_audit: hash,
      couverture_pct: couverture,
      montant_gl: totGlCents,
      montant_ventile: totVentCents,
      nb_lignes_gl: lines.length,
      nb_lignes_ventilees: assigned.size,
      reconcilie,
      detail,
      executed_by: executedBy || null,
    });
    if (error) throw new Error(error.message);
  }

  // 3) Ventilations, transferts, reliquat.
  for (const c of chunk(ventRows, 500)) {
    const { error } = await client.from('ventilations_analytiques').insert(c);
    if (error) throw new Error(error.message);
  }
  for (const c of chunk(transferRows, 500)) {
    if (!c.length) continue;
    const { error } = await client.from('fna_secondary_transfer').insert(c);
    if (error) throw new Error(error.message);
  }
  for (const c of chunk(reliquatRows, 500)) {
    if (!c.length) continue;
    // ignoreDuplicates : ne pas écraser une éventuelle affectation manuelle existante.
    const { error } = await client.from('ana_qualification')
      .upsert(c, { onConflict: 'tenant_id,ligne_gl_id', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  // 4) Contrôles typés C1..C10 (rapport attaché au run).
  const lineCode = new Map<string, string>(lines.map(l => [l.id, String(l.account_code || '')]));
  const controls = evaluateControls({
    reconcilie, couverturePct: couverture, reliquatCount: reliquatRows.length,
    ventRows, transferRows, lineCode, sectionMeta, hasSecondaire: secondaireRules.length > 0,
  });
  {
    const rows = controls.map(c => ({ tenant_id: tenantId, run_id: runId, code: c.code, severite: c.severite, resultat: c.resultat, detail: c.detail }));
    const { error } = await client.from('ana_controle').insert(rows);
    if (error) throw new Error(error.message);
  }

  const topNonFleches = Array.from(nonFleches.values()).sort((a, b) => b.montant - a.montant).slice(0, 12);
  const secondaryTransfers: SecondaryTransfer[] = transferRows.map(t => ({ from_section_id: t.from_section_id, to_section_id: t.to_section_id, montant: t.montant }));
  return {
    couverture_pct: couverture,
    montant_gl: totGlCents / 100,
    montant_ventile: totVentCents / 100,
    residu: (totGlCents - totVentCents) / 100,
    reconcilie,
    classes,
    topNonFleches,
    secondaryTransfers,
    secondaryTotal: secondaryTransfers.reduce((s, t) => s + t.montant, 0),
    runId,
    reliquatCount: reliquatRows.length,
    controls,
  };
}

/** Transferts secondaires courants (auxiliaire → principale) pour un exercice. */
export async function getSecondaryTransfers(adapter: DataAdapter, exercice: number): Promise<SecondaryTransfer[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_secondary_transfer').select('from_section_id,to_section_id,montant').eq('exercice', exercice);
  return (data ?? []).map((t: any) => ({ from_section_id: t.from_section_id, to_section_id: t.to_section_id, montant: Number(t.montant) || 0 }));
}

/** Réconciliation courante (sans relancer) depuis la vue live. */
export async function getReconciliation(adapter: DataAdapter, annee: string): Promise<ReconciliationClasse[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('v_ventilation_reconciliation').select('*').eq('annee', annee);
  const byClasse = new Map<string, ReconciliationClasse>();
  for (const r of (data ?? [])) {
    const cl = String(r.classe);
    if (!byClasse.has(cl)) byClasse.set(cl, { classe: cl, montant_gl: 0, montant_ventile: 0, residu: 0, couverture_pct: 0, nb_lignes: 0, nb_ventilees: 0 });
    const e = byClasse.get(cl)!;
    e.montant_gl += Math.abs(Number(r.montant_gl) || 0);
    e.nb_lignes += Number(r.nb_lignes) || 0;
    e.nb_ventilees += Number(r.nb_ventile_lignes) || 0;
  }
  return Array.from(byClasse.values()).map(e => ({
    ...e,
    couverture_pct: e.nb_lignes > 0 ? +((e.nb_ventilees / e.nb_lignes) * 100).toFixed(1) : 0,
    residu: e.montant_gl - e.montant_ventile,
  })).sort((a, b) => a.classe.localeCompare(b.classe));
}
