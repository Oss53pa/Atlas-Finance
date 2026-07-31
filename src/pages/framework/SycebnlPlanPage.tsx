/**
 * SycebnlPlanPage — plan de comptes SYCEBNL (référentiel non lucratif).
 *
 * Affiche le plan complet par classe, avec les comptes SPÉCIFIQUES au secteur
 * non lucratif mis en évidence. Référence indicative (à valider contre le plan
 * officiel de l'entité).
 */
import React, { useMemo, useState } from 'react';
import { BookOpen, Download, Sparkles, Info } from 'lucide-react';
import {
  sycebnlPlanByClasse,
  CLASSE_LABELS,
  SYCEBNL_PLAN,
} from '../../services/framework/sycebnlPlan';

const SycebnlPlanPage: React.FC = () => {
  const [onlySpecifique, setOnlySpecifique] = useState(false);
  const groups = useMemo(() => sycebnlPlanByClasse(), []);

  const filtered = useMemo(
    () => groups
      .map(g => ({ ...g, comptes: onlySpecifique ? g.comptes.filter(c => c.specifique) : g.comptes }))
      .filter(g => g.comptes.length > 0),
    [groups, onlySpecifique],
  );

  const nbSpecifiques = SYCEBNL_PLAN.filter(a => a.specifique).length;

  const exportCsv = () => {
    const head = 'Classe;Code;Libellé;Type;Spécifique SYCEBNL';
    const rows = SYCEBNL_PLAN.map(a =>
      [a.classe, a.code, `"${a.libelle.replace(/"/g, '""')}"`, a.principal ? 'principal' : 'détail', a.specifique ? 'oui' : ''].join(';'),
    );
    const blob = new Blob(['﻿' + [head, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plan-comptes-sycebnl.csv';
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#235A6E]" /> Plan de comptes SYCEBNL
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Référentiel des entités à but non lucratif — {SYCEBNL_PLAN.length} comptes,
            dont {nbSpecifiques} spécifiques
          </p>
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        Référence INDICATIVE : les codes doivent être validés contre le plan officiel de l'entité
        avant toute production réglementaire. Les classes 2-5 reprennent l'ossature SYSCOHADA ; les
        classes 1/6/7 portent les spécificités non lucratives.
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={onlySpecifique} onChange={e => setOnlySpecifique(e.target.checked)} />
        <Sparkles className="w-3.5 h-3.5 text-[#235A6E]" /> Afficher uniquement les comptes spécifiques SYCEBNL
      </label>

      {filtered.map(g => (
        <div key={g.classe} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold">
            Classe {g.classe} — {CLASSE_LABELS[g.classe]}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {g.comptes.map(c => (
                <tr key={c.code} className={`border-b border-gray-100 last:border-0 ${c.specifique ? 'bg-[#235A6E]/[0.03]' : ''}`}>
                  <td className="px-4 py-1.5 font-mono text-xs w-24">
                    <span className={c.principal ? 'font-semibold text-gray-900' : 'text-gray-500'}>{c.code}</span>
                  </td>
                  <td className="px-4 py-1.5">
                    <span className={c.principal ? 'font-medium text-gray-900' : 'text-gray-600'}>{c.libelle}</span>
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {c.specifique && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#235A6E]">
                        <Sparkles className="w-3 h-3" /> SYCEBNL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default SycebnlPlanPage;
