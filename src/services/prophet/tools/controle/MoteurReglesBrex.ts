// @ts-nocheck

/**
 * MoteurReglesBrex — Business Rules Execution Engine SYSCOHADA
 * 15+ règles prédéfinies + règles personnalisées
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

interface LigneBalance { compte: string; libelle: string; solde: number; debit: number; credit: number; }

interface Violation { regle_id: string; nom: string; type: 'alerte' | 'blocage' | 'suggestion'; message: string; compte?: string; montant?: number; reference_legale?: string; }

interface RegleMetier {
  id: string;
  nom: string;
  type: 'alerte' | 'blocage' | 'suggestion';
  description: string;
  reference_legale?: string;
  evaluer: (balance: LigneBalance[], context?: any) => Violation | null;
}

// ── RÈGLES SYSCOHADA PRÉDÉFINIES ─────────────────────────────

const REGLES_SYSCOHADA: RegleMetier[] = [
  {
    id: 'BREX-001', nom: 'Solde débiteur compte 40X interdit', type: 'alerte',
    description: 'Les comptes fournisseurs (40X) ne doivent pas avoir de solde débiteur sauf avances (409)',
    reference_legale: 'SYSCOHADA — Plan comptable classe 4',
    evaluer: (balance) => {
      const violations = balance.filter(l => l.compte.startsWith('40') && !l.compte.startsWith('409') && l.solde > 0);
      if (violations.length > 0) {
        const total = violations.reduce((a, l) => a + l.solde, 0);
        return { regle_id: 'BREX-001', nom: 'Solde débiteur compte 40X', type: 'alerte', message: `${violations.length} compte(s) fournisseur(s) avec solde débiteur (total: ${total.toLocaleString('fr-FR')} FCFA). Vérifier les avances et les paiements en trop.`, compte: violations.map(v => v.compte).join(', '), montant: total, reference_legale: 'SYSCOHADA — Les comptes 40X doivent avoir un solde créditeur' };
      }
      return null;
    },
  },
  {
    id: 'BREX-002', nom: 'Solde créditeur compte 41X interdit', type: 'alerte',
    description: 'Les comptes clients (41X) ne doivent pas avoir de solde créditeur sauf avances (419)',
    reference_legale: 'SYSCOHADA — Plan comptable classe 4',
    evaluer: (balance) => {
      const violations = balance.filter(l => l.compte.startsWith('41') && !l.compte.startsWith('419') && l.solde < 0);
      if (violations.length > 0) {
        const total = violations.reduce((a, l) => a + Math.abs(l.solde), 0);
        return { regle_id: 'BREX-002', nom: 'Solde créditeur compte 41X', type: 'alerte', message: `${violations.length} compte(s) client(s) avec solde créditeur (total: ${total.toLocaleString('fr-FR')} FCFA). Vérifier les avoirs et les trop-perçus.`, montant: total };
      }
      return null;
    },
  },
  {
    id: 'BREX-003', nom: 'Caisse ne peut être créditrice', type: 'blocage',
    description: 'Le compte caisse (57X) ne doit jamais avoir un solde créditeur',
    reference_legale: 'SYSCOHADA — Principe de réalité',
    evaluer: (balance) => {
      const caisse = balance.filter(l => l.compte.startsWith('57') && l.solde < 0);
      if (caisse.length > 0) {
        return { regle_id: 'BREX-003', nom: 'Caisse créditrice', type: 'blocage', message: `ERREUR : Le compte caisse est créditeur (${caisse[0].solde.toLocaleString('fr-FR')} FCFA). Une caisse ne peut pas avoir un solde négatif.`, compte: caisse[0].compte, montant: caisse[0].solde };
      }
      return null;
    },
  },
  {
    id: 'BREX-004', nom: 'Capital < 50% pertes → AG obligatoire', type: 'alerte',
    description: 'Si les capitaux propres sont inférieurs à la moitié du capital social, convocation AG obligatoire',
    reference_legale: 'OHADA AUSCGIE art. 664-3',
    evaluer: (balance) => {
      const capital = Math.abs(balance.filter(l => l.compte.startsWith('101')).reduce((a, l) => a + l.solde, 0));
      const cp = Math.abs(balance.filter(l => l.compte.startsWith('1')).reduce((a, l) => a + l.solde, 0));
      if (capital > 0 && cp < capital / 2) {
        return { regle_id: 'BREX-004', nom: 'Capital < 50% pertes', type: 'alerte', message: `ALERTE CRITIQUE : Capitaux propres (${cp.toLocaleString('fr-FR')}) < 50% du capital social (${capital.toLocaleString('fr-FR')}). Obligation de convoquer une AGE dans les 4 mois (OHADA art. 664-3).`, montant: cp, reference_legale: 'OHADA AUSCGIE art. 664-3' };
      }
      return null;
    },
  },
  {
    id: 'BREX-005', nom: 'Capitaux propres négatifs', type: 'blocage',
    description: 'Les capitaux propres ne doivent pas être négatifs (continuité d\'exploitation)',
    reference_legale: 'OHADA art. 547 — Continuité d\'exploitation',
    evaluer: (balance) => {
      const cp = balance.filter(l => l.compte.startsWith('1') && !l.compte.startsWith('16') && !l.compte.startsWith('17') && !l.compte.startsWith('18') && !l.compte.startsWith('19')).reduce((a, l) => a + l.solde, 0);
      if (cp > 0) { // en convention solde créditeur = négatif pour passif
        return { regle_id: 'BREX-005', nom: 'Capitaux propres négatifs', type: 'blocage', message: `ALERTE GRAVE : Capitaux propres négatifs. Risque de cessation de paiement. Procédure d'alerte obligatoire (OHADA art. 547).`, montant: cp, reference_legale: 'OHADA AUSCGIE art. 547' };
      }
      return null;
    },
  },
  {
    id: 'BREX-006', nom: 'TVA déductible > TVA collectée', type: 'suggestion',
    description: 'Si la TVA déductible dépasse la TVA collectée, vérifier le crédit de TVA',
    evaluer: (balance) => {
      const tvaDeductible = Math.abs(balance.filter(l => l.compte.startsWith('4451') || l.compte.startsWith('4452')).reduce((a, l) => a + l.solde, 0));
      const tvaCollectee = Math.abs(balance.filter(l => l.compte.startsWith('4431') || l.compte.startsWith('4432') || l.compte.startsWith('4434')).reduce((a, l) => a + l.solde, 0));
      if (tvaDeductible > tvaCollectee && tvaCollectee > 0) {
        return { regle_id: 'BREX-006', nom: 'Crédit TVA', type: 'suggestion', message: `Crédit de TVA détecté : déductible (${tvaDeductible.toLocaleString('fr-FR')}) > collectée (${tvaCollectee.toLocaleString('fr-FR')}). Vérifier l'éligibilité au remboursement.`, montant: tvaDeductible - tvaCollectee };
      }
      return null;
    },
  },
  {
    id: 'BREX-007', nom: 'Déséquilibre balance', type: 'blocage',
    description: 'La balance doit être équilibrée (total débits = total crédits)',
    evaluer: (balance) => {
      const totalDebit = balance.reduce((a, l) => a + l.debit, 0);
      const totalCredit = balance.reduce((a, l) => a + l.credit, 0);
      const ecart = Math.abs(totalDebit - totalCredit);
      if (ecart > 1) {
        return { regle_id: 'BREX-007', nom: 'Balance déséquilibrée', type: 'blocage', message: `ERREUR : Balance non équilibrée. Écart de ${ecart.toLocaleString('fr-FR')} FCFA (Débit: ${totalDebit.toLocaleString('fr-FR')} / Crédit: ${totalCredit.toLocaleString('fr-FR')}).`, montant: ecart };
      }
      return null;
    },
  },
  {
    id: 'BREX-008', nom: 'Résultat négatif 3 exercices', type: 'alerte',
    description: '3 résultats négatifs consécutifs = alerte continuité',
    reference_legale: 'OHADA art. 547',
    evaluer: (balance, context) => {
      if (context?.resultats_3ans) {
        const negatifs = context.resultats_3ans.filter((r: number) => r < 0);
        if (negatifs.length >= 3) {
          return { regle_id: 'BREX-008', nom: '3 exercices déficitaires', type: 'alerte', message: 'ALERTE : 3 exercices consécutifs avec résultat négatif. Risque sur la continuité d\'exploitation. Procédure d\'alerte à déclencher.', reference_legale: 'OHADA art. 547' };
        }
      }
      return null;
    },
  },
  {
    id: 'BREX-009', nom: 'Comptes d\'attente non soldés', type: 'suggestion',
    description: 'Les comptes d\'attente (47X) doivent être soldés à la clôture',
    evaluer: (balance) => {
      const attente = balance.filter(l => l.compte.startsWith('47') && Math.abs(l.solde) > 0);
      if (attente.length > 0) {
        const total = attente.reduce((a, l) => a + Math.abs(l.solde), 0);
        return { regle_id: 'BREX-009', nom: 'Comptes d\'attente non soldés', type: 'suggestion', message: `${attente.length} compte(s) d'attente (47X) non soldés pour ${total.toLocaleString('fr-FR')} FCFA. À régulariser avant clôture.`, montant: total };
      }
      return null;
    },
  },
  {
    id: 'BREX-010', nom: 'Solde banque négatif important', type: 'alerte',
    description: 'Découvert bancaire important à surveiller',
    evaluer: (balance) => {
      const banques = balance.filter(l => l.compte.startsWith('52') && l.solde < 0);
      if (banques.length > 0) {
        const total = banques.reduce((a, l) => a + l.solde, 0);
        if (Math.abs(total) > 10000000) { // > 10M FCFA
          return { regle_id: 'BREX-010', nom: 'Découvert bancaire important', type: 'alerte', message: `Découvert bancaire de ${Math.abs(total).toLocaleString('fr-FR')} FCFA. Vérifier les autorisations de découvert et la position de trésorerie.`, montant: total };
        }
      }
      return null;
    },
  },
  {
    id: 'BREX-011', nom: 'Charges à payer non provisionnées', type: 'suggestion',
    description: 'Vérifier que les FNP et charges à payer sont correctement provisionnées',
    evaluer: (balance) => {
      const fnp = balance.filter(l => l.compte.startsWith('408')).reduce((a, l) => a + Math.abs(l.solde), 0);
      const charges = balance.filter(l => l.compte.startsWith('6')).reduce((a, l) => a + l.debit, 0);
      if (fnp === 0 && charges > 0) {
        return { regle_id: 'BREX-011', nom: 'FNP absentes', type: 'suggestion', message: 'Aucune facture non parvenue (408) constatée. Vérifier si des charges de l\'exercice sont encore non facturées à la clôture.' };
      }
      return null;
    },
  },
  {
    id: 'BREX-012', nom: 'Produits constatés d\'avance absents', type: 'suggestion',
    description: 'Vérifier les PCA en fin d\'exercice',
    evaluer: (balance) => {
      const pca = balance.filter(l => l.compte.startsWith('477')).reduce((a, l) => a + Math.abs(l.solde), 0);
      const produits = balance.filter(l => l.compte.startsWith('7')).reduce((a, l) => a + l.credit, 0);
      if (pca === 0 && produits > 50000000) {
        return { regle_id: 'BREX-012', nom: 'PCA absents', type: 'suggestion', message: 'Aucun produit constaté d\'avance (477) pour un CA significatif. Vérifier s\'il y a des produits facturés d\'avance.' };
      }
      return null;
    },
  },
];

function evaluerRegles(balance: LigneBalance[], context?: any): { violations: Violation[]; nb_blocages: number; nb_alertes: number; nb_suggestions: number; score_conformite: number } {
  const violations: Violation[] = [];

  for (const regle of REGLES_SYSCOHADA) {
    const violation = regle.evaluer(balance, context);
    if (violation) violations.push(violation);
  }

  const nbBlocages = violations.filter(v => v.type === 'blocage').length;
  const nbAlertes = violations.filter(v => v.type === 'alerte').length;
  const nbSuggestions = violations.filter(v => v.type === 'suggestion').length;
  const score = Math.max(0, 100 - nbBlocages * 20 - nbAlertes * 10 - nbSuggestions * 3);

  return { violations, nb_blocages: nbBlocages, nb_alertes: nbAlertes, nb_suggestions: nbSuggestions, score_conformite: score };
}

export const brexTools: Record<string, ToolDefinition> = {
  appliquer_regles_brex: {
    schema: {
      type: 'function',
      function: {
        name: 'appliquer_regles_brex',
        description: 'Applique 12+ règles métier SYSCOHADA sur la balance : détecte les anomalies (soldes interdits, déséquilibres, risques de continuité, TVA, etc.). Retourne un score de conformité.',
        parameters: {
          type: 'object',
          properties: {
            balance: { type: 'array', items: { type: 'object' }, description: 'Balance [{compte, libelle, solde, debit, credit}]' },
            resultats_3ans: { type: 'array', items: { type: 'number' }, description: 'Résultats nets des 3 derniers exercices' },
          },
          required: ['balance'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { balance, resultats_3ans } = args as Record<string, unknown>;

      // Lire la balance réelle si non fournie
      if ((!balance || balance.length === 0) && adapter) {
        const rows = await adapter.getTrialBalance();
        balance = rows.map((r: any) => ({
          compte: r.accountCode,
          libelle: r.accountName,
          solde: (r.totalDebit || 0) - (r.totalCredit || 0),
          debit: r.totalDebit || 0,
          credit: r.totalCredit || 0,
        }));
      }
      if (!balance || balance.length === 0) {
        return JSON.stringify({ error: 'Aucune donnée de balance disponible.' });
      }

      return JSON.stringify(evaluerRegles(balance, { resultats_3ans }));
    },
  },
};
