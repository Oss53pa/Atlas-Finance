/**
 * standardBudgetStructure — Structure de budget STANDARD (référentiel SYSCOHADA
 * révisé, aligné sur la présentation du Compte de Résultat + tableau des
 * investissements). Sert de socle « complet » pour :
 *   - le modèle Excel d'import (toutes les rubriques normalisées, prêtes à chiffrer) ;
 *   - la génération d'un squelette budgétaire (toutes les lignes à 0) sans Excel.
 *
 * Dérivée de `syscohada-referentiel` (source unique) → pas de codes en dur qui
 * divergeraient du plan comptable de l'app.
 */
import {
  SOUS_COMPTES_SYSCOHADA, CATEGORIES_SYSCOHADA,
} from '../../../data/syscohada-referentiel';
import type { BudgetImportLine } from '../services/budgetService';

export type BudgetSens = 'charge' | 'produit' | 'capex';

export interface StandardBudgetLine {
  account_code: string;             // compte SYSCOHADA (3 chiffres)
  label: string;                    // libellé du compte
  classe: string;                   // '6' (charges) | '7' (produits) | '2' (CAPEX)
  categorie: string;                // rubrique à 2 chiffres
  rubrique: string;                 // « 60 — Achats et variations de stocks »
  budget_type: 'exploitation' | 'investissement';
  sens: BudgetSens;
}

const CAT = new Map(CATEGORIES_SYSCOHADA.map(c => [c.code, c]));

// CAPEX budgétable = classe 2 hors 28/29 (amortissements / provisions : ce sont des
// contreparties, jamais des enveloppes d'investissement qu'on chiffre en budget).
const EXCLUDED_CAT = new Set(['28', '29']);

/** Table de budget standard complète (charges 6, produits 7, CAPEX 2). */
export const STANDARD_BUDGET_LINES: StandardBudgetLine[] = SOUS_COMPTES_SYSCOHADA
  .map((sc): StandardBudgetLine | null => {
    const cat = CAT.get(sc.categorieCode);
    if (!cat) return null;
    const classe = cat.classeCode;
    if (classe !== 2 && classe !== 6 && classe !== 7) return null;
    if (classe === 2 && EXCLUDED_CAT.has(cat.code)) return null;
    return {
      account_code: sc.code,
      label: sc.libelle,
      classe: String(classe),
      categorie: cat.code,
      rubrique: `${cat.code} — ${cat.libelle}`,
      budget_type: classe === 2 ? 'investissement' : 'exploitation',
      sens: classe === 6 ? 'charge' : classe === 7 ? 'produit' : 'capex',
    };
  })
  .filter((l): l is StandardBudgetLine => l !== null)
  .sort((a, b) => a.account_code.localeCompare(b.account_code));

export type StandardFilter = 'exploitation' | 'investissement' | 'charges' | 'produits';

export function getStandardBudgetLines(filter?: StandardFilter): StandardBudgetLine[] {
  if (!filter) return STANDARD_BUDGET_LINES;
  return STANDARD_BUDGET_LINES.filter(l =>
    filter === 'charges' ? l.classe === '6'
      : filter === 'produits' ? l.classe === '7'
        : l.budget_type === filter);
}

/** Nombre de lignes standard par grand poste (pour l'UI d'aperçu). */
export function standardCounts(): { charges: number; produits: number; capex: number; total: number } {
  const charges = STANDARD_BUDGET_LINES.filter(l => l.classe === '6').length;
  const produits = STANDARD_BUDGET_LINES.filter(l => l.classe === '7').length;
  const capex = STANDARD_BUDGET_LINES.filter(l => l.classe === '2').length;
  return { charges, produits, capex, total: STANDARD_BUDGET_LINES.length };
}

/**
 * Squelette budgétaire prêt à importer : toutes les lignes standard, montants à 0.
 * L'utilisateur n'a plus qu'à chiffrer (saisie ou ré-import).
 */
export function buildStandardImportLines(filter?: StandardFilter): BudgetImportLine[] {
  const zero: Record<number, number> = {};
  for (let p = 1; p <= 12; p++) zero[p] = 0;
  return getStandardBudgetLines(filter).map(l => ({
    account_code: l.account_code,
    budget_type: l.budget_type,
    section_code: null,
    periods: { ...zero },
  }));
}

/**
 * Feuilles du modèle Excel standard (AOA = array of arrays).
 *  - `budget` : entête + toutes les lignes standard (montants vides à chiffrer).
 *  - `notice` : mode d'emploi + conventions.
 * La colonne « Rubrique » est purement indicative (ignorée à l'import).
 */
export function buildStandardTemplateSheets(months: string[]): { budget: any[][]; notice: any[][] } {
  const header = ['Rubrique', 'Compte', 'Libellé', 'Type', 'Section', ...months];
  const rows = STANDARD_BUDGET_LINES.map(l => [
    l.rubrique, l.account_code, l.label, l.budget_type, '',
    ...months.map(() => ''), // 12 cellules vides à chiffrer
  ]);
  const budget = [header, ...rows];

  const notice: any[][] = [
    ['Modèle de budget standard — Atlas Finance & Accounting'],
    [''],
    ['Référentiel : SYSCOHADA révisé (Acte Uniforme OHADA 2017).'],
    [`Structure : ${STANDARD_BUDGET_LINES.length} lignes normalisées (charges cl.6, produits cl.7, CAPEX cl.2).`],
    [''],
    ['Comment remplir :'],
    ['1. Onglet « Budget » : chiffrez les 12 colonnes mensuelles (montants en FCFA).'],
    ['2. Laissez une ligne vide (ou 0) pour un compte non budgété — elle sera ignorée.'],
    ['3. Colonne « Section » (optionnelle) : code de section analytique / centre de coût.'],
    ['4. Vous pouvez ajouter vos propres comptes (respectez le plan SYSCOHADA).'],
    [''],
    ['Colonnes reconnues à l\'import :'],
    ['• Compte (obligatoire) — n° de compte SYSCOHADA'],
    ['• Type — « exploitation » ou « investissement » (déduit du compte si absent : cl.2 = investissement)'],
    ['• Section — code de section (optionnel)'],
    ['• Janvier … Décembre — phasage mensuel ; ou une colonne « Annuel » répartie /12'],
    [''],
    ['La colonne « Rubrique » et « Libellé » sont indicatives (non importées).'],
  ];
  return { budget, notice };
}
