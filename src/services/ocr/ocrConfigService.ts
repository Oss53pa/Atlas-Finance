/**
 * Persistance de la configuration OCR.
 *
 * Stockée dans la table `settings` (clé `ocr_config`) — même mécanisme que
 * les autres réglages admin (cf. AdminAPI). Aucune migration de schéma requise,
 * fonctionne en mode local (Dexie) comme SaaS (Supabase).
 */
import type { DataAdapter } from '@atlas/data';
import { DEFAULT_OCR_CONFIG, type OCRConfig } from './types';

const CONFIG_KEY = 'ocr_config';

export async function getOCRConfig(adapter: DataAdapter): Promise<OCRConfig> {
  try {
    const row = await adapter.getById<{ key: string; value: string }>('settings', CONFIG_KEY);
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<OCRConfig>;
      // Fusion avec les défauts : tolère l'ajout de nouveaux champs au fil du temps.
      return { ...DEFAULT_OCR_CONFIG, ...parsed };
    }
  } catch (_err) {
    /* config absente ou illisible — on retombe sur les défauts */
  }
  return { ...DEFAULT_OCR_CONFIG };
}

export async function saveOCRConfig(adapter: DataAdapter, config: OCRConfig): Promise<void> {
  const payload = {
    key: CONFIG_KEY,
    value: JSON.stringify(config),
    updatedAt: new Date().toISOString(),
  };
  const existing = await adapter.getById('settings', CONFIG_KEY).catch(() => null);
  if (existing) {
    await adapter.update('settings', CONFIG_KEY, payload);
  } else {
    await adapter.create('settings', payload);
  }
}
