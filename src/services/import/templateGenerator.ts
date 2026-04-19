/**
 * Atlas F&A — Générateur de fichiers templates d'import.
 *
 * Produit un fichier XLSX officiel Atlas F&A avec :
 *   - une feuille "Instructions" listant les règles de remplissage
 *   - une feuille par sheet du template, avec les en-têtes attendus
 *     et des lignes d'exemple pré-remplies
 *   - mise en forme des en-têtes
 *
 * Les fichiers générés sont directement re-reconnaissables par
 * `detectTemplate()` car ils utilisent exactement les signatures du catalogue.
 */
import * as XLSX from 'xlsx';
import type { AtlasImportTemplate, TemplateColumn } from './atlasImportTemplates';

const ATLAS_VERSION = '1.0';

function buildInstructionsSheet(template: AtlasImportTemplate): XLSX.WorkSheet {
  const rows: unknown[][] = [];
  rows.push(['Atlas F&A — Modèle d\'import']);
  rows.push([`Template : ${template.label} (${template.code})`]);
  rows.push([`Version : ${ATLAS_VERSION}`]);
  rows.push([`Description : ${template.description}`]);
  rows.push([]);
  rows.push(['RÈGLES GÉNÉRALES']);
  rows.push(['• Ne modifiez pas les noms des feuilles ni les en-têtes des colonnes.']);
  rows.push(['• Les colonnes marquées (*) sont obligatoires.']);
  rows.push(['• Format date : AAAA-MM-JJ (ex. 2026-01-15).']);
  rows.push(['• Montants : utilisez le point comme séparateur décimal (ex. 1234.56).']);
  rows.push(['• Ne laissez pas de lignes vides entre les données.']);
  rows.push([]);
  rows.push(['FEUILLES ATTENDUES']);
  for (const sheet of template.sheets) {
    rows.push([`• ${sheet.sheetName}`, `${sheet.columns.length} colonnes`]);
  }
  rows.push([]);
  rows.push(['COLONNES PAR FEUILLE']);
  for (const sheet of template.sheets) {
    rows.push([]);
    rows.push([`[${sheet.sheetName}]`]);
    rows.push(['Colonne', 'Obligatoire', 'Type', 'Exemple', 'Description']);
    for (const col of sheet.columns) {
      rows.push([
        col.header,
        col.required ? 'Oui' : 'Non',
        col.type,
        col.example ?? '',
        col.description ?? '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Largeur colonnes
  ws['!cols'] = [
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 50 },
  ];
  return ws;
}

function buildDataSheet(
  sheetName: string,
  columns: TemplateColumn[],
  sampleRows: Record<string, unknown>[] | undefined,
  headerComment: string | undefined
): XLSX.WorkSheet {
  const headers = columns.map(c => (c.required ? `${c.header} *` : c.header));
  const aoa: unknown[][] = [];

  // Ligne 1 : optionnel commentaire/titre
  if (headerComment) {
    aoa.push([headerComment]);
    aoa.push([]); // ligne vide
  }

  // Ligne headers
  aoa.push(headers);

  // Exemples
  for (const row of sampleRows || []) {
    aoa.push(
      columns.map(col => {
        // Accepte match direct sur header (avec ou sans *) ou key
        const keys = [col.header, `${col.header} *`, col.key];
        for (const k of keys) {
          if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
        }
        return col.example ?? '';
      })
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Largeur colonnes auto
  ws['!cols'] = columns.map(c => ({
    wch: Math.max(
      c.header.length + 3,
      String(c.example ?? '').length + 3,
      12
    ),
  }));
  return ws;
}

/**
 * Génère un fichier XLSX à partir d'un template Atlas.
 * @returns ArrayBuffer prêt à être téléchargé
 */
export function generateTemplateFile(template: AtlasImportTemplate): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  // Feuille Instructions
  const instructions = buildInstructionsSheet(template);
  XLSX.utils.book_append_sheet(wb, instructions, 'Instructions');

  // Feuilles de données
  for (const sheet of template.sheets) {
    const ws = buildDataSheet(
      sheet.sheetName,
      sheet.columns,
      template.sampleRows,
      sheet.headerComment
    );
    XLSX.utils.book_append_sheet(wb, ws, sheet.sheetName);
  }

  // Métadonnées workbook pour que le fichier soit identifié comme Atlas template
  wb.Props = {
    Title: `Atlas F&A - ${template.label}`,
    Subject: template.description,
    Author: 'Atlas F&A',
    CreatedDate: new Date(),
    Company: 'Atlas Studio',
    Category: `atlas-template:${template.code}`,
    Comments: `Atlas F&A Import Template v${ATLAS_VERSION} — Code ${template.code}`,
    Keywords: `atlas,syscohada,import,${template.code}`,
  };

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return out instanceof ArrayBuffer ? out : new Uint8Array(out).buffer;
}

/**
 * Paramètres utilisés pour composer un nom de fichier de template professionnel.
 */
export interface TemplateFileNameParams {
  template: AtlasImportTemplate;
  /** Code société (ex: "SOCIETE_ALPHA_SA") */
  societeCode?: string;
  /** Nom société (ex: "Société Alpha SA") — utilisé si societeCode absent */
  societeName?: string;
  /** Année d'exercice (ex: 2026) */
  year?: number;
  /** Code journal éventuel (ex: "AJM", "VE") */
  journalCode?: string;
  /** Période (ex: "T1_2026", "JAN_2026") */
  periode?: string;
}

/**
 * Produit un nom de fichier pro :
 *   Modele_{Type}_{SOCIETE}_{Annee}_{Code}_{Periode}.xlsx
 * Exemple :
 *   Modele_GrandLivre_SOCIETE_ALPHA_SA_2026_AJM_T1_2026.xlsx
 */
export function buildTemplateFilename(params: TemplateFileNameParams): string {
  const cleanName = (s: string) => s
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const typeLabel = cleanName(params.template.label);
  const parts: string[] = ['Modele', typeLabel];

  if (params.societeCode || params.societeName) {
    const societe = cleanName(params.societeCode || params.societeName || '');
    if (societe) parts.push(societe);
  }
  if (params.year) parts.push(String(params.year));
  if (params.journalCode) parts.push(cleanName(params.journalCode));
  if (params.periode) parts.push(cleanName(params.periode));

  return parts.filter(Boolean).join('_') + '.xlsx';
}

/**
 * Déclenche le téléchargement du template côté navigateur.
 *
 * - Si `filenameOrParams` est une chaîne : utilisée comme nom de fichier (legacy).
 * - Si c'est un objet `TemplateFileNameParams` : construit un nom de fichier pro
 *   via `buildTemplateFilename()`.
 * - Sinon : `suggestTemplateFilename()` (comportement historique).
 */
export function downloadTemplate(
  template: AtlasImportTemplate,
  filenameOrParams?: string | Omit<TemplateFileNameParams, 'template'>
): void {
  const buffer = generateTemplateFile(template);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  let resolvedName: string;
  if (typeof filenameOrParams === 'string') {
    resolvedName = filenameOrParams;
  } else if (filenameOrParams && typeof filenameOrParams === 'object') {
    resolvedName = buildTemplateFilename({ template, ...filenameOrParams });
  } else {
    resolvedName = suggestTemplateFilename(template);
  }

  a.download = resolvedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Renvoie le nom de fichier suggéré pour un template (format court, historique).
 */
export function suggestTemplateFilename(template: AtlasImportTemplate): string {
  return `atlas-${template.code.toLowerCase()}-modele.xlsx`;
}
