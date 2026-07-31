/**
 * paramBootstrapService — initialisation standard d'un tenant (CDC Paramètres §22, critère #6).
 *
 * Opération SAME-TENANT, non destructive, idempotente : garantit qu'un tenant
 * dispose du paramétrage standard minimal (plan analytique, conditions de
 * paiement, rôles standard) sans saisie manuelle. Complète ce que les migrations
 * seedent pour les tenants existants — utile pour une société créée après coup.
 */
import type { DataAdapter } from '@atlas/data';
import { listPlans, ensureDefaultPlan } from '../../features/budget/services/planService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

export const STANDARD_CONDITIONS = [
  { code: 'COMPTANT', libelle: 'Comptant', jours: 0, fin_de_mois: false },
  { code: '30J', libelle: '30 jours', jours: 30, fin_de_mois: false },
  { code: '45J', libelle: '45 jours', jours: 45, fin_de_mois: false },
  { code: '60J', libelle: '60 jours', jours: 60, fin_de_mois: false },
  { code: '30JFM', libelle: '30 jours fin de mois', jours: 30, fin_de_mois: true },
];

/** Rôles standard livrés (CDC §13). Stockés dans settings.roles_config. */
export const STANDARD_ROLES = [
  { code: 'ADMIN', name: 'Administrateur', category: 'admin', description: 'Accès complet' },
  { code: 'DAF', name: 'Directeur financier', category: 'management', description: 'Direction financière, validation & publication' },
  { code: 'CHEF_COMPTA', name: 'Chef comptable', category: 'management', description: 'Supervision comptable, validation' },
  { code: 'COMPTABLE', name: 'Comptable', category: 'operational', description: 'Saisie comptable' },
  { code: 'CDG', name: 'Contrôleur de gestion', category: 'operational', description: 'Analytique, budget, reporting' },
  { code: 'TRESORIER', name: 'Trésorier', category: 'operational', description: 'Trésorerie, paiements' },
  { code: 'AUDITEUR', name: 'Auditeur', category: 'readonly', description: 'Lecture seule + piste d’audit' },
  { code: 'CONSULTATION', name: 'Consultation', category: 'readonly', description: 'Lecture seule' },
];

export interface BootstrapStatus {
  hasPlan: boolean;
  nbConditions: number;
  nbRoles: number;
  missing: BootstrapBlock[];
}
export type BootstrapBlock = 'plan' | 'conditions' | 'roles';

/** Déduit les blocs manquants. Fonction pure. */
export function computeMissing(input: { hasPlan: boolean; nbConditions: number; nbRoles: number }): BootstrapBlock[] {
  const m: BootstrapBlock[] = [];
  if (!input.hasPlan) m.push('plan');
  if (input.nbConditions === 0) m.push('conditions');
  if (input.nbRoles === 0) m.push('roles');
  return m;
}

export async function getBootstrapStatus(adapter: DataAdapter): Promise<BootstrapStatus> {
  const client = getClient(adapter);
  if (!client) return { hasPlan: false, nbConditions: 0, nbRoles: 0, missing: ['plan', 'conditions', 'roles'] };
  const [plans, { count: nbConditions }, rolesCfg] = await Promise.all([
    listPlans(adapter),
    client.from('condition_paiement').select('id', { count: 'exact', head: true }),
    adapter.getById<any>('settings', 'roles_config').catch(() => null),
  ]);
  let nbRoles = 0;
  try { nbRoles = rolesCfg?.value ? JSON.parse(rolesCfg.value).length : 0; } catch { nbRoles = 0; }
  const hasPlan = plans.length > 0;
  return { hasPlan, nbConditions: nbConditions ?? 0, nbRoles, missing: computeMissing({ hasPlan, nbConditions: nbConditions ?? 0, nbRoles }) };
}

export interface BootstrapReport { plan: boolean; conditions: number; roles: number; }

/** Initialise les blocs manquants (idempotent). Renvoie ce qui a été créé. */
export async function runBootstrap(adapter: DataAdapter): Promise<BootstrapReport> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const tenantId = tenantOf(adapter);
  const status = await getBootstrapStatus(adapter);
  const report: BootstrapReport = { plan: false, conditions: 0, roles: 0 };

  if (status.missing.includes('plan')) {
    await ensureDefaultPlan(adapter);
    report.plan = true;
  }

  if (status.missing.includes('conditions')) {
    const rows = STANDARD_CONDITIONS.map(c => ({ tenant_id: tenantId, ...c, actif: true }));
    const { error } = await client.from('condition_paiement').upsert(rows, { onConflict: 'tenant_id,code', ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    report.conditions = rows.length;
  }

  if (status.missing.includes('roles')) {
    const now = new Date().toISOString();
    const roles = STANDARD_ROLES.map(r => ({
      id: (globalThis.crypto?.randomUUID?.() ?? `${r.code}-${Date.now()}`),
      name: r.name, code: r.code, description: r.description, permissions: [] as string[],
      usersCount: 0, isSystemRole: true, category: r.category, createdAt: now, lastModified: now, createdBy: 'bootstrap',
    }));
    const payload = { key: 'roles_config', value: JSON.stringify(roles), updatedAt: now };
    const existing = await adapter.getById<any>('settings', 'roles_config').catch(() => null);
    if (existing) await adapter.update('settings', 'roles_config', payload);
    else await adapter.create('settings', payload);
    report.roles = roles.length;
  }

  return report;
}
