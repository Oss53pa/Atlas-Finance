// @ts-nocheck
/**
 * Tools index — Enregistre tous les tools dans le ToolRegistry global.
 */
import { toolRegistry } from './ToolRegistry';
import { calculationTools } from './calculationTools';
import { accountingTools } from './accountingTools';
import { auditTools } from './auditTools';
import { treasuryTools } from './treasuryTools';
import { closureTools } from './closureTools';
import { depreciationTools } from './depreciationTools';
import { fiscalTools } from './fiscalTools';
import { predictionTools } from './predictionTools';
import { fiscalDeclarationTools } from './fiscalDeclarationTools';

export function registerAllTools(): void {
  toolRegistry.registerAll(calculationTools);
  toolRegistry.registerAll(accountingTools);
  toolRegistry.registerAll(auditTools);
  toolRegistry.registerAll(treasuryTools);
  toolRegistry.registerAll(closureTools);
  toolRegistry.registerAll(depreciationTools);
  toolRegistry.registerAll(fiscalTools);
  toolRegistry.registerAll(predictionTools);
  toolRegistry.registerAll(fiscalDeclarationTools);
}

// Auto-register on import
registerAllTools();

export { toolRegistry } from './ToolRegistry';
export type { ToolDefinition } from './ToolRegistry';
