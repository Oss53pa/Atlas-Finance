/**
 * Manuel des règles de gestion analytique (CDC §8.1).
 *
 * État imprimable auto-généré depuis le paramétrage : toutes les règles actives
 * (priorité, critère, affectation, comportement), les clés de répartition et
 * leurs valeurs, l'ordre de déversement (règles secondaires), la tolérance de
 * qualification. C'est le document remis à l'auditeur ou au repreneur ; il se
 * régénère à chaque changement de paramétrage.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import {
  listRules, listKeys, listKeyValues,
  type AllocationRule, type AllocationKey, type KeyValue,
} from '../../features/budget/services/ventilationRunService';
import { resolveParam } from '../../services/param/paramService';
import { useLanguage } from '@/contexts/LanguageContext';

// Signature courte (FNV-1a) du paramétrage — sert de repère de version tant que
// le versionnage complet du référentiel (ana_referentiel_version) n'est pas posé.
function configSignature(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// Clés résolues au rendu : un libellé figé au chargement du module ne suivrait
// pas un changement de langue.
const COMP_KEY: Record<string, string> = { fixe: 'rulesManual.behaviourFixed', variable: 'rulesManual.behaviourVariable', mixte: 'rulesManual.behaviourMixed' };
const TYPE_KEY: Record<string, string> = { DIRECT: 'rulesManual.typeDirect', PRIMAIRE: 'rulesManual.typePrimary', SECONDAIRE: 'rulesManual.typeSecondary' };

const ManuelReglesPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { t } = useLanguage();
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [keys, setKeys] = useState<AllocationKey[]>([]);
  const [keyValues, setKeyValues] = useState<Record<string, KeyValue[]>>({});
  const [sections, setSections] = useState<Section[]>([]);
  const [tol, setTol] = useState<{ std: any; retro: any }>({ std: 0.5, retro: 2 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rl, ks, secs, tStd, tRetro] = await Promise.all([
        listRules(adapter), listKeys(adapter), listSections(adapter),
        resolveParam(adapter, 'ana.tolerance_qualification'),
        resolveParam(adapter, 'ana.tolerance_qualification_retro'),
      ]);
      const kv: Record<string, KeyValue[]> = {};
      await Promise.all(ks.map(async k => { kv[k.id] = await listKeyValues(adapter, k.id); }));
      setRules(rl); setKeys(ks); setSections(secs); setKeyValues(kv);
      setTol({ std: tStd ?? 0.5, retro: tRetro ?? 2 });
    } catch (e) { toast.error(t('rulesManual.loadFailed', { message: (e as Error).message })); }
    finally { setLoading(false); }
  }, [adapter, t]);
  useEffect(() => { void load(); }, [load]);

  const sectionLabel = (id: string | null) => { const s = sections.find(x => x.id === id); return s ? `${s.code} · ${s.libelle}` : '—'; };
  const keyLabel = (id: string | null) => { const k = keys.find(x => x.id === id); return k ? `${k.code} · ${k.libelle}` : '—'; };
  const critere = (r: AllocationRule) => [
    r.compte_pattern && t('rulesManual.criterionAccount', { pattern: r.compte_pattern }),
    r.journal_pattern && t('rulesManual.criterionJournal', { pattern: r.journal_pattern }),
    r.libelle_pattern && t('rulesManual.criterionLabel', { pattern: r.libelle_pattern }),
    r.tiers_pattern && t('rulesManual.criterionParty', { pattern: r.tiers_pattern }),
  ].filter(Boolean).join(' · ') || '—';

  const activeRules = rules.filter(r => r.actif);
  const directPrim = activeRules.filter(r => r.type !== 'SECONDAIRE').sort((a, b) => a.ordre - b.ordre);
  const deversement = activeRules.filter(r => r.type === 'SECONDAIRE').sort((a, b) => a.ordre - b.ordre);
  const signature = configSignature(JSON.stringify(activeRules.map(r => [r.type, r.ordre, r.compte_pattern, r.journal_pattern, r.libelle_pattern, r.tiers_pattern, r.section_id, r.key_id, r.source_section_id, r.comportement, r.pct_variable])));

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between print-hide">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/budget/ventilation')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-[var(--color-primary)]" /> {t('rulesManual.title')}</h1>
        </div>
        <button onClick={() => window.print()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><Printer className="w-4 h-4" /> {t('rulesManual.print')}</button>
      </div>

      {/* Cartouche */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <div><span className="text-gray-500">{t('rulesManual.cartouche')}</span></div>
          <div className="flex gap-4 font-mono text-xs text-gray-500">
            <span>{t('rulesManual.signature')} {signature}</span>
            <span>{t('rulesManual.counts', { rules: String(activeRules.length), keys: String(keys.length) })}</span>
          </div>
        </div>
      </div>

      {loading ? <p className="text-gray-500">{t('rulesManual.loading')}</p> : (
        <>
          {/* 1. Règles direct / primaire */}
          <Section title={t('rulesManual.section1')}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200"><tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colOrder')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colType')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colCriterion')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colAssignment')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colBehaviour')}</th>
              </tr></thead>
              <tbody>
                {directPrim.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">{t('rulesManual.noActiveRule')}</td></tr>}
                {directPrim.map(r => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500 font-mono">{r.ordre}</td>
                    <td className="px-3 py-2 text-gray-700">{t(TYPE_KEY[r.type])}</td>
                    <td className="px-3 py-2 text-gray-700 text-xs">{critere(r)}</td>
                    <td className="px-3 py-2 text-gray-800">{r.type === 'PRIMAIRE' ? t('rulesManual.keyPrefix', { key: keyLabel(r.key_id) }) : sectionLabel(r.section_id)}</td>
                    <td className="px-3 py-2 text-gray-600">{r.comportement ? t(COMP_KEY[r.comportement]) : <span className="text-gray-400">{t('rulesManual.autoByNature')}</span>}{r.comportement === 'mixte' && r.pct_variable != null && <span className="text-xs text-gray-400">{t('rulesManual.variableShare', { pct: String(r.pct_variable) })}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 2. Clés de répartition */}
          <Section title={t('rulesManual.section2')}>
            {keys.length === 0 ? <p className="px-3 py-3 text-gray-400 text-sm">{t('rulesManual.noKey')}</p> : keys.map(k => (
              <div key={k.id} className="border-b border-gray-100 px-3 py-2">
                <div className="text-sm"><span className="font-mono text-gray-500">{k.code}</span> <span className="text-gray-800">{k.libelle}</span>{k.unite && <span className="text-xs text-gray-400 ml-1">({k.unite})</span>}</div>
                {(keyValues[k.id] || []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    {(keyValues[k.id] || []).map(v => <span key={v.id}>{sectionLabel(v.section_id)} : <b className="text-gray-700">{v.valeur}</b></span>)}
                  </div>
                )}
              </div>
            ))}
          </Section>

          {/* 3. Ordre de déversement (secondaire) */}
          <Section title={t('rulesManual.section3')}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200"><tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colOrder')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colAuxSection')}</th>
                <th className="text-left px-3 py-2 font-medium text-gray-700">{t('rulesManual.colSplitByKey')}</th>
              </tr></thead>
              <tbody>
                {deversement.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-400">{t('rulesManual.noCascadeRule')}</td></tr>}
                {deversement.map(r => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-500 font-mono">{r.ordre}</td>
                    <td className="px-3 py-2 text-gray-800">{sectionLabel(r.source_section_id)}</td>
                    <td className="px-3 py-2 text-gray-700">{keyLabel(r.key_id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 4. Paramètres du cycle */}
          <Section title={t('rulesManual.section4')}>
            <ul className="px-3 py-2 text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>{t('rulesManual.param1')}</li>
              <li>{t('rulesManual.param2', { std: String(tol.std), retro: String(tol.retro) })} <span className="text-[10px] text-gray-400">{t('rulesManual.param2Hint')} <code>ana.tolerance_qualification</code></span>.</li>
              <li>{t('rulesManual.param3')}</li>
            </ul>
          </Section>
        </>
      )}
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
    <h2 className="px-3 py-2 font-semibold text-gray-800 bg-gray-50 border-b border-gray-200 text-sm">{title}</h2>
    {children}
  </div>
);

export default ManuelReglesPage;
