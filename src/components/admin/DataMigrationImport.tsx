/**
 * DataMigrationImport — Assistant de migration comptable en 7 etapes
 * Supports: Sage, Ciel/Saari, EBP, Cegid, Odoo, FEC, Excel, Autre
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, AlertCircle,
  ChevronRight, ArrowLeft, Download, Trash2, Settings, Play,
  FileText, Users, Package, Calculator, BookOpen, BarChart3, Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { logAudit } from '../../lib/db';
import { money } from '../../utils/money';
import {
  getTemplate,
  downloadTemplate,
  type TemplateKey,
  generatePlanComptableFromGL,
  toXlsxRows,
  type GenerationResult,
  downloadModeTemplate,
  splitModeWorkbook,
  getModeTemplate,
  type MigrationModeId,
} from '../../services/import';
import { safeAddEntry } from '../../services/entryGuard';
import { hashEntry } from '../../utils/integrity';
import { formatNumber } from '../../utils/formatters';

// ─── Types ───────────────────────────────────────────────

type MigrationMode = 1 | 2 | 3;
type StepId = 'mode' | 'upload' | 'analysis' | 'mapping' | 'journaux' | 'parameters' | 'simulation' | 'importing';

/** Types de journaux standards SYSCOHADA (+ IPE pour les paiements électroniques). */
const JOURNAL_TYPES: { code: string; labelKey: string }[] = [
  { code: 'VE', labelKey: 'dataMigration.jtVentes' },
  { code: 'AC', labelKey: 'dataMigration.jtAchats' },
  { code: 'BQ', labelKey: 'dataMigration.jtBanque' },
  { code: 'CA', labelKey: 'dataMigration.jtCaisse' },
  { code: 'IPE', labelKey: 'dataMigration.jtIpe' },
  { code: 'OD', labelKey: 'dataMigration.jtOd' },
  { code: 'AN', labelKey: 'dataMigration.jtAn' },
  { code: 'SAL', labelKey: 'dataMigration.jtSal' },
];

interface UploadedFile {
  file: File;
  data: any[];
  columns: string[];
}

interface AnalysisItem {
  code: string;
  message: string;
  details?: string;
}

interface AnalysisReport {
  accounts: number;
  tiers: number;
  entries: number;
  lines: number;
  assets: number;
  warnings: AnalysisItem[];
  errors: AnalysisItem[];
}

interface MappedColumn {
  target: string;
  targetLabel: string;
  source: string;
  required: boolean;
}

interface AccountMapping {
  sourceAccount: string;
  sourceLabel: string;
  suggestedAccount: string;
  status: 'ok' | 'warning' | 'missing';
}

interface MigrationParams {
  dateBascule: string;
  exerciceStart: string;
  exerciceEnd: string;
  entryStatus: 'validated' | 'draft';
  lettrage: boolean;
  existingDataAction: 'merge' | 'replace' | 'cancel';
}

interface SimulationResult {
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
  totalActif: number;
  totalPassif: number;
  assetVNC: number;
  estimatedTime: number;
  counts: Record<string, number>;
}

interface ImportReport {
  accounts: number;
  journals: number;
  tiers: number;
  entries: number;
  lines: number;
  assets: number;
  lettrages: number;
  balanceOk: boolean;
  bilanOk: boolean;
  bilanEcart?: { actif: number; passif: number; diff: number };
  /** Mode 1 : l'écart Actif/Passif = résultat de la période (normal, pas un déséquilibre). */
  bilanIsResult?: boolean;
  tiersOk: boolean;
  vncOk: boolean;
  warnings: string[];
  dbCounts?: { accounts: number; entries: number; lines: number; tiers: number; assets: number };
  migrationBatchId?: string;
}

interface Props {
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────

const normalizeKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const findCol = (row: any, candidates: string[]): number => {
  if (!row) return 0;
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const target = normalizeKey(cand);
    for (const k of keys) {
      if (normalizeKey(k) === target) return parseNumber(row[k]);
    }
  }
  return 0;
};

const STEPS: { id: StepId; labelKey: string }[] = [
  { id: 'mode', labelKey: 'dataMigration.stepMode' },
  { id: 'upload', labelKey: 'dataMigration.stepFiles' },
  { id: 'analysis', labelKey: 'dataMigration.stepAnalysis' },
  { id: 'mapping', labelKey: 'dataMigration.stepMapping' },
  { id: 'journaux', labelKey: 'dataMigration.stepJournals' },
  { id: 'parameters', labelKey: 'dataMigration.stepParameters' },
  { id: 'simulation', labelKey: 'dataMigration.stepSimulation' },
  { id: 'importing', labelKey: 'dataMigration.stepImport' },
];

const SOURCE_SYSTEMS = ['Sage', 'Ciel/Saari', 'EBP', 'Cegid', 'Odoo', 'FEC', 'Excel', 'Autre'];

/**
 * Configuration des fichiers d'import par mode de migration.
 *
 * Structure : chaque fichier déclare :
 *   - `requiredModes` : modes où il est OBLIGATOIRE
 *   - `optionalModes` : modes où il est RECOMMANDÉ (enrichissement)
 *   - `templateKey`   : clé du template Atlas correspondant (pour téléchargement)
 *
 * Principe (aligné sur la question "un GL seul suffit-il ?") :
 *   • Mode 1 (en cours d'exercice)  : Grand Livre/FEC obligatoire → tout le reste optionnel
 *   • Mode 2 (début d'exercice)     : Balance/AN obligatoire → tout le reste optionnel
 *   • Mode 3 (historique complet)   : Grand Livre + Tiers + Immos obligatoires
 *
 * Le Plan Comptable n'est plus demandé : il est embarqué nativement dans
 * Atlas FnA (src/data/syscohada-referentiel.ts — OHADA révisé 2017).
 */
type FileConfig = {
  /** Clé i18n du libellé affiché */
  labelKey: string;
  /** Clé i18n de la description affichée */
  descKey: string;
  icon: React.ReactNode;
  accept: string;
  /** Modes où ce fichier est OBLIGATOIRE */
  requiredModes: MigrationMode[];
  /** Modes où ce fichier est RECOMMANDÉ (optionnel mais enrichit la migration) */
  optionalModes: MigrationMode[];
  /** Clé du template Atlas correspondant (pour téléchargement du modèle) */
  templateKey?: string;
};

const FILE_CONFIGS: Record<string, FileConfig> = {
  grandLivre: {
    labelKey: 'dataMigration.fileGrandLivre',
    descKey: 'dataMigration.fileGrandLivreDesc',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls,.txt',
    requiredModes: [1, 3],
    optionalModes: [],
    templateKey: 'grand_livre',
  },
  reportAN: {
    labelKey: 'dataMigration.fileReportAN',
    descKey: 'dataMigration.fileReportANDesc',
    icon: <Calculator className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [2],
    optionalModes: [1],
    templateKey: 'reports_a_nouveau',
  },
  tiers: {
    labelKey: 'dataMigration.fileTiers',
    descKey: 'dataMigration.fileTiersDesc',
    icon: <Users className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [3],
    optionalModes: [1, 2],
    templateKey: 'tiers',
  },
  immobilisations: {
    labelKey: 'dataMigration.fileImmo',
    descKey: 'dataMigration.fileImmoDesc',
    icon: <Package className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [3],
    optionalModes: [1, 2],
    templateKey: 'immobilisations',
  },
  planComptable: {
    labelKey: 'dataMigration.filePlanComptable',
    descKey: 'dataMigration.filePlanComptableDesc',
    icon: <BookOpen className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [],
    optionalModes: [1, 2, 3],
    templateKey: 'plan_comptable',
  },
};

// NB : `label` reste en français — il sert de CANDIDAT à l'auto-détection des
// colonnes source (autoDetectColumns) et n'est jamais affiché tel quel.
// L'affichage passe par `labelKey` (i18n).
const TARGET_FIELDS: Record<string, { field: string; label: string; labelKey: string; required: boolean }[]> = {
  planComptable: [
    { field: 'numero', label: 'Numero de compte', labelKey: 'dataMigration.tfNumeroCompte', required: true },
    { field: 'libelle', label: 'Libelle', labelKey: 'dataMigration.tfLibelle', required: true },
    { field: 'type', label: 'Type (D/C)', labelKey: 'dataMigration.tfTypeDC', required: false },
    { field: 'classe', label: 'Classe', labelKey: 'dataMigration.tfClasse', required: false },
  ],
  tiers: [
    { field: 'code', label: 'Code tiers', labelKey: 'dataMigration.tfCodeTiers', required: true },
    { field: 'nom', label: 'Nom / Raison sociale', labelKey: 'dataMigration.tfNomRaisonSociale', required: true },
    { field: 'type', label: 'Type (client/fournisseur/personnel/autre)', labelKey: 'dataMigration.tfTypeTiers', required: true },
    { field: 'compte', label: 'Numéro de compte SYSCOHADA (optionnel, déduit le type)', labelKey: 'dataMigration.tfCompteSyscohada', required: false },
    { field: 'nif', label: 'NIF / RCCM', labelKey: 'dataMigration.tfNifRccm', required: false },
    { field: 'adresse', label: 'Adresse', labelKey: 'dataMigration.tfAdresse', required: false },
    { field: 'telephone', label: 'Telephone', labelKey: 'dataMigration.tfTelephone', required: false },
  ],
  // Grand Livre : source principale recommandée (écritures + AN incluses)
  // Deux libellés distincts :
  //   - libelleCompte    : intitulé du compte SYSCOHADA (ex: "Clients")
  //   - libelleEcriture  : description de l'écriture / pièce (ex: "Facture SANGA")
  grandLivre: [
    { field: 'date', label: 'Date', labelKey: 'dataMigration.tfDate', required: true },
    { field: 'journal', label: 'Code journal', labelKey: 'dataMigration.tfCodeJournal', required: true },
    { field: 'compte', label: 'Numéro de compte', labelKey: 'dataMigration.tfNumeroCompte', required: true },
    { field: 'libelleCompte', label: 'Libellé du compte', labelKey: 'dataMigration.tfLibelleCompte', required: false },
    { field: 'libelleEcriture', label: 'Libellé écriture / Description', labelKey: 'dataMigration.tfLibelleEcriture', required: true },
    { field: 'debit', label: 'Débit', labelKey: 'dataMigration.tfDebit', required: true },
    { field: 'credit', label: 'Crédit', labelKey: 'dataMigration.tfCredit', required: true },
    { field: 'tiers', label: 'Code tiers', labelKey: 'dataMigration.tfCodeTiers', required: false },
    { field: 'piece', label: 'Pièce', labelKey: 'dataMigration.tfPiece', required: false },
    { field: 'numeroEcriture', label: 'N° écriture / saisie', labelKey: 'dataMigration.tfNumeroEcritureSaisie', required: false },
    { field: 'lettrage', label: 'Lettrage', labelKey: 'dataMigration.tfLettrage', required: false },
    { field: 'echeance', label: 'Échéance', labelKey: 'dataMigration.tfEcheance', required: false },
    { field: 'analytique', label: 'Code analytique', labelKey: 'dataMigration.tfCodeAnalytique', required: false },
  ],
  // Alias conservés pour compatibilité
  ecritures: [
    { field: 'dateEcriture', label: 'Date ecriture', labelKey: 'dataMigration.tfDateEcriture', required: true },
    { field: 'journal', label: 'Code journal', labelKey: 'dataMigration.tfCodeJournal', required: true },
    { field: 'numeroCompte', label: 'Numero de compte', labelKey: 'dataMigration.tfNumeroCompte', required: true },
    { field: 'libelle', label: 'Libelle', labelKey: 'dataMigration.tfLibelle', required: true },
    { field: 'debit', label: 'Montant debit', labelKey: 'dataMigration.tfMontantDebit', required: true },
    { field: 'credit', label: 'Montant credit', labelKey: 'dataMigration.tfMontantCredit', required: true },
    { field: 'numeroPiece', label: 'Numero de piece', labelKey: 'dataMigration.tfNumeroPiece', required: false },
    { field: 'lettrage', label: 'Lettrage', labelKey: 'dataMigration.tfLettrage', required: false },
  ],
  reportAN: [
    { field: 'numeroCompte', label: 'Numero de compte', labelKey: 'dataMigration.tfNumeroCompte', required: true },
    { field: 'libelle', label: 'Libelle', labelKey: 'dataMigration.tfLibelle', required: false },
    { field: 'debit', label: 'Solde debiteur', labelKey: 'dataMigration.tfSoldeDebiteur', required: true },
    { field: 'credit', label: 'Solde crediteur', labelKey: 'dataMigration.tfSoldeCrediteur', required: true },
  ],
  immobilisations: [
    { field: 'code', label: 'Code immobilisation', labelKey: 'dataMigration.tfCodeImmo', required: true },
    { field: 'libelle', label: 'Designation', labelKey: 'dataMigration.tfDesignation', required: true },
    { field: 'compteImmo', label: 'Compte immobilisation', labelKey: 'dataMigration.tfCompteImmo', required: true },
    { field: 'compteAmort', label: 'Compte amortissement', labelKey: 'dataMigration.tfCompteAmort', required: true },
    { field: 'dateAcquisition', label: 'Date acquisition', labelKey: 'dataMigration.tfDateAcquisition', required: true },
    { field: 'valeurOrigine', label: 'Valeur origine (VO)', labelKey: 'dataMigration.tfValeurOrigine', required: true },
    { field: 'amortCumule', label: 'Amort. cumule', labelKey: 'dataMigration.tfAmortCumule', required: false },
    { field: 'vnc', label: 'VNC', labelKey: 'dataMigration.tfVnc', required: false },
    { field: 'duree', label: 'Duree (annees)', labelKey: 'dataMigration.tfDuree', required: true },
  ],
  fec: [
    { field: 'JournalCode', label: 'Code journal', labelKey: 'dataMigration.tfCodeJournal', required: true },
    { field: 'EcritureDate', label: 'Date ecriture', labelKey: 'dataMigration.tfDateEcriture', required: true },
    { field: 'CompteNum', label: 'Numero compte', labelKey: 'dataMigration.tfNumeroCompte', required: true },
    { field: 'CompteLib', label: 'Libelle compte', labelKey: 'dataMigration.tfLibelleCompte', required: false },
    { field: 'EcritureLib', label: 'Libelle ecriture', labelKey: 'dataMigration.tfLibelleEcriture', required: true },
    { field: 'Debit', label: 'Debit', labelKey: 'dataMigration.tfDebit', required: true },
    { field: 'Credit', label: 'Credit', labelKey: 'dataMigration.tfCredit', required: true },
    { field: 'EcritureNum', label: 'Numero ecriture', labelKey: 'dataMigration.tfNumeroEcriture', required: false },
    { field: 'PieceRef', label: 'Reference piece', labelKey: 'dataMigration.tfReferencePiece', required: false },
  ],
};

function parseNumber(val: any): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  // A5 — nettoyer TOUS les espaces, y compris insécables (NBSP, narrow NBSP,
  // figure space) fréquents dans les exports Sage. 0 troncature.
  const s = String(val).replace(/[\s   ]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * UUID DÉTERMINISTE à partir d'une graine texte (B4 — idempotence des lignes).
 * Quatre hachages 32 bits (FNV-1a salé) concaténés → 128 bits formatés en UUID.
 * Le même contenu source produit toujours le même id : un ré-import via
 * `onConflict:'id'` dédoublonne réellement les journal_lines au lieu d'en créer
 * de nouvelles (l'ancien `crypto.randomUUID()` régénérait un id à chaque run).
 */
function deterministicUuid(seed: string): string {
  const fnv = (str: string, salt: number): number => {
    let h = (2166136261 ^ salt) >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  };
  const hex = (n: number) => n.toString(16).padStart(8, '0');
  const all = hex(fnv(seed, 0x9e3779b1)) + hex(fnv(seed, 0x85ebca77)) + hex(fnv(seed, 0xc2b2ae3d)) + hex(fnv(seed, 0x27d4eb2f));
  // Format 8-4-4-4-12 ; version 5 + variant RFC 4122
  return `${all.slice(0, 8)}-${all.slice(8, 12)}-5${all.slice(13, 16)}-8${all.slice(17, 20)}-${all.slice(20, 32)}`;
}

/**
 * Rapproche un code journal SOURCE (nommé librement par l'entreprise : RAN,
 * VENTE, NSIA C, CAISSM, CARTEG…) vers un TYPE de journal standard SYSCOHADA.
 * Deux signaux combinés : le NOM du journal, puis les COMPTES de trésorerie
 * mouvementés (plus fiable). Types : VE, AC, BQ, CA, OD, AN, SAL, IPE.
 *   IPE = Instruments de Paiement Électronique (cartes, comptes 55).
 */
function classifyJournal(sourceCode: string, accountCodes: string[] = []): string {
  const c = String(sourceCode).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  // 1) Par le nom du journal
  if (/anouveau|anouvel|reportanouveau|^ran$|^an$/.test(c)) return 'AN';
  if (/carte|monetique|paiementelectro|^ipe$/.test(c)) return 'IPE';
  if (/vente|^vte$|^ve$|facturecl/.test(c)) return 'VE';
  if (/achat|^ach$|^ac$|facturefou/.test(c)) return 'AC';
  if (/paie|salaire|^sal$|paye/.test(c)) return 'SAL';
  if (/caisse|^caiss|^ca$|espece/.test(c)) return 'CA';
  if (/banque|^bq$|^bank$|nsia|^bni$|bridge|ecobank|^eco$|sgbci|^boa$|bicici|^uba$|orabank|coris|cheque|virement|versement/.test(c)) return 'BQ';
  if (/^od|divers|provision|^prov|operation|cloture|extourne/.test(c)) return 'OD';
  // 2) Par les comptes de trésorerie présents (signal comptable, prioritaire en cas de doute)
  const prefixes = new Set(accountCodes.map(a => String(a || '').replace(/\s/g, '').slice(0, 2)));
  if (prefixes.has('57')) return 'CA';                                   // caisse
  if (prefixes.has('55')) return 'IPE';                                  // monnaie électronique / cartes
  if (prefixes.has('52') || prefixes.has('53') || prefixes.has('56')) return 'BQ'; // banque / ets financiers
  // 3) Repli : classe 1 dominante = ouverture, sinon opérations diverses
  if (accountCodes.some(a => String(a || '').startsWith('1'))) return 'AN';
  return 'OD';
}

function parseDate(val: any): string {
  if (val == null || val === '') return '';
  // 1. Date JS (xlsx peut renvoyer des objets Date)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    return val.toISOString().slice(0, 10);
  }
  // 2. Number = numero serie Excel (jours depuis 1900-01-00, epoch 25569 = 1970-01-01)
  if (typeof val === 'number') {
    if (!isFinite(val)) return '';
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return '';
  }
  const s = String(val).trim();
  if (!s) return '';
  // 3. YYYY-MM-DD direct (ISO)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // 4. DD/MM/YYYY
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  // 5. DD-MM-YYYY
  const frDash = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (frDash) return `${frDash[3]}-${frDash[2]}-${frDash[1]}`;
  // 6. YYYYMMDD compact
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  // 7. Fallback : laisser Date() parser ("Thu Jan 01 2026...", "01/15/2026", etc.)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

/**
 * Auto-détection des colonnes source vers les champs cible.
 * Insensible casse/accents/ponctuation. Si des aliases sont fournis par
 * le template Atlas correspondant, ils priorisent le matching.
 */
function autoDetectColumns(
  sourceColumns: string[],
  targetFields: { field: string; label: string }[],
  aliasesPerField?: Record<string, string[]>
): Record<string, string> {
  const result: Record<string, string> = {};
  const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  for (const tf of targetFields) {
    const candidates = new Set<string>();
    candidates.add(normalize(tf.field));
    candidates.add(normalize(tf.label));
    if (aliasesPerField?.[tf.field]) {
      for (const a of aliasesPerField[tf.field]) candidates.add(normalize(a));
    }

    // Recherche exacte d'abord (priorité)
    let match = sourceColumns.find(sc => candidates.has(normalize(sc)));
    // Sinon recherche par inclusion (fallback)
    if (!match) {
      match = sourceColumns.find(sc => {
        const normSrc = normalize(sc);
        return [...candidates].some(c => normSrc.includes(c) || c.includes(normSrc));
      });
    }
    if (match) result[tf.field] = match;
  }
  return result;
}

/**
 * Extrait une map field → [aliases] à partir d'un template Atlas.
 * Si le fileKey correspond à un template du catalogue, on récupère
 * les aliases de chaque colonne pour enrichir l'auto-détection.
 */
function getAliasMap(fileKey: string): Record<string, string[]> {
  const config = FILE_CONFIGS[fileKey];
  const tpl = config?.templateKey ? getTemplate(config.templateKey as TemplateKey) : undefined;
  if (!tpl || !tpl.sheets[0]) return {};
  const map: Record<string, string[]> = {};
  for (const col of tpl.sheets[0].columns) {
    // Utilise la key du template comme field cible (correspondance approximative)
    const aliases = [col.header, col.key, ...(col.aliases || [])];
    // Map aussi sur quelques champs communs
    map[col.key] = aliases;
    // Mapping traditionnel (compatibilité ancienne structure)
    if (col.key === 'date') map['dateEcriture'] = aliases;
    if (col.key === 'compte') map['numeroCompte'] = aliases;
    // Libellé écriture : alias historique 'libelle' (legacy ecritures), nouveau 'libelleEcriture'
    if (col.key === 'libelleEcriture') {
      map['libelle'] = aliases;
      map['libelleEcriture'] = aliases;
    }
    if (col.key === 'libelleCompte') map['libelleCompte'] = aliases;
    if (col.key === 'piece') map['numeroPiece'] = aliases;
    if (col.key === 'numeroEcriture') map['numeroEcriture'] = aliases;
  }
  return map;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Component ───────────────────────────────────────────

const DataMigrationImport: React.FC<Props> = ({ onBack }) => {
  const { adapter } = useData();
  const { t } = useLanguage();

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepId>('mode');
  /** Vrai pendant l'action asynchrone d'un passage d'étape (analyse, simulation…). */
  const [navBusy, setNavBusy] = useState(false);
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  // Step 1 state
  const [migrationMode, setMigrationMode] = useState<MigrationMode>(2);
  const [sourceSystem, setSourceSystem] = useState('');

  // Step 2 state
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  /** Input caché pour l'upload du classeur unique du mode (flux recommandé). */
  const modeWorkbookInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3 state
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  /** Plan Comptable généré automatiquement à partir du Grand Livre (cf. Cockpit F&A) */
  const [generatedPC, setGeneratedPC] = useState<GenerationResult | null>(null);

  // Step 4 state
  const [mappings, setMappings] = useState<Record<string, MappedColumn[]>>({});
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);
  const [excludedEntries, setExcludedEntries] = useState<string[]>([]);
  /** Rapprochement journaux : code source → type standard, validé par l'utilisateur. */
  const [journalMapping, setJournalMapping] = useState<Record<string, string>>({});
  /** Métadonnées d'affichage des journaux détectés (nb écritures, comptes échantillon). */
  const [detectedJournals, setDetectedJournals] = useState<{ code: string; count: number; sampleAccounts: string[]; proposed: string }[]>([]);

  // Step 5 state
  const [params, setParams] = useState<MigrationParams>({
    dateBascule: '', exerciceStart: '', exerciceEnd: '',
    entryStatus: 'validated', lettrage: true, existingDataAction: 'merge',
  });

  // Step 6 state
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);

  // Step 7 state
  const [importProgress, setImportProgress] = useState(0);
  const [importLabel, setImportLabel] = useState('');
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);

  // ─── File parsing ──────────────────────────────────────

  /**
   * Sélectionne intelligemment la bonne feuille d'un classeur XLSX :
   *   1) Si un template Atlas correspond à `fileKey`, on cherche d'abord la feuille
   *      dont le nom match le sheetName officiel ou ses aliases (ex: "Grand Livre").
   *   2) Sinon, on skippe les feuilles "Instructions" / "Aide" / "Readme"
   *      et on prend la première feuille qui a au moins 2 colonnes de données.
   *   3) En dernier recours, on prend la première feuille.
   */
  const pickBestSheet = useCallback((
    wb: XLSX.WorkBook,
    fileKey: string
  ): { sheetName: string; sheet: XLSX.WorkSheet } => {
    const config = FILE_CONFIGS[fileKey];
    const templateKey = config?.templateKey as TemplateKey | undefined;
    const template = templateKey ? getTemplate(templateKey) : undefined;

    const normalize = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

    const BLACKLIST = new Set(['instructions', 'instruction', 'aide', 'readme', 'notice', 'explication', 'explications', 'help', 'lisezmoi', 'readmefirst']);

    // Helper : extrait la 1ère ligne d'en-tête non vide (cherche sur 10 premières lignes)
    const getHeaders = (sh: XLSX.WorkSheet): string[] => {
      const aoa = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' }) as unknown[][];
      for (let i = 0; i < Math.min(aoa.length, 10); i++) {
        const row = aoa[i] || [];
        const nonEmpty = row.filter(v => v !== '' && v != null);
        if (nonEmpty.length >= 2) {
          return (row as unknown[]).map(v => String(v ?? '').trim());
        }
      }
      return [];
    };

    // Helper : construit l'ensemble des variantes attendues pour les colonnes du template
    const templateColumnVariants = new Set<string>();
    if (template) {
      for (const sheet of template.sheets) {
        for (const col of sheet.columns) {
          templateColumnVariants.add(normalize(col.header));
          templateColumnVariants.add(normalize(col.key));
          for (const a of col.aliases || []) templateColumnVariants.add(normalize(a));
        }
      }
    }

    // Score d'une feuille = nombre de colonnes matching le template + bonus si nom match
    const scoreSheet = (name: string, sh: XLSX.WorkSheet): { score: number; headers: string[] } => {
      if (BLACKLIST.has(normalize(name))) return { score: -100, headers: [] };
      const headers = getHeaders(sh);
      if (headers.length < 2) return { score: -50, headers };

      let colScore = 0;
      if (templateColumnVariants.size > 0) {
        for (const h of headers) {
          if (templateColumnVariants.has(normalize(h))) colScore += 10;
        }
      } else {
        // Pas de template → score basé sur la quantité de colonnes
        colScore = Math.min(headers.length, 10);
      }

      // Bonus si le nom de feuille match le sheetName officiel ou un alias
      let nameBonus = 0;
      if (template) {
        for (const s of template.sheets) {
          if (normalize(name) === normalize(s.sheetName)) nameBonus += 50;
          for (const a of s.sheetAliases || []) {
            if (normalize(name) === normalize(a)) nameBonus += 30;
          }
        }
      }

      return { score: colScore + nameBonus, headers };
    };

    // Parcourir toutes les feuilles et choisir celle avec le meilleur score
    let best: { name: string; score: number } = { name: '', score: -Infinity };
    for (const name of wb.SheetNames) {
      const { score } = scoreSheet(name, wb.Sheets[name]);
      if (score > best.score) {
        best = { name, score };
      }
    }

    if (best.name) {
      return { sheetName: best.name, sheet: wb.Sheets[best.name] };
    }

    // Fallback ultime : première feuille
    const first = wb.SheetNames[0];
    return { sheetName: first, sheet: wb.Sheets[first] };
  }, []);

  const handleFileUpload = useCallback(async (key: string, file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      const { sheetName, sheet } = pickBestSheet(wb, key);

      // Lire d'abord en AOA pour détecter la ligne d'en-tête (elle n'est pas forcément la 1ère
      // si le template Atlas a inséré un commentaire de titre + une ligne vide).
      const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(aoa.length, 10); i++) {
        const row = aoa[i] || [];
        const nonEmpty = row.filter(v => v !== '' && v != null).length;
        if (nonEmpty >= 2) {
          headerRowIndex = i;
          break;
        }
      }
      if (headerRowIndex < 0) {
        toast.error(t('dataMigration.toastNoHeaderRow', { sheet: sheetName }));
        return;
      }

      const rawHeaders = (aoa[headerRowIndex] as unknown[]).map(v => String(v ?? '').trim());
      // Nettoyer les en-têtes : supprimer " *" (marqueur colonne obligatoire des templates)
      const headers = rawHeaders.map(h => h.replace(/\s*\*\s*$/, ''));

      // Convertir les lignes suivantes en objets clé/valeur
      const data: Record<string, unknown>[] = [];
      for (let i = headerRowIndex + 1; i < aoa.length; i++) {
        const row = aoa[i] || [];
        // Sauter les lignes entièrement vides
        if ((row as unknown[]).every(v => v === '' || v == null)) continue;
        const obj: Record<string, unknown> = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = (row as unknown[])[idx] ?? '';
        });
        data.push(obj);
      }

      const columns = headers.filter(Boolean);

      setUploadedFiles(prev => ({ ...prev, [key]: { file, data, columns } }));
      const sheetInfo = wb.SheetNames.length > 1 ? t('dataMigration.toastSheetInfo', { sheet: sheetName }) : '';
      toast.success(t('dataMigration.toastFileLoaded', {
        name: file.name, sheet: sheetInfo,
        rows: String(data.length), cols: String(columns.length),
      }));
    } catch (err) { /* silent */
      toast.error(t('dataMigration.toastReadError', { name: file.name }));
    }
  }, [pickBestSheet, t]);

  const removeFile = useCallback((key: string) => {
    setUploadedFiles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  /**
   * Upload du CLASSEUR UNIQUE du mode (flux recommandé) : on lit toutes les
   * feuilles attendues par le mode et on alimente les slots correspondants en
   * une seule opération (Grand Livre → grandLivre, Balance → reportAN, etc.).
   */
  const handleModeWorkbookUpload = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true });
      const result = splitModeWorkbook(wb, migrationMode as MigrationModeId);

      if (!result.recognized) {
        toast.error(t('dataMigration.toastModeMismatch', { mode: String(migrationMode) }));
        return;
      }

      setUploadedFiles(prev => {
        const next = { ...prev };
        for (const [slot, parsed] of Object.entries(result.slots)) {
          if (parsed) next[slot] = { file, data: parsed.data, columns: parsed.columns };
        }
        return next;
      });

      const summary = result.matched.map(m => `${m.sheetName} (${m.rows})`).join(' · ');
      toast.success(t('dataMigration.toastWorkbookImported', { mode: String(migrationMode), summary }));
      if (result.missingRequired.length > 0) {
        toast(t('dataMigration.toastMissingSheets', { list: result.missingRequired.join(', ') }));
      }
    } catch {
      toast.error(t('dataMigration.toastWorkbookReadError', { name: file.name }));
    }
  }, [migrationMode, t]);

  // ─── Step 3: Analysis ─────────────────────────────────

  const runAnalysis = useCallback(async () => {
    const warnings: AnalysisItem[] = [];
    const errors: AnalysisItem[] = [];
    let pcData = uploadedFiles.planComptable?.data || [];
    const tiersData = uploadedFiles.tiers?.data || [];
    const glData = uploadedFiles.grandLivre?.data || uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
    const ecrituresData = glData;
    const anData = uploadedFiles.reportAN?.data || [];
    const assetData = uploadedFiles.immobilisations?.data || [];

    // ══════════════════════════════════════════════════════════════
    // AUTO-GÉNÉRATION DU PLAN COMPTABLE À PARTIR DU GRAND LIVRE
    // (inspiration Cockpit F&A) — si aucun PC uploadé mais GL présent
    // ══════════════════════════════════════════════════════════════
    let genResult: GenerationResult | null = null;
    if (pcData.length === 0 && glData.length > 0) {
      genResult = generatePlanComptableFromGL(glData);
      pcData = toXlsxRows(genResult);
      setGeneratedPC(genResult);
      // On injecte le PC généré dans uploadedFiles pour que les étapes suivantes l'utilisent
      const pseudoFile = new File([], 'plan_comptable_auto_genere.xlsx');
      const columns = pcData.length > 0 ? Object.keys(pcData[0] as object) : [];
      setUploadedFiles(prev => ({
        ...prev,
        planComptable: { file: pseudoFile, data: pcData, columns },
      }));
      warnings.push({
        code: 'PC_AUTO_GENERATED',
        message: t('dataMigration.warnPcAutoGenerated', { count: String(genResult.extracted) }),
        details: t('dataMigration.warnPcAutoGeneratedDetails', {
          syscohada: String(genResult.enrichedFromSyscohada),
          gl: String(genResult.enrichedFromGL),
          inferred: String(genResult.inferred),
        }),
      });
    } else {
      setGeneratedPC(null);
    }

    if (pcData.length === 0) {
      errors.push({ code: 'NO_PLAN', message: t('dataMigration.errNoPlan') });
    }

    // Check SYSCOHADA compliance
    const syscohadaClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    pcData.forEach((row: any) => {
      const num = String(Object.values(row)[0] || '');
      if (num && !syscohadaClasses.includes(num[0])) {
        warnings.push({ code: 'NON_SYSCOHADA', message: t('dataMigration.warnNonSyscohada', { code: num }) });
      }
    });

    // Check tiers NIF
    tiersData.forEach((row: any, i: number) => {
      const vals = Object.values(row) as string[];
      const hasNif = vals.some(v => /\d{10,}/.test(String(v)));
      if (!hasNif) {
        warnings.push({ code: 'NO_NIF', message: t('dataMigration.warnNoNif', { line: String(i + 1) }) });
      }
    });

    // ───────────────────────────────────────────────────────────
    // Check balance débit/crédit — recherche par NOM de colonne
    // (insensible casse/accents/espaces), JAMAIS par indice positionnel.
    // Les fichiers de migration ont souvent des colonnes supplémentaires
    // (solde, solde progressif...) qui fausseraient un calcul positionnel.
    // ───────────────────────────────────────────────────────────
    // normalizeKey + findCol d\u00e9finis au niveau module (accessibles ici et dans runImport)
    const debitAliases = ['debit', 'montantdebit', 'mtdebit'];
    const creditAliases = ['credit', 'montantcredit', 'mtcredit'];

    let totalD = 0, totalC = 0;
    ecrituresData.forEach((row: any) => {
      totalD = money(totalD).add(money(findCol(row, debitAliases))).toNumber();
      totalC = money(totalC).add(money(findCol(row, creditAliases))).toNumber();
    });
    if (ecrituresData.length > 0 && money(totalD).subtract(money(totalC)).abs().toNumber() > 0.01) {
      warnings.push({
        code: 'UNBALANCED',
        message: t('dataMigration.warnUnbalanced', { debit: totalD.toFixed(2), credit: totalC.toFixed(2) }),
        details: t('dataMigration.warnUnbalancedDetails', { diff: money(totalD).subtract(money(totalC)).abs().toNumber().toFixed(2) }),
      });
    }

    // AN balance check — même logique par nom de colonne
    let anD = 0, anC = 0;
    anData.forEach((row: any) => {
      anD = money(anD).add(money(findCol(row, [...debitAliases, 'soldedebiteur', 'soldedebit']))).toNumber();
      anC = money(anC).add(money(findCol(row, [...creditAliases, 'soldecrediteur', 'soldecredit']))).toNumber();
    });
    if (anData.length > 0 && money(anD).subtract(money(anC)).abs().toNumber() > 0.01) {
      errors.push({ code: 'AN_UNBALANCED', message: t('dataMigration.errAnUnbalanced', { debit: anD.toFixed(2), credit: anC.toFixed(2) }) });
    }

    // ════════════════════════════════════════════════════════════════
    // CONTROLES SYSCOHADA AVANT IMPORT (validations métier OHADA)
    // ════════════════════════════════════════════════════════════════

    // Helper : extraire le code compte depuis une ligne (PC ou écriture)
    const extractAccountCode = (row: any): string => {
      const aliases = ['numero', 'compte', 'numerocompte', 'code', 'account', 'no'];
      for (const k of Object.keys(row || {})) {
        const norm = k.toLowerCase().replace(/[\s_-]/g, '');
        if (aliases.includes(norm)) return String(row[k] || '').trim();
      }
      return '';
    };

    // 1. Validation classes 1-9 (SYSCOHADA n'autorise que les classes 1 à 9)
    //    Codes commençant par 0 ou non-numérique => non conforme
    const allAccounts = [...pcData, ...anData];
    let invalidClassCount = 0;
    let shortCodeCount = 0;
    const samplesInvalid: string[] = [];
    const samplesShort: string[] = [];
    allAccounts.forEach((row: any) => {
      const code = extractAccountCode(row);
      if (!code) return;
      const firstChar = code.charAt(0);
      if (firstChar < '1' || firstChar > '9') {
        invalidClassCount++;
        if (samplesInvalid.length < 3) samplesInvalid.push(code);
      }
      if (code.length < 3) {
        shortCodeCount++;
        if (samplesShort.length < 3) samplesShort.push(code);
      }
    });
    if (invalidClassCount > 0) {
      errors.push({
        code: 'SYSCOHADA_INVALID_CLASS',
        message: t('dataMigration.errInvalidClass', { count: String(invalidClassCount) }),
        details: t('dataMigration.errInvalidClassDetails', { samples: samplesInvalid.join(', ') }),
      });
    }
    if (shortCodeCount > 0) {
      warnings.push({
        code: 'SYSCOHADA_SHORT_CODE',
        message: t('dataMigration.warnShortCode', { count: String(shortCodeCount) }),
        details: t('dataMigration.warnShortCodeDetails', { samples: samplesShort.join(', ') }),
      });
    }

    // 2. Validation classes 6-7 à zéro en Mode 2 (annualisation N-1)
    //    Mode 2 = Bascule début d'exercice : les comptes de gestion (charges
    //    classe 6 et produits classe 7) doivent être annualisés à zéro car
    //    le résultat de l'exercice N-1 a été soldé en clôture.
    if (migrationMode === 2 && anData.length > 0) {
      let class67NonZero = 0;
      const samples67: string[] = [];
      anData.forEach((row: any) => {
        const code = extractAccountCode(row);
        if (!code) return;
        const firstChar = code.charAt(0);
        if (firstChar === '6' || firstChar === '7') {
          const d = findCol(row, [...debitAliases, 'soldedebiteur', 'soldedebit']);
          const c = findCol(row, [...creditAliases, 'soldecrediteur', 'soldecredit']);
          if (money(d).abs().toNumber() > 0.01 || money(c).abs().toNumber() > 0.01) {
            class67NonZero++;
            if (samples67.length < 3) samples67.push(`${code} (D=${d}, C=${c})`);
          }
        }
      });
      if (class67NonZero > 0) {
        errors.push({
          code: 'SYSCOHADA_CLASS67_NOT_ZERO',
          message: t('dataMigration.errClass67', { count: String(class67NonZero) }),
          details: t('dataMigration.errClass67Details', { samples: samples67.join(' · ') }),
        });
      }
    }

    // 3. Validation date de bascule = début d'exercice fiscal
    //    Mode 2 attend une date 01/01 (ou 1er jour du mois fiscal défini).
    //    Mode 1 n'a pas cette contrainte mais on warn si date > date du jour.
    if (params.dateBascule) {
      const d = new Date(params.dateBascule);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        if (d > today) {
          warnings.push({
            code: 'BASCULE_FUTURE',
            message: t('dataMigration.warnBasculeFuture'),
            details: t('dataMigration.warnBasculeFutureDetails', { date: params.dateBascule }),
          });
        }
        if (migrationMode === 2) {
          const isJan1 = d.getMonth() === 0 && d.getDate() === 1;
          if (!isJan1) {
            warnings.push({
              code: 'BASCULE_NOT_FISCAL_START',
              message: t('dataMigration.warnBasculeNotFiscalStart'),
              details: t('dataMigration.warnBasculeNotFiscalStartDetails', { date: params.dateBascule }),
            });
          }
        }
      }
    }

    // 4. Cohérence exerciceStart / exerciceEnd (durée 12 mois normale)
    if (params.exerciceStart && params.exerciceEnd) {
      const ds = new Date(params.exerciceStart);
      const de = new Date(params.exerciceEnd);
      if (!isNaN(ds.getTime()) && !isNaN(de.getTime())) {
        const months = (de.getFullYear() - ds.getFullYear()) * 12 + (de.getMonth() - ds.getMonth());
        if (months < 6 || months > 18) {
          warnings.push({
            code: 'EXERCICE_DUREE_ATYPIQUE',
            message: t('dataMigration.warnExerciceDuree', { months: String(months) }),
            details: t('dataMigration.warnExerciceDureeDetails'),
          });
        }
      }
    }

    // 5. Vérification doublons INTRA-fichier (anti-concaténation)
    // La clé inclut le compte comptable pour éviter les faux positifs :
    // dans un GL, débit et crédit d'une même pièce partagent date+montant+libellé
    // mais PAS le même compte → sans le compte on aurait ~50% de "doublons".
    if (ecrituresData.length > 100) {
      const accountAliases = ['compte','CompteNum','accountCode','account_code','compteNum','numCompte'];
      const seen = new Set<string>();
      let duplicates = 0;
      ecrituresData.forEach((row: any) => {
        const account = findCol(row, accountAliases) || '';
        const key = `${row.date || ''}|${account}|${findCol(row, debitAliases)}|${findCol(row, creditAliases)}|${row.libelle || row.label || ''}`;
        if (seen.has(key)) duplicates++;
        else seen.add(key);
      });
      if (duplicates > ecrituresData.length * 0.05) {
        warnings.push({
          code: 'POSSIBLE_DUPLICATES',
          message: t('dataMigration.warnPossibleDuplicates', { count: String(duplicates) }),
          details: t('dataMigration.warnPossibleDuplicatesDetails'),
        });
      }
    }

    // 6. Vérification doublons INTER-SESSION (Grand Livre vs Grand Livre des Tiers)
    //    Compare les écritures du fichier contre celles déjà présentes en base.
    //    Détecte notamment le cas : GL complet importé en session 1 puis GL Tiers en session 2.
    if (ecrituresData.length > 0) {
      try {
        // Garde-fou : en SaaS, lire TOUTES les écritures peut être lent. On borne
        // l'attente à 8 s — au-delà, on saute le contrôle anti-doublon inter-session
        // plutôt que de figer le passage à l'étape « Analyse ».
        const existingEntries = await Promise.race([
          adapter.getAll<any>('journalEntries'),
          new Promise<any[]>((_, reject) =>
            setTimeout(() => reject(new Error('timeout lecture écritures existantes')), 8000)
          ),
        ]);
        if (existingEntries.length > 0) {
          // Construire un set des numéros de pièce existants
          const existingNums = new Set(existingEntries.map((e: any) =>
            e.entry_number || e.entryNumber || e.piece || e.numero || ''
          ).filter(Boolean));
          // Compter les pièces du fichier qui existent déjà
          const pieceAliases = ['numero_piece','piece','entry_number','entryNumber','journal_num','num_ecriture','n_piece'];
          let crossDuplicates = 0;
          ecrituresData.forEach((row: any) => {
            const num = findCol(row, pieceAliases);
            if (num && existingNums.has(String(num))) crossDuplicates++;
          });
          const ratio = crossDuplicates / ecrituresData.length;
          if (ratio > 0.3) {
            errors.push({
              code: 'CROSS_SESSION_DUPLICATES',
              message: t('dataMigration.errCrossSessionDuplicates', {
                count: String(crossDuplicates), pct: String(Math.round(ratio * 100)),
              }),
              details: t('dataMigration.errCrossSessionDuplicatesDetails', { existing: String(existingEntries.length) }),
            });
          } else if (crossDuplicates > 0) {
            warnings.push({
              code: 'PARTIAL_OVERLAP',
              message: t('dataMigration.warnPartialOverlap', { count: String(crossDuplicates) }),
              details: t('dataMigration.warnPartialOverlapDetails'),
            });
          }
        }
      } catch { /* Adapter non disponible, skip */ }
    }

    setAnalysisReport({
      accounts: pcData.length,
      tiers: tiersData.length,
      entries: ecrituresData.length,
      lines: ecrituresData.length,
      assets: assetData.length,
      warnings: warnings.slice(0, 50),
      errors,
    });
  }, [uploadedFiles, migrationMode, params.dateBascule, params.exerciceStart, params.exerciceEnd, t]);

  // ─── Step 4: Auto-mapping ─────────────────────────────

  const initMappings = useCallback(() => {
    const result: Record<string, MappedColumn[]> = {};
    for (const [key, uf] of Object.entries(uploadedFiles)) {
      const targets = TARGET_FIELDS[key];
      if (!targets) continue;
      const auto = autoDetectColumns(uf.columns, targets, getAliasMap(key));
      result[key] = targets.map(tf => ({
        target: tf.field,
        targetLabel: t(tf.labelKey),
        source: auto[tf.field] || '',
        required: tf.required,
      }));
    }
    setMappings(result);

    // Account mappings from plan comptable
    const pcData = uploadedFiles.planComptable?.data || [];
    setAccountMappings(pcData.slice(0, 100).map((row: any) => {
      const vals = Object.values(row) as string[];
      const num = String(vals[0] || '');
      const label = String(vals[1] || '');
      const valid = /^[1-9]\d{2,}$/.test(num);
      return {
        sourceAccount: num,
        sourceLabel: label,
        suggestedAccount: num,
        status: valid ? 'ok' as const : 'warning' as const,
      };
    }));
  }, [uploadedFiles, t]);

  // ─── Étape Journaux : détection + rapprochement ────────
  // Détecte les codes journaux SOURCE du Grand Livre, propose un type standard
  // (classifyJournal) et alimente le tableau de validation. On préserve les choix
  // déjà faits par l'utilisateur (re-passage sur l'étape).
  const detectJournals = useCallback(() => {
    const ecrMapping = mappings.grandLivre || mappings.ecritures || mappings.fec || [];
    const ecr = uploadedFiles.grandLivre?.data || uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
    const jCol = ecrMapping.find(m => m.target === 'journal')?.source;
    const cCol = ecrMapping.find(m => m.target === 'compte')?.source
      || ecrMapping.find(m => m.target === 'numeroCompte')?.source;
    if (!jCol) { setDetectedJournals([]); return; }

    const agg = new Map<string, { count: number; accounts: Set<string> }>();
    for (const row of ecr as Record<string, any>[]) {
      const code = String(row[jCol] ?? '').trim();
      if (!code) continue;
      if (!agg.has(code)) agg.set(code, { count: 0, accounts: new Set() });
      const g = agg.get(code)!;
      g.count++;
      const acc = cCol ? String(row[cCol] ?? '').replace(/\s/g, '') : '';
      if (acc && g.accounts.size < 12) g.accounts.add(acc);
    }

    const detected = [...agg.entries()]
      .map(([code, g]) => {
        const accounts = [...g.accounts];
        return { code, count: g.count, sampleAccounts: accounts.slice(0, 6), proposed: classifyJournal(code, accounts) };
      })
      .sort((a, b) => b.count - a.count);

    setDetectedJournals(detected);
    setJournalMapping(prev => {
      const next = { ...prev };
      for (const d of detected) if (!next[d.code]) next[d.code] = d.proposed; // ne pas écraser un choix utilisateur
      return next;
    });
  }, [mappings, uploadedFiles]);

  // ─── Step 6: Simulation ────────────────────────────────

  const runSimulation = useCallback(() => {
    // Mode 1 (Bascule) : source principale = grandLivre.
    const ecr = uploadedFiles.grandLivre?.data || uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
    const ecrMapping = mappings.grandLivre || mappings.ecritures || mappings.fec || [];
    const an = uploadedFiles.reportAN?.data || [];
    const anMapping = mappings.reportAN || [];
    const assets = uploadedFiles.immobilisations?.data || [];
    let totalDebit = 0, totalCredit = 0;

    // Resoudre les colonnes debit/credit via le mapping plutot que par position
    // (sinon on tombe sur 'Solde progressif'/'Solde' en fin de ligne pour un GL).
    const debCol = ecrMapping.find(m => m.target === 'debit')?.source;
    const credCol = ecrMapping.find(m => m.target === 'credit')?.source;
    const anDebCol = anMapping.find(m => m.target === 'debit')?.source;
    const anCredCol = anMapping.find(m => m.target === 'credit')?.source;

    ecr.forEach((row: any) => {
      const d = debCol ? parseNumber((row as Record<string, any>)[debCol]) : 0;
      const c = credCol ? parseNumber((row as Record<string, any>)[credCol]) : 0;
      totalDebit = money(totalDebit).add(money(d)).toNumber();
      totalCredit = money(totalCredit).add(money(c)).toNumber();
    });
    an.forEach((row: any) => {
      const d = anDebCol ? parseNumber((row as Record<string, any>)[anDebCol]) : 0;
      const c = anCredCol ? parseNumber((row as Record<string, any>)[anCredCol]) : 0;
      totalDebit = money(totalDebit).add(money(d)).toNumber();
      totalCredit = money(totalCredit).add(money(c)).toNumber();
    });

    // Actif/Passif estimés à partir des SOLDES NETS par compte (classes 1-5).
    // En Mode 1 (Bascule en cours d'exercice) il n'existe PAS de fichier « Reports
    // à Nouveau » séparé : le bilan se déduit du Grand Livre (journal RAN +
    // mouvements). On agrège donc le solde net (débit - crédit) de chaque compte
    // depuis le GL ET l'éventuel fichier AN (Mode 2/3), puis on ventile :
    // solde débiteur → Actif, solde créditeur → Passif.
    const glNumCol = ecrMapping.find(m => m.target === 'compte')?.source ||
                     ecrMapping.find(m => m.target === 'numeroCompte')?.source;
    const anNumCol = anMapping.find(m => m.target === 'numeroCompte')?.source ||
                     anMapping.find(m => m.target === 'compte')?.source;
    const soldesParCompte = new Map<string, number>();
    const cumulSoldes = (rows: any[], numCol?: string, dCol?: string, cCol?: string) => {
      if (!numCol) return;
      rows.forEach((row: any) => {
        const num = String((row as Record<string, any>)[numCol] ?? '').trim();
        if (!num) return;
        const d = dCol ? parseNumber((row as Record<string, any>)[dCol]) : 0;
        const c = cCol ? parseNumber((row as Record<string, any>)[cCol]) : 0;
        const prev = soldesParCompte.get(num) ?? 0;
        soldesParCompte.set(num, money(prev).add(money(d)).subtract(money(c)).toNumber());
      });
    };
    cumulSoldes(ecr, glNumCol, debCol, credCol);
    cumulSoldes(an, anNumCol, anDebCol, anCredCol);

    let totalActif = 0, totalPassif = 0;
    soldesParCompte.forEach((solde, num) => {
      const classe = num[0];
      if (!['1', '2', '3', '4', '5'].includes(classe)) return; // hors bilan (classes 6-9)
      if (solde > 0) totalActif = money(totalActif).add(money(solde)).toNumber();
      else if (solde < 0) totalPassif = money(totalPassif).add(money(solde).abs()).toNumber();
    });

    let assetVNC = 0;
    assets.forEach((row: any) => {
      const vals = Object.values(row).map(v => parseNumber(v));
      assetVNC = money(assetVNC).add(money(vals[vals.length - 1] || 0)).toNumber();
    });

    const totalRecords = (uploadedFiles.planComptable?.data.length || 0) +
      (uploadedFiles.tiers?.data.length || 0) + ecr.length + an.length + assets.length;

    // Comptes : si pas de plan comptable uploade mais un GL, le PC sera
    // generé automatiquement (genere lors de l'analyse). On compte donc
    // les lignes uniques de comptes presentes dans le GL.
    const numCol = ecrMapping.find(m => m.target === 'compte')?.source ||
                   ecrMapping.find(m => m.target === 'numeroCompte')?.source;
    const comptesUniques = numCol
      ? new Set(ecr.map((row: any) => String((row as Record<string, any>)[numCol] || '')).filter(Boolean)).size
      : (uploadedFiles.planComptable?.data.length || 0);

    // RAN : en Mode 1 les À-Nouveau sont DANS le Grand Livre (journal RAN/AN),
    // pas dans un fichier « Reports à Nouveau » séparé. On compte ces lignes
    // pour ne pas afficher 0 alors que le RAN est bien présent dans l'import.
    const journalCol = ecrMapping.find(m => m.target === 'journal')?.source;
    const normJournal = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
    const RAN_JOURNALS = ['ran', 'an', 'anouveau', 'anouveaux', 'reportanouveau', 'reportsanouveau'];
    const ranLinesInGL = journalCol
      ? ecr.filter((row: any) =>
          RAN_JOURNALS.includes(normJournal(String((row as Record<string, any>)[journalCol] ?? '')))
        ).length
      : 0;

    setSimulation({
      totalDebit, totalCredit,
      balanced: money(totalDebit).subtract(money(totalCredit)).abs().toNumber() < 0.01,
      totalActif, totalPassif, assetVNC,
      estimatedTime: Math.max(5, Math.ceil(totalRecords / 200)),
      counts: {
        comptes: uploadedFiles.planComptable?.data.length || comptesUniques,
        tiers: uploadedFiles.tiers?.data.length || 0,
        ecritures: ecr.length,
        // Fichier AN séparé (Mode 2/3) sinon lignes RAN détectées dans le GL (Mode 1).
        reportAN: an.length || ranLinesInGL,
        immobilisations: assets.length,
      },
    });
  }, [uploadedFiles, mappings]);

  // ─── Step 7: Import ────────────────────────────────────

  const runImport = useCallback(async () => {
    // B2 — mode « Annuler » : ne RIEN écrire (auparavant l'option ne faisait rien
    // et un import en fusion partait quand même).
    if (params.existingDataAction === 'cancel') {
      toast.info(t('dataMigration.toastImportCancelled'));
      return;
    }
    // B1/B3 — confirmation explicite avant toute écriture en base (production).
    {
      const isSaas = adapter.getMode() === 'saas';
      const sbClient = isSaas ? (adapter as any).client : null;
      const tId = isSaas ? (adapter as any).tenantId : null;
      let replaceLine = t('dataMigration.confirmMergeLine');
      if (params.existingDataAction === 'replace') {
        // B3 — rendre la suppression DÉLIBÉRÉE : compter ce qui sera supprimé.
        let nbToDelete: number | null = null;
        if (sbClient && tId) {
          try {
            const { count } = await sbClient.from('journal_entries')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', tId).not('migration_batch_id', 'is', null);
            nbToDelete = count ?? null;
          } catch { /* count indisponible — on affiche sans le chiffre */ }
        }
        const what = nbToDelete != null
          ? t('dataMigration.confirmReplaceCount', { count: String(nbToDelete) })
          : t('dataMigration.confirmReplaceEntries');
        replaceLine = t('dataMigration.confirmReplaceLine', { what });
      }
      const vol = simulation?.counts
        ? t('dataMigration.confirmVolume', {
            entries: String(simulation.counts.ecritures),
            accounts: String(simulation.counts.comptes),
            tiers: String(simulation.counts.tiers),
            assets: String(simulation.counts.immobilisations),
          })
        : t('dataMigration.confirmVolumeUnknown');
      const statut = params.entryStatus === 'validated'
        ? t('dataMigration.confirmStatusValidated')
        : t('dataMigration.confirmStatusDraft');
      const msg = t('dataMigration.confirmImport', {
        target: isSaas ? t('dataMigration.confirmTargetCloud') : t('dataMigration.confirmTargetLocal'),
        existing: replaceLine,
        volume: vol,
        status: statut,
      });
      if (!window.confirm(msg)) return;
    }
    setImporting(true);
    setImportProgress(0);
    const sessionId = generateId();
    // A7 — identifiant du LOT de migration : rattache chaque entité importée
    // pour permettre une ré-migration par écrasement bornée (purge_migration_batch).
    const migrationBatchId = crypto.randomUUID();
    const report: ImportReport = {
      accounts: 0, journals: 0, tiers: 0, entries: 0, lines: 0,
      assets: 0, lettrages: 0, balanceOk: false, bilanOk: false,
      tiersOk: false, vncOk: false, warnings: [], migrationBatchId,
    };
    const journals = new Set<string>();

    try {
      // ── Variables SaaS — déclarées ici pour être accessibles partout ──────
      const isSaasMode = adapter.getMode() === 'saas';
      const supabaseClient = isSaasMode ? (adapter as any).client : null;
      const tenantId = isSaasMode ? (adapter as any).tenantId as string | null : null;

      // ── Mode "Remplacer" : A7 — purge BORNÉE aux données ISSUES DE MIGRATION
      // (migration_batch_id NOT NULL). Les saisies manuelles (batch NULL) sont
      // PRÉSERVÉES — fini le wipe total du tenant.
      if (params.existingDataAction === 'replace' && isSaasMode && supabaseClient) {
        setImportLabel(t('dataMigration.labelDeletingPrevious'));
        // Lever le verrou des écritures migrées validées
        await supabaseClient.from('journal_entries')
          .update({ status: 'draft' }).eq('tenant_id', tenantId).not('migration_batch_id', 'is', null);
        // Supprimer dans l'ordre inverse des FK, UNIQUEMENT les lignes migrées
        for (const table of ['journal_lines', 'journal_entries', 'third_parties', 'accounts', 'assets']) {
          const { error } = await supabaseClient
            .from(table).delete().eq('tenant_id', tenantId).not('migration_batch_id', 'is', null);
          if (error) report.warnings.push(t('dataMigration.warnDeleteMigrated', { table, message: error.message }));
        }
      }

      // 1. Accounts
      // Sources possibles, par ordre de priorite :
      //   a) Fichier planComptable explicitement uploade (rare en Mode 1/2)
      //   b) generatedPC (extrait automatiquement du Grand Livre via SYSCOHADA)
      //   c) Fallback Mode 2 : extrait du fichier Balance / Reports a nouveau
      const pcMapping = mappings.planComptable || [];
      const pcData = uploadedFiles.planComptable?.data || [];
      setImportLabel(t('dataMigration.labelImportAccounts'));

      // Helper : mapping nom de colonne accounts cote Supabase
      // Schema reel : code, name, account_class, account_type, level,
      // normal_balance, is_active. Pas de colonnes 'numero'/'libelle'/'sens'.
      // L'adapter ajoute deja id, tenant_id, created_at automatiquement.
      const accountClassFromNumero = (num: string): string => {
        const c = (num || '').replace(/[^0-9]/g, '').charAt(0);
        return c || '0';
      };

      // ── Construire la liste de comptes en mémoire, puis batch insert ─────────
      // Même stratégie que les écritures : éviter N requêtes individuelles.
      const accountRecords: Record<string, unknown>[] = [];
      // isSaasMode / supabaseClient / tenantId déclarés au début du try
      const isSaasForAccounts = isSaasMode;
      const supabaseForAccounts = supabaseClient;
      const tenantIdForAccounts = tenantId;

      const buildAccount = (code: string, name: string, extra: Record<string, unknown> = {}) => ({
        id: crypto.randomUUID(),
        code, name,
        account_class: accountClassFromNumero(code),
        account_type: 'general',
        level: code.length,
        is_active: true,
        ...extra,
        ...(isSaasForAccounts ? { tenant_id: tenantIdForAccounts, created_at: new Date().toISOString(), migration_batch_id: migrationBatchId } : {}),
      });

      if (pcData.length > 0) {
        const numCol = pcMapping.find(m => m.target === 'numero')?.source;
        const libCol = pcMapping.find(m => m.target === 'libelle')?.source;
        if (numCol) {
          (pcData as Record<string, any>[]).forEach(row => {
            const code = String(row[numCol] || '').trim();
            if (code) accountRecords.push(buildAccount(code, String(row[libCol || ''] || `Compte ${code}`)));
          });
        }
      } else if (generatedPC && generatedPC.accounts.length > 0) {
        generatedPC.accounts.forEach((acc: any) => {
          accountRecords.push(buildAccount(acc.numero, acc.libelle, {
            account_class: String(acc.classe),
            account_type: acc.auxiliaire ? 'auxiliary' : 'general',
            level: acc.numero.length,
            normal_balance: acc.sens === 'M' ? null : acc.sens,
          }));
        });
      } else if (uploadedFiles.reportAN?.data && uploadedFiles.reportAN.data.length > 0) {
        const anMappingForPC = mappings.reportAN || [];
        const numCol = anMappingForPC.find(m => m.target === 'numeroCompte')?.source;
        const libCol = anMappingForPC.find(m => m.target === 'libelle')?.source;
        if (numCol) {
          const seen = new Set<string>();
          (uploadedFiles.reportAN.data as Record<string, any>[]).forEach(row => {
            const num = String(row[numCol] || '').trim();
            if (num && !seen.has(num)) { seen.add(num); accountRecords.push(buildAccount(num, String(libCol ? row[libCol] : '') || `Compte ${num}`)); }
          });
        }
      }

      // ── Insérer les comptes par batch ─────────────────────────────────────
      let accountsSkipped = 0;
      if (accountRecords.length > 0) {
        if (isSaasForAccounts && supabaseForAccounts) {
          const ACC_BATCH = 100;
          for (let b = 0; b < accountRecords.length; b += ACC_BATCH) {
            const chunk = accountRecords.slice(b, b + ACC_BATCH);
            const { error } = await supabaseForAccounts
              .from('accounts')
              .upsert(chunk, { onConflict: 'code,tenant_id', ignoreDuplicates: true });
            const isDupError = error && (error.message.includes('duplicate') || error.message.includes('unique'));
            if (error && !isDupError) {
              report.warnings.push(t('dataMigration.warnAccountsBatch', { index: String(b), message: error.message, count: String(chunk.length) }));
            } else {
              report.accounts += chunk.length;
            }
            setImportProgress(Math.round(((b + chunk.length) / accountRecords.length) * 15));
          }
        } else {
          // Dexie : insertion une par une
          for (let i = 0; i < accountRecords.length; i++) {
            try {
              await adapter.create('accounts', accountRecords[i]);
              report.accounts++;
            } catch (err) {
              const msg = err instanceof Error ? err.message : '';
              if (msg.includes('duplicate key') || msg.includes('unique constraint')) { accountsSkipped++; }
              else { report.warnings.push(t('dataMigration.warnAccountError', { code: String(accountRecords[i].code), message: msg })); }
            }
            setImportProgress(Math.round((i / accountRecords.length) * 15));
          }
        }
      }
      if (accountsSkipped > 0) {
        report.warnings.push(t('dataMigration.warnAccountsSkipped', { count: String(accountsSkipped) }));
      }
      // A4 — alerter si des comptes restent sans intitulé (name === code) : le fichier
      // source devrait porter une colonne LIBELLE, ou le Plan Comptable doit l'enrichir.
      {
        const sansLibelle = accountRecords.filter(a => String(a.name) === String(a.code)).length;
        if (sansLibelle > 0) {
          report.warnings.push(t('dataMigration.warnAccountsNoLabel', { count: String(sansLibelle) }));
        }
      }
      setImportProgress(15);

      // Mapping noms de tables PG (snake_case) → noms Dexie (camelCase)
      const PG_TO_DEXIE: Record<string, string> = {
        third_parties: 'thirdParties',
        assets: 'assets',
        accounts: 'accounts',
      };

      // ── Helper batch upsert SaaS/Dexie ───────────────────────────────────
      const batchUpsert = async (
        pgTable: string,
        records: Record<string, unknown>[],
        conflictCol: string,
        onProgress?: (pct: number) => void,
      ): Promise<number> => {
        if (!records.length) return 0;
        const BATCH = 200;
        if (isSaasForAccounts && supabaseForAccounts) {
          let inserted = 0;
          for (let b = 0; b < records.length; b += BATCH) {
            // Ne pas ré-injecter id/tenant_id si déjà présents dans le record (buildAccount les ajoute)
            const chunk = records.slice(b, b + BATCH).map(r => ({
              ...r,
              tenant_id: tenantIdForAccounts,
              created_at: new Date().toISOString(),
              migration_batch_id: (r as Record<string, unknown>).migration_batch_id ?? migrationBatchId, // A7
            }));
            const { error } = await supabaseForAccounts
              .from(pgTable)
              .upsert(chunk, { onConflict: conflictCol, ignoreDuplicates: true });
            const isDup = error && (error.message.includes('duplicate') || error.message.includes('unique'));
            if (error && !isDup) {
              report.warnings.push(t('dataMigration.warnBatchTable', { table: pgTable, index: String(b), message: error.message, count: String(chunk.length) }));
            } else {
              inserted += chunk.length;
            }
            onProgress?.(Math.round(((b + chunk.length) / records.length) * 100));
          }
          return inserted;
        }
        // Dexie — mapper le nom de table PG vers le nom camelCase Dexie
        const dexieTable = (PG_TO_DEXIE[pgTable] ?? pgTable) as any;
        let created = 0;
        for (let i = 0; i < records.length; i++) {
          try {
            await adapter.create(dexieTable, records[i]);
            created++;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (!msg.includes('duplicate key') && !msg.includes('unique constraint')) {
              report.warnings.push(t('dataMigration.warnTableItem', { table: pgTable, index: String(i), message: msg }));
            }
          }
          onProgress?.(Math.round(((i + 1) / records.length) * 100));
        }
        return created;
      };

      // 2. Tiers — schema : code, name, type, email, phone, address, tax_id, ...
      const tiersMapping = mappings.tiers || [];
      const tiersData = uploadedFiles.tiers?.data || [];
      setImportLabel(t('dataMigration.labelImportTiers'));
      const tiersRecords: Record<string, unknown>[] = [];
      /**
       * normalizeTiersType — mappe le type brut (colonne CSV/Excel) vers le type interne.
       * Extension SYSCOHADA :
       *   - 'personnel' / 'employee' → 'personnel'   (comptes 42x)
       *   - 'social' / 'state' / 'autre' / 'other' → 'other'  (comptes 43x–47x)
       * Si le type textuel est vide/inconnu, la déduction par préfixe de compte prend le relais
       * via normalizeTiersTypeFromAccount() ci-dessous.
       */
      const normalizeTiersType = (raw: string): 'customer' | 'supplier' | 'both' | 'personnel' | 'other' => {
        const v = raw.toLowerCase().trim();
        if (v === 'customer' || v === 'client' || v === 'c') return 'customer';
        if (v === 'supplier' || v === 'fournisseur' || v === 'f') return 'supplier';
        if (v === 'both' || v === 'les deux' || v === 'b') return 'both';
        // Personnel / employés (comptes SYSCOHADA 42x)
        if (v.includes('personnel') || v.includes('employee')) return 'personnel';
        // Tiers divers : organismes sociaux (43x), État (44x), débiteurs divers (46x), comptes transitoires (47x)
        if (v.includes('social') || v.includes('state') || v.includes('autre') || v.includes('other')) return 'other';
        return 'customer';
      };
      /**
       * normalizeTiersTypeFromAccount — déduit le type à partir du préfixe de compte SYSCOHADA
       * quand la colonne type est absente ou non reconnue.
       *   42x → personnel, 43x/44x/46x/47x → other, 401/402 → supplier, 411/412 → customer
       */
      const normalizeTiersTypeFromAccount = (accountCode: string): 'customer' | 'supplier' | 'personnel' | 'other' | null => {
        if (!accountCode) return null;
        const prefix2 = accountCode.slice(0, 2);
        const prefix3 = accountCode.slice(0, 3);
        if (prefix2 === '42') return 'personnel';
        if (prefix2 === '43' || prefix2 === '44' || prefix2 === '46' || prefix2 === '47') return 'other';
        if (prefix3 === '401' || prefix3 === '402') return 'supplier';
        if (prefix3 === '411' || prefix3 === '412') return 'customer';
        return null;
      };
      const codeCol    = tiersMapping.find(m => m.target === 'code')?.source;
      const nomCol     = tiersMapping.find(m => m.target === 'nom')?.source;
      const typeCol    = tiersMapping.find(m => m.target === 'type')?.source;
      const compteCol  = tiersMapping.find(m => m.target === 'compte')?.source;
      const nifCol     = tiersMapping.find(m => m.target === 'nif')?.source;
      const adresseCol = tiersMapping.find(m => m.target === 'adresse')?.source;
      const telCol     = tiersMapping.find(m => m.target === 'telephone')?.source;
      for (const row of tiersData as Record<string, any>[]) {
        if (!codeCol || !nomCol) continue;
        const rawType    = typeCol   ? String(row[typeCol]   || '') : '';
        const rawCompte  = compteCol ? String(row[compteCol] || '') : '';
        // Priority: explicit type column → account prefix deduction → default 'customer'
        const resolvedType =
          normalizeTiersType(rawType) !== 'customer' || rawType.toLowerCase().trim() === 'customer' || rawType.toLowerCase().trim() === 'c'
            ? normalizeTiersType(rawType)
            : normalizeTiersTypeFromAccount(rawCompte) ?? normalizeTiersType(rawType);
        // A — NIF/RCCM, adresse, téléphone (mentions légales factures + déclarations)
        const taxId   = nifCol     ? String(row[nifCol]     || '').trim() : '';
        const address = adresseCol ? String(row[adresseCol] || '').trim() : '';
        const phone   = telCol     ? String(row[telCol]     || '').trim() : '';
        tiersRecords.push({
          code: String(row[codeCol] || ''),
          name: String(row[nomCol]  || ''),
          type: resolvedType,
          is_active: true,
          ...(taxId   ? { tax_id: taxId } : {}),
          ...(address ? { address } : {}),
          ...(phone   ? { phone } : {}),
        });
      }
      const tiersCreated = await batchUpsert('third_parties', tiersRecords, 'tenant_id,code',
        pct => setImportProgress(15 + Math.round(pct * 0.15)));
      report.tiers += tiersCreated || 0;

      // ── Exercice fiscal ─────────────────────────────────────────────────────
      // La migration doit CRÉER l'exercice (sinon fiscal_years vide → Bilan,
      // clôtures, get_trial_balance(fy) sans exercice à sélectionner → tout à 0).
      try {
        const { data: existingFY } = await supabaseClient
          .from('fiscal_years').select('id').eq('tenant_id', tenantId).limit(1);
        if (!existingFY || existingFY.length === 0) {
          const fyCode = (params.exerciceStart || '').slice(0, 4) || String(new Date().getFullYear());
          await supabaseClient.from('fiscal_years').insert({
            tenant_id: tenantId,
            code: fyCode,
            name: `Exercice ${fyCode}`,
            start_date: params.exerciceStart || `${fyCode}-01-01`,
            end_date: params.exerciceEnd || `${fyCode}-12-31`,
            is_active: true,
            is_closed: false,
          });
        }
      } catch { /* exercice deja present ou colonne absente — non bloquant */ }

      // ── Rapprochement libellé → fiche tiers ────────────────────────────────
      // Pour les Grands Livres où le tiers n'apparaît QUE dans la description
      // (compte = collectif 411100/401100, pas de colonne code tiers), on tente
      // d'attribuer chaque ligne au bon client/fournisseur depuis son libellé.
      // Conservateur : match univoque seulement, type selon le compte (41x=client,
      // 40x=fournisseur), mots génériques exclus.
      const TPM_STOP = new Set(['ACTIVATION', 'COMMERCE', 'SERVICE', 'SERVICES', 'TRADING', 'HOLDING', 'GROUPE', 'GROUP', 'STORE', 'AFRIQUE', 'AFRICA', 'GENERAL', 'GENERALE', 'INTERNATIONAL', 'SOCIETE', 'ENTREPRISE', 'BUSINESS', 'MARKET', 'CENTER', 'CENTRE', 'PARTAGE', 'REVENU', 'REVENUS', 'LOCATIVE', 'SARL', 'GROUPEMENT', 'PRESTATION', 'PRESTATIONS']);
      const tpmNorm = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const tpmNormSp = (s: string) => ' ' + (s || '').toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
      const tpmIdx = (tiersRecords as Record<string, any>[])
        .map(t => ({
          code: String(t.code || ''),
          name: String(t.name || ''),
          type: String(t.type || ''),
          full: tpmNorm(String(t.name || '')),
          tokens: String(t.name || '').toUpperCase().split(/[^A-Z0-9]+/).filter(w => w.length >= 5 && !TPM_STOP.has(w)),
        }))
        .filter(t => t.code && t.full.length >= 5);
      const tpmTokCount: Record<string, number> = {};
      for (const t of tpmIdx) for (const w of new Set(t.tokens)) tpmTokCount[w] = (tpmTokCount[w] || 0) + 1;
      const matchTiers = (label: string, accountCode: string): { code: string; name: string } | null => {
        const side = /^41/.test(accountCode) ? 'C' : /^40/.test(accountCode) ? 'S' : null;
        if (!side) return null;
        const okType = (ty: string) => (side === 'C' ? (ty === 'customer' || ty === 'both') : (ty === 'supplier' || ty === 'both'));
        const nl = tpmNorm(label);
        const nlsp = tpmNormSp(label);
        // 1) nom complet de la fiche contenu dans le libellé
        let hits = tpmIdx.filter(t => okType(t.type) && nl.includes(t.full));
        let uniq = Array.from(new Map(hits.map(h => [h.code, h])).values());
        if (uniq.length === 1) return uniq[0];
        if (uniq.length > 1) return null;
        // 2) mot distinctif (rare) de la fiche présent comme mot entier
        hits = tpmIdx.filter(t => okType(t.type) && t.tokens.some(w => (tpmTokCount[w] || 0) <= 2 && nlsp.includes(' ' + w + ' ')));
        uniq = Array.from(new Map(hits.map(h => [h.code, h])).values());
        if (uniq.length === 1) return uniq[0];
        return null;
      };

      // 3. Assets — batch insert
      const assetMapping = mappings.immobilisations || [];
      const assetData = uploadedFiles.immobilisations?.data || [];
      setImportLabel(t('dataMigration.labelImportAssets'));
      const assetRecords: Record<string, unknown>[] = [];
      for (const row of assetData as Record<string, any>[]) {
        const getVal = (field: string) => { const col = assetMapping.find(m => m.target === field)?.source; return col ? row[col] : ''; };
        const code = String(getVal('code') || '').trim();
        if (!code) continue;
        assetRecords.push({
          code, name: String(getVal('libelle') || `Immo ${code}`),
          category: String(getVal('categorie') || 'Autre'),
          account_code: String(getVal('compteImmo') || ''),
          depreciation_account_code: String(getVal('compteAmort') || ''),
          acquisition_date: parseDate(getVal('dateAcquisition')) || new Date().toISOString().slice(0, 10),
          acquisition_value: parseNumber(getVal('valeurOrigine')),
          cumul_depreciation: parseNumber(getVal('amortCumule')),
          useful_life_years: Math.ceil(parseNumber(getVal('duree'))) || 1, // A5: ceil (pas de sous-amortissement)
          depreciation_method: (() => { const m = String(getVal('methode') || '').toLowerCase(); return m.includes('deg') ? 'declining' : 'linear'; })(),
          status: 'active',
        });
      }
      const assetsCreated = await batchUpsert('assets', assetRecords, 'tenant_id,code',
        pct => setImportProgress(30 + Math.round(pct * 0.15)));
      report.assets += assetsCreated || 0;

      // 4. Entries (group by piece number)
      // Mode 1 (Bascule en cours d'exercice) : source principale = grandLivre.
      // Fallback historique : ecritures puis fec.
      const ecrMapping = mappings.grandLivre || mappings.ecritures || mappings.fec || [];
      const ecrData = uploadedFiles.grandLivre?.data || uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
      setImportLabel(t('dataMigration.labelImportEntries'));
      const getEcrVal = (row: any, field: string) => {
        const col = ecrMapping.find(m => m.target === field)?.source;
        return col ? (row as Record<string, any>)[col] : '';
      };

      // Montants d'une ligne, NORMALISÉS. Les exports comptables expriment souvent
      // les corrections/contre-passations par un montant NÉGATIF dans débit ou
      // crédit. Math.abs() les gonfle et DÉSÉQUILIBRE l'écriture (ex. À-Nouveau
      // faussé de +130 M). On bascule plutôt un montant négatif du côté opposé,
      // ce qui préserve l'équilibre (D − C de la ligne inchangé).
      const lineAmounts = (line: any): { debit: number; credit: number } => {
        let d = parseNumber(getEcrVal(line, 'debit') || getEcrVal(line, 'Debit'));
        let c = parseNumber(getEcrVal(line, 'credit') || getEcrVal(line, 'Credit'));
        if (d < 0) { c = money(c).add(money(-d)).toNumber(); d = 0; }
        if (c < 0) { d = money(d).add(money(-c)).toNumber(); c = 0; }
        return { debit: d, credit: c };
      };

      // ── Regroupement des lignes en écritures équilibrées (A2/A3) ──────────
      // Certaines sources (ex. colonne « NUMERO DE SAISIE ») numérotent les
      // lignes SANS reconstituer des pièces équilibrées : la même valeur peut
      // traverser plusieurs journaux. Grouper dessus fabrique des centaines de
      // fausses pièces déséquilibrées. On choisit donc la clé la PLUS FINE qui
      // équilibre correctement : n° de pièce → sinon journal+date → sinon journal.
      const journalKeyOf = (row: any) => String(getEcrVal(row, 'journal') || getEcrVal(row, 'JournalCode') || 'OD');
      const dateKeyOf = (row: any) => parseDate(
        getEcrVal(row, 'date') || getEcrVal(row, 'EcritureDate') || getEcrVal(row, 'dateEcriture') || ''
      );
      const pieceKeyOf = (row: any, i: number) => String(
        getEcrVal(row, 'numeroEcriture') ||
        getEcrVal(row, 'numeroPiece') ||
        getEcrVal(row, 'piece') ||
        getEcrVal(row, 'EcritureNum') ||
        `AUTO_${i}`
      );
      const buildGroups = (keyFn: (row: any, i: number) => string) => {
        const m = new Map<string, any[]>();
        ecrData.forEach((row: any, i: number) => {
          const k = keyFn(row, i);
          if (excludedEntries.includes(k)) return;
          if (!m.has(k)) m.set(k, []);
          m.get(k)!.push(row);
        });
        return m;
      };
      const unbalancedRatio = (m: Map<string, any[]>) => {
        if (m.size === 0) return 0;
        let unbal = 0;
        for (const lines of m.values()) {
          let d = 0, c = 0;
          lines.forEach((l: any) => {
            d = money(d).add(money(parseNumber(getEcrVal(l, 'debit') || getEcrVal(l, 'Debit')))).toNumber();
            c = money(c).add(money(parseNumber(getEcrVal(l, 'credit') || getEcrVal(l, 'Credit')))).toNumber();
          });
          if (money(d).subtract(money(c)).abs().toNumber() > 0.01) unbal++;
        }
        return unbal / m.size;
      };

      // Équilibre d'un groupe de lignes (somme débits == somme crédits, tolérance 1 cent).
      const groupBalanced = (lines: any[]) => {
        let d = 0, c = 0;
        lines.forEach((l: any) => {
          const a = lineAmounts(l);
          d = money(d).add(money(a.debit)).toNumber();
          c = money(c).add(money(a.credit)).toNumber();
        });
        return money(d).subtract(money(c)).abs().toNumber() < 0.01;
      };

      const UNBAL_THRESHOLD = 0.10; // au-delà de 10% de pièces déséquilibrées, la clé est jugée non fiable
      let groups = buildGroups(pieceKeyOf);
      let groupingMode = t('dataMigration.groupingModePiece');
      if (unbalancedRatio(groups) > UNBAL_THRESHOLD) {
        // Le n° de pièce/saisie n'est pas fiable (ex. « NUMERO DE SAISIE » = compteur
        // de lignes). On regroupe par « journal + date » (pièces fines), PUIS on
        // CONSOLIDE les reliquats déséquilibrés au sein de leur journal : comme chaque
        // journal s'équilibre globalement, le reliquat par journal s'équilibre aussi.
        // Évite de découper une opération inter-dates en moitiés déséquilibrées.
        const byJournalDate = buildGroups((row: any) => `${journalKeyOf(row)}|${dateKeyOf(row)}`);
        const consolidated = new Map<string, any[]>();
        const unbalByJournal = new Map<string, any[]>();
        for (const [k, lines] of byJournalDate) {
          if (groupBalanced(lines)) {
            consolidated.set(k, lines);
          } else {
            const j = journalKeyOf(lines[0]);
            if (!unbalByJournal.has(j)) unbalByJournal.set(j, []);
            unbalByJournal.get(j)!.push(...lines);
          }
        }
        // Chaque reliquat journal = une pièce (équilibrée si le journal s'équilibre ;
        // sinon le contrôle A3 en aval la passera en brouillon, jamais en validé).
        for (const [j, lines] of unbalByJournal) consolidated.set(`${j}|regroupé`, lines);
        groups = consolidated;
        groupingMode = t('dataMigration.groupingModeJournalDate');
        report.warnings.push(t('dataMigration.warnGroupingMode', { mode: groupingMode }));
      }

      let ecrIdx = 0;
      let entriesSkipped = 0;
      const entryErrors: string[] = [];

      // ── Mode SaaS : batch insert direct pour éviter N requêtes individuelles ──
      // 1 saveJournalEntry (RPC) par pièce = 2 000+ requêtes pour un GL de 10 000 lignes.
      // Solution : construire les tableaux journal_entries + journal_lines en mémoire
      // puis insérer en batch (100 écritures / 500 lignes par requête).
      if (isSaasMode && supabaseClient) {
        // ── Construire tous les records en mémoire ──────────────────────────
        const batchEntries: any[] = [];
        const batchLines: any[] = [];

        // A2/A3 — Contrôle d'équilibre JAMAIS « par pièce reconstituée » seule :
        // on agrège au niveau journal + global, et on n'autorise JAMAIS une écriture
        // déséquilibrée à passer en 'validated' (downgrade silencieux → 'draft' + log).
        let imbalancedDowngraded = 0;
        let outOfPeriod = 0; // C3 — écritures hors exercice
        let gDebit = 0, gCredit = 0;
        const journalSums = new Map<string, { d: number; c: number }>();
        const fyStart = params.exerciceStart || '';
        const fyEnd = params.exerciceEnd || '';

        for (const [piece, lines] of groups) {
          const rawJournal = String(getEcrVal(lines[0], 'journal') || getEcrVal(lines[0], 'JournalCode') || 'OD');
          // Rapprochement vers un type standard : priorité au choix validé par
          // l'utilisateur (étape Journaux), repli sur la classification auto.
          // Le code source reste tracé dans entry_number.
          const journalCode = journalMapping[rawJournal.trim()] || classifyJournal(
            rawJournal,
            lines.map((l: any) => String(getEcrVal(l, 'compte') || getEcrVal(l, 'CompteNum') || getEcrVal(l, 'accountCode') || ''))
          );
          journals.add(journalCode);
          const entryDate = parseDate(
            getEcrVal(lines[0], 'date') ||
            getEcrVal(lines[0], 'EcritureDate') ||
            getEcrVal(lines[0], 'dateEcriture') || params.exerciceStart
          );
          const entryLabel = String(
            getEcrVal(lines[0], 'libelle') || getEcrVal(lines[0], 'EcritureLib') ||
            getEcrVal(lines[0], 'label') || piece
          );
          // C3 — date hors exercice ouvert : on n'écrit JAMAIS dans une période
          // hors [exerciceStart, exerciceEnd] sans le signaler (compta clôturée).
          if (fyStart && fyEnd && entryDate && (entryDate < fyStart || entryDate > fyEnd)) {
            outOfPeriod++;
          }
          // Somme via money() sur les montants NORMALISÉS (cohérents avec les
          // lignes stockées) — aucune dérive flottante (A5).
          let totalDebit = 0; let totalCredit = 0;
          lines.forEach((line: any) => {
            const { debit, credit } = lineAmounts(line);
            totalDebit  = money(totalDebit).add(money(debit)).toNumber();
            totalCredit = money(totalCredit).add(money(credit)).toNumber();
          });
          const entryBalanced = money(totalDebit).subtract(money(totalCredit)).abs().toNumber() <= 0.01;

          // A3 — une écriture déséquilibrée ne peut JAMAIS être 'validated'
          let entryStatus: 'validated' | 'draft' = params.entryStatus === 'validated' ? 'validated' : 'draft';
          if (!entryBalanced && entryStatus === 'validated') {
            entryStatus = 'draft';
            imbalancedDowngraded++;
            if (report.warnings.length < 200) {
              report.warnings.push(t('dataMigration.warnPieceUnbalanced', {
                piece: String(piece),
                debit: totalDebit.toFixed(2),
                credit: totalCredit.toFixed(2),
                diff: money(totalDebit).subtract(money(totalCredit)).abs().toNumber().toFixed(2),
              }));
            }
          }

          // A2 — agrégats journal + global
          gDebit = money(gDebit).add(money(totalDebit)).toNumber();
          gCredit = money(gCredit).add(money(totalCredit)).toNumber();
          const _js = journalSums.get(journalCode) || { d: 0, c: 0 };
          _js.d = money(_js.d).add(money(totalDebit)).toNumber();
          _js.c = money(_js.c).add(money(totalCredit)).toNumber();
          journalSums.set(journalCode, _js);

          const entryId = crypto.randomUUID();
          batchEntries.push({
            id: entryId, tenant_id: tenantId,
            entry_number: piece, journal: journalCode, date: entryDate,
            label: entryLabel, reference: piece,
            status: entryStatus,
            total_debit: totalDebit, total_credit: totalCredit,
            created_at: new Date().toISOString(),
            migration_batch_id: migrationBatchId, // A7
          });
          lines.forEach((line: any, lineIdx: number) => {
            const accountCode = String(
              getEcrVal(line, 'compte') || getEcrVal(line, 'CompteNum') ||
              getEcrVal(line, 'accountCode') || ''
            ).replace(/\s/g, '');
            const { debit, credit } = lineAmounts(line);
            const lineLabel = String(getEcrVal(line, 'libelleEcriture') || getEcrVal(line, 'libelle') || entryLabel);
            // Tiers : colonne explicite « Code tiers » si présente, sinon
            // rapprochement depuis le libellé (GL où le tiers n'est que dans la
            // description et le compte est le collectif).
            const tiersExplicit = String(getEcrVal(line, 'tiers') || '').trim();
            const tpm = tiersExplicit
              ? { code: tiersExplicit, name: String(getEcrVal(line, 'tiersNom') || getEcrVal(line, 'tiersName') || '').trim() }
              : matchTiers(lineLabel, accountCode);
            // A — champs métier indispensables aux modules (lettrage par tiers,
            // effets/échéances, comptabilité analytique).
            const lettrageCode = String(getEcrVal(line, 'lettrage') || '').trim() || null;
            const dateEcheance = parseDate(getEcrVal(line, 'echeance') || getEcrVal(line, 'dateEcheance') || '') || null;
            const analyticalCode = String(getEcrVal(line, 'analytique') || getEcrVal(line, 'analytical') || getEcrVal(line, 'codeAnalytique') || '').trim() || null;
            batchLines.push({
              // B4 — id DÉTERMINISTE : un même fichier réimporté produit le même id
              // → onConflict:'id' dédoublonne réellement (plus de lignes en double).
              id: deterministicUuid(`${tenantId}|${piece}|${accountCode}|${debit}|${credit}|${lineIdx}`),
              _entry_number: piece, // clé temporaire pour remapping post-insert
              entry_id: entryId, tenant_id: tenantId,
              account_code: accountCode,
              // A4 — privilégier le libellé de compte (colonne LIBELLE → libelleCompte)
              // pour ne JAMAIS retomber sur « code = nom » quand le libellé est dispo.
              account_name: String(getEcrVal(line, 'libelleCompte') || getEcrVal(line, 'compteLib') || getEcrVal(line, 'CompteLib') || accountCode),
              label: lineLabel,
              debit,
              credit,
              third_party_code: tpm?.code || null,
              third_party_name: tpm?.name || null,
              lettrage_code: lettrageCode,
              date_echeance: dateEcheance,
              analytical_code: analyticalCode,
              migration_batch_id: migrationBatchId, // A7
            });
          });
        }

        // A2 — Contrôle d'équilibre GLOBAL + par journal (rapport, non-bloquant : aucune
        // écriture déséquilibrée n'a été validée — cf. downgrade ci-dessus).
        {
          const gEcart = money(gDebit).subtract(money(gCredit)).abs().toNumber();
          if (gEcart > 0.01) {
            report.warnings.push(t('dataMigration.warnGlobalImbalance', {
              debit: gDebit.toFixed(2), credit: gCredit.toFixed(2), diff: gEcart.toFixed(2),
            }));
          }
          for (const [j, s] of journalSums) {
            const e = money(s.d).subtract(money(s.c)).abs().toNumber();
            if (e > 0.01) report.warnings.push(t('dataMigration.warnJournalImbalance', {
              journal: j, debit: s.d.toFixed(2), credit: s.c.toFixed(2), diff: e.toFixed(2),
            }));
          }
          if (imbalancedDowngraded > 0) {
            report.warnings.push(t('dataMigration.warnImbalancedDowngraded', { count: String(imbalancedDowngraded) }));
          }
          if (outOfPeriod > 0) {
            report.warnings.push(t('dataMigration.warnOutOfPeriod', { count: String(outOfPeriod), start: fyStart, end: fyEnd }));
          }
        }

        // ── C1 — Hash d'intégrité SHA-256 sur les écritures migrées ────────
        // Avant : le chemin SaaS écrivait hash = NULL → chaîne d'immuabilité
        // SYSCOHADA rompue dès la bascule. On calcule une chaîne séquentielle
        // (même algorithme que entryGuard/integrity) sur le lot migré.
        {
          const linesByPiece = new Map<string, any[]>();
          for (const l of batchLines) {
            const arr = linesByPiece.get(l._entry_number) || [];
            arr.push(l); linesByPiece.set(l._entry_number, arr);
          }
          let prevHash = '';
          for (const e of batchEntries) {
            const ls = (linesByPiece.get(e.entry_number) || []).map((l: any) => ({
              accountCode: l.account_code, debit: l.debit, credit: l.credit, label: l.label,
            }));
            e.previous_hash = prevHash;
            e.hash = await hashEntry({
              entryNumber: e.entry_number, journal: e.journal, date: e.date,
              lines: ls, totalDebit: e.total_debit, totalCredit: e.total_credit,
            }, prevHash);
            prevHash = e.hash;
          }
        }

        // ── Insérer les journal_entries par batch de 100 ──────────────────
        const ENTRY_BATCH = 100;
        for (let b = 0; b < batchEntries.length; b += ENTRY_BATCH) {
          const chunk = batchEntries.slice(b, b + ENTRY_BATCH);
          const { error } = await supabaseClient
            .from('journal_entries')
            .upsert(chunk, { onConflict: 'entry_number,tenant_id', ignoreDuplicates: true });
          if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            entryErrors.push(t('dataMigration.errBatchEntries', { from: String(b), to: String(b + ENTRY_BATCH), message: error.message }));
          }
          ecrIdx += chunk.length;
          report.entries += chunk.length;
          setImportProgress(45 + Math.round((ecrIdx / batchEntries.length) * 25));
        }

        // ── Remapper entry_id avec les vrais UUIDs en base ────────────────
        // Sur re-import, ignoreDuplicates skip les entries existantes mais
        // leurs UUIDs réels en base sont différents des UUIDs générés ici.
        // On SELECT les vrais IDs et on corrige batchLines avant l'insert.
        const allEntryNumbers = [...new Set(batchEntries.map((e: any) => e.entry_number))];
        const CHUNK_IN = 500;
        const entryIdMap = new Map<string, string>();
        for (let i = 0; i < allEntryNumbers.length; i += CHUNK_IN) {
          const slice = allEntryNumbers.slice(i, i + CHUNK_IN);
          const { data: rows } = await supabaseClient
            .from('journal_entries')
            .select('id,entry_number')
            .eq('tenant_id', tenantId)
            .in('entry_number', slice);
          rows?.forEach((r: any) => entryIdMap.set(r.entry_number, r.id));
        }
        // Appliquer le remapping et supprimer la clé temporaire
        batchLines.forEach((line: any) => {
          const realId = entryIdMap.get(line._entry_number);
          if (realId) line.entry_id = realId;
          delete line._entry_number;
        });

        // ── Insérer les journal_lines par batch de 500 ─────────────────────
        const LINE_BATCH = 500;
        for (let b = 0; b < batchLines.length; b += LINE_BATCH) {
          const chunk = batchLines.slice(b, b + LINE_BATCH);
          const { error } = await supabaseClient
            .from('journal_lines')
            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
          if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            entryErrors.push(t('dataMigration.errBatchLines', { from: String(b), to: String(b + LINE_BATCH), message: error.message }));
          }
          report.lines += chunk.length;
          setImportProgress(70 + Math.round((b / batchLines.length) * 10));
        }

      } else {
        // ── Mode local (Dexie) : insertion une par une avec hash chain ─────
      for (const [piece, lines] of groups) {
        const rawJournal = String(getEcrVal(lines[0], 'journal') || getEcrVal(lines[0], 'JournalCode') || 'OD');
        const journalCode = journalMapping[rawJournal.trim()] || classifyJournal(
          rawJournal,
          lines.map((l: any) => String(getEcrVal(l, 'compte') || getEcrVal(l, 'numeroCompte') || getEcrVal(l, 'CompteNum') || ''))
        );
        journals.add(journalCode);

        // Schema journal_entries : entry_number, journal, date, label, status,
        // total_debit, total_credit, reference. Pas de colonne 'lines' ni
        // 'importSessionId' — les lignes sont une autre table journal_lines.
        const entryDate = parseDate(
          getEcrVal(lines[0], 'date') ||
          getEcrVal(lines[0], 'dateEcriture') ||
          getEcrVal(lines[0], 'EcritureDate')
        ) || new Date().toISOString().slice(0, 10);

        const totalDebit = lines.reduce(
          (s: number, l: any) => s + lineAmounts(l).debit,
          0
        );
        const totalCredit = lines.reduce(
          (s: number, l: any) => s + lineAmounts(l).credit,
          0
        );

        const entryLabel = String(
          getEcrVal(lines[0], 'libelleEcriture') ||
          getEcrVal(lines[0], 'libelle') ||
          getEcrVal(lines[0], 'EcritureLib') ||
          piece
        );

        try {
          // Utiliser la RPC server-side import_journal_batch qui :
          // 1) INSERT entry + lines dans une seule transaction (atomique)
          // 2) Bypasse les triggers de validation d'equilibre (fichiers de
          //    migration legacy peuvent etre desequilibres par construction)
          // 3) Normalise debit/credit negatifs (extournes) en valeurs positives
          //    inversees
          const lineRecords = lines.map((line: any) => {
            const accountCode = String(
              getEcrVal(line, 'compte') ||
              getEcrVal(line, 'numeroCompte') ||
              getEcrVal(line, 'CompteNum') || ''
            );
            const accountName = String(
              getEcrVal(line, 'libelleCompte') ||
              getEcrVal(line, 'CompteLib') ||
              accountCode
            );
            const lineLabel = String(
              getEcrVal(line, 'libelleEcriture') ||
              getEcrVal(line, 'libelle') ||
              getEcrVal(line, 'EcritureLib') || entryLabel
            );
            // camelCase — requis par save_journal_entry (RPC Supabase) ET par Dexie
            const { debit, credit } = lineAmounts(line);
            // A — tiers (regroupement lettrage), lettrage, échéance, analytique
            const tiersExplicit = String(getEcrVal(line, 'tiers') || '').trim();
            const tpm = tiersExplicit
              ? { code: tiersExplicit, name: String(getEcrVal(line, 'tiersNom') || getEcrVal(line, 'tiersName') || '').trim() }
              : matchTiers(lineLabel, accountCode);
            return {
              id: deterministicUuid(`${tenantId}|${piece}|${accountCode}|${debit}|${credit}|${lineLabel}`),
              accountCode,
              accountName,
              label: lineLabel,
              debit,
              credit,
              thirdPartyCode: tpm?.code || undefined,
              thirdPartyName: tpm?.name || undefined,
              lettrageCode: String(getEcrVal(line, 'lettrage') || '').trim() || undefined,
              dateEcheance: parseDate(getEcrVal(line, 'echeance') || getEcrVal(line, 'dateEcheance') || '') || undefined,
              analyticalCode: String(getEcrVal(line, 'analytique') || getEcrVal(line, 'analytical') || getEcrVal(line, 'codeAnalytique') || '').trim() || undefined,
            };
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adapterExt = adapter as any;
          if (typeof adapterExt.saveJournalEntry === 'function') {
            // SupabaseAdapter : insertion atomique entry + lignes via save_journal_entry RPC
            // (camelCase attendu par la fonction PL/pgSQL — cf. migration 18)
            await adapterExt.saveJournalEntry({
              entryNumber: piece,
              journal: journalCode,
              date: entryDate,
              label: entryLabel,
              reference: piece,
              status: params.entryStatus === 'validated' ? 'validated' : 'draft',
              totalDebit,
              totalCredit,
              lines: lineRecords,
            });
          } else {
            // DexieAdapter : écriture via safeAddEntry (hash chain + validation)
            const now = new Date().toISOString();
            await safeAddEntry(adapter, {
              id: crypto.randomUUID(),
              entryNumber: piece,
              journal: journalCode,
              date: entryDate,
              label: entryLabel,
              reference: piece,
              status: params.entryStatus === 'validated' ? 'validated' : 'draft',
              lines: lineRecords,
              createdAt: now,
            }, { skipSyncValidation: false });
          }
          report.entries++;
          report.lines += lineRecords.length;
        } catch (err) {
          const msg = err instanceof Error ? err.message : t('dataMigration.unknownError');
          if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
            entriesSkipped++;
          } else {
            // Limiter a 10 erreurs detaillees pour ne pas saturer le rapport
            if (entryErrors.length < 10) {
              entryErrors.push(t('dataMigration.errEntry', { piece: String(piece), message: msg }));
            }
          }
        }
        ecrIdx++;
        setImportProgress(45 + Math.round((ecrIdx / groups.size) * 35));
      }
      } // fin else Dexie

      if (entriesSkipped > 0) {
        report.warnings.push(t('dataMigration.warnEntriesSkipped', { count: String(entriesSkipped) }));
      }
      for (const e of entryErrors) report.warnings.push(e);
      const otherErrors = (groups.size - report.entries - entriesSkipped) - entryErrors.length;
      if (otherErrors > 0) {
        report.warnings.push(t('dataMigration.warnOtherEntryErrors', { count: String(otherErrors) }));
      }

      // 5. AN entries — Mode 2 (balance N-1) / fallback Mode 1 / Mode 3 (1 AN par exercice)
      const anData = uploadedFiles.reportAN?.data || [];
      if (anData.length > 0) {
        setImportLabel(t('dataMigration.labelImportAN'));
        const anMapping = mappings.reportAN || [];
        const numCol = anMapping.find(m => m.target === 'numeroCompte')?.source;
        const libCol = anMapping.find(m => m.target === 'libelle')?.source;
        const dCol = anMapping.find(m => m.target === 'debit')?.source;
        const cCol = anMapping.find(m => m.target === 'credit')?.source;

        // Détecter une colonne EXERCICE (Mode 3 : balances de clôture par année)
        const anColumns = uploadedFiles.reportAN?.columns || [];
        const normCol = (s: string) =>
          s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
        const exerciceCol = anColumns.find(c => ['exercice', 'annee', 'year', 'periode'].includes(normCol(c)));

        // Construit les lignes AN (camelCase requis par save_journal_entry et Dexie).
        // Montants négatifs basculés du côté opposé (pas de Math.abs qui déséquilibre).
        const buildAnLines = (rows: Record<string, unknown>[]) => rows.map(row => {
          const accountCode = String(numCol ? row[numCol] : '');
          let debit = parseNumber(dCol ? row[dCol] : 0);
          let credit = parseNumber(cCol ? row[cCol] : 0);
          if (debit < 0) { credit = money(credit).add(money(-debit)).toNumber(); debit = 0; }
          if (credit < 0) { debit = money(debit).add(money(-credit)).toNumber(); credit = 0; }
          return {
            id: deterministicUuid(`${tenantId}|AN|${accountCode}|${debit}|${credit}`),
            accountCode,
            accountName: String(libCol ? row[libCol] : '') || accountCode,
            label: String(libCol ? row[libCol] : 'Report AN'),
            debit,
            credit,
          };
        }).filter(l => l.debit > 0 || l.credit > 0);

        // Enregistre une écriture AN (Supabase RPC atomique ou Dexie hash-chain).
        const saveAnEntry = async (
          lines: ReturnType<typeof buildAnLines>, entryNumber: string, date: string, label: string,
        ) => {
          if (lines.length === 0) return;
          const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
          const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adapterExtAN = adapter as any;
          if (isSaasMode && supabaseClient) {
            // A7 — RPC batch pour TAGUER l'À-Nouveau avec le migration_batch_id
            // (sinon la purge du lot oublierait les écritures AN).
            const { error } = await supabaseClient.rpc('save_journal_entry_batch', {
              p_entry: { entryNumber, journal: 'AN', date, label, reference: entryNumber, status: 'validated', totalDebit, totalCredit },
              p_lines: lines,
              p_batch_id: migrationBatchId,
            });
            if (error) { report.warnings.push(t('dataMigration.warnAnIgnored', { entry: entryNumber, message: error.message })); return; }
          } else if (typeof adapterExtAN.saveJournalEntry === 'function') {
            await adapterExtAN.saveJournalEntry({
              entryNumber, journal: 'AN', date, label, reference: entryNumber,
              status: 'validated', totalDebit, totalCredit, lines,
            });
          } else {
            await safeAddEntry(adapter, {
              id: crypto.randomUUID(),
              entryNumber, journal: 'AN', date, label, reference: entryNumber,
              status: 'validated', lines, createdAt: new Date().toISOString(),
            }, { skipSyncValidation: true }); // écriture d'ouverture système, équilibre garanti
          }
          report.lines += lines.length;
          report.entries++;
          journals.add('AN');
        };

        try {
          if (migrationMode === 3 && exerciceCol) {
            // Mode 3 : une écriture AN par exercice clos → chaînage des À-Nouveaux.
            const byExercice = new Map<string, Record<string, unknown>[]>();
            for (const row of anData as Record<string, unknown>[]) {
              const exo = String(row[exerciceCol] || '').trim() || 'N-1';
              if (!byExercice.has(exo)) byExercice.set(exo, []);
              byExercice.get(exo)!.push(row);
            }
            for (const exo of [...byExercice.keys()].sort()) {
              const lines = buildAnLines(byExercice.get(exo)!);
              const y = parseInt(exo, 10);
              const date = Number.isFinite(y)
                ? `${y}-01-01`
                : (params.exerciceStart || new Date().toISOString().slice(0, 10));
              await saveAnEntry(lines, `AN-${exo}`, date, `Report à nouveau — Clôture ${exo}`);
            }
          } else {
            const anDate = params.exerciceStart || params.dateBascule || new Date().toISOString().slice(0, 10);
            await saveAnEntry(buildAnLines(anData as Record<string, unknown>[]), 'AN-MIGRATION', anDate, 'Reports a nouveau — Migration');
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : t('dataMigration.unknownError');
          report.warnings.push(t('dataMigration.warnAnIgnoredGeneric', { message: msg }));
        }
        setImportProgress(90);
      }

      // Post-import checks
      setImportLabel(t('dataMigration.labelPostChecks'));
      report.journals = journals.size;
      // C2 — l'« équilibré » ne repose plus seulement sur la simulation PRÉ-import :
      // un échec d'insertion (batch en erreur) rend le résultat non fiable.
      report.balanceOk = (simulation?.balanced ?? true) && entryErrors.length === 0;
      if (simulation) {
        const diff = money(simulation.totalActif).subtract(money(simulation.totalPassif)).abs().toNumber();
        if (migrationMode === 1) {
          // Bascule EN COURS d'exercice : Actif - Passif = résultat de la période
          // (charges classe 6 / produits classe 7 pas encore affectés). Ce n'est PAS
          // un déséquilibre — l'équilibre comptable est garanti par l'équilibre
          // global débit = crédit (report.balanceOk). On l'affiche comme cohérent
          // et on signale le résultat à titre informatif.
          report.bilanOk = report.balanceOk;
          if (diff >= 1) {
            report.bilanEcart = { actif: simulation.totalActif, passif: simulation.totalPassif, diff };
            report.bilanIsResult = true;
            report.warnings.push(t('dataMigration.warnBilanEnCours', {
              diff: diff.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
            }));
          }
        } else {
          // Modes 2/3 (début d'exercice / historique) : le résultat est affecté,
          // le bilan DOIT s'équilibrer (Actif = Passif).
          report.bilanOk = diff < 1;
          if (diff >= 1) {
            report.bilanEcart = { actif: simulation.totalActif, passif: simulation.totalPassif, diff };
            report.warnings.push(t('dataMigration.warnBilanImbalance', {
              actif: simulation.totalActif.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
              passif: simulation.totalPassif.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
              diff: diff.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
            }));
          }
        }
      } else {
        report.bilanOk = true;
      }
      report.tiersOk = report.tiers > 0 || tiersData.length === 0;
      report.vncOk = true;

      // ── Vérification réelle en base : COUNT depuis Supabase ───────────────
      setImportLabel(t('dataMigration.labelDbVerification'));
      if (isSaasMode && supabaseClient) {
        const counts = await Promise.all([
          supabaseClient.from('accounts').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabaseClient.from('journal_entries').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabaseClient.from('journal_lines').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabaseClient.from('third_parties').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          supabaseClient.from('assets').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        ]);
        report.dbCounts = {
          accounts: counts[0].count ?? 0,
          entries:  counts[1].count ?? 0,
          lines:    counts[2].count ?? 0,
          tiers:    counts[3].count ?? 0,
          assets:   counts[4].count ?? 0,
        };
        // C2 — détection d'insertion partielle : si une erreur de batch est survenue,
        // la base peut contenir moins que prévu → on le signale franchement.
        if (entryErrors.length > 0) {
          report.balanceOk = false;
          report.warnings.unshift(t('dataMigration.warnPartialBatchError', { count: String(entryErrors.length) }));
        }
      }

      setImportProgress(100);

      // Audit log — signature : logAudit(action, entityType, entityId, details)
      await logAudit(
        'DATA_MIGRATION_IMPORT',
        'migration',
        sessionId,
        `Migration ${sourceSystem || 'inconnu'}: ${report.accounts} comptes, ${report.entries} ecritures, ${report.tiers} tiers, ${report.assets} immobilisations`
      );

      // A7 — enregistrer la session de migration (traçabilité + base de la purge/ré-migration)
      if (isSaasMode && supabaseClient) {
        await supabaseClient.from('migration_sessions').upsert({
          tenant_id: tenantId, batch_id: migrationBatchId,
          mode: String(migrationMode), source_system: sourceSystem || 'sage',
          status: 'completed',
          account_count: report.accounts, third_party_count: report.tiers,
          asset_count: report.assets, entry_count: report.entries, line_count: report.lines,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id,batch_id' });
      }

      setImportReport(report);
      toast.success(t('dataMigration.toastMigrationDone'));
    } catch (err: any) {
      toast.error(t('dataMigration.toastImportError', { message: err.message || t('dataMigration.unknownError') }));
      report.warnings.push(t('dataMigration.warnFatalError', { message: String(err.message) }));
      // A7 — marquer la session en échec (le lot reste identifiable pour purge)
      try {
        if (adapter.getMode() === 'saas') {
          await (adapter as any).client?.from('migration_sessions').upsert({
            tenant_id: (adapter as any).tenantId, batch_id: migrationBatchId,
            mode: String(migrationMode), source_system: sourceSystem || 'sage',
            status: 'failed', error: String(err?.message || err),
            completed_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id,batch_id' });
        }
      } catch { /* best effort */ }
      setImportReport(report);
    } finally {
      setImporting(false);
    }
  }, [adapter, uploadedFiles, mappings, params, excludedEntries, simulation, sourceSystem, migrationMode, journalMapping, t]);

  // ─── A7 — Annuler/écraser un lot de migration (purge bornée + pré-flight) ───
  const handlePurgeBatch = useCallback(async (batchId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (adapter as any).client;
    if (adapter.getMode() !== 'saas' || !client) {
      toast.error(t('dataMigration.toastPurgeCloudOnly'));
      return;
    }
    try {
      // 1. Pré-flight (dry-run) : compter ce qui sera supprimé
      const { data: preflight, error: e1 } = await client.rpc('purge_migration_batch', { p_batch_id: batchId, p_dry_run: true });
      if (e1) { toast.error(t('dataMigration.toastPreflightFailed', { message: e1.message })); return; }
      const c = (preflight?.counts ?? {}) as Record<string, number>;
      const total = Object.values(c).reduce((s, n) => s + (Number(n) || 0), 0);
      if (total === 0) { toast(t('dataMigration.toastBatchEmpty')); return; }
      // 2. Confirmation explicite
      const ok = window.confirm(t('dataMigration.confirmPurge', {
        entries: String(c.journal_entries ?? 0),
        lines: String(c.journal_lines ?? 0),
        accounts: String(c.accounts ?? 0),
        tiers: String(c.third_parties ?? 0),
        assets: String(c.assets ?? 0),
      }));
      if (!ok) return;
      // 3. Purge effective (bornée au lot côté serveur)
      const { error: e2 } = await client.rpc('purge_migration_batch', { p_batch_id: batchId, p_dry_run: false });
      if (e2) { toast.error(t('dataMigration.toastPurgeFailed', { message: e2.message })); return; }
      toast.success(t('dataMigration.toastPurgeDone', { count: String(total) }));
      setImportReport(null);
      setCurrentStep('mode');
    } catch (err) {
      toast.error(t('dataMigration.toastPurgeError', {
        message: err instanceof Error ? err.message : t('dataMigration.unknownError'),
      }));
    }
  }, [adapter, t]);

  // ─── Navigation ────────────────────────────────────────

  const canNext = useMemo(() => {
    switch (currentStep) {
      case 'mode': return migrationMode !== null && migrationMode !== undefined; // sourceSystem est facultatif
      case 'upload': {
        // Tous les fichiers obligatoires du mode courant doivent être uploadés
        const requiredKeys = Object.entries(FILE_CONFIGS)
          .filter(([, v]) => v.requiredModes.includes(migrationMode))
          .map(([k]) => k);
        return requiredKeys.every(k => !!uploadedFiles[k]);
      }
      case 'analysis': return analysisReport ? analysisReport.errors.length === 0 : false;
      case 'mapping': return Object.keys(mappings).length > 0;
      // Tous les journaux détectés doivent avoir un type assigné (pré-rempli automatiquement).
      case 'journaux': return detectedJournals.every(j => !!journalMapping[j.code]);
      case 'parameters': return !!params.dateBascule && !!params.exerciceStart && !!params.exerciceEnd;
      case 'simulation': return simulation?.balanced ?? false;
      default: return false;
    }
  }, [currentStep, migrationMode, sourceSystem, uploadedFiles, analysisReport, mappings, params, simulation, detectedJournals, journalMapping]);

  const goNext = async () => {
    if (navBusy) return;
    setNavBusy(true);
    try {
      // Les actions pré-étape (analyse, init mapping, simulation) peuvent être
      // longues (SaaS : lecture des écritures existantes) ou échouer sur des
      // données atypiques. On les exécute SOUS contrôle pour ne JAMAIS laisser
      // le bouton « Suivant » sans effet et sans message (cf. ticket import).
      if (currentStep === 'upload') await runAnalysis();
      if (currentStep === 'analysis') initMappings();
      if (currentStep === 'mapping') detectJournals();
      if (currentStep === 'parameters') runSimulation();
      const next = STEPS[stepIndex + 1];
      if (next) setCurrentStep(next.id);
    } catch (err) {
      console.error('[Migration] Échec du passage à l\'étape suivante :', err);
      toast.error(t('dataMigration.toastCannotContinue', {
        message: err instanceof Error ? err.message : t('dataMigration.unknownError'),
      }));
    } finally {
      setNavBusy(false);
    }
  };

  const goPrev = () => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setCurrentStep(prev.id);
  };

  const availableFileKeys = useMemo(() => {
    // Source FEC : seul le Grand Livre est nécessaire (le FEC est un format de GL réglementaire)
    if (sourceSystem === 'FEC') return ['grandLivre'];
    // Sinon, on affiche tous les fichiers (obligatoires + optionnels) applicables au mode choisi
    return Object.entries(FILE_CONFIGS)
      .filter(([, v]) =>
        v.requiredModes.includes(migrationMode) ||
        v.optionalModes.includes(migrationMode)
      )
      .map(([k]) => k);
  }, [migrationMode, sourceSystem]);

  /** Retourne true si le fichier est obligatoire pour le mode courant */
  const isFileRequired = (fileKey: string): boolean => {
    return FILE_CONFIGS[fileKey]?.requiredModes.includes(migrationMode) ?? false;
  };

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="w-full space-y-6" style={{ padding: '1.5rem clamp(1rem, 2vw, 1.5rem)' }}>
      {/* Header — eyebrow gold + titre obsidien + sous-titre */}
      <header className="flex items-start gap-3">
        <button
          onClick={onBack}
          className="press shrink-0 mt-1 p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          aria-label={t('dataMigration.back')}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.6} />
        </button>
        <div>
          <div className="eyebrow-gold mb-1">{t('dataMigration.eyebrowBrand')}</div>
          <h1 style={{ fontSize: '1.625rem', letterSpacing: 0, lineHeight: 1.15, color: 'var(--color-text-primary)' }} className="font-semibold">
            {t('dataMigration.pageTitle')}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {t('dataMigration.pageSubtitle')}
          </p>
        </div>
      </header>

      {/* Stepper premium — obsidien / champagne / hairlines */}
      <nav
        aria-label={t('dataMigration.stepperAriaLabel')}
        className="surface-card flex items-center gap-1 overflow-x-auto"
        style={{ padding: '0.625rem 0.75rem' }}
      >
        {STEPS.map((step, i) => {
          const isCurrent = step.id === currentStep;
          const isDone = i < stepIndex;
          return (
            <React.Fragment key={step.id}>
              {i > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 shrink-0"
                  strokeWidth={1.5}
                  style={{ color: 'var(--color-text-quaternary)' }}
                />
              )}
              <button
                onClick={() => isDone ? setCurrentStep(step.id) : undefined}
                className="press flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors"
                style={{
                  cursor: isDone ? 'pointer' : 'default',
                  background: isCurrent ? 'var(--color-primary)' : isDone ? 'var(--color-accent-light)' : 'transparent',
                  color: isCurrent ? 'var(--color-text-inverse)' : isDone ? 'var(--color-accent-deep)' : 'var(--color-text-quaternary)',
                  fontWeight: isCurrent || isDone ? 500 : 400,
                }}
              >
                <span
                  className="inline-flex items-center justify-center num-tabular shrink-0"
                  style={{
                    width: 22, height: 22, borderRadius: '50%',
                    fontSize: 11, fontWeight: 600,
                    background: isCurrent
                      ? 'rgba(255,255,255,0.18)'
                      : isDone
                      ? 'var(--color-accent)'
                      : 'var(--color-border-light)',
                    color: isCurrent
                      ? 'var(--color-text-inverse)'
                      : isDone
                      ? 'var(--color-text-inverse)'
                      : 'var(--color-text-tertiary)',
                  }}
                >
                  {isDone ? '✓' : i + 1}
                </span>
                <span>{t(step.labelKey)}</span>
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ─── Step 1: Mode ─── */}
      {currentStep === 'mode' && (
        <div className="space-y-5">
          {/* Question clé — eyebrow gold + titre obsidien, plus de fond ambre satur */}
          <section
            className="surface-card"
            style={{ padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}
          >
            <div aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)', opacity: 0.55 }} />
            <div className="eyebrow-gold mb-2">{t('dataMigration.step1Eyebrow')}</div>
            <h2 className="font-medium" style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', letterSpacing: 0 }}>
              {t('dataMigration.step1QuestionBefore')}<span className="atlas-brand" style={{ fontSize: '1.15em', color: 'var(--color-accent-deep)' }}>Atlas FnA</span>{t('dataMigration.step1QuestionAfter')}
            </h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              {t('dataMigration.step1Intro')}
            </p>
          </section>

          <section className="surface-card" style={{ padding: '1.5rem 1.5rem 1.375rem' }}>
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="font-medium" style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>{t('dataMigration.step1SelectMode')}</h2>
              <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>{t('dataMigration.step1Options')}</span>
            </header>
            <div className="space-y-3">
            {([
              {
                mode: 2 as MigrationMode,
                title: t('dataMigration.mode2Title'),
                badge: t('dataMigration.badgeRecommendedUpper'),
                desc: t('dataMigration.mode2Desc'),
                detail: t('dataMigration.mode2Detail'),
                files: t('dataMigration.files1Required'),
                duration: t('dataMigration.mode2Duration'),
                risk: t('dataMigration.riskLow'),
                riskTone: 'success' as const,
              },
              {
                mode: 1 as MigrationMode,
                title: t('dataMigration.mode1Title'),
                badge: '',
                desc: t('dataMigration.mode1Desc'),
                detail: t('dataMigration.mode1Detail'),
                files: t('dataMigration.files1Required'),
                duration: t('dataMigration.mode1Duration'),
                risk: t('dataMigration.riskMedium'),
                riskTone: 'warning' as const,
              },
              {
                mode: 3 as MigrationMode,
                title: t('dataMigration.mode3Title'),
                badge: '',
                desc: t('dataMigration.mode3Desc'),
                detail: t('dataMigration.mode3Detail'),
                files: t('dataMigration.files3Required'),
                duration: t('dataMigration.mode3Duration'),
                risk: t('dataMigration.riskHigh'),
                riskTone: 'danger' as const,
              },
            ]).map(({ mode, title, badge, desc, detail, files, duration, risk, riskTone }) => {
              const selected = migrationMode === mode;
              const riskColors = {
                success: { bg: 'rgba(21,128,61,0.10)', color: '#15803D' },
                warning: { bg: 'rgba(232,154,46,0.14)', color: '#C77E2C' },
                danger:  { bg: 'rgba(192,50,43,0.10)',  color: '#C0322B' },
              }[riskTone];
              return (
              <button
                key={mode}
                onClick={() => setMigrationMode(mode)}
                className="w-full text-left transition-all press"
                style={{
                  padding: '1.125rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid ' + (selected ? 'var(--color-primary)' : 'var(--color-border)'),
                  background: selected ? 'var(--color-surface-hover)' : 'var(--color-surface)',
                  boxShadow: selected ? '0 0 0 1px var(--color-primary)' : 'var(--shadow-sm)',
                }}
                onMouseEnter={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'; }}
                onMouseLeave={(e) => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'; }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="shrink-0 inline-flex items-center justify-center mt-0.5"
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      border: '1.5px solid ' + (selected ? 'var(--color-primary)' : 'var(--color-border)'),
                      background: 'var(--color-surface)',
                      transition: 'border-color var(--motion-fast)',
                    }}
                  >
                    {selected && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium" style={{ fontSize: '0.9375rem', color: 'var(--color-text-primary)' }}>
                        {t('dataMigration.modePrefix')} {mode} — {title}
                      </p>
                      {badge && (
                        <span
                          className="num-tabular"
                          style={{
                            fontSize: 10,
                            background: 'rgba(21,128,61,0.10)',
                            color: '#15803D',
                            padding: '0.125rem 0.5rem',
                            borderRadius: 9999,
                            fontWeight: 600,
                            letterSpacing: '0.06em',
                            border: '1px solid rgba(15,143,95,0.20)',
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>{desc}</p>
                    {selected && (
                      <>
                        <p className="text-xs mb-3" style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.6, letterSpacing: 0 }}>
                          {detail}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="chip" style={{ padding: '0.25rem 0.625rem' }}>{files}</span>
                          <span className="chip" style={{ padding: '0.25rem 0.625rem' }}>{t('dataMigration.durationPrefix')} · {duration}</span>
                          <span
                            className="inline-flex items-center gap-1.5"
                            style={{
                              padding: '0.25rem 0.625rem',
                              borderRadius: 9999,
                              fontSize: 11,
                              fontWeight: 500,
                              background: riskColors.bg,
                              color: riskColors.color,
                            }}
                          >
                            {t('dataMigration.riskPrefix')} · {risk}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            );})}
            </div>
          </section>

          {/* Recap fichiers par mode */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t('dataMigration.recapTitle', { mode: String(migrationMode) })}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-gray-500">#</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500">{t('dataMigration.thBloc')}</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500">{t('dataMigration.thExportState')}</th>
                    <th className="pb-2 font-medium text-gray-500">{t('dataMigration.thStatus')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="py-2 pr-4 text-gray-400">1</td><td className="py-2 pr-4 font-medium">{t('dataMigration.rowPlanComptable')}</td><td className="py-2 pr-4 text-gray-600">{t('dataMigration.rowPlanComptableDesc')}</td><td className="py-2"><span className="text-green-600 font-medium text-xs">{t('dataMigration.statusRequired')}</span></td></tr>
                  <tr><td className="py-2 pr-4 text-gray-400">2</td><td className="py-2 pr-4 font-medium">{t('dataMigration.rowTiers')}</td><td className="py-2 pr-4 text-gray-600">{t('dataMigration.rowTiersDesc')}</td><td className="py-2"><span className="text-green-600 font-medium text-xs">{t('dataMigration.statusRequired')}</span></td></tr>
                  <tr><td className="py-2 pr-4 text-gray-400">3</td><td className="py-2 pr-4 font-medium">{t('dataMigration.rowReportAN')}</td><td className="py-2 pr-4 text-gray-600">{t('dataMigration.rowReportANDesc')}</td><td className="py-2"><span className="text-green-600 font-medium text-xs">{t('dataMigration.statusRequired')}</span></td></tr>
                  {(migrationMode === 1 || migrationMode === 3) && (
                    <tr className="bg-amber-50">
                      <td className="py-2 pr-4 text-amber-600 font-bold">4</td>
                      <td className="py-2 pr-4 font-semibold text-amber-900">{migrationMode === 1 ? t('dataMigration.rowEntriesCurrent') : t('dataMigration.rowEntriesPerYear')}</td>
                      <td className="py-2 pr-4 text-amber-700">{migrationMode === 1 ? t('dataMigration.rowGlCurrentDesc') : t('dataMigration.rowGlAllDesc')}</td>
                      <td className="py-2"><span className="text-amber-700 font-bold text-xs">{t('dataMigration.statusRequiredUpper')}</span></td>
                    </tr>
                  )}
                  {migrationMode === 2 && (
                    <tr className="bg-gray-50">
                      <td className="py-2 pr-4 text-gray-400">—</td>
                      <td className="py-2 pr-4 text-gray-400 line-through">{t('dataMigration.rowGlLabel')}</td>
                      <td className="py-2 pr-4 text-gray-400">{t('dataMigration.rowGlNotNeeded')}</td>
                      <td className="py-2"><span className="text-gray-400 text-xs">{t('dataMigration.statusNotRequired')}</span></td>
                    </tr>
                  )}
                  <tr><td className="py-2 pr-4 text-gray-400">{migrationMode === 2 ? '4' : migrationMode === 1 ? '5' : '8'}</td><td className="py-2 pr-4 font-medium">{t('dataMigration.rowImmo')}</td><td className="py-2 pr-4 text-gray-600">{t('dataMigration.rowImmoDesc')}</td><td className="py-2"><span className="text-green-600 font-medium text-xs">{t('dataMigration.statusRequired')}</span></td></tr>
                </tbody>
              </table>
            </div>

            {migrationMode === 2 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800"><strong>{t('dataMigration.infoMode2Title')}</strong> {t('dataMigration.infoMode2Text')}</p>
              </div>
            )}
            {migrationMode === 1 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800"><strong>{t('dataMigration.infoMode1Title')}</strong> {t('dataMigration.infoMode1Text')}</p>
              </div>
            )}
            {migrationMode === 3 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800"><strong>{t('dataMigration.infoMode3Title')}</strong> {t('dataMigration.infoMode3Text')}</p>
              </div>
            )}
          </div>

          {/* Regles de format */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">{t('dataMigration.formatRulesTitle')}</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">{t('dataMigration.fmtSeparator')}</span><span className="font-mono font-medium">{t('dataMigration.fmtSeparatorValue')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('dataMigration.fmtEncoding')}</span><span className="font-mono font-medium">UTF-8</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('dataMigration.fmtFirstRow')}</span><span className="font-medium">{t('dataMigration.fmtFirstRowValue')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('dataMigration.fmtDates')}</span><span className="font-mono font-medium">{t('dataMigration.fmtDatesValue')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('dataMigration.fmtAmounts')}</span><span className="font-mono font-medium">{t('dataMigration.fmtAmountsValue')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">{t('dataMigration.fmtDecimals')}</span><span className="font-mono font-medium">{t('dataMigration.fmtDecimalsValue')}</span></div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('dataMigration.sourceSoftwareTitle')}</h2>
            <div className="grid grid-cols-4 gap-3">
              {SOURCE_SYSTEMS.map(sys => (
                <button
                  key={sys}
                  onClick={() => setSourceSystem(sys)}
                  className={`p-3 rounded-lg border-2 text-center font-medium text-sm transition-colors ${
                    sourceSystem === sys ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {sys}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 2: Upload ─── */}
      {currentStep === 'upload' && (
        <div className="space-y-4">
          {/* Flux recommandé : UN seul classeur multi-feuilles pour le mode */}
          <div className="bg-white border-2 rounded-xl p-6" style={{ borderColor: 'var(--color-primary, #15803D)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div className="flex-1 min-w-[260px]">
                <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 flex-wrap">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  {t('dataMigration.workbookTitle', { mode: String(migrationMode) })} — {getModeTemplate(migrationMode as MigrationModeId).title}
                  {getModeTemplate(migrationMode as MigrationModeId).recommended && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      {t('dataMigration.badgeRecommended')}
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-500">
                  {t('dataMigration.workbookIntro1')}<strong>{t('dataMigration.workbookIntroStrong')}</strong>{t('dataMigration.workbookIntro2')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadModeTemplate(migrationMode as MigrationModeId)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
              >
                <Download className="w-4 h-4" /> {t('dataMigration.downloadModeTemplate', { mode: String(migrationMode) })}
              </button>
            </div>

            <input
              ref={el => { modeWorkbookInputRef.current = el; }}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleModeWorkbookUpload(f); e.target.value = ''; }}
            />
            <button
              type="button"
              onClick={() => modeWorkbookInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleModeWorkbookUpload(f); }}
              className="w-full py-8 border-2 border-dashed border-emerald-300 rounded-lg text-center text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
              {t('dataMigration.dropWorkbook')}
            </button>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-600">{t('dataMigration.templateSheets')}</span>
              {getModeTemplate(migrationMode as MigrationModeId).sheets.map(s => (
                <span
                  key={s.sheetName}
                  className={`px-2 py-0.5 rounded-full border ${
                    s.required
                      ? 'bg-red-50 text-red-700 border-red-200 font-medium'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}
                >
                  {s.sheetName}{s.required ? ' *' : ''}
                </span>
              ))}
              <span className="text-gray-400">{t('dataMigration.requiredMarkerNote')}</span>
            </div>

            {/* Confirmation persistante : feuilles effectivement chargées (le toast
                disparaît ; sans ce récap l'utilisateur ne sait pas si le GL est prêt). */}
            {Object.keys(uploadedFiles).length > 0 && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-800 mb-1">
                  <CheckCircle className="w-4 h-4" /> {t('dataMigration.dataLoadedReady')}
                </div>
                <ul className="flex flex-wrap gap-2 text-xs">
                  {Object.entries(uploadedFiles).map(([key, uf]) => (
                    <li key={key} className="px-2 py-1 rounded bg-white border border-green-200 text-green-700">
                      {FILE_CONFIGS[key] ? t(FILE_CONFIGS[key].labelKey) : key} — <strong>{uf.data.length}</strong> {t('dataMigration.rowsSuffix')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Repli : préparation fichier-par-fichier (sources externes hétérogènes) */}
          <details className="bg-white border rounded-xl">
            <summary className="cursor-pointer px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900">
              {t('dataMigration.separateFilesSummary')}
            </summary>
            <div className="px-6 pb-6 pt-2 space-y-4">
          {/* Bandeau téléchargement des modèles Excel */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 mb-1">{t('dataMigration.templatesBannerTitle')}</p>
                <p className="text-xs text-amber-700 mb-3">{t('dataMigration.templatesBannerText')}</p>
                <div className="flex flex-wrap gap-2">
                  {availableFileKeys.map(key => {
                    const config = FILE_CONFIGS[key];
                    if (!config.templateKey) return null;
                    const tpl = getTemplate(config.templateKey as TemplateKey);
                    if (!tpl) return null;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => downloadTemplate(tpl, { societeName: 'Atlas', year: new Date().getFullYear() })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg text-xs font-medium text-amber-800 transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {t(config.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t('dataMigration.filesToImportTitle', { mode: String(migrationMode), system: sourceSystem })}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableFileKeys.map(key => {
                const config = FILE_CONFIGS[key];
                const uf = uploadedFiles[key];
                const required = isFileRequired(key);
                return (
                  <div key={key} className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    uf
                      ? 'border-green-300 bg-green-50'
                      : required
                        ? 'border-red-300 bg-red-50/30 hover:border-red-400'
                        : 'border-gray-300 bg-gray-50/30 hover:border-gray-400'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-gray-700">
                        {config.icon}
                        <span className="font-medium text-sm">{t(config.labelKey)}</span>
                        {required ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            {t('dataMigration.badgeRequired')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            {t('dataMigration.badgeRecommended')}
                          </span>
                        )}
                      </div>
                      {config.templateKey && (
                        <button
                          type="button"
                          onClick={() => {
                            const tpl = getTemplate(config.templateKey as TemplateKey);
                            if (tpl) {
                              downloadTemplate(tpl, {
                                societeName: 'Atlas',
                                year: new Date().getFullYear(),
                              });
                            }
                          }}
                          className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                          title={t('dataMigration.downloadTemplateTitle')}
                        >
                          <Download className="w-3 h-3" /> {t('dataMigration.downloadTemplate')}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{t(config.descKey)}</p>

                    {uf ? (
                      <div className="flex items-center justify-between bg-white rounded p-2 border">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{uf.file.name}</p>
                          <p className="text-gray-500">{t('dataMigration.fileStats', { size: formatSize(uf.file.size), rows: String(uf.data.length), cols: String(uf.columns.length) })}</p>
                        </div>
                        <button onClick={() => removeFile(key)} className="p-1 hover:bg-red-50 rounded text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileInputRefs.current[key]?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(key, f); }}
                        className="w-full py-6 text-center text-sm text-gray-400 hover:text-gray-600"
                      >
                        <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        {t('dataMigration.dropOrBrowse')}
                        <input
                          ref={el => { fileInputRefs.current[key] = el; }}
                          type="file"
                          accept={config.accept}
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(key, f); }}
                        />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          </details>
        </div>
      )}

      {/* ─── Step 3: Analysis ─── */}
      {currentStep === 'analysis' && analysisReport && (
        <div className="space-y-4">
          {/* Panneau Plan Comptable auto-généré */}
          {generatedPC && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-green-900 mb-1">
                    {t('dataMigration.pcGeneratedTitle')}
                  </h3>
                  <p className="text-xs text-green-800 mb-3">
                    {t('dataMigration.pcGeneratedText1')}
                    <strong>{t('dataMigration.pcGeneratedCount', { count: String(generatedPC.extracted) })}</strong>
                    {t('dataMigration.pcGeneratedText2')}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-lg font-bold text-green-900">{generatedPC.enrichedFromSyscohada}</p>
                      <p className="text-[10px] text-green-700">{t('dataMigration.pcEnrichedSyscohada')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-lg font-bold text-green-900">{generatedPC.enrichedFromGL}</p>
                      <p className="text-[10px] text-green-700">{t('dataMigration.pcEnrichedGl')}</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-lg font-bold text-green-900">{generatedPC.inferred}</p>
                      <p className="text-[10px] text-green-700">{t('dataMigration.pcInferred')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const wb = XLSX.utils.book_new();
                        const rows = toXlsxRows(generatedPC);
                        const ws = XLSX.utils.json_to_sheet(rows);
                        XLSX.utils.book_append_sheet(wb, ws, 'Plan Comptable');
                        const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                        const blob = new Blob([out instanceof ArrayBuffer ? out : new Uint8Array(out).buffer], {
                          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `plan_comptable_genere_${new Date().toISOString().slice(0, 10)}.xlsx`;
                        a.click();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                        toast.success(t('dataMigration.toastPcDownloaded'));
                      } catch (e) { /* silent */
                        toast.error(t('dataMigration.toastDownloadError'));
                      }
                    }}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-100 inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" /> {t('dataMigration.pcDownloadBtn')}
                  </button>
                </div>
              </div>

              {/* Aperçu des premiers comptes */}
              {generatedPC.accounts.length > 0 && (
                <div className="mt-4 bg-white rounded-lg border border-green-100 overflow-hidden">
                  <div className="px-3 py-2 bg-green-100/50 border-b border-green-100">
                    <p className="text-[11px] font-semibold text-green-900">
                      {t('dataMigration.pcPreview', { count: String(Math.min(10, generatedPC.accounts.length)) })}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-green-50 text-green-900">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-semibold">{t('dataMigration.thNumero')}</th>
                          <th className="text-left px-3 py-1.5 font-semibold">{t('dataMigration.thLibelle')}</th>
                          <th className="text-center px-2 py-1.5 font-semibold">{t('dataMigration.thClasse')}</th>
                          <th className="text-center px-2 py-1.5 font-semibold">{t('dataMigration.thSens')}</th>
                          <th className="text-center px-2 py-1.5 font-semibold">{t('dataMigration.thSource')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedPC.accounts.slice(0, 10).map(acc => (
                          <tr key={acc.numero} className="border-t border-green-50">
                            <td className="px-3 py-1.5 font-mono text-gray-700">{acc.numero}</td>
                            <td className="px-3 py-1.5 text-gray-700">{acc.libelle}</td>
                            <td className="px-2 py-1.5 text-center text-gray-600">{acc.classe}</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                acc.sens === 'D' ? 'bg-blue-100 text-blue-700' :
                                acc.sens === 'C' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>{acc.sens}</span>
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                acc.source === 'syscohada' ? 'bg-green-100 text-green-700' :
                                acc.source === 'gl' ? 'bg-blue-100 text-blue-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                                {acc.source === 'syscohada' ? 'SYSCOHADA' : acc.source === 'gl' ? 'GL' : t('dataMigration.srcInferred')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {generatedPC.accounts.length > 10 && (
                    <div className="px-3 py-1.5 bg-green-50/50 border-t border-green-100 text-[10px] text-green-700 text-center">
                      {t('dataMigration.pcMoreAccounts', { count: String(generatedPC.accounts.length - 10) })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t('dataMigration.analysisTitle')}</h2>
            <div className="grid grid-cols-5 gap-4 mb-6">
              {[
                { label: t('dataMigration.kpiAccounts'), value: analysisReport.accounts, icon: <BookOpen className="w-5 h-5" /> },
                { label: t('dataMigration.kpiTiers'), value: analysisReport.tiers, icon: <Users className="w-5 h-5" /> },
                { label: t('dataMigration.kpiEntries'), value: analysisReport.entries, icon: <FileText className="w-5 h-5" /> },
                { label: t('dataMigration.kpiLines'), value: analysisReport.lines, icon: <BarChart3 className="w-5 h-5" /> },
                { label: t('dataMigration.kpiAssets'), value: analysisReport.assets, icon: <Package className="w-5 h-5" /> },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="flex justify-center text-gray-400 mb-1">{item.icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(item.value)}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            {analysisReport.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <XCircle className="w-5 h-5" /> {t('dataMigration.blockingErrors', { count: String(analysisReport.errors.length) })}
                </h3>
                <div className="space-y-2">
                  {analysisReport.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">{err.message}</p>
                        {err.details && <p className="text-xs text-red-600 mt-0.5">{err.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisReport.warnings.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
                  <AlertTriangle className="w-5 h-5" /> {t('dataMigration.warningsTitle', { count: String(analysisReport.warnings.length) })}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {analysisReport.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-amber-800">{w.message}</p>
                        {w.details && <p className="text-xs text-amber-600 mt-0.5">{w.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisReport.errors.length === 0 && analysisReport.warnings.length === 0 && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-medium">{t('dataMigration.allChecksPassed')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 4: Mapping ─── */}
      {currentStep === 'mapping' && (
        <div className="space-y-4">
          {Object.entries(mappings).map(([fileKey, cols]) => {
            const uf = uploadedFiles[fileKey];
            if (!uf) return null;
            return (
              <div key={fileKey} className="bg-white border rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {FILE_CONFIGS[fileKey] ? t(FILE_CONFIGS[fileKey].labelKey) : fileKey} — {t('dataMigration.mappingTitleSuffix')}
                </h3>
                <div className="space-y-2">
                  {cols.map((col, ci) => (
                    <div key={ci} className="flex items-center gap-4">
                      <div className="w-1/3 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{col.targetLabel}</span>
                        {col.required && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">{t('dataMigration.tagRequired')}</span>}
                        {!col.required && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t('dataMigration.tagOptional')}</span>}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                      <select
                        value={col.source}
                        onChange={e => {
                          const updated = [...cols];
                          updated[ci] = { ...col, source: e.target.value };
                          setMappings(prev => ({ ...prev, [fileKey]: updated }));
                        }}
                        className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      >
                        <option value="">{t('dataMigration.selectPlaceholder')}</option>
                        {uf.columns.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {accountMappings.length > 0 && (
            <div className="bg-white border rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-3">{t('dataMigration.accountCheckTitle')}</h3>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {accountMappings.map((am, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-1.5 rounded text-sm ${
                    am.status === 'ok' ? 'bg-green-50' : am.status === 'warning' ? 'bg-amber-50' : 'bg-red-50'
                  }`}>
                    {am.status === 'ok' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                     <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    <span className="font-mono">{am.sourceAccount}</span>
                    <span className="text-gray-500">{am.sourceLabel}</span>
                    {am.status !== 'ok' && (
                      <input
                        value={am.suggestedAccount}
                        onChange={e => {
                          const updated = [...accountMappings];
                          updated[i] = { ...am, suggestedAccount: e.target.value };
                          setAccountMappings(updated);
                        }}
                        className="ml-auto w-28 border rounded px-2 py-0.5 text-sm font-mono"
                        placeholder={t('dataMigration.newNumberPlaceholder')}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Step : Journaux (rapprochement source → type standard) ─── */}
      {currentStep === 'journaux' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1">{t('dataMigration.journalsTitle')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {t('dataMigration.journalsIntro')}
            </p>

            {detectedJournals.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                {t('dataMigration.noJournalsDetected')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-4">{t('dataMigration.thJournalSource')}</th>
                      <th className="py-2 pr-4 text-center">{t('dataMigration.thEntries')}</th>
                      <th className="py-2 pr-4">{t('dataMigration.thAccountsSample')}</th>
                      <th className="py-2 pr-4">{t('dataMigration.thStandardType')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectedJournals.map(j => {
                      const isAuto = journalMapping[j.code] === j.proposed;
                      return (
                        <tr key={j.code} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-mono font-medium text-gray-900">{j.code}</td>
                          <td className="py-2 pr-4 text-center text-gray-600">{j.count}</td>
                          <td className="py-2 pr-4 text-xs text-gray-400 font-mono">{j.sampleAccounts.join(', ') || '—'}</td>
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <select
                                value={journalMapping[j.code] ?? j.proposed}
                                onChange={e => setJournalMapping(prev => ({ ...prev, [j.code]: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                              >
                                {JOURNAL_TYPES.map(jt => (
                                  <option key={jt.code} value={jt.code}>{jt.code} — {t(jt.labelKey)}</option>
                                ))}
                              </select>
                              {isAuto && (
                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {t('dataMigration.tagAuto')}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  {JOURNAL_TYPES.map(jt => {
                    const n = detectedJournals.filter(j => (journalMapping[j.code] ?? j.proposed) === jt.code).length;
                    if (n === 0) return null;
                    return (
                      <span key={jt.code} className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200 text-gray-600">
                        {t(jt.labelKey)} : <strong>{n}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 5: Parameters ─── */}
      {currentStep === 'parameters' && (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" /> {t('dataMigration.paramsTitle')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('dataMigration.labelDateBascule')}</label>
              <input type="date" value={params.dateBascule}
                onChange={e => setParams(p => ({ ...p, dateBascule: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('dataMigration.labelFyStart')}</label>
              <input type="date" value={params.exerciceStart}
                onChange={e => setParams(p => ({ ...p, exerciceStart: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('dataMigration.labelFyEnd')}</label>
              <input type="date" value={params.exerciceEnd}
                onChange={e => setParams(p => ({ ...p, exerciceEnd: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataMigration.labelEntryStatus')}</label>
            <div className="flex gap-4">
              {[
                { val: 'validated' as const, label: t('dataMigration.optValidated') },
                { val: 'draft' as const, label: t('dataMigration.optDraft') },
              ].map(opt => (
                <button key={opt.val} onClick={() => setParams(p => ({ ...p, entryStatus: opt.val }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium ${
                    params.entryStatus === opt.val ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    params.entryStatus === opt.val ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    {params.entryStatus === opt.val && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('dataMigration.labelLettrage')}</label>
            <div className="flex gap-4">
              {[
                { val: true, label: t('dataMigration.optLettrageYes') },
                { val: false, label: t('dataMigration.optLettrageNo') },
              ].map(opt => (
                <button key={String(opt.val)} onClick={() => setParams(p => ({ ...p, lettrage: opt.val }))}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium ${
                    params.lettrage === opt.val ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    params.lettrage === opt.val ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    {params.lettrage === opt.val && <div className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">{t('dataMigration.existingDataTitle')}</p>
              <p className="text-sm text-amber-700 mt-1">{t('dataMigration.existingDataText')}</p>
              <div className="flex gap-3 mt-2">
                {[
                  { val: 'merge' as const, label: t('dataMigration.optMerge') },
                  { val: 'replace' as const, label: t('dataMigration.optReplace') },
                  { val: 'cancel' as const, label: t('dataMigration.optCancel') },
                ].map(opt => (
                  <button key={opt.val} onClick={() => setParams(p => ({ ...p, existingDataAction: opt.val }))}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      params.existingDataAction === opt.val ? 'bg-amber-200 text-amber-900' : 'bg-white text-amber-700 border border-amber-300'
                    }`}
                  >{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 6: Simulation ─── */}
      {currentStep === 'simulation' && simulation && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">{t('dataMigration.simTitle')}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`rounded-lg p-4 text-center ${simulation.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">{t('dataMigration.simTotalDebit')}</p>
                <p className="text-lg font-bold">{simulation.totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${simulation.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">{t('dataMigration.simTotalCredit')}</p>
                <p className="text-lg font-bold">{simulation.totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg p-4 text-center bg-blue-50 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">{t('dataMigration.simEstActif')}</p>
                <p className="text-lg font-bold">{simulation.totalActif.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg p-4 text-center bg-blue-50 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">{t('dataMigration.simEstPassif')}</p>
                <p className="text-lg font-bold">{simulation.totalPassif.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {Object.entries(simulation.counts).map(([key, val]) => {
                const COUNT_LABELS: Record<string, string> = {
                  comptes: t('dataMigration.cntAccounts'),
                  tiers: t('dataMigration.cntTiers'),
                  ecritures: t('dataMigration.cntEntries'),
                  reportAN: t('dataMigration.cntRan'),
                  immobilisations: t('dataMigration.cntAssets'),
                };
                return (
                  <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-gray-900">{val}</p>
                    <p className="text-xs text-gray-500">{COUNT_LABELS[key] ?? key}</p>
                  </div>
                );
              })}
            </div>

            <div className={`flex items-center justify-between rounded-lg p-4 ${simulation.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {simulation.balanced ?
                  <CheckCircle className="w-5 h-5 text-green-600" /> :
                  <XCircle className="w-5 h-5 text-red-600" />}
                <span className={`font-medium ${simulation.balanced ? 'text-green-700' : 'text-red-700'}`}>
                  {simulation.balanced ? t('dataMigration.simBalancedOk') : t('dataMigration.simUnbalanced')}
                </span>
              </div>
              <span className="text-sm text-gray-500">{t('dataMigration.simEstimatedTime', { seconds: String(simulation.estimatedTime) })}</span>
            </div>

            {!simulation.balanced && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">{t('dataMigration.simImbalanceDetail')}</p>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div className="bg-white rounded p-2 border border-red-100 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">{t('dataMigration.simTotalDebit')}</p>
                        <p className="font-mono font-semibold text-gray-900">{simulation.totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-red-100 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">{t('dataMigration.simTotalCredit')}</p>
                        <p className="font-mono font-semibold text-gray-900">{simulation.totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-red-100 rounded p-2 border border-red-300 text-center">
                        <p className="text-xs text-red-700 mb-0.5">{t('dataMigration.simVariance')}</p>
                        <p className="font-mono font-bold text-red-800">{Math.abs(simulation.totalDebit - simulation.totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-red-600">{simulation.totalDebit > simulation.totalCredit ? t('dataMigration.simDebitExcess') : t('dataMigration.simCreditExcess')}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-red-700 mb-2">{t('dataMigration.simHowToFix')}</p>
                    <ul className="text-sm text-red-700 space-y-1.5 list-none">
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">1.</span><span>{t('dataMigration.simFix1a')}<strong>{t('dataMigration.simFix1Strong')}</strong>{t('dataMigration.simFix1b')}</span></li>
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">2.</span><span>{t('dataMigration.simFix2a')}<strong>{Math.abs(simulation.totalDebit - simulation.totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA</strong>{t('dataMigration.simFix2b')}</span></li>
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">3.</span><span>{t('dataMigration.simFix3')}</span></li>
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">4.</span><span>{t('dataMigration.simFix4a')}<strong>FEC</strong>{t('dataMigration.simFix4b')}</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {simulation.assetVNC > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <span className="font-medium text-blue-800">{t('dataMigration.simAssetVnc')}</span>
                <span className="text-blue-700">{simulation.assetVNC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 7: Import & Report ─── */}
      {currentStep === 'importing' && !importReport && (
        <div className="bg-white border rounded-xl p-8">
          {!importing ? (
            <div className="text-center space-y-4">
              <Play className="w-12 h-12 text-red-500 mx-auto" />
              <h2 className="text-xl font-semibold text-gray-900">{t('dataMigration.readyToImport')}</h2>
              <p className="text-gray-500">{t('dataMigration.readyToImportText')}</p>
              <button onClick={runImport}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                {t('dataMigration.runRealImport')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                <h2 className="text-lg font-semibold text-gray-900">{t('dataMigration.importInProgress')}</h2>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div className="bg-red-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }} />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{importLabel}</span>
                <span>{importProgress}%</span>
              </div>
            </div>
          )}
        </div>
      )}

      {currentStep === 'importing' && importReport && (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('dataMigration.migrationDone')}</h2>
                <p className="text-sm text-gray-500">{t('dataMigration.migrationReportSubtitle')}</p>
              </div>
            </div>

            {/* Bandeau de confirmation comptable */}
            {(() => {
              const allOk = importReport.balanceOk && importReport.bilanOk && importReport.tiersOk && importReport.vncOk && importReport.warnings.filter(w => w.startsWith(t('dataMigration.warnFatalErrorPrefix'))).length === 0;
              const db = importReport.dbCounts;
              return allOk ? (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-green-800 text-base">{t('dataMigration.dataConfirmed')}</p>
                      <p className="text-sm text-green-700 mt-1 mb-3">{t('dataMigration.allControlsOk')}</p>
                      {db && (
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { label: t('dataMigration.dbAccounts'), value: db.accounts },
                            { label: t('dataMigration.dbEntries'),  value: db.entries },
                            { label: t('dataMigration.dbLines'),    value: db.lines },
                            { label: t('dataMigration.dbTiers'),    value: db.tiers },
                            { label: t('dataMigration.dbAssets'),   value: db.assets },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white rounded-lg p-2 text-center border border-green-200">
                              <p className="text-lg font-bold text-green-800">{value.toLocaleString('fr-FR')}</p>
                              <p className="text-xs text-green-600">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-amber-800">{t('dataMigration.migrationDoneWithWarnings')}</p>
                      <p className="text-sm text-amber-700 mt-1 mb-3">
                        {t('dataMigration.migrationWarningsText')}
                      </p>
                      {db && (
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { label: t('dataMigration.dbAccounts'), value: db.accounts },
                            { label: t('dataMigration.dbEntries'),  value: db.entries },
                            { label: t('dataMigration.dbLines'),    value: db.lines },
                            { label: t('dataMigration.dbTiers'),    value: db.tiers },
                            { label: t('dataMigration.dbAssets'),   value: db.assets },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-white rounded-lg p-2 text-center border border-amber-200">
                              <p className="text-lg font-bold text-amber-800">{value.toLocaleString('fr-FR')}</p>
                              <p className="text-xs text-amber-600">{label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: t('dataMigration.kpiAccounts'), value: importReport.accounts },
                { label: t('dataMigration.kpiJournals'), value: importReport.journals },
                { label: t('dataMigration.kpiTiers'), value: importReport.tiers },
                { label: t('dataMigration.kpiEntries'), value: importReport.entries },
                { label: t('dataMigration.kpiLines'), value: importReport.lines },
                { label: t('dataMigration.kpiAssets'), value: importReport.assets },
                { label: t('dataMigration.kpiLettrages'), value: importReport.lettrages },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{formatNumber(item.value)}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">{t('dataMigration.postImportChecks')}</h3>
            <div className="space-y-2 mb-6">
              {[
                { label: t('dataMigration.chkBalance'), ok: importReport.balanceOk },
                { label: importReport.bilanIsResult && importReport.bilanEcart
                    ? t('dataMigration.chkBilanResult', {
                        diff: importReport.bilanEcart.diff.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
                        actif: importReport.bilanEcart.actif.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
                        passif: importReport.bilanEcart.passif.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
                      })
                    : importReport.bilanEcart
                    ? t('dataMigration.chkBilanEcart', {
                        actif: importReport.bilanEcart.actif.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
                        passif: importReport.bilanEcart.passif.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
                        diff: importReport.bilanEcart.diff.toLocaleString('fr-FR', { minimumFractionDigits: 2 }),
                      })
                    : t('dataMigration.chkBilan'),
                  ok: importReport.bilanOk },
                { label: t('dataMigration.chkTiers'), ok: importReport.tiersOk },
                { label: t('dataMigration.chkVnc'), ok: importReport.vncOk },
              ].map(check => (
                <div key={check.label} className={`flex items-center gap-2 p-2 rounded ${check.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  {check.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm font-medium ${check.ok ? 'text-green-800' : 'text-red-800'}`}>{check.label}</span>
                </div>
              ))}
            </div>

            {importReport.migrationBatchId && (
              <div className="mb-6 flex items-center justify-between gap-3 flex-wrap bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-sm text-slate-600">
                  <span className="font-medium text-slate-700">{t('dataMigration.batchLabel')}</span>{' '}
                  <code className="text-xs bg-white px-1.5 py-0.5 rounded border">{importReport.migrationBatchId}</code>
                  <p className="text-xs text-slate-400 mt-1">{t('dataMigration.batchNote')}</p>
                </div>
                <button
                  onClick={() => handlePurgeBatch(importReport.migrationBatchId!)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  title={t('dataMigration.purgeBtnTitle')}
                >
                  <Trash2 className="w-4 h-4" /> {t('dataMigration.purgeBtn')}
                </button>
              </div>
            )}

            {importReport.warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-amber-700 mb-2">{t('dataMigration.attentionPoints', { count: String(importReport.warnings.length) })}</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importReport.warnings.map((w, i) => (
                    <div key={i} className="flex items-center gap-2 bg-amber-50 p-2 rounded text-sm text-amber-800">
                      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      {w}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onBack}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
              >
                {t('dataMigration.backToAdmin')}
              </button>
              <button onClick={async () => {
                if (!importReport) return;
                toast.info(t('dataMigration.toastGeneratingPdf'));
                try {
                  const { default: jsPDF } = await import('jspdf');
                  const { default: autoTable } = await import('jspdf-autotable');
                  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                  const W = 210; const M = 14; const now = new Date().toLocaleString('fr-FR');
                  const PETROL: [number,number,number] = [35, 90, 110];
                  const GREEN:  [number,number,number] = [22, 101, 52];
                  const AMBER:  [number,number,number] = [146, 64, 14];
                  const RED:    [number,number,number] = [153, 27, 27];
                  const db = importReport.dbCounts;
                  // Assainit les chaînes pour la police WinAnsi de jsPDF : ✓ ✗ ⚠ ≠ − — • → guillemets
                  // typographiques ET l'espace insécable des nombres fr-FR (U+202F/U+00A0) sortent du charset
                  // → charabia ("1 0 / 3 1 9", "&B&a&s..."). On remplace par des équivalents ASCII/Latin-1.
                  const clean = (s: unknown): string => String(s ?? '')
                    .replace(/[✓✔]/g, 'OK').replace(/[✕✖✗✘]/g, 'X')
                    .replace(/[⚠⚡]/g, '(!)').replace(/[−–—]/g, '-')
                    .replace(/≠/g, '!=').replace(/[•●▪]/g, '-')
                    .replace(/[→➙➡]/g, '->').replace(/[‘’‛]/g, "'")
                    .replace(/[“”]/g, '"').replace(/…/g, '...').replace(/[  ]/g, ' ')
                    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, '');
                  const fmt = (n: number) => clean(n.toLocaleString('fr-FR'));
                  const fmtF = (n: number) => clean(n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })) + ' FCFA';
                  // Anomalies réelles (hors note d'équilibre bilan en cours d'exercice, qui est normale).
                  const realWarnings = importReport.warnings.filter(w => !w.startsWith(t('dataMigration.warnBilanImbalancePrefix')));
                  // Perte de données : moins d'enregistrements confirmés en base qu'importés.
                  const countLoss = !!db && (
                    db.accounts < importReport.accounts || db.tiers < importReport.tiers ||
                    db.entries < importReport.entries || db.lines < importReport.lines ||
                    db.assets < importReport.assets
                  );
                  // « VALIDÉE » UNIQUEMENT si les 4 contrôles passent ET zéro anomalie ET zéro perte de données.
                  const allOk = importReport.balanceOk && importReport.bilanOk && importReport.tiersOk
                    && importReport.vncOk && realWarnings.length === 0 && !countLoss;

                  // Humaniser les messages techniques
                  const humanize = (w: string): { msg: string; action: string } => {
                    if (w.includes('validated') || w.includes('Suppression interdite')) return { msg: t('dataMigration.pdfHumValidatedMsg'), action: t('dataMigration.pdfHumValidatedAction') };
                    if (w.includes('duplicate key') || w.includes('unique constraint')) return { msg: t('dataMigration.pdfHumDuplicateMsg'), action: t('dataMigration.pdfHumDuplicateAction') };
                    if (w.includes('foreign key') || w.includes('fkey')) return { msg: t('dataMigration.pdfHumForeignKeyMsg'), action: t('dataMigration.pdfHumForeignKeyAction') };
                    if (w.includes(t('dataMigration.warnBilanImbalancePrefix')) || w.includes('bilanEcart')) return { msg: w, action: t('dataMigration.pdfHumBilanAction') };
                    if (w.includes('non insérés') || w.includes('batch')) { const m = w.match(/(\d+) non insérés/); return { msg: t('dataMigration.pdfHumBatchMsg', { count: m?.[1] || t('dataMigration.pdfHumSome') }), action: t('dataMigration.pdfHumBatchAction') }; }
                    if (w.includes(t('dataMigration.warnAnIgnoredMarker'))) return { msg: t('dataMigration.pdfHumAnMsg'), action: t('dataMigration.pdfHumAnAction') };
                    return { msg: w, action: t('dataMigration.pdfHumDefaultAction') };
                  };

                  // ── BANNIÈRE STATUT ──────────────────────────────────────
                  doc.setFillColor(...(allOk ? GREEN : AMBER));
                  doc.rect(0, 0, W, 28, 'F');
                  doc.setTextColor(255, 255, 255);
                  doc.setFontSize(17); doc.setFont('helvetica', 'bold');
                  doc.text(clean(t('dataMigration.pdfTitle')), M, 11);
                  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
                  doc.text(clean(t('dataMigration.pdfMeta', { date: now })), M, 18);
                  doc.text(clean(t('dataMigration.pdfStatus', {
                    status: allOk ? t('dataMigration.pdfStatusOk') : t('dataMigration.pdfStatusWarn'),
                  })), M, 24);
                  doc.setTextColor(0, 0, 0);

                  // ── DONNÉES EN BASE (vrais counts) ───────────────────────
                  let y = 36;
                  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PETROL);
                  doc.text(clean(t('dataMigration.pdfSection1')), M, y); y += 5;
                  autoTable(doc, {
                    startY: y,
                    head: [[clean(t('dataMigration.pdfThBook')), clean(t('dataMigration.pdfThImported')), clean(t('dataMigration.pdfThConfirmed'))]],
                    body: [
                      [clean(t('dataMigration.pdfRowAccounts')),   fmt(importReport.accounts),  db ? fmt(db.accounts) : '—'],
                      [clean(t('dataMigration.pdfRowJournals')),   fmt(importReport.journals),  '—'],
                      [clean(t('dataMigration.pdfRowTiers')),      fmt(importReport.tiers),     db ? fmt(db.tiers) : '—'],
                      [clean(t('dataMigration.pdfRowEntries')),    fmt(importReport.entries),   db ? fmt(db.entries) : '—'],
                      [clean(t('dataMigration.pdfRowLines')),      fmt(importReport.lines),     db ? fmt(db.lines) : '—'],
                      [clean(t('dataMigration.pdfRowAssets')),     fmt(importReport.assets),    db ? fmt(db.assets) : '—'],
                      [clean(t('dataMigration.pdfRowLettrages')),  fmt(importReport.lettrages), '—'],
                    ],
                    styles: { fontSize: 9, cellPadding: 2.5 },
                    headStyles: { fillColor: PETROL, textColor: [255,255,255], fontStyle: 'bold' },
                    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
                    alternateRowStyles: { fillColor: [245, 247, 249] },
                    margin: { left: M, right: M },
                  });

                  // ── CONTRÔLES SYSCOHADA ──────────────────────────────────
                  y = (doc as any).lastAutoTable.finalY + 8;
                  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PETROL);
                  doc.text(clean(t('dataMigration.pdfSection2')), M, y); y += 5;
                  const controls = [
                    { label: t('dataMigration.pdfCtrlBalance'), ok: importReport.balanceOk, detail: importReport.balanceOk ? t('dataMigration.pdfCtrlBalanceOk') : t('dataMigration.pdfCtrlBalanceKo'), action: importReport.balanceOk ? '' : t('dataMigration.pdfCtrlBalanceAction') },
                    { label: t('dataMigration.pdfCtrlBilan'), ok: importReport.bilanOk,
                      detail: importReport.bilanIsResult
                        ? t('dataMigration.pdfCtrlBilanResult', { diff: fmtF(importReport.bilanEcart?.diff ?? 0) })
                        : importReport.bilanOk
                          ? t('dataMigration.pdfCtrlBilanOk')
                          : t('dataMigration.pdfCtrlBilanKo', {
                              actif: fmtF(importReport.bilanEcart?.actif ?? 0),
                              passif: fmtF(importReport.bilanEcart?.passif ?? 0),
                              diff: fmtF(importReport.bilanEcart?.diff ?? 0),
                            }),
                      action: importReport.bilanOk ? '' : t('dataMigration.pdfCtrlBilanAction') },
                    { label: t('dataMigration.pdfCtrlTiers'), ok: importReport.tiersOk, detail: importReport.tiersOk ? t('dataMigration.pdfCtrlTiersOk') : t('dataMigration.pdfCtrlTiersKo'), action: importReport.tiersOk ? '' : t('dataMigration.pdfCtrlTiersAction') },
                    { label: t('dataMigration.pdfCtrlVnc'), ok: importReport.vncOk, detail: importReport.vncOk ? t('dataMigration.pdfCtrlVncOk') : t('dataMigration.pdfCtrlVncKo'), action: importReport.vncOk ? '' : t('dataMigration.pdfCtrlVncAction') },
                  ];
                  autoTable(doc, {
                    startY: y,
                    head: [[clean(t('dataMigration.pdfThControl')), clean(t('dataMigration.pdfThResult')), clean(t('dataMigration.pdfThDetail')), clean(t('dataMigration.pdfThAction'))]],
                    body: controls.map(c => [clean(c.label), c.ok ? clean(t('dataMigration.pdfValid')) : clean(t('dataMigration.pdfAnomaly')), clean(c.detail), clean(c.action)]),
                    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
                    headStyles: { fillColor: PETROL, textColor: [255,255,255], fontStyle: 'bold' },
                    columnStyles: { 0: { cellWidth: 42 }, 1: { cellWidth: 18, halign: 'center' }, 2: { cellWidth: 68 }, 3: { cellWidth: 50 } },
                    didParseCell: (data: any) => {
                      if (data.column.index === 1) {
                        data.cell.styles.textColor = data.cell.text[0] === clean(t('dataMigration.pdfValid')) ? GREEN : RED;
                        data.cell.styles.fontStyle = 'bold';
                      }
                    },
                    alternateRowStyles: { fillColor: [245, 247, 249] },
                    margin: { left: M, right: M },
                  });

                  // ── ANOMALIES & ACTIONS ──────────────────────────────────
                  if (realWarnings.length > 0) {
                    y = (doc as any).lastAutoTable.finalY + 8;
                    if (y > 250) { doc.addPage(); y = 14; }
                    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PETROL);
                    doc.text(clean(t('dataMigration.pdfSection3')), M, y); y += 5;
                    autoTable(doc, {
                      startY: y,
                      head: [['#', clean(t('dataMigration.pdfThAnomaly')), clean(t('dataMigration.pdfThCorrective'))]],
                      body: realWarnings.map((w, i) => { const h = humanize(w); return [String(i+1), clean(h.msg), clean(h.action)]; }),
                      styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
                      headStyles: { fillColor: [146, 64, 14], textColor: [255,255,255], fontStyle: 'bold' },
                      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 95 }, 2: { cellWidth: 75 } },
                      alternateRowStyles: { fillColor: [255, 251, 235] },
                      margin: { left: M, right: M },
                    });
                  }

                  // ── PROCHAINES ÉTAPES ────────────────────────────────────
                  y = (doc as any).lastAutoTable.finalY + 8;
                  if (y > 240) { doc.addPage(); y = 14; }
                  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PETROL);
                  doc.text(clean(t('dataMigration.pdfSectionNext', { number: realWarnings.length > 0 ? '4' : '3' })), M, y); y += 6;
                  const steps = allOk
                    ? [t('dataMigration.pdfNextOk1'), t('dataMigration.pdfNextOk2'), t('dataMigration.pdfNextOk3'), t('dataMigration.pdfNextOk4')]
                    : [t('dataMigration.pdfNextKo1'), t('dataMigration.pdfNextKo2'), t('dataMigration.pdfNextKo3'), t('dataMigration.pdfNextKo4')];
                  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
                  steps.forEach((s, i) => { doc.text(clean(`${i+1}.  ${s}`), M + 3, y); y += 6; });

                  // ── PIED DE PAGE ─────────────────────────────────────────
                  const pages = doc.getNumberOfPages();
                  for (let p = 1; p <= pages; p++) {
                    doc.setPage(p);
                    doc.setFontSize(7); doc.setTextColor(150, 150, 150);
                    doc.text(clean(t('dataMigration.pdfFooter', { date: now, page: String(p), pages: String(pages) })), M, 290);
                    doc.line(M, 287, W - M, 287);
                  }

                  doc.save(`rapport-migration-${new Date().toISOString().slice(0,10)}.pdf`);
                  toast.success(t('dataMigration.toastPdfDownloaded'));
                } catch (e: any) {
                  toast.error(t('dataMigration.toastPdfError', { message: String(e.message) }));
                }
              }}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> {t('dataMigration.downloadPdf')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Navigation buttons ─── */}
      {currentStep !== 'importing' && (
        <div className="flex justify-between">
          <button onClick={stepIndex === 0 ? onBack : goPrev}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" /> {stepIndex === 0 ? t('dataMigration.back') : t('dataMigration.previous')}
          </button>
          <button onClick={goNext} disabled={!canNext || navBusy}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              canNext && !navBusy ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {navBusy ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> {t('dataMigration.analysisRunning')}</>
            ) : (
              <>{t('dataMigration.next')} <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DataMigrationImport;
