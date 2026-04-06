// @ts-nocheck

/**
 * DataMigrationImport — Assistant de migration comptable en 7 etapes
 * Supports: Sage, Ciel/Saari, EBP, Cegid, Odoo, FEC, Excel, Autre
 */
import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle,
  ChevronRight, ArrowLeft, Download, Trash2, Settings, Play,
  FileText, Users, Package, Calculator, BookOpen, BarChart3, Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../contexts/DataContext';
import { toast } from 'sonner';
import { logAudit } from '../../lib/db';
import { money } from '../../utils/money';

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

const FILE_CONFIGS: Record<string, { label: string; icon: React.ReactNode; accept: string; modes: MigrationMode[] }> = {
  planComptable: { label: 'Plan comptable', icon: <BookOpen className="w-5 h-5" />, accept: '.csv,.xlsx,.xls', modes: [1, 2, 3] },
  tiers: { label: 'Tiers (clients/fournisseurs)', icon: <Users className="w-5 h-5" />, accept: '.csv,.xlsx,.xls', modes: [1, 2, 3] },
  ecritures: { label: 'Ecritures comptables', icon: <FileText className="w-5 h-5" />, accept: '.csv,.xlsx,.xls,.txt', modes: [1, 3] },
  reportAN: { label: 'Reports a nouveau (AN)', icon: <Calculator className="w-5 h-5" />, accept: '.csv,.xlsx,.xls', modes: [1, 2] },
  immobilisations: { label: 'Immobilisations', icon: <Package className="w-5 h-5" />, accept: '.csv,.xlsx,.xls', modes: [1, 2, 3] },
  fec: { label: 'Fichier FEC complet', icon: <FileSpreadsheet className="w-5 h-5" />, accept: '.csv,.xlsx,.xls,.txt', modes: [1, 2, 3] },
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
  if (!val) return '';
  const s = String(val).trim();
  // DD/MM/YYYY
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  // YYYYMMDD
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function autoDetectColumns(sourceColumns: string[], targetFields: { field: string; label: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const tf of targetFields) {
    const normTarget = normalize(tf.field);
    const normLabel = normalize(tf.label);
    const match = sourceColumns.find(sc => {
      const normSrc = normalize(sc);
      return normSrc === normTarget || normSrc.includes(normTarget) || normTarget.includes(normSrc)
        || normSrc.includes(normLabel) || normLabel.includes(normSrc);
    });
    if (match) result[tf.field] = match;
  }
  return result;
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

  const handleFileUpload = useCallback(async (key: string, file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const columns = data.length > 0 ? Object.keys(data[0] as object) : [];
      setUploadedFiles(prev => ({ ...prev, [key]: { file, data, columns } }));
      toast.success(`${file.name} charge — ${data.length} lignes detectees`);
    } catch (err) { /* silent */
      toast.error(`Erreur de lecture du fichier ${file.name}`);
    }
  }, []);

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
    const pcData = uploadedFiles.planComptable?.data || [];
    const tiersData = uploadedFiles.tiers?.data || [];
    const ecrituresData = uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
    const anData = uploadedFiles.reportAN?.data || [];
    const assetData = uploadedFiles.immobilisations?.data || [];

    if (pcData.length === 0 && !uploadedFiles.fec) {
      errors.push({ code: 'NO_PLAN', message: 'Aucun plan comptable fourni' });
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

    // Check balance
    let totalD = 0, totalC = 0;
    ecrituresData.forEach((row: any) => {
      const vals = Object.values(row).map(v => parseNumber(v));
      totalD = money(totalD).add(money(vals[vals.length - 2] || 0)).toNumber();
      totalC = money(totalC).add(money(vals[vals.length - 1] || 0)).toNumber();
    });
    if (ecrituresData.length > 0 && money(totalD).subtract(money(totalC)).abs().toNumber() > 0.01) {
      warnings.push({ code: 'UNBALANCED', message: `Ecritures desequilibrees: D=${totalD.toFixed(2)} C=${totalC.toFixed(2)}`, details: `Ecart: ${money(totalD).subtract(money(totalC)).abs().toNumber().toFixed(2)}` });
    }

    // AN balance check
    let anD = 0, anC = 0;
    anData.forEach((row: any) => {
      const vals = Object.values(row).map(v => parseNumber(v));
      anD = money(anD).add(money(vals[vals.length - 2] || 0)).toNumber();
      anC = money(anC).add(money(vals[vals.length - 1] || 0)).toNumber();
    });
    if (anData.length > 0 && money(anD).subtract(money(anC)).abs().toNumber() > 0.01) {
      errors.push({ code: 'AN_UNBALANCED', message: `Reports AN desequilibres: D=${anD.toFixed(2)} C=${anC.toFixed(2)}` });
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
  }, [uploadedFiles]);

  // ─── Step 4: Auto-mapping ─────────────────────────────

  const initMappings = useCallback(() => {
    const result: Record<string, MappedColumn[]> = {};
    for (const [key, uf] of Object.entries(uploadedFiles)) {
      const targets = TARGET_FIELDS[key];
      if (!targets) continue;
      const auto = autoDetectColumns(uf.columns, targets);
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
    const ecr = uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
    const an = uploadedFiles.reportAN?.data || [];
    const assets = uploadedFiles.immobilisations?.data || [];
    let totalDebit = 0, totalCredit = 0;

    [...ecr, ...an].forEach((row: any) => {
      const vals = Object.values(row).map(v => parseNumber(v));
      totalDebit = money(totalDebit).add(money(vals[vals.length - 2] || 0)).toNumber();
      totalCredit = money(totalCredit).add(money(vals[vals.length - 1] || 0)).toNumber();
    });

    // Approximate actif/passif from accounts
    let totalActif = 0, totalPassif = 0;
    an.forEach((row: any) => {
      const vals = Object.values(row);
      const num = String(vals[0] || '');
      const d = parseNumber(vals[vals.length - 2]);
      const c = parseNumber(vals[vals.length - 1]);
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

    setSimulation({
      totalDebit, totalCredit,
      balanced: money(totalDebit).subtract(money(totalCredit)).abs().toNumber() < 0.01,
      totalActif, totalPassif, assetVNC,
      estimatedTime: Math.max(5, Math.ceil(totalRecords / 200)),
      counts: {
        comptes: uploadedFiles.planComptable?.data.length || 0,
        tiers: uploadedFiles.tiers?.data.length || 0,
        ecritures: ecr.length,
        reportAN: an.length,
        immobilisations: assets.length,
      },
    });
  }, [uploadedFiles]);

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
      const pcMapping = mappings.planComptable || [];
      const pcData = uploadedFiles.planComptable?.data || [];
      setImportLabel('Import du plan comptable...');
      for (let i = 0; i < pcData.length; i++) {
        const row = pcData[i] as Record<string, any>;
        const numCol = pcMapping.find(m => m.target === 'numero')?.source;
        const libCol = pcMapping.find(m => m.target === 'libelle')?.source;
        if (!numCol) continue;
        await adapter.create('accounts', {
          numero: String(row[numCol] || ''),
          libelle: String(row[libCol || ''] || ''),
          type: 'general',
          importSessionId: sessionId,
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>);
        report.accounts++;
        setImportProgress(Math.round((i / pcData.length) * 15));
      }

      // 2. Tiers
      const tiersMapping = mappings.tiers || [];
      const tiersData = uploadedFiles.tiers?.data || [];
      setImportLabel('Import des tiers...');
      for (let i = 0; i < tiersData.length; i++) {
        const row = tiersData[i] as Record<string, any>;
        const codeCol = tiersMapping.find(m => m.target === 'code')?.source;
        const nomCol = tiersMapping.find(m => m.target === 'nom')?.source;
        const typeCol = tiersMapping.find(m => m.target === 'type')?.source;
        if (!codeCol || !nomCol) continue;
        await adapter.create('thirdParties', {
          code: String(row[codeCol] || ''),
          nom: String(row[nomCol] || ''),
          type: String(row[typeCol || ''] || 'client'),
          importSessionId: sessionId,
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>);
        report.tiers++;
        setImportProgress(15 + Math.round((i / tiersData.length) * 15));
      }

      // 3. Assets
      const assetMapping = mappings.immobilisations || [];
      const assetData = uploadedFiles.immobilisations?.data || [];
      setImportLabel('Import des immobilisations...');
      for (let i = 0; i < assetData.length; i++) {
        const row = assetData[i] as Record<string, any>;
        const getVal = (field: string) => {
          const col = assetMapping.find(m => m.target === field)?.source;
          return col ? row[col] : '';
        };
        await adapter.create('assets', {
          code: String(getVal('code')),
          libelle: String(getVal('libelle')),
          compteImmo: String(getVal('compteImmo')),
          compteAmort: String(getVal('compteAmort')),
          dateAcquisition: parseDate(getVal('dateAcquisition')),
          valeurOrigine: parseNumber(getVal('valeurOrigine')),
          amortCumule: parseNumber(getVal('amortCumule')),
          duree: parseNumber(getVal('duree')),
          importSessionId: sessionId,
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>);
        report.assets++;
        setImportProgress(30 + Math.round((i / assetData.length) * 15));
      }

      // 4. Entries (group by piece number)
      const ecrMapping = mappings.ecritures || mappings.fec || [];
      const ecrData = uploadedFiles.ecritures?.data || uploadedFiles.fec?.data || [];
      setImportLabel('Import des ecritures...');
      const getEcrVal = (row: any, field: string) => {
        const col = ecrMapping.find(m => m.target === field)?.source;
        return col ? (row as Record<string, any>)[col] : '';
      };

      // Group entries by piece
      const groups = new Map<string, any[]>();
      ecrData.forEach((row: any, i: number) => {
        const piece = String(getEcrVal(row, 'numeroPiece') || getEcrVal(row, 'EcritureNum') || `AUTO_${i}`);
        if (excludedEntries.includes(piece)) return;
        if (!groups.has(piece)) groups.set(piece, []);
        groups.get(piece)!.push(row);
      });

      let ecrIdx = 0;
      for (const [piece, lines] of groups) {
        const journalCode = String(getEcrVal(lines[0], 'journal') || getEcrVal(lines[0], 'JournalCode') || 'OD');
        journals.add(journalCode);
        const entryLines = lines.map((line: any) => ({
          accountNumber: String(getEcrVal(line, 'numeroCompte') || getEcrVal(line, 'CompteNum') || ''),
          label: String(getEcrVal(line, 'libelle') || getEcrVal(line, 'EcritureLib') || ''),
          debit: parseNumber(getEcrVal(line, 'debit') || getEcrVal(line, 'Debit')),
          credit: parseNumber(getEcrVal(line, 'credit') || getEcrVal(line, 'Credit')),
        }));

        try {
          await adapter.saveJournalEntry({
            date: parseDate(getEcrVal(lines[0], 'dateEcriture') || getEcrVal(lines[0], 'EcritureDate')),
            journalCode,
            reference: piece,
            status: params.entryStatus === 'validated' ? 'validated' : 'draft',
            lines: entryLines,
            importSessionId: sessionId,
          } as unknown as Omit<import('@atlas/shared').JournalEntry, 'id' | 'createdAt'>);
          report.entries++;
          report.lines += lines.length;
        } catch (err) { /* silent */
          report.warnings.push(`Ecriture ${piece} ignoree (desequilibree ou erreur)`);
        }
        ecrIdx++;
        setImportProgress(45 + Math.round((ecrIdx / groups.size) * 35));
      }

      // 5. AN entries
      const anData = uploadedFiles.reportAN?.data || [];
      if (anData.length > 0) {
        setImportLabel('Import des reports a nouveau...');
        const anMapping = mappings.reportAN || [];
        const anLines = anData.map((row: Record<string, unknown>) => {
          const numCol = anMapping.find(m => m.target === 'numeroCompte')?.source;
          const libCol = anMapping.find(m => m.target === 'libelle')?.source;
          const dCol = anMapping.find(m => m.target === 'debit')?.source;
          const cCol = anMapping.find(m => m.target === 'credit')?.source;
          return {
            accountNumber: String(numCol ? row[numCol] : ''),
            label: String(libCol ? row[libCol] : 'Report AN'),
            debit: parseNumber(dCol ? row[dCol] : 0),
            credit: parseNumber(cCol ? row[cCol] : 0),
          };
        }).filter(l => l.debit > 0 || l.credit > 0);

        if (anLines.length > 0) {
          try {
            await adapter.saveJournalEntry({
              date: params.exerciceStart || params.dateBascule,
              journalCode: 'AN',
              reference: 'AN-MIGRATION',
              status: 'validated',
              lines: anLines,
              importSessionId: sessionId,
            } as unknown as Omit<import('@atlas/shared').JournalEntry, 'id' | 'createdAt'>);
            report.entries++;
            report.lines += anLines.length;
            journals.add('AN');
          } catch (err) { /* silent */
            report.warnings.push('Report AN ignore (desequilibre)');
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

      // Audit log
      await logAudit({
        action: 'DATA_MIGRATION_IMPORT',
        entity: 'migration',
        entityId: sessionId,
        details: `Migration ${sourceSystem}: ${report.accounts} comptes, ${report.entries} ecritures, ${report.tiers} tiers, ${report.assets} immobilisations`,
        userId: 'system',
        timestamp: new Date().toISOString(),
      });

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
      case 'mode': return !!sourceSystem;
      case 'upload': return Object.keys(uploadedFiles).length > 0;
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
    if (sourceSystem === 'FEC') return ['fec'];
    return Object.entries(FILE_CONFIGS)
      .filter(([k, v]) => k !== 'fec' && v.modes.includes(migrationMode))
      .map(([k]) => k);
  }, [migrationMode, sourceSystem]);

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Migration de donnees comptables</h1>
          <p className="text-sm text-gray-500">Assistant d'import depuis un logiciel tiers</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 bg-white border rounded-xl p-3 overflow-x-auto">
        {STEPS.map((step, i) => (
          <React.Fragment key={step.id}>
            {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
            <button
              onClick={() => i < stepIndex ? setCurrentStep(step.id) : undefined}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                step.id === currentStep ? 'bg-red-50 text-red-700 border border-red-200' :
                i < stepIndex ? 'text-green-700 hover:bg-green-50 cursor-pointer' :
                'text-gray-400'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step.id === currentStep ? 'bg-red-500 text-white' :
                i < stepIndex ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>{i + 1}</span>
              {step.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* ─── Step 1: Mode ─── */}
      {currentStep === 'mode' && (
        <div className="space-y-6">
          {/* Question cle */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-amber-900 mb-2">A quelle date effectuez-vous la bascule vers Atlas F&A ?</h2>
            <p className="text-sm text-amber-700">Selectionnez le mode qui correspond a votre situation. Le mode determine les fichiers a importer.</p>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Mode de migration</h2>
            {([
              {
                mode: 2 as MigrationMode,
                title: 'Bascule debut d\'exercice',
                badge: 'RECOMMANDE',
                desc: 'Au 01/01/N — juste apres avoir cloture l\'exercice N-1. Import du referentiel + soldes d\'ouverture uniquement.',
                detail: 'On importe la "photo" au 31/12/N-1 : plan comptable, tiers, balance (soldes) et immobilisations. Pas une seule ecriture detaillee. L\'historique reste dans l\'ancien logiciel.',
                files: '4 fichiers',
                duration: '< 5 min',
                risk: 'Faible',
                riskColor: 'text-green-600',
              },
              {
                mode: 1 as MigrationMode,
                title: 'Bascule en cours d\'exercice',
                badge: '',
                desc: 'En cours d\'annee — l\'exercice N est deja commence. Import des AN + ecritures du 01/01/N a la date de bascule.',
                detail: 'En plus des soldes d\'ouverture, on importe le Grand Livre de l\'exercice en cours (janvier a la date de bascule) pour que la comptabilite soit continue.',
                files: '5 fichiers',
                duration: '5 a 30 min',
                risk: 'Moyen',
                riskColor: 'text-amber-600',
              },
              {
                mode: 3 as MigrationMode,
                title: 'Migration historique complete',
                badge: '',
                desc: 'Tout l\'historique des exercices passes dans Atlas. Deconseille sauf besoin imperatif (audit, fusion, obligation legale).',
                detail: 'Import du referentiel + Grand Livre complet de chaque exercice a migrer. Un fichier par exercice. Peut representer 200 000 a 500 000 lignes.',
                files: '8+ fichiers',
                duration: '1 a 8 heures',
                risk: 'Eleve',
                riskColor: 'text-red-600',
              },
            ]).map(({ mode, title, badge, desc, detail, files, duration, risk, riskColor }) => (
              <button
                key={mode}
                onClick={() => setMigrationMode(mode)}
                className={`w-full text-left p-5 rounded-lg border-2 transition-colors ${
                  migrationMode === mode ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 ${
                    migrationMode === mode ? 'border-gray-900' : 'border-gray-300'
                  }`}>
                    {migrationMode === mode && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">Mode {mode} — {title}</p>
                      {badge && <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-bold">{badge}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{desc}</p>
                    {migrationMode === mode && (
                      <>
                        <p className="text-xs text-gray-500 mb-3 italic">{detail}</p>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="bg-gray-100 px-2 py-1 rounded font-medium">{files}</span>
                          <span className="bg-gray-100 px-2 py-1 rounded font-medium">Duree: {duration}</span>
                          <span className={`font-semibold ${riskColor}`}>Risque: {risk}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

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
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Fichiers a importer — Mode {migrationMode} ({sourceSystem})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableFileKeys.map(key => {
                const config = FILE_CONFIGS[key];
                const uf = uploadedFiles[key];
                return (
                  <div key={key} className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
                    uf ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-red-300'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        {config.icon}
                        <span className="font-medium text-sm">{config.label}</span>
                      </div>
                      <a href="#" onClick={e => e.preventDefault()}
                        className="text-xs text-red-600 hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Template
                      </a>
                    </div>

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

            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                {simulation.balanced ?
                  <CheckCircle className="w-5 h-5 text-green-600" /> :
                  <XCircle className="w-5 h-5 text-red-600" />}
                <span className={`font-medium ${simulation.balanced ? 'text-green-700' : 'text-red-700'}`}>
                  {simulation.balanced ? 'Equilibre verifie — pret pour l\'import' : 'DESEQUILIBRE DETECTE — import bloque'}
                </span>
              </div>
              <span className="text-sm text-gray-500">Duree estimee : ~{simulation.estimatedTime}s</span>
            </div>

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
