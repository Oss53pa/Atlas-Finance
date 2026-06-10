/**
 * glHelpers — SOURCE DE VÉRITÉ UNIQUE des agrégats financiers SYSCOHADA.
 *
 * Toutes les pages d'états financiers (Bilan, Compte de Résultat, TFT, SIG, Ratios,
 * États SYSCOHADA, etc.) DOIVENT dériver leurs montants d'ici, et NON de helpers
 * `net`/`creditNet` réimplémentés localement. Historique : 6 implémentations
 * divergentes calculaient les mêmes postes différemment (charges oubliant 65/69,
 * À Nouveau compté comme flux de période, TFT classé par écriture cassé par les OD
 * regroupées…) → résultats incohérents (67,3M vs 79,6M, TFT à 0, etc.).
 *
 * Règles canoniques encodées ici :
 *  - Résultat net = produits (classe 7 ENTIÈRE) − charges (classe 6 ENTIÈRE).
 *  - Soldes de bilan = TOUTES les écritures (À Nouveau inclus) — positions à date.
 *  - Flux de période = écritures HORS À Nouveau (AN/RAN) — l'ouverture n'est pas un flux.
 *  - TFT = variation de CLASSES de période (immune aux écritures OD « regroupées »).
 *  - Brouillons (status 'draft') toujours exclus.
 */

export interface GLLine {
  accountCode: string;
  debit: number;
  credit: number;
}

export interface GLEntry {
  id?: string;
  date?: string;
  journal?: string;
  status?: string;
  lines?: GLLine[];
}

const isANEntry = (e: GLEntry): boolean => e.journal === 'AN' || e.journal === 'RAN';

/**
 * Charge toutes les écritures du Grand Livre (hors brouillons).
 * L'adaptateur gère la pagination (toutes les lignes) et l'attente de la session.
 */
export async function loadGLEntries(adapter: { getAll: (t: string) => Promise<unknown[]> }): Promise<GLEntry[]> {
  const all = (await adapter.getAll('journalEntries')) as GLEntry[];
  return (all || []).filter((e) => e.status !== 'draft');
}

export interface GLHelpers {
  /** Solde net (débit − crédit) par préfixe(s), TOUTES écritures (AN inclus). */
  net: (...prefixes: string[]) => number;
  /** Solde net créditeur (crédit − débit) par préfixe(s), TOUTES écritures. */
  creditNet: (...prefixes: string[]) => number;
  /** Solde net de PÉRIODE (hors À Nouveau) — pour les flux. */
  netP: (...prefixes: string[]) => number;
  /** Solde net créditeur de PÉRIODE (hors À Nouveau). */
  creditNetP: (...prefixes: string[]) => number;
}

/** Fabrique les helpers canoniques sur un jeu d'écritures (déjà filtré des brouillons). */
export function makeGLHelpers(entries: GLEntry[]): GLHelpers {
  const sum = (periodOnly: boolean, prefixes: string[]): number => {
    let debit = 0, credit = 0;
    for (const e of entries) {
      if (periodOnly && isANEntry(e)) continue;
      for (const l of (e.lines || [])) {
        const code = l.accountCode || '';
        if (prefixes.some((p) => code.startsWith(p))) {
          debit += l.debit || 0;
          credit += l.credit || 0;
        }
      }
    }
    return debit - credit;
  };
  return {
    net: (...p) => sum(false, p),
    creditNet: (...p) => -sum(false, p),
    netP: (...p) => sum(true, p),
    creditNetP: (...p) => -sum(true, p),
  };
}

/** Résultat net SYSCOHADA canonique = produits (classe 7) − charges (classe 6). */
export function resultatNet(h: GLHelpers): number {
  return h.creditNet('7') - h.net('6');
}

export interface TFTResult {
  fluxActivite: number;
  fluxInvestissement: number;
  fluxFinancement: number;
  variationTresorerie: number;
  tresorerieDebut: number;
  tresorerieFin: number;
  // détail investissement / financement
  acquisitionsImmobilisations: number;
  acquisitionsFinancieres: number;
  cessionsImmobilisations: number;
  augmentationCapital: number;
  nouveauxEmprunts: number;
  remboursementsEmprunts: number;
}

/**
 * TFT canonique par VARIATION DE CLASSES de période (hors À Nouveau).
 * Immune aux écritures OD « regroupées » (qui mélangent toutes les classes dans une
 * seule écriture, rendant impossible la classification par contrepartie d'écriture).
 * L'activité est le résiduel → le total reconcilie avec la variation réelle de trésorerie.
 */
export function computeTFT(h: GLHelpers): TFTResult {
  const acquisitionsImmobilisations = Math.max(0, h.netP('20', '21', '22', '23', '24', '25'));
  const acquisitionsFinancieres = Math.max(0, h.netP('26', '27'));
  const cessionsImmobilisations = Math.max(0, h.creditNetP('82'));
  const fluxInvestissement = cessionsImmobilisations - acquisitionsImmobilisations - acquisitionsFinancieres;

  const remboursementsEmprunts = Math.max(0, h.netP('16', '17'));
  const nouveauxEmprunts = Math.max(0, -h.netP('16', '17'));
  const augmentationCapital = Math.max(0, h.creditNetP('10', '11', '12', '13'));
  const dividendes = Math.max(0, h.netP('465'));
  const fluxFinancement = augmentationCapital + nouveauxEmprunts - remboursementsEmprunts - dividendes;

  // Trésorerie = TOUTE la classe 5 (banques 52x, cartes 554, caisses 57x), hors dépréciations 59.
  const tresorerieFin = h.net('50', '51', '52', '53', '54', '55', '56', '57', '58');
  const variationTresorerie = h.netP('50', '51', '52', '53', '54', '55', '56', '57', '58');
  const tresorerieDebut = tresorerieFin - variationTresorerie;
  const fluxActivite = variationTresorerie - fluxInvestissement - fluxFinancement;

  return {
    fluxActivite, fluxInvestissement, fluxFinancement, variationTresorerie,
    tresorerieDebut, tresorerieFin,
    acquisitionsImmobilisations, acquisitionsFinancieres, cessionsImmobilisations,
    augmentationCapital, nouveauxEmprunts, remboursementsEmprunts,
  };
}
