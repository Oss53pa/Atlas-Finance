/**
 * Service de gestion des stocks — connecté aux données réelles via DataAdapter.
 *
 * Implémente :
 * - CRUD articles en stock (inventoryItems)
 * - Mouvements de stock persistés (stockMovements)
 * - Valorisation CUMP (Coût Unitaire Moyen Pondéré) — méthode SYSCOHADA par défaut
 * - Valorisation FIFO (First In First Out)
 * - Variation de stocks (603) — génération automatique d'écritures comptables
 * - KPIs temps réel depuis les données réelles
 *
 * Conforme SYSCOHADA révisé — Système Normal.
 * Comptes concernés : Classe 3 (stocks), 603x (variations).
 */
import type { DataAdapter } from '@atlas/data';
import { money } from '../../utils/money';
import type { DBInventoryItem, DBStockMovement, DBJournalEntry } from '../../lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface StockMovementInput {
  itemId: string;
  date: string;
  type: 'receipt' | 'issue' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  unitCost: number;
  reference: string;
  label: string;
  createdBy?: string;
}

export interface StockValuation {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  method: 'CUMP' | 'FIFO';
}

export interface StockVariationEntry {
  accountCode: string;
  accountName: string;
  stockInitial: number;
  stockFinal: number;
  variation: number;
}

export interface InventoryKPIsReal {
  totalItems: number;
  totalValue: number;
  totalMovements: number;
  lowStockItems: number;
  outOfStockItems: number;
  overStockItems: number;
  averageCUMP: number;
  variationStocks603: number;
}

// SYSCOHADA mapping: item category → stock account (3x) + variation account (603x)
const SYSCOHADA_STOCK_ACCOUNTS: Record<string, { stock: string; variation: string; stockName: string; variationName: string }> = {
  'marchandises':     { stock: '31', variation: '6031', stockName: 'Marchandises', variationName: 'Variation de stocks de marchandises' },
  'matieres':         { stock: '32', variation: '6032', stockName: 'Matières premières', variationName: 'Variation de stocks de matières premières' },
  'approvisionnements': { stock: '33', variation: '6033', stockName: 'Autres approvisionnements', variationName: 'Variation de stocks — autres approv.' },
  'en_cours':         { stock: '34', variation: '7134', stockName: 'En-cours de production', variationName: 'Variation en-cours' },
  'produits_finis':   { stock: '35', variation: '7135', stockName: 'Produits finis', variationName: 'Variation produits finis' },
  'produits_residuels': { stock: '36', variation: '7136', stockName: 'Produits résiduels', variationName: 'Variation produits résiduels' },
};

function getStockAccounts(category: string) {
  const cat = category.toLowerCase().replace(/[- ]/g, '_');
  return SYSCOHADA_STOCK_ACCOUNTS[cat] || SYSCOHADA_STOCK_ACCOUNTS['marchandises'];
}

// ============================================================================
// CUMP — Coût Unitaire Moyen Pondéré
// ============================================================================

/**
 * Calcule le CUMP après un mouvement d'entrée.
 * CUMP = (Valeur stock existant + Valeur nouvelle entrée) / (Quantité existante + Quantité entrée)
 */
export function calculateCUMP(
  currentQuantity: number,
  currentValue: number,
  incomingQuantity: number,
  incomingUnitCost: number,
): { cump: number; newQuantity: number; newValue: number } {
  const newQuantity = currentQuantity + incomingQuantity;
  if (newQuantity <= 0) {
    return { cump: 0, newQuantity: 0, newValue: 0 };
  }
  const incomingValue = money(incomingQuantity).multiply(incomingUnitCost).toNumber();
  const newValue = money(currentValue).add(incomingValue).toNumber();
  const cump = money(newValue).divide(newQuantity).toNumber();
  return { cump, newQuantity, newValue };
}

// ============================================================================
// FIFO — First In First Out
// ============================================================================

export interface CostLayer {
  date: string;
  quantity: number;
  unitCost: number;
}

/**
 * Calcule la valeur d'une sortie FIFO et retourne les couches restantes.
 */
export function consumeFIFO(
  layers: CostLayer[],
  quantityOut: number,
): { costOfIssue: number; remainingLayers: CostLayer[] } {
  const sorted = [...layers].sort((a, b) => a.date.localeCompare(b.date));
  let remaining = quantityOut;
  let costOfIssue = 0;
  const newLayers: CostLayer[] = [];

  for (const layer of sorted) {
    if (remaining <= 0) {
      newLayers.push({ ...layer });
      continue;
    }
    if (layer.quantity <= remaining) {
      costOfIssue = money(costOfIssue).add(money(layer.quantity).multiply(layer.unitCost)).toNumber();
      remaining -= layer.quantity;
    } else {
      costOfIssue = money(costOfIssue).add(money(remaining).multiply(layer.unitCost)).toNumber();
      newLayers.push({ ...layer, quantity: layer.quantity - remaining });
      remaining = 0;
    }
  }

  return { costOfIssue, remainingLayers: newLayers };
}

// ============================================================================
// MOUVEMENTS DE STOCK
// ============================================================================

/**
 * Enregistre un mouvement de stock et met à jour l'article.
 * - Entrée (receipt/return) : recalcule le CUMP
 * - Sortie (issue/transfer) : utilise le CUMP courant
 * - Ajustement : traité comme entrée si positif, sortie si négatif
 */
export async function recordMovement(
  adapter: DataAdapter,
  input: StockMovementInput,
): Promise<DBStockMovement> {
  const item = await adapter.getById<DBInventoryItem>('inventoryItems', input.itemId);
  if (!item) throw new Error(`Article introuvable : ${input.itemId}`);

  const isEntry = input.type === 'receipt' || input.type === 'return'
    || (input.type === 'adjustment' && input.quantity > 0);

  let cumpAfter: number;
  let quantityAfter: number;
  let valueAfter: number;

  if (isEntry) {
    const result = calculateCUMP(
      item.quantity,
      item.totalValue,
      Math.abs(input.quantity),
      input.unitCost,
    );
    cumpAfter = result.cump;
    quantityAfter = result.newQuantity;
    valueAfter = result.newValue;
  } else {
    // Sortie : on utilise le CUMP courant
    const qtyOut = Math.abs(input.quantity);
    quantityAfter = Math.max(0, item.quantity - qtyOut);
    cumpAfter = item.unitCost; // CUMP inchangé sur sortie
    valueAfter = money(quantityAfter).multiply(cumpAfter).toNumber();
  }

  const totalCost = money(Math.abs(input.quantity)).multiply(
    isEntry ? input.unitCost : item.unitCost,
  ).toNumber();

  // Persister le mouvement
  const movement = await adapter.create<DBStockMovement>('stockMovements', {
    itemId: input.itemId,
    date: input.date,
    type: input.type,
    quantity: isEntry ? Math.abs(input.quantity) : -Math.abs(input.quantity),
    unitCost: isEntry ? input.unitCost : item.unitCost,
    totalCost,
    reference: input.reference,
    label: input.label,
    cumpAfter,
    quantityAfter,
    valueAfter,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
  });

  // Mettre à jour l'article
  await adapter.update<DBInventoryItem>('inventoryItems', input.itemId, {
    quantity: quantityAfter,
    unitCost: cumpAfter,
    totalValue: valueAfter,
    lastMovementDate: input.date,
    updatedAt: new Date().toISOString(),
  });

  return movement;
}

/**
 * Récupère les mouvements d'un article, triés par date.
 */
export async function getMovements(
  adapter: DataAdapter,
  itemId?: string,
  dateRange?: { from: string; to: string },
): Promise<DBStockMovement[]> {
  let movements: DBStockMovement[];

  if (itemId) {
    movements = await adapter.getAll<DBStockMovement>('stockMovements', {
      where: { itemId },
      orderBy: { field: 'date', direction: 'asc' },
    });
  } else {
    movements = await adapter.getAll<DBStockMovement>('stockMovements', {
      orderBy: { field: 'date', direction: 'asc' },
    });
  }

  if (dateRange) {
    movements = movements.filter(m => m.date >= dateRange.from && m.date <= dateRange.to);
  }

  return movements;
}

// ============================================================================
// VALORISATION
// ============================================================================

/**
 * Valorise le stock avec la méthode CUMP (valeur = quantité × CUMP courant).
 */
export async function valuateStockCUMP(
  adapter: DataAdapter,
): Promise<StockValuation[]> {
  const items = await adapter.getAll<DBInventoryItem>('inventoryItems');
  return items
    .filter(item => item.status === 'active')
    .map(item => ({
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: item.quantity,
      unitCost: item.unitCost,
      totalValue: item.totalValue,
      method: 'CUMP' as const,
    }));
}

/**
 * Valorise le stock avec la méthode FIFO depuis les mouvements.
 */
export async function valuateStockFIFO(
  adapter: DataAdapter,
): Promise<StockValuation[]> {
  const items = await adapter.getAll<DBInventoryItem>('inventoryItems');
  const result: StockValuation[] = [];

  for (const item of items) {
    if (item.status !== 'active') continue;

    const movements = await getMovements(adapter, item.id);

    // Reconstituer les couches FIFO
    let layers: CostLayer[] = [];
    for (const mvt of movements) {
      if (mvt.quantity > 0) {
        // Entrée — ajouter une couche
        layers.push({ date: mvt.date, quantity: mvt.quantity, unitCost: mvt.unitCost });
      } else {
        // Sortie — consommer en FIFO
        const { remainingLayers } = consumeFIFO(layers, Math.abs(mvt.quantity));
        layers = remainingLayers;
      }
    }

    const totalQuantity = layers.reduce((s, l) => s + l.quantity, 0);
    const totalValue = layers.reduce((s, l) => s + money(l.quantity).multiply(l.unitCost).toNumber(), 0);
    const unitCost = totalQuantity > 0 ? money(totalValue).divide(totalQuantity).toNumber() : 0;

    result.push({
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      quantity: totalQuantity,
      unitCost,
      totalValue,
      method: 'FIFO',
    });
  }

  return result;
}

// ============================================================================
// VARIATION DE STOCKS (603) — Écriture comptable automatique
// ============================================================================

/**
 * Calcule la variation de stocks pour une période et génère l'écriture 603.
 *
 * SYSCOHADA :
 * - Variation = Stock Initial - Stock Final
 * - Si variation > 0 (stock diminue) : Débit 603x, Crédit 3x
 * - Si variation < 0 (stock augmente) : Débit 3x, Crédit 603x
 */
export async function calculateStockVariation(
  adapter: DataAdapter,
  periodeDebut: string,
  periodeFin: string,
): Promise<StockVariationEntry[]> {
  const items = await adapter.getAll<DBInventoryItem>('inventoryItems');
  const variations: StockVariationEntry[] = [];

  for (const item of items) {
    if (item.status !== 'active') continue;

    const movements = await getMovements(adapter, item.id);

    // Stock initial = valeur au début de la période
    const movementsBefore = movements.filter(m => m.date < periodeDebut);
    const stockInitial = movementsBefore.length > 0
      ? movementsBefore[movementsBefore.length - 1].valueAfter
      : 0;

    // Stock final = valeur à la fin de la période
    const movementsInPeriod = movements.filter(m => m.date >= periodeDebut && m.date <= periodeFin);
    const stockFinal = movementsInPeriod.length > 0
      ? movementsInPeriod[movementsInPeriod.length - 1].valueAfter
      : stockInitial;

    const variation = money(stockInitial).subtract(stockFinal).toNumber();
    if (variation === 0) continue;

    const accounts = getStockAccounts(item.category);
    variations.push({
      accountCode: accounts.variation,
      accountName: accounts.variationName,
      stockInitial,
      stockFinal,
      variation,
    });
  }

  // Regrouper par compte de variation
  const grouped = new Map<string, StockVariationEntry>();
  for (const v of variations) {
    const existing = grouped.get(v.accountCode);
    if (existing) {
      existing.stockInitial = money(existing.stockInitial).add(v.stockInitial).toNumber();
      existing.stockFinal = money(existing.stockFinal).add(v.stockFinal).toNumber();
      existing.variation = money(existing.variation).add(v.variation).toNumber();
    } else {
      grouped.set(v.accountCode, { ...v });
    }
  }

  return Array.from(grouped.values());
}

/**
 * Génère l'écriture comptable de variation de stocks (603/3x).
 */
export async function generateVariationJournalEntry(
  adapter: DataAdapter,
  periodeDebut: string,
  periodeFin: string,
): Promise<DBJournalEntry | null> {
  const variations = await calculateStockVariation(adapter, periodeDebut, periodeFin);
  if (variations.length === 0) return null;

  const lines: Array<{
    id: string;
    accountCode: string;
    accountName: string;
    label: string;
    debit: number;
    credit: number;
  }> = [];

  for (const v of variations) {
    const stockAccount = getStockAccounts(
      Object.keys(SYSCOHADA_STOCK_ACCOUNTS).find(
        k => SYSCOHADA_STOCK_ACCOUNTS[k].variation === v.accountCode,
      ) || 'marchandises',
    );

    if (v.variation > 0) {
      // Stock diminue : Débit 603x, Crédit 3x
      lines.push({
        id: crypto.randomUUID(),
        accountCode: v.accountCode,
        accountName: v.accountName,
        label: `Variation de stocks ${periodeDebut} → ${periodeFin}`,
        debit: v.variation,
        credit: 0,
      });
      lines.push({
        id: crypto.randomUUID(),
        accountCode: stockAccount.stock,
        accountName: stockAccount.stockName,
        label: `Variation de stocks ${periodeDebut} → ${periodeFin}`,
        debit: 0,
        credit: v.variation,
      });
    } else {
      // Stock augmente : Débit 3x, Crédit 603x
      const absVariation = Math.abs(v.variation);
      lines.push({
        id: crypto.randomUUID(),
        accountCode: stockAccount.stock,
        accountName: stockAccount.stockName,
        label: `Variation de stocks ${periodeDebut} → ${periodeFin}`,
        debit: absVariation,
        credit: 0,
      });
      lines.push({
        id: crypto.randomUUID(),
        accountCode: v.accountCode,
        accountName: v.accountName,
        label: `Variation de stocks ${periodeDebut} → ${periodeFin}`,
        debit: 0,
        credit: absVariation,
      });
    }
  }

  const totalDebit = lines.reduce((s, l) => money(s).add(l.debit).toNumber(), 0);
  const totalCredit = lines.reduce((s, l) => money(s).add(l.credit).toNumber(), 0);

  const entry: Omit<DBJournalEntry, 'id'> = {
    entryNumber: `VAR-${periodeFin.substring(0, 7)}`,
    journal: 'OD',
    date: periodeFin,
    reference: `Variation stocks ${periodeDebut} → ${periodeFin}`,
    label: 'Écriture de variation de stocks',
    status: 'draft',
    nature: 'inventaire',
    lines,
    totalDebit,
    totalCredit,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return adapter.create<DBJournalEntry>('journalEntries', entry);
}

// ============================================================================
// KPIs
// ============================================================================

/**
 * KPIs temps réel calculés depuis les données d'inventaire.
 */
export async function getInventoryKPIs(
  adapter: DataAdapter,
): Promise<InventoryKPIsReal> {
  const items = await adapter.getAll<DBInventoryItem>('inventoryItems');
  const movements = await adapter.getAll<DBStockMovement>('stockMovements');

  const activeItems = items.filter(i => i.status === 'active');

  const totalValue = activeItems.reduce(
    (sum, item) => money(sum).add(item.totalValue).toNumber(), 0,
  );

  const lowStockItems = activeItems.filter(i => i.quantity > 0 && i.quantity <= i.minStock).length;
  const outOfStockItems = activeItems.filter(i => i.quantity <= 0).length;
  const overStockItems = activeItems.filter(i => i.maxStock > 0 && i.quantity > i.maxStock).length;

  const totalCUMP = activeItems.reduce((sum, i) => sum + i.unitCost, 0);
  const averageCUMP = activeItems.length > 0 ? totalCUMP / activeItems.length : 0;

  // Variation stocks 603 = somme des mouvements de sortie (pour la période courante)
  const year = new Date().getFullYear().toString();
  const yearMovements = movements.filter(m => m.date.startsWith(year) && m.quantity < 0);
  const variationStocks603 = yearMovements.reduce(
    (sum, m) => money(sum).add(Math.abs(m.totalCost)).toNumber(), 0,
  );

  return {
    totalItems: activeItems.length,
    totalValue,
    totalMovements: movements.length,
    lowStockItems,
    outOfStockItems,
    overStockItems,
    averageCUMP: money(averageCUMP).toNumber(),
    variationStocks603,
  };
}

// ============================================================================
// EXPORT — Classe compatible avec l'ancienne API
// ============================================================================

class InventoryService {
  async recordMovement(adapter: DataAdapter, input: StockMovementInput) {
    return recordMovement(adapter, input);
  }

  async getMovements(adapter: DataAdapter, itemId?: string, dateRange?: { from: string; to: string }) {
    return getMovements(adapter, itemId, dateRange);
  }

  async valuateStock(adapter: DataAdapter, method: 'CUMP' | 'FIFO' = 'CUMP') {
    return method === 'FIFO' ? valuateStockFIFO(adapter) : valuateStockCUMP(adapter);
  }

  async calculateStockVariation(adapter: DataAdapter, debut: string, fin: string) {
    return calculateStockVariation(adapter, debut, fin);
  }

  async generateVariationEntry(adapter: DataAdapter, debut: string, fin: string) {
    return generateVariationJournalEntry(adapter, debut, fin);
  }

  async getKPIs(adapter: DataAdapter) {
    return getInventoryKPIs(adapter);
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
