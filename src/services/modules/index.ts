/**
 * INDEX DES SERVICES API - WiseBook
 * Export centralisé de tous les services métiers
 */

// Services
export { accountingService, AccountingService } from './accounting.service';
export { analyticsService, AnalyticsService } from './analytics.service';
export { assetsService, AssetsService } from './assets.service';
export { coreService, CoreService } from './core.service';
export { tiersService, TiersService } from './tiers.service';
export { closuresService, ClosuresService } from './closures.service';
export { reportingService, ReportingService } from './reporting.service';

// Types - Accounting
export type {
  Journal,
  JournalEntry,
  JournalDetails,
  CreateJournalInput,
  UpdateJournalInput,
} from './accounting.service';

// Types - Analytics
export type {
  AxeAnalytique,
  CentreAnalytique,
  CreateAxeInput,
  CreateCentreInput,
} from './analytics.service';

// Types - Assets
export type {
  Immobilisation,
  Amortissement,
  CreateImmobilisationInput,
  CreateAmortissementInput,
} from './assets.service';

// Types - Core
export type {
  Exercice,
  CreateExerciceInput,
} from './core.service';

// Types - Tiers
export type {
  Partenaire,
  Lettrage,
  TransfertContentieux,
  CreatePartenaireInput,
  CreateLettrageInput,
  CreateTransfertContentieuxInput,
} from './tiers.service';

// Types - Closures
export type {
  Controle,
  Provision,
  Document,
  Validation,
  ExecuteControleInput,
  CreateProvisionInput,
  UploadDocumentInput,
  CreateValidationInput,
} from './closures.service';

// Types - Reporting
export type {
  Rapport,
  Planification,
  CreatePlanificationInput,
  GenerateRapportInput,
} from './reporting.service';

// Schemas de validation
export {
  createJournalSchema,
  updateJournalSchema,
} from './accounting.service';

export {
  createAxeSchema,
  createCentreSchema,
} from './analytics.service';

export {
  createImmobilisationSchema,
  createAmortissementSchema,
} from './assets.service';

export {
  createExerciceSchema,
} from './core.service';

export {
  createPartenaireSchema,
  createLettrageSchema,
  createTransfertContentieuxSchema,
} from './tiers.service';

export {
  executeControleSchema,
  createProvisionSchema,
  uploadDocumentSchema,
  createValidationSchema,
} from './closures.service';

export {
  createPlanificationSchema,
  generateRapportSchema,
} from './reporting.service';