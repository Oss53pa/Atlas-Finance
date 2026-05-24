/**
 * INDEX CENTRAL DES SERVICES API
 *
 * Point d'entrée unique pour tous les services API du frontend.
 * Permet des imports simplifiés et organisés.
 */

import accountingServices from './accounting-complete.service';
import treasuryServices from './treasury-complete.service';
import assetsServices from './assets-complete.service';
import thirdPartyServices from './thirdparty-complete.service';
import coreServices from './core-complete.service';
import analyticsServices from './analytics-budgeting-taxation.service';

export * from './accounting-complete.service';
export * from './treasury-complete.service';
export * from './assets-complete.service';
export * from './thirdparty-complete.service';
export * from './core-complete.service';
export * from './analytics-budgeting-taxation.service';

/**
 * OBJET SERVICES GLOBAL
 *
 * Permet d'accéder à tous les services de manière organisée:
 *
 * @example
 * import { services } from '@/services';
 *
 * const accounts = await services.accounting.chartOfAccounts.getAll();
 * const bankAccounts = await services.treasury.bankAccounts.getAll();
 * const assets = await services.assets.fixedAssets.getAll();
 */
export const services = {
  core: coreServices,
  accounting: accountingServices,
  treasury: treasuryServices,
  assets: assetsServices,
  thirdParty: thirdPartyServices,
  analytics: analyticsServices.analyticalAxis,
  analyticalCenters: analyticsServices.analyticalCenters,
  budgets: analyticsServices.budgets,
  budgetControl: analyticsServices.budgetControl,
  taxDeclarations: analyticsServices.taxDeclarations,
};

export default services;