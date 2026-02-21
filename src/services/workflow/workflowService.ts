/**
 * Service de workflow de validation des écritures comptables.
 *
 * Transitions autorisées :
 * - draft → validated (par un comptable)
 * - validated → posted (par un chef comptable / directeur)
 * - validated → draft (rejet / retour pour correction)
 * - posted : IMMUTABLE (ne peut pas revenir en arrière, sauf contrepassation)
 *
 * Contrôles à chaque transition :
 * - draft → validated : vérifie D=C, comptes valides, date dans exercice ouvert
 * - validated → posted : vérifie approbateur différent du créateur
 * - posted : génère hash d'intégrité final
 */

import { db, logAudit } from '../../lib/db';
import type { DBJournalEntry } from '../../lib/db';
import { money, Money } from '../../utils/money';
import { validateJournalEntry } from '../../validators/journalEntryValidator';
import { hashEntry } from '../../utils/integrity';

// ============================================================================
// TYPES
// ============================================================================

export type WorkflowStatus = 'draft' | 'validated' | 'posted';

export interface WorkflowTransition {
  entryId: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  userId: string;
  reason?: string;
  timestamp: string;
}

export interface WorkflowResult {
  success: boolean;
  errors: string[];
}

export interface BulkWorkflowResult {
  succeeded: string[];
  failed: Array<{ id: string; errors: string[] }>;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Vérifie que l'écriture respecte les règles comptables de base.
 * Utilisé pour la transition draft → validated.
 */
async function validateEntryForValidation(entry: DBJournalEntry): Promise<string[]> {
  const errors: string[] = [];

  // Vérification 1 : Équilibre D=C avec Money class
  const totalDebit = Money.sum(entry.lines.map(l => money(l.debit)));
  const totalCredit = Money.sum(entry.lines.map(l => money(l.credit)));
  const ecart = totalDebit.subtract(totalCredit);

  if (!ecart.isZero()) {
    errors.push(
      `Écriture déséquilibrée : Débit = ${totalDebit.toNumber()}, Crédit = ${totalCredit.toNumber()}, Écart = ${ecart.toNumber()}`
    );
  }

  // Vérification 2 : Validation complète via le validateur
  const validationResult = await validateJournalEntry({
    date: entry.date,
    lines: entry.lines,
    journal: entry.journal,
    label: entry.label,
  });

  if (!validationResult.isValid) {
    errors.push(...validationResult.errors);
  }

  // Vérification 3 : Au moins 2 lignes
  if (entry.lines.length < 2) {
    errors.push(`Une écriture doit comporter au minimum 2 lignes (reçu : ${entry.lines.length})`);
  }

  return errors;
}

/**
 * Vérifie que l'approbateur est différent du créateur.
 * Utilisé pour la transition validated → posted.
 */
function validateSeparationOfDuties(entry: DBJournalEntry, approverId: string): string[] {
  const errors: string[] = [];

  if (entry.createdBy && entry.createdBy === approverId) {
    errors.push(
      'Séparation des tâches requise : l\'approbateur doit être différent du créateur de l\'écriture'
    );
  }

  return errors;
}

// ============================================================================
// WORKFLOW TRANSITIONS
// ============================================================================

/**
 * Valide une écriture en brouillon (draft → validated).
 *
 * Contrôles effectués :
 * - Équilibre D=C
 * - Comptes valides dans le plan comptable
 * - Date dans un exercice ouvert
 * - Au moins 2 lignes
 */
export async function validateEntry(
  entryId: string,
  userId: string
): Promise<WorkflowResult> {
  const errors: string[] = [];

  // 1. Récupérer l'écriture
  const entry = await db.journalEntries.get(entryId);
  if (!entry) {
    return { success: false, errors: ['Écriture introuvable'] };
  }

  // 2. Vérifier le statut actuel
  if (entry.status !== 'draft') {
    return {
      success: false,
      errors: [`Transition invalide : seules les écritures en brouillon peuvent être validées (statut actuel : ${entry.status})`],
    };
  }

  // 3. Valider les règles comptables
  const validationErrors = await validateEntryForValidation(entry);
  if (validationErrors.length > 0) {
    return { success: false, errors: validationErrors };
  }

  // 4. Mettre à jour le statut
  const now = new Date().toISOString();
  await db.journalEntries.update(entryId, {
    status: 'validated',
    updatedAt: now,
  });

  // 5. Logger la transition
  const transition: WorkflowTransition = {
    entryId,
    fromStatus: 'draft',
    toStatus: 'validated',
    userId,
    timestamp: now,
  };

  await logAudit(
    'WORKFLOW_TRANSITION',
    'journal_entry',
    entryId,
    JSON.stringify(transition)
  );

  return { success: true, errors: [] };
}

/**
 * Comptabilise une écriture validée (validated → posted).
 *
 * Contrôles effectués :
 * - Séparation des tâches (approbateur ≠ créateur)
 * - Génération du hash d'intégrité final
 */
export async function postEntry(
  entryId: string,
  userId: string
): Promise<WorkflowResult> {
  const errors: string[] = [];

  // 1. Récupérer l'écriture
  const entry = await db.journalEntries.get(entryId);
  if (!entry) {
    return { success: false, errors: ['Écriture introuvable'] };
  }

  // 2. Vérifier le statut actuel
  if (entry.status !== 'validated') {
    return {
      success: false,
      errors: [`Transition invalide : seules les écritures validées peuvent être comptabilisées (statut actuel : ${entry.status})`],
    };
  }

  // 3. Vérifier la séparation des tâches
  const dutyErrors = validateSeparationOfDuties(entry, userId);
  if (dutyErrors.length > 0) {
    return { success: false, errors: dutyErrors };
  }

  // 4. Générer le hash d'intégrité final si absent
  let finalHash = entry.hash;
  if (!finalHash) {
    const lastEntry = await db.journalEntries
      .orderBy('date')
      .last();
    const previousHash = lastEntry?.hash ?? '';
    finalHash = await hashEntry(
      {
        entryNumber: entry.entryNumber,
        journal: entry.journal,
        date: entry.date,
        lines: entry.lines,
        totalDebit: entry.totalDebit,
        totalCredit: entry.totalCredit,
      },
      previousHash
    );
  }

  // 5. Mettre à jour le statut et le hash
  const now = new Date().toISOString();
  await db.journalEntries.update(entryId, {
    status: 'posted',
    hash: finalHash,
    updatedAt: now,
  });

  // 6. Logger la transition
  const transition: WorkflowTransition = {
    entryId,
    fromStatus: 'validated',
    toStatus: 'posted',
    userId,
    timestamp: now,
  };

  await logAudit(
    'WORKFLOW_TRANSITION',
    'journal_entry',
    entryId,
    JSON.stringify(transition)
  );

  return { success: true, errors: [] };
}

/**
 * Rejette une écriture validée pour retour en brouillon (validated → draft).
 *
 * Permet de renvoyer une écriture en correction avant comptabilisation.
 */
export async function rejectEntry(
  entryId: string,
  userId: string,
  reason: string
): Promise<WorkflowResult> {
  const errors: string[] = [];

  // 1. Récupérer l'écriture
  const entry = await db.journalEntries.get(entryId);
  if (!entry) {
    return { success: false, errors: ['Écriture introuvable'] };
  }

  // 2. Vérifier le statut actuel
  if (entry.status !== 'validated') {
    return {
      success: false,
      errors: [`Transition invalide : seules les écritures validées peuvent être rejetées (statut actuel : ${entry.status})`],
    };
  }

  // 3. Vérifier que la raison est fournie
  if (!reason || reason.trim() === '') {
    return {
      success: false,
      errors: ['Une raison de rejet doit être fournie'],
    };
  }

  // 4. Mettre à jour le statut
  const now = new Date().toISOString();
  await db.journalEntries.update(entryId, {
    status: 'draft',
    updatedAt: now,
  });

  // 5. Logger la transition
  const transition: WorkflowTransition = {
    entryId,
    fromStatus: 'validated',
    toStatus: 'draft',
    userId,
    reason,
    timestamp: now,
  };

  await logAudit(
    'WORKFLOW_TRANSITION',
    'journal_entry',
    entryId,
    JSON.stringify(transition)
  );

  return { success: true, errors: [] };
}

/**
 * Valide plusieurs écritures en lot (draft → validated).
 *
 * Chaque écriture est validée individuellement.
 * Les succès et échecs sont retournés séparément.
 */
export async function bulkValidate(
  entryIds: string[],
  userId: string
): Promise<BulkWorkflowResult> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; errors: string[] }> = [];

  for (const entryId of entryIds) {
    const result = await validateEntry(entryId, userId);
    if (result.success) {
      succeeded.push(entryId);
    } else {
      failed.push({ id: entryId, errors: result.errors });
    }
  }

  return { succeeded, failed };
}

/**
 * Récupère l'historique des transitions de workflow pour une écriture.
 *
 * Parse les logs d'audit de type WORKFLOW_TRANSITION pour l'écriture donnée.
 */
export async function getWorkflowHistory(entryId: string): Promise<WorkflowTransition[]> {
  const logs = await db.auditLogs
    .where('entityId')
    .equals(entryId)
    .toArray();

  const workflowLogs = logs.filter(log => log.action === 'WORKFLOW_TRANSITION');

  const transitions: WorkflowTransition[] = [];
  for (const log of workflowLogs) {
    try {
      const transition = JSON.parse(log.details) as WorkflowTransition;
      transitions.push(transition);
    } catch {
      // Ignorer les logs malformés
    }
  }

  // Trier par timestamp croissant
  transitions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return transitions;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Vérifie si une transition est autorisée.
 */
export function isTransitionAllowed(
  from: WorkflowStatus,
  to: WorkflowStatus
): boolean {
  const allowedTransitions: Record<WorkflowStatus, WorkflowStatus[]> = {
    draft: ['validated'],
    validated: ['posted', 'draft'],
    posted: [], // posted est immutable (sauf contrepassation)
  };

  return allowedTransitions[from].includes(to);
}

/**
 * Retourne les transitions possibles depuis un statut donné.
 */
export function getPossibleTransitions(status: WorkflowStatus): WorkflowStatus[] {
  const transitions: Record<WorkflowStatus, WorkflowStatus[]> = {
    draft: ['validated'],
    validated: ['posted', 'draft'],
    posted: [],
  };

  return transitions[status];
}

/**
 * Vérifie si une écriture peut être modifiée (seuls les brouillons).
 */
export function isEntryEditable(status: WorkflowStatus): boolean {
  return status === 'draft';
}

/**
 * Vérifie si une écriture peut être validée.
 */
export function canValidateEntry(status: WorkflowStatus): boolean {
  return status === 'draft';
}

/**
 * Vérifie si une écriture peut être comptabilisée.
 */
export function canPostEntry(status: WorkflowStatus): boolean {
  return status === 'validated';
}

/**
 * Vérifie si une écriture peut être rejetée.
 */
export function canRejectEntry(status: WorkflowStatus): boolean {
  return status === 'validated';
}
