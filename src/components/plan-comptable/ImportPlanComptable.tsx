/**
 * ImportPlanComptable — Modal multi-étapes pour l'import CSV/Excel du plan comptable
 * Upload → Mapping colonnes → Prévisualisation → Import → Rapport
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Upload, X, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, ChevronLeft, Loader2, Download, Columns, Eye, Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { planComptableService } from '../../services/accounting/planComptableService';
import { aliasTiersService } from '../../services/accounting/aliasTiersService';
import { isAliasEligible, getPrefixForSousCompte } from '../../data/alias-tiers-config';

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'report';

interface RawRow {
  [key: string]: string | number | undefined;
}

type ColumnRole = 'code' | 'libelle' | 'classe' | 'nature' | 'sens' | 'alias' | 'ignore';

interface ColumnMapping {
  header: string;
  role: ColumnRole;
}

interface ParsedAccount {
  rowIndex: number;
  code: string;
  libelle: string;
  classe: string;
  nature: string;
  sens: string;
  alias: string;
  status: 'valid' | 'warning' | 'error';
  messages: string[];
}

interface ImportReport {
  created: number;
  aliasCreated: number;
  aliasAttached: number;
  errors: number;
  details: { row: number; code: string; libelle: string; result: 'ok' | 'alias' | 'error'; message: string }[];
}

// ============================================================================
// COLUMN AUTO-DETECTION
// ============================================================================

const ROLE_PATTERNS: Record<ColumnRole, RegExp> = {
  code: /^(code|numero|num|compte|account|no)/i,
  libelle: /^(libelle|libell|label|nom|name|designation|intitule)/i,
  classe: /^(classe|class|cat)/i,
  nature: /^(nature|type)/i,
  sens: /^(sens|solde|balance|normal)/i,
  alias: /^(alias|tiers|ref)/i,
  ignore: /^$/,
};

function autoDetectRole(header: string): ColumnRole {
  const h = header.trim();
  for (const [role, pattern] of Object.entries(ROLE_PATTERNS) as [ColumnRole, RegExp][]) {
    if (role === 'ignore') continue;
    if (pattern.test(h)) return role;
  }
  return 'ignore';
}

// ============================================================================
// VALIDATION
// ============================================================================

const VALID_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const VALID_NATURES = ['ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT', 'SPECIAL', 'MIXTE'];
const VALID_SENS = ['DEBITEUR', 'CREDITEUR'];

function validateRow(row: ParsedAccount): ParsedAccount {
  const messages: string[] = [];
  let status: 'valid' | 'warning' | 'error' = 'valid';

  // Code validation
  if (!row.code || row.code.trim().length < 2) {
    messages.push('Code manquant ou trop court (min 2 chiffres)');
    status = 'error';
  } else if (!/^\d+$/.test(row.code.trim())) {
    messages.push('Le code ne doit contenir que des chiffres');
    status = 'error';
  } else {
    const classCode = row.code.charAt(0);
    if (!VALID_CLASSES.includes(classCode)) {
      messages.push(`Classe invalide: ${classCode}`);
      status = 'error';
    }
  }

  // Libellé validation
  if (!row.libelle || row.libelle.trim().length < 2) {
    messages.push('Libelle manquant ou trop court');
    status = 'error';
  }

  // Nature warning (not blocking)
  if (row.nature && !VALID_NATURES.includes(row.nature.toUpperCase())) {
    messages.push(`Nature non standard: ${row.nature}`);
    if (status !== 'error') status = 'warning';
  }

  // Sens warning
  if (row.sens && !VALID_SENS.includes(row.sens.toUpperCase())) {
    messages.push(`Sens non standard: ${row.sens}`);
    if (status !== 'error') status = 'warning';
  }

  return { ...row, status, messages };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ImportPlanComptable({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [fileName, setFileName] = useState('');
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedAccount[]>([]);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- STEP 1: Upload & Parse ----
  const handleFile = useCallback((file: File) => {
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: RawRow[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (json.length === 0) {
          toast.error('Fichier vide ou format non reconnu');
          return;
        }

        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRawData(json);

        // Auto-detect column mappings
        const autoMappings: ColumnMapping[] = hdrs.map(h => ({
          header: h,
          role: autoDetectRole(h),
        }));
        setMappings(autoMappings);
        setStep('mapping');
      } catch {
        toast.error('Erreur de lecture du fichier. Verifiez le format.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ---- STEP 2: Mapping ----
  const updateMapping = (index: number, role: ColumnRole) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, role } : m));
  };

  const hasRequiredMappings = mappings.some(m => m.role === 'code') && mappings.some(m => m.role === 'libelle');

  const proceedToPreview = () => {
    const codeCol = mappings.find(m => m.role === 'code')?.header;
    const libelleCol = mappings.find(m => m.role === 'libelle')?.header;
    const classeCol = mappings.find(m => m.role === 'classe')?.header;
    const natureCol = mappings.find(m => m.role === 'nature')?.header;
    const sensCol = mappings.find(m => m.role === 'sens')?.header;
    const aliasCol = mappings.find(m => m.role === 'alias')?.header;

    const parsed: ParsedAccount[] = rawData.map((row, i) => {
      const code = String(codeCol ? row[codeCol] ?? '' : '').trim();
      return validateRow({
        rowIndex: i + 1,
        code,
        libelle: String(libelleCol ? row[libelleCol] ?? '' : '').trim(),
        classe: String(classeCol ? row[classeCol] ?? '' : code.charAt(0)).trim(),
        nature: String(natureCol ? row[natureCol] ?? '' : '').trim(),
        sens: String(sensCol ? row[sensCol] ?? '' : '').trim(),
        alias: String(aliasCol ? row[aliasCol] ?? '' : '').trim(),
        status: 'valid',
        messages: [],
      });
    });

    setParsedRows(parsed);
    setStep('preview');
  };

  // ---- STEP 3/4: Import ----
  const validRows = parsedRows.filter(r => r.status !== 'error');
  const errorRows = parsedRows.filter(r => r.status === 'error');

  const runImport = async () => {
    setStep('importing');
    const details: ImportReport['details'] = [];
    let created = 0;
    let aliasCreated = 0;
    let aliasAttached = 0;
    let errors = 0;

    for (const row of validRows) {
      try {
        const classCode = row.code.charAt(0);
        const normalBalance: 'debit' | 'credit' =
          row.sens?.toUpperCase() === 'CREDITEUR' ? 'credit' : 'debit';

        await planComptableService.createAccount({
          code: row.code,
          name: row.libelle,
          accountClass: classCode,
          accountType: ['1', '2', '3', '4', '5'].includes(classCode) ? 'bilan' : ['6', '7'].includes(classCode) ? 'gestion' : 'special',
          level: 4,
          normalBalance,
          isReconcilable: classCode === '4' || classCode === '5',
          isActive: true,
        });
        created++;

        // Handle alias if eligible
        const sousCompteCode = row.code.slice(0, 3);
        if (isAliasEligible(sousCompteCode)) {
          const prefix = getPrefixForSousCompte(sousCompteCode)!;
          if (row.alias) {
            // Explicit alias from file
            await aliasTiersService.createAlias({
              alias: row.alias,
              prefix,
              label: row.libelle,
              comptesComptables: [row.code],
            });
            aliasCreated++;
            details.push({ row: row.rowIndex, code: row.code, libelle: row.libelle, result: 'alias', message: `Alias ${row.alias} cree` });
          } else {
            // Auto-generate alias
            const nextAlias = await aliasTiersService.getNextAlias(prefix);
            await aliasTiersService.createAlias({
              alias: nextAlias,
              prefix,
              label: row.libelle,
              comptesComptables: [row.code],
            });
            aliasCreated++;
            details.push({ row: row.rowIndex, code: row.code, libelle: row.libelle, result: 'alias', message: `Alias ${nextAlias} auto-genere` });
          }
        } else {
          details.push({ row: row.rowIndex, code: row.code, libelle: row.libelle, result: 'ok', message: 'Compte cree' });
        }
      } catch (err: any) {
        errors++;
        details.push({ row: row.rowIndex, code: row.code, libelle: row.libelle, result: 'error', message: err.message || 'Erreur' });
      }
    }

    setReport({ created, aliasCreated, aliasAttached, errors, details });
    setStep('report');
  };

  // ---- RENDER ----
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-neutral-800">Importer un Plan Comptable</h2>
            <span className="text-xs text-neutral-400 font-mono">
              {step === 'upload' && '1/4'}
              {step === 'mapping' && '2/4'}
              {step === 'preview' && '3/4'}
              {step === 'importing' && '3/4'}
              {step === 'report' && '4/4'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/60 rounded-lg transition-colors">
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {/* STEP 1 — Upload */}
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-neutral-300 hover:border-blue-400'
                  }`}
                >
                  <Upload className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
                  <p className="text-base font-medium text-neutral-700 mb-1">Glissez votre fichier ici</p>
                  <p className="text-sm text-neutral-500 mb-3">ou cliquez pour selectionner</p>
                  <span className="inline-block px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Selectionner un fichier
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 text-sm mb-1.5">Formats acceptes :</h4>
                  <ul className="text-xs text-blue-700 space-y-0.5">
                    <li>CSV avec separateur point-virgule (;) ou virgule (,)</li>
                    <li>Excel (.xlsx, .xls)</li>
                    <li>Colonnes requises : <span className="font-bold">Code</span>, <span className="font-bold">Libelle</span></li>
                    <li>Optionnel : Classe, Nature, Sens, Alias</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — Mapping */}
            {step === 'mapping' && (
              <motion.div key="mapping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Columns className="w-4 h-4" />
                  <span>Fichier : <span className="font-semibold">{fileName}</span> — {rawData.length} lignes detectees</span>
                </div>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">Colonne du fichier</th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">Apercu</th>
                        <th className="px-3 py-2 text-left font-semibold text-neutral-600">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappings.map((m, i) => (
                        <tr key={i} className="border-t border-neutral-100">
                          <td className="px-3 py-2 font-mono font-medium text-neutral-800">{m.header}</td>
                          <td className="px-3 py-2 text-neutral-500 truncate max-w-[150px]">
                            {String(rawData[0]?.[m.header] ?? '').slice(0, 30)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={m.role}
                              onChange={(e) => updateMapping(i, e.target.value as ColumnRole)}
                              className={`px-2 py-1 border rounded text-xs font-medium ${
                                m.role === 'code' ? 'border-green-400 bg-green-50 text-green-800' :
                                m.role === 'libelle' ? 'border-blue-400 bg-blue-50 text-blue-800' :
                                m.role === 'ignore' ? 'border-neutral-200 text-neutral-400' :
                                'border-purple-300 bg-purple-50 text-purple-800'
                              }`}
                            >
                              <option value="ignore">— Ignorer —</option>
                              <option value="code">Code compte</option>
                              <option value="libelle">Libelle</option>
                              <option value="classe">Classe</option>
                              <option value="nature">Nature</option>
                              <option value="sens">Sens normal</option>
                              <option value="alias">Alias tiers</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!hasRequiredMappings && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Les colonnes <span className="font-bold">Code</span> et <span className="font-bold">Libelle</span> sont obligatoires.
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 3 — Preview */}
            {step === 'preview' && (
              <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded font-medium text-green-700">
                    <CheckCircle2 className="w-3 h-3" /> {validRows.length} valides
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded font-medium text-amber-700">
                    <AlertTriangle className="w-3 h-3" /> {parsedRows.filter(r => r.status === 'warning').length} warnings
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded font-medium text-red-700">
                    <XCircle className="w-3 h-3" /> {errorRows.length} erreurs
                  </span>
                </div>
                <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-neutral-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left w-8">#</th>
                        <th className="px-2 py-1.5 text-left w-6"></th>
                        <th className="px-2 py-1.5 text-left font-mono">Code</th>
                        <th className="px-2 py-1.5 text-left">Libelle</th>
                        <th className="px-2 py-1.5 text-left">Cl.</th>
                        <th className="px-2 py-1.5 text-left">Alias</th>
                        <th className="px-2 py-1.5 text-left">Messages</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={`border-t border-neutral-100 ${
                            row.status === 'error' ? 'bg-red-50/50' :
                            row.status === 'warning' ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <td className="px-2 py-1.5 text-neutral-400">{row.rowIndex}</td>
                          <td className="px-2 py-1.5">
                            {row.status === 'valid' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                            {row.status === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                            {row.status === 'error' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                          </td>
                          <td className="px-2 py-1.5 font-mono font-medium">{row.code}</td>
                          <td className="px-2 py-1.5 truncate max-w-[180px]">{row.libelle}</td>
                          <td className="px-2 py-1.5">{row.classe}</td>
                          <td className="px-2 py-1.5">
                            {row.alias ? (
                              <span className="font-mono text-purple-700">{row.alias}</span>
                            ) : isAliasEligible(row.code?.slice(0, 3)) ? (
                              <span className="text-purple-400 italic">auto</span>
                            ) : null}
                          </td>
                          <td className="px-2 py-1.5 text-neutral-500">{row.messages.join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* STEP — Importing */}
            {step === 'importing' && (
              <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-sm text-neutral-600 font-medium">Import en cours...</p>
                <p className="text-xs text-neutral-400 mt-1">{validRows.length} comptes a traiter</p>
              </motion.div>
            )}

            {/* STEP 4 — Report */}
            {step === 'report' && report && (
              <motion.div key="report" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{report.created}</p>
                    <p className="text-[11px] text-green-600 font-medium">Comptes crees</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{report.aliasCreated}</p>
                    <p className="text-[11px] text-purple-600 font-medium">Alias crees</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{report.aliasAttached}</p>
                    <p className="text-[11px] text-blue-600 font-medium">Alias rattaches</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{report.errors}</p>
                    <p className="text-[11px] text-red-600 font-medium">Erreurs</p>
                  </div>
                </div>
                {report.details.length > 0 && (
                  <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-[30vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-neutral-50 sticky top-0">
                        <tr>
                          <th className="px-2 py-1.5 text-left">#</th>
                          <th className="px-2 py-1.5 text-left font-mono">Code</th>
                          <th className="px-2 py-1.5 text-left">Libelle</th>
                          <th className="px-2 py-1.5 text-left">Resultat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.details.map((d, i) => (
                          <tr key={i} className={`border-t border-neutral-100 ${d.result === 'error' ? 'bg-red-50/50' : ''}`}>
                            <td className="px-2 py-1.5 text-neutral-400">{d.row}</td>
                            <td className="px-2 py-1.5 font-mono font-medium">{d.code}</td>
                            <td className="px-2 py-1.5 truncate max-w-[180px]">{d.libelle}</td>
                            <td className="px-2 py-1.5">
                              {d.result === 'ok' && <span className="text-green-600">{d.message}</span>}
                              {d.result === 'alias' && <span className="text-purple-600">{d.message}</span>}
                              {d.result === 'error' && <span className="text-red-600">{d.message}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-between shrink-0">
          <div>
            {(step === 'mapping' || step === 'preview') && (
              <button
                onClick={() => setStep(step === 'preview' ? 'mapping' : 'upload')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Retour
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onSuccess?.(); onClose(); }}
              className="px-3 py-1.5 text-sm text-neutral-600 border border-neutral-300 rounded-lg hover:bg-neutral-50"
            >
              {step === 'report' ? 'Fermer' : 'Annuler'}
            </button>

            {step === 'mapping' && (
              <button
                onClick={proceedToPreview}
                disabled={!hasRequiredMappings}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="w-3.5 h-3.5" />
                Previsualiser
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={runImport}
                disabled={validRows.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-3.5 h-3.5" />
                Importer {validRows.length} comptes
              </button>
            )}

            {step === 'report' && (
              <button
                onClick={() => { onSuccess?.(); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terminer
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
