/**
 * rbacService — catalogue des permissions (CDC Paramètres §13).
 *
 * Source réelle des permissions = table `permissions` (codes module.action).
 * Utilisé par l'éditeur de rôles pour proposer un vrai sélecteur (les rôles
 * stockent leurs codes de permission dans settings.roles_config).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

export interface PermCatalogueItem {
  code: string;
  name: string;
  module: string;
}

/** Catalogue des permissions disponibles (table `permissions`), trié par module. */
export async function listPermissionCatalogue(adapter: DataAdapter): Promise<PermCatalogueItem[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('permissions').select('code,name,module').order('module').order('code');
  return (data ?? []) as PermCatalogueItem[];
}
