/**
 * Moteur de posting générique — traduit un FAIT DE GESTION en écriture.
 *
 * Réf. docs/integration-suite-atlas/DESIGN.md § L2
 *
 * Le satellite n'envoie jamais d'écriture : il envoie ce qui s'est passé.
 * Ce moteur applique la détermination comptable (`posting_rules`), contrôle
 * la période, l'équilibre, puis délègue à `safeAddEntry` — qui reste le seul
 * point d'entrée du Grand Livre (verrou de clôture, hash, séquence).
 *
 * Garanties :
 *  - AUCUN numéro de compte codé en dur (règle absente ⇒ rejet explicite)
 *  - idempotence portée par la clé unique en base
 *  - la période fait loi, y compris pour les satellites
 *  - la preuve du document source entre dans la chaîne de hash (L7)
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry, DBJournalLine } from '../../lib/db';
import { money, Money } from '../../utils/money';
import { safeAddEntry, EntryGuardError } from '../entryGuard';
import { getPeriodeStatus } from '../periodeComptableService';
import { getAccountLabel } from '../../utils/accountLabels';
import { getPostingRules, resolveRule } from './postingRulesService';
import {
  EVENT_JOURNAL,
  EVENT_OWNER,
  NON_POSTING_EVENTS,
  type ClosedPeriodPolicy,
  type IntegrationEvent,
  type IntegrationEventType,
  type PostingOutcome,
  type PostingRule,
} from './types';

export interface PostEventOptions {
  /** Politique en période close. Défaut : rejet (la période fait loi). */
  closedPeriodPolicy?: ClosedPeriodPolicy;
  /** Statut de l'écriture produite. Défaut : 'validated' (fait de gestion acté). */
  entryStatus?: DBJournalEntry['status'];
}

interface BuiltLine {
  accountCode: string;
  debit: number;
  credit: number;
  label: string;
  thirdPartyCode?: string;
  analyticalCode?: string;
}

// ============================================================================
// PUBLIC
// ============================================================================

/**
 * Traduit et comptabilise un événement d'intégration.
 *
 * Ne lève JAMAIS : toute anomalie est rendue sous forme de `PostingOutcome`
 * avec un code d'erreur, pour que le bus puisse la journaliser et la rejouer.
 */
export async function postEvent(
  adapter: DataAdapter,
  event: IntegrationEvent,
  options: PostEventOptions = {},
): Promise<PostingOutcome> {
  const policy = options.closedPeriodPolicy ?? 'reject';

  // ── 1. Contrôles de recevabilité ──────────────────────────────────────────
  const owner = EVENT_OWNER[event.eventType as IntegrationEventType];
  if (!owner) {
    return fail('UNKNOWN_EVENT_TYPE', `Type d'événement inconnu : ${event.eventType}`);
  }
  if (event.sourceSystem !== owner) {
    // Un satellite ne peut pas émettre le fait de gestion d'un autre domaine.
    return fail(
      'OWNER_MISMATCH',
      `« ${event.eventType} » appartient à ${owner}, reçu de ${event.sourceSystem}.`,
    );
  }

  // Événement d'engagement / déclaratif : aucune écriture attendue.
  if (NON_POSTING_EVENTS.includes(event.eventType as IntegrationEventType)) {
    return { status: 'ignored' };
  }

  const payload = event.payload;
  if (!payload || !Array.isArray(payload.lines) || payload.lines.length === 0) {
    return fail('INVALID_PAYLOAD', 'Payload sans ligne exploitable.');
  }

  // ── 2. Résolution de la période ───────────────────────────────────────────
  const businessDate = (payload.docDate || event.occurredAt || '').slice(0, 10);
  if (!businessDate) {
    return fail('INVALID_PAYLOAD', 'Date métier absente (docDate / occurredAt).');
  }

  let postingDate = businessDate;
  const status = await getPeriodeStatus(adapter, businessDate);
  if (status === 'closed' || status === 'locked') {
    if (policy === 'reject') {
      return fail(
        'PERIOD_CLOSED',
        `Période du ${businessDate} clôturée/verrouillée — événement refusé (la période fait loi).`,
      );
    }
    const next = await findNextOpenDate(adapter, businessDate);
    if (!next) {
      return fail(
        'PERIOD_CLOSED',
        `Période du ${businessDate} close et aucune période ouverte ultérieure.`,
      );
    }
    postingDate = next;
  }

  // ── 3. Détermination comptable ────────────────────────────────────────────
  const rules = await getPostingRules(adapter, event.eventType);
  const rate = payload.exchangeRate && payload.exchangeRate > 0 ? payload.exchangeRate : 1;

  const built: BuiltLine[] = [];
  for (const line of payload.lines) {
    const rule = resolveRule(rules, event.eventType, line.role, line.matchKey ?? line.tax?.code);
    if (!rule) {
      return fail(
        'NO_POSTING_RULE',
        `Aucune règle de détermination pour (${event.eventType}, rôle « ${line.role} »` +
          `${line.matchKey ? `, clé « ${line.matchKey} »` : ''}). ` +
          `Paramétrer la règle avant de rejouer — aucun compte n'est deviné.`,
      );
    }
    const amount = money(line.amount).multiply(rate).round(2).toNumber();
    if (amount === 0) continue;

    const thirdPartyCode = rule.thirdParty
      ? line.thirdParty?.code ?? payload.thirdParty?.code
      : undefined;
    const label = line.label || payload.label || payload.docNumber || event.eventType;

    built.push(...ruleToLines(rule, amount, label, thirdPartyCode, line.analyticalCode));
  }

  if (built.length === 0) {
    return fail('INVALID_PAYLOAD', 'Toutes les lignes sont à zéro — rien à comptabiliser.');
  }

  // ── 4. Équilibre — aucune tolérance ───────────────────────────────────────
  const totalDebit = Money.sum(built.map(l => money(l.debit)));
  const totalCredit = Money.sum(built.map(l => money(l.credit)));
  if (!totalDebit.equals(totalCredit, 0.005)) {
    return fail(
      'UNBALANCED',
      `Écriture déséquilibrée : débit ${totalDebit.toNumber()} ≠ crédit ${totalCredit.toNumber()}. ` +
        `Le satellite doit fournir un fait de gestion équilibré (créance = HT + taxes).`,
    );
  }

  // ── 5. Écriture — via safeAddEntry, seul point d'entrée du GL ─────────────
  const entryId = crypto.randomUUID();
  const now = new Date().toISOString();
  const lines: DBJournalLine[] = built.map(l => ({
    id: crypto.randomUUID(),
    accountCode: l.accountCode,
    accountName: getAccountLabel(l.accountCode) || l.accountCode,
    label: l.label,
    debit: l.debit,
    credit: l.credit,
    thirdPartyCode: l.thirdPartyCode,
    analyticalCode: l.analyticalCode,
  })) as DBJournalLine[];

  const entryNumber = await nextEntryNumber(
    adapter,
    EVENT_JOURNAL[event.eventType as IntegrationEventType] ?? 'OD',
    postingDate,
    payload.docNumber,
  );

  try {
    const savedId = await safeAddEntry(
      adapter,
      {
        id: entryId,
        entryNumber,
        journal: EVENT_JOURNAL[event.eventType as IntegrationEventType] ?? 'OD',
        date: postingDate,
        reference: payload.docNumber ?? event.sourceDocId,
        label: payload.label || `${payload.docNumber ?? event.sourceDocId}`,
        status: options.entryStatus ?? 'validated',
        lines,
        createdAt: now,
        // ── Traçabilité + preuve (L0/L7) ──────────────────────────────────
        sourceSystem: event.sourceSystem,
        sourceDocType: event.eventType,
        sourceDocId: event.sourceDocId,
        idempotencyKey: event.idempotencyKey,
        sourcePayloadHash: event.payloadHash,
      } as any,
      // L'équilibre vient d'être vérifié ligne à ligne ; le verrou de clôture
      // reste ACTIF (jamais allowClosedPeriod ici — un satellite n'a pas le
      // droit d'écrire en période close).
      { skipSyncValidation: false },
    );
    return {
      status: 'posted',
      journalEntryId: savedId,
      postedDate: postingDate,
    };
  } catch (e) {
    if (e instanceof EntryGuardError) {
      return fail('GUARD_REJECTED', e.errors.join(' | '));
    }
    return fail('GUARD_REJECTED', e instanceof Error ? e.message : String(e));
  }
}

// ============================================================================
// INTERNES
// ============================================================================

function fail(code: PostingOutcome['errorCode'], detail: string): PostingOutcome {
  return { status: 'rejected', errorCode: code, errorDetail: detail };
}

/**
 * Une règle produit une ou deux lignes.
 *
 * Un seul compte renseigné → une ligne (le sens est porté par la colonne).
 * Deux comptes → une contrepartie interne auto-équilibrée (motif OBYC : ex.
 * réception = débit stock / crédit facture non parvenue).
 */
function ruleToLines(
  rule: PostingRule,
  amount: number,
  label: string,
  thirdPartyCode?: string,
  analyticalCode?: string,
): BuiltLine[] {
  const out: BuiltLine[] = [];
  const base = { label, thirdPartyCode, analyticalCode: rule.analytic ? analyticalCode : undefined };
  if (rule.debitAccount) {
    out.push({ ...base, accountCode: rule.debitAccount, debit: amount, credit: 0 });
  }
  if (rule.creditAccount) {
    out.push({ ...base, accountCode: rule.creditAccount, debit: 0, credit: amount });
  }
  return out;
}

/**
 * Numéro de pièce.
 *
 * Chemin nominal : séquence SERVEUR atomique (`next_entry_number`) — deux
 * satellites concurrents ne peuvent pas viser le même numéro.
 * Repli local/test : dérivation déterministe depuis le n° de document, qui
 * conserve l'idempotence (même document ⇒ même numéro).
 */
async function nextEntryNumber(
  adapter: DataAdapter,
  journal: string,
  date: string,
  docNumber?: string,
): Promise<string> {
  const fy = date.slice(0, 4);
  const rpc = (adapter as any).rpc;
  if (adapter.getMode() !== 'local' && typeof rpc === 'function') {
    try {
      const v = await rpc.call(adapter, 'next_entry_number', { p_journal: journal, p_fy: fy });
      if (typeof v === 'string' && v) return v;
    } catch { /* séquence absente → repli */ }
  }
  const suffix = (docNumber ?? crypto.randomUUID()).replace(/[^A-Za-z0-9]/g, '').slice(-10);
  return `${journal}-${fy}-${suffix}`;
}

/**
 * Première date d'une période ouverte postérieure à `fromDate`.
 * Utilisé par la politique `defer_to_next_open` (cut-off vers N+1).
 */
async function findNextOpenDate(adapter: DataAdapter, fromDate: string): Promise<string | null> {
  const periods = await adapter.getAll<any>('fiscalPeriods');
  const later = (periods ?? [])
    .filter(p => (p.startDate ?? '') > fromDate)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  for (const p of later) {
    const st = await getPeriodeStatus(adapter, p.startDate);
    if (st === 'open' || st === 'no_period') return p.startDate;
  }
  return null;
}
