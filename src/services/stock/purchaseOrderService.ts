/**
 * purchaseOrderService — génération de commandes fournisseurs (module Achats).
 *
 * La table purchase_orders porte `company_id` (pas `tenant_id`) et sa RLS filtre
 * sur `company_id = get_user_company_id()`. L'adapter générique injecte `tenant_id`
 * (colonne inexistante ici) → adapter.create échouerait en SaaS. On écrit donc via
 * le CLIENT BRUT en posant `company_id`. En mode test (Dexie, pas de client) on
 * retombe sur adapter.create.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial } from '../../lib/db';
import { money, Money } from '../../utils/money';
import type { ReorderProposal } from './reorderService';

export interface DraftPurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  lineCount: number;
  totalHt: number;
}
export interface GeneratePOResult {
  orders: DraftPurchaseOrder[];
  skippedNoSupplier: number;
}

function getClient(adapter: DataAdapter): any | null { return (adapter as any).client ?? null; }
async function tenantOf(adapter: DataAdapter): Promise<string | null> {
  const c = getClient(adapter);
  if (!c) return null;
  try { const { data } = await c.rpc('get_user_company_id'); return (data as string) ?? null; } catch { return null; }
}
async function nextOrderNumber(adapter: DataAdapter, tenant: string | null): Promise<string> {
  const c = getClient(adapter);
  if (c && tenant) {
    try { const { data } = await c.rpc('stock_next_number', { p_tenant: tenant, p_object: 'PO', p_prefix: 'CF-' }); if (typeof data === 'string' && data) return data; } catch { /* repli */ }
  }
  return `CF-${Date.now()}`;
}

/** Compte d'achat SYSCOHADA par classe de valorisation de l'article. */
function purchaseAccount(m: DBStockMaterial): string {
  switch (m.valuationClass) {
    case 'MARCH': return '601';
    case 'MP': return '602';
    case 'APPRO': return '604';
    case 'EMB': return '608';
    default: return '601';
  }
}

/**
 * Génère un brouillon de commande fournisseur par fournisseur, à partir des
 * propositions de réappro sélectionnées. Les articles sans fournisseur par défaut
 * sont ignorés (retournés dans skippedNoSupplier).
 */
export async function generatePurchaseOrders(
  adapter: DataAdapter,
  proposals: ReorderProposal[],
  orderDate: string,
): Promise<GeneratePOResult> {
  const tenant = await tenantOf(adapter);
  const client = getClient(adapter);

  // Regroupe par fournisseur
  const bySupplier = new Map<string, ReorderProposal[]>();
  let skippedNoSupplier = 0;
  for (const p of proposals) {
    if (!p.supplierId) { skippedNoSupplier++; continue; }
    const arr = bySupplier.get(p.supplierId) || [];
    arr.push(p);
    bySupplier.set(p.supplierId, arr);
  }

  const orders: DraftPurchaseOrder[] = [];
  for (const [supplierId, props] of bySupplier) {
    const lines = props.map(p => {
      const unitPrice = p.material.standardPrice ?? p.material.movingAvgCost ?? 0;
      return {
        description: `${p.material.code} — ${p.material.name}`,
        quantity: p.suggestedQty,
        unitPrice,
        account: purchaseAccount(p.material),
        vatRate: 0,
      };
    });
    const totalHt = Money.sum(lines.map(l => money(l.quantity).multiply(l.unitPrice))).toNumber();
    const orderNumber = await nextOrderNumber(adapter, tenant);
    const id = crypto.randomUUID();

    if (client && tenant) {
      // Écriture SaaS via client brut (company_id, pas tenant_id).
      const now = new Date().toISOString();
      const { error } = await client.from('purchase_orders').insert({
        id, company_id: tenant, supplier_id: supplierId, order_number: orderNumber,
        order_date: orderDate, status: 'draft', lines,
        total_ht: totalHt, total_vat: 0, total_ttc: totalHt,
        created_at: now, updated_at: now,
      });
      if (error) throw new Error(`Création commande échouée : ${error.message}`);
    } else {
      // Mode test/Dexie
      await adapter.create('purchaseOrders', {
        id, companyId: tenant ?? 'test', supplierId, orderNumber, orderDate, status: 'draft',
        lines, totalHt, totalVat: 0, totalTtc: totalHt,
      } as any);
    }

    await adapter.logAudit?.({
      action: 'PURCHASE_ORDER_DRAFT_CREATED', entityType: 'purchaseOrder', entityId: id,
      details: JSON.stringify({ orderNumber, supplierId, lineCount: lines.length, totalHt }),
      timestamp: new Date().toISOString(), previousHash: '',
    });

    orders.push({ id, orderNumber, supplierId, lineCount: lines.length, totalHt });
  }

  return { orders, skippedNoSupplier };
}
