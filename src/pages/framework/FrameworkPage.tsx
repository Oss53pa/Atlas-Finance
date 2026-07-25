/**
 * FrameworkPage — référentiel comptable de l'entité + états simplifiés.
 *
 * Déclare le cadre (SYSCOHADA/SYCEBNL × Système Normal/Minimal de Trésorerie),
 * et selon le cadre affiche :
 *   - SMT (cash) : l'état des recettes et des dépenses + situation de trésorerie ;
 *   - SYCEBNL (non lucratif) : l'excédent/déficit + fonds dédiés.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useData } from '../../contexts/DataContext';
import type { DBFiscalYear } from '../../lib/db';
import {
  FRAMEWORKS,
  frameworkMeta,
  resolveFramework,
  setFramework,
  isCashBasis,
  isNonProfit,
  type AccountingFramework,
} from '../../services/framework/accountingFramework';
import { buildSMTStatement, smtToCSV, type SMTStatement } from '../../services/framework/smtService';
import { computeSycebnlResult, type SycebnlResult } from '../../services/framework/sycebnlService';

const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const FrameworkPage: React.FC = () => {
  const { adapter } = useData();
  const [framework, setFw] = useState<AccountingFramework>('SYSCOHADA_SN');
  const [years, setYears] = useState<DBFiscalYear[]>([]);
  const [yearId, setYearId] = useState('');
  const [smt, setSmt] = useState<SMTStatement | null>(null);
  const [sycebnl, setSycebnl] = useState<SycebnlResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setFw(await resolveFramework(adapter));
      const rows = (await adapter.getAll<DBFiscalYear>('fiscalYears')) ?? [];
      const sorted = [...rows].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));
      setYears(sorted);
      if (sorted[0]) setYearId(sorted[0].id);
    })();
  }, [adapter]);

  const year = useMemo(() => years.find(y => y.id === yearId), [years, yearId]);
  const meta = frameworkMeta(framework);

  const changeFramework = async (code: AccountingFramework) => {
    setFw(code);
    await setFramework(adapter, code);
    setSmt(null); setSycebnl(null);
    toast.success(`Référentiel : ${frameworkMeta(code).label}`);
  };

  const compute = useCallback(async () => {
    if (!year) { toast.error('Sélectionnez un exercice'); return; }
    setLoading(true);
    try {
      const range = { startDate: year.startDate, endDate: year.endDate };
      if (isCashBasis(framework)) {
        setSmt(await buildSMTStatement(adapter, range));
        setSycebnl(null);
      } else if (isNonProfit(framework)) {
        setSycebnl(await computeSycebnlResult(adapter, range));
        setSmt(null);
      } else {
        toast('Ce référentiel utilise les états SYSCOHADA standards (Bilan, Compte de résultat).', { icon: 'ℹ️' });
      }
    } finally {
      setLoading(false);
    }
  }, [adapter, framework, year]);

  const exportSMT = () => {
    if (!smt) return;
    const blob = new Blob(['﻿' + smtToCSV(smt)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `smt-${year?.name ?? 'exercice'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Landmark className="w-6 h-6 text-[#235A6E]" /> Référentiel comptable
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cadre applicable à l'entité — SYSCOHADA (lucratif) ou SYCEBNL (à but non lucratif),
          Système Normal ou Minimal de Trésorerie
        </p>
      </div>

      {/* Sélecteur de référentiel */}
      <div className="grid gap-3 md:grid-cols-2">
        {(Object.keys(FRAMEWORKS) as AccountingFramework[]).map(code => {
          const m = frameworkMeta(code);
          const active = code === framework;
          return (
            <button
              key={code}
              onClick={() => changeFramework(code)}
              className={`text-left p-3 rounded-lg border transition ${
                active ? 'border-[#235A6E] bg-[#235A6E]/5 ring-1 ring-[#235A6E]' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-gray-900">{m.label}</span>
                {active && <CheckCircle2 className="w-4 h-4 text-[#235A6E]" />}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {m.purpose === 'non_lucratif' ? 'But non lucratif' : 'But lucratif'} ·{' '}
                {m.basis === 'cash' ? 'Trésorerie' : 'Engagement'} · {m.resultLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Contexte + calcul */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Exercice</label>
            <select value={yearId} onChange={e => { setYearId(e.target.value); setSmt(null); setSycebnl(null); }}
              className="px-3 py-2 border border-gray-300 rounded text-sm">
              {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          </div>
          <button onClick={compute} disabled={loading || !year}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#235A6E] text-white rounded-lg hover:bg-[#1c4a5b] disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Produire les états
          </button>
          {smt && (
            <button onClick={exportSMT} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500">
          États produits par ce cadre : {meta.statements.join(' · ')}
        </div>
      </div>

      {/* État SMT */}
      {smt && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="font-semibold text-sm">État des recettes et des dépenses</span>
            <span className={`text-xs flex items-center gap-1 ${smt.coherent ? 'text-emerald-600' : 'text-amber-600'}`}>
              {smt.coherent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              {smt.coherent ? 'trésorerie cohérente' : 'écart de contrôle'}
            </span>
          </div>
          <div className="p-4 space-y-3 text-sm">
            <Row label="Solde d'ouverture" value={smt.soldeOuverture} bold />
            <Section title="Recettes" lines={smt.recettes} total={smt.totalRecettes} tone="credit" />
            <Section title="Dépenses" lines={smt.depenses} total={smt.totalDepenses} tone="debit" />
            <Row label="Variation de trésorerie" value={smt.variationTresorerie} bold />
            <Row label="Solde de clôture" value={smt.soldeCloture} bold highlight />
          </div>
        </div>
      )}

      {/* Résultat SYCEBNL */}
      {sycebnl && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
          <div className="font-semibold text-gray-900 mb-2">Résultat de l'exercice (SYCEBNL)</div>
          <Row label="Produits (ressources)" value={sycebnl.produits} />
          <Row label="Charges (emplois)" value={sycebnl.charges} />
          <Row
            label={sycebnl.label}
            value={Math.abs(sycebnl.excedentDeficit)}
            bold highlight
          />
          <Row label="Fonds dédiés (ressources affectées non employées)" value={sycebnl.fondsDedies} />
          <p className="text-xs text-gray-400 pt-2">
            Excédent/déficit = produits − charges, sans déduction d'impôt sur les sociétés
            (activité non lucrative).
          </p>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: number; bold?: boolean; highlight?: boolean }> = ({ label, value, bold, highlight }) => (
  <div className={`flex items-center justify-between ${highlight ? 'bg-gray-50 -mx-4 px-4 py-1.5 rounded' : ''}`}>
    <span className={bold ? 'font-semibold text-gray-900' : 'text-gray-600'}>{label}</span>
    <span className={`tabular-nums ${bold ? 'font-semibold' : ''}`}>{fmt(value)}</span>
  </div>
);

const Section: React.FC<{ title: string; lines: Array<{ accountCode: string; label: string; amount: number }>; total: number; tone: 'credit' | 'debit' }> = ({ title, lines, total }) => (
  <div className="border-t border-gray-100 pt-2">
    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">{title}</div>
    {lines.length === 0 ? (
      <div className="text-xs text-gray-400">Aucun mouvement.</div>
    ) : lines.map(l => (
      <div key={l.accountCode} className="flex items-center justify-between py-0.5">
        <span className="text-gray-600 text-xs">{l.accountCode} — {l.label}</span>
        <span className="tabular-nums text-xs">{fmt(l.amount)}</span>
      </div>
    ))}
    <div className="flex items-center justify-between border-t border-gray-100 mt-1 pt-1">
      <span className="text-xs font-medium">Total {title.toLowerCase()}</span>
      <span className="tabular-nums text-xs font-medium">{fmt(total)}</span>
    </div>
  </div>
);

export default FrameworkPage;
