/**
 * Index des services backend WiseBook Phase 1
 *
 * Import centralisé de tous les services API
 * Alignés avec le backend Django REST Framework
 */

// ==================== AUTHENTICATION ====================
export {
  authBackendService,
  AuthBackendService
} from './auth-backend.service';

// ==================== CORE ====================
export {
  societeService,
  deviseService,
  SocieteService,
  DeviseService
} from './core-backend.service';

// ==================== ACCOUNTING ====================
export {
  fiscalYearService,
  journalService,
  chartOfAccountsService,
  journalEntryService,
  journalEntryLineService,
  FiscalYearService,
  JournalService,
  ChartOfAccountsService,
  JournalEntryService,
  JournalEntryLineService
} from './accounting-backend.service';

// ==================== THIRD PARTY ====================
export {
  tiersService,
  adresseTiersService,
  contactTiersService,
  TiersService,
  AdresseTiersService,
  ContactTiersService
} from './thirdparty-backend.service';

// ==================== API CLIENT ====================
export {
  enhancedApiClient,
  apiClient,
  EnhancedApiClient
} from '@/lib/enhanced-api-client';

// ==================== DEFAULT EXPORT ====================

/**
 * Export par défaut avec tous les services organisés par module
 */
const backendServices = {
  // Auth
  auth: authBackendService,

  // Core
  societe: societeService,
  devise: deviseService,

  // Accounting
  fiscalYear: fiscalYearService,
  journal: journalService,
  chartOfAccounts: chartOfAccountsService,
  journalEntry: journalEntryService,
  journalEntryLine: journalEntryLineService,

  // Third Party
  tiers: tiersService,
  adresseTiers: adresseTiersService,
  contactTiers: contactTiersService,

  // API Client
  apiClient: enhancedApiClient,
};

export default backendServices;

/**
 * Exemple d'utilisation:
 *
 * // Import individuel
 * import { authBackendService } from '@/services/backend-services.index';
 * const response = await authBackendService.login({ email, password });
 *
 * // Import par défaut
 * import backendServices from '@/services/backend-services.index';
 * const societes = await backendServices.societe.list();
 *
 * // Import multiple
 * import {
 *   authBackendService,
 *   societeService,
 *   journalEntryService
 * } from '@/services/backend-services.index';
 */
