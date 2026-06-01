/**
 * Atlas F&A — Lecture/éclatement d'un CLASSEUR DE MIGRATION par mode.
 *
 * L'utilisateur télécharge le modèle d'un mode (multi-feuilles), le remplit,
 * puis ré-uploade UN seul fichier. `splitModeWorkbook` retrouve chaque feuille
 * attendue par le mode et la convertit en données prêtes à alimenter les slots
 * de l'assistant (`grandLivre`, `reportAN`, `tiers`, `immobilisations`,
 * `planComptable`) — exactement comme le faisait l'upload fichier-par-fichier.
 */
import * as XLSX from 'xlsx';
import {
  getModeTemplate,
  type MigrationModeId,
  type MigrationSlot,
} from './migrationModeTemplates';

export interface ParsedSheet {
  data: Record<string, unknown>[];
  columns: string[];
}

export interface SplitResult {
  /** Données par slot (slots reconnus et non vides uniquement). */
  slots: Partial<Record<MigrationSlot, ParsedSheet>>;
  /** Noms de feuilles reconnues → slot. */
  matched: { sheetName: string; slot: MigrationSlot; rows: number }[];
  /** Feuilles obligatoires du mode absentes ou vides. */
  missingRequired: string[];
  /** true si au moins une feuille du mode a été reconnue (⇒ c'est bien un classeur Atlas). */
  recognized: boolean;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * Convertit une feuille en lignes objet, en détectant la ligne d'en-tête
 * (qui n'est pas forcément la 1ère : titre/commentaire possible au-dessus).
 * Les marqueurs " *" des colonnes obligatoires sont retirés des en-têtes.
 */
/**
 * A1 — Détecte la ligne d'en-tête par CORRESPONDANCE DE NOMS DE COLONNES
 * (et non par position « 1ère ligne ≥2 cellules »). Robuste aux bannières/titres
 * placés au-dessus. Retourne -1 si aucune ligne ne matche assez de colonnes.
 */
export function detectHeaderRowByColumnNames(
  aoa: unknown[][], expected: string[], maxRows = 15,
): number {
  const wanted = expected.map(normalize).filter(Boolean);
  if (wanted.length === 0) return -1;
  let best = { idx: -1, matches: 0 };
  for (let i = 0; i < Math.min(aoa.length, maxRows); i++) {
    const cells = (aoa[i] || []).map(v => normalize(String(v ?? ''))).filter(Boolean);
    if (cells.length < 2) continue;
    let matches = 0;
    for (const w of wanted) {
      if (cells.some(c => c === w || c.includes(w) || w.includes(c))) matches++;
    }
    const ratio = matches / wanted.length;
    if ((ratio >= 0.6 || matches >= 3) && matches > best.matches) best = { idx: i, matches };
  }
  return best.idx;
}

export function parseSheetToData(ws: XLSX.WorkSheet, expectedHeaders?: string[]): ParsedSheet {
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];

  // A1 — détection par noms de colonnes attendus, repli « ≥2 cellules ».
  let headerRowIndex = (expectedHeaders && expectedHeaders.length)
    ? detectHeaderRowByColumnNames(aoa, expectedHeaders)
    : -1;
  if (headerRowIndex < 0) {
    for (let i = 0; i < Math.min(aoa.length, 12); i++) {
      const row = aoa[i] || [];
      const nonEmpty = row.filter(v => v !== '' && v != null).length;
      if (nonEmpty >= 2) { headerRowIndex = i; break; }
    }
  }
  if (headerRowIndex < 0) return { data: [], columns: [] };

  const rawHeaders = (aoa[headerRowIndex] as unknown[]).map(v => String(v ?? '').trim());
  const headers = rawHeaders.map(h => h.replace(/\s*\*\s*$/, ''));

  const data: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    if ((row as unknown[]).every(v => v === '' || v == null)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { if (h) obj[h] = (row as unknown[])[idx] ?? ''; });
    data.push(obj);
  }
  return { data, columns: headers.filter(Boolean) };
}

/**
 * Détermine si un classeur ressemble à un modèle de migration Atlas pour le mode
 * donné (présence d'au moins une feuille attendue, par nom ou alias).
 */
export function looksLikeModeWorkbook(wb: XLSX.WorkBook, mode: MigrationModeId): boolean {
  const tpl = getModeTemplate(mode);
  const sheetSet = new Set(wb.SheetNames.map(normalize));
  return tpl.sheets.some(spec => {
    const names = [spec.sheetName, ...(spec.sheetAliases || [])].map(normalize);
    return names.some(n => sheetSet.has(n));
  });
}

/**
 * Éclate un classeur de migration en données par slot, selon le mode.
 */
export function splitModeWorkbook(wb: XLSX.WorkBook, mode: MigrationModeId): SplitResult {
  const tpl = getModeTemplate(mode);
  const slots: Partial<Record<MigrationSlot, ParsedSheet>> = {};
  const matched: SplitResult['matched'] = [];
  const missingRequired: string[] = [];

  // Index des feuilles du classeur par nom normalisé.
  const byNorm = new Map<string, string>(); // normalized -> real sheet name
  for (const name of wb.SheetNames) byNorm.set(normalize(name), name);

  for (const spec of tpl.sheets) {
    const candidates = [spec.sheetName, ...(spec.sheetAliases || [])].map(normalize);
    const found = candidates.map(c => byNorm.get(c)).find(Boolean);
    if (!found) {
      if (spec.required) missingRequired.push(spec.sheetName);
      continue;
    }
    const expectedHeaders = [
      ...spec.columns.map(c => c.header),
      ...spec.columns.flatMap(c => c.aliases || []),
    ];
    const parsed = parseSheetToData(wb.Sheets[found], expectedHeaders);
    if (parsed.data.length === 0) {
      if (spec.required) missingRequired.push(spec.sheetName);
      continue;
    }
    // Si deux specs visent le même slot (cas non rencontré dans les 3 modes),
    // la dernière feuille non vide gagne ; on concatène plutôt pour être sûr.
    const existing = slots[spec.slot];
    if (existing) {
      const mergedCols = Array.from(new Set([...existing.columns, ...parsed.columns]));
      slots[spec.slot] = { data: [...existing.data, ...parsed.data], columns: mergedCols };
    } else {
      slots[spec.slot] = parsed;
    }
    matched.push({ sheetName: found, slot: spec.slot, rows: parsed.data.length });
  }

  return {
    slots,
    matched,
    missingRequired,
    recognized: matched.length > 0,
  };
}
