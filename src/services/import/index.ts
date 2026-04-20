/**
 * Atlas F&A — Module d'import.
 * Catalogue de templates officiels + détection automatique + générateur.
 */
export {
  ATLAS_IMPORT_TEMPLATES,
  getTemplate,
  getTemplatesByCategory,
} from './atlasImportTemplates';
export type {
  AtlasImportTemplate,
  TemplateKey,
  TemplateSheet,
  TemplateColumn,
} from './atlasImportTemplates';

export {
  extractFileSignatures,
  detectTemplate,
  detectTemplateKey,
} from './templateDetector';
export type {
  DetectionResult,
  TemplateMatch,
  SheetSignature,
} from './templateDetector';

export {
  generateTemplateFile,
  downloadTemplate,
  suggestTemplateFilename,
  buildTemplateFilename,
} from './templateGenerator';
export type { TemplateFileNameParams } from './templateGenerator';

export {
  generatePlanComptableFromGL,
  toXlsxRows,
} from './planComptableFromGL';
export type {
  GeneratedAccount,
  GenerationResult,
  AccountSource,
} from './planComptableFromGL';
