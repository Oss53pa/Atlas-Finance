// @ts-nocheck
/**
 * Audit index — Enregistre les 108 contrôles et expose runAudit / runAuditCycle.
 */
import type { DataAdapter } from '@atlas/data';
import { auditRegistry } from './auditControlsRegistry';
import type { AuditResult } from './auditControlsRegistry';
import { fondamentauxControls } from './controls/fondamentaux';
import { capitauxPropresControls } from './controls/capitauxPropres';
import { immobilisationsControls } from './controls/immobilisations';
import { tiersControls } from './controls/tiers';
import { tresorerieControls } from './controls/tresorerie';
import { chargesProduitsControls } from './controls/chargesProduits';
import { transversauxControls } from './controls/transversaux';
import { fiscalControls } from './controls/fiscal';

// Register all controls
auditRegistry.registerAll(fondamentauxControls);
auditRegistry.registerAll(capitauxPropresControls);
auditRegistry.registerAll(immobilisationsControls);
auditRegistry.registerAll(tiersControls);
auditRegistry.registerAll(tresorerieControls);
auditRegistry.registerAll(chargesProduitsControls);
auditRegistry.registerAll(transversauxControls);
auditRegistry.registerAll(fiscalControls);

/** Run all 108 controls */
export async function runAudit(adapter: DataAdapter, niveauMax: number = 8): Promise<AuditResult> {
  return auditRegistry.runAll(adapter, niveauMax);
}

/** Run controls for a specific cycle/category */
export async function runAuditCycle(adapter: DataAdapter, cycle: string, niveauMax: number = 8): Promise<AuditResult> {
  return auditRegistry.runCategory(adapter, cycle, niveauMax);
}

export { auditRegistry } from './auditControlsRegistry';
export type { AuditResult, AuditControl, ControlResult } from './auditControlsRegistry';
