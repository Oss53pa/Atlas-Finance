/**
 * Espace collaboratif — modèle « ESPACE DE RÉSOLUTION ».
 * Un espace est centré sur un PROBLÈME comptable à résoudre, avec une méthode
 * (problème → solutions → échéances → clôture), un fil d'ÉVÉNEMENTS TYPÉS
 * (message/décision/écriture/snapshot/système), des tâches, une convergence
 * calculée depuis le GL, des critères de sortie et un rapport de clôture.
 */
// Cycle de vie CDC §2.1 : ouvert → analyse → action → resolu → archive (+ abandonne).
export type SpaceStatus = 'ouvert' | 'analyse' | 'action' | 'resolu' | 'archive' | 'abandonne';
// Familles d'événements du fil typé (rendu maquette). Le sous-type CDC détaillé
// (§6.2) est porté dans payload.subtype quand utile.
export type EventType = 'message' | 'decision' | 'ecriture' | 'snapshot' | 'system';

/** Ancrage à un objet métier (CDC §4). Un espace ne vit pas sans ancrage. */
export type AnchorType =
  | 'account_period' | 'reconciliation' | 'partner'
  | 'journal_entry' | 'closing_period' | 'budget_line' | 'external';
export interface SpaceAnchor {
  type: AnchorType;
  app: string;                     // 'fna' | 'cashpilot' | …
  label: string;                   // ex. « Rapprochement 521100 · Mars 2026 »
  path?: string;                   // route écran source (Espace → Objet)
  ref?: Record<string, any>;       // { accountCode, period, partnerId, entryId… }
  isPrimary?: boolean;
}
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PresenceStatus = 'online' | 'away' | 'offline';
export type SolutionState = 'proposed' | 'kept' | 'rejected';

/** Critère de sortie (exit criterion) — l'espace se clôt quand tous sont verts. */
export interface ExitCriterion {
  id: string;
  label: string;
  met: boolean;
  /** Optionnel : valeur cible/courante affichée (ex. « écart = 0 »). */
  value?: string;
  /** Optionnel : critère calculé depuis le GL (compte à solder). */
  auto?: { kind: 'account_zero'; accountCode: string };
}

/** Configuration de convergence (calculée, jamais saisie). */
export interface ConvergenceConfig {
  /** Valeur initiale de l'écart (référence). */
  initialGap: number;
  /** Source de l'écart courant : solde d'un compte GL, ou valeur manuelle. */
  source: { kind: 'account_balance'; accountCode: string } | { kind: 'manual'; currentGap: number };
  label?: string; // ex. « écart 521100 »
}

/** Solution proposée dans la méthode de résolution. */
export interface Solution {
  id: string;
  title: string;
  detail?: string;
  state: SolutionState;
  authorId?: string;
  authorName?: string;
  decidedBy?: string;
  decidedAt?: string;
  motif?: string;           // motif si écartée
  decisionRef?: string;     // ex. DEC-2026-041 si retenue → décision
  createdAt: string;
}

/** Jalon d'échéance de résolution. */
export interface Milestone {
  id: string;
  date: string;
  label: string;
  state: 'done' | 'now' | 'todo' | 'late';
}

export interface Space {
  id: string;
  tenantId: string;
  title: string;
  problem: string;                 // énoncé du problème
  objective: string;               // objectif de résolution
  responsibleId?: string;
  responsibleName?: string;
  deadline?: string;
  status: SpaceStatus;
  convergence?: ConvergenceConfig;
  convergenceBp?: number;          // convergence figée en points de base (0-10000)
  exitCriteria: ExitCriterion[];
  solutions: Solution[];
  milestones: Milestone[];
  anchors?: SpaceAnchor[];         // ancrage objets métier (CDC §4)
  decisionSeq?: number;            // séquence DEC-AAAA-NNN
  // Lien principal vers l'écran métier source (deux surfaces, un système) —
  // conservé pour compat ; l'ancrage riche vit dans anchors[].
  linkedType?: string;             // ex. 'rapprochement' | 'closure' | 'account'
  linkedId?: string;
  linkedLabel?: string;            // ex. « Rapprochement 521100 · Atlas FNA »
  linkedPath?: string;             // route pour « ouvrir depuis »
  abandonReason?: string;          // motif obligatoire si abandonne
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closureHash?: string;
  archived?: boolean;
}

/** Payloads des événements typés. */
export interface DecisionPayload {
  title: string;
  detail?: string;
  amount?: number;                 // montant → gouvernance par seuil
  governanceRule?: string;         // ex. « 2 450 000 > seuil DAF »
  requiredRole?: string;           // rôle requis (comptable/daf/dg)
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  ref?: string;                    // DEC-2026-041
}
export interface EcriturePayload {
  entryId?: string;
  entryNumber: string;
  journal?: string;
  accounts?: string;               // ex. « 627100 / 521100 »
  amount?: number;
}
export interface SnapshotPayload {
  title: string;
  source?: string;
  columns: string[];
  rows: (string | number)[][];
  hash: string;
  frozenAt: string;
}

export interface SpaceEvent {
  id: string;
  spaceId: string;
  tenantId: string;
  type: EventType;
  authorId: string;
  authorName?: string;
  via?: string;                    // ex. « via Atlas FNA · Journaux »
  body: string;
  mentions?: string[];
  reactions?: Record<string, string[]>;
  payload?: DecisionPayload | EcriturePayload | SnapshotPayload;
  createdAt: string;
  deletedAt?: string;
}

export interface Task {
  id: string;
  tenantId: string;
  spaceId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
  criticalPath?: boolean;
  blocksCount?: number;            // nb de tâches bloquées
  blockedReason?: string;
  linkedRef?: string;              // pièce liée (ex. BQ-2026-03-0142)
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  tenantId: string;
  authorId: string;
  authorName?: string;
  body: string;
  createdAt: string;
}

export interface Presence {
  id: string;
  tenantId: string;
  userName?: string;
  status: PresenceStatus;
  lastSeenAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

/** Matrice de gouvernance : montant ≥ seuil → rôle requis. */
export interface GovernanceRule { role: string; label: string; threshold: number; }

export const DEFAULT_GOVERNANCE: GovernanceRule[] = [
  { role: 'comptable', label: 'Comptable', threshold: 0 },
  { role: 'daf', label: 'DAF', threshold: 1_000_000 },
  { role: 'dg', label: 'DAF + DG', threshold: 10_000_000 },
];

export const SPACE_STATUS_LABELS: Record<SpaceStatus, string> = {
  ouvert: 'Ouvert', analyse: 'Analyse', action: 'Action', resolu: 'Résolu',
  archive: 'Archivé', abandonne: 'Abandonné',
};
/** Ordre du kanban de portefeuille (CDC §12.2). */
export const SPACE_STATUS_ORDER: SpaceStatus[] = ['ouvert', 'analyse', 'action', 'resolu', 'archive'];
export const ANCHOR_TYPE_LABELS: Record<AnchorType, string> = {
  account_period: 'Compte × période', reconciliation: 'Rapprochement', partner: 'Tiers',
  journal_entry: 'Écriture', closing_period: 'Clôture de période', budget_line: 'Ligne budgétaire',
  external: 'Objet externe',
};
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire', in_progress: 'En cours', review: 'En revue', done: 'Terminé',
};
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente',
};
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  message: 'Message', decision: 'Décision', ecriture: 'Écriture', snapshot: 'Snapshot', system: 'Système',
};

/** Rôle requis pour un montant selon la matrice de gouvernance. */
export function requiredRoleFor(amount: number, rules: GovernanceRule[] = DEFAULT_GOVERNANCE): GovernanceRule {
  const sorted = [...rules].sort((a, b) => b.threshold - a.threshold);
  return sorted.find(r => Math.abs(amount) >= r.threshold) || rules[0];
}
