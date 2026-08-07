/**
 * BudgetImportPanel — Interface d'import d'un budget (Excel/CSV), inline.
 *
 * Logique unique partagée : modèle téléchargeable + upload + aperçu + écriture
 * réelle (budgetService.importBudget), versionnée, idempotente (« Remplacer »).
 * Utilisé à la fois par BudgetImportModal (wrapper Dialog) et par le sous-module
 * « Table & Import » du module Budget. Ne dépend d'aucun conteneur : rendu brut.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import {
  getActiveFiscalYear, inferBudgetType, importBudget, listBudgetVersions, createBudgetVersion,
  type BudgetImportLine, type BudgetVersionFull,
} from '../../features/budget/services/budgetService';
import {
  buildStandardImportLines, buildStandardTemplateSheets, standardCounts,
} from '../../features/budget/data/standardBudgetStructure';
import {
  classifyImportRows, buildImportContext, type RawImportRow, type RejectedRow, type ClassifyContext,
} from '../../features/budget/services/budgetImportService';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X, GitBranch, LayoutTemplate, XCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// Alias de détection : un fichier peut arriver avec des en-têtes FR, EN ou ES.
const MONTH_ALIASES: string[][] = [
  ['Janvier', 'January', 'Enero'], ['Février', 'February', 'Febrero'], ['Mars', 'March', 'Marzo'],
  ['Avril', 'April', 'Abril'], ['Mai', 'May', 'Mayo'], ['Juin', 'June', 'Junio'],
  ['Juillet', 'July', 'Julio'], ['Août', 'August', 'Agosto'], ['Septembre', 'September', 'Septiembre'],
  ['Octobre', 'October', 'Octubre'], ['Novembre', 'November', 'Noviembre'], ['Décembre', 'December', 'Diciembre'],
];
const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
function parseNumber(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export interface BudgetImportPanelProps {
  /** Version budgétaire pré-sélectionnée (fige le sélecteur de version). */
  initialVersionId?: string;
  /** Appelé après un import réussi (recharger les données appelantes). */
  onImported?: () => void;
  /** Si fourni, affiche un bouton de fermeture (X) et l'appelle après import. */
  onClose?: () => void;
}

const BudgetImportPanel: React.FC<BudgetImportPanelProps> = ({ initialVersionId, onImported, onClose }) => {
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
  const { toast } = useToast();
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BudgetImportLine[]>([]);
  const [fileName, setFileName] = useState('');
  const [replace, setReplace] = useState(true);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rejected, setRejected] = useState<RejectedRow[]>([]);
  const [allOrNothing, setAllOrNothing] = useState(true);
  const ctxRef = useRef<ClassifyContext | null>(null);
  // Versioning : cible = '' (version active), un id existant, ou 'new'
  const [versions, setVersions] = useState<BudgetVersionFull[]>([]);
  const [target, setTarget] = useState<string>(initialVersionId || '');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'initial' | 'revise' | 'atterrissage'>('revise');

  useEffect(() => {
    listBudgetVersions(adapter).then(setVersions).catch(() => setVersions([]));
    buildImportContext(adapter).then((c) => { ctxRef.current = c; }).catch(() => {});
    if (initialVersionId) setTarget(initialVersionId);
  }, [adapter, initialVersionId]);

  const reset = () => { setRows([]); setRejected([]); setFileName(''); setWarnings([]); setTarget(initialVersionId || ''); setNewLabel(''); };

  // Modèle Excel = STRUCTURE STANDARD complète (référentiel SYSCOHADA).
  const downloadTemplate = () => {
    const { budget, notice } = buildStandardTemplateSheets(t('budgetImport.monthsLong').split(','));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budget), 'Budget');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notice), 'Notice');
    XLSX.writeFile(wb, 'modele_budget_standard_syscohada.xlsx');
  };

  // Charge la structure standard (toutes lignes à 0) directement dans l'aperçu.
  const loadStandardSkeleton = () => {
    setRows(buildStandardImportLines());
    setRejected([]);
    setFileName(t('budgetImport.standardSkeletonName'));
    setWarnings([t('budgetImport.skeletonWarning')]);
    toast.success(t('budgetImport.standardLinesLoaded', { count: String(standardCounts().total) }));
  };

  const downloadReport = () => {
    const header = [t('budgetImport.colRow'), t('budgetImport.colAccount'), t('budgetImport.colReasons')].join(';') + '\n';
    const body = rejected.map((r) => `${r.rowNumber};${r.account_code};"${r.reasons.join(' | ')}"`).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'rapport_import_budget.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File) => {
    setFileName(file.name); setWarnings([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (data.length === 0) { toast.error(t('budgetImport.emptyFile')); return; }
      const cols = Object.keys(data[0]);
      const find = (...cands: string[]) => cols.find(c => cands.includes(norm(c)));
      const compteCol = find('compte', 'account', 'accountcode', 'numerocompte', 'numerodecompte');
      const typeCol = find('type', 'typeexploitationinvestissement', 'budgettype');
      const sectionCol = find('section', 'sectionoptionnel', 'sectionanalytique');
      const monthCols = MONTH_ALIASES.map((names, i) => cols.find(c => [
        ...names.flatMap(n => [norm(n), norm(n.slice(0, 3))]),
        String(i + 1), `m${i + 1}`, `mois${i + 1}`, `month${i + 1}`, `mes${i + 1}`,
      ].includes(norm(c))));
      const annualCol = find('annuel', 'total', 'montant', 'montantannuel');
      if (!compteCol) { toast.error(t('budgetImport.accountColMissing')); return; }
      const localWarnings: string[] = [];
      const parsed: BudgetImportLine[] = [];
      for (const r of data) {
        const account_code = String(r[compteCol] ?? '').trim();
        if (!account_code) continue;
        const typeRaw = typeCol ? norm(String(r[typeCol])) : '';
        const budget_type: 'exploitation' | 'investissement' =
          typeRaw.startsWith('invest') ? 'investissement' : typeRaw.startsWith('exploit') ? 'exploitation' : inferBudgetType(account_code);
        const section_code = sectionCol ? String(r[sectionCol] ?? '').trim() || null : null;
        const periods: Record<number, number> = {}; let hasMonthly = false;
        for (let i = 1; i <= 12; i++) { const col = monthCols[i - 1]; const v = col ? parseNumber(r[col]) : 0; if (v) hasMonthly = true; periods[i] = v; }
        if (!hasMonthly && annualCol) { const per = Math.round((parseNumber(r[annualCol]) / 12) * 100) / 100; for (let i = 1; i <= 12; i++) periods[i] = per; }
        parsed.push({ account_code, budget_type, section_code, periods });
      }
      if (parsed.length === 0) { toast.error(t('budgetImport.noUsableRow')); return; }
      if (!monthCols.some(Boolean) && !annualCol) localWarnings.push(t('budgetImport.noAmountColumn'));
      // Validation 3 passes (structure/référentiels/montants) → valides vs rejetées.
      const ctx = ctxRef.current ?? await buildImportContext(adapter);
      ctxRef.current = ctx;
      const raw: RawImportRow[] = parsed.map((p, i) => ({ rowNumber: i + 1, account_code: p.account_code, section_code: p.section_code, periods: p.periods }));
      const { valid, rejected: rej } = classifyImportRows(raw, ctx);
      setRows(valid); setRejected(rej); setWarnings(localWarnings);
      if (rej.length) toast.error(t('budgetImport.validAndRejected', { valid: String(valid.length), rejected: String(rej.length) }));
      else toast.success(t('budgetImport.validLines', { count: String(valid.length) }));
    } catch (e: any) { toast.error(t('budgetImport.readFailed', { message: e?.message || t('budgetImport.invalidFile') })); }
  };

  const totals = useMemo(() => {
    let exploitation = 0, investissement = 0;
    for (const r of rows) { const a = Object.values(r.periods).reduce((s, v) => s + v, 0); if (r.budget_type === 'investissement') investissement += a; else exploitation += a; }
    return { exploitation, investissement, count: rows.length };
  }, [rows]);

  const handleImport = async () => {
    if (rows.length === 0) { toast.error(t('budgetImport.noValidLine')); return; }
    if (allOrNothing && rejected.length > 0) { toast.error(t('budgetImport.allOrNothingBlocked', { count: String(rejected.length) })); return; }
    if (target === 'new' && !newLabel.trim()) { toast.error(t('budgetImport.newVersionLabelRequired')); return; }
    setImporting(true);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy) throw new Error(t('budgetImport.noFiscalYear'));
      let versionId: string | undefined;
      let cibleLabel: string;
      if (target === 'new') {
        versionId = await createBudgetVersion(adapter, { fiscalYearId: fy.id, libelle: newLabel.trim(), type: newType, setActive: true });
        cibleLabel = t('budgetImport.targetNewVersion', { name: newLabel.trim() });
      } else if (target) {
        versionId = target;
        cibleLabel = t('budgetImport.targetVersion', { name: versions.find(v => v.id === target)?.libelle || target });
      } else {
        cibleLabel = t('budgetImport.targetActiveVersion');
      }
      if (!window.confirm(t('budgetImport.confirmImport', {
        count: String(rows.length), target: cibleLabel, year: fy.code,
        mode: replace ? t('budgetImport.modeReplace') : t('budgetImport.modeMerge'),
      }))) { setImporting(false); return; }
      const res = await importBudget(adapter, { fiscalYearId: fy.id, versionLibelle: `Budget ${fy.code}`, lines: rows, replace, versionId });
      toast.success(t('budgetImport.importDone', { lines: String(res.linesCreated), periods: String(res.periodsCreated) }));
      reset(); onImported?.(); onClose?.();
    } catch (e: any) { toast.error(t('budgetImport.importFailed', { message: e?.message || t('budgetImport.errorWord') })); }
    finally { setImporting(false); }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-[var(--color-primary)]" /></div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{t('budgetImport.title')}</h3>
            <p className="text-xs text-gray-500">{t('budgetImport.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadStandardSkeleton} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5" title={t('budgetImport.standardStructureTitle')}><LayoutTemplate className="w-4 h-4" />{t('budgetImport.standardStructure')}</button>
          <button onClick={downloadTemplate} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"><Download className="w-4 h-4" />{t('budgetImport.excelTemplate')}</button>
          {onClose && <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>}
        </div>
      </div>

      {/* Versioning : version cible de l'import */}
      {initialVersionId ? (
        <div className="mb-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5" />{t('budgetImport.importIntoVersion', { name: versions.find(v => v.id === initialVersionId)?.libelle || t('budgetImport.currentVersion') })}
        </div>
      ) : (
        <div className="mb-4 bg-gray-50 rounded-lg p-3">
          <span className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1.5"><GitBranch className="w-3.5 h-3.5" />{t('budgetImport.targetVersionLabel')}</span>
          <select value={target} onChange={e => setTarget(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="">{t('budgetImport.activeVersionOption', {
              suffix: versions.find(v => v.is_active)
                ? t('budgetImport.activeVersionName', { name: versions.find(v => v.is_active)!.libelle })
                : t('budgetImport.createdIfMissing'),
            })}</option>
            {versions.filter(v => !v.is_active && v.statut !== 'verrouille').map(v => (
              <option key={v.id} value={v.id}>{v.libelle} — {v.type} ({v.statut})</option>
            ))}
            <option value="new">{t('budgetImport.newVersionOption')}</option>
          </select>
          {target === 'new' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder={t('budgetImport.newVersionPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              <select value={newType} onChange={e => setNewType(e.target.value as any)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="initial">{t('budgetImport.typeInitial')}</option>
                <option value="revise">{t('budgetImport.typeRevised')}</option>
                <option value="atterrissage">{t('budgetImport.typeLanding')}</option>
              </select>
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-1.5">{t('budgetImport.versioningHint')}</p>
        </div>
      )}

      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center justify-center hover:border-[var(--color-primary)] transition-colors">
        <Upload className="w-8 h-8 text-gray-400 mb-2" />
        <span className="text-sm font-medium text-[var(--color-primary)]">{fileName || t('budgetImport.chooseFile')}</span>
      </button>
      {warnings.map((w, i) => (
        <div key={i} className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2"><AlertTriangle className="w-3.5 h-3.5" />{w}</div>
      ))}

      {rejected.length > 0 && (
        <div className="mt-3 border border-red-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-red-200 bg-red-50 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-medium text-red-700 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" />{t('budgetImport.rejectedLines', { count: String(rejected.length) })}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-600"><input type="checkbox" checked={allOrNothing} onChange={(e) => setAllOrNothing(e.target.checked)} className="rounded border-gray-300" />{t('budgetImport.allOrNothing')}</label>
              <button onClick={downloadReport} className="text-xs text-red-700 underline">{t('budgetImport.downloadReport')}</button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-red-50/50 sticky top-0"><tr><th className="px-3 py-1.5 text-left text-red-700">{t('budgetImport.colRow')}</th><th className="px-3 py-1.5 text-left text-red-700">{t('budgetImport.colAccount')}</th><th className="px-3 py-1.5 text-left text-red-700">{t('budgetImport.colReasons')}</th></tr></thead>
              <tbody className="divide-y divide-red-100">
                {rejected.slice(0, 200).map((r) => (
                  <tr key={r.rowNumber}><td className="px-3 py-1.5">{r.rowNumber}</td><td className="px-3 py-1.5 font-mono">{r.account_code || '—'}</td><td className="px-3 py-1.5 text-red-600">{r.reasons.join(' · ')}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-600">{t('budgetImport.summaryLine', {
              count: String(totals.count),
              opex: formatCurrency(totals.exploitation),
              capex: formatCurrency(totals.investissement),
            })}</p>
            <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="rounded border-gray-300" />{t('budgetImport.replaceExisting')}</label>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 text-left text-gray-600">{t('budgetImport.colAccount')}</th><th className="px-3 py-2 text-left text-gray-600">{t('budgetImport.colType')}</th><th className="px-3 py-2 text-right text-gray-600">{t('budgetImport.colAnnualTotal')}</th></tr></thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 200).map((r, i) => (
                  <tr key={i}><td className="px-3 py-1.5 font-mono">{fmtAccount(r.account_code)}</td><td className="px-3 py-1.5">{r.budget_type}</td><td className="px-3 py-1.5 text-right">{formatCurrency(Object.values(r.periods).reduce((s, v) => s + v, 0))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-5">
        {onClose && <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{t('budgetImport.cancel')}</button>}
        <button onClick={handleImport} disabled={importing || rows.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{importing ? t('budgetImport.importing') : t('budgetImport.import')}</button>
      </div>
    </div>
  );
};

export default BudgetImportPanel;
