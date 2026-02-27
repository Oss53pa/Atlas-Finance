/**
 * Notes Annexes SYSCOHADA revise — 35 notes.
 * Alimentation automatique depuis les donnees comptables.
 */
import type { DataAdapter } from '@atlas/data';
import { Money, money } from '../../utils/money';
import type { DBJournalEntry, DBAccount, DBAsset } from '../../lib/db';
import { calculateTAFIRE } from '../financial/tafireService';

// ============================================================================
// TYPES
// ============================================================================

export interface NoteAnnexe {
  numero: number;
  titre: string;
  contenu: string;
  tableaux: NoteTableau[];
  calculsAuto: boolean;
  statut: 'generee' | 'manuelle' | 'vide';
}

export interface NoteTableau {
  titre: string;
  colonnes: string[];
  lignes: Array<Record<string, string | number>>;
}

export interface NotesAnnexesConfig {
  exerciceId: string;
  startDate: string;
  endDate: string;
  societe: string;
  devise: string;
  exercicePrecedentStartDate?: string;
  exercicePrecedentEndDate?: string;
}

export interface NotesAnnexesResult {
  success: boolean;
  notes?: NoteAnnexe[];
  error?: string;
}

// ============================================================================
// 35 NOTES SYSCOHADA — DEFINITIONS
// ============================================================================

const NOTES_DEFINITIONS: Array<{ numero: number; titre: string; auto: boolean }> = [
  { numero: 1, titre: 'Referentiel comptable et methodes d\'evaluation', auto: false },
  { numero: 2, titre: 'Immobilisations incorporelles', auto: true },
  { numero: 3, titre: 'Immobilisations corporelles', auto: true },
  { numero: 4, titre: 'Immobilisations financieres', auto: true },
  { numero: 5, titre: 'Creances et emplois assimiles', auto: true },
  { numero: 6, titre: 'Stocks et en-cours', auto: true },
  { numero: 7, titre: 'Tresorerie-actif et assimiles', auto: true },
  { numero: 8, titre: 'Ecart de conversion - Actif', auto: false },
  { numero: 9, titre: 'Capitaux propres et ressources assimilees', auto: true },
  { numero: 10, titre: 'Dettes financieres et ressources assimilees', auto: true },
  { numero: 11, titre: 'Chiffre d\'affaires et autres produits', auto: true },
  { numero: 12, titre: 'Achats et variations de stocks', auto: true },
  { numero: 13, titre: 'Charges de personnel', auto: true },
  { numero: 14, titre: 'Autres charges et charges financieres', auto: true },
  { numero: 15, titre: 'Dotations aux amortissements et provisions', auto: true },
  { numero: 16, titre: 'Reprises de provisions', auto: true },
  { numero: 17, titre: 'Impots sur les resultats', auto: true },
  { numero: 18, titre: 'Effectif moyen du personnel', auto: false },
  { numero: 19, titre: 'Remunerations des dirigeants', auto: false },
  { numero: 20, titre: 'Parties liees', auto: false },
  { numero: 21, titre: 'Operations en devises', auto: false },
  { numero: 22, titre: 'Eventualites et engagements hors bilan donnes', auto: false },
  { numero: 23, titre: 'Eventualites et engagements hors bilan recus', auto: false },
  { numero: 24, titre: 'Operations avec les entreprises liees', auto: false },
  { numero: 25, titre: 'Avantages au personnel', auto: false },
  { numero: 26, titre: 'Contrats de location', auto: false },
  { numero: 27, titre: 'Tableau des flux de tresorerie', auto: true },
  { numero: 28, titre: 'Informations sectorielles', auto: false },
  { numero: 29, titre: 'Instruments financiers', auto: false },
  { numero: 30, titre: 'Changements de methodes comptables', auto: false },
  { numero: 31, titre: 'Evenements posterieurs a la cloture', auto: false },
  { numero: 32, titre: 'Informations complementaires sur le bilan', auto: true },
  { numero: 33, titre: 'Informations complementaires sur le compte de resultat', auto: true },
  { numero: 34, titre: 'Autres informations significatives', auto: false },
  { numero: 35, titre: 'Date d\'arrete et approbation des comptes', auto: false },
];

// ============================================================================
// HELPERS
// ============================================================================

async function getEntriesForPeriod(adapter: DataAdapter, start: string, end: string): Promise<DBJournalEntry[]> {
  const allEntries = await adapter.getAll('journalEntries');
  return allEntries.filter(
    (e: any) => e.date >= start && e.date <= end &&
      (e.status === 'validated' || e.status === 'posted')
  );
}

function sumByAccountPrefix(entries: DBJournalEntry[], prefix: string, side: 'debit' | 'credit'): number {
  let total = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountCode.startsWith(prefix)) {
        total += side === 'debit' ? line.debit : line.credit;
      }
    }
  }
  return money(total).round(2).toNumber();
}

function netByAccountPrefix(entries: DBJournalEntry[], prefix: string): number {
  let debit = 0;
  let credit = 0;
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountCode.startsWith(prefix)) {
        debit += line.debit;
        credit += line.credit;
      }
    }
  }
  return money(debit).subtract(money(credit)).round(2).toNumber();
}

// ============================================================================
// NOTE GENERATORS
// ============================================================================

async function generateNote2(entries: DBJournalEntry[]): Promise<NoteAnnexe> {
  // Immobilisations incorporelles (comptes 21x)
  const valeurBrute = netByAccountPrefix(entries, '21');
  const amortissements = netByAccountPrefix(entries, '281');
  return {
    numero: 2,
    titre: 'Immobilisations incorporelles',
    contenu: 'Mouvements des immobilisations incorporelles sur l\'exercice.',
    tableaux: [{
      titre: 'Immobilisations incorporelles',
      colonnes: ['Rubrique', 'Valeur brute debut', 'Augmentations', 'Diminutions', 'Valeur brute fin', 'Amortissements cumules', 'VNC'],
      lignes: [
        { Rubrique: 'Frais d\'etablissement', 'Valeur brute debut': 0, Augmentations: sumByAccountPrefix(entries, '211', 'debit'), Diminutions: sumByAccountPrefix(entries, '211', 'credit'), 'Valeur brute fin': netByAccountPrefix(entries, '211'), 'Amortissements cumules': 0, VNC: 0 },
        { Rubrique: 'Brevets, licences', 'Valeur brute debut': 0, Augmentations: sumByAccountPrefix(entries, '212', 'debit'), Diminutions: sumByAccountPrefix(entries, '212', 'credit'), 'Valeur brute fin': netByAccountPrefix(entries, '212'), 'Amortissements cumules': 0, VNC: 0 },
        { Rubrique: 'Fonds commercial', 'Valeur brute debut': 0, Augmentations: sumByAccountPrefix(entries, '215', 'debit'), Diminutions: sumByAccountPrefix(entries, '215', 'credit'), 'Valeur brute fin': netByAccountPrefix(entries, '215'), 'Amortissements cumules': 0, VNC: 0 },
      ],
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

async function generateNote3(entries: DBJournalEntry[], assets: DBAsset[]): Promise<NoteAnnexe> {
  // Immobilisations corporelles (comptes 22x-24x)
  const categories = ['Terrains', 'Constructions', 'Materiel et outillage', 'Materiel de transport', 'Materiel informatique'];
  const prefixes = ['22', '23', '241', '245', '244'];
  const lignes = categories.map((cat, i) => ({
    Rubrique: cat,
    'Nombre': assets.filter(a => a.accountCode.startsWith(prefixes[i])).length,
    'Valeur brute': assets.filter(a => a.accountCode.startsWith(prefixes[i])).reduce((s, a) => s + a.acquisitionValue, 0),
    'Acquisitions exercice': sumByAccountPrefix(entries, prefixes[i], 'debit'),
    'Cessions exercice': sumByAccountPrefix(entries, prefixes[i], 'credit'),
  }));

  return {
    numero: 3,
    titre: 'Immobilisations corporelles',
    contenu: 'Mouvements des immobilisations corporelles et tableau des amortissements.',
    tableaux: [{
      titre: 'Tableau des immobilisations corporelles',
      colonnes: ['Rubrique', 'Nombre', 'Valeur brute', 'Acquisitions exercice', 'Cessions exercice'],
      lignes,
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

async function generateNote5(entries: DBJournalEntry[]): Promise<NoteAnnexe> {
  // Creances (comptes 41x)
  return {
    numero: 5,
    titre: 'Creances et emplois assimiles',
    contenu: 'Detail des creances clients et autres creances.',
    tableaux: [{
      titre: 'Creances',
      colonnes: ['Nature', 'Montant brut', 'Provisions', 'Montant net'],
      lignes: [
        { Nature: 'Clients', 'Montant brut': netByAccountPrefix(entries, '411'), Provisions: netByAccountPrefix(entries, '491'), 'Montant net': netByAccountPrefix(entries, '411') - netByAccountPrefix(entries, '491') },
        { Nature: 'Autres creances', 'Montant brut': netByAccountPrefix(entries, '41'), Provisions: 0, 'Montant net': netByAccountPrefix(entries, '41') },
      ],
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

async function generateNote11(entries: DBJournalEntry[], previousEntries: DBJournalEntry[] = []): Promise<NoteAnnexe> {
  // P1-5: Chiffre d'affaires avec comparatif N-1
  return {
    numero: 11,
    titre: 'Chiffre d\'affaires et autres produits',
    contenu: 'Decomposition du chiffre d\'affaires par nature.',
    tableaux: [{
      titre: 'Chiffre d\'affaires',
      colonnes: ['Nature', 'Montant N', 'Montant N-1'],
      lignes: [
        { Nature: 'Ventes de marchandises', 'Montant N': sumByAccountPrefix(entries, '701', 'credit'), 'Montant N-1': sumByAccountPrefix(previousEntries, '701', 'credit') },
        { Nature: 'Ventes de produits finis', 'Montant N': sumByAccountPrefix(entries, '702', 'credit'), 'Montant N-1': sumByAccountPrefix(previousEntries, '702', 'credit') },
        { Nature: 'Prestations de services', 'Montant N': sumByAccountPrefix(entries, '706', 'credit'), 'Montant N-1': sumByAccountPrefix(previousEntries, '706', 'credit') },
        { Nature: 'Autres produits', 'Montant N': sumByAccountPrefix(entries, '71', 'credit') + sumByAccountPrefix(entries, '75', 'credit'), 'Montant N-1': sumByAccountPrefix(previousEntries, '71', 'credit') + sumByAccountPrefix(previousEntries, '75', 'credit') },
      ],
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

async function generateNote13(entries: DBJournalEntry[]): Promise<NoteAnnexe> {
  return {
    numero: 13,
    titre: 'Charges de personnel',
    contenu: 'Detail des charges de personnel.',
    tableaux: [{
      titre: 'Charges de personnel',
      colonnes: ['Nature', 'Montant'],
      lignes: [
        { Nature: 'Remunerations du personnel', Montant: sumByAccountPrefix(entries, '661', 'debit') },
        { Nature: 'Charges sociales', Montant: sumByAccountPrefix(entries, '664', 'debit') },
        { Nature: 'Autres charges de personnel', Montant: sumByAccountPrefix(entries, '668', 'debit') },
      ],
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

async function generateNote15(entries: DBJournalEntry[]): Promise<NoteAnnexe> {
  return {
    numero: 15,
    titre: 'Dotations aux amortissements et provisions',
    contenu: 'Detail des dotations aux amortissements, depreciations et provisions.',
    tableaux: [{
      titre: 'Dotations',
      colonnes: ['Nature', 'Montant'],
      lignes: [
        { Nature: 'Amortissements immobilisations', Montant: sumByAccountPrefix(entries, '681', 'debit') },
        { Nature: 'Provisions pour risques', Montant: sumByAccountPrefix(entries, '691', 'debit') },
        { Nature: 'Depreciations actif circulant', Montant: sumByAccountPrefix(entries, '659', 'debit') },
      ],
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

async function generateNote17(entries: DBJournalEntry[]): Promise<NoteAnnexe> {
  return {
    numero: 17,
    titre: 'Impots sur les resultats',
    contenu: 'Charge d\'impot sur les benefices de l\'exercice.',
    tableaux: [{
      titre: 'Impots',
      colonnes: ['Nature', 'Montant'],
      lignes: [
        { Nature: 'Impot sur les benefices', Montant: sumByAccountPrefix(entries, '891', 'debit') },
        { Nature: 'Impot minimum forfaitaire', Montant: sumByAccountPrefix(entries, '892', 'debit') },
      ],
    }],
    calculsAuto: true,
    statut: 'generee',
  };
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

/**
 * Generate all 35 notes annexes for a fiscal year.
 */
export async function genererNotesAnnexes(adapter: DataAdapter, config: NotesAnnexesConfig): Promise<NotesAnnexesResult> {
  const entries = await getEntriesForPeriod(adapter, config.startDate, config.endDate);
  const assets = await adapter.getAll('assets');

  // P1-5: Charger les écritures N-1 pour comparaison
  let previousEntries: DBJournalEntry[] = [];
  if (config.exercicePrecedentStartDate && config.exercicePrecedentEndDate) {
    previousEntries = await getEntriesForPeriod(adapter, config.exercicePrecedentStartDate, config.exercicePrecedentEndDate);
  }

  const notes: NoteAnnexe[] = [];

  for (const def of NOTES_DEFINITIONS) {
    if (!def.auto) {
      // Manual notes — provide empty template
      notes.push({
        numero: def.numero,
        titre: def.titre,
        contenu: '',
        tableaux: [],
        calculsAuto: false,
        statut: 'vide',
      });
      continue;
    }

    // Auto-generated notes
    try {
      let note: NoteAnnexe;
      switch (def.numero) {
        case 2: note = await generateNote2(entries); break;
        case 3: note = await generateNote3(entries, assets); break;
        case 4:
          note = { numero: 4, titre: def.titre, contenu: 'Immobilisations financieres.', tableaux: [{ titre: 'Titres de participation', colonnes: ['Designation', 'Valeur'], lignes: [{ Designation: 'Titres de participation', Valeur: netByAccountPrefix(entries, '26') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 5: note = await generateNote5(entries); break;
        case 6:
          note = { numero: 6, titre: def.titre, contenu: 'Etat des stocks.', tableaux: [{ titre: 'Stocks', colonnes: ['Nature', 'Montant'], lignes: [{ Nature: 'Marchandises', Montant: netByAccountPrefix(entries, '31') }, { Nature: 'Matieres premieres', Montant: netByAccountPrefix(entries, '32') }, { Nature: 'Produits finis', Montant: netByAccountPrefix(entries, '35') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 7:
          note = { numero: 7, titre: def.titre, contenu: 'Tresorerie actif.', tableaux: [{ titre: 'Tresorerie', colonnes: ['Nature', 'Montant'], lignes: [{ Nature: 'Banque', Montant: netByAccountPrefix(entries, '52') }, { Nature: 'Caisse', Montant: netByAccountPrefix(entries, '57') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 9:
          note = { numero: 9, titre: def.titre, contenu: 'Capitaux propres.', tableaux: [{ titre: 'Capitaux propres', colonnes: ['Rubrique', 'Montant'], lignes: [{ Rubrique: 'Capital social', Montant: netByAccountPrefix(entries, '10') }, { Rubrique: 'Reserves', Montant: netByAccountPrefix(entries, '11') }, { Rubrique: 'Report a nouveau', Montant: netByAccountPrefix(entries, '12') }, { Rubrique: 'Resultat exercice', Montant: netByAccountPrefix(entries, '13') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 10:
          note = { numero: 10, titre: def.titre, contenu: 'Dettes financieres.', tableaux: [{ titre: 'Dettes', colonnes: ['Nature', 'Montant'], lignes: [{ Nature: 'Emprunts', Montant: netByAccountPrefix(entries, '16') }, { Nature: 'Dettes fournisseurs', Montant: netByAccountPrefix(entries, '40') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 11: note = await generateNote11(entries, previousEntries); break;
        case 12:
          note = { numero: 12, titre: def.titre, contenu: 'Achats de l\'exercice.', tableaux: [{ titre: 'Achats', colonnes: ['Nature', 'Montant'], lignes: [{ Nature: 'Achats de marchandises', Montant: sumByAccountPrefix(entries, '601', 'debit') }, { Nature: 'Achats de matieres', Montant: sumByAccountPrefix(entries, '602', 'debit') }, { Nature: 'Variation de stocks', Montant: netByAccountPrefix(entries, '603') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 13: note = await generateNote13(entries); break;
        case 14:
          note = { numero: 14, titre: def.titre, contenu: 'Autres charges.', tableaux: [{ titre: 'Charges', colonnes: ['Nature', 'Montant'], lignes: [{ Nature: 'Services exterieurs', Montant: sumByAccountPrefix(entries, '62', 'debit') }, { Nature: 'Charges financieres', Montant: sumByAccountPrefix(entries, '67', 'debit') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 15: note = await generateNote15(entries); break;
        case 16:
          note = { numero: 16, titre: def.titre, contenu: 'Reprises de provisions.', tableaux: [{ titre: 'Reprises', colonnes: ['Nature', 'Montant'], lignes: [{ Nature: 'Reprises provisions exploitation', Montant: sumByAccountPrefix(entries, '791', 'credit') }, { Nature: 'Reprises provisions financieres', Montant: sumByAccountPrefix(entries, '797', 'credit') }] }], calculsAuto: true, statut: 'generee' };
          break;
        case 17: note = await generateNote17(entries); break;
        case 27: {
          // P1-5: Connecter Note 27 au service TAFIRE
          const fiscalYear = config.startDate.substring(0, 4);
          const tafire = await calculateTAFIRE(adapter, fiscalYear);
          note = { numero: 27, titre: def.titre, contenu: 'Tableau des flux de tresorerie (TAFIRE).', tableaux: [{ titre: 'TAFIRE', colonnes: ['Rubrique', 'Montant'], lignes: [
            { Rubrique: 'CAF', Montant: tafire.selfFinancingCapacity },
            { Rubrique: 'Variation BFR', Montant: tafire.workingCapitalVariation },
            { Rubrique: 'Flux exploitation', Montant: tafire.operatingCashSurplus },
            { Rubrique: 'Flux investissement', Montant: tafire.investmentCashFlow },
            { Rubrique: 'Flux financement', Montant: tafire.financingCashFlow },
            { Rubrique: 'Variation tresorerie', Montant: tafire.cashVariation },
            { Rubrique: 'Tresorerie ouverture', Montant: tafire.openingCashBalance },
            { Rubrique: 'Tresorerie cloture', Montant: tafire.closingCashBalance },
          ] }], calculsAuto: true, statut: 'generee' };
          break;
        }
        case 32:
          note = { numero: 32, titre: def.titre, contenu: 'Informations complementaires bilan.', tableaux: [], calculsAuto: true, statut: 'generee' };
          break;
        case 33:
          note = { numero: 33, titre: def.titre, contenu: 'Informations complementaires compte de resultat.', tableaux: [], calculsAuto: true, statut: 'generee' };
          break;
        default:
          note = { numero: def.numero, titre: def.titre, contenu: '', tableaux: [], calculsAuto: true, statut: 'vide' };
      }
      notes.push(note);
    } catch {
      notes.push({
        numero: def.numero,
        titre: def.titre,
        contenu: 'Erreur lors de la generation automatique.',
        tableaux: [],
        calculsAuto: true,
        statut: 'vide',
      });
    }
  }

  return { success: true, notes };
}

/**
 * Get a single note by number.
 */
export async function getNoteAnnexe(
  adapter: DataAdapter,
  numero: number,
  config: NotesAnnexesConfig
): Promise<NoteAnnexe | null> {
  const result = await genererNotesAnnexes(adapter, config);
  if (!result.success || !result.notes) return null;
  return result.notes.find(n => n.numero === numero) || null;
}

/**
 * Get the list of note definitions (without data).
 */
export function getNotesDefinitions(): Array<{ numero: number; titre: string; auto: boolean }> {
  return [...NOTES_DEFINITIONS];
}
