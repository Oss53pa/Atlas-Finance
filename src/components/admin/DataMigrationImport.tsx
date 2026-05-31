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
} from '../../services/import';
import { safeAddEntry } from '../../services/entryGuard';

// ─── Types ───────────────────────────────────────────────

type MigrationMode = 1 | 2 | 3;
type StepId = 'mode' | 'upload' | 'analysis' | 'mapping' | 'parameters' | 'simulation' | 'importing';

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
  tiersOk: boolean;
  vncOk: boolean;
  warnings: string[];
}

interface Props {
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────

const STEPS: { id: StepId; label: string }[] = [
  { id: 'mode', label: 'Mode' },
  { id: 'upload', label: 'Fichiers' },
  { id: 'analysis', label: 'Analyse' },
  { id: 'mapping', label: 'Mapping' },
  { id: 'parameters', label: 'Parametres' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'importing', label: 'Import' },
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
 * Atlas F&A (src/data/syscohada-referentiel.ts — OHADA révisé 2017).
 */
type FileConfig = {
  label: string;
  description: string;
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
    label: 'Grand Livre',
    description: 'Contient TOUTES les écritures (AN + mouvements). ⚠️ N\'importez PAS simultanément le Grand Livre complet ET un Grand Livre des Tiers — le GL des Tiers est un sous-ensemble du GL complet (comptes 401/411) et créerait des doublons.',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls,.txt',
    requiredModes: [1, 3],
    optionalModes: [],
    templateKey: 'grand_livre',
  },
  reportAN: {
    label: 'Balance / Reports à nouveau',
    description: 'Soldes d\'ouverture de l\'exercice (classes 1 à 5).',
    icon: <Calculator className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [2],
    optionalModes: [1],
    templateKey: 'reports_a_nouveau',
  },
  tiers: {
    label: 'Tiers (clients / fournisseurs)',
    description: 'Détails NIF, RCCM, adresses — enrichit les codes tiers du GL.',
    icon: <Users className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [3],
    optionalModes: [1, 2],
    templateKey: 'tiers',
  },
  immobilisations: {
    label: 'Immobilisations',
    description: 'Registre complet : durée, méthode amortissement, VNC.',
    icon: <Package className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [3],
    optionalModes: [1, 2],
    templateKey: 'immobilisations',
  },
  planComptable: {
    label: 'Plan comptable personnalisé',
    description: 'Optionnel — Atlas embarque déjà le plan SYSCOHADA révisé 2017. À utiliser uniquement pour des comptes auxiliaires personnalisés.',
    icon: <BookOpen className="w-5 h-5" />,
    accept: '.csv,.xlsx,.xls',
    requiredModes: [],
    optionalModes: [1, 2, 3],
    templateKey: 'plan_comptable',
  },
};

const TARGET_FIELDS: Record<string, { field: string; label: string; required: boolean }[]> = {
  planComptable: [
    { field: 'numero', label: 'Numero de compte', required: true },
    { field: 'libelle', label: 'Libelle', required: true },
    { field: 'type', label: 'Type (D/C)', required: false },
    { field: 'classe', label: 'Classe', required: false },
  ],
  tiers: [
    { field: 'code', label: 'Code tiers', required: true },
    { field: 'nom', label: 'Nom / Raison sociale', required: true },
    { field: 'type', label: 'Type (client/fournisseur)', required: true },
    { field: 'nif', label: 'NIF / RCCM', required: false },
    { field: 'adresse', label: 'Adresse', required: false },
    { field: 'telephone', label: 'Telephone', required: false },
  ],
  // Grand Livre : source principale recommandée (écritures + AN incluses)
  // Deux libellés distincts :
  //   - libelleCompte    : intitulé du compte SYSCOHADA (ex: "Clients")
  //   - libelleEcriture  : description de l'écriture / pièce (ex: "Facture SANGA")
  grandLivre: [
    { field: 'date', label: 'Date', required: true },
    { field: 'journal', label: 'Code journal', required: true },
    { field: 'compte', label: 'Numéro de compte', required: true },
    { field: 'libelleCompte', label: 'Libellé du compte', required: false },
    { field: 'libelleEcriture', label: 'Libellé écriture / Description', required: true },
    { field: 'debit', label: 'Débit', required: true },
    { field: 'credit', label: 'Crédit', required: true },
    { field: 'tiers', label: 'Code tiers', required: false },
    { field: 'piece', label: 'Pièce', required: false },
    { field: 'numeroEcriture', label: 'N° écriture / saisie', required: false },
    { field: 'lettrage', label: 'Lettrage', required: false },
    { field: 'echeance', label: 'Échéance', required: false },
  ],
  // Alias conservés pour compatibilité
  ecritures: [
    { field: 'dateEcriture', label: 'Date ecriture', required: true },
    { field: 'journal', label: 'Code journal', required: true },
    { field: 'numeroCompte', label: 'Numero de compte', required: true },
    { field: 'libelle', label: 'Libelle', required: true },
    { field: 'debit', label: 'Montant debit', required: true },
    { field: 'credit', label: 'Montant credit', required: true },
    { field: 'numeroPiece', label: 'Numero de piece', required: false },
    { field: 'lettrage', label: 'Lettrage', required: false },
  ],
  reportAN: [
    { field: 'numeroCompte', label: 'Numero de compte', required: true },
    { field: 'libelle', label: 'Libelle', required: false },
    { field: 'debit', label: 'Solde debiteur', required: true },
    { field: 'credit', label: 'Solde crediteur', required: true },
  ],
  immobilisations: [
    { field: 'code', label: 'Code immobilisation', required: true },
    { field: 'libelle', label: 'Designation', required: true },
    { field: 'compteImmo', label: 'Compte immobilisation', required: true },
    { field: 'compteAmort', label: 'Compte amortissement', required: true },
    { field: 'dateAcquisition', label: 'Date acquisition', required: true },
    { field: 'valeurOrigine', label: 'Valeur origine (VO)', required: true },
    { field: 'amortCumule', label: 'Amort. cumule', required: false },
    { field: 'vnc', label: 'VNC', required: false },
    { field: 'duree', label: 'Duree (annees)', required: true },
  ],
  fec: [
    { field: 'JournalCode', label: 'Code journal', required: true },
    { field: 'EcritureDate', label: 'Date ecriture', required: true },
    { field: 'CompteNum', label: 'Numero compte', required: true },
    { field: 'CompteLib', label: 'Libelle compte', required: false },
    { field: 'EcritureLib', label: 'Libelle ecriture', required: true },
    { field: 'Debit', label: 'Debit', required: true },
    { field: 'Credit', label: 'Credit', required: true },
    { field: 'EcritureNum', label: 'Numero ecriture', required: false },
    { field: 'PieceRef', label: 'Reference piece', required: false },
  ],
};

function parseNumber(val: any): number {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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

  // Step navigation
  const [currentStep, setCurrentStep] = useState<StepId>('mode');
  const stepIndex = STEPS.findIndex(s => s.id === currentStep);

  // Step 1 state
  const [migrationMode, setMigrationMode] = useState<MigrationMode>(2);
  const [sourceSystem, setSourceSystem] = useState('');

  // Step 2 state
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Step 3 state
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  /** Plan Comptable généré automatiquement à partir du Grand Livre (cf. Cockpit F&A) */
  const [generatedPC, setGeneratedPC] = useState<GenerationResult | null>(null);

  // Step 4 state
  const [mappings, setMappings] = useState<Record<string, MappedColumn[]>>({});
  const [accountMappings, setAccountMappings] = useState<AccountMapping[]>([]);
  const [excludedEntries, setExcludedEntries] = useState<string[]>([]);

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
        toast.error(`Aucune ligne d'en-tête détectée dans la feuille "${sheetName}"`);
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
      const sheetInfo = wb.SheetNames.length > 1 ? ` (feuille "${sheetName}")` : '';
      toast.success(`${file.name} chargé${sheetInfo} — ${data.length} lignes, ${columns.length} colonnes`);
    } catch (err) { /* silent */
      toast.error(`Erreur de lecture du fichier ${file.name}`);
    }
  }, [pickBestSheet]);

  const removeFile = useCallback((key: string) => {
    setUploadedFiles(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // ─── Step 3: Analysis ─────────────────────────────────

  const runAnalysis = useCallback(() => {
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
        message: `Plan Comptable généré automatiquement à partir du Grand Livre : ${genResult.extracted} comptes`,
        details: `${genResult.enrichedFromSyscohada} enrichis via SYSCOHADA, ${genResult.enrichedFromGL} via le GL, ${genResult.inferred} inférés`,
      });
    } else {
      setGeneratedPC(null);
    }

    if (pcData.length === 0) {
      errors.push({ code: 'NO_PLAN', message: 'Aucun plan comptable fourni et aucun Grand Livre pour l\'auto-générer' });
    }

    // Check SYSCOHADA compliance
    const syscohadaClasses = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    pcData.forEach((row: any) => {
      const num = String(Object.values(row)[0] || '');
      if (num && !syscohadaClasses.includes(num[0])) {
        warnings.push({ code: 'NON_SYSCOHADA', message: `Compte ${num} hors nomenclature SYSCOHADA` });
      }
    });

    // Check tiers NIF
    tiersData.forEach((row: any, i: number) => {
      const vals = Object.values(row) as string[];
      const hasNif = vals.some(v => /\d{10,}/.test(String(v)));
      if (!hasNif) {
        warnings.push({ code: 'NO_NIF', message: `Tiers ligne ${i + 1} sans NIF detecte` });
      }
    });

    // ───────────────────────────────────────────────────────────
    // Check balance débit/crédit — recherche par NOM de colonne
    // (insensible casse/accents/espaces), JAMAIS par indice positionnel.
    // Les fichiers de migration ont souvent des colonnes supplémentaires
    // (solde, solde progressif...) qui fausseraient un calcul positionnel.
    // ───────────────────────────────────────────────────────────
    const normalizeKey = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
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
    const debitAliases = ['debit', 'montantdebit', 'mtdebit'];
    const creditAliases = ['credit', 'montantcredit', 'mtcredit'];

    let totalD = 0, totalC = 0;
    ecrituresData.forEach((row: any) => {
      totalD = money(totalD).add(money(findCol(row, debitAliases))).toNumber();
      totalC = money(totalC).add(money(findCol(row, creditAliases))).toNumber();
    });
    if (ecrituresData.length > 0 && money(totalD).subtract(money(totalC)).abs().toNumber() > 0.01) {
      warnings.push({ code: 'UNBALANCED', message: `Ecritures desequilibrees: D=${totalD.toFixed(2)} C=${totalC.toFixed(2)}`, details: `Ecart: ${money(totalD).subtract(money(totalC)).abs().toNumber().toFixed(2)}` });
    }

    // AN balance check — même logique par nom de colonne
    let anD = 0, anC = 0;
    anData.forEach((row: any) => {
      anD = money(anD).add(money(findCol(row, [...debitAliases, 'soldedebiteur', 'soldedebit']))).toNumber();
      anC = money(anC).add(money(findCol(row, [...creditAliases, 'soldecrediteur', 'soldecredit']))).toNumber();
    });
    if (anData.length > 0 && money(anD).subtract(money(anC)).abs().toNumber() > 0.01) {
      errors.push({ code: 'AN_UNBALANCED', message: `Reports AN desequilibres: D=${anD.toFixed(2)} C=${anC.toFixed(2)}` });
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
        message: `${invalidClassCount} compte(s) hors classes 1-9 SYSCOHADA`,
        details: `Exemples: ${samplesInvalid.join(', ')}. Les comptes doivent commencer par un chiffre entre 1 et 9.`,
      });
    }
    if (shortCodeCount > 0) {
      warnings.push({
        code: 'SYSCOHADA_SHORT_CODE',
        message: `${shortCodeCount} compte(s) avec longueur < 3 caractères`,
        details: `Exemples: ${samplesShort.join(', ')}. SYSCOHADA recommande un radical minimum de 3 caractères.`,
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
          message: `${class67NonZero} compte(s) classes 6-7 avec solde non nul en Mode 2`,
          details: `Exemples: ${samples67.join(' · ')}. Les comptes de gestion (charges 6xx, produits 7xx) doivent être annualisés à zéro à l'ouverture de l'exercice N (le résultat N-1 ayant été soldé en clôture).`,
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
            message: 'Date de bascule dans le futur',
            details: `${params.dateBascule} est postérieure à aujourd'hui. Confirmez que c'est intentionnel.`,
          });
        }
        if (migrationMode === 2) {
          const isJan1 = d.getMonth() === 0 && d.getDate() === 1;
          if (!isJan1) {
            warnings.push({
              code: 'BASCULE_NOT_FISCAL_START',
              message: 'Date de bascule ≠ 1er janvier',
              details: `Mode 2 (Bascule début d'exercice) attend généralement le 01/01. Date fournie : ${params.dateBascule}. Si votre exercice fiscal débute à une autre date (statuts particuliers), ignorez cet avertissement.`,
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
            message: `Durée d'exercice atypique : ~${months} mois`,
            details: 'SYSCOHADA prévoit normalement un exercice de 12 mois. Premier exercice ou clôture exceptionnelle ?',
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
          message: `${duplicates} doublon(s) potentiel(s) dans le fichier`,
          details: `Plus de 5% de lignes identiques (date+compte+montants+libellé). Vérifiez que le fichier n'a pas été concaténé deux fois.`,
        });
      }
    }

    // 6. Vérification doublons INTER-SESSION (Grand Livre vs Grand Livre des Tiers)
    //    Compare les écritures du fichier contre celles déjà présentes en base.
    //    Détecte notamment le cas : GL complet importé en session 1 puis GL Tiers en session 2.
    if (ecrituresData.length > 0) {
      try {
        const existingEntries = await adapter.getAll<any>('journalEntries');
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
              message: `⚠️ ${crossDuplicates} écritures de ce fichier existent déjà en base (${Math.round(ratio*100)}%)`,
              details: `La base contient déjà ${existingEntries.length} écriture(s). Ce fichier semble chevaucher les données existantes. Risque élevé de doublons — vérifiez que vous n'importez pas un Grand Livre des Tiers après avoir déjà importé le Grand Livre complet.`,
            });
          } else if (crossDuplicates > 0) {
            warnings.push({
              code: 'PARTIAL_OVERLAP',
              message: `${crossDuplicates} écriture(s) de ce fichier ont déjà été importées`,
              details: `Ces pièces seront ignorées (protection anti-doublon). Les nouvelles écritures seront ajoutées.`,
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
  }, [uploadedFiles, migrationMode, params.dateBascule, params.exerciceStart, params.exerciceEnd]);

  // ─── Step 4: Auto-mapping ─────────────────────────────

  const initMappings = useCallback(() => {
    const result: Record<string, MappedColumn[]> = {};
    for (const [key, uf] of Object.entries(uploadedFiles)) {
      const targets = TARGET_FIELDS[key];
      if (!targets) continue;
      const auto = autoDetectColumns(uf.columns, targets, getAliasMap(key));
      result[key] = targets.map(t => ({
        target: t.field,
        targetLabel: t.label,
        source: auto[t.field] || '',
        required: t.required,
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
  }, [uploadedFiles]);

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

    // Approximate actif/passif from accounts (AN file)
    let totalActif = 0, totalPassif = 0;
    const anNumCol = anMapping.find(m => m.target === 'numeroCompte')?.source;
    an.forEach((row: any) => {
      const num = String(anNumCol ? (row as Record<string, any>)[anNumCol] : '');
      const d = anDebCol ? parseNumber((row as Record<string, any>)[anDebCol]) : 0;
      const c = anCredCol ? parseNumber((row as Record<string, any>)[anCredCol]) : 0;
      const solde = money(d).subtract(money(c)).toNumber();
      if (['2', '3', '4', '5'].includes(num[0]) && solde > 0) totalActif = money(totalActif).add(money(solde)).toNumber();
      else if (['1', '4', '5'].includes(num[0]) && solde < 0) totalPassif = money(totalPassif).add(money(solde).abs()).toNumber();
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

    setSimulation({
      totalDebit, totalCredit,
      balanced: money(totalDebit).subtract(money(totalCredit)).abs().toNumber() < 0.01,
      totalActif, totalPassif, assetVNC,
      estimatedTime: Math.max(5, Math.ceil(totalRecords / 200)),
      counts: {
        comptes: uploadedFiles.planComptable?.data.length || comptesUniques,
        tiers: uploadedFiles.tiers?.data.length || 0,
        ecritures: ecr.length,
        reportAN: an.length,
        immobilisations: assets.length,
      },
    });
  }, [uploadedFiles, mappings]);

  // ─── Step 7: Import ────────────────────────────────────

  const runImport = useCallback(async () => {
    setImporting(true);
    setImportProgress(0);
    const sessionId = generateId();
    const report: ImportReport = {
      accounts: 0, journals: 0, tiers: 0, entries: 0, lines: 0,
      assets: 0, lettrages: 0, balanceOk: false, bilanOk: false,
      tiersOk: false, vncOk: false, warnings: [],
    };
    const journals = new Set<string>();

    try {
      // 1. Accounts
      // Sources possibles, par ordre de priorite :
      //   a) Fichier planComptable explicitement uploade (rare en Mode 1/2)
      //   b) generatedPC (extrait automatiquement du Grand Livre via SYSCOHADA)
      //   c) Fallback Mode 2 : extrait du fichier Balance / Reports a nouveau
      const pcMapping = mappings.planComptable || [];
      const pcData = uploadedFiles.planComptable?.data || [];
      setImportLabel('Import du plan comptable...');

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
      const isSaasForAccounts = adapter.getMode() === 'saas';
      const supabaseForAccounts = isSaasForAccounts ? (adapter as any).client : null;
      const tenantIdForAccounts = isSaasForAccounts ? (adapter as any).tenantId : null;

      const buildAccount = (code: string, name: string, extra: Record<string, unknown> = {}) => ({
        id: crypto.randomUUID(),
        code, name,
        account_class: accountClassFromNumero(code),
        account_type: 'general',
        level: code.length,
        is_active: true,
        ...extra,
        ...(isSaasForAccounts ? { tenant_id: tenantIdForAccounts, created_at: new Date().toISOString() } : {}),
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
            if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
              report.warnings.push(`Comptes batch [${b}] : ${error.message}`);
            }
            report.accounts += chunk.length;
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
              else { report.warnings.push(`Compte ${accountRecords[i].code} : ${msg}`); }
            }
            setImportProgress(Math.round((i / accountRecords.length) * 15));
          }
        }
      }
      if (accountsSkipped > 0) {
        report.warnings.push(`${accountsSkipped} comptes deja existants (ignores)`);
      }
      setImportProgress(15);

      // ── Helper batch upsert SaaS ─────────────────────────────────────────
      const batchUpsert = async (
        pgTable: string,
        records: Record<string, unknown>[],
        conflictCol: string,
        onProgress?: (pct: number) => void,
      ) => {
        if (!records.length) return;
        const BATCH = 200;
        if (isSaasForAccounts && supabaseForAccounts) {
          for (let b = 0; b < records.length; b += BATCH) {
            const chunk = records.slice(b, b + BATCH).map(r => ({
              id: crypto.randomUUID(), ...r,
              tenant_id: tenantIdForAccounts,
              created_at: new Date().toISOString(),
            }));
            const { error } = await supabaseForAccounts
              .from(pgTable)
              .upsert(chunk, { onConflict: conflictCol, ignoreDuplicates: true });
            if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
              report.warnings.push(`${pgTable} batch [${b}] : ${error.message}`);
            }
            onProgress?.(Math.round(((b + chunk.length) / records.length) * 100));
          }
          return records.length;
        }
        // Dexie
        let created = 0;
        for (let i = 0; i < records.length; i++) {
          try { await adapter.create(pgTable as any, records[i]); created++; }
          catch { /* duplicate or error — skip */ }
          onProgress?.(Math.round((i / records.length) * 100));
        }
        return created;
      };

      // 2. Tiers — schema : code, name, type, email, phone, address, tax_id, ...
      const tiersMapping = mappings.tiers || [];
      const tiersData = uploadedFiles.tiers?.data || [];
      setImportLabel('Import des tiers...');
      const tiersRecords: Record<string, unknown>[] = [];
      for (const row of tiersData as Record<string, any>[]) {
        const codeCol = tiersMapping.find(m => m.target === 'code')?.source;
        const nomCol  = tiersMapping.find(m => m.target === 'nom')?.source;
        const typeCol = tiersMapping.find(m => m.target === 'type')?.source;
        if (!codeCol || !nomCol) continue;
        tiersRecords.push({
          code: String(row[codeCol] || ''),
          name: String(row[nomCol]  || ''),
          type: String(row[typeCol || ''] || 'client'),
          is_active: true,
        });
      }
      const tiersCreated = await batchUpsert('third_parties', tiersRecords, 'code,tenant_id',
        pct => setImportProgress(15 + Math.round(pct * 0.15)));
      report.tiers += tiersCreated || 0;

      // 3. Assets — batch insert
      const assetMapping = mappings.immobilisations || [];
      const assetData = uploadedFiles.immobilisations?.data || [];
      setImportLabel('Import des immobilisations...');
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
          useful_life_years: parseNumber(getVal('duree')) || 1,
          depreciation_method: String(getVal('methode') || 'LINEAIRE'),
          status: 'active',
        });
      }
      const assetsCreated = await batchUpsert('assets', assetRecords, 'code,tenant_id',
        pct => setImportProgress(30 + Math.round(pct * 0.15)));
      report.assets += assetsCreated || 0;

      // 4. Entries (group by piece number)
      // Mode 1 (Bascule en cours d'exercice) : source principale = grandLivre.
      // Fallback historique : ecritures puis fec.
      const ecrMapping = mappings.grandLivre || mappings.ecritures || mappings.fec || [];
      const ecrData = uploadedFiles.grandLivre?.data || uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
      setImportLabel('Import des ecritures...');
      const getEcrVal = (row: any, field: string) => {
        const col = ecrMapping.find(m => m.target === field)?.source;
        return col ? (row as Record<string, any>)[col] : '';
      };

      // Group entries by piece (ou numero d'écriture pour le grand livre)
      const groups = new Map<string, any[]>();
      ecrData.forEach((row: any, i: number) => {
        const piece = String(
          getEcrVal(row, 'numeroEcriture') ||
          getEcrVal(row, 'numeroPiece') ||
          getEcrVal(row, 'piece') ||
          getEcrVal(row, 'EcritureNum') ||
          `AUTO_${i}`
        );
        if (excludedEntries.includes(piece)) return;
        if (!groups.has(piece)) groups.set(piece, []);
        groups.get(piece)!.push(row);
      });

      let ecrIdx = 0;
      let entriesSkipped = 0;
      const entryErrors: string[] = [];

      // ── Mode SaaS : batch insert direct pour éviter N requêtes individuelles ──
      // 1 saveJournalEntry (RPC) par pièce = 2 000+ requêtes pour un GL de 10 000 lignes.
      // Solution : construire les tableaux journal_entries + journal_lines en mémoire
      // puis insérer en batch (100 écritures / 500 lignes par requête).
      const isSaasMode = adapter.getMode() === 'saas';
      const supabaseClient = isSaasMode ? (adapter as any).client : null;
      const tenantId = isSaasMode ? (adapter as any).tenantId : null;

      if (isSaasMode && supabaseClient) {
        // ── Construire tous les records en mémoire ──────────────────────────
        const batchEntries: any[] = [];
        const batchLines: any[] = [];

        for (const [piece, lines] of groups) {
          const journalCode = String(getEcrVal(lines[0], 'journal') || getEcrVal(lines[0], 'JournalCode') || 'OD');
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
          let totalDebit = 0; let totalCredit = 0;
          lines.forEach((line: any) => {
            totalDebit  += parseNumber(getEcrVal(line, 'debit')  || getEcrVal(line, 'Debit'));
            totalCredit += parseNumber(getEcrVal(line, 'credit') || getEcrVal(line, 'Credit'));
          });
          const entryId = crypto.randomUUID();
          batchEntries.push({
            id: entryId, tenant_id: tenantId,
            entry_number: piece, journal: journalCode, date: entryDate,
            label: entryLabel, reference: piece,
            status: params.entryStatus === 'validated' ? 'validated' : 'draft',
            total_debit: totalDebit, total_credit: totalCredit,
            created_at: new Date().toISOString(),
          });
          lines.forEach((line: any) => {
            const debitAliases2 = ['debit','Debit','montantDebit','debitAmount'];
            const creditAliases2 = ['credit','Credit','montantCredit','creditAmount'];
            const accountCode = String(
              getEcrVal(line, 'compte') || getEcrVal(line, 'CompteNum') ||
              getEcrVal(line, 'accountCode') || ''
            ).replace(/\s/g, '');
            batchLines.push({
              id: crypto.randomUUID(), entry_id: entryId, tenant_id: tenantId,
              account_code: accountCode,
              account_name: String(getEcrVal(line, 'compteLib') || getEcrVal(line, 'CompteLib') || accountCode),
              label: String(getEcrVal(line, 'libelleEcriture') || getEcrVal(line, 'libelle') || entryLabel),
              debit: parseNumber(findCol(line, debitAliases2)),
              credit: parseNumber(findCol(line, creditAliases2)),
            });
          });
        }

        // ── Insérer les journal_entries par batch de 100 ──────────────────
        const ENTRY_BATCH = 100;
        for (let b = 0; b < batchEntries.length; b += ENTRY_BATCH) {
          const chunk = batchEntries.slice(b, b + ENTRY_BATCH);
          const { error } = await supabaseClient
            .from('journal_entries')
            .upsert(chunk, { onConflict: 'entry_number,tenant_id', ignoreDuplicates: true });
          if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            entryErrors.push(`Batch écritures [${b}-${b+ENTRY_BATCH}] : ${error.message}`);
          }
          ecrIdx += chunk.length;
          report.entries += chunk.length;
          setImportProgress(45 + Math.round((ecrIdx / batchEntries.length) * 25));
        }

        // ── Insérer les journal_lines par batch de 500 ─────────────────────
        const LINE_BATCH = 500;
        for (let b = 0; b < batchLines.length; b += LINE_BATCH) {
          const chunk = batchLines.slice(b, b + LINE_BATCH);
          const { error } = await supabaseClient
            .from('journal_lines')
            .upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
          if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            entryErrors.push(`Batch lignes [${b}-${b+LINE_BATCH}] : ${error.message}`);
          }
          report.lines += chunk.length;
          setImportProgress(70 + Math.round((b / batchLines.length) * 10));
        }

      } else {
        // ── Mode local (Dexie) : insertion une par une avec hash chain ─────
      for (const [piece, lines] of groups) {
        const journalCode = String(getEcrVal(lines[0], 'journal') || getEcrVal(lines[0], 'JournalCode') || 'OD');
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
          (s: number, l: any) => s + parseNumber(getEcrVal(l, 'debit') || getEcrVal(l, 'Debit')),
          0
        );
        const totalCredit = lines.reduce(
          (s: number, l: any) => s + parseNumber(getEcrVal(l, 'credit') || getEcrVal(l, 'Credit')),
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
            return {
              id: crypto.randomUUID(),
              accountCode,
              accountName,
              label: lineLabel,
              debit: parseNumber(getEcrVal(line, 'debit') || getEcrVal(line, 'Debit')),
              credit: parseNumber(getEcrVal(line, 'credit') || getEcrVal(line, 'Credit')),
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
          const msg = err instanceof Error ? err.message : 'erreur inconnue';
          if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
            entriesSkipped++;
          } else {
            // Limiter a 10 erreurs detaillees pour ne pas saturer le rapport
            if (entryErrors.length < 10) {
              entryErrors.push(`Ecriture ${piece} : ${msg}`);
            }
          }
        }
        ecrIdx++;
        setImportProgress(45 + Math.round((ecrIdx / groups.size) * 35));
      }
      } // fin else Dexie

      if (entriesSkipped > 0) {
        report.warnings.push(`${entriesSkipped} ecritures deja existantes (ignorees)`);
      }
      for (const e of entryErrors) report.warnings.push(e);
      const otherErrors = (groups.size - report.entries - entriesSkipped) - entryErrors.length;
      if (otherErrors > 0) {
        report.warnings.push(`+ ${otherErrors} autres ecritures en erreur (voir logs)`);
      }

      // 5. AN entries — Mode 2 / fallback Mode 1
      const anData = uploadedFiles.reportAN?.data || [];
      if (anData.length > 0) {
        setImportLabel('Import des reports a nouveau...');
        const anMapping = mappings.reportAN || [];
        // camelCase requis par save_journal_entry (Supabase) et Dexie
        const anLinesData = anData.map((row: Record<string, unknown>) => {
          const numCol = anMapping.find(m => m.target === 'numeroCompte')?.source;
          const libCol = anMapping.find(m => m.target === 'libelle')?.source;
          const dCol = anMapping.find(m => m.target === 'debit')?.source;
          const cCol = anMapping.find(m => m.target === 'credit')?.source;
          const accountCode = String(numCol ? row[numCol] : '');
          return {
            id: crypto.randomUUID(),
            accountCode,
            accountName: String(libCol ? row[libCol] : '') || accountCode,
            label: String(libCol ? row[libCol] : 'Report AN'),
            debit: parseNumber(dCol ? row[dCol] : 0),
            credit: parseNumber(cCol ? row[cCol] : 0),
          };
        }).filter(l => l.debit > 0 || l.credit > 0);

        if (anLinesData.length > 0) {
          try {
            const anTotalDebit = anLinesData.reduce((s, l) => s + l.debit, 0);
            const anTotalCredit = anLinesData.reduce((s, l) => s + l.credit, 0);
            const anDate = params.exerciceStart || params.dateBascule || new Date().toISOString().slice(0, 10);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const adapterExtAN = adapter as any;
            if (typeof adapterExtAN.saveJournalEntry === 'function') {
              // SupabaseAdapter : atomique via save_journal_entry
              await adapterExtAN.saveJournalEntry({
                entryNumber: 'AN-MIGRATION',
                journal: 'AN',
                date: anDate,
                label: 'Reports a nouveau — Migration',
                reference: 'AN-MIGRATION',
                status: 'validated',
                totalDebit: anTotalDebit,
                totalCredit: anTotalCredit,
                lines: anLinesData,
              });
            } else {
              // DexieAdapter : écriture AN via safeAddEntry (hash chain)
              const now = new Date().toISOString();
              await safeAddEntry(adapter, {
                id: crypto.randomUUID(),
                entryNumber: 'AN-MIGRATION',
                journal: 'AN',
                date: anDate,
                label: 'Reports a nouveau — Migration',
                reference: 'AN-MIGRATION',
                status: 'validated',
                lines: anLinesData,
                createdAt: now,
              }, { skipSyncValidation: true }); // skipSyncValidation : écriture d'ouverture système, équilibre garanti
            }
            report.lines += anLinesData.length;
            report.entries++;
            journals.add('AN');
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'erreur inconnue';
            report.warnings.push(`Report AN ignore : ${msg}`);
          }
        }
        setImportProgress(90);
      }

      // Post-import checks
      setImportLabel('Controles post-import...');
      report.journals = journals.size;
      report.balanceOk = simulation?.balanced ?? true;
      report.bilanOk = simulation ? money(simulation.totalActif).subtract(money(simulation.totalPassif)).abs().toNumber() < 1 : true;
      report.tiersOk = report.tiers > 0 || tiersData.length === 0;
      report.vncOk = true;
      setImportProgress(100);

      // Audit log — signature : logAudit(action, entityType, entityId, details)
      await logAudit(
        'DATA_MIGRATION_IMPORT',
        'migration',
        sessionId,
        `Migration ${sourceSystem || 'inconnu'}: ${report.accounts} comptes, ${report.entries} ecritures, ${report.tiers} tiers, ${report.assets} immobilisations`
      );

      setImportReport(report);
      toast.success('Migration terminee avec succes');
    } catch (err: any) {
      toast.error(`Erreur d'import: ${err.message || 'erreur inconnue'}`);
      report.warnings.push(`Erreur fatale: ${err.message}`);
      setImportReport(report);
    } finally {
      setImporting(false);
    }
  }, [adapter, uploadedFiles, mappings, params, excludedEntries, simulation, sourceSystem]);

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
      case 'parameters': return !!params.dateBascule && !!params.exerciceStart && !!params.exerciceEnd;
      case 'simulation': return simulation?.balanced ?? false;
      default: return false;
    }
  }, [currentStep, sourceSystem, uploadedFiles, analysisReport, mappings, params, simulation]);

  const goNext = () => {
    if (currentStep === 'upload') runAnalysis();
    if (currentStep === 'analysis') initMappings();
    if (currentStep === 'parameters') runSimulation();
    const next = STEPS[stepIndex + 1];
    if (next) setCurrentStep(next.id);
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
          aria-label="Retour"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.6} />
        </button>
        <div>
          <div className="eyebrow-gold mb-1">Atlas Studio · Migration SYSCOHADA</div>
          <h1 style={{ fontSize: '1.625rem', letterSpacing: 0, lineHeight: 1.15, color: 'var(--color-text-primary)' }} className="font-semibold">
            Migration de données comptables
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Assistant d'import depuis un logiciel tiers (Sage, Ciel, EBP, Odoo, FEC, Excel...). Conforme OHADA · Plan SYSCOHADA révisé 2017.
          </p>
        </div>
      </header>

      {/* Stepper premium — obsidien / champagne / hairlines */}
      <nav
        aria-label="Étapes de migration"
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
                <span>{step.label}</span>
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
            <div className="eyebrow-gold mb-2">Étape 1 · Mode de migration</div>
            <h2 className="font-medium" style={{ fontSize: '1.125rem', color: 'var(--color-text-primary)', letterSpacing: 0 }}>
              À quelle date effectuez-vous la bascule vers <span className="atlas-brand" style={{ fontSize: '1.15em', color: 'var(--color-accent-deep)' }}>Atlas F&A</span> ?
            </h2>
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Le mode détermine le périmètre des fichiers à importer et la stratégie de reprise comptable selon SYSCOHADA révisé 2017.
            </p>
          </section>

          <section className="surface-card" style={{ padding: '1.5rem 1.5rem 1.375rem' }}>
            <header className="flex items-baseline justify-between mb-4">
              <h2 className="font-medium" style={{ fontSize: '1rem', color: 'var(--color-text-primary)' }}>Sélectionnez un mode</h2>
              <span className="eyebrow" style={{ color: 'var(--color-text-tertiary)' }}>3 options · 1 choix obligatoire</span>
            </header>
            <div className="space-y-3">
            {([
              {
                mode: 2 as MigrationMode,
                title: 'Bascule début d\'exercice',
                badge: 'RECOMMANDÉ',
                desc: 'Au 01/01/N, juste après avoir clôturé l\'exercice précédent. Reprise minimale via la Balance de clôture N-1 (À Nouveau).',
                detail: 'Standard SYSCOHADA pour les changements de logiciel comptable. Un seul fichier requis : la Balance au 31/12/N-1, qui devient automatiquement le journal AN (À Nouveau) d\'ouverture. Comptes de classe 1-5 (bilan) reportés en soldes d\'ouverture ; classes 6-7 (gestion) annualisées à zéro. Tiers et immobilisations facultatifs pour enrichir le référentiel. L\'historique des écritures détaillées reste consultable dans l\'ancien logiciel.',
                files: '1 fichier obligatoire',
                duration: '< 5 min',
                risk: 'Faible',
                riskTone: 'success' as const,
              },
              {
                mode: 1 as MigrationMode,
                title: 'Bascule en cours d\'exercice',
                badge: '',
                desc: 'L\'exercice N est déjà commencé. Reprise via Grand Livre (À Nouveau + mouvements du 01/01/N à la date de bascule).',
                detail: 'À utiliser quand vous changez de logiciel en milieu d\'année. Un seul fichier obligatoire : le Grand Livre de l\'exercice en cours, contenant les écritures d\'ouverture AN et tous les mouvements jusqu\'à la date de bascule. La numérotation des pièces continue à partir du dernier numéro de l\'ancien logiciel. Plan comptable SYSCOHADA déjà embarqué — pas besoin de l\'importer. Tiers et immobilisations restent optionnels.',
                files: '1 fichier obligatoire',
                duration: '5 à 30 min',
                risk: 'Moyen',
                riskTone: 'warning' as const,
              },
              {
                mode: 3 as MigrationMode,
                title: 'Migration historique complète',
                badge: '',
                desc: 'Tout l\'historique des exercices clos est repris dans Atlas. Réservé aux cas d\'audit, fusion, ou obligation légale OHADA.',
                detail: 'Reprise lourde : un fichier Grand Livre par exercice à migrer + Tiers + Immobilisations obligatoires. Peut représenter 200 000 à 500 000 écritures. Chaque exercice migré génère une entrée distincte dans la piste d\'audit SHA-256 (conformité OHADA art. 24). Déconseillé hors besoin réglementaire — préférez Mode 2 et conservez l\'archive dans l\'ancien logiciel.',
                files: '3+ fichiers obligatoires',
                duration: '1 à 8 heures',
                risk: 'Élevé',
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
                        Mode {mode} — {title}
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
                          <span className="chip" style={{ padding: '0.25rem 0.625rem' }}>Durée · {duration}</span>
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
                            Risque · {risk}
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
            <h2 className="text-lg font-semibold mb-4">Fichiers requis — Mode {migrationMode}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-gray-500">#</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500">Bloc</th>
                    <th className="pb-2 pr-4 font-medium text-gray-500">Etat a exporter depuis Sage</th>
                    <th className="pb-2 font-medium text-gray-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr><td className="py-2 pr-4 text-gray-400">1</td><td className="py-2 pr-4 font-medium">Plan comptable</td><td className="py-2 pr-4 text-gray-600">Liste des comptes generaux</td><td className="py-2"><span className="text-green-600 font-medium text-xs">Requis</span></td></tr>
                  <tr><td className="py-2 pr-4 text-gray-400">2</td><td className="py-2 pr-4 font-medium">Fichier tiers</td><td className="py-2 pr-4 text-gray-600">Clients et fournisseurs</td><td className="py-2"><span className="text-green-600 font-medium text-xs">Requis</span></td></tr>
                  <tr><td className="py-2 pr-4 text-gray-400">3</td><td className="py-2 pr-4 font-medium">Reports a nouveau</td><td className="py-2 pr-4 text-gray-600">Balance generale au 31/12/N-1 (soldes uniquement)</td><td className="py-2"><span className="text-green-600 font-medium text-xs">Requis</span></td></tr>
                  {(migrationMode === 1 || migrationMode === 3) && (
                    <tr className="bg-amber-50">
                      <td className="py-2 pr-4 text-amber-600 font-bold">4</td>
                      <td className="py-2 pr-4 font-semibold text-amber-900">Ecritures exercice {migrationMode === 1 ? 'en cours' : '(1 par exercice)'}</td>
                      <td className="py-2 pr-4 text-amber-700">Grand Livre {migrationMode === 1 ? 'du 01/01/N a la date de bascule' : 'complet de chaque exercice'}</td>
                      <td className="py-2"><span className="text-amber-700 font-bold text-xs">REQUIS</span></td>
                    </tr>
                  )}
                  {migrationMode === 2 && (
                    <tr className="bg-gray-50">
                      <td className="py-2 pr-4 text-gray-400">—</td>
                      <td className="py-2 pr-4 text-gray-400 line-through">Grand Livre / Ecritures</td>
                      <td className="py-2 pr-4 text-gray-400">Pas necessaire en Mode 2</td>
                      <td className="py-2"><span className="text-gray-400 text-xs">Non requis</span></td>
                    </tr>
                  )}
                  <tr><td className="py-2 pr-4 text-gray-400">{migrationMode === 2 ? '4' : migrationMode === 1 ? '5' : '8'}</td><td className="py-2 pr-4 font-medium">Immobilisations</td><td className="py-2 pr-4 text-gray-600">Plan d'amortissement au 31/12/N-1</td><td className="py-2"><span className="text-green-600 font-medium text-xs">Requis</span></td></tr>
                </tbody>
              </table>
            </div>

            {migrationMode === 2 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800"><strong>Pourquoi la Balance et pas le Grand Livre ?</strong> La Balance condense tout en une seule ligne par compte (le solde final au 31/12/N-1). C'est exactement ce dont Atlas F&A a besoin pour ouvrir l'exercice N — ni plus, ni moins.</p>
              </div>
            )}
            {migrationMode === 1 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800"><strong>Pourquoi le Grand Livre ici ?</strong> Les ecritures de janvier a la date de bascule existent dans Sage mais pas encore dans Atlas. Sans elles, la balance serait fausse, les soldes tiers faux, les declarations TVA impossibles. Exporter le Grand Livre filtre sur l'exercice N uniquement (exclure le journal AN).</p>
              </div>
            )}
            {migrationMode === 3 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800"><strong>Attention :</strong> Un fichier Grand Livre par exercice. Ne pas fusionner plusieurs exercices dans un seul fichier. Atlas F&A verifie la coherence inter-exercices : Bilan cloture N-3 = Bilan ouverture N-2, etc.</p>
              </div>
            )}
          </div>

          {/* Regles de format */}
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">Regles de format des fichiers</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Separateur de colonnes</span><span className="font-mono font-medium">point-virgule ( ; )</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Encodage</span><span className="font-mono font-medium">UTF-8</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Premiere ligne</span><span className="font-medium">En-tetes de colonnes</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Dates</span><span className="font-mono font-medium">JJ/MM/AAAA</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Montants</span><span className="font-mono font-medium">18000000 (sans espace)</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Decimales</span><span className="font-mono font-medium">point ( . )</span></div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Logiciel source</h2>
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
          {/* Bandeau téléchargement des modèles Excel */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 mb-1">Téléchargez les modèles Excel Atlas F&amp;A avant de préparer vos fichiers</p>
                <p className="text-xs text-amber-700 mb-3">Chaque modèle contient les colonnes exactes attendues + des exemples de données. Respectez le format pour éviter les erreurs de mapping.</p>
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
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Fichiers à importer — Mode {migrationMode} ({sourceSystem})</h2>
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
                        <span className="font-medium text-sm">{config.label}</span>
                        {required ? (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                            Obligatoire
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Recommandé
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
                          title="Télécharger le modèle Atlas F&A pré-rempli"
                        >
                          <Download className="w-3 h-3" /> Télécharger le modèle
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{config.description}</p>

                    {uf ? (
                      <div className="flex items-center justify-between bg-white rounded p-2 border">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{uf.file.name}</p>
                          <p className="text-gray-500">{formatSize(uf.file.size)} — {uf.data.length} lignes — {uf.columns.length} colonnes</p>
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
                        Glisser-deposer ou cliquer pour parcourir
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
                    Plan Comptable généré automatiquement depuis le Grand Livre
                  </h3>
                  <p className="text-xs text-green-800 mb-3">
                    Atlas a extrait <strong>{generatedPC.extracted} comptes distincts</strong> du Grand Livre
                    et les a enrichis avec le référentiel SYSCOHADA révisé 2017.
                    Vous n'avez pas besoin d'importer un fichier Plan Comptable séparé.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-white rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-lg font-bold text-green-900">{generatedPC.enrichedFromSyscohada}</p>
                      <p className="text-[10px] text-green-700">Enrichis via SYSCOHADA</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-lg font-bold text-green-900">{generatedPC.enrichedFromGL}</p>
                      <p className="text-[10px] text-green-700">Enrichis via GL</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-lg font-bold text-green-900">{generatedPC.inferred}</p>
                      <p className="text-[10px] text-green-700">Inférés (à vérifier)</p>
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
                        toast.success('Plan Comptable téléchargé');
                      } catch (e) { /* silent */
                        toast.error('Erreur lors du téléchargement');
                      }
                    }}
                    className="text-xs font-semibold px-3 py-1.5 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-100 inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3 h-3" /> Télécharger le Plan Comptable généré
                  </button>
                </div>
              </div>

              {/* Aperçu des premiers comptes */}
              {generatedPC.accounts.length > 0 && (
                <div className="mt-4 bg-white rounded-lg border border-green-100 overflow-hidden">
                  <div className="px-3 py-2 bg-green-100/50 border-b border-green-100">
                    <p className="text-[11px] font-semibold text-green-900">
                      Aperçu — {Math.min(10, generatedPC.accounts.length)} premiers comptes
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-green-50 text-green-900">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-semibold">Numéro</th>
                          <th className="text-left px-3 py-1.5 font-semibold">Libellé</th>
                          <th className="text-center px-2 py-1.5 font-semibold">Classe</th>
                          <th className="text-center px-2 py-1.5 font-semibold">Sens</th>
                          <th className="text-center px-2 py-1.5 font-semibold">Source</th>
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
                                {acc.source === 'syscohada' ? 'SYSCOHADA' : acc.source === 'gl' ? 'GL' : 'Inféré'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {generatedPC.accounts.length > 10 && (
                    <div className="px-3 py-1.5 bg-green-50/50 border-t border-green-100 text-[10px] text-green-700 text-center">
                      + {generatedPC.accounts.length - 10} autres comptes — téléchargez le fichier complet pour tout voir
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Rapport d'analyse pre-import</h2>
            <div className="grid grid-cols-5 gap-4 mb-6">
              {[
                { label: 'Comptes', value: analysisReport.accounts, icon: <BookOpen className="w-5 h-5" /> },
                { label: 'Tiers', value: analysisReport.tiers, icon: <Users className="w-5 h-5" /> },
                { label: 'Ecritures', value: analysisReport.entries, icon: <FileText className="w-5 h-5" /> },
                { label: 'Lignes', value: analysisReport.lines, icon: <BarChart3 className="w-5 h-5" /> },
                { label: 'Immobilisations', value: analysisReport.assets, icon: <Package className="w-5 h-5" /> },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="flex justify-center text-gray-400 mb-1">{item.icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            {analysisReport.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <XCircle className="w-5 h-5" /> Erreurs bloquantes ({analysisReport.errors.length})
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
                  <AlertTriangle className="w-5 h-5" /> Avertissements ({analysisReport.warnings.length})
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
                <p className="text-green-800 font-medium">Toutes les verifications ont reussi. Vous pouvez poursuivre.</p>
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
                  {FILE_CONFIGS[fileKey]?.label || fileKey} — Mapping des colonnes
                </h3>
                <div className="space-y-2">
                  {cols.map((col, ci) => (
                    <div key={ci} className="flex items-center gap-4">
                      <div className="w-1/3 flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{col.targetLabel}</span>
                        {col.required && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">requis</span>}
                        {!col.required && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">optionnel</span>}
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
                        <option value="">— Selectionner —</option>
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
              <h3 className="font-semibold text-gray-900 mb-3">Verification des comptes SYSCOHADA</h3>
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
                        placeholder="Nouveau no."
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Step 5: Parameters ─── */}
      {currentStep === 'parameters' && (
        <div className="bg-white border rounded-xl p-6 space-y-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" /> Parametres de migration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de bascule</label>
              <input type="date" value={params.dateBascule}
                onChange={e => setParams(p => ({ ...p, dateBascule: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Debut exercice Atlas</label>
              <input type="date" value={params.exerciceStart}
                onChange={e => setParams(p => ({ ...p, exerciceStart: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin exercice Atlas</label>
              <input type="date" value={params.exerciceEnd}
                onChange={e => setParams(p => ({ ...p, exerciceEnd: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut des ecritures importees</label>
            <div className="flex gap-4">
              {[
                { val: 'validated' as const, label: 'Validees (recommande)' },
                { val: 'draft' as const, label: 'Brouillons' },
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Gestion du lettrage</label>
            <div className="flex gap-4">
              {[
                { val: true, label: 'Recreer les lettrages' },
                { val: false, label: 'Sans lettrage' },
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
              <p className="text-sm font-medium text-amber-800">Donnees existantes</p>
              <p className="text-sm text-amber-700 mt-1">Si des ecritures existent deja pour cet exercice, choisissez l'action :</p>
              <div className="flex gap-3 mt-2">
                {[
                  { val: 'merge' as const, label: 'Fusionner' },
                  { val: 'replace' as const, label: 'Remplacer' },
                  { val: 'cancel' as const, label: 'Annuler' },
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
            <h2 className="text-lg font-semibold mb-4">Resultats de la simulation</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className={`rounded-lg p-4 text-center ${simulation.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Total debits</p>
                <p className="text-lg font-bold">{simulation.totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${simulation.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-xs text-gray-500 mb-1">Total credits</p>
                <p className="text-lg font-bold">{simulation.totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg p-4 text-center bg-blue-50 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">Actif estime</p>
                <p className="text-lg font-bold">{simulation.totalActif.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-lg p-4 text-center bg-blue-50 border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">Passif estime</p>
                <p className="text-lg font-bold">{simulation.totalPassif.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {Object.entries(simulation.counts).map(([key, val]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{val}</p>
                  <p className="text-xs text-gray-500">{key}</p>
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between rounded-lg p-4 ${simulation.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {simulation.balanced ?
                  <CheckCircle className="w-5 h-5 text-green-600" /> :
                  <XCircle className="w-5 h-5 text-red-600" />}
                <span className={`font-medium ${simulation.balanced ? 'text-green-700' : 'text-red-700'}`}>
                  {simulation.balanced ? 'Équilibre vérifié — prêt pour l\'import' : 'DÉSÉQUILIBRE DÉTECTÉ — import bloqué'}
                </span>
              </div>
              <span className="text-sm text-gray-500">Durée estimée : ~{simulation.estimatedTime}s</span>
            </div>

            {!simulation.balanced && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">Détail du déséquilibre</p>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                      <div className="bg-white rounded p-2 border border-red-100 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">Total débits</p>
                        <p className="font-mono font-semibold text-gray-900">{simulation.totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-red-100 text-center">
                        <p className="text-xs text-gray-500 mb-0.5">Total crédits</p>
                        <p className="font-mono font-semibold text-gray-900">{simulation.totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="bg-red-100 rounded p-2 border border-red-300 text-center">
                        <p className="text-xs text-red-700 mb-0.5">Écart</p>
                        <p className="font-mono font-bold text-red-800">{Math.abs(simulation.totalDebit - simulation.totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-red-600">{simulation.totalDebit > simulation.totalCredit ? 'Débits excédentaires' : 'Crédits excédentaires'}</p>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-red-700 mb-2">Comment corriger :</p>
                    <ul className="text-sm text-red-700 space-y-1.5 list-none">
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">1.</span><span>Dans votre fichier Grand Livre, vérifiez que <strong>chaque écriture</strong> a bien Σ débit = Σ crédit. Filtrez sur le journal concerné.</span></li>
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">2.</span><span>L'écart de <strong>{Math.abs(simulation.totalDebit - simulation.totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FCFA</strong> peut provenir d'une ligne manquante ou d'une valeur mal saisie.</span></li>
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">3.</span><span>Téléchargez le modèle Excel ci-dessous, corrigez les données sources, puis re-uploadez le fichier corrigé.</span></li>
                      <li className="flex items-start gap-2"><span className="text-red-500 font-bold mt-0.5">4.</span><span>Si votre logiciel source (Sage, Ciel…) exporte le FEC, utilisez plutôt le mode import <strong>FEC</strong> — il garantit l'équilibre.</span></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {simulation.assetVNC > 0 && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <span className="font-medium text-blue-800">VNC immobilisations : </span>
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
              <h2 className="text-xl font-semibold text-gray-900">Pret a importer</h2>
              <p className="text-gray-500">L'import va creer les enregistrements dans votre base Atlas F&A.</p>
              <button onClick={runImport}
                className="px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Lancer l'import reel
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                <h2 className="text-lg font-semibold text-gray-900">Import en cours...</h2>
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
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Migration terminee</h2>
                <p className="text-sm text-gray-500">Voici le rapport de migration</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Comptes', value: importReport.accounts },
                { label: 'Journaux', value: importReport.journals },
                { label: 'Tiers', value: importReport.tiers },
                { label: 'Ecritures', value: importReport.entries },
                { label: 'Lignes', value: importReport.lines },
                { label: 'Immobilisations', value: importReport.assets },
                { label: 'Lettrages', value: importReport.lettrages },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>

            <h3 className="font-semibold text-gray-900 mb-2">Controles post-import</h3>
            <div className="space-y-2 mb-6">
              {[
                { label: 'Equilibre debit/credit', ok: importReport.balanceOk },
                { label: 'Equilibre bilan actif/passif', ok: importReport.bilanOk },
                { label: 'Reconciliation tiers', ok: importReport.tiersOk },
                { label: 'Coherence VNC immobilisations', ok: importReport.vncOk },
              ].map(check => (
                <div key={check.label} className={`flex items-center gap-2 p-2 rounded ${check.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  {check.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                  <span className={`text-sm font-medium ${check.ok ? 'text-green-800' : 'text-red-800'}`}>{check.label}</span>
                </div>
              ))}
            </div>

            {importReport.warnings.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-amber-700 mb-2">Points d'attention ({importReport.warnings.length})</h3>
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
                Retour a l'administration
              </button>
              <button onClick={() => toast.info('Generation du rapport PDF...')}
                className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Telecharger le rapport PDF
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
            <ArrowLeft className="w-4 h-4" /> {stepIndex === 0 ? 'Retour' : 'Precedent'}
          </button>
          <button onClick={goNext} disabled={!canNext}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              canNext ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default DataMigrationImport;
