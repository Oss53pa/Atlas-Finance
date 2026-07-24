/**
 * Engagement budgétaire sur commande approuvée (cycle achat).
 *
 * Une commande approuvée (`purchase.order.approved`) N'EST PAS une charge : c'est
 * un ENGAGEMENT budgétaire. Elle ne produit donc aucune écriture au GL, mais
 * réserve du budget sur le compte de charge qui sera mouvementé quand la facture
 * arrivera. Quand `purchase.invoice.received` postera la charge (601/622…),
 * l'engagement bascule vers le réalisé.
 *
 * Le compte engagé est résolu par les MÊMES posting_rules que la facture à venir
 * (event_type = purchase.invoice.received, rôle expense) : l'engagement et la
 * charge tombent ainsi sur la même maille budgétaire — le rapprochement
 * engagement ↔ réalisé fonctionne naturellement.
 *
 * Idempotence : (tenant, source='external', external_ref = n° de commande). Un
 * rejeu du même PO ne crée pas de doublon.
 */

import type { DataAdapter } from '@atlas/data';
import { money, Money } from '../../utils/money';
import { getPostingRules, resolveRule } from './postingRulesService';
import type { IntegrationEvent } from './types';

export interface PurchaseEngagementResult {
  created: number;
  engagementIds: string[];
  skipped: boolean;
  reason?: string;
}

/** 1er jour du mois d'une date ISO (maille budgétaire mensuelle). */
function firstOfMonth(dateISO: string): string {
  const d = (dateISO || '').slice(0, 10);
  return d ? `${d.slice(0, 7)}-01` : '';
}

/**
 * Enregistre l'engagement budgétaire d'une commande approuvée.
 *
 * Ne lève jamais : renvoie un résultat exploitable par le bus. Idempotent.
 */
export async function recordPurchaseEngagement(
  adapter: DataAdapter,
  event: IntegrationEvent,
): Promise<PurchaseEngagementResult> {
  const payload = event.payload;
  if (!payload || !Array.isArray(payload.lines) || payload.lines.length === 0) {
    return { created: 0, engagementIds: [], skipped: true, reason: 'Commande sans ligne.' };
  }

  // Idempotence : engagement externe déjà enregistré pour cette commande ?
  const externalRef = event.sourceDocId;
  const existing = await adapter.getAll<any>('budgetEngagements', {
    where: { source: 'external', externalRef },
  }).catch(() => [] as any[]);
  if ((existing ?? []).length > 0) {
    return { created: 0, engagementIds: [], skipped: true, reason: 'Commande déjà engagée (idempotence).' };
  }

  // Résout le compte de charge via les règles de la FACTURE à venir : engagement
  // et charge tombent sur la même maille.
  const rules = await getPostingRules(adapter, 'purchase.invoice.received');
  const periode = firstOfMonth(payload.docDate || event.occurredAt);
  const supplier = payload.thirdParty?.name ?? payload.thirdParty?.code ?? null;
  const reference = payload.docNumber ?? event.sourceDocId;

  // Agrège par compte de charge (plusieurs lignes → un engagement par compte).
  const byAccount = new Map<string, Money>();
  for (const line of payload.lines) {
    if (line.role !== 'expense') continue;
    const rule = resolveRule(rules, 'purchase.invoice.received', 'expense', line.matchKey ?? line.tax?.code);
    const account = rule?.debitAccount;
    if (!account) continue; // pas de compte déterminé → laissé hors engagement
    const prev = byAccount.get(account) ?? money(0);
    byAccount.set(account, prev.add(line.amount || 0));
  }

  if (byAccount.size === 0) {
    return {
      created: 0, engagementIds: [], skipped: true,
      reason: 'Aucun compte de charge déterminé pour l’engagement (règle expense absente).',
    };
  }

  const engagementIds: string[] = [];
  const now = new Date().toISOString();
  for (const [account, amount] of byAccount) {
    const created = await adapter.create<any>('budgetEngagements', {
      source: 'external',
      externalRef,
      accountCode: account,
      periode,
      fournisseurLibelle: supplier,
      referenceDocument: reference,
      montantInitial: amount.round(2).toNumber(),
      montantFacture: 0,
      montantDegage: 0,
      statut: 'ouvert',
      contratRecurrent: false,
      createdAt: now,
      updatedAt: now,
    });
    if (created?.id) engagementIds.push(created.id);
  }

  return { created: engagementIds.length, engagementIds, skipped: false };
}
