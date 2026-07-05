/**
 * reportPersistenceService — persistance RÉELLE des rapports du Report Builder.
 *
 * Source de vérité = table `reports` du DataAdapter (isolée par tenant en SaaS).
 * Repli localStorage uniquement si l'adapter échoue (mode local / table absente) —
 * au lieu de l'ancien `handleSave` qui écrivait TOUJOURS dans localStorage avec un
 * `adapter = null` codé en dur (aucune sauvegarde serveur, invisible multi-postes).
 */
import type { DataAdapter } from '@atlas/data';
import type { ReportDocument } from '../types';
import { DEFAULT_THEME, DEFAULT_TYPOGRAPHY, DEFAULT_PAGE_SETTINGS } from '../types';

const LS_KEY = 'atlas_reports';

type ReportRecord = Record<string, unknown> & { id: string };

/** Sérialise un document vers l'enregistrement `reports` (colonnes snake_case + payload JSON). */
export function toRecord(doc: ReportDocument): ReportRecord {
  return {
    id: doc.id,
    title: doc.title,
    status: doc.status,
    period_label: doc.period.label,
    period: doc.period,
    pages: doc.pages,
    pageSettings: doc.pageSettings,
    theme: doc.theme,
    typography: doc.typography,
    version: doc.version,
    page_count: doc.pages.length,
    created_at: doc.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/** Reconstruit un ReportDocument complet depuis un enregistrement (DB ou localStorage). */
export function fromRecord(r: any): ReportDocument {
  return {
    id: r.id,
    title: r.title || r.name || 'Sans titre',
    status: r.status || 'draft',
    period: r.period || { type: 'custom', startDate: '', endDate: '', label: r.period_label || '' },
    pages: Array.isArray(r.pages) ? r.pages : [],
    pageSettings: r.pageSettings || r.page_settings || { ...DEFAULT_PAGE_SETTINGS },
    theme: r.theme || { ...DEFAULT_THEME },
    typography: r.typography || { ...DEFAULT_TYPOGRAPHY },
    createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    updatedAt: r.updated_at || r.updatedAt || new Date().toISOString(),
    version: r.version || 1,
  };
}

function lsAll(): any[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function lsUpsert(rec: ReportRecord): void {
  const all = lsAll();
  const i = all.findIndex(r => r.id === rec.id);
  if (i >= 0) all[i] = rec; else all.push(rec);
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}
function lsDelete(id: string): void {
  localStorage.setItem(LS_KEY, JSON.stringify(lsAll().filter(r => r.id !== id)));
}

/** Enregistre (create si nouveau, update sinon). Repli localStorage si l'adapter échoue. */
export async function saveReport(adapter: DataAdapter, doc: ReportDocument): Promise<void> {
  const rec = toRecord(doc);
  try {
    let existing: unknown = null;
    try { existing = await (adapter as any).getById?.('reports', doc.id); } catch { existing = null; }
    if (existing) {
      await adapter.update('reports' as any, doc.id, rec as any);
    } else {
      await adapter.create('reports' as any, rec as any);
    }
  } catch {
    lsUpsert(rec);
  }
}

/** Charge un rapport complet par id (DB puis repli localStorage). */
export async function loadReport(adapter: DataAdapter, id: string): Promise<ReportDocument | null> {
  try {
    const r = await (adapter as any).getById?.('reports', id);
    if (r) return fromRecord(r);
  } catch { /* repli */ }
  const local = lsAll().find(x => x.id === id);
  return local ? fromRecord(local) : null;
}

/** Liste les enregistrements bruts (DB puis repli localStorage). */
export async function listReports(adapter: DataAdapter): Promise<any[]> {
  try {
    const d = await (adapter as any).getAll('reports');
    if (Array.isArray(d) && d.length > 0) return d;
    if (Array.isArray(d)) {
      const local = lsAll();
      return local.length > 0 ? local : d;
    }
  } catch { /* repli */ }
  return lsAll();
}

/** Supprime un rapport (DB puis repli localStorage). */
export async function deleteReport(adapter: DataAdapter, id: string): Promise<void> {
  try {
    await adapter.delete('reports' as any, id);
  } catch {
    lsDelete(id);
  }
}

/** Duplique un rapport (nouvel id + suffixe « (copie) »). */
export async function duplicateReport(adapter: DataAdapter, id: string): Promise<ReportDocument | null> {
  const src = await loadReport(adapter, id);
  if (!src) return null;
  const copy: ReportDocument = {
    ...JSON.parse(JSON.stringify(src)),
    id: crypto.randomUUID(),
    title: `${src.title} (copie)`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  await saveReport(adapter, copy);
  return copy;
}
