/**
 * maintenanceService — interventions de maintenance des immobilisations.
 * Persistance réelle dans fna_asset_maintenance (la page était mockée).
 * Tenancy = societes (RLS). Pattern client brut (table hors TableName typé).
 */
import type { DataAdapter } from '@atlas/data';
import { safeAddEntry } from '../entryGuard';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
}

/**
 * Comptabilise le coût d'une intervention de maintenance.
 *  - Maintenance COURANTE (défaut) : charge SYSCOHADA 624 « Entretien, réparations
 *    et maintenance » / Cr 401 (fournisseurs).
 *  - Dépense IMMOBILISABLE (is_capitalizable) : ajoutée à la valeur brute de
 *    l'immobilisation (Dr 2x compte de l'actif / Cr 481) + acquisitionValue relevée.
 */
async function postMaintenanceAccounting(adapter: DataAdapter, m: MaintenanceInput, createdBy?: string | null): Promise<void> {
  const cost = Number(m.cost) || 0;
  if (cost <= 0) return;
  const nom = String(m.asset_name || m.asset_tag || 'immobilisation');
  const date = m.completed_date || m.scheduled_date || new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const suffix = `${(m.asset_tag || m.asset_id || 'NA')}-${date}`.replace(/[^A-Za-z0-9-]/g, '').slice(0, 24);

  if (m.is_capitalizable && m.asset_id) {
    const asset: any = await adapter.getById<any>('assets', m.asset_id);
    const compteImmo = String(asset?.accountCode || asset?.account_code || '').trim();
    if (asset && compteImmo) {
      await safeAddEntry(adapter, {
        id: crypto.randomUUID(), entryNumber: `MAINT-IMMO-${suffix}`, journal: 'OD', date,
        reference: `MAINT-IMMO-${m.asset_id}`, label: `Dépense immobilisable — ${nom}`, status: 'validated',
        lines: [
          { id: crypto.randomUUID(), accountCode: compteImmo, accountName: nom, label: `Immobilisation dépense ${nom}`, debit: cost, credit: 0 },
          { id: crypto.randomUUID(), accountCode: '481', accountName: "Fournisseurs d'investissements", label: `Dette dépense ${nom}`, debit: 0, credit: cost },
        ],
        createdAt: now, createdBy: createdBy || 'system',
      } as any, { skipSyncValidation: true });
      await adapter.update('assets', m.asset_id, { acquisitionValue: (Number(asset.acquisitionValue) || 0) + cost });
      return;
    }
  }
  // Charge courante d'entretien.
  await safeAddEntry(adapter, {
    id: crypto.randomUUID(), entryNumber: `MAINT-${suffix}`, journal: 'OD', date,
    reference: `MAINT-${m.asset_id || suffix}`, label: `Maintenance — ${nom}`, status: 'validated',
    lines: [
      { id: crypto.randomUUID(), accountCode: '624', accountName: 'Entretien, réparations et maintenance', label: `Maintenance ${nom}`, debit: cost, credit: 0 },
      { id: crypto.randomUUID(), accountCode: '401', accountName: 'Fournisseurs', label: `Dette maintenance ${nom}`, debit: 0, credit: cost },
    ],
    createdAt: now, createdBy: createdBy || 'system',
  } as any, { skipSyncValidation: true });
}

export interface MaintenanceInput {
  asset_id?: string | null;
  asset_name?: string | null;
  asset_tag?: string | null;
  category?: string | null;
  maintenance_type: string;
  status?: string;
  priority?: string;
  scheduled_date?: string | null;
  completed_date?: string | null;
  estimated_duration?: number | null;
  actual_duration?: number | null;
  cost?: number | null;
  estimated_cost?: number | null;
  is_capitalizable?: boolean | null;
  assigned_to?: string | null;
  technician?: string | null;
  supplier?: string | null;
  description?: string | null;
  work_performed?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface MaintenanceRow extends MaintenanceInput {
  id: string;
  status: string;
  created_at: string;
}

export async function listMaintenance(adapter: DataAdapter): Promise<MaintenanceRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('fna_asset_maintenance').select('*').order('scheduled_date', { ascending: false });
  return (data ?? []).map((r: any) => ({
    ...r,
    cost: Number(r.cost) || 0,
    estimated_cost: Number(r.estimated_cost) || 0,
    estimated_duration: r.estimated_duration != null ? Number(r.estimated_duration) : null,
    actual_duration: r.actual_duration != null ? Number(r.actual_duration) : null,
  })) as MaintenanceRow[];
}

export async function createMaintenance(adapter: DataAdapter, m: MaintenanceInput, createdBy?: string | null): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  // is_capitalizable est un drapeau de contrôle (pas une colonne stockée).
  const { is_capitalizable, ...row } = m;
  const { error } = await client.from('fna_asset_maintenance').insert({
    tenant_id: tenantOf(adapter), ...row, created_by: createdBy || null,
  });
  if (error) throw new Error(error.message);
  // Comptabilise le coût (charge 624 courante ou immobilisation), si renseigné.
  if ((Number(m.cost) || 0) > 0) {
    try { await postMaintenanceAccounting(adapter, m, createdBy); }
    catch (e: any) { if (!/Doublon/i.test(e?.message || '')) throw e; }
  }
}

export async function updateMaintenance(adapter: DataAdapter, id: string, m: Partial<MaintenanceInput>): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_asset_maintenance').update({ ...m, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setMaintenanceStatus(adapter: DataAdapter, id: string, status: string): Promise<void> {
  return updateMaintenance(adapter, id, { status });
}

export async function deleteMaintenance(adapter: DataAdapter, id: string): Promise<void> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { error } = await client.from('fna_asset_maintenance').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
