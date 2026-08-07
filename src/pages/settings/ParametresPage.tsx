/**
 * Paramètres — registre gouverné (CDC Paramètres §1, §20, §23).
 *
 * Catalogue des paramètres avec leur valeur RÉSOLUE (param_resolve), édition
 * datée, mode « comparer à date », et journal des changements chaîné par hash.
 * Remplace la lecture directe de `settings`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Search, Save, Sliders, History, CalendarClock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import {
  listDefinitions, resolveParam, setParamValue, listParamAudit,
  type ParamDefinition, type ParamAuditRow,
} from '../../services/param/paramService';
import { useLanguage } from '@/contexts/LanguageContext';

const today = () => new Date().toISOString().slice(0, 10);

function parseByType(raw: string, type: string | null): any {
  if (type === 'number') { const n = Number(raw); return Number.isNaN(n) ? raw : n; }
  if (type === 'bool') return raw === 'true' || raw === '1';
  return raw;
}
const fmt = (v: any) => v === undefined || v === null ? '—' : (typeof v === 'object' ? JSON.stringify(v) : String(v));

const ParametresPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const [tab, setTab] = useState<'params' | 'journal'>('params');
  const [defs, setDefs] = useState<ParamDefinition[]>([]);
  const [resolved, setResolved] = useState<Record<string, any>>({});
  const [audit, setAudit] = useState<ParamAuditRow[]>([]);
  const [asOf, setAsOf] = useState(today());
  const [search, setSearch] = useState('');
  const [edit, setEdit] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [ds, au] = await Promise.all([listDefinitions(adapter), listParamAudit(adapter, 200)]);
      const res: Record<string, any> = {};
      await Promise.all(ds.map(async d => { res[d.cle] = await resolveParam(adapter, d.cle, date); }));
      setDefs(ds); setResolved(res); setAudit(au);
    } catch (e) { toast.error(t('settingsParams.loadFailed', { message: (e as Error).message })); }
    finally { setLoading(false); }
  }, [adapter, t]);
  useEffect(() => { void load(asOf); /* eslint-disable-next-line */ }, [adapter, asOf]);

  const save = async (d: ParamDefinition) => {
    const raw = edit[d.cle];
    if (raw === undefined) return;
    try {
      await setParamValue(adapter, d.cle, parseByType(raw, d.type_valeur), { portee: 'societe' });
      toast.success(t('settingsParams.updated', { key: d.cle }));
      setEdit(p => { const n = { ...p }; delete n[d.cle]; return n; });
      await load(asOf);
    } catch (e) { toast.error(t('settingsParams.saveFailed', { message: (e as Error).message })); }
  };

  const rows = defs.filter(d => { const q = search.trim().toLowerCase(); return !q || `${d.cle} ${d.libelle} ${d.module}`.toLowerCase().includes(q); });
  const isPast = asOf !== today();

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Sliders className="w-5 h-5 text-[var(--color-primary)]" /> {t('settingsParams.title')}</h1>
            <p className="text-sm text-gray-600">{t('settingsParams.subtitle')}</p>
          </div>
        </div>
        <button onClick={() => void load(asOf)} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      <div className="flex gap-2">
        {([['params', 'settingsParams.tabParams', Sliders], ['journal', 'settingsParams.tabJournal', History]] as const).map(([k, labelKey, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === k ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" />{t(labelKey)}{k === 'journal' && audit.length > 0 && <span className="text-[10px] bg-white/20 rounded px-1">{audit.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'params' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('settingsParams.searchPlaceholder')} className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-72" />
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600" title={t('settingsParams.compareAtDateTitle')}>
              <CalendarClock className="w-4 h-4" />{t('settingsParams.compareAtDate')}
              <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1 text-sm" />
            </label>
            {isPast && <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">{t('settingsParams.readOnlyAt', { date: asOf })}</span>}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200"><tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colKey')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colLabel')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colModule')}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700">{t('settingsParams.colDefault')}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700">{isPast ? t('settingsParams.colValueAt', { date: asOf }) : t('settingsParams.colValueCurrent')}</th>
                <th className="text-right px-3 py-2 font-medium text-gray-700">{isPast ? '' : t('settingsParams.colEdit')}</th>
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">{t('settingsParams.loading')}</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">{t('settingsParams.noParam')}</td></tr>}
                {!loading && rows.map(d => (
                  <tr key={d.cle} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-gray-600">{d.cle}</td>
                    <td className="px-3 py-2 text-gray-800">{d.libelle}</td>
                    <td className="px-3 py-2 text-gray-500">{d.module}</td>
                    <td className="px-3 py-2 text-right text-gray-400">{fmt(d.valeur_defaut)}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">{fmt(resolved[d.cle])}</td>
                    <td className="px-3 py-2 text-right">
                      {isPast ? <span className="text-gray-300">—</span> : (
                        <span className="inline-flex items-center gap-1">
                          <input
                            value={edit[d.cle] ?? ''}
                            onChange={e => setEdit(p => ({ ...p, [d.cle]: e.target.value }))}
                            placeholder={fmt(resolved[d.cle])}
                            className="w-28 border border-gray-300 rounded px-1.5 py-0.5 text-xs text-right"
                          />
                          <button onClick={() => save(d)} disabled={edit[d.cle] === undefined || edit[d.cle] === ''} className="text-[var(--color-primary)] disabled:opacity-30" title={t('settingsParams.saveTitle')}><Save className="w-4 h-4" /></button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500">{t('settingsParams.footnote')}</p>
        </>
      )}

      {tab === 'journal' && (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colWhen')}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colParam')}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colBeforeAfter')}</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">{t('settingsParams.colHash')}</th>
            </tr></thead>
            <tbody>
              {audit.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">{t('settingsParams.noAudit')}</td></tr>}
              {audit.map((a, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{new Date(a.le).toLocaleString(dateLocale)}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{a.definition_cle || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs">
                    <span className="text-gray-400">{fmt(a.avant?.valeur)}</span> <span className="text-gray-300">→</span> <span className="font-medium">{fmt(a.apres?.valeur)}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-400" title={t('settingsParams.previousHash', { hash: a.hash_precedent || '—' })}>{(a.hash || '').slice(0, 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ParametresPage;
