/**
 * maintenanceService — interventions de maintenance des immobilisations.
 * Persistance réelle dans fna_asset_maintenance (la page était mockée).
 * Tenancy = societes (RLS). Pattern client brut (table hors TableName typé).
 */
import type { DataAdapter } from '@atlas/data';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}
function tenantOf(adapter: DataAdapter): string {
  return (adapter as any).tenantId as string;
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
  const { error } = await client.from('fna_asset_maintenance').insert({
    tenant_id: tenantOf(adapter), ...m, created_by: createdBy || null,
  });
  if (error) throw new Error(error.message);
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
