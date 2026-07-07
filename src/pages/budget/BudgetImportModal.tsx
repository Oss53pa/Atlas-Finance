/**
 * BudgetImportModal — Import d'un budget Excel (action, pas un module).
 * Lancé depuis le Cockpit. Modèle téléchargeable + upload + aperçu + écriture
 * réelle (budgetService.importBudget). Idempotent (option « Remplacer »).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../../contexts/DataContext';
import { useAccountNames } from '../../hooks/useAccountNames';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import {
  getActiveFiscalYear, inferBudgetType, importBudget, listBudgetVersions, createBudgetVersion,
  type BudgetImportLine, type BudgetVersionFull,
} from '../../features/budget/services/budgetService';
import {
  buildStandardImportLines, buildStandardTemplateSheets, standardCounts,
} from '../../features/budget/data/standardBudgetStructure';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X, GitBranch, LayoutTemplate } from 'lucide-react';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
function parseNumber(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[\s ]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

interface Props { open: boolean; onClose: () => void; onImported?: () => void; initialVersionId?: string }

const BudgetImportModal: React.FC<Props> = ({ open, onClose, onImported, initialVersionId }) => {
  const { adapter } = useData();
  const { format: fmtAccount } = useAccountNames();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BudgetImportLine[]>([]);
  const [fileName, setFileName] = useState('');
  const [replace, setReplace] = useState(true);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  // Versioning : cible = '' (version active), un id existant, ou 'new'
  const [versions, setVersions] = useState<BudgetVersionFull[]>([]);
  const [target, setTarget] = useState<string>('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'initial' | 'revise' | 'atterrissage'>('revise');

  useEffect(() => {
    if (!open) return;
    listBudgetVersions(adapter).then(setVersions).catch(() => setVersions([]));
    if (initialVersionId) setTarget(initialVersionId);
  }, [open, adapter, initialVersionId]);

  const reset = () => { setRows([]); setFileName(''); setWarnings([]); setTarget(initialVersionId || ''); setNewLabel(''); };

  // Modèle Excel = STRUCTURE STANDARD complète (référentiel SYSCOHADA) : toutes les
  // rubriques normalisées, prêtes à chiffrer, + onglet Notice.
  const downloadTemplate = () => {
    const { budget, notice } = buildStandardTemplateSheets(MONTHS);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(budget), 'Budget');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(notice), 'Notice');
    XLSX.writeFile(wb, 'modele_budget_standard_syscohada.xlsx');
  };

  // Charge la structure standard (toutes lignes à 0) directement dans l'aperçu :
  // permet de créer le squelette budgétaire sans passer par Excel.
  const loadStandardSkeleton = () => {
    setRows(buildStandardImportLines());
    setFileName('Structure standard SYSCOHADA');
    setWarnings(['Squelette à 0 : chiffrez ensuite les montants via « Saisir » ou par ré-import.']);
    toast.success(`${standardCounts().total} lignes standard chargées`);
  };

  const onFile = async (file: File) => {
    setFileName(file.name); setWarnings([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      if (data.length === 0) { toast.error('Fichier vide'); return; }
      const cols = Object.keys(data[0]);
      const find = (...cands: string[]) => cols.find(c => cands.includes(norm(c)));
      const compteCol = find('compte', 'account', 'accountcode', 'numerocompte', 'numerodecompte');
      const typeCol = find('type', 'typeexploitationinvestissement', 'budgettype');
      const sectionCol = find('section', 'sectionoptionnel', 'sectionanalytique');
      const monthCols = MONTHS.map((m, i) => cols.find(c => [norm(m), norm(m.slice(0, 3)), String(i + 1), `m${i + 1}`, `mois${i + 1}`].includes(norm(c))));
      const annualCol = find('annuel', 'total', 'montant', 'montantannuel');
      if (!compteCol) { toast.error('Colonne « Compte » introuvable'); return; }
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
      if (parsed.length === 0) { toast.error('Aucune ligne exploitable'); return; }
      if (!monthCols.some(Boolean) && !annualCol) localWarnings.push('Aucune colonne de montant détectée (mois ou Annuel) — les montants seront à 0.');
      setRows(parsed); setWarnings(localWarnings);
      toast.success(`${parsed.length} ligne(s) lue(s)`);
    } catch (e: any) { toast.error('Lecture impossible : ' + (e?.message || 'fichier invalide')); }
  };

  const totals = useMemo(() => {
    let exploitation = 0, investissement = 0;
    for (const r of rows) { const a = Object.values(r.periods).reduce((s, v) => s + v, 0); if (r.budget_type === 'investissement') investissement += a; else exploitation += a; }
    return { exploitation, investissement, count: rows.length };
  }, [rows]);

  const handleImport = async () => {
    if (rows.length === 0) { toast.error('Aucune ligne à importer'); return; }
    if (target === 'new' && !newLabel.trim()) { toast.error('Libellé de la nouvelle version requis'); return; }
    setImporting(true);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy) throw new Error('Aucun exercice fiscal trouvé.');
      // Résolution de la version cible (versioning)
      let versionId: string | undefined;
      let cibleLabel: string;
      if (target === 'new') {
        versionId = await createBudgetVersion(adapter, { fiscalYearId: fy.id, libelle: newLabel.trim(), type: newType, setActive: true });
        cibleLabel = `nouvelle version « ${newLabel.trim()} »`;
      } else if (target) {
        versionId = target;
        cibleLabel = `version « ${versions.find(v => v.id === target)?.libelle || target} »`;
      } else {
        cibleLabel = 'version active';
      }
      if (!window.confirm(`Importer ${rows.length} ligne(s) dans la ${cibleLabel} (exercice ${fy.code}) ?\n${replace ? '⚠️ Mode REMPLACER : les lignes existantes de cette version seront supprimées.' : 'Mode AJOUT (fusion).'}`)) { setImporting(false); return; }
      const res = await importBudget(adapter, { fiscalYearId: fy.id, versionLibelle: `Budget ${fy.code}`, lines: rows, replace, versionId });
      toast.success(`Budget importé : ${res.linesCreated} ligne(s), ${res.periodsCreated} période(s).`);
      reset(); onImported?.(); onClose();
    } catch (e: any) { toast.error('Import échoué : ' + (e?.message || 'erreur')); }
    finally { setImporting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }} containerClassName="max-w-3xl">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-[var(--color-primary)]" /></div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Importer un Budget</h3>
              <p className="text-xs text-gray-500">Excel : Compte · Type · Section · 12 mois (ou colonne Annuel)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadStandardSkeleton} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5" title="Charger toutes les rubriques standard (montants à 0)"><LayoutTemplate className="w-4 h-4" />Structure standard</button>
            <button onClick={downloadTemplate} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"><Download className="w-4 h-4" />Modèle Excel</button>
            <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Versioning : version cible de l'import */}
        {initialVersionId ? (
          <div className="mb-4 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" />Import dans la version « {versions.find(v => v.id === initialVersionId)?.libelle || 'courante'} »
          </div>
        ) : (
          <div className="mb-4 bg-gray-50 rounded-lg p-3">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1 mb-1.5"><GitBranch className="w-3.5 h-3.5" />Version budgétaire cible</label>
            <select value={target} onChange={e => setTarget(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">Version active {versions.find(v => v.is_active) ? `(« ${versions.find(v => v.is_active)!.libelle} »)` : '(créée si absente)'}</option>
              {versions.filter(v => !v.is_active && v.statut !== 'verrouille').map(v => (
                <option key={v.id} value={v.id}>{v.libelle} — {v.type} ({v.statut})</option>
              ))}
              <option value="new">➕ Nouvelle version…</option>
            </select>
            {target === 'new' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Libellé (ex. Budget révisé S2)" className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                <select value={newType} onChange={e => setNewType(e.target.value as any)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  <option value="initial">Initial</option>
                  <option value="revise">Révisé</option>
                  <option value="atterrissage">Atterrissage</option>
                </select>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5">L'import est versionné : choisissez la version active, une version existante, ou créez-en une nouvelle (devient active).</p>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <button onClick={() => fileRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center justify-center hover:border-[var(--color-primary)] transition-colors">
          <Upload className="w-8 h-8 text-gray-400 mb-2" />
          <span className="text-sm font-medium text-[var(--color-primary)]">{fileName || 'Choisir un fichier budget (.xlsx)'}</span>
        </button>
        {warnings.map((w, i) => (
          <div key={i} className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2"><AlertTriangle className="w-3.5 h-3.5" />{w}</div>
        ))}

        {rows.length > 0 && (
          <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-gray-600">{totals.count} ligne(s) · Exploitation {formatCurrency(totals.exploitation)} · Invest. {formatCurrency(totals.investissement)}</p>
              <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="rounded border-gray-300" />Remplacer l'existant</label>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0"><tr><th className="px-3 py-2 text-left text-gray-600">Compte</th><th className="px-3 py-2 text-left text-gray-600">Type</th><th className="px-3 py-2 text-right text-gray-600">Total annuel</th></tr></thead>
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
          <button onClick={() => { reset(); onClose(); }} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
          <button onClick={handleImport} disabled={importing || rows.length === 0} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{importing ? 'Import…' : 'Importer'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetImportModal;
