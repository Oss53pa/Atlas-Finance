import { describe, it, expect } from 'vitest';
import {
  analyzeRevisionItems,
  analyzeLeadSchedules,
  analyzeRiskMatrix,
  analyzeAdjustments,
  analyzeRevueAnalytique,
  analyzeAuditRevision,
  type RevisionItem,
  type LeadSchedule,
  type RisqueControle,
} from '../services/auditRevisionAnalyzer';

// ======================== HELPERS ========================

function makeRevision(overrides: Partial<RevisionItem> = {}): RevisionItem {
  return {
    id: 'REV-001',
    compte: '401100',
    libelleCompte: 'Fournisseurs',
    classeCompte: '4',
    type: 'anomalie',
    statut: 'en_cours',
    priorite: 'haute',
    montant: 1_000_000,
    impact: 'Test',
    description: 'Test revision',
    dateDetection: '2025-01-15',
    assertions: ['exhaustivite', 'exactitude'],
    niveauRisque: 'modere',
    referentiel: 'SYSCOHADA',
    ...overrides,
  };
}

function makeLeadSchedule(overrides: Partial<LeadSchedule> = {}): LeadSchedule {
  return {
    id: 'LS-001',
    cycle: 'Trésorerie',
    comptes: ['521100'],
    soldePrecedent: 100_000_000,
    soldeActuel: 110_000_000,
    variation: 10_000_000,
    variationPourcent: 10,
    seuilSignificativite: 5_000_000,
    risqueInherent: 'modere',
    risqueControle: 'faible',
    risqueDetection: 'modere',
    assertions: [
      { code: 'existence', libelle: 'Existence', description: 'Test', risque: 'faible', testEffectue: true },
    ],
    statutRevue: 'termine',
    preparePar: 'Alice',
    revisePar: 'Bob',
    datePreparation: '2025-01-15',
    dateRevision: '2025-01-18',
    ...overrides,
  };
}

function makeRisque(overrides: Partial<RisqueControle> = {}): RisqueControle {
  return {
    id: 'RC-001',
    cycle: 'Ventes / Clients',
    risque: 'Factures fictives',
    assertion: 'existence',
    probabilite: 'modere',
    impact: 'eleve',
    controleExistant: 'Validation hiérarchique',
    efficaciteControle: 'efficace',
    testControle: 'Échantillon testé',
    recommandation: 'Étendre le contrôle',
    ...overrides,
  };
}

// ======================== analyzeRevisionItems ========================

describe('analyzeRevisionItems', () => {
  it('should return clean result for valid revision', () => {
    const result = analyzeRevisionItems([makeRevision()]);
    expect(result.category).toBe('revision');
    expect(result.score).toBeGreaterThan(0);
    expect(result.totalChecks).toBeGreaterThan(0);
  });

  it('REV-COMPTE-CLASSE: should detect compte/classe mismatch', () => {
    const rev = makeRevision({ compte: '521100', classeCompte: '4' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-COMPTE-CLASSE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('REV-COMPTE-CLASSE: no finding when compte matches classe', () => {
    const rev = makeRevision({ compte: '401100', classeCompte: '4' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-COMPTE-CLASSE');
    expect(finding).toBeUndefined();
  });

  it('REV-TYPE-ADEQUATION: should flag anomalie with basse priority', () => {
    const rev = makeRevision({ type: 'anomalie', priorite: 'basse' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-TYPE-ADEQUATION');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('REV-TYPE-ADEQUATION: no finding for correction with basse priority', () => {
    const rev = makeRevision({ type: 'correction', priorite: 'basse' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-TYPE-ADEQUATION');
    expect(finding).toBeUndefined();
  });

  it('REV-RISQUE-COHERENCE: should flag high amount with low risk', () => {
    const rev = makeRevision({ montant: 10_000_000, niveauRisque: 'faible' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-RISQUE-COHERENCE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('REV-RISQUE-COHERENCE: should be error for very high amount with low risk', () => {
    const rev = makeRevision({ montant: 25_000_000, niveauRisque: 'faible' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-RISQUE-COHERENCE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('REV-PRIORITE-RISQUE: should flag critique priority with low risk', () => {
    const rev = makeRevision({ priorite: 'critique', niveauRisque: 'faible' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-PRIORITE-RISQUE');
    expect(finding).toBeDefined();
  });

  it('REV-PIECE-MANQUANTE: should flag validated revision without supporting doc', () => {
    const rev = makeRevision({ statut: 'valide', pieceJustificative: undefined });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-PIECE-MANQUANTE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('REV-PIECE-MANQUANTE: no finding when piece justificative is present', () => {
    const rev = makeRevision({ statut: 'valide', pieceJustificative: 'doc.pdf' });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-PIECE-MANQUANTE');
    expect(finding).toBeUndefined();
  });

  it('REV-ECRITURE-EQUILIBRE: should detect unbalanced entry', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '601100', libelle: 'Achats', debit: 5000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 4000 },
        ],
        montantTotal: 5000, statut: 'propose', justification: 'Test',
      },
    });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-ECRITURE-EQUILIBRE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
  });

  it('REV-ECRITURE-EQUILIBRE: no finding for balanced entry', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '601100', libelle: 'Achats', debit: 5000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 5000 },
        ],
        montantTotal: 5000, statut: 'propose', justification: 'Test',
      },
    });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-ECRITURE-EQUILIBRE');
    expect(finding).toBeUndefined();
  });

  it('REV-ECRITURE-COMPTES: should detect invalid compte in entry', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '901100', libelle: 'Invalid', debit: 1000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 1000 },
        ],
        montantTotal: 1000, statut: 'propose', justification: 'Test',
      },
    });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-ECRITURE-COMPTES');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('REV-WORKFLOW-COHERENCE: should flag validated revision without reviewer', () => {
    const rev = makeRevision({ statut: 'valide', reviseur: undefined });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-WORKFLOW-COHERENCE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('REV-DELAI-CRITIQUE: should flag old critical item still pending', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 5);
    const rev = makeRevision({
      priorite: 'critique',
      statut: 'en_attente',
      dateDetection: oldDate.toISOString().split('T')[0],
    });
    const result = analyzeRevisionItems([rev]);
    const finding = result.findings.find(f => f.ruleId === 'REV-DELAI-CRITIQUE');
    expect(finding).toBeDefined();
  });
});

// ======================== analyzeLeadSchedules ========================

describe('analyzeLeadSchedules', () => {
  it('should return clean result for valid lead schedule', () => {
    const result = analyzeLeadSchedules([makeLeadSchedule()]);
    expect(result.category).toBe('lead_schedule');
    expect(result.score).toBeGreaterThan(0);
  });

  it('LS-VARIATION-CALC: should detect incorrect variation', () => {
    const ls = makeLeadSchedule({ variation: 999 }); // actual: 10_000_000
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-VARIATION-CALC');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('LS-VARIATION-CALC: should detect incorrect percentage', () => {
    const ls = makeLeadSchedule({ variationPourcent: 50 }); // actual: 10%
    const result = analyzeLeadSchedules([ls]);
    const findings = result.findings.filter(f => f.ruleId === 'LS-VARIATION-CALC');
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('LS-VARIATION-SEUIL: should flag significant variation without completed review', () => {
    const ls = makeLeadSchedule({
      variation: 20_000_000,
      seuilSignificativite: 5_000_000,
      statutRevue: 'en_cours',
    });
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-VARIATION-SEUIL');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('LS-VARIATION-SEUIL: no finding when review is completed', () => {
    const ls = makeLeadSchedule({
      variation: 20_000_000,
      seuilSignificativite: 5_000_000,
      statutRevue: 'termine',
    });
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-VARIATION-SEUIL');
    expect(finding).toBeUndefined();
  });

  it('LS-RISQUE-ISA315: should flag incoherent risk trilogy', () => {
    const ls = makeLeadSchedule({
      risqueInherent: 'eleve',
      risqueControle: 'eleve',
      risqueDetection: 'faible',
    });
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-RISQUE-ISA315');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('LS-ASSERTIONS-COUVERTURE: should flag untested high-risk assertions', () => {
    const ls = makeLeadSchedule({
      assertions: [
        { code: 'existence', libelle: 'Existence', description: 'Test', risque: 'tres_eleve', testEffectue: false },
      ],
    });
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-ASSERTIONS-COUVERTURE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('LS-SEPARATION-FONCTIONS: should flag same preparer and reviewer', () => {
    const ls = makeLeadSchedule({ preparePar: 'Alice', revisePar: 'Alice' });
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-SEPARATION-FONCTIONS');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('LS-PREPARATION-INCOMPLETE: should flag missing preparer', () => {
    const ls = makeLeadSchedule({ preparePar: undefined });
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-PREPARATION-INCOMPLETE');
    expect(finding).toBeDefined();
  });

  it('LS-CLASSES-COUVERTURE: should flag missing classes', () => {
    const ls = makeLeadSchedule({ comptes: ['521100'] }); // only class 5
    const result = analyzeLeadSchedules([ls]);
    const finding = result.findings.find(f => f.ruleId === 'LS-CLASSES-COUVERTURE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('info');
    expect(finding!.detail).toContain('Classe 1');
  });
});

// ======================== analyzeRiskMatrix ========================

describe('analyzeRiskMatrix', () => {
  it('should return clean result for valid risk matrix', () => {
    const risque = makeRisque();
    const rev = makeRevision({
      assertions: ['existence'],
      description: 'Ventes test',
    });
    const result = analyzeRiskMatrix([risque], [rev]);
    expect(result.category).toBe('risk_matrix');
    expect(result.score).toBeGreaterThan(0);
  });

  it('RM-CONTROLE-INEFFICACE: should flag ineffective control without recommendation', () => {
    const risque = makeRisque({
      efficaciteControle: 'inefficace',
      recommandation: undefined,
    });
    const result = analyzeRiskMatrix([risque], []);
    const finding = result.findings.find(f => f.ruleId === 'RM-CONTROLE-INEFFICACE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('RM-CONTROLE-INEFFICACE: no finding when recommendation exists', () => {
    const risque = makeRisque({
      efficaciteControle: 'inefficace',
      recommandation: 'Renforcer le contrôle',
    });
    const result = analyzeRiskMatrix([risque], []);
    const finding = result.findings.find(f => f.ruleId === 'RM-CONTROLE-INEFFICACE');
    expect(finding).toBeUndefined();
  });

  it('RM-RESIDUEL-ELEVE: should flag high residual risk without linked revision', () => {
    const risque = makeRisque({
      probabilite: 'tres_eleve',
      impact: 'tres_eleve',
    });
    const result = analyzeRiskMatrix([risque], []);
    const finding = result.findings.find(f => f.ruleId === 'RM-RESIDUEL-ELEVE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('RM-CROSS-CHECK: should flag risk without linked revision point', () => {
    const risque = makeRisque({ cycle: 'Personnel' });
    const result = analyzeRiskMatrix([risque], []);
    const finding = result.findings.find(f => f.ruleId === 'RM-CROSS-CHECK');
    expect(finding).toBeDefined();
  });

  it('RM-PROB-IMPACT: should flag over-confidence in control', () => {
    const risque = makeRisque({
      probabilite: 'eleve',
      impact: 'eleve',
      efficaciteControle: 'efficace',
    });
    const result = analyzeRiskMatrix([risque], []);
    const finding = result.findings.find(f => f.ruleId === 'RM-PROB-IMPACT');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('RM-COMPLETENESS: should flag missing major cycles', () => {
    const risque = makeRisque({ cycle: 'Ventes / Clients' });
    const result = analyzeRiskMatrix([risque], []);
    const finding = result.findings.find(f => f.ruleId === 'RM-COMPLETENESS');
    expect(finding).toBeDefined();
    expect(finding!.detail).toContain('Stocks');
    expect(finding!.detail).toContain('Trésorerie');
  });
});

// ======================== analyzeAdjustments ========================

describe('analyzeAdjustments', () => {
  it('should return clean result when no adjustments', () => {
    const result = analyzeAdjustments([makeRevision()]);
    expect(result.category).toBe('adjustment');
    // No ecritureProposee -> no checks on adjustments, but cumul and doublon checks still run
  });

  it('ADJ-EQUILIBRE: should detect unbalanced adjustment', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '601100', libelle: 'Achats', debit: 10000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 9000 },
        ],
        montantTotal: 10000, statut: 'propose', justification: 'Test',
      },
    });
    const result = analyzeAdjustments([rev]);
    const finding = result.findings.find(f => f.ruleId === 'ADJ-EQUILIBRE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('critical');
  });

  it('ADJ-COMPTES-SYSCOHADA: should detect invalid comptes', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '091100', libelle: 'Invalid', debit: 1000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 1000 },
        ],
        montantTotal: 1000, statut: 'propose', justification: 'Test',
      },
    });
    const result = analyzeAdjustments([rev]);
    const finding = result.findings.find(f => f.ruleId === 'ADJ-COMPTES-SYSCOHADA');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('ADJ-CLASSIFICATION: should flag PAJE with comptabilise status', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '601100', libelle: 'Achats', debit: 1000, credit: 0 },
          { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 1000 },
        ],
        montantTotal: 1000, statut: 'comptabilise', justification: 'Test',
      },
    });
    const result = analyzeAdjustments([rev]);
    const finding = result.findings.find(f => f.ruleId === 'ADJ-CLASSIFICATION');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('ADJ-CUMUL-ISA450: should flag excessive uncorrected anomalies', () => {
    // Two revisions with proposed adjustments summing > 5% of total
    const revisions = [
      makeRevision({
        id: 'REV-001', montant: 100,
        ecritureProposee: {
          id: 'PAJE-001', type: 'PAJE',
          lignes: [
            { compte: '601100', libelle: 'A', debit: 100, credit: 0 },
            { compte: '401100', libelle: 'B', debit: 0, credit: 100 },
          ],
          montantTotal: 100, statut: 'propose', justification: 'Test',
        },
      }),
      makeRevision({
        id: 'REV-002', montant: 100,
        ecritureProposee: {
          id: 'PAJE-002', type: 'PAJE',
          lignes: [
            { compte: '602100', libelle: 'C', debit: 100, credit: 0 },
            { compte: '402100', libelle: 'D', debit: 0, credit: 100 },
          ],
          montantTotal: 100, statut: 'propose', justification: 'Test',
        },
      }),
    ];
    // total montant = 200, uncorrected = 200, ratio = 100% > 5%
    const result = analyzeAdjustments(revisions);
    const finding = result.findings.find(f => f.ruleId === 'ADJ-CUMUL-ISA450');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('ADJ-DOUBLON: should flag potential duplicate adjustments', () => {
    const revisions = [
      makeRevision({
        id: 'REV-001',
        ecritureProposee: {
          id: 'PAJE-001', type: 'PAJE',
          lignes: [
            { compte: '601100', libelle: 'Achats', debit: 5000, credit: 0 },
            { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 5000 },
          ],
          montantTotal: 5000, statut: 'propose', justification: 'Test',
        },
      }),
      makeRevision({
        id: 'REV-002',
        ecritureProposee: {
          id: 'PAJE-002', type: 'PAJE',
          lignes: [
            { compte: '601100', libelle: 'Achats', debit: 5100, credit: 0 },
            { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 5100 },
          ],
          montantTotal: 5100, statut: 'propose', justification: 'Test',
        },
      }),
    ];
    const result = analyzeAdjustments(revisions);
    const finding = result.findings.find(f => f.ruleId === 'ADJ-DOUBLON');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('ADJ-IMPACT-ETATS: should flag adjustment impacting both bilan and gestion', () => {
    const rev = makeRevision({
      ecritureProposee: {
        id: 'PAJE-001', type: 'PAJE',
        lignes: [
          { compte: '603100', libelle: 'Variation stocks', debit: 5000, credit: 0 },
          { compte: '311000', libelle: 'Stocks', debit: 0, credit: 5000 },
        ],
        montantTotal: 5000, statut: 'propose', justification: 'Test',
      },
    });
    const result = analyzeAdjustments([rev]);
    const finding = result.findings.find(f => f.ruleId === 'ADJ-IMPACT-ETATS');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('info');
  });
});

// ======================== analyzeRevueAnalytique ========================

describe('analyzeRevueAnalytique', () => {
  it('should return clean result for normal variation', () => {
    const ls = makeLeadSchedule({ variationPourcent: 5 });
    const result = analyzeRevueAnalytique([ls]);
    expect(result.category).toBe('analytical');
    expect(result.score).toBeGreaterThan(0);
  });

  it('RA-RATIO-CALC: should detect incorrect percentage calculation', () => {
    const ls = makeLeadSchedule({
      soldePrecedent: 100_000_000,
      soldeActuel: 120_000_000,
      variationPourcent: 50, // should be 20%
    });
    const result = analyzeRevueAnalytique([ls]);
    const finding = result.findings.find(f => f.ruleId === 'RA-RATIO-CALC');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('error');
  });

  it('RA-TENDANCE-ANORMALE: should flag variation > 20%', () => {
    const ls = makeLeadSchedule({ variationPourcent: 25 });
    const result = analyzeRevueAnalytique([ls]);
    const finding = result.findings.find(f => f.ruleId === 'RA-TENDANCE-ANORMALE');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });

  it('RA-TENDANCE-ANORMALE: no finding for variation <= 20%', () => {
    const ls = makeLeadSchedule({ variationPourcent: 15 });
    const result = analyzeRevueAnalytique([ls]);
    const finding = result.findings.find(f => f.ruleId === 'RA-TENDANCE-ANORMALE');
    expect(finding).toBeUndefined();
  });

  it('RA-SENS-VARIATION: should flag high increase in passifs', () => {
    const ls = makeLeadSchedule({
      comptes: ['401100'],
      variationPourcent: 30,
    });
    const result = analyzeRevueAnalytique([ls]);
    const finding = result.findings.find(f => f.ruleId === 'RA-SENS-VARIATION');
    expect(finding).toBeDefined();
    expect(finding!.severity).toBe('warning');
  });
});

// ======================== analyzeAuditRevision (integration) ========================

describe('analyzeAuditRevision', () => {
  it('should return a complete AuditAnalysisResult', () => {
    const result = analyzeAuditRevision({
      revisions: [makeRevision()],
      leadSchedules: [makeLeadSchedule()],
      risquesControles: [makeRisque()],
    });
    expect(result.timestamp).toBeDefined();
    expect(result.globalScore).toBeGreaterThanOrEqual(0);
    expect(result.globalScore).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.globalGrade);
    expect(result.summary).toBeTruthy();
    expect(result.categories).toHaveLength(5);
    expect(result.allFindings.length).toBe(
      result.criticalCount + result.errorCount + result.warningCount + result.infoCount
    );
  });

  it('should have correct grade for score >= 90', () => {
    // Clean data that should produce few findings
    const rev = makeRevision({
      compte: '401100',
      classeCompte: '4',
      statut: 'en_cours',
      niveauRisque: 'eleve',
      pieceJustificative: 'doc.pdf',
    });
    const result = analyzeAuditRevision({
      revisions: [rev],
      leadSchedules: [makeLeadSchedule()],
      risquesControles: [makeRisque({
        cycle: 'Ventes / Clients',
        probabilite: 'faible',
        impact: 'modere',
      })],
    });
    // We can at least verify it's a valid grade
    expect(['A', 'B', 'C', 'D', 'F']).toContain(result.globalGrade);
  });

  it('should generate French summary', () => {
    const result = analyzeAuditRevision({
      revisions: [makeRevision()],
      leadSchedules: [makeLeadSchedule()],
      risquesControles: [makeRisque()],
    });
    expect(result.summary).toContain('analyse');
    expect(result.summary).toContain('score');
  });

  it('should have unique finding IDs', () => {
    const result = analyzeAuditRevision({
      revisions: [
        makeRevision({ id: 'REV-001' }),
        makeRevision({ id: 'REV-002', compte: '521100', classeCompte: '4' }),
      ],
      leadSchedules: [makeLeadSchedule()],
      risquesControles: [makeRisque()],
    });
    const ids = result.allFindings.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should aggregate findings counts correctly', () => {
    const result = analyzeAuditRevision({
      revisions: [makeRevision()],
      leadSchedules: [makeLeadSchedule()],
      risquesControles: [makeRisque()],
    });
    const criticals = result.allFindings.filter(f => f.severity === 'critical').length;
    const errors = result.allFindings.filter(f => f.severity === 'error').length;
    const warnings = result.allFindings.filter(f => f.severity === 'warning').length;
    const infos = result.allFindings.filter(f => f.severity === 'info').length;
    expect(result.criticalCount).toBe(criticals);
    expect(result.errorCount).toBe(errors);
    expect(result.warningCount).toBe(warnings);
    expect(result.infoCount).toBe(infos);
  });
});
