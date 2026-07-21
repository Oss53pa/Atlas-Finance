/**
 * Bus d'intégration — réception, rejeu et supervision des faits de gestion.
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L1/L2/L6
 *
 * Mode dégradé (L6) : un satellite injoignable ne bloque JAMAIS la
 * comptabilité, et Atlas F&A injoignable ne fait pas perdre l'événement —
 * le satellite rejoue, l'idempotence absorbe le doublon. C'est non
 * négociable dans un contexte réseau instable.
 */

import type { DataAdapter } from '@atlas/data';
import { sha256Hex } from '../../utils/integrity';
import { postEvent, type PostEventOptions } from './postingEngine';
import type {
  IntegrationEvent,
  IntegrationEventPayload,
  IntegrationEventStatus,
  IntegrationEventType,
  SatelliteSystem,
} from './types';

/**
 * Sérialisation CANONIQUE d'un payload (clés triées récursivement).
 *
 * ⚠️ Doit rester STRICTEMENT identique à celle de l'Edge Function
 * `integration-ingest` : deux empreintes différentes pour le même document
 * casseraient la chaîne de preuve et feraient échouer la vérification L7.
 */
export function canonicalize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return `{${keys
      .map(k => `${JSON.stringify(k)}:${canonicalize((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function computePayloadHash(payload: unknown): Promise<string> {
  return sha256Hex(canonicalize(payload));
}

export interface IngestInput {
  sourceSystem: SatelliteSystem;
  eventType: IntegrationEventType;
  sourceDocId: string;
  idempotencyKey: string;
  occurredAt: string;
  payload: IntegrationEventPayload;
  eventVersion?: number;
}

export interface IngestResult {
  eventId: string;
  duplicate: boolean;
  status: IntegrationEventStatus;
}

/**
 * Enregistre un fait de gestion.
 *
 * Idempotent : le rejeu de la même `idempotencyKey` renvoie l'événement
 * existant sans créer de doublon ni d'effet de bord.
 */
export async function ingestEvent(
  adapter: DataAdapter,
  input: IngestInput,
): Promise<IngestResult> {
  const existing = await adapter.getAll<IntegrationEvent>('integrationEvents', {
    where: { idempotencyKey: input.idempotencyKey },
    limit: 1,
  });
  if (existing.length > 0) {
    return { eventId: existing[0].id, duplicate: true, status: existing[0].status };
  }

  const payloadHash = await computePayloadHash(input.payload);
  const created = await adapter.create<IntegrationEvent>('integrationEvents', {
    sourceSystem: input.sourceSystem,
    eventType: input.eventType,
    eventVersion: input.eventVersion ?? 1,
    sourceDocId: input.sourceDocId,
    idempotencyKey: input.idempotencyKey,
    occurredAt: input.occurredAt,
    payload: input.payload,
    payloadHash,
    status: 'pending',
    attempts: 0,
  } as any);

  return { eventId: created.id, duplicate: false, status: 'pending' };
}

/** Nombre maximal de tentatives avant mise en dead-letter. */
const MAX_ATTEMPTS = 5;

/** Erreurs définitives : inutile de rejouer, le rejeu donnera le même verdict. */
const TERMINAL_ERRORS = ['OWNER_MISMATCH', 'UNKNOWN_EVENT_TYPE', 'INVALID_PAYLOAD'];

export interface ProcessResult {
  processed: number;
  posted: number;
  rejected: number;
  ignored: number;
  deferred: number;
}

/**
 * Traite les événements en attente.
 *
 * Séquentiel VOLONTAIREMENT : la chaîne de hash du Grand Livre est ordonnée,
 * un traitement parallèle produirait des maillons concurrents.
 */
export async function processPendingEvents(
  adapter: DataAdapter,
  options: PostEventOptions & { limit?: number } = {},
): Promise<ProcessResult> {
  const pending = await adapter.getAll<IntegrationEvent>('integrationEvents', {
    where: { status: 'pending' },
    orderBy: { field: 'occurredAt', direction: 'asc' },
    limit: options.limit ?? 100,
  });

  const result: ProcessResult = { processed: 0, posted: 0, rejected: 0, ignored: 0, deferred: 0 };

  for (const event of pending) {
    result.processed++;
    const outcome = await postEvent(adapter, event, options);
    const attempts = (event.attempts ?? 0) + 1;

    if (outcome.status === 'posted') {
      result.posted++;
      await adapter.update('integrationEvents', event.id, {
        status: 'posted',
        journalEntryId: outcome.journalEntryId,
        attempts,
        errorCode: null,
        errorDetail: null,
      } as any);
      continue;
    }

    if (outcome.status === 'ignored') {
      result.ignored++;
      await adapter.update('integrationEvents', event.id, {
        status: 'ignored',
        attempts,
      } as any);
      continue;
    }

    // Rejeté : définitif, ou en attente d'une correction de paramétrage.
    const terminal =
      TERMINAL_ERRORS.includes(outcome.errorCode ?? '') || attempts >= MAX_ATTEMPTS;
    result.rejected++;
    await adapter.update('integrationEvents', event.id, {
      status: 'rejected',
      attempts,
      errorCode: outcome.errorCode,
      errorDetail: outcome.errorDetail,
    } as any);

    if (terminal) {
      await adapter.create('integrationDeadLetters', {
        eventId: event.id,
        reason: `${outcome.errorCode}: ${outcome.errorDetail}`,
        payload: event.payload,
        resolved: false,
      } as any);
    }
  }

  return result;
}

/**
 * Rejoue un événement rejeté (après correction du paramétrage).
 * Le remet en `pending` : le traitement normal reprend la main.
 */
export async function replayEvent(adapter: DataAdapter, eventId: string): Promise<void> {
  await adapter.update('integrationEvents', eventId, {
    status: 'pending',
    errorCode: null,
    errorDetail: null,
    nextAttemptAt: null,
  } as any);
}

// ============================================================================
// SUPERVISION (L6)
// ============================================================================

export interface FlowHealth {
  sourceSystem: string;
  pending: number;
  posted: number;
  rejected: number;
  deferred: number;
  ignored: number;
  /** Date du plus ancien événement non traité — l'indicateur qui alerte. */
  oldestPendingAt: string | null;
  /** Âge en heures du plus ancien événement non traité. */
  oldestPendingAgeHours: number | null;
}

export async function getFlowHealth(
  adapter: DataAdapter,
  now: Date = new Date(),
): Promise<FlowHealth[]> {
  const events = await adapter.getAll<IntegrationEvent>('integrationEvents');
  const bySystem = new Map<string, FlowHealth>();

  for (const e of events) {
    const key = e.sourceSystem ?? 'inconnu';
    if (!bySystem.has(key)) {
      bySystem.set(key, {
        sourceSystem: key,
        pending: 0, posted: 0, rejected: 0, deferred: 0, ignored: 0,
        oldestPendingAt: null,
        oldestPendingAgeHours: null,
      });
    }
    const h = bySystem.get(key)!;
    if (e.status === 'pending') h.pending++;
    else if (e.status === 'posted') h.posted++;
    else if (e.status === 'rejected') h.rejected++;
    else if (e.status === 'deferred') h.deferred++;
    else if (e.status === 'ignored') h.ignored++;

    if ((e.status === 'pending' || e.status === 'deferred') && e.receivedAt) {
      if (!h.oldestPendingAt || e.receivedAt < h.oldestPendingAt) {
        h.oldestPendingAt = e.receivedAt;
      }
    }
  }

  for (const h of bySystem.values()) {
    h.oldestPendingAgeHours = h.oldestPendingAt
      ? Math.round(((now.getTime() - new Date(h.oldestPendingAt).getTime()) / 3_600_000) * 10) / 10
      : null;
  }

  return [...bySystem.values()].sort((a, b) => a.sourceSystem.localeCompare(b.sourceSystem));
}
