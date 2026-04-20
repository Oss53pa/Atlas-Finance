/**
 * Atlas F&A — Génération automatique du Plan Comptable à partir du Grand Livre.
 *
 * Principe (inspiré de Cockpit F&A) :
 *   1) On extrait tous les numéros de compte distincts du GL.
 *   2) Pour chaque compte, on enrichit avec le référentiel SYSCOHADA :
 *        - libellé officiel (si trouvé dans le référentiel)
 *        - classe (1er chiffre)
 *        - catégorie (2 premiers chiffres)
 *        - sens normal (Débiteur / Créditeur)
 *        - nature (ACTIF / PASSIF / CHARGE / PRODUIT / SPECIAL)
 *   3) Si le GL a une colonne "Libellé compte", on l'utilise comme fallback
 *      pour les comptes auxiliaires personnalisés (ex: sous-comptes 4110001).
 *
 * Avantage : l'utilisateur n'a plus besoin d'importer un fichier Plan Comptable
 * séparé lors d'une migration. Le référentiel est reconstruit automatiquement
 * à partir des comptes réellement mouvementés.
 */
import {
  CLASSES_SYSCOHADA,
  CATEGORIES_SYSCOHADA,
  SOUS_COMPTES_SYSCOHADA,
} from '../../data/syscohada-referentiel';

export type AccountSource = 'syscohada' | 'gl' | 'inferred';

export interface GeneratedAccount {
  /** Numéro exact du compte tel qu'il apparaît dans le GL */
  numero: string;
  /** Libellé enrichi (SYSCOHADA si trouvé, sinon GL, sinon inféré) */
  libelle: string;
  /** Classe SYSCOHADA (1-9) */
  classe: number;
  /** Catégorie 2 chiffres (ex: '41', '52') */
  categorie: string;
  /** Sens normal du compte : 'D' (Débiteur) | 'C' (Créditeur) | 'M' (Mixte) */
  sens: 'D' | 'C' | 'M';
  /** Nature SYSCOHADA */
  nature: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT' | 'SPECIAL';
  /** D'où vient l'info de libellé */
  source: AccountSource;
  /** Présence d'un compte auxiliaire (tiers) dans le GL */
  auxiliaire: boolean;
  /** Nombre de lignes GL qui référencent ce compte */
  occurrences: number;
  /** Somme des débits sur ce compte (pour info) */
  totalDebit: number;
  /** Somme des crédits sur ce compte (pour info) */
  totalCredit: number;
}

export interface GenerationResult {
  accounts: GeneratedAccount[];
  /** Nombre de comptes extraits du GL */
  extracted: number;
  /** Nombre de comptes enrichis via le référentiel SYSCOHADA */
  enrichedFromSyscohada: number;
  /** Nombre de comptes enrichis depuis le GL (colonne Libellé compte) */
  enrichedFromGL: number;
  /** Nombre de comptes sans libellé trouvé (juste inférés) */
  inferred: number;
}

// ── Helpers ─────────────────────────────────────────────

/** Index des sous-comptes SYSCOHADA par code 3 chiffres */
const SOUS_COMPTE_INDEX: Map<string, typeof SOUS_COMPTES_SYSCOHADA[number]> = (() => {
  const m = new Map<string, typeof SOUS_COMPTES_SYSCOHADA[number]>();
  for (const sc of SOUS_COMPTES_SYSCOHADA) m.set(sc.code, sc);
  return m;
})();

/** Index des catégories SYSCOHADA par code 2 chiffres */
const CATEGORIE_INDEX: Map<string, typeof CATEGORIES_SYSCOHADA[number]> = (() => {
  const m = new Map<string, typeof CATEGORIES_SYSCOHADA[number]>();
  for (const cat of CATEGORIES_SYSCOHADA) m.set(cat.code, cat);
  return m;
})();

/** Index des classes SYSCOHADA par code 1 chiffre */
const CLASSE_INDEX: Map<number, typeof CLASSES_SYSCOHADA[number]> = (() => {
  const m = new Map<number, typeof CLASSES_SYSCOHADA[number]>();
  for (const c of CLASSES_SYSCOHADA) m.set(c.code, c);
  return m;
})();

function toSensCode(sens: 'DEBITEUR' | 'CREDITEUR' | undefined, variable = false): 'D' | 'C' | 'M' {
  if (variable) return 'M';
  if (sens === 'DEBITEUR') return 'D';
  if (sens === 'CREDITEUR') return 'C';
  return 'M';
}

/** Normalise un numéro de compte : trim, supprime espaces, convertit en chaîne */
function normalizeAccountNumber(val: unknown): string {
  if (val == null) return '';
  return String(val).trim().replace(/\s+/g, '');
}

/** Trouve la colonne "compte" dans un objet ligne GL (insensible casse/accents) */
function findField(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  for (const cand of candidates) {
    const target = normalize(cand);
    for (const k of keys) {
      if (normalize(k) === target) return row[k];
    }
  }
  return undefined;
}

// ── Enrichissement d'un compte ──────────────────────────

/**
 * Enrichit un compte à partir du référentiel SYSCOHADA.
 * Cherche d'abord le sous-compte 3 chiffres, puis la catégorie 2 chiffres.
 */
function enrichAccount(
  numero: string,
  libelleFromGL: string | undefined
): Omit<GeneratedAccount, 'numero' | 'libelle' | 'source' | 'auxiliaire' | 'occurrences' | 'totalDebit' | 'totalCredit'> & {
  libelle: string;
  source: AccountSource;
} {
  const code3 = numero.substring(0, 3);
  const code2 = numero.substring(0, 2);
  const classeCode = parseInt(numero.charAt(0), 10);

  const classe = CLASSE_INDEX.get(classeCode);
  const categorie = CATEGORIE_INDEX.get(code2);
  const sousCompte = SOUS_COMPTE_INDEX.get(code3);

  // Priorité libellé : sous-compte SYSCOHADA > catégorie SYSCOHADA > GL > inféré
  let libelle = '';
  let source: AccountSource = 'inferred';
  if (sousCompte) {
    libelle = sousCompte.libelle;
    source = 'syscohada';
    // Pour les sous-comptes au-delà de 3 chiffres (ex: 411001), ajouter un suffixe si fallback GL
    if (numero.length > 3 && libelleFromGL && libelleFromGL.trim() && libelleFromGL !== libelle) {
      libelle = libelleFromGL.trim();
      source = 'gl';
    }
  } else if (libelleFromGL && libelleFromGL.trim()) {
    libelle = libelleFromGL.trim();
    source = 'gl';
  } else if (categorie) {
    libelle = `${categorie.libelle} (${numero})`;
    source = 'inferred';
  } else if (classe) {
    libelle = `${classe.libelle} — compte ${numero}`;
    source = 'inferred';
  } else {
    libelle = `Compte ${numero}`;
    source = 'inferred';
  }

  const sens = toSensCode(
    categorie?.sensNormal ?? classe?.sensNormal,
    categorie?.sensVariable
  );
  const nature = (categorie?.nature ?? classe?.nature ?? 'SPECIAL') as GeneratedAccount['nature'];

  return {
    libelle,
    source,
    classe: classeCode || 0,
    categorie: code2,
    sens,
    nature,
  };
}

// ── Fonction principale ─────────────────────────────────

/**
 * Génère un Plan Comptable à partir des lignes d'un Grand Livre.
 *
 * @param glRows Lignes du GL déjà parsées (objets clé/valeur)
 * @returns Plan comptable généré + statistiques d'enrichissement
 */
export function generatePlanComptableFromGL(
  glRows: Record<string, unknown>[]
): GenerationResult {
  const accountsMap = new Map<string, GeneratedAccount>();

  for (const row of glRows) {
    const numero = normalizeAccountNumber(
      findField(row, ['compte', 'comptenum', 'numero', 'numerocompte', 'no', 'account'])
    );
    if (!numero) continue;

    const libelleFromGL = String(
      findField(row, ['libellecompte', 'libellecompte', 'comptelib', 'intitulecompte', 'accountname']) ?? ''
    ).trim() || undefined;

    const tiers = normalizeAccountNumber(
      findField(row, ['tiers', 'codetiers', 'compaux', 'compauxnum', 'thirdparty'])
    );
    const debit = Number(findField(row, ['debit']) ?? 0) || 0;
    const credit = Number(findField(row, ['credit']) ?? 0) || 0;

    if (!accountsMap.has(numero)) {
      const enriched = enrichAccount(numero, libelleFromGL);
      accountsMap.set(numero, {
        numero,
        libelle: enriched.libelle,
        classe: enriched.classe,
        categorie: enriched.categorie,
        sens: enriched.sens,
        nature: enriched.nature,
        source: enriched.source,
        auxiliaire: !!tiers,
        occurrences: 1,
        totalDebit: debit,
        totalCredit: credit,
      });
    } else {
      const existing = accountsMap.get(numero)!;
      existing.occurrences += 1;
      existing.totalDebit += debit;
      existing.totalCredit += credit;
      if (tiers) existing.auxiliaire = true;
      // Si on n'avait pas de libellé spécifique et qu'une ligne en apporte un → upgrade
      if (existing.source === 'inferred' && libelleFromGL) {
        existing.libelle = libelleFromGL;
        existing.source = 'gl';
      }
    }
  }

  const accounts = Array.from(accountsMap.values()).sort((a, b) =>
    a.numero.localeCompare(b.numero, 'fr', { numeric: true })
  );

  const enrichedFromSyscohada = accounts.filter(a => a.source === 'syscohada').length;
  const enrichedFromGL = accounts.filter(a => a.source === 'gl').length;
  const inferred = accounts.filter(a => a.source === 'inferred').length;

  return {
    accounts,
    extracted: accounts.length,
    enrichedFromSyscohada,
    enrichedFromGL,
    inferred,
  };
}

/**
 * Convertit le résultat en format XLSX-friendly pour export/téléchargement.
 */
export function toXlsxRows(result: GenerationResult): Record<string, unknown>[] {
  return result.accounts.map(a => ({
    Numéro: a.numero,
    Libellé: a.libelle,
    Classe: a.classe,
    Catégorie: a.categorie,
    Type: a.sens,
    Nature: a.nature,
    Auxiliaire: a.auxiliaire ? 'OUI' : 'NON',
    Occurrences: a.occurrences,
    'Total Débit': a.totalDebit,
    'Total Crédit': a.totalCredit,
    Source: a.source === 'syscohada' ? 'SYSCOHADA' : a.source === 'gl' ? 'Grand Livre' : 'Inféré',
  }));
}
