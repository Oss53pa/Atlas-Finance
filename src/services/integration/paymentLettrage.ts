/**
 * Lettrage automatique à l'encaissement/décaissement (cycle vente/achat).
 *
 * Quand Atlas Trade émet un `sale.payment.received`, le moteur de posting a
 * déjà créé l'écriture (5xx D / 411 C). Ce service RAPPROCHE cet encaissement
 * de la (des) facture(s) ouverte(s) du même client au 411 — le lettrage. La
 * facture lettrée sort automatiquement des créances âgées (getAgedReceivables
 * exclut déjà les lignes lettrées).
 *
 * Symétrique pour Atlas Procure (`purchase.payment.issued` → 401).
 *
 * Réutilise `applyManualLettrage` (validation d'équilibre + écriture DIRECTE
 * dans journal_lines + audit) : on ne réinvente pas la persistance du lettrage.
 * Stratégie de rapprochement : FIFO à somme EXACTE (le règlement solde une ou
 * plusieurs factures les plus anciennes). Un règlement partiel qui ne solde
 * exactement aucun sous-ensemble est laissé au lettrage manuel.
 */

import type { DataAdapter } from '@atlas/data';
import type { DBJournalEntry } from '../../lib/db';
import { loadGLEntries } from '../../features/financial/glHelpers';
import { money } from '../../utils/money';
import { applyManualLettrage } from '../lettrageService';

export interface AutoLettrageResult {
  lettered: boolean;
  code?: string;
  /** Écritures de facture soldées par ce règlement. */
  matchedEntryIds: string[];
  reason?: string;
}

interface FlatLine {
  entryId: string;
  lineId: string;
  date: string;
  debit: number;
  credit: number;
}

/**
 * Rapproche automatiquement un règlement de ses factures au compte collectif.
 *
 * @param paymentEntryId  écriture de règlement (produite par le posting engine)
 * @param thirdPartyCode  code tiers (client/fournisseur) du règlement
 * @param accountPrefix   collectif à lettrer ('411' vente, '401' achat)
 */
export async function autoLettrerPayment(
  adapter: DataAdapter,
  opts: { paymentEntryId: string; thirdPartyCode: string; accountPrefix?: string },
): Promise<AutoLettrageResult> {
  const prefix = opts.accountPrefix ?? '411';
  if (!opts.thirdPartyCode) {
    return { lettered: false, matchedEntryIds: [], reason: 'Aucun code tiers sur le règlement.' };
  }

  const entries = await loadGLEntries(adapter as any); // validées, brouillons exclus

  // Toutes les lignes du collectif pour CE tiers, non encore lettrées.
  const open: FlatLine[] = [];
  let paymentSide: 'credit' | 'debit' = prefix === '411' ? 'credit' : 'debit';
  for (const e of entries as DBJournalEntry[]) {
    for (const l of e.lines ?? []) {
      if (!(l.accountCode || '').startsWith(prefix)) continue;
      if ((l as any).lettrageCode) continue;
      const tp = (l as any).thirdPartyCode;
      if (tp !== opts.thirdPartyCode) continue;
      open.push({
        entryId: e.id,
        lineId: l.id,
        date: e.date ?? '',
        debit: l.debit || 0,
        credit: l.credit || 0,
      });
    }
  }

  // Ligne(s) de règlement : celles de l'écriture de paiement.
  const paymentLines = open.filter(l => l.entryId === opts.paymentEntryId);
  if (paymentLines.length === 0) {
    return { lettered: false, matchedEntryIds: [], reason: 'Règlement introuvable ou déjà lettré.' };
  }
  // Pour une vente : le règlement CRÉDITE le 411 ; les factures le DÉBITENT.
  const paymentAmount = paymentLines.reduce(
    (s, l) => s + (paymentSide === 'credit' ? l.credit : l.debit), 0,
  );
  if (paymentAmount <= 0) {
    return { lettered: false, matchedEntryIds: [], reason: 'Montant de règlement nul.' };
  }

  // Factures ouvertes du même tiers (côté opposé au règlement), FIFO.
  const invoices = open
    .filter(l => l.entryId !== opts.paymentEntryId)
    .filter(l => (paymentSide === 'credit' ? l.debit : l.credit) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Somme EXACTE en accumulant du plus ancien au plus récent.
  const selected: FlatLine[] = [];
  let acc = money(0);
  for (const inv of invoices) {
    const amt = paymentSide === 'credit' ? inv.debit : inv.credit;
    selected.push(inv);
    acc = acc.add(amt);
    if (acc.equals(money(paymentAmount), 0.5)) break;
    if (acc.greaterThan(money(paymentAmount))) {
      // Dépassement sans égalité exacte : ce préfixe FIFO ne solde pas
      // proprement → on laisse au lettrage manuel (règlement partiel/à cheval).
      return {
        lettered: false,
        matchedEntryIds: [],
        reason: 'Aucun sous-ensemble de factures ne correspond exactement au règlement (partiel).',
      };
    }
  }

  if (!acc.equals(money(paymentAmount), 0.5) || selected.length === 0) {
    return {
      lettered: false,
      matchedEntryIds: [],
      reason: 'Facture(s) correspondant au règlement introuvable(s).',
    };
  }

  // Lettrage : règlement + factures soldées. applyManualLettrage valide
  // l'équilibre (Σ débit = Σ crédit) et écrit lettrage_code dans journal_lines.
  const selections = [
    ...paymentLines.map(l => ({ entryId: l.entryId, lineId: l.lineId })),
    ...selected.map(l => ({ entryId: l.entryId, lineId: l.lineId })),
  ];
  const code = await applyManualLettrage(adapter, selections);

  return {
    lettered: true,
    code,
    matchedEntryIds: [...new Set(selected.map(l => l.entryId))],
  };
}

/** Événements de règlement → (préfixe collectif à lettrer). */
export const PAYMENT_EVENT_ACCOUNTS: Record<string, string> = {
  'sale.payment.received': '411',
  'purchase.payment.issued': '401',
  // Paie : le versement des salaires solde le net à payer au personnel (422).
  // Le lettrage ne s'applique que si la ligne porte un code tiers (paie par
  // employé) ; un run agrégé sans tiers est simplement non lettré (best-effort).
  'payroll.payment.issued': '422',
};
