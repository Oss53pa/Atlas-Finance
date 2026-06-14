/**
 * BudgetImportPage — /budget/import (CDC V3 §2/§6).
 *
 * Import d'un budget depuis Excel : modèle téléchargeable (Compte, Type,
 * Section, 12 mois) → aperçu → écriture réelle (budget_versions / budget_lines /
 * budget_line_periods via budgetService). Idempotent (option « Remplacer »).
 */
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import {
  getActiveFiscalYear, inferBudgetType, importBudget, type BudgetImportLine,
} from '../../features/budget/services/budgetService';
import { ArrowLeft, Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function parseNumber(v: any): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[\s ]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

const BudgetImportPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BudgetImportLine[]>([]);
  const [fileName, setFileName] = useState('');
  const [replace, setReplace] = useState(true);
  const [importing, setImporting] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const downloadTemplate = () => {
    const header = ['Compte', 'Libellé', 'Type (exploitation/investissement)', 'Section (optionnel)', ...MONTHS];
    const example = [
      ['601100', 'Achats de marchandises', 'exploitation', '', 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000, 1000000],
      ['701000', 'Ventes', 'exploitation', '', 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000, 2000000],
      ['241000', 'Matériel (CAPEX)', 'investissement', '', 0, 0, 5000000, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Budget');
    XLSX.writeFile(wb, 'modele_budget_atlas.xlsx');
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    setWarnings([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws, { defval: '' });
      if (data.length === 0) { toast.error('Fichier vide'); return; }

      // Repérage des colonnes
      const cols = Object.keys(data[0]);
      const find = (...cands: string[]) => cols.find(c => cands.includes(norm(c)));
      const compteCol = find('compte', 'account', 'accountcode', 'numerocompte', 'numerodecompte');
      const typeCol = find('type', 'typeexploitationinvestissement', 'budgettype');
      const sectionCol = find('section', 'sectionoptionnel', 'sectionanalytique');
      // colonnes mensuelles : par nom de mois OU 1..12 OU m1..m12
      const monthCols: (string | undefined)[] = MONTHS.map((m, i) => {
        const target = [norm(m), norm(m.slice(0, 3)), String(i + 1), `m${i + 1}`, `mois${i + 1}`];
        return cols.find(c => target.includes(norm(c)));
      });
      const annualCol = find('annuel', 'total', 'montant', 'montantannuel');

      if (!compteCol) { toast.error('Colonne « Compte » introuvable'); return; }

      const localWarnings: string[] = [];
      const parsed: BudgetImportLine[] = [];
      for (const r of data) {
        const account_code = String(r[compteCol] ?? '').trim();
        if (!account_code) continue;
        const typeRaw = typeCol ? norm(String(r[typeCol])) : '';
        const budget_type: 'exploitation' | 'investissement' =
          typeRaw.startsWith('invest') ? 'investissement'
          : typeRaw.startsWith('exploit') ? 'exploitation'
          : inferBudgetType(account_code);
        const section_code = sectionCol ? String(r[sectionCol] ?? '').trim() || null : null;
        const periods: Record<number, number> = {};
        let hasMonthly = false;
        for (let i = 1; i <= 12; i++) {
          const col = monthCols[i - 1];
          const v = col ? parseNumber(r[col]) : 0;
          if (v) hasMonthly = true;
          periods[i] = v;
        }
        if (!hasMonthly && annualCol) {
          const annual = parseNumber(r[annualCol]);
          const perMonth = Math.round((annual / 12) * 100) / 100;
          for (let i = 1; i <= 12; i++) periods[i] = perMonth;
        }
        parsed.push({ account_code, budget_type, section_code, periods });
      }
      if (parsed.length === 0) { toast.error('Aucune ligne exploitable'); return; }
      if (!monthCols.some(Boolean) && !annualCol) localWarnings.push('Aucune colonne de montant détectée (mois ou Annuel) — les montants seront à 0.');
      setRows(parsed);
      setWarnings(localWarnings);
      toast.success(`${parsed.length} ligne(s) lue(s)`);
    } catch (e: any) {
      toast.error('Lecture impossible : ' + (e?.message || 'fichier invalide'));
    }
  };

  const totals = useMemo(() => {
    let exploitation = 0, investissement = 0;
    for (const r of rows) {
      const annual = Object.values(r.periods).reduce((s, v) => s + v, 0);
      if (r.budget_type === 'investissement') investissement += annual; else exploitation += annual;
    }
    return { exploitation, investissement, count: rows.length };
  }, [rows]);

  const handleImport = async () => {
    if (rows.length === 0) { toast.error('Aucune ligne à importer'); return; }
    setImporting(true);
    try {
      const fy = await getActiveFiscalYear(adapter);
      if (!fy) throw new Error('Aucun exercice fiscal trouvé.');
      if (!window.confirm(
        `Importer ${rows.length} ligne(s) budgétaires dans l'exercice ${fy.code} ?\n` +
        (replace ? '⚠️ Mode REMPLACER : les lignes budgétaires existantes de la version active seront supprimées.' : 'Mode AJOUT (fusion).')
      )) { setImporting(false); return; }
      const res = await importBudget(adapter, {
        fiscalYearId: fy.id,
        versionLibelle: `Budget ${fy.code}`,
        lines: rows,
        replace,
      });
      toast.success(`Budget importé : ${res.linesCreated} ligne(s), ${res.periodsCreated} période(s).`);
      navigate('/budget/cockpit');
    } catch (e: any) {
      toast.error('Import échoué : ' + (e?.message || 'erreur'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <FileSpreadsheet className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">Importer un Budget</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Excel : Compte · Type · Section · 12 mois (ou colonne Annuel répartie sur 12)</p>
        </div>
        <button onClick={downloadTemplate} className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2">
          <Download className="w-4 h-4" /> Modèle
        </button>
      </div>

      {/* Zone d'upload */}
      <div className="bg-white rounded-xl p-6 border border-[var(--color-border)] shadow-sm">
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full border-2 border-dashed border-[var(--color-border)] rounded-xl py-10 flex flex-col items-center justify-center hover:border-[var(--color-primary)] transition-colors"
        >
          <Upload className="w-8 h-8 text-[var(--color-text-tertiary)] mb-2" />
          <span className="text-sm font-medium text-[var(--color-primary)]">{fileName || 'Choisir un fichier budget (.xlsx)'}</span>
          <span className="text-xs text-[var(--color-text-tertiary)] mt-1">ou téléchargez le modèle ci-dessus</span>
        </button>

        {warnings.map((w, i) => (
          <div key={i} className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5" /> {w}
          </div>
        ))}
      </div>

      {/* Aperçu */}
      {rows.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-[var(--color-primary)]">Aperçu — {totals.count} ligne(s)</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                Exploitation : {formatCurrency(totals.exploitation)} · Investissement : {formatCurrency(totals.investissement)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="rounded border-gray-300" />
                Remplacer le budget existant
              </label>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> {importing ? 'Import…' : 'Importer le budget'}
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Compte</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Section</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total annuel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, 300).map((r, i) => {
                  const annual = Object.values(r.periods).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-gray-700">{r.account_code}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${r.budget_type === 'investissement' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {r.budget_type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{r.section_code || '—'}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(annual)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetImportPage;
