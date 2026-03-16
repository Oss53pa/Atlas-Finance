// @ts-nocheck
/**
 * SERVICE FRONTEND TAXATION - Atlas Finance
 *
 * Ré-export du service fiscal connecté aux données réelles via DataAdapter.
 * Le moteur de détection automatique des taxes est dans src/services/fiscal/.
 *
 * NOTE: L'ancien service basé sur Django REST (/api/v1/taxation/) a été supprimé.
 * Toute la logique fiscale fonctionne en frontend-only avec Dexie/Supabase BaaS.
 */

// Re-export the real feature-level service (connected to DataAdapter)
export { taxationService, TaxationService } from '../features/taxation/services/taxationService';
export type { TVADeclarationResult, ISDeclarationResult } from '../features/taxation/services/taxationService';

// Re-export the fiscal engine
export { TaxDetectionEngine } from './fiscal/TaxDetectionEngine';
export type { TaxDetectionResult, TaxAmounts } from './fiscal/TaxDetectionEngine';
export { seedTaxRegistryCI, seedIRPPBracketsCI } from './fiscal/taxRegistrySeeds';
