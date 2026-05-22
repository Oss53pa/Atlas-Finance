/**
 * Persistance des factures scannées.
 *
 * Chaque document est stocké comme une ligne `settings` (clé `ocr_doc_<id>`),
 * sur le modèle éprouvé d'AdminAPI. Avantages : zéro changement de schéma,
 * fonctionne en local (Dexie) et en SaaS (Supabase), pas de migration à appliquer.
 *
 * Les `Date` sont sérialisées en ISO. L'aperçu du fichier (base64) n'est conservé
 * que sous un seuil de taille pour ne pas alourdir la table `settings`.
 */
import type { DataAdapter } from '@atlas/data';
import type { ScannedInvoice } from './types';

const PREFIX = 'ocr_doc_';
/** ~1.1 Mo de fichier encodé en base64. Au-delà, l'aperçu n'est pas persisté. */
const MAX_PREVIEW_BASE64 = 1_500_000;

interface StoredDoc extends Omit<
  ScannedInvoice,
  'uploadDate' | 'processedDate' | 'validatedAt' | 'rejectedAt' | 'originalFileUrl' | 'auditLog'
> {
  uploadDate: string;
  processedDate?: string;
  validatedAt?: string;
  rejectedAt?: string;
  /** data: URL complète (avec préfixe) si conservée. */
  originalFilePreview?: string;
  auditLog?: { action: string; user: string; timestamp: string; details?: string }[];
}

function toIso(d?: Date): string | undefined {
  return d instanceof Date ? d.toISOString() : (d as unknown as string | undefined);
}

function serialize(doc: ScannedInvoice): StoredDoc {
  const preview =
    doc.originalFileUrl && doc.originalFileUrl.startsWith('data:') && doc.originalFileUrl.length <= MAX_PREVIEW_BASE64
      ? doc.originalFileUrl
      : undefined;

  const { originalFileUrl: _unused, auditLog, ...rest } = doc;
  return {
    ...rest,
    uploadDate: toIso(doc.uploadDate)!,
    processedDate: toIso(doc.processedDate),
    validatedAt: toIso(doc.validatedAt),
    rejectedAt: toIso(doc.rejectedAt),
    originalFilePreview: preview,
    auditLog: auditLog?.map((a) => ({ ...a, timestamp: toIso(a.timestamp as unknown as Date)! })),
  };
}

function deserialize(stored: StoredDoc): ScannedInvoice {
  const { originalFilePreview, auditLog, ...rest } = stored;
  return {
    ...rest,
    uploadDate: new Date(stored.uploadDate),
    processedDate: stored.processedDate ? new Date(stored.processedDate) : undefined,
    validatedAt: stored.validatedAt ? new Date(stored.validatedAt) : undefined,
    rejectedAt: stored.rejectedAt ? new Date(stored.rejectedAt) : undefined,
    originalFileUrl: originalFilePreview || '',
    auditLog: auditLog?.map((a) => ({ ...a, timestamp: new Date(a.timestamp) })),
  } as ScannedInvoice;
}

export async function listScannedDocuments(adapter: DataAdapter): Promise<ScannedInvoice[]> {
  const rows = await adapter.getAll<{ key: string; value: string }>('settings');
  const docs: ScannedInvoice[] = [];
  for (const row of rows) {
    if (typeof row.key !== 'string' || !row.key.startsWith(PREFIX)) continue;
    try {
      docs.push(deserialize(JSON.parse(row.value) as StoredDoc));
    } catch (_err) {
      /* ligne corrompue — ignorée */
    }
  }
  return docs.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
}

export async function saveScannedDocument(adapter: DataAdapter, doc: ScannedInvoice): Promise<void> {
  const key = PREFIX + doc.id;
  const payload = {
    key,
    value: JSON.stringify(serialize(doc)),
    updatedAt: new Date().toISOString(),
  };
  const existing = await adapter.getById('settings', key).catch(() => null);
  if (existing) {
    await adapter.update('settings', key, payload);
  } else {
    await adapter.create('settings', payload);
  }
}

export async function deleteScannedDocument(adapter: DataAdapter, id: string): Promise<void> {
  await adapter.delete('settings', PREFIX + id).catch(() => undefined);
}
