// @ts-nocheck
/**
 * Tools index — Enregistre tous les tools dans le ToolRegistry global.
 * PROPH3T v3.0 — 50 outils (32 existants + 18 nouveaux)
 */
import { toolRegistry } from './ToolRegistry';

// ── Outils existants (32) ────────────────────────────────────
import { calculationTools } from './calculationTools';
import { accountingTools } from './accountingTools';
import { auditTools } from './auditTools';
import { treasuryTools } from './treasuryTools';
import { closureTools } from './closureTools';
import { depreciationTools } from './depreciationTools';
import { fiscalTools } from './fiscalTools';
import { predictionTools } from './predictionTools';
import { fiscalDeclarationTools } from './fiscalDeclarationTools';

// ── Vague 1 — Corrections critiques (7 outils) ──────────────
import { consolidationTools } from './consolidation/ConsolidationEngine';
import { analytiqueTools } from './analytique/AnalytiqueEngine';
import { devisesTools } from './devises/MultiDeviseEngine';
import { etatsFinanciersTools } from './etats/GenerateurEtatsFinanciers';

// ── Vague 2 — Algorithmes importants (5 outils) ─────────────
import { altmanTools } from './audit/AltmanZScore';
import { reconciliationTools } from './tresorerie/ReconciliationBancaireIA';
import { simulateurFiscalTools } from './fiscal/SimulateurFiscal';
import { scoreCreditTools } from './tresorerie/ScoreCreditClient';
import { provisionsTools } from './cloture/ProvisionsEngine';

// ── Vague 2+3 — Immobilisations + ML + BREX + NLP (4 outils) ─
import { immobilisationsCompletTools } from './immobilisations/ImmobilisationsComplet';
import { brexTools } from './controle/MoteurReglesBrex';
import { extracteurTools } from './saisie/ExtracteurFacturePDF';

// ── Algorithmes ML (2 outils) ────────────────────────────────
import { isolationForestTools } from '../algorithms/IsolationForest';
import { clusteringTools } from '../algorithms/ClusteringTiers';

export function registerAllTools(): void {
  // Existants (32)
  toolRegistry.registerAll(calculationTools);
  toolRegistry.registerAll(accountingTools);
  toolRegistry.registerAll(auditTools);
  toolRegistry.registerAll(treasuryTools);
  toolRegistry.registerAll(closureTools);
  toolRegistry.registerAll(depreciationTools);
  toolRegistry.registerAll(fiscalTools);
  toolRegistry.registerAll(predictionTools);
  toolRegistry.registerAll(fiscalDeclarationTools);

  // Vague 1 — Consolidation, Analytique, Devises, États financiers
  toolRegistry.registerAll(consolidationTools);
  toolRegistry.registerAll(analytiqueTools);
  toolRegistry.registerAll(devisesTools);
  toolRegistry.registerAll(etatsFinanciersTools);

  // Vague 2 — Altman, Réconciliation, Simulateur, Score crédit, Provisions
  toolRegistry.registerAll(altmanTools);
  toolRegistry.registerAll(reconciliationTools);
  toolRegistry.registerAll(simulateurFiscalTools);
  toolRegistry.registerAll(scoreCreditTools);
  toolRegistry.registerAll(provisionsTools);

  // Vague 2+3 — Immobilisations, BREX, NLP extraction
  toolRegistry.registerAll(immobilisationsCompletTools);
  toolRegistry.registerAll(brexTools);
  toolRegistry.registerAll(extracteurTools);

  // Algorithmes ML
  toolRegistry.registerAll(isolationForestTools);
  toolRegistry.registerAll(clusteringTools);
}

// Auto-register on import
registerAllTools();

export { toolRegistry } from './ToolRegistry';
export type { ToolDefinition } from './ToolRegistry';
