/**
 * Paramètres fiscaux — surcharges tenant sur le référentiel plateforme (P-fisc).
 *
 * fiscalParameters.ts = défaut plateforme versionné par (pays, année). L'écran
 * montre, par paramètre, le défaut TS, l'éventuelle surcharge tenant (socle) et
 * la valeur effective, avec édition de la surcharge.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, AlertTriangle, Save, Landmark } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getFiscalCountries, getFiscalYears } from '../../services/fiscal/fiscalParameters';
import { getFiscalResolved, setFiscalOverride, type FiscalResolvedRow } from '../../services/param/fiscalBridge';

const fmt = (v: number | null) => v == null ? '—' : String(v);

const FiscaliteParamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const countries = getFiscalCountries();
  const [country, setCountry] = useState(countries[0] || 'CI');
  const years = getFiscalYears(country);
  const [year, setYear] = useState(years[years.length - 1] || new Date().getFullYear());
  const [rows, setRows] = useState<FiscalResolvedRow[]>([]);
  const [meta, setMeta] = useState<{ fallback: boolean; warning?: string }>({ fallback: false });
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getFiscalResolved(adapter, country, year);
      setRows(r.rows); setMeta({ fallback: r.fallback, warning: r.warning });
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter, country, year]);
  useEffect(() => { void load(); }, [load]);

  const save = async (row: FiscalResolvedRow) => {
    const raw = edit[row.key];
    if (raw === undefined || raw === '') return;
    const v = Number(raw);
    if (Number.isNaN(v)) { toast.error('Valeur numérique attendue'); return; }
    try { await setFiscalOverride(adapter, row.key, v, year); toast.success(`Surcharge « ${row.libelle} » posée`); setEdit(p => { const n = { ...p }; delete n[row.key]; return n; }); await load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Landmark className="w-5 h-5 text-[var(--color-primary)]" /> Paramètres fiscaux</h1>
            <p className="text-sm text-gray-600">Défaut plateforme versionné (pays, année) + surcharges tenant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={country} onChange={e => { setCountry(e.target.value); }} className="border border-gray-300 rounded-lg px-2 py-2 text-sm">
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-2 py-2 text-sm">
            {getFiscalYears(country).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {meta.warning && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />{meta.warning}
        </div>
      )}

      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="text-left px-3 py-2 font-medium text-gray-700">Paramètre</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Défaut plateforme</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Surcharge tenant</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Effectif</th>
            <th className="text-right px-3 py-2 font-medium text-gray-700">Modifier</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
            {!loading && rows.map(r => (
              <tr key={r.key} className={`border-b border-gray-100 ${r.surcharge ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}>
                <td className="px-3 py-2 text-gray-800">{r.libelle} <span className="font-mono text-[10px] text-gray-400">fiscal.{r.key}</span></td>
                <td className="px-3 py-2 text-right text-gray-500">{fmt(r.tsDefault)}</td>
                <td className="px-3 py-2 text-right">{r.surcharge ? <span className="text-blue-700 font-medium">{fmt(r.override)}</span> : <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(r.effective)}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    <input value={edit[r.key] ?? ''} onChange={e => setEdit(p => ({ ...p, [r.key]: e.target.value }))} placeholder={fmt(r.effective)} className="w-24 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right" />
                    <button onClick={() => save(r)} disabled={!edit[r.key]} className="text-[var(--color-primary)] disabled:opacity-30" title="Surcharger (effet au 1er janvier de l'exercice)"><Save className="w-4 h-4" /></button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Le défaut plateforme provient du référentiel fiscal versionné (fiscalParameters). Une surcharge est posée avec effet au 1<sup>er</sup> janvier de l'exercice, journalisée, et prime dès lors sur le défaut.</p>
    </div>
  );
};

export default FiscaliteParamsPage;
