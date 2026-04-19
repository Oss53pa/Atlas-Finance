/**
 * Atlas F&A — Détecteur de templates d'import.
 *
 * Reconnaît automatiquement le template Atlas auquel un fichier uploadé
 * correspond (XLSX ou CSV), en comparant :
 *   - les noms de feuilles (sheet names + aliases)
 *   - les en-têtes des colonnes (header + aliases, fuzzy match)
 *
 * Retourne un score de confiance pour chaque template et permet de suggérer
 * le bon mode d'import à l'utilisateur.
 */
import * as XLSX from 'xlsx';
import {
  ATLAS_IMPORT_TEMPLATES,
  type AtlasImportTemplate,
  type TemplateSheet,
  type TemplateColumn,
  type TemplateKey,
} from './atlasImportTemplates';

/** Normalise une chaîne pour le fuzzy-matching : minuscule, sans accent, sans espaces/ponctuation */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // diacritiques
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/** Ensemble de variantes pour une chaîne (header, alias...) */
function variants(col: TemplateColumn): Set<string> {
  const set = new Set<string>();
  set.add(normalize(col.header));
  set.add(normalize(col.key));
  for (const a of col.aliases || []) set.add(normalize(a));
  return set;
}

/** Variantes pour un nom de feuille */
function sheetVariants(sheet: TemplateSheet): Set<string> {
  const set = new Set<string>();
  set.add(normalize(sheet.sheetName));
  for (const a of sheet.sheetAliases || []) set.add(normalize(a));
  return set;
}

export interface SheetSignature {
  /** Nom de la feuille tel qu'il apparaît dans le fichier */
  sheetName: string;
  /** Headers (1ère ligne) */
  headers: string[];
  /** Nombre total de lignes de données */
  rowCount: number;
}

export interface TemplateMatch {
  template: AtlasImportTemplate;
  /** Sheet du template qui matche le mieux */
  matchedSheet: TemplateSheet;
  /** Sheet du fichier uploadé qui matche */
  fileSheet: SheetSignature;
  /** Score de confiance (0-1) */
  score: number;
  /** Détail du matching */
  sheetNameMatch: boolean;
  matchedColumns: Array<{ templateColumn: TemplateColumn; fileHeader: string }>;
  missingRequired: TemplateColumn[];
  unknownHeaders: string[];
}

export interface DetectionResult {
  /** Meilleur match (ou null si aucun template reconnu) */
  bestMatch: TemplateMatch | null;
  /** Tous les templates candidats triés par score décroissant */
  candidates: TemplateMatch[];
  /** Signatures brutes des feuilles du fichier */
  fileSheets: SheetSignature[];
  /** Fichier reconnu comme un template Atlas officiel ? */
  isAtlasTemplate: boolean;
}

/**
 * Extrait les signatures (nom feuille + headers) depuis un ArrayBuffer XLSX/CSV.
 */
export function extractFileSignatures(buffer: ArrayBuffer): SheetSignature[] {
  const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
  const signatures: SheetSignature[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    // Essaye de trouver la ligne d'en-tête : la 1ère ligne non vide.
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    let headerRow: string[] = [];
    let dataStart = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i] || [];
      const nonEmpty = row.filter(v => v !== '' && v != null).length;
      if (nonEmpty >= 2) {
        headerRow = row.map(v => String(v ?? '').trim());
        dataStart = i + 1;
        break;
      }
    }
    const rowCount = Math.max(0, rows.length - dataStart);
    signatures.push({ sheetName, headers: headerRow, rowCount });
  }
  return signatures;
}

/**
 * Calcule le score de correspondance entre une feuille du fichier et un template.
 */
function scoreSheetAgainstTemplate(
  fileSheet: SheetSignature,
  templateSheet: TemplateSheet
): Omit<TemplateMatch, 'template' | 'fileSheet' | 'matchedSheet'> {
  const normFileSheetName = normalize(fileSheet.sheetName);
  const tplSheetVariants = sheetVariants(templateSheet);
  const sheetNameMatch = tplSheetVariants.has(normFileSheetName);

  // Map normalized-file-header -> original header
  const fileHeaderMap = new Map<string, string>();
  for (const h of fileSheet.headers) {
    if (h) fileHeaderMap.set(normalize(h), h);
  }

  const matchedColumns: TemplateMatch['matchedColumns'] = [];
  const missingRequired: TemplateColumn[] = [];

  for (const col of templateSheet.columns) {
    const colVariants = variants(col);
    let foundHeader: string | undefined;
    for (const v of colVariants) {
      const hit = fileHeaderMap.get(v);
      if (hit) {
        foundHeader = hit;
        break;
      }
    }
    if (foundHeader) {
      matchedColumns.push({ templateColumn: col, fileHeader: foundHeader });
    } else if (col.required) {
      missingRequired.push(col);
    }
  }

  // Scoring
  const totalCols = templateSheet.columns.length;
  const matchedCount = matchedColumns.length;
  const requiredCount = templateSheet.columns.filter(c => c.required).length;
  const requiredMatched = requiredCount - missingRequired.length;

  // score = 0.5 * coverage required + 0.3 * coverage total + 0.2 * sheetNameMatch
  const score =
    (requiredCount > 0 ? 0.5 * (requiredMatched / requiredCount) : 0.5) +
    0.3 * (matchedCount / Math.max(1, totalCols)) +
    0.2 * (sheetNameMatch ? 1 : 0);

  // Unknown headers = headers du fichier non trouvés dans le template
  const knownNormalized = new Set<string>();
  for (const col of templateSheet.columns) {
    for (const v of variants(col)) knownNormalized.add(v);
  }
  const unknownHeaders = fileSheet.headers
    .filter(h => h && !knownNormalized.has(normalize(h)));

  return {
    score,
    sheetNameMatch,
    matchedColumns,
    missingRequired,
    unknownHeaders,
  };
}

/**
 * Détecte le template Atlas auquel un fichier correspond.
 * @param buffer — contenu du fichier (XLSX/CSV)
 * @param minScore — score minimum pour considérer un match (défaut 0.5)
 */
export function detectTemplate(buffer: ArrayBuffer, minScore = 0.5): DetectionResult {
  const fileSheets = extractFileSignatures(buffer);
  const candidates: TemplateMatch[] = [];

  for (const template of ATLAS_IMPORT_TEMPLATES) {
    for (const templateSheet of template.sheets) {
      for (const fileSheet of fileSheets) {
        const match = scoreSheetAgainstTemplate(fileSheet, templateSheet);
        if (match.score >= minScore) {
          candidates.push({
            template,
            matchedSheet: templateSheet,
            fileSheet,
            ...match,
          });
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const bestMatch = candidates[0] || null;

  // Marqueur "Atlas template officiel" : score >= 0.85 ou nom de feuille match exact + >=70% colonnes requises
  const isAtlasTemplate = !!(
    bestMatch &&
    (bestMatch.score >= 0.85 ||
      (bestMatch.sheetNameMatch && bestMatch.missingRequired.length === 0))
  );

  return { bestMatch, candidates, fileSheets, isAtlasTemplate };
}

/**
 * Helper : détecte puis retourne seulement la clé du template si confiance suffisante.
 */
export function detectTemplateKey(buffer: ArrayBuffer, minScore = 0.7): TemplateKey | null {
  const result = detectTemplate(buffer, minScore);
  return result.bestMatch?.template.key ?? null;
}
