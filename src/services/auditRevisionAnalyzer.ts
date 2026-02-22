// ============================================================================
// Moteur d'Audit IA Rule-Based — ISA / SYSCOHADA
// Service pur TypeScript, synchrone, sans dépendance React/Dexie
// ============================================================================
import { formatCurrency } from '../utils/formatters';

// ======================== TYPES D'ENTRÉE ========================

export type AssertionAudit =
  | 'existence' | 'exhaustivite' | 'droits_obligations'
  | 'valorisation' | 'presentation' | 'exactitude'
  | 'cut_off' | 'classification';

export type NiveauRisque = 'faible' | 'modere' | 'eleve' | 'tres_eleve';

export type TypeTest =
  | 'substantif' | 'analytique' | 'controle' | 'circularisation'
  | 'inspection' | 'recalcul' | 'observation';

export type StatutRevue = 'non_demarre' | 'en_cours' | 'termine' | 'revise' | 'approuve';

export interface AssertionDetail {
  code: AssertionAudit;
  libelle: string;
  description: string;
  risque: NiveauRisque;
  testEffectue: boolean;
  conclusion?: string;
}

export interface LigneEcriture {
  compte: string;
  libelle: string;
  debit: number;
  credit: number;
}

export interface EcritureAjustement {
  id: string;
  type: 'PAJE' | 'AAJE';
  lignes: LigneEcriture[];
  montantTotal: number;
  statut: 'propose' | 'accepte' | 'refuse' | 'comptabilise';
  reference?: string;
  justification: string;
}

export interface RevisionItem {
  id: string;
  compte: string;
  libelleCompte: string;
  classeCompte: string;
  type: 'anomalie' | 'correction' | 'ajustement' | 'regularisation' | 'reclassement';
  statut: 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'revise';
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  montant: number;
  montantDebit?: number;
  montantCredit?: number;
  impact: string;
  description: string;
  dateDetection: string;
  dateEcheance?: string;
  responsable?: string;
  reviseur?: string;
  assertions: AssertionAudit[];
  niveauRisque: NiveauRisque;
  typeTest?: TypeTest;
  referentiel: 'SYSCOHADA' | 'IFRS' | 'PCG' | 'US_GAAP';
  pieceJustificative?: string;
  ecritureProposee?: EcritureAjustement;
}

export interface LeadSchedule {
  id: string;
  cycle: string;
  comptes: string[];
  soldePrecedent: number;
  soldeActuel: number;
  variation: number;
  variationPourcent: number;
  seuilSignificativite: number;
  risqueInherent: NiveauRisque;
  risqueControle: NiveauRisque;
  risqueDetection: NiveauRisque;
  assertions: AssertionDetail[];
  statutRevue: StatutRevue;
  preparePar?: string;
  revisePar?: string;
  datePreparation?: string;
  dateRevision?: string;
  conclusion?: string;
  recommandations?: string[];
}

export interface RisqueControle {
  id: string;
  cycle: string;
  risque: string;
  assertion: AssertionAudit;
  probabilite: NiveauRisque;
  impact: NiveauRisque;
  controleExistant: string;
  efficaciteControle: 'efficace' | 'partiellement_efficace' | 'inefficace';
  testControle?: string;
  recommandation?: string;
}

// ======================== TYPES DE SORTIE ========================

export type FindingSeverity = 'info' | 'warning' | 'error' | 'critical';

export type FindingCategory = 'revision' | 'lead_schedule' | 'risk_matrix' | 'adjustment' | 'analytical';

export interface AuditFindingItem {
  id: string;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  detail: string;
  affectedItemId?: string;
  affectedLabel?: string;
  suggestion?: string;
  normeReference?: string;
}

export interface CategoryAnalysisResult {
  category: string;
  label: string;
  totalChecks: number;
  findings: AuditFindingItem[];
  score: number; // 0-100
}

export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AuditAnalysisResult {
  timestamp: string;
  globalScore: number;
  globalGrade: AuditGrade;
  summary: string;
  categories: CategoryAnalysisResult[];
  allFindings: AuditFindingItem[];
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

export interface AuditAnalysisInput {
  revisions: RevisionItem[];
  leadSchedules: LeadSchedule[];
  risquesControles: RisqueControle[];
}

// ======================== DONNÉES DE RÉFÉRENCE ========================

const RISK_NUMERIC: Record<NiveauRisque, number> = {
  faible: 1,
  modere: 2,
  eleve: 3,
  tres_eleve: 4,
};

const SYSCOHADA_CLASSES: Record<string, { range: [number, number]; label: string; type: 'bilan' | 'gestion' | 'special' }> = {
  '1': { range: [10, 19], label: 'Capitaux propres et ressources assimilées', type: 'bilan' },
  '2': { range: [20, 29], label: 'Immobilisations', type: 'bilan' },
  '3': { range: [30, 39], label: 'Stocks', type: 'bilan' },
  '4': { range: [40, 49], label: 'Tiers', type: 'bilan' },
  '5': { range: [50, 59], label: 'Trésorerie', type: 'bilan' },
  '6': { range: [60, 69], label: 'Charges', type: 'gestion' },
  '7': { range: [70, 79], label: 'Produits', type: 'gestion' },
  '8': { range: [80, 89], label: 'Comptes spéciaux', type: 'special' },
};

const ASSERTIONS_PAR_CYCLE: Record<string, AssertionAudit[]> = {
  '1': ['existence', 'valorisation', 'presentation', 'droits_obligations'],
  '2': ['existence', 'valorisation', 'exhaustivite', 'droits_obligations'],
  '3': ['existence', 'valorisation', 'exhaustivite', 'cut_off'],
  '4': ['existence', 'exhaustivite', 'valorisation', 'cut_off', 'exactitude'],
  '5': ['existence', 'exhaustivite', 'exactitude'],
  '6': ['exhaustivite', 'exactitude', 'cut_off', 'classification'],
  '7': ['exhaustivite', 'exactitude', 'cut_off', 'existence'],
  '8': ['presentation', 'classification'],
};

const MAJOR_CYCLES = [
  'Ventes / Clients', 'Achats / Fournisseurs', 'Stocks',
  'Trésorerie', 'Immobilisations', 'Personnel',
];

// ======================== UTILITAIRES ========================

let findingCounter = 0;

function resetCounter() {
  findingCounter = 0;
}

function nextId(): string {
  return `AF-${String(++findingCounter).padStart(3, '0')}`;
}

function isValidSYSCOHADACompte(compte: string): boolean {
  if (!compte || compte.length < 2) return false;
  const classe = compte[0];
  return classe >= '1' && classe <= '8';
}

function computeScore(totalChecks: number, findings: AuditFindingItem[]): number {
  if (totalChecks === 0) return 100;
  const penaltyMap: Record<FindingSeverity, number> = {
    critical: 25,
    error: 15,
    warning: 5,
    info: 1,
  };
  const totalPenalty = findings.reduce((sum, f) => sum + penaltyMap[f.severity], 0);
  const maxPossiblePenalty = totalChecks * 25; // worst case: all critical
  const normalized = Math.max(0, 100 - (totalPenalty / maxPossiblePenalty) * 100);
  return Math.round(normalized);
}

function gradeFromScore(score: number): AuditGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

// ======================== ANALYSE 1 : REVISION ITEMS ========================

export function analyzeRevisionItems(revisions: RevisionItem[]): CategoryAnalysisResult {
  const findings: AuditFindingItem[] = [];
  let totalChecks = 0;

  for (const rev of revisions) {
    // REV-COMPTE-CLASSE : le premier chiffre du compte doit correspondre à classeCompte
    totalChecks++;
    if (rev.compte.length > 0 && rev.compte[0] !== rev.classeCompte) {
      findings.push({
        id: nextId(), ruleId: 'REV-COMPTE-CLASSE',
        category: 'revision', severity: 'error',
        title: `Incohérence compte/classe — ${rev.id}`,
        detail: `Le compte ${rev.compte} ne correspond pas à la classe ${rev.classeCompte} (${SYSCOHADA_CLASSES[rev.classeCompte]?.label || 'inconnue'}).`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Vérifier et corriger la classe comptable ou le numéro de compte.`,
        normeReference: 'SYSCOHADA Art. 17',
      });
    }

    // REV-TYPE-ADEQUATION : types haute/critique avec ajustement ou régularisation est normal,
    // mais anomalie avec priorité basse est suspect
    totalChecks++;
    if (rev.type === 'anomalie' && rev.priorite === 'basse') {
      findings.push({
        id: nextId(), ruleId: 'REV-TYPE-ADEQUATION',
        category: 'revision', severity: 'warning',
        title: `Anomalie classée en priorité basse — ${rev.id}`,
        detail: `Le point ${rev.id} est de type "anomalie" mais classé en priorité "basse". Les anomalies devraient généralement être traitées avec une priorité plus élevée.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Réévaluer la priorité de cette anomalie.`,
        normeReference: 'ISA 450',
      });
    }

    // REV-ASSERTIONS-CYCLE : assertions pertinentes pour la classe
    totalChecks++;
    const expectedAssertions = ASSERTIONS_PAR_CYCLE[rev.classeCompte] || [];
    if (expectedAssertions.length > 0 && rev.assertions.length > 0) {
      const relevant = rev.assertions.filter(a => expectedAssertions.includes(a));
      if (relevant.length === 0) {
        findings.push({
          id: nextId(), ruleId: 'REV-ASSERTIONS-CYCLE',
          category: 'revision', severity: 'info',
          title: `Assertions non standard pour la classe ${rev.classeCompte} — ${rev.id}`,
          detail: `Les assertions testées (${rev.assertions.join(', ')}) ne correspondent pas aux assertions habituelles pour la classe ${rev.classeCompte} (${expectedAssertions.join(', ')}).`,
          affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
          suggestion: `Vérifier que les assertions testées couvrent les risques principaux du cycle.`,
          normeReference: 'ISA 315',
        });
      }
    }

    // REV-RISQUE-COHERENCE : montant élevé + risque faible = suspect
    totalChecks++;
    if (rev.montant > 5_000_000 && RISK_NUMERIC[rev.niveauRisque] <= 1) {
      findings.push({
        id: nextId(), ruleId: 'REV-RISQUE-COHERENCE',
        category: 'revision',
        severity: rev.montant > 20_000_000 ? 'error' : 'warning',
        title: `Montant significatif avec risque faible — ${rev.id}`,
        detail: `Le point ${rev.id} a un montant de ${formatCurrency(rev.montant)} mais un niveau de risque "${rev.niveauRisque}". Un montant significatif devrait normalement justifier un niveau de risque plus élevé.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Réévaluer le niveau de risque compte tenu du montant en jeu.`,
        normeReference: 'ISA 315 §12',
      });
    }

    // REV-PRIORITE-RISQUE : priorité critique + risque < élevé
    totalChecks++;
    if (rev.priorite === 'critique' && RISK_NUMERIC[rev.niveauRisque] < 3) {
      findings.push({
        id: nextId(), ruleId: 'REV-PRIORITE-RISQUE',
        category: 'revision', severity: 'warning',
        title: `Priorité critique mais risque sous-évalué — ${rev.id}`,
        detail: `Le point ${rev.id} est en priorité "critique" mais le risque est évalué à "${rev.niveauRisque}". La priorité et le risque devraient être cohérents.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Aligner le niveau de risque avec la priorité critique.`,
        normeReference: 'ISA 330',
      });
    }

    // REV-TYPE-TEST : type de test adapté au cycle
    totalChecks++;
    if (rev.classeCompte === '5' && rev.typeTest && !['substantif', 'circularisation', 'recalcul'].includes(rev.typeTest)) {
      findings.push({
        id: nextId(), ruleId: 'REV-TYPE-TEST',
        category: 'revision', severity: 'info',
        title: `Type de test inhabituel pour la trésorerie — ${rev.id}`,
        detail: `Le type de test "${rev.typeTest}" est inhabituel pour un compte de trésorerie (classe 5). Les tests de détail, circularisations ou recalculs sont plus adaptés.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Envisager un test substantif ou une circularisation bancaire.`,
        normeReference: 'ISA 500',
      });
    }
    if (rev.classeCompte === '3' && rev.typeTest && !['inspection', 'substantif', 'observation', 'recalcul'].includes(rev.typeTest)) {
      findings.push({
        id: nextId(), ruleId: 'REV-TYPE-TEST',
        category: 'revision', severity: 'info',
        title: `Type de test inhabituel pour les stocks — ${rev.id}`,
        detail: `Le type de test "${rev.typeTest}" est inhabituel pour un compte de stocks (classe 3). L'inspection physique ou les tests de détail sont plus adaptés.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Envisager une inspection physique ou un test substantif.`,
        normeReference: 'ISA 501',
      });
    }

    // REV-PIECE-MANQUANTE : pas de pièce justificative sur statut validé
    totalChecks++;
    if ((rev.statut === 'valide' || rev.statut === 'revise') && !rev.pieceJustificative) {
      findings.push({
        id: nextId(), ruleId: 'REV-PIECE-MANQUANTE',
        category: 'revision', severity: 'error',
        title: `Pièce justificative absente sur point validé — ${rev.id}`,
        detail: `Le point ${rev.id} a le statut "${rev.statut}" mais aucune pièce justificative n'est référencée. Tout point validé doit être documenté.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Joindre les pièces justificatives avant validation définitive.`,
        normeReference: 'ISA 230',
      });
    }

    // REV-ECRITURE-EQUILIBRE : sum(debits) === sum(credits) dans l'écriture proposée
    if (rev.ecritureProposee) {
      totalChecks++;
      const totalDebit = rev.ecritureProposee.lignes.reduce((s, l) => s + l.debit, 0);
      const totalCredit = rev.ecritureProposee.lignes.reduce((s, l) => s + l.credit, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        findings.push({
          id: nextId(), ruleId: 'REV-ECRITURE-EQUILIBRE',
          category: 'revision', severity: 'critical',
          title: `Écriture déséquilibrée — ${rev.id}`,
          detail: `L'écriture ${rev.ecritureProposee.id} est déséquilibrée : débit=${formatCurrency(totalDebit)} ≠ crédit=${formatCurrency(totalCredit)} (écart: ${formatCurrency(Math.abs(totalDebit - totalCredit))}).`,
          affectedItemId: rev.id, affectedLabel: rev.ecritureProposee.id,
          suggestion: `Corriger l'écriture pour que le total des débits égale le total des crédits.`,
          normeReference: 'SYSCOHADA Art. 35',
        });
      }

      // REV-ECRITURE-COMPTES : comptes valides SYSCOHADA (1-8)
      totalChecks++;
      const invalidComptes = rev.ecritureProposee.lignes
        .filter(l => !isValidSYSCOHADACompte(l.compte))
        .map(l => l.compte);
      if (invalidComptes.length > 0) {
        findings.push({
          id: nextId(), ruleId: 'REV-ECRITURE-COMPTES',
          category: 'revision', severity: 'error',
          title: `Comptes invalides dans l'écriture — ${rev.id}`,
          detail: `L'écriture ${rev.ecritureProposee.id} contient des comptes non conformes au plan SYSCOHADA : ${invalidComptes.join(', ')}.`,
          affectedItemId: rev.id, affectedLabel: rev.ecritureProposee.id,
          suggestion: `Utiliser des comptes du plan comptable SYSCOHADA (classes 1 à 8).`,
          normeReference: 'SYSCOHADA Art. 17',
        });
      }
    }

    // REV-WORKFLOW-COHERENCE : statut/reviseur/écriture cohérents
    totalChecks++;
    if (rev.statut === 'valide' && !rev.reviseur) {
      findings.push({
        id: nextId(), ruleId: 'REV-WORKFLOW-COHERENCE',
        category: 'revision', severity: 'warning',
        title: `Point validé sans réviseur — ${rev.id}`,
        detail: `Le point ${rev.id} est validé mais aucun réviseur n'est assigné. Le workflow de validation exige une revue par un superviseur.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Assigner un réviseur pour compléter le workflow de validation.`,
        normeReference: 'ISA 220',
      });
    }
    if (rev.statut === 'revise' && !rev.ecritureProposee) {
      findings.push({
        id: nextId(), ruleId: 'REV-WORKFLOW-COHERENCE',
        category: 'revision', severity: 'warning',
        title: `Point révisé sans écriture d'ajustement — ${rev.id}`,
        detail: `Le point ${rev.id} est marqué "révisé" mais ne comporte aucune écriture d'ajustement proposée. Si un ajustement est nécessaire, il devrait être formalisé.`,
        affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
        suggestion: `Évaluer si un PAJE/AAJE est nécessaire pour ce point.`,
        normeReference: 'ISA 450',
      });
    }

    // REV-DELAI-CRITIQUE : points critiques en_attente
    totalChecks++;
    if (rev.priorite === 'critique' && rev.statut === 'en_attente' && rev.dateDetection) {
      const detectionDate = new Date(rev.dateDetection);
      const now = new Date();
      const diffHours = (now.getTime() - detectionDate.getTime()) / (1000 * 60 * 60);
      if (diffHours > 48) {
        findings.push({
          id: nextId(), ruleId: 'REV-DELAI-CRITIQUE',
          category: 'revision', severity: 'warning',
          title: `Point critique en attente depuis plus de 48h — ${rev.id}`,
          detail: `Le point critique ${rev.id} est en attente depuis ${Math.round(diffHours / 24)} jours. Les points critiques doivent être traités en priorité.`,
          affectedItemId: rev.id, affectedLabel: rev.libelleCompte,
          suggestion: `Traiter ce point critique en urgence.`,
          normeReference: 'ISA 260',
        });
      }
    }
  }

  return {
    category: 'revision',
    label: 'Points de Révision',
    totalChecks,
    findings,
    score: computeScore(totalChecks, findings),
  };
}

// ======================== ANALYSE 2 : LEAD SCHEDULES ========================

export function analyzeLeadSchedules(leadSchedules: LeadSchedule[]): CategoryAnalysisResult {
  const findings: AuditFindingItem[] = [];
  let totalChecks = 0;

  for (const ls of leadSchedules) {
    // LS-VARIATION-CALC : recalcul variation et %
    totalChecks++;
    const expectedVariation = ls.soldeActuel - ls.soldePrecedent;
    if (Math.abs(ls.variation - expectedVariation) > 0.01) {
      findings.push({
        id: nextId(), ruleId: 'LS-VARIATION-CALC',
        category: 'lead_schedule', severity: 'error',
        title: `Erreur calcul variation — ${ls.cycle}`,
        detail: `Variation affichée : ${formatCurrency(ls.variation)}, variation calculée : ${formatCurrency(expectedVariation)}.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Corriger le calcul de la variation.`,
        normeReference: 'ISA 520',
      });
    }

    totalChecks++;
    const expectedPourcent = ls.soldePrecedent !== 0
      ? (expectedVariation / ls.soldePrecedent) * 100
      : 0;
    if (ls.soldePrecedent !== 0 && Math.abs(ls.variationPourcent - expectedPourcent) > 0.5) {
      findings.push({
        id: nextId(), ruleId: 'LS-VARIATION-CALC',
        category: 'lead_schedule', severity: 'error',
        title: `Erreur calcul % variation — ${ls.cycle}`,
        detail: `Pourcentage affiché : ${ls.variationPourcent}%, pourcentage calculé : ${expectedPourcent.toFixed(1)}%.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Corriger le calcul du pourcentage de variation.`,
        normeReference: 'ISA 520',
      });
    }

    // LS-VARIATION-SEUIL : abs(variation) > seuil sans revue terminée
    totalChecks++;
    if (Math.abs(ls.variation) > ls.seuilSignificativite && ls.statutRevue !== 'termine' && ls.statutRevue !== 'revise' && ls.statutRevue !== 'approuve') {
      findings.push({
        id: nextId(), ruleId: 'LS-VARIATION-SEUIL',
        category: 'lead_schedule', severity: 'warning',
        title: `Variation significative non revue — ${ls.cycle}`,
        detail: `La variation de ${formatCurrency(ls.variation)} (${ls.variationPourcent}%) dépasse le seuil de significativité de ${formatCurrency(ls.seuilSignificativite)}, mais la revue n'est pas terminée (statut: ${ls.statutRevue}).`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Prioriser la revue de ce cycle compte tenu de la variation significative.`,
        normeReference: 'ISA 520 §5',
      });
    }

    // LS-RISQUE-ISA315 : trilogie risques adéquate
    totalChecks++;
    const ri = RISK_NUMERIC[ls.risqueInherent];
    const rc = RISK_NUMERIC[ls.risqueControle];
    const rd = RISK_NUMERIC[ls.risqueDetection];
    // Si risque inhérent et risque de contrôle élevés, le risque de détection devrait être élevé aussi
    if (ri >= 3 && rc >= 3 && rd < 2) {
      findings.push({
        id: nextId(), ruleId: 'LS-RISQUE-ISA315',
        category: 'lead_schedule', severity: 'error',
        title: `Trilogie des risques incohérente — ${ls.cycle}`,
        detail: `Risque inhérent "${ls.risqueInherent}" et risque de contrôle "${ls.risqueControle}" mais risque de détection seulement "${ls.risqueDetection}". Si RI et RC sont élevés, le risque de détection devrait être réduit via des procédures plus étendues.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Ajuster le risque de détection ou augmenter l'étendue des procédures d'audit.`,
        normeReference: 'ISA 315 §25',
      });
    }

    // LS-ASSERTIONS-COUVERTURE : assertions testées vs risque
    totalChecks++;
    const untestedHighRisk = ls.assertions.filter(
      a => !a.testEffectue && RISK_NUMERIC[a.risque] >= 3
    );
    if (untestedHighRisk.length > 0) {
      findings.push({
        id: nextId(), ruleId: 'LS-ASSERTIONS-COUVERTURE',
        category: 'lead_schedule', severity: 'warning',
        title: `Assertions à risque élevé non testées — ${ls.cycle}`,
        detail: `${untestedHighRisk.length} assertion(s) à risque élevé ou très élevé non testée(s) : ${untestedHighRisk.map(a => a.libelle).join(', ')}.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Effectuer les tests d'audit sur ces assertions prioritaires.`,
        normeReference: 'ISA 330 §18',
      });
    }

    // LS-SEPARATION-FONCTIONS : preparePar !== revisePar
    totalChecks++;
    if (ls.preparePar && ls.revisePar && ls.preparePar === ls.revisePar) {
      findings.push({
        id: nextId(), ruleId: 'LS-SEPARATION-FONCTIONS',
        category: 'lead_schedule', severity: 'error',
        title: `Séparation des fonctions non respectée — ${ls.cycle}`,
        detail: `Le lead schedule est préparé et révisé par la même personne (${ls.preparePar}). Le principe de séparation des fonctions exige un réviseur différent.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Assigner un réviseur différent du préparateur.`,
        normeReference: 'ISA 220 §15',
      });
    }

    // LS-PREPARATION-INCOMPLETE : préparateur/date manquant
    totalChecks++;
    if (!ls.preparePar || !ls.datePreparation) {
      findings.push({
        id: nextId(), ruleId: 'LS-PREPARATION-INCOMPLETE',
        category: 'lead_schedule', severity: 'warning',
        title: `Préparation incomplète — ${ls.cycle}`,
        detail: `Le lead schedule ${ls.id} n'a pas ${!ls.preparePar ? 'de préparateur assigné' : 'de date de préparation'}.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Compléter les informations de préparation.`,
        normeReference: 'ISA 230 §8',
      });
    }
  }

  // LS-CLASSES-COUVERTURE : 8 classes SYSCOHADA couvertes
  totalChecks++;
  const coveredClasses = new Set<string>();
  for (const ls of leadSchedules) {
    for (const compte of ls.comptes) {
      if (compte.length >= 1) {
        coveredClasses.add(compte[0]);
      }
    }
  }
  const allClasses = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const missingClasses = allClasses.filter(c => !coveredClasses.has(c));
  if (missingClasses.length > 0) {
    findings.push({
      id: nextId(), ruleId: 'LS-CLASSES-COUVERTURE',
      category: 'lead_schedule', severity: 'info',
      title: `Classes SYSCOHADA non couvertes par les lead schedules`,
      detail: `Les classes suivantes ne sont pas couvertes : ${missingClasses.map(c => `Classe ${c} (${SYSCOHADA_CLASSES[c]?.label || ''})`).join(', ')}.`,
      suggestion: `Évaluer si des lead schedules supplémentaires sont nécessaires pour ces classes.`,
      normeReference: 'SYSCOHADA Art. 17',
    });
  }

  return {
    category: 'lead_schedule',
    label: 'Lead Schedules',
    totalChecks,
    findings,
    score: computeScore(totalChecks, findings),
  };
}

// ======================== ANALYSE 3 : MATRICE DES RISQUES ========================

export function analyzeRiskMatrix(risques: RisqueControle[], revisions: RevisionItem[]): CategoryAnalysisResult {
  const findings: AuditFindingItem[] = [];
  let totalChecks = 0;

  for (const rc of risques) {
    // RM-CONTROLE-INEFFICACE : inefficace sans recommandation
    totalChecks++;
    if (rc.efficaciteControle === 'inefficace' && !rc.recommandation) {
      findings.push({
        id: nextId(), ruleId: 'RM-CONTROLE-INEFFICACE',
        category: 'risk_matrix', severity: 'error',
        title: `Contrôle inefficace sans recommandation — ${rc.cycle}`,
        detail: `Le contrôle "${rc.controleExistant}" est jugé inefficace pour le risque "${rc.risque}" mais aucune recommandation n'a été formulée.`,
        affectedItemId: rc.id, affectedLabel: rc.cycle,
        suggestion: `Formuler une recommandation pour renforcer ou remplacer ce contrôle.`,
        normeReference: 'ISA 265',
      });
    }

    // RM-RESIDUEL-ELEVE : risque résiduel élevé sans point de révision
    totalChecks++;
    const probNum = RISK_NUMERIC[rc.probabilite];
    const impactNum = RISK_NUMERIC[rc.impact];
    const residualScore = probNum * impactNum;
    const hasLinkedRevision = revisions.some(r =>
      r.assertions.includes(rc.assertion) &&
      r.description.toLowerCase().includes(rc.cycle.split('/')[0].trim().toLowerCase())
    );
    if (residualScore >= 9 && !hasLinkedRevision) {
      findings.push({
        id: nextId(), ruleId: 'RM-RESIDUEL-ELEVE',
        category: 'risk_matrix', severity: 'error',
        title: `Risque résiduel élevé sans point de révision — ${rc.cycle}`,
        detail: `Le risque "${rc.risque}" a un score résiduel élevé (probabilité: ${rc.probabilite}, impact: ${rc.impact}) mais aucun point de révision correspondant n'a été identifié.`,
        affectedItemId: rc.id, affectedLabel: rc.cycle,
        suggestion: `Créer un point de révision pour couvrir ce risque résiduel élevé.`,
        normeReference: 'ISA 330 §6',
      });
    }

    // RM-CROSS-CHECK : chaque risque a un point de révision correspondant
    totalChecks++;
    if (!hasLinkedRevision) {
      findings.push({
        id: nextId(), ruleId: 'RM-CROSS-CHECK',
        category: 'risk_matrix', severity: 'warning',
        title: `Risque sans point de révision associé — ${rc.cycle}`,
        detail: `Le risque "${rc.risque}" (assertion: ${rc.assertion}) n'a pas de point de révision correspondant dans les travaux de révision.`,
        affectedItemId: rc.id, affectedLabel: rc.cycle,
        suggestion: `S'assurer que chaque risque identifié est couvert par au moins un test d'audit.`,
        normeReference: 'ISA 330 §6',
      });
    }

    // RM-PROB-IMPACT : sur-confiance (élevé+élevé mais contrôle "efficace")
    totalChecks++;
    if (probNum >= 3 && impactNum >= 3 && rc.efficaciteControle === 'efficace') {
      findings.push({
        id: nextId(), ruleId: 'RM-PROB-IMPACT',
        category: 'risk_matrix', severity: 'warning',
        title: `Possible sur-confiance dans le contrôle — ${rc.cycle}`,
        detail: `Le risque "${rc.risque}" a probabilité "${rc.probabilite}" et impact "${rc.impact}" mais le contrôle est jugé "efficace". Cette combinaison mérite une revue critique.`,
        affectedItemId: rc.id, affectedLabel: rc.cycle,
        suggestion: `Revalider l'efficacité du contrôle via des tests plus approfondis.`,
        normeReference: 'ISA 315 §12',
      });
    }
  }

  // RM-COMPLETENESS : cycles majeurs couverts
  totalChecks++;
  const coveredCycles = new Set(risques.map(r => r.cycle.toLowerCase()));
  const missingCycles = MAJOR_CYCLES.filter(c =>
    !Array.from(coveredCycles).some(cc => cc.includes(c.split('/')[0].trim().toLowerCase()))
  );
  if (missingCycles.length > 0) {
    findings.push({
      id: nextId(), ruleId: 'RM-COMPLETENESS',
      category: 'risk_matrix', severity: 'info',
      title: `Cycles majeurs non couverts par la matrice des risques`,
      detail: `Les cycles suivants ne sont pas représentés dans la matrice des risques : ${missingCycles.join(', ')}.`,
      suggestion: `Évaluer les risques pour ces cycles et compléter la matrice.`,
      normeReference: 'ISA 315 §5',
    });
  }

  return {
    category: 'risk_matrix',
    label: 'Matrice des Risques',
    totalChecks,
    findings,
    score: computeScore(totalChecks, findings),
  };
}

// ======================== ANALYSE 4 : AJUSTEMENTS ========================

export function analyzeAdjustments(revisions: RevisionItem[]): CategoryAnalysisResult {
  const findings: AuditFindingItem[] = [];
  let totalChecks = 0;
  const revisionsWithAdjustments = revisions.filter(r => r.ecritureProposee);

  for (const rev of revisionsWithAdjustments) {
    const aje = rev.ecritureProposee!;

    // ADJ-EQUILIBRE : debit === credit par PAJE
    totalChecks++;
    const totalDebit = aje.lignes.reduce((s, l) => s + l.debit, 0);
    const totalCredit = aje.lignes.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      findings.push({
        id: nextId(), ruleId: 'ADJ-EQUILIBRE',
        category: 'adjustment', severity: 'critical',
        title: `PAJE/AAJE déséquilibrée — ${aje.id}`,
        detail: `L'écriture ${aje.id} est déséquilibrée : débit=${formatCurrency(totalDebit)}, crédit=${formatCurrency(totalCredit)} (écart: ${formatCurrency(Math.abs(totalDebit - totalCredit))}).`,
        affectedItemId: rev.id, affectedLabel: aje.id,
        suggestion: `Corriger l'écriture pour rétablir l'équilibre.`,
        normeReference: 'SYSCOHADA Art. 35',
      });
    }

    // ADJ-COMPTES-SYSCOHADA : comptes valides
    totalChecks++;
    const invalidComptes = aje.lignes
      .filter(l => !isValidSYSCOHADACompte(l.compte))
      .map(l => l.compte);
    if (invalidComptes.length > 0) {
      findings.push({
        id: nextId(), ruleId: 'ADJ-COMPTES-SYSCOHADA',
        category: 'adjustment', severity: 'error',
        title: `Comptes non conformes SYSCOHADA — ${aje.id}`,
        detail: `Comptes invalides : ${invalidComptes.join(', ')}.`,
        affectedItemId: rev.id, affectedLabel: aje.id,
        suggestion: `Utiliser des comptes du plan comptable SYSCOHADA (classes 1 à 8).`,
        normeReference: 'SYSCOHADA Art. 17',
      });
    }

    // ADJ-CLASSIFICATION : PAJE=proposé, AAJE=accepté/comptabilisé
    totalChecks++;
    if (aje.type === 'PAJE' && (aje.statut === 'comptabilise')) {
      findings.push({
        id: nextId(), ruleId: 'ADJ-CLASSIFICATION',
        category: 'adjustment', severity: 'warning',
        title: `PAJE directement comptabilisée — ${aje.id}`,
        detail: `L'écriture ${aje.id} est de type PAJE (proposée) mais a le statut "comptabilisé". Un PAJE doit être accepté puis reclassé en AAJE avant comptabilisation.`,
        affectedItemId: rev.id, affectedLabel: aje.id,
        suggestion: `Reclasser en AAJE si l'ajustement est accepté et comptabilisé.`,
        normeReference: 'ISA 450 §12',
      });
    }
    if (aje.type === 'AAJE' && aje.statut === 'propose') {
      findings.push({
        id: nextId(), ruleId: 'ADJ-CLASSIFICATION',
        category: 'adjustment', severity: 'warning',
        title: `AAJE avec statut proposé — ${aje.id}`,
        detail: `L'écriture ${aje.id} est de type AAJE (acceptée) mais a le statut "proposé". Un AAJE devrait avoir le statut "accepté" ou "comptabilisé".`,
        affectedItemId: rev.id, affectedLabel: aje.id,
        suggestion: `Mettre à jour le statut ou reclasser en PAJE.`,
        normeReference: 'ISA 450 §12',
      });
    }

    // ADJ-IMPACT-ETATS : classification P&L vs bilan
    totalChecks++;
    const hasBilanComptes = aje.lignes.some(l => ['1', '2', '3', '4', '5'].includes(l.compte[0]));
    const hasGestionComptes = aje.lignes.some(l => ['6', '7'].includes(l.compte[0]));
    if (hasBilanComptes && hasGestionComptes) {
      findings.push({
        id: nextId(), ruleId: 'ADJ-IMPACT-ETATS',
        category: 'adjustment', severity: 'info',
        title: `Ajustement impactant bilan et résultat — ${aje.id}`,
        detail: `L'écriture ${aje.id} touche à la fois des comptes de bilan (classes 1-5) et des comptes de gestion (classes 6-7). Cet ajustement aura un double impact sur les états financiers.`,
        affectedItemId: rev.id, affectedLabel: aje.id,
        suggestion: `Vérifier que l'impact sur le résultat et le bilan est correctement documenté.`,
        normeReference: 'SYSCOHADA Art. 35',
      });
    }
  }

  // ADJ-CUMUL-ISA450 : cumul anomalies non corrigées vs seuil 5%
  totalChecks++;
  const uncorrectedTotal = revisionsWithAdjustments
    .filter(r => r.ecritureProposee!.statut === 'propose' || r.ecritureProposee!.statut === 'refuse')
    .reduce((sum, r) => sum + r.ecritureProposee!.montantTotal, 0);
  const totalMontant = revisions.reduce((sum, r) => sum + r.montant, 0);
  if (totalMontant > 0 && uncorrectedTotal / totalMontant > 0.05) {
    findings.push({
      id: nextId(), ruleId: 'ADJ-CUMUL-ISA450',
      category: 'adjustment', severity: 'error',
      title: `Cumul des anomalies non corrigées dépasse 5%`,
      detail: `Le cumul des ajustements non corrigés (${formatCurrency(uncorrectedTotal)}) représente ${((uncorrectedTotal / totalMontant) * 100).toFixed(1)}% du montant total des points de révision (${formatCurrency(totalMontant)}).`,
      suggestion: `Évaluer l'impact cumulé sur l'opinion d'audit. Envisager une réserve si le seuil n'est pas réduit.`,
      normeReference: 'ISA 450 §11',
    });
  }

  // ADJ-DOUBLON : PAJEs similaires (même compte, montant proche)
  totalChecks++;
  for (let i = 0; i < revisionsWithAdjustments.length; i++) {
    for (let j = i + 1; j < revisionsWithAdjustments.length; j++) {
      const a = revisionsWithAdjustments[i].ecritureProposee!;
      const b = revisionsWithAdjustments[j].ecritureProposee!;
      const aComptes = a.lignes.map(l => l.compte).sort().join(',');
      const bComptes = b.lignes.map(l => l.compte).sort().join(',');
      if (aComptes === bComptes) {
        const montantDiff = Math.abs(a.montantTotal - b.montantTotal);
        const maxMontant = Math.max(a.montantTotal, b.montantTotal);
        if (maxMontant > 0 && montantDiff / maxMontant < 0.1) {
          findings.push({
            id: nextId(), ruleId: 'ADJ-DOUBLON',
            category: 'adjustment', severity: 'warning',
            title: `Doublon potentiel d'ajustement — ${a.id} / ${b.id}`,
            detail: `Les écritures ${a.id} et ${b.id} utilisent les mêmes comptes (${aComptes}) avec des montants proches (${formatCurrency(a.montantTotal)} vs ${formatCurrency(b.montantTotal)}).`,
            affectedItemId: revisionsWithAdjustments[i].id,
            affectedLabel: `${a.id} / ${b.id}`,
            suggestion: `Vérifier qu'il ne s'agit pas d'un double enregistrement.`,
            normeReference: 'ISA 450',
          });
        }
      }
    }
  }

  return {
    category: 'adjustment',
    label: 'Ajustements (PAJE/AAJE)',
    totalChecks,
    findings,
    score: computeScore(totalChecks, findings),
  };
}

// ======================== ANALYSE 5 : REVUE ANALYTIQUE ========================

export function analyzeRevueAnalytique(leadSchedules: LeadSchedule[]): CategoryAnalysisResult {
  const findings: AuditFindingItem[] = [];
  let totalChecks = 0;

  for (const ls of leadSchedules) {
    // RA-RATIO-CALC : vérification calcul % variation
    totalChecks++;
    if (ls.soldePrecedent !== 0) {
      const expectedPct = ((ls.soldeActuel - ls.soldePrecedent) / ls.soldePrecedent) * 100;
      if (Math.abs(ls.variationPourcent - expectedPct) > 0.5) {
        findings.push({
          id: nextId(), ruleId: 'RA-RATIO-CALC',
          category: 'analytical', severity: 'error',
          title: `Erreur de calcul ratio — ${ls.cycle}`,
          detail: `Le pourcentage de variation affiché (${ls.variationPourcent}%) ne correspond pas au calcul (${expectedPct.toFixed(1)}%).`,
          affectedItemId: ls.id, affectedLabel: ls.cycle,
          suggestion: `Recalculer le ratio de variation.`,
          normeReference: 'ISA 520',
        });
      }
    }

    // RA-TENDANCE-ANORMALE : variation > 20%
    totalChecks++;
    if (Math.abs(ls.variationPourcent) > 20) {
      findings.push({
        id: nextId(), ruleId: 'RA-TENDANCE-ANORMALE',
        category: 'analytical', severity: 'warning',
        title: `Variation anormale détectée — ${ls.cycle}`,
        detail: `Le cycle "${ls.cycle}" présente une variation de ${ls.variationPourcent > 0 ? '+' : ''}${ls.variationPourcent}%, ce qui dépasse le seuil de 20%. Cette tendance nécessite une investigation approfondie.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Investiguer les causes de cette variation significative et documenter l'analyse.`,
        normeReference: 'ISA 520 §5',
      });
    }

    // RA-SENS-VARIATION : tendances contra-intuitives
    totalChecks++;
    // Exemple : si les fournisseurs (classe 4 - passif) augmentent fortement alors que les achats (classe 6) n'ont pas de lead schedule correspondant
    const isPassif = ls.comptes.some(c => c.startsWith('4'));
    if (isPassif && ls.variationPourcent > 25) {
      findings.push({
        id: nextId(), ruleId: 'RA-SENS-VARIATION',
        category: 'analytical', severity: 'warning',
        title: `Augmentation significative des passifs — ${ls.cycle}`,
        detail: `Le cycle "${ls.cycle}" (comptes de tiers) montre une augmentation de ${ls.variationPourcent}%. Vérifier la corrélation avec l'évolution de l'activité.`,
        affectedItemId: ls.id, affectedLabel: ls.cycle,
        suggestion: `Croiser avec l'évolution du chiffre d'affaires et des achats pour valider la cohérence.`,
        normeReference: 'ISA 520 §5',
      });
    }
  }

  // RA-INCOHERENCE-COMPTES : incohérences inter-cycles
  totalChecks++;
  const clientLS = leadSchedules.find(ls => ls.comptes.some(c => c.startsWith('41')));
  const fournisseurLS = leadSchedules.find(ls => ls.comptes.some(c => c.startsWith('40')));
  if (clientLS && fournisseurLS) {
    // Si les clients augmentent fortement et les fournisseurs aussi, cela peut être normal (croissance)
    // Mais si les clients diminuent et les fournisseurs augmentent, c'est suspect
    if (clientLS.variationPourcent < -10 && fournisseurLS.variationPourcent > 20) {
      findings.push({
        id: nextId(), ruleId: 'RA-INCOHERENCE-COMPTES',
        category: 'analytical', severity: 'info',
        title: `Évolution contra-cyclique clients/fournisseurs`,
        detail: `Les créances clients diminuent (${clientLS.variationPourcent}%) tandis que les dettes fournisseurs augmentent fortement (+${fournisseurLS.variationPourcent}%). Cette divergence mérite une analyse approfondie.`,
        suggestion: `Vérifier si l'activité justifie cette évolution ou s'il y a un problème de comptabilisation.`,
        normeReference: 'ISA 520',
      });
    }
  }

  return {
    category: 'analytical',
    label: 'Revue Analytique',
    totalChecks,
    findings,
    score: computeScore(totalChecks, findings),
  };
}

// ======================== GÉNÉRATION DU RÉSUMÉ ========================

function generateSummary(result: Omit<AuditAnalysisResult, 'summary'>): string {
  const { globalScore, globalGrade, criticalCount, errorCount, warningCount, categories } = result;

  const gradeMessages: Record<AuditGrade, string> = {
    'A': 'Le dossier de révision est de très bonne qualité.',
    'B': 'Le dossier de révision est globalement satisfaisant avec quelques points d\'attention.',
    'C': 'Le dossier de révision présente des insuffisances qui nécessitent des corrections.',
    'D': 'Le dossier de révision comporte des lacunes importantes nécessitant une action immédiate.',
    'F': 'Le dossier de révision est insuffisant et nécessite une refonte majeure.',
  };

  const parts: string[] = [
    `Résultat de l'analyse : note ${globalGrade} (score ${globalScore}/100). ${gradeMessages[globalGrade]}`,
  ];

  if (criticalCount > 0) {
    parts.push(`${criticalCount} constat(s) critique(s) nécessitant une correction immédiate.`);
  }
  if (errorCount > 0) {
    parts.push(`${errorCount} erreur(s) identifiée(s).`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} avertissement(s) à prendre en compte.`);
  }

  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];
  if (weakest && weakest.score < 70) {
    parts.push(`Le domaine nécessitant le plus d'attention est "${weakest.label}" (score: ${weakest.score}/100).`);
  }

  return parts.join(' ');
}

// ======================== ORCHESTRATEUR ========================

const CATEGORY_WEIGHTS: Record<string, number> = {
  revision: 0.30,
  lead_schedule: 0.25,
  risk_matrix: 0.20,
  adjustment: 0.15,
  analytical: 0.10,
};

export function analyzeAuditRevision(input: AuditAnalysisInput): AuditAnalysisResult {
  resetCounter();

  const revisionResult = analyzeRevisionItems(input.revisions);
  const leadResult = analyzeLeadSchedules(input.leadSchedules);
  const riskResult = analyzeRiskMatrix(input.risquesControles, input.revisions);
  const adjustmentResult = analyzeAdjustments(input.revisions);
  const analyticalResult = analyzeRevueAnalytique(input.leadSchedules);

  const categories = [revisionResult, leadResult, riskResult, adjustmentResult, analyticalResult];
  const allFindings = categories.flatMap(c => c.findings);

  const globalScore = Math.round(
    categories.reduce((sum, c) => sum + c.score * (CATEGORY_WEIGHTS[c.category] || 0.2), 0)
  );
  const globalGrade = gradeFromScore(globalScore);

  const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
  const errorCount = allFindings.filter(f => f.severity === 'error').length;
  const warningCount = allFindings.filter(f => f.severity === 'warning').length;
  const infoCount = allFindings.filter(f => f.severity === 'info').length;

  const partial = {
    timestamp: new Date().toISOString(),
    globalScore,
    globalGrade,
    categories,
    allFindings,
    criticalCount,
    errorCount,
    warningCount,
    infoCount,
  };

  return {
    ...partial,
    summary: generateSummary(partial),
  };
}
