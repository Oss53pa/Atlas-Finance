
/**
 * INDEX CENTRAL DES HOOKS
 *
 * Point d'entrée unique pour tous les hooks React Query
 */

// Core & System
export * from './useCore';
export * from './useSystem';
export { useParametresSysteme, useParametreSysteme, useParametreByKey, useParametresByCategory, useParametresByGroup, useParameterCategories, useVisibleParametres, useCreateParametreSysteme, useUpdateParametreSysteme, useDeleteParametreSysteme, useResetParametreToDefault, useBulkUpdateParametres, useConfigurationsSociete, useConfigurationSociete, useConfigurationByCompany, useCreateConfigurationSociete, useUpdateConfigurationSociete, useDeleteConfigurationSociete } from './useParameters';

// Comptabilité
export * from './useAccounting';

// Trésorerie
export * from './useTreasury';

// Tiers
export * from './useThirdParty';

// Budget & Contrôle de gestion — module legacy /budgeting retiré (refonte OPEX/CAPEX, D2)

// Utilitaires
export * from './useAuth';
export * from './useBalanceData';
export * from './useFundCall';
export * from './useDataTable';
export * from './usePrint';
export * from './useExports';
export * from './useToast';
