/**
 * Service collaboration — ESPACES DE RÉSOLUTION (CDC v1.0).
 * Espaces (problème/objectif/ancrage/convergence/critères/solutions/échéances),
 * fil d'événements TYPÉS append-only (message/décision/écriture/snapshot/système),
 * gouvernance par seuils, snapshots hashés, clôture opposable. Présence + non-lus.
 * Persisté via DataAdapter (Dexie local / Supabase SaaS). Aucun calcul par LLM :
 * convergence & critères sont dérivés du grand livre en code déterministe.
 */
import type { DataAdapter } from '@atlas/data';
import type {
  DBCollabChannel, DBCollabMessage, DBCollabPresence, DBCollabDocument, DBJournalEntry,
} from '../../../lib/db';
import type {
  Space, SpaceEvent, Presence, PresenceStatus, EventType, ExitCriterion,
  DecisionPayload, EcriturePayload, SnapshotPayload, Solution, Milestone,
  SpaceAnchor, SpaceStatus, GovernanceRule,
} from '../types';
import { requiredRoleFor, DEFAULT_GOVERNANCE } from '../types';

const now = () => new Date().toISOString();
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`);
const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

async function sha256(text: string): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch { return uid().replace(/-/g, ''); }
}

// ── SOLDE D'UN COMPTE (pour convergence & critères auto, requête GL) ──────────

async function accountBalance(adapter: DataAdapter, accountCode: string): Promise<number> {
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  let bal = 0;
  for (const e of entries as any[]) {
    if (e.status === 'draft') continue;
    for (const l of (e.lines || [])) {
      if (String(l.accountCode || '').startsWith(accountCode)) bal += (l.debit || 0) - (l.credit || 0);
    }
  }
  return bal;
}

// ── RECHERCHE DE PIÈCES GL (composeur « Écriture » — lien pièce réelle) ───────

export interface EntryHit { id: string; entryNumber: string; journal?: string; date?: string; accounts: string; amount: number; }
export async function searchJournalEntries(adapter: DataAdapter, query: string, limit = 8): Promise<EntryHit[]> {
  const q = query.trim().toLowerCase();
  const entries = await adapter.getAll<DBJournalEntry>('journalEntries');
  const hits: EntryHit[] = [];
  for (const e of entries as any[]) {
    if (e.status === 'draft') continue;
    const num = String(e.entryNumber || e.pieceNumber || e.id || '');
    const lines = e.lines || [];
    const accs = lines.map((l: any) => String(l.accountCode || '')).filter(Boolean);
    const label = String(e.label || e.description || '');
    const hay = `${num} ${label} ${accs.join(' ')} ${e.journal || ''}`.toLowerCase();
    if (q && !hay.includes(q)) continue;
    const amount = lines.reduce((s: number, l: any) => s + (l.debit || 0), 0);
    hits.push({
      id: e.id, entryNumber: num, journal: e.journal, date: e.date,
      accounts: [...new Set(accs)].slice(0, 4).join(' / '), amount,
    });
    if (hits.length >= limit) break;
  }
  return hits;
}

// ── ESPACES ──────────────────────────────────────────────────────────────────

function toSpace(c: DBCollabChannel): Space {
  return {
    id: c.id, tenantId: c.tenantId, title: c.name, problem: c.problem || '', objective: c.objective || '',
    responsibleId: c.responsibleId, responsibleName: c.responsibleName, deadline: c.deadline,
    status: (c.status as SpaceStatus) || 'ouvert', convergence: c.convergence, convergenceBp: c.convergenceBp,
    exitCriteria: c.exitCriteria || [], solutions: c.solutions || [], milestones: c.milestones || [],
    anchors: c.anchors || [], decisionSeq: c.decisionSeq,
    linkedType: c.linkedType, linkedId: c.linkedId, linkedLabel: c.linkedLabel, linkedPath: c.linkedPath,
    abandonReason: c.abandonReason, abandonedAt: c.abandonedAt, abandonedBy: c.abandonedBy,
    createdBy: c.createdBy, createdAt: c.createdAt, updatedAt: c.updatedAt,
    closedAt: c.closedAt, closureHash: c.closureHash, archived: c.archived,
  };
}

const isLate = (s: Space) => !!s.deadline && s.status !== 'resolu' && s.status !== 'archive' && s.deadline < now().slice(0, 10);
const rank = (s: SpaceStatus) => ({ ouvert: 0, analyse: 1, action: 2, resolu: 3, archive: 4, abandonne: 5 }[s] ?? 0);

export async function listSpaces(adapter: DataAdapter, tenantId: string): Promise<Space[]> {
  const all = await adapter.getAll<DBCollabChannel>('collabChannels');
  return (all as DBCollabChannel[])
    .filter(c => c.tenantId === tenantId && c.type === 'space')
    .map(toSpace)
    .sort((a, b) => rank(a.status) - rank(b.status) || b.updatedAt.localeCompare(a.updatedAt));
}

export async function getSpace(adapter: DataAdapter, id: string): Promise<Space | null> {
  const c = await adapter.getById<DBCollabChannel>('collabChannels', id).catch(() => null);
  return c ? toSpace(c) : null;
}

/** Objet → Espace : retrouve les espaces ancrés à un objet métier (CDC §4.1). */
export interface AnchorMatch { accountCode?: string; partnerId?: string; entryId?: string; period?: string; }
export async function findSpacesForAnchor(adapter: DataAdapter, tenantId: string, match: AnchorMatch): Promise<Space[]> {
  const spaces = await listSpaces(adapter, tenantId);
  return spaces.filter(s => (s.anchors || []).some(a => {
    const r = (a.ref || {}) as Record<string, any>;
    if (match.accountCode && r.accountCode && String(r.accountCode).startsWith(match.accountCode)) return true;
    if (match.partnerId && r.partnerId && String(r.partnerId) === match.partnerId) return true;
    if (match.entryId && r.entryId && String(r.entryId) === match.entryId) return true;
    return false;
  }) || (match.accountCode && s.linkedId === match.accountCode));
}

export async function createSpace(adapter: DataAdapter, data: {
  tenantId: string; title: string; problem: string; objective: string; createdBy: string;
  responsibleId?: string; responsibleName?: string; deadline?: string;
  convergence?: Space['convergence']; exitCriteria?: ExitCriterion[]; anchors?: SpaceAnchor[];
  linkedType?: string; linkedId?: string; linkedLabel?: string; linkedPath?: string;
}): Promise<Space> {
  const primary = data.anchors?.find(a => a.isPrimary) || data.anchors?.[0];
  const milestone: Milestone = { id: uid(), date: now().slice(0, 10), label: 'Ouverture de l\'espace', state: 'done' };
  const c = await adapter.create<DBCollabChannel>('collabChannels', {
    id: uid(), tenantId: data.tenantId, name: data.title, type: 'space',
    problem: data.problem, objective: data.objective, responsibleId: data.responsibleId,
    responsibleName: data.responsibleName, deadline: data.deadline, status: 'ouvert',
    convergence: data.convergence, exitCriteria: data.exitCriteria || [], solutions: [],
    milestones: [milestone], anchors: data.anchors || [], decisionSeq: 0,
    linkedType: data.linkedType || primary?.type, linkedId: data.linkedId,
    linkedLabel: data.linkedLabel || primary?.label, linkedPath: data.linkedPath || primary?.path,
    createdBy: data.createdBy, createdAt: now(), updatedAt: now(),
  } as DBCollabChannel);
  const space = toSpace(c);
  // Snapshot de référence + convergence initiale figée.
  const conv = await computeConvergence(adapter, space);
  await adapter.update<DBCollabChannel>('collabChannels', space.id, { convergenceBp: conv.bp }).catch(() => {});
  await postSystem(adapter, { spaceId: space.id, tenantId: data.tenantId, body: `Espace ouvert · convergence initiale ${(conv.bp / 100).toFixed(0)} %` });
  return { ...space, convergenceBp: conv.bp };
}

export async function updateSpace(adapter: DataAdapter, id: string, patch: Partial<Space>): Promise<Space> {
  const upd: Partial<DBCollabChannel> = { updatedAt: now() };
  if (patch.title !== undefined) upd.name = patch.title;
  for (const k of ['problem', 'objective', 'responsibleId', 'responsibleName', 'deadline', 'status',
    'convergence', 'convergenceBp', 'exitCriteria', 'solutions', 'milestones', 'anchors', 'decisionSeq',
    'abandonReason', 'abandonedAt', 'abandonedBy', 'closedAt', 'closureHash'] as const) {
    if ((patch as any)[k] !== undefined) (upd as any)[k] = (patch as any)[k];
  }
  const c = await adapter.update<DBCollabChannel>('collabChannels', id, upd);
  return toSpace(c);
}

/** Transition de statut (événement système), avec verrous CDC §2.1. */
export async function transitionSpace(adapter: DataAdapter, space: Space, to: SpaceStatus, opts?: { reason?: string }): Promise<Space> {
  if (to === 'abandonne' && !opts?.reason) throw new Error('Motif obligatoire pour abandonner un espace.');
  const patch: Partial<Space> = { status: to };
  if (to === 'abandonne') patch.abandonReason = opts?.reason;
  const updated = await updateSpace(adapter, space.id, patch);
  await postSystem(adapter, { spaceId: space.id, tenantId: space.tenantId, body: `Statut → ${to}${opts?.reason ? ' · ' + opts.reason : ''}` });
  return updated;
}

/**
 * ABANDON MANUEL (CDC §2.1 · sortie sans résolution). Retire un espace obsolète,
 * en double ou non résolu de la vue active, SANS clôture opposable ni rapport
 * scellé (réservés à la résolution via closeSpace). Le motif est optionnel ;
 * l'auteur et la date sont tracés pour l'audit. Un espace abandonné est en
 * lecture seule et réactivable (reactivateSpace).
 */
export async function abandonSpace(adapter: DataAdapter, space: Space, by: { id: string; name: string }, reason?: string): Promise<Space> {
  const updated = await updateSpace(adapter, space.id, {
    status: 'abandonne', abandonedAt: now(), abandonedBy: by.id,
    abandonReason: reason?.trim() || undefined,
  });
  await postSystem(adapter, {
    spaceId: space.id, tenantId: space.tenantId,
    body: `Espace abandonné par ${by.name}${reason?.trim() ? ' · motif : ' + reason.trim() : ' · sans motif'} (arrêt manuel, sans rapport de clôture)`,
  });
  return updated;
}

/**
 * RÉACTIVATION d'un espace abandonné → le remet dans la vue active. Restaure un
 * statut cohérent avec l'avancement (solution retenue → action, solutions → analyse,
 * sinon ouvert) et purge les marqueurs d'abandon. Sans effet sur un espace archivé
 * (clôture opposable — irréversible).
 */
export async function reactivateSpace(adapter: DataAdapter, space: Space, by: { id: string; name: string }): Promise<Space> {
  if (space.status !== 'abandonne') throw new Error('Seul un espace abandonné peut être réactivé.');
  const solutions = space.solutions || [];
  const to: SpaceStatus = solutions.some(s => s.state === 'kept') ? 'action'
    : solutions.length > 0 ? 'analyse' : 'ouvert';
  // Écriture directe : updateSpace ignore les clés undefined, or il faut VIDER
  // (null) les marqueurs d'abandon en base pour sortir proprement de l'état.
  const c = await adapter.update<DBCollabChannel>('collabChannels', space.id, {
    status: to, abandonedAt: null, abandonedBy: null, abandonReason: null, updatedAt: now(),
  } as any);
  const updated = toSpace(c);
  await postSystem(adapter, {
    spaceId: space.id, tenantId: space.tenantId,
    body: `Espace réactivé par ${by.name} · statut → ${to}`,
  });
  return updated;
}

// ── CONVERGENCE (calculée, jamais saisie — CDC §5) ────────────────────────────

export interface ConvergenceResult { pct: number; bp: number; currentGap: number; initialGap: number; formula: string; }

export async function computeConvergence(adapter: DataAdapter, space: Space): Promise<ConvergenceResult> {
  const cfg = space.convergence;
  // Défaut : critères satisfaits / critères totaux (CDC §5.2).
  if (!cfg) {
    const crit = await evaluateExitCriteria(adapter, space);
    const total = crit.length || 0;
    const met = crit.filter(c => c.met).length;
    const bp = total > 0 ? Math.floor(met * 10000 / total) : (space.status === 'archive' ? 10000 : 0);
    return { pct: Math.round(bp / 100), bp, currentGap: total - met, initialGap: total, formula: `${met}/${total} critères satisfaits` };
  }
  const currentGap = cfg.source.kind === 'manual'
    ? Math.abs(cfg.source.currentGap)
    : Math.abs(await accountBalance(adapter, cfg.source.accountCode));
  const initialGap = Math.abs(cfg.initialGap || 0);
  // Points de base (bigint-like) : 10000 − (écart_restant × 10000 / écart_initial).
  const bp = initialGap > 0
    ? Math.max(0, Math.min(10000, 10000 - Math.floor(currentGap * 10000 / initialGap)))
    : (currentGap === 0 ? 10000 : 0);
  return {
    pct: Math.round(bp / 100), bp, currentGap, initialGap,
    formula: `10000 − (écart_restant ${fmt(currentGap)} × 10000 / écart_initial ${fmt(initialGap)})`,
  };
}

/** Recalcule la convergence depuis le GL et la fige (bp) sur l'espace. */
export async function refreshConvergence(adapter: DataAdapter, space: Space): Promise<ConvergenceResult> {
  const conv = await computeConvergence(adapter, space);
  await adapter.update<DBCollabChannel>('collabChannels', space.id, { convergenceBp: conv.bp, updatedAt: now() }).catch(() => {});
  return conv;
}

/** Recalcule les critères de sortie « calculés » (compte à solder) depuis le GL. */
export async function evaluateExitCriteria(adapter: DataAdapter, space: Space): Promise<ExitCriterion[]> {
  const out: ExitCriterion[] = [];
  for (const c of space.exitCriteria || []) {
    if (c.auto?.kind === 'account_zero') {
      const bal = Math.abs(await accountBalance(adapter, c.auto.accountCode));
      out.push({ ...c, met: bal < 1, value: bal < 1 ? '0 · justifié' : fmt(bal) });
    } else out.push(c);
  }
  return out;
}

/** Passe un critère manuel à satisfait (valideur tracé + événement). */
export async function satisfyCriterion(adapter: DataAdapter, space: Space, criterionId: string, by: { id: string; name: string }): Promise<Space> {
  const exitCriteria = (space.exitCriteria || []).map(c => c.id === criterionId ? { ...c, met: true, value: `validé · ${by.name}` } : c);
  const updated = await updateSpace(adapter, space.id, { exitCriteria });
  const crit = exitCriteria.find(c => c.id === criterionId);
  await postSystem(adapter, { spaceId: space.id, tenantId: space.tenantId, body: `Critère satisfait : ${crit?.label || ''} (${by.name})` });
  await refreshConvergence(adapter, updated);
  return updated;
}

// ── CLÔTURE (rapport opposable hashé — CDC §2.1, §10) ─────────────────────────

export interface ClosureReport { hash: string; content: any; }

export async function closeSpace(adapter: DataAdapter, space: Space, events: SpaceEvent[]): Promise<ClosureReport> {
  const kept = (space.solutions || []).filter(s => s.state === 'kept');
  const discarded = (space.solutions || []).filter(s => s.state === 'rejected');
  const decisions = events.filter(e => e.type === 'decision').map(e => e.payload as DecisionPayload);
  const pieces = events.filter(e => e.type === 'ecriture').map(e => e.payload as EcriturePayload);
  const snapshots = events.filter(e => e.type === 'snapshot').map(e => ({ ...(e.payload as SnapshotPayload), rows: undefined }));
  const content = {
    space: { id: space.id, title: space.title, problem: space.problem, objective: space.objective },
    responsable: space.responsibleName, ouvertLe: space.createdAt, clotureLe: now(),
    dureeJours: Math.round((Date.now() - new Date(space.createdAt).getTime()) / 86400000),
    solutionsRetenues: kept, solutionsEcartees: discarded.map(s => ({ title: s.title, motif: s.motif })),
    criteres: space.exitCriteria, decisions, piecesReferencees: pieces, snapshots,
    chronologie: events.map(e => ({ type: e.type, auteur: e.authorName, texte: e.body, le: e.createdAt })),
    ancrages: space.anchors,
  };
  const hash = await sha256(JSON.stringify(content));
  await updateSpace(adapter, space.id, { status: 'archive', closedAt: now(), closureHash: hash });
  // Persistance du rapport (base de connaissance interrogeable) — SaaS.
  try {
    const client = fnClient(adapter);
    if (client?.from) {
      const searchText = [space.title, space.problem, space.objective,
        ...kept.map(s => s.title), ...discarded.map(s => `${s.title} ${s.motif || ''}`),
        ...decisions.map(d => `${d.title} ${d.ref || ''}`),
        ...events.map(e => e.body)].filter(Boolean).join(' \n ');
      await client.from('space_report').insert({ tenant_id: space.tenantId, space_id: space.id, title: space.title, content, hash, search_text: searchText });
    }
  } catch { /* best-effort */ }
  await postSystem(adapter, { spaceId: space.id, tenantId: space.tenantId, body: `Espace clôturé · rapport scellé SHA-256 ${hash.slice(0, 12)}…` });
  return { hash, content };
}

/** Rapport de clôture d'un espace archivé (base de connaissance). */
export async function getSpaceReport(adapter: DataAdapter, spaceId: string): Promise<any | null> {
  const client = fnClient(adapter);
  if (!client?.from) return null;
  const { data } = await client.from('space_report').select('*').eq('space_id', spaceId).order('generated_at', { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}
/** Recherche plein-texte dans les rapports archivés (substitut honnête à pgvector). */
export async function searchReports(adapter: DataAdapter, tenantId: string, query: string): Promise<any[]> {
  const client = fnClient(adapter);
  if (!client?.from || !query.trim()) return [];
  const { data } = await client.from('space_report').select('id,space_id,title,hash,generated_at,content')
    .eq('tenant_id', tenantId).textSearch('search_vector', query, { config: 'french', type: 'websearch' }).limit(20);
  return data ?? [];
}

// ── SOLUTIONS / ÉCHÉANCES (méthode CDC §2.2) ──────────────────────────────────

export async function addSolution(adapter: DataAdapter, space: Space, sol: Omit<Solution, 'id' | 'createdAt' | 'state'>): Promise<Space> {
  const solutions = [...(space.solutions || []), { ...sol, id: uid(), state: 'proposed' as const, createdAt: now() }];
  const updated = await updateSpace(adapter, space.id, { solutions, status: space.status === 'ouvert' ? 'analyse' : space.status });
  await postEvent(adapter, { spaceId: space.id, tenantId: space.tenantId, type: 'message', authorId: sol.authorId || 'system', authorName: sol.authorName, body: `Solution proposée : ${sol.title}`, payload: { subtype: 'solution_proposed' } as any });
  return updated;
}

export async function decideSolution(adapter: DataAdapter, space: Space, solutionId: string, state: Solution['state'], by: { id: string; name: string }, motif?: string, decisionRef?: string): Promise<Space> {
  const solutions = (space.solutions || []).map(s => s.id === solutionId
    ? { ...s, state, decidedBy: by.name, decidedAt: now(), motif, decisionRef } : s);
  const chosen = solutions.find(s => s.id === solutionId);
  const updated = await updateSpace(adapter, space.id, { solutions, status: state === 'kept' && space.status === 'analyse' ? 'action' : space.status });
  await postSystem(adapter, { spaceId: space.id, tenantId: space.tenantId, body: state === 'kept' ? `Solution retenue : ${chosen?.title}` : `Solution écartée : ${chosen?.title}${motif ? ' — motif : ' + motif : ''}` });
  return updated;
}

// ── ÉVÉNEMENTS TYPÉS (fil append-only — CDC §6) ───────────────────────────────

function toEvent(m: DBCollabMessage): SpaceEvent {
  return {
    id: m.id, spaceId: m.channelId, tenantId: m.tenantId, type: (m.type as EventType) || 'message',
    authorId: m.authorId, authorName: m.authorName, via: m.via, body: m.body, mentions: m.mentions,
    reactions: m.reactions, payload: m.payload, createdAt: m.createdAt, deletedAt: m.deletedAt,
  };
}

export async function listEvents(adapter: DataAdapter, spaceId: string): Promise<SpaceEvent[]> {
  const all = await adapter.getAll<DBCollabMessage>('collabMessages', { where: { channelId: spaceId } });
  return (all as DBCollabMessage[])
    .filter(m => m.channelId === spaceId && !m.deletedAt)
    .map(toEvent)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function postEvent(adapter: DataAdapter, data: {
  spaceId: string; tenantId: string; type: EventType; authorId: string; authorName?: string;
  via?: string; body: string; mentions?: string[]; payload?: any;
}): Promise<SpaceEvent> {
  const m = await adapter.create<DBCollabMessage>('collabMessages', {
    id: uid(), channelId: data.spaceId, tenantId: data.tenantId, type: data.type, authorId: data.authorId,
    authorName: data.authorName, via: data.via, body: data.body, mentions: data.mentions ?? [],
    reactions: {}, payload: data.payload, createdAt: now(),
  } as DBCollabMessage);
  await adapter.update<DBCollabChannel>('collabChannels', data.spaceId, { updatedAt: now() }).catch(() => {});
  return toEvent(m);
}

export const postMessage = (adapter: DataAdapter, d: { spaceId: string; tenantId: string; authorId: string; authorName?: string; body: string; mentions?: string[]; via?: string }) =>
  postEvent(adapter, { ...d, type: 'message' });
export const postEcriture = (adapter: DataAdapter, d: { spaceId: string; tenantId: string; authorId: string; authorName?: string; body: string; payload: EcriturePayload; via?: string }) =>
  postEvent(adapter, { ...d, type: 'ecriture' });
export const postSnapshot = (adapter: DataAdapter, d: { spaceId: string; tenantId: string; authorId: string; authorName?: string; body: string; payload: SnapshotPayload; via?: string }) =>
  postEvent(adapter, { ...d, type: 'snapshot' });
export const postSystem = (adapter: DataAdapter, d: { spaceId: string; tenantId: string; body: string }) =>
  postEvent(adapter, { spaceId: d.spaceId, tenantId: d.tenantId, authorId: 'system', authorName: 'PROPH3T · Vigie', type: 'system', body: d.body });

/** Types de décision de la matrice (dimension decision_type — Doc Maître §B). */
export const DECISION_TYPES: { value: string; label: string }[] = [
  { value: 'regularisation', label: 'Régularisation' },
  { value: 'abattement', label: 'Abattement' },
  { value: 'passage_perte', label: 'Passage en perte' },
  { value: 'report', label: 'Report' },
  { value: 'methode', label: 'Méthode comptable' },
];
/** Motifs de rejet codifiés (Doc Maître §B3). */
export const REJECT_MOTIVES: { value: string; label: string }[] = [
  { value: 'piece_manquante', label: 'Pièce manquante' },
  { value: 'montant_conteste', label: 'Montant contesté' },
  { value: 'imputation_erronee', label: 'Imputation erronée' },
  { value: 'opportunite', label: 'Opportunité' },
  { value: 'autre', label: 'Autre' },
];

// Satisfaction de rôle : les rôles applicatifs (profiles.role) couvrent les rôles
// de gouvernance par hiérarchie (admin = super-approbateur). Le serveur reste la
// source de vérité ; ceci n'est qu'un miroir pour l'UI (afficher/masquer).
const REQ_RANK: Record<string, number> = { comptable: 1, daf: 2, dg: 3 };
const APP_RANK: Record<string, number> = {
  comptable: 1, accountant: 1, user: 1, employe: 1,
  manager: 2, daf: 2, controleur: 2, controleur_gestion: 2,
  dg: 3, directeur: 3, direction: 3,
  admin: 4, owner: 4, super_admin: 4, proprietaire: 4,
};
export function roleSatisfies(appRole: string | undefined, requiredRole: string): boolean {
  const need = REQ_RANK[(requiredRole || '').toLowerCase()] ?? 1;
  const have = APP_RANK[(appRole || '').toLowerCase()] ?? 0;
  return have >= need;
}

/** Client d'Edge Functions si l'on est en SaaS (gouvernance souveraine serveur). */
function fnClient(adapter: DataAdapter): any | null {
  try {
    const c = (adapter as any).client;
    return (adapter.getMode?.() === 'saas' && c?.functions) ? c : null;
  } catch { return null; }
}

/**
 * Soumet une décision au circuit de validation.
 * SaaS : Edge Function `decision-submit` (souveraine, chaîne multi-validateurs
 * résolue serveur, hash figé). Local/desktop : repli mono-validateur en payload.
 */
export async function postDecision(adapter: DataAdapter, d: {
  space: Space; tenantId: string; authorId: string; authorName?: string;
  title: string; detail?: string; amount?: number; decisionType?: string;
  pieceIds?: string[]; solutionId?: string; rules?: GovernanceRule[]; via?: string;
}): Promise<{ ref: string; chain?: string[]; ruleLabel?: string }> {
  const client = fnClient(adapter);
  if (client) {
    const { data, error } = await client.functions.invoke('decision-submit', { body: {
      space_id: d.space.id, decision_type: d.decisionType ?? 'regularisation', title: d.title,
      body: d.detail ?? null, amount_xof: d.amount ?? null, piece_ids: d.pieceIds ?? [],
      author_name: d.authorName ?? null, via: d.via ?? 'Atlas FNA · Espace',
    } });
    const err = (data && (data as any).error) || (error && error.message);
    if (err) throw new Error(err);
    if (d.solutionId) await decideSolution(adapter, d.space, d.solutionId, 'kept', { id: d.authorId, name: d.authorName || '' }, undefined, (data as any).ref);
    return { ref: (data as any).ref, chain: (data as any).chain, ruleLabel: (data as any).rule_label };
  }
  // Repli local (dev/desktop) : mono-validateur en payload d'événement.
  const rules = d.rules || DEFAULT_GOVERNANCE;
  const seq = (d.space.decisionSeq || 0) + 1;
  const year = new Date(d.space.createdAt).getFullYear();
  const ref = `DEC-${year}-${String(seq).padStart(3, '0')}`;
  const rule = d.amount != null ? requiredRoleFor(d.amount, rules) : rules[0];
  const governanceRule = d.amount != null
    ? `${fmt(d.amount)} FCFA ${d.amount >= rule.threshold && rule.threshold > 0 ? `> seuil ${rule.label} (${fmt(rule.threshold)})` : `< premier seuil`} → validation ${rule.label} requise`
    : undefined;
  const payload: any = { title: d.title, detail: d.detail, amount: d.amount, ref, governanceRule, requiredRole: rule.role, chain: [rule.role], status: 'in_approval', currentStep: 1 };
  await postEvent(adapter, { spaceId: d.space.id, tenantId: d.tenantId, type: 'decision', authorId: d.authorId, authorName: d.authorName, body: d.title, payload, via: d.via });
  await updateSpace(adapter, d.space.id, { decisionSeq: seq });
  if (d.solutionId) await decideSolution(adapter, d.space, d.solutionId, 'kept', { id: d.authorId, name: d.authorName || '' }, undefined, ref);
  return { ref, chain: [rule.role] };
}

/**
 * Approuve ou rejette l'étape courante d'une décision.
 * SaaS : Edge Function `decision-act` (vérif rôle en table tenant + SoD + hash
 * côté serveur). Local : repli sur le payload (mono-validateur).
 */
export async function actOnDecision(adapter: DataAdapter, d: {
  ev: SpaceEvent; action: 'approve' | 'reject'; actor: { id: string; name: string; role?: string };
  motiveCode?: string; comment?: string; via?: string;
}): Promise<void> {
  const client = fnClient(adapter);
  const decisionId = (d.ev.payload as any)?.decisionId;
  if (client && decisionId) {
    const { data, error } = await client.functions.invoke('decision-act', { body: {
      decision_id: decisionId, action: d.action, motive_code: d.motiveCode, comment: d.comment,
      acted_via: d.via ?? 'dock', actor_name: d.actor.name,
    } });
    const err = (data && (data as any).error) || (error && error.message);
    if (err) throw new Error(err);
    return;
  }
  // Repli local (mono-validateur).
  if (d.action === 'approve') {
    const payload = { ...(d.ev.payload as any), approvedById: d.actor.id, approvedByName: d.actor.name, approvedAt: now(), status: 'approved' };
    await adapter.update<DBCollabMessage>('collabMessages', d.ev.id, { payload });
    await postSystem(adapter, { spaceId: d.ev.spaceId, tenantId: d.ev.tenantId, body: `Décision ${payload.ref || ''} validée par ${d.actor.name}` });
  } else {
    const payload = { ...(d.ev.payload as any), status: 'rejected', rejectMotive: d.motiveCode };
    await adapter.update<DBCollabMessage>('collabMessages', d.ev.id, { payload });
    await postSystem(adapter, { spaceId: d.ev.spaceId, tenantId: d.ev.tenantId, body: `Décision ${payload.ref || ''} rejetée (${d.motiveCode})` });
  }
}

/** Récupère l'id de l'étape courante (pending) d'une décision — pour émettre un lien. */
export async function getPendingApprovalId(adapter: DataAdapter, decisionId: string): Promise<{ id: string; requiredRole: string } | null> {
  const client = (adapter as any).client;
  if (!client?.from) return null;
  const { data } = await client.from('space_decision_approval').select('id,required_role,status')
    .eq('decision_id', decisionId).eq('status', 'pending').maybeSingle();
  return data ? { id: data.id, requiredRole: data.required_role } : null;
}

/** Émet un lien de validation externe (B6) pour l'étape courante d'une décision. */
export async function createApprovalLink(adapter: DataAdapter, d: {
  approvalId: string; contactKind: 'email' | 'whatsapp' | 'sms'; contactValue: string; displayName: string;
}): Promise<{ token: string; linkId: string; delivery: string; url: string }> {
  const client = fnClient(adapter);
  if (!client) throw new Error('Le lien externe requiert le mode SaaS.');
  const { data, error } = await client.functions.invoke('approval-link-admin', { body: {
    op: 'create', approval_id: d.approvalId, contact_kind: d.contactKind, contact_value: d.contactValue, display_name: d.displayName,
  } });
  const err = (data && data.error) || (error && error.message);
  if (err) throw new Error(err);
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return { token: data.token, linkId: data.link_id, delivery: data.delivery, url: `${base}/validate/${data.token}` };
}

export const approveDecision = (adapter: DataAdapter, ev: SpaceEvent, approver: { id: string; name: string; role?: string }, via?: string) =>
  actOnDecision(adapter, { ev, action: 'approve', actor: approver, via });
export const rejectDecision = (adapter: DataAdapter, ev: SpaceEvent, actor: { id: string; name: string; role?: string }, motiveCode: string, comment?: string) =>
  actOnDecision(adapter, { ev, action: 'reject', actor, motiveCode, comment });

export async function deleteEvent(adapter: DataAdapter, id: string): Promise<void> {
  // Append-only : on marque (rectification), on ne supprime jamais physiquement.
  await adapter.update<DBCollabMessage>('collabMessages', id, { deletedAt: now() });
}
export async function toggleReaction(adapter: DataAdapter, ev: SpaceEvent, emoji: string, userId: string): Promise<void> {
  const reactions: Record<string, string[]> = { ...(ev.reactions || {}) };
  const set = new Set(reactions[emoji] || []);
  if (set.has(userId)) set.delete(userId); else set.add(userId);
  if (set.size === 0) delete reactions[emoji]; else reactions[emoji] = [...set];
  await adapter.update<DBCollabMessage>('collabMessages', ev.id, { reactions });
}

/** Crée un snapshot figé + hash SHA-256 à partir d'une table (CDC §9.2). */
export async function buildSnapshotPayload(title: string, source: string, columns: string[], rows: (string | number)[][]): Promise<SnapshotPayload> {
  const hash = (await sha256(JSON.stringify({ title, columns, rows }))).slice(0, 16);
  return { title, source, columns, rows, hash, frozenAt: now() };
}

// ── DOCUMENTS VERSIONNÉS (CDC §9.1.2) ─────────────────────────────────────────

export async function listDocuments(adapter: DataAdapter, spaceId: string): Promise<DBCollabDocument[]> {
  const all = await adapter.getAll<DBCollabDocument>('collabDocuments', { where: { spaceId } });
  return (all as DBCollabDocument[])
    .filter(d => d.spaceId === spaceId)
    .sort((a, b) => a.name.localeCompare(b.name) || b.version - a.version);
}

/** Ajoute une VERSION d'un document (v1, v2… par nom) + checksum SHA-256 + événement. */
export async function addDocument(adapter: DataAdapter, data: {
  spaceId: string; tenantId: string; name: string; dataUrl?: string; size?: number; mime?: string;
  uploadedBy: string; uploadedByName?: string; linkedDecisionId?: string; linkedActionId?: string;
}): Promise<DBCollabDocument> {
  const existing = await listDocuments(adapter, data.spaceId);
  const sameName = existing.filter(d => d.name === data.name);
  const version = sameName.length ? Math.max(...sameName.map(d => d.version)) + 1 : 1;
  const checksum = data.dataUrl ? (await sha256(data.dataUrl)).slice(0, 16) : undefined;
  const doc = await adapter.create<DBCollabDocument>('collabDocuments', {
    id: uid(), tenantId: data.tenantId, spaceId: data.spaceId, name: data.name, version,
    size: data.size, mime: data.mime, dataUrl: data.dataUrl, checksum,
    linkedDecisionId: data.linkedDecisionId, linkedActionId: data.linkedActionId,
    uploadedBy: data.uploadedBy, uploadedByName: data.uploadedByName, uploadedAt: now(),
  } as DBCollabDocument);
  await postEvent(adapter, {
    spaceId: data.spaceId, tenantId: data.tenantId, type: 'message', authorId: data.uploadedBy,
    authorName: data.uploadedByName, body: `Document ${version > 1 ? 'versionné' : 'joint'} : ${data.name} (v${version})`,
    payload: { subtype: version > 1 ? 'document_versioned' : 'document_added' } as any,
  });
  return doc;
}

// ── PRÉSENCE ──────────────────────────────────────────────────────────────────

export async function heartbeatPresence(adapter: DataAdapter, data: { userId: string; tenantId: string; userName?: string; status?: PresenceStatus }): Promise<void> {
  const existing = await adapter.getById<DBCollabPresence>('collabPresence', data.userId).catch(() => null);
  const payload = { id: data.userId, tenantId: data.tenantId, userName: data.userName, status: data.status || 'online', lastSeenAt: now() } as DBCollabPresence;
  if (existing) await adapter.update<DBCollabPresence>('collabPresence', data.userId, payload);
  else await adapter.create<DBCollabPresence>('collabPresence', payload);
}
export async function listPresence(adapter: DataAdapter, tenantId: string): Promise<Presence[]> {
  const all = await adapter.getAll<DBCollabPresence>('collabPresence');
  const cutoff = Date.now() - 2 * 60 * 1000;
  return (all as Presence[]).filter(p => p.tenantId === tenantId)
    .map(p => ({ ...p, status: (new Date(p.lastSeenAt).getTime() >= cutoff ? 'online' : 'offline') as PresenceStatus }));
}

// ── NON-LUS (dock « Mes espaces ») ────────────────────────────────────────────

const READ_KEY = (userId: string) => `wb_collab_read_${userId}`;
export function getReadState(userId: string): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(READ_KEY(userId)) || '{}'); } catch { return {}; }
}
export function markSpaceRead(userId: string, spaceId: string): void {
  const s = getReadState(userId); s[spaceId] = now();
  try { localStorage.setItem(READ_KEY(userId), JSON.stringify(s)); } catch { /* ignore */ }
}
export interface UnreadState { total: number; mentions: number; byChannel: Record<string, number>; }
export async function getUnread(adapter: DataAdapter, tenantId: string, userId: string): Promise<UnreadState> {
  const read = getReadState(userId);
  const all = await adapter.getAll<DBCollabMessage>('collabMessages');
  const byChannel: Record<string, number> = {};
  let total = 0, mentions = 0;
  for (const m of all as DBCollabMessage[]) {
    if (m.tenantId !== tenantId || m.deletedAt || m.authorId === userId) continue;
    const last = read[m.channelId];
    if (last && m.createdAt <= last) continue;
    byChannel[m.channelId] = (byChannel[m.channelId] || 0) + 1;
    total++;
    if (Array.isArray(m.mentions) && m.mentions.includes(userId)) mentions++;
  }
  return { total, mentions, byChannel };
}

// ── TEMPS RÉEL (SaaS — bus d'événements Atlas Core) ───────────────────────────

export function subscribeMessages(adapter: DataAdapter, onChange: () => void): () => void {
  try {
    const client: any = (adapter as any).client;
    if (adapter.getMode?.() !== 'saas' || !client?.channel) return () => {};
    const ch = client.channel('collab-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'collab_messages' }, () => onChange())
      .subscribe();
    return () => { try { client.removeChannel(ch); } catch { /* ignore */ } };
  } catch { return () => {}; }
}

export { isLate };
