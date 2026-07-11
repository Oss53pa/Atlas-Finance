/**
 * stockActivation — gate d'activation du module Stock.
 *
 * Règle « muet sans classe 3 » (docs/stock-module/DESIGN.md §1bis) :
 *  - un réglage explicite `stock.enabled` fait foi (true/false) ;
 *  - sinon auto-détection : le module est actif si le tenant possède déjà des
 *    articles (`stockMaterials`) OU utilise réellement la classe 3 (comptes de
 *    classe 3 mouvementés).
 *  - une entreprise de services (sans classe 3, sans article) reste muette.
 *
 * L'activation explicite seede le catalogue des mouvements + la détermination
 * comptable (`stock_seed_defaults`) et crée un magasin par défaut.
 */
import type { DataAdapter } from '@atlas/data';

const SETTING_KEY = 'stock.enabled';

interface SettingRow { key: string; value: string }

function getClient(adapter: DataAdapter): any | null {
  return (adapter as any).client ?? null;
}

async function tenantOf(adapter: DataAdapter): Promise<string | null> {
  const c = getClient(adapter);
  if (!c) return null;
  try {
    const { data } = await c.rpc('get_user_company_id');
    return (data as string) ?? null;
  } catch {
    return null;
  }
}

/** Lit le réglage explicite. `null` si non défini. */
async function readExplicitFlag(adapter: DataAdapter): Promise<boolean | null> {
  const row = await adapter.getById<SettingRow>('settings', SETTING_KEY).catch(() => null);
  if (!row?.value) return null;
  try {
    const parsed = JSON.parse(row.value);
    if (typeof parsed === 'boolean') return parsed;
    if (parsed && typeof parsed.enabled === 'boolean') return parsed.enabled;
  } catch {
    /* valeur illisible → ignorer */
  }
  return null;
}

// Mémoïsation par session : le gate est consulté par la nav/les routes.
let _cache: { value: boolean; at: number } | null = null;
const TTL_MS = 30_000;

/**
 * Le module Stock est-il actif pour le tenant courant ?
 * Mémoïsé (30 s). Passer `force` pour recalculer (après activation).
 */
export async function isStockModuleEnabled(adapter: DataAdapter, force = false): Promise<boolean> {
  if (!force && _cache && Date.now() - _cache.at < TTL_MS) return _cache.value;

  let enabled = false;
  const explicit = await readExplicitFlag(adapter);
  if (explicit !== null) {
    enabled = explicit;
  } else {
    // Auto-détection : présence d'articles…
    const materials = await adapter.getAll<{ id: string }>('stockMaterials').catch(() => []);
    if (materials.length > 0) {
      enabled = true;
    } else {
      // …ou usage réel de la classe 3 (comptes de classe 3 mouvementés).
      enabled = await usesClass3(adapter);
    }
  }

  _cache = { value: enabled, at: Date.now() };
  return enabled;
}

/**
 * Le tenant utilise-t-il RÉELLEMENT la classe 3 ? On teste l'existence d'au moins
 * une ligne d'écriture sur un compte 3x (fonction serveur `stock_uses_class3`),
 * PAS la simple présence de comptes de classe 3 au plan — tout plan SYSCOHADA en
 * contient, ce qui rendrait toute entreprise (services comprise) « bruyante ».
 */
async function usesClass3(adapter: DataAdapter): Promise<boolean> {
  const client = getClient(adapter);
  const tenant = await tenantOf(adapter);
  if (client && tenant) {
    try {
      const { data } = await client.rpc('stock_uses_class3', { p_tenant: tenant });
      if (typeof data === 'boolean') return data;
    } catch {
      /* RPC indisponible → repli conservateur ci-dessous */
    }
  }
  return false; // à défaut : muet, activation explicite
}

/** Force le réglage explicite (true/false). */
export async function setStockModuleEnabled(adapter: DataAdapter, enabled: boolean): Promise<void> {
  const payload: SettingRow = { key: SETTING_KEY, value: JSON.stringify(enabled) };
  const existing = await adapter.getById('settings', SETTING_KEY).catch(() => null);
  if (existing) await adapter.update('settings', SETTING_KEY, payload as any);
  else await adapter.create('settings', payload as any);
  _cache = { value: enabled, at: Date.now() };
}

/**
 * Active explicitement le module : réglage + seed (catalogue mouvements +
 * détermination comptable) + magasin/emplacement par défaut.
 */
export async function activateStockModule(adapter: DataAdapter): Promise<void> {
  await setStockModuleEnabled(adapter, true);

  const client = getClient(adapter);
  const tenant = await tenantOf(adapter);
  if (client && tenant) {
    try {
      await client.rpc('stock_seed_defaults', { p_tenant: tenant });
    } catch {
      /* seed best-effort : idempotent, réessayable */
    }
  }

  // Magasin par défaut si aucun n'existe encore.
  const warehouses = await adapter.getAll<{ id: string }>('stockWarehouses').catch(() => []);
  if (warehouses.length === 0) {
    const wh = await adapter.create<any>('stockWarehouses', {
      code: 'MP', name: 'Magasin principal', type: 'principal', active: true,
    });
    await adapter.create<any>('stockLocations', {
      warehouseId: wh.id, code: 'STD', name: 'Emplacement standard', type: 'standard', active: true,
    });
  }
}

/** Désactive le module (le rend muet). Ne supprime aucune donnée. */
export async function deactivateStockModule(adapter: DataAdapter): Promise<void> {
  await setStockModuleEnabled(adapter, false);
}

/** Invalide le cache (ex. après création du premier article). */
export function invalidateStockEnabledCache(): void {
  _cache = null;
}
