/**
 * paymentOrderService — ordres de paiement (module Paiements).
 *
 * Cycle : brouillon → à valider → validé → EXÉCUTÉ. L'écriture de règlement est
 * générée à l'EXÉCUTION (décaissement réel) : Dr 401 fournisseur / Cr 521 banque
 * (ou 571 caisse). Best-effort : lettrage de la dette fournisseur soldée.
 * Tenancy = societes (RLS). Table fna_payment_order.
 */
import type { DataAdapter } from '@atlas/data';
import { safeAddEntry } from '../entryGuard';
import { applyManualLettrage } from '../lettrageService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export type PaymentMethod = 'sepa' | 'swift' | 'mobile_money' | 'check' | 'cash';
export type PaymentStatus = 'draft' | 'pending' | 'validated' | 'executed' | 'failed';

export interface PaymentOrder {
  id: string;
  reference: string | null;
  beneficiary: string | null;
  third_party_code: string | null;
  method: PaymentMethod;
  amount: number;
  currency: string;
  scheduled_date: string | null;
  status: PaymentStatus;
  bank_account: string | null;
  charge_account: string | null;
  description: string | null;
  journal_entry_id: string | null;
  executed_at: string | null;
}

// Compte de trésorerie crédité selon le mode de règlement.
function bankAccountFor(method: PaymentMethod): string {
  return method === 'cash' ? '571' : '521';
}

export async function listPaymentOrders(adapter: DataAdapter): Promise<PaymentOrder[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_payment_order').select('*').order('scheduled_date', { ascending: false });
  return (data ?? []).map((r: any) => ({ ...r, amount: Number(r.amount) || 0 })) as PaymentOrder[];
}

export async function createPaymentOrder(adapter: DataAdapter, p: {
  reference?: string | null; beneficiary?: string | null; third_party_code?: string | null;
  method: PaymentMethod; amount: number; currency?: string; scheduled_date?: string | null;
  charge_account?: string | null; description?: string | null;
}, createdBy?: string | null): Promise<string> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.from('fna_payment_order').insert({
    tenant_id: tenantOf(adapter),
    reference: p.reference || null,
    beneficiary: p.beneficiary || null,
    third_party_code: p.third_party_code || p.beneficiary || null,
    method: p.method,
    amount: p.amount,
    currency: p.currency || 'XOF',
    scheduled_date: p.scheduled_date || null,
    status: 'pending',
    bank_account: bankAccountFor(p.method),
    charge_account: p.charge_account || '401',
    description: p.description || null,
    created_by: createdBy || null,
  }).select('id').single();
  if (error) throw new Error(error.message);
  return data?.id as string;
}

export async function setPaymentStatus(adapter: DataAdapter, id: string, status: PaymentStatus): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_payment_order').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deletePaymentOrder(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_payment_order').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Exécute un paiement : poste l'écriture de règlement ÉQUILIBRÉE (Dr 401 / Cr
 * banque), passe l'ordre en 'executed', et tente de lettrer la dette
 * fournisseur soldée (best-effort, non bloquant).
 */
export async function executePaymentOrder(adapter: DataAdapter, id: string, executedBy?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');

  const { data: order, error: oErr } = await client.from('fna_payment_order').select('*').eq('id', id).single();
  if (oErr || !order) throw new Error(oErr?.message || 'Ordre introuvable.');
  if (order.status === 'executed') throw new Error('Paiement déjà exécuté.');

  const montant = Number(order.amount) || 0;
  if (montant <= 0) throw new Error('Montant invalide.');
  const compteCharge = String(order.charge_account || '401');
  const compteBank = String(order.bank_account || bankAccountFor(order.method));
  const tiers = order.third_party_code || order.beneficiary || null;
  const date = new Date().toISOString().split('T')[0];
  const nom = String(order.beneficiary || order.reference || 'Bénéficiaire');

  const debitLineId = crypto.randomUUID();
  const lines = [
    { id: debitLineId, accountCode: compteCharge, accountName: 'Fournisseurs', label: `Règlement ${nom}`, debit: montant, credit: 0, thirdPartyCode: tiers },
    { id: crypto.randomUUID(), accountCode: compteBank, accountName: compteBank === '571' ? 'Caisse' : 'Banque', label: `Règlement ${nom}`, debit: 0, credit: montant },
  ];
  const entryId = crypto.randomUUID();
  await safeAddEntry(adapter, {
    id: entryId,
    entryNumber: `REGL-${date.replace(/-/g, '')}-${id.substring(0, 6)}`,
    journal: 'BQ',
    date,
    reference: order.reference || `PAY-${id.substring(0, 8)}`,
    label: `Règlement ${order.method} - ${nom}`,
    status: 'validated',
    lines,
    createdAt: new Date().toISOString(),
    createdBy: executedBy || 'system',
  }, { skipSyncValidation: true });

  await client.from('fna_payment_order').update({
    status: 'executed', journal_entry_id: entryId, executed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id);
  (adapter as any).invalidateCache?.();

  // Best-effort : lettrer le débit de règlement avec des crédits fournisseur
  // ouverts (même tiers) de somme exacte. Silencieux si pas de correspondance.
  if (tiers) {
    try {
      const { data: openCredits } = await client
        .from('journal_lines')
        .select('id,entry_id,debit,credit')
        .eq('third_party_code', tiers)
        .like('account_code', '40%')
        .is('lettrage_code', null)
        .gt('credit', 0);
      const sorted = (openCredits ?? []).filter((l: any) => l.id !== debitLineId);
      const picked: any[] = [];
      let sum = 0;
      for (const l of sorted) {
        if (sum >= montant) break;
        picked.push(l); sum += Number(l.credit) || 0;
      }
      if (Math.abs(sum - montant) < 0.01 && picked.length > 0) {
        await applyManualLettrage(adapter, [
          { entryId, lineId: debitLineId },
          ...picked.map((l: any) => ({ entryId: l.entry_id, lineId: l.id })),
        ]);
      }
    } catch { /* lettrage non bloquant */ }
  }
}
