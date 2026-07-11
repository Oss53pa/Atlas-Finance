/**
 * materialService — CRUD du référentiel article (material master, SAP MARA).
 * Toutes les fonctions prennent `adapter: DataAdapter` en 1er param.
 */
import type { DataAdapter } from '@atlas/data';
import type { DBStockMaterial } from '../../lib/db';
import { invalidateStockEnabledCache } from './stockActivation';

export type MaterialInput = Omit<DBStockMaterial, 'id' | 'createdAt' | 'updatedAt' | 'movingAvgCost'> & {
  movingAvgCost?: number;
};

/** Classes de valorisation SYSCOHADA (alignées sur la détermination comptable). */
export const VALUATION_CLASSES: { value: string; label: string; account: string }[] = [
  { value: 'MARCH',   label: 'Marchandises (31)',            account: '311' },
  { value: 'MP',      label: 'Matières premières (32)',      account: '321' },
  { value: 'APPRO',   label: 'Autres approvisionnements (33)', account: '331' },
  { value: 'EMB',     label: 'Emballages (335)',             account: '335' },
  { value: 'PF',      label: 'Produits finis (36)',          account: '361' },
  { value: 'ENCOURS', label: 'Produits en-cours (34)',       account: '341' },
];

export const MATERIAL_TYPE_LABELS: Record<DBStockMaterial['materialType'], string> = {
  marchandise: 'Marchandise',
  matiere: 'Matière première',
  fourniture: 'Fourniture',
  emballage: 'Emballage',
  produit_fini: 'Produit fini',
  produit_encours: 'Produit en-cours',
  service: 'Service (non stocké)',
};

export async function listMaterials(adapter: DataAdapter): Promise<DBStockMaterial[]> {
  const rows = await adapter.getAll<DBStockMaterial>('stockMaterials');
  return rows.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
}

export async function getMaterial(adapter: DataAdapter, id: string): Promise<DBStockMaterial | null> {
  return adapter.getById<DBStockMaterial>('stockMaterials', id);
}

/** Vérifie l'unicité du code article (par tenant). */
export async function isCodeAvailable(adapter: DataAdapter, code: string, excludeId?: string): Promise<boolean> {
  const rows = await adapter.getAll<DBStockMaterial>('stockMaterials');
  return !rows.some(m => m.code?.toLowerCase() === code.toLowerCase() && m.id !== excludeId);
}

export async function createMaterial(adapter: DataAdapter, input: MaterialInput): Promise<DBStockMaterial> {
  if (!input.code?.trim()) throw new Error('Le code article est obligatoire');
  if (!input.name?.trim()) throw new Error('Le libellé article est obligatoire');
  if (!(await isCodeAvailable(adapter, input.code))) {
    throw new Error(`Le code article « ${input.code} » existe déjà`);
  }
  const created = await adapter.create<DBStockMaterial>('stockMaterials', {
    ...input,
    movingAvgCost: input.movingAvgCost ?? 0,
    active: input.active ?? true,
  } as any);
  invalidateStockEnabledCache(); // 1er article → module actif
  return created;
}

export async function updateMaterial(
  adapter: DataAdapter,
  id: string,
  patch: Partial<MaterialInput>,
): Promise<void> {
  if (patch.code) {
    if (!(await isCodeAvailable(adapter, patch.code, id))) {
      throw new Error(`Le code article « ${patch.code} » existe déjà`);
    }
  }
  await adapter.update<DBStockMaterial>('stockMaterials', id, patch as any);
}

/** Désactivation (jamais de suppression dure d'un article mouvementé). */
export async function setMaterialActive(adapter: DataAdapter, id: string, active: boolean): Promise<void> {
  await adapter.update<DBStockMaterial>('stockMaterials', id, { active } as any);
}
