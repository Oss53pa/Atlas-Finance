/**
 * Atlas FnA — Module d'import.
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
  generateModeTemplateFile,
  downloadModeTemplate,
} from './templateGenerator';
export type { TemplateFileNameParams } from './templateGenerator';

// Migration par mode (classeur unique multi-feuilles)
export {
  MIGRATION_MODE_TEMPLATES,
  getModeTemplate,
  requiredSlotsForMode,
} from './migrationModeTemplates';
export type {
  MigrationModeId,
  MigrationModeTemplate,
  MigrationSlot,
  ModeSheetSpec,
} from './migrationModeTemplates';

export {
  splitModeWorkbook,
  looksLikeModeWorkbook,
  parseSheetToData,
} from './migrationWorkbook';
export type { SplitResult, ParsedSheet } from './migrationWorkbook';

export {
  generatePlanComptableFromGL,
  toXlsxRows,
} from './planComptableFromGL';
export type {
  GeneratedAccount,
  GenerationResult,
  AccountSource,
} from './planComptableFromGL';
