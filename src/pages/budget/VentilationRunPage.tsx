/**
 * VentilationRunPage — /budget/ventilation (CDC §6, Lot L1).
 *
 * Moteur de ventilation : règles de fléchage (direct) + lancement de run +
 * rapport de couverture / réconciliation + résidu « À VENTILER ». Données LIVE
 * (grand livre réel) — zéro mock. Calcul déterministe (centimes entiers).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { KPICard } from '../../components/ui/DesignSystem';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { askProph3t, isProph3tCoreConfigured } from '../../lib/proph3t';
import {
  listRules, createRule, deleteRule, toggleRule, runVentilation, listRuns, getReconciliation,
  listKeys, createKey, deleteKey, listKeyValues, setKeyValue, getSecondaryTransfers,
  type AllocationRule, type AllocationRun, type ReconciliationClasse, type RunReport,
  type AllocationKey, type RuleType, type SecondaryTransfer,
} from '../../features/budget/services/ventilationRunService';
import {
  ArrowLeft, Split, Play, Plus, Trash2, CheckCircle, AlertTriangle, ShieldCheck, Hash, Search, ExternalLink, Scale, Save, Bot, BookOpen,
} from 'lucide-react';

// Mapping dual-GAAP (CDC §3) — référence posée V1, lecture seule.
// Codes SYSCOHADA laissés en français (intitulés officiels) ; libellés résolus au rendu via t().
const IFRS_MAPPING: Array<{ themeKey: string; syscohada: string; ifrsKey: string }> = [
  { themeKey: 'ventilation.ifrsTheme1', syscohada: 'Classe 2', ifrsKey: 'ventilation.ifrsIfrs1' },
  { themeKey: 'ventilation.ifrsTheme2', syscohada: 'Compte 23', ifrsKey: 'ventilation.ifrsIfrs2' },
  { themeKey: 'ventilation.ifrsTheme3', syscohada: 'ventilation.ifrsSysco3', ifrsKey: 'ventilation.ifrsIfrs3' },
  { themeKey: 'ventilation.ifrsTheme4', syscohada: 'ventilation.ifrsSysco4', ifrsKey: 'ventilation.ifrsIfrs4' },
];

const CLASSE_LABEL_KEY: Record<string, string> = { '2': 'ventilation.classe2', '6': 'ventilation.classe6', '7': 'ventilation.classe7' };

const VentilationRunPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [annee, setAnnee] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [rules, setRules] = useState<AllocationRule[]>([]);
  const [runs, setRuns] = useState<AllocationRun[]>([]);
  const [recon, setRecon] = useState<ReconciliationClasse[]>([]);
  const [report, setReport] = useState<RunReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [nr, setNr] = useState<{ type: RuleType; compte_pattern: string; journal_pattern: string; libelle_pattern: string; tiers_pattern: string; section_id: string; key_id: string; source_section_id: string }>({ type: 'DIRECT', compte_pattern: '', journal_pattern: '', libelle_pattern: '', tiers_pattern: '', section_id: '', key_id: '', source_section_id: '' });
  const [transfers, setTransfers] = useState<SecondaryTransfer[]>([]);
  const [keys, setKeys] = useState<AllocationKey[]>([]);
  const [nk, setNk] = useState({ code: '', libelle: '', unite: '' });
  const [editKey, setEditKey] = useState<string>(''); // key_id en cours d'édition des poids
  const [weights, setWeights] = useState<Record<string, string>>({}); // section_id → valeur
  const [prophet, setProphet] = useState<string | null>(null);
  const [prophetLoading, setProphetLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const a = annee || await getDefaultAnnee(adapter);
      const [secs, rl, rn, rc, ks, tr] = await Promise.all([
        listSections(adapter), listRules(adapter), listRuns(adapter), getReconciliation(adapter, a), listKeys(adapter),
        getSecondaryTransfers(adapter, parseInt(a, 10)),
      ]);
      setAnnee(a); setSections(secs); setRules(rl); setRuns(rn); setRecon(rc); setKeys(ks); setTransfers(tr);
    } catch (e: any) { toast.error(e?.message || t('ventilation.error')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const sectionLabel = (id: string) => { const s = sections.find(x => x.id === id); return s ? `${s.code} · ${s.libelle}` : '—'; };
  const keyLabel = (id: string | null) => { const k = keys.find(x => x.id === id); return k ? t('ventilation.keyLabelInline', { code: k.code }) : '—'; };

  const addRule = async () => {
    if (nr.type === 'SECONDAIRE') {
      if (!nr.source_section_id) { toast.error(t('ventilation.errSourceSection')); return; }
      if (!nr.key_id) { toast.error(t('ventilation.errKeyRequired')); return; }
    } else {
      if (!nr.compte_pattern && !nr.journal_pattern && !nr.libelle_pattern && !nr.tiers_pattern) { toast.error(t('ventilation.errCriteria')); return; }
      if (nr.type === 'DIRECT' && !nr.section_id) { toast.error(t('ventilation.errTargetSection')); return; }
      if (nr.type === 'PRIMAIRE' && !nr.key_id) { toast.error(t('ventilation.errKeyRequired')); return; }
    }
    try {
      await createRule(adapter, {
        type: nr.type, ordre: (rules.length + 1) * 10,
        compte_pattern: nr.type === 'SECONDAIRE' ? '' : nr.compte_pattern,
        journal_pattern: nr.type === 'SECONDAIRE' ? '' : nr.journal_pattern,
        libelle_pattern: nr.type === 'SECONDAIRE' ? '' : nr.libelle_pattern,
        tiers_pattern: nr.type === 'SECONDAIRE' ? '' : nr.tiers_pattern,
        section_id: nr.type === 'DIRECT' ? nr.section_id : (nr.source_section_id || sections[0]?.id || ''), // NOT NULL
        key_id: nr.type === 'DIRECT' ? null : nr.key_id,
        source_section_id: nr.type === 'SECONDAIRE' ? nr.source_section_id : null,
      });
      setNr({ type: 'DIRECT', compte_pattern: '', journal_pattern: '', libelle_pattern: '', tiers_pattern: '', section_id: '', key_id: '', source_section_id: '' });
      toast.success(t('ventilation.ruleAdded')); load();
    } catch (e: any) { toast.error(e?.message || t('ventilation.error')); }
  };

  const addKey = async () => {
    if (!nk.code.trim() || !nk.libelle.trim()) { toast.error(t('ventilation.errCodeLabelRequired')); return; }
    try { await createKey(adapter, nk); setNk({ code: '', libelle: '', unite: '' }); toast.success(t('ventilation.keyCreated')); load(); }
    catch (e: any) { toast.error(e?.message || t('ventilation.error')); }
  };

  const openKeyWeights = async (keyId: string) => {
    if (editKey === keyId) { setEditKey(''); return; }
    setEditKey(keyId);
    try {
      const vals = await listKeyValues(adapter, keyId);
      const m: Record<string, string> = {};
      for (const v of vals) m[v.section_id] = String(v.valeur);
      setWeights(m);
    } catch (e: any) { toast.error(e?.message || t('ventilation.error')); }
  };

  const saveWeights = async () => {
    try {
      for (const s of sections) {
        const v = parseFloat(weights[s.id] || '');
        if (!isNaN(v)) await setKeyValue(adapter, editKey, s.id, v);
      }
      toast.success(t('ventilation.weightsSaved')); setEditKey('');
    } catch (e: any) { toast.error(e?.message || t('ventilation.error')); }
  };

  const launch = async () => {
    if (sections.length === 0) { toast.error(t('ventilation.errCreateSections')); return; }
    setRunning(true); setReport(null);
    try {
      const rep = await runVentilation(adapter, parseInt(annee, 10));
      setReport(rep);
      toast.success(t('ventilation.runDone', { pct: String(rep.couverture_pct), recon: rep.reconcilie ? t('ventilation.reconciled') : t('ventilation.notReconciled') }));
      load();
    } catch (e: any) { toast.error(t('ventilation.runFailed', { msg: e?.message || t('ventilation.errGeneric') })); }
    finally { setRunning(false); }
  };

  const runProphet = async () => {
    setProphetLoading(true); setProphet(null);
    try {
      const cls = (report?.classes ?? recon).map(c => t('ventilation.prophetClasse', { classe: String(c.classe), pct: String(c.couverture_pct), residu: String(Math.round(c.residu)) })).join(' ; ');
      const top = (report?.topNonFleches ?? []).slice(0, 6).map(tp => `${tp.account_code} (${Math.round(tp.montant)})`).join(', ');
      const res = await askProph3t({
        message: t('ventilation.prophetPrompt', { cls, top: top || t('ventilation.none') }),
        sensitivity: 'confidential',
      });
      setProphet(res.answer || t('ventilation.noComment'));
    } catch (e: any) { setProphet(t('ventilation.prophetUnavailable', { msg: e?.message || t('ventilation.errGeneric') })); }
    finally { setProphetLoading(false); }
  };

  // Affiche le rapport du dernier run si dispo, sinon la réconciliation live.
  const classes: ReconciliationClasse[] = report?.classes ?? recon;
  const couverture = report?.couverture_pct ?? (recon.length ? +((recon.reduce((s, c) => s + c.nb_ventilees, 0) / Math.max(1, recon.reduce((s, c) => s + c.nb_lignes, 0))) * 100).toFixed(1) : 0);
  const totGl = report?.montant_gl ?? recon.reduce((s, c) => s + c.montant_gl, 0);
  const totVent = report?.montant_ventile ?? recon.reduce((s, c) => s + c.montant_ventile, 0);
  const residu = report?.residu ?? (totGl - totVent);
  const reconcilie = report?.reconcilie ?? true;

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rules;
    return rules.filter(r => [r.compte_pattern, r.journal_pattern, r.libelle_pattern, r.tiers_pattern, sectionLabel(r.section_id)].some(v => (v || '').toLowerCase().includes(q)));
  }, [rules, query, sections]);

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">{t('ventilation.loading')}</div>;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Split className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('ventilation.title')}</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">{t('ventilation.subtitle', { annee })}</p>
        </div>
        {isProph3tCoreConfigured() && (
          <button onClick={runProphet} disabled={prophetLoading} className="px-3 py-2 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/5 flex items-center gap-2 disabled:opacity-50">
            <Bot className="w-4 h-4" />{prophetLoading ? t('ventilation.prophetAnalyzing') : t('ventilation.prophetComment')}
          </button>
        )}
        <button onClick={launch} disabled={running} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          <Play className="w-4 h-4" />{running ? t('ventilation.running') : t('ventilation.launchRun')}
        </button>
        <PageHeaderActions onToggleFilters={() => setFiltersOpen(o => !o)} filtersOpen={filtersOpen} activeFilters={query.trim() ? 1 : 0} printTitle={t('ventilation.printTitle', { annee })} />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-4 print-hide">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('ventilation.searchRule')} className="pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg w-72" />
          </div>
        </div>
      )}

      {/* KPIs réconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('ventilation.kpiCoverage')} value={`${couverture}%`} icon={ShieldCheck} color={couverture >= 95 ? 'success' : couverture > 0 ? 'warning' : 'neutral'} />
        <KPICard title={t('ventilation.kpiAllocated')} value={formatCurrency(totVent)} icon={Split} color="primary" valueFontSize="1.05rem" />
        <KPICard title={t('ventilation.kpiResidual')} value={formatCurrency(residu)} icon={AlertTriangle} color={residu > 0 ? 'warning' : 'success'} valueFontSize="1.05rem" />
        <KPICard title={t('ventilation.kpiReconciliation')} value={reconcilie ? t('ventilation.balanced') : t('ventilation.inVariance')} icon={reconcilie ? CheckCircle : AlertTriangle} color={reconcilie ? 'success' : 'error'} />
      </div>

      {sections.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between">
          <span>{t('ventilation.noSectionWarning')}</span>
          <button onClick={() => navigate('/analytique')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs">{t('ventilation.goToCostAccounting')}</button>
        </div>
      )}

      {prophet && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-primary)]/30 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-sm mb-2"><Bot className="w-4 h-4" />{t('ventilation.prophetReading')}</div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{prophet}</p>
          <p className="text-[10px] text-gray-400 mt-2">{t('ventilation.prophetDisclaimer')}</p>
        </div>
      )}

      {/* Réconciliation par classe */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.reconTitle')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">{report ? t('ventilation.reconSubtitleRun') : t('ventilation.reconSubtitleLive')} · {t('ventilation.reconInvariant')}</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colClass')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colGlAmount')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colAllocated')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colResidual')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colCoverage')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">{t('ventilation.noMovement')}</td></tr>}
            {classes.map(c => (
              <tr key={c.classe} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{CLASSE_LABEL_KEY[c.classe] ? t(CLASSE_LABEL_KEY[c.classe]) : t('ventilation.classLabel', { classe: String(c.classe) })}</td>
                <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(c.montant_gl)}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(c.montant_ventile)}</td>
                <td className={`px-4 py-2.5 text-right ${c.residu > 0 ? 'text-amber-700' : 'text-green-600'}`}>{formatCurrency(c.residu)}</td>
                <td className="px-4 py-2.5 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.couverture_pct >= 95 ? 'bg-green-100 text-green-700' : c.couverture_pct > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>{c.couverture_pct}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top comptes non fléchés (résidu À VENTILER) */}
      {report && report.topNonFleches.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.topUnallocatedTitle')}</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colAccount')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colUnallocatedAmount')}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('ventilation.colGl')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {report.topNonFleches.map(tp => (
                <tr key={tp.account_code} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{tp.account_code}</span> <span className="text-gray-800">{tp.account_name}</span></td>
                  <td className="px-4 py-2.5 text-right text-amber-700">{formatCurrency(tp.montant)}</td>
                  <td className="px-4 py-2.5 text-center"><button onClick={() => navigate(`/accounting/general-ledger?compte=${tp.account_code}`)} className="text-gray-300 hover:text-[var(--color-primary)]" title={t('ventilation.viewEntries')}><ExternalLink className="w-3.5 h-3.5 inline" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Répartition secondaire (auxiliaire → principale, step-down) */}
      {transfers.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
            <Split className="w-4 h-4 text-[var(--color-primary)] rotate-90" />
            <div>
              <h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.secondaryTitle')}</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('ventilation.secondarySubtitle', { total: formatCurrency(transfers.reduce((s, tf) => s + tf.montant, 0)) })}</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colAuxSection')}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colMainSection')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colTransferredAmount')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((tf, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{sectionLabel(tf.from_section_id)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-400">→</td>
                  <td className="px-4 py-2.5 text-gray-800">{sectionLabel(tf.to_section_id)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(tf.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Clés de répartition (primaire / ABC) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
          <Scale className="w-4 h-4 text-[var(--color-primary)]" />
          <div>
            <h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.keysTitle')}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('ventilation.keysSubtitle')}</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-[var(--color-border)] bg-gray-50/50">
          <input value={nk.code} onChange={e => setNk(s => ({ ...s, code: e.target.value }))} placeholder={t('ventilation.phKeyCode')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
          <input value={nk.libelle} onChange={e => setNk(s => ({ ...s, libelle: e.target.value }))} placeholder={t('ventilation.phLabel')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <input value={nk.unite} onChange={e => setNk(s => ({ ...s, unite: e.target.value }))} placeholder={t('ventilation.phUnit')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <button onClick={addKey} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />{t('ventilation.keyBtn')}</button>
        </div>
        <div className="divide-y divide-gray-100">
          {keys.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">{t('ventilation.noKeys')}</div>}
          {keys.map(k => (
            <div key={k.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm"><span className="font-mono text-gray-500">{k.code}</span> <span className="text-gray-800">{k.libelle}</span>{k.unite && <span className="text-xs text-gray-400 ml-1">({k.unite})</span>}</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openKeyWeights(k.id)} className="text-xs text-[var(--color-primary)] hover:underline">{editKey === k.id ? t('ventilation.close') : t('ventilation.defineWeights')}</button>
                  <button onClick={() => deleteKey(adapter, k.id).then(load)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {editKey === k.id && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                  {sections.length === 0 && <p className="text-xs text-gray-400">{t('ventilation.createSectionsFirst')}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sections.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 flex-1 truncate"><span className="font-mono text-gray-400">{s.code}</span> {s.libelle}</span>
                        <input type="number" value={weights[s.id] ?? ''} onChange={e => setWeights(w => ({ ...w, [s.id]: e.target.value }))} placeholder="0" className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </div>
                    ))}
                  </div>
                  {sections.length > 0 && <button onClick={saveWeights} className="mt-3 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1"><Save className="w-3.5 h-3.5" />{t('ventilation.saveWeights')}</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Règles de ventilation (direct / primaire) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.rulesTitle')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">{t('ventilation.rulesSubtitle')}</p>
        </div>
        {/* Ajout */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-7 gap-2 border-b border-[var(--color-border)] bg-gray-50/50">
          <select value={nr.type} onChange={e => setNr(s => ({ ...s, type: e.target.value as RuleType }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="DIRECT">{t('ventilation.typeDirect')}</option>
            <option value="PRIMAIRE">{t('ventilation.typePrimary')}</option>
            <option value="SECONDAIRE">{t('ventilation.typeSecondary')}</option>
          </select>
          {nr.type === 'SECONDAIRE' ? (<>
            <select value={nr.source_section_id} onChange={e => setNr(s => ({ ...s, source_section_id: e.target.value }))} className="md:col-span-4 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">{t('ventilation.phAuxSourceSection')}</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
            </select>
            <select value={nr.key_id} onChange={e => setNr(s => ({ ...s, key_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">{t('ventilation.phKeyToMain')}</option>
              {keys.map(k => <option key={k.id} value={k.id}>{k.code} · {k.libelle}</option>)}
            </select>
          </>) : (<>
            <input value={nr.compte_pattern} onChange={e => setNr(s => ({ ...s, compte_pattern: e.target.value }))} placeholder={t('ventilation.phAccountPrefix')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            <input value={nr.journal_pattern} onChange={e => setNr(s => ({ ...s, journal_pattern: e.target.value }))} placeholder={t('ventilation.phJournal')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={nr.libelle_pattern} onChange={e => setNr(s => ({ ...s, libelle_pattern: e.target.value }))} placeholder={t('ventilation.phLabelContains')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={nr.tiers_pattern} onChange={e => setNr(s => ({ ...s, tiers_pattern: e.target.value }))} placeholder={t('ventilation.phThirdPartyCode')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            {nr.type === 'DIRECT' ? (
              <select value={nr.section_id} onChange={e => setNr(s => ({ ...s, section_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">{t('ventilation.phTargetSection')}</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
              </select>
            ) : (
              <select value={nr.key_id} onChange={e => setNr(s => ({ ...s, key_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">{t('ventilation.phAllocationKey')}</option>
                {keys.map(k => <option key={k.id} value={k.id}>{k.code} · {k.libelle}</option>)}
              </select>
            )}
          </>)}
          <button onClick={addRule} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />{t('ventilation.add')}</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colOrder')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colCriteria')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colToSection')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('ventilation.colActive')}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRules.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">{rules.length === 0 ? t('ventilation.noRulesEmpty') : t('ventilation.noRulesMatch')}</td></tr>}
            {filteredRules.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${!r.actif ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-gray-500">
                  <span className="inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{r.type === 'PRIMAIRE' ? t('ventilation.tagPrimary') : r.type === 'SECONDAIRE' ? t('ventilation.tagSecondary') : t('ventilation.tagDirect')}</span>
                  {r.ordre}
                </td>
                <td className="px-4 py-2.5 text-gray-700 text-xs">
                  {[r.compte_pattern && t('ventilation.critAccount', { v: r.compte_pattern }), r.journal_pattern && t('ventilation.critJournal', { v: r.journal_pattern }), r.libelle_pattern && t('ventilation.critLabel', { v: r.libelle_pattern }), r.tiers_pattern && t('ventilation.critThirdParty', { v: r.tiers_pattern })].filter(Boolean).join(' · ')}
                </td>
                <td className="px-4 py-2.5 text-gray-800">{r.type === 'SECONDAIRE' ? <>{sectionLabel(r.source_section_id || '')} <span className="text-gray-400">→</span> {keyLabel(r.key_id)}</> : r.type === 'PRIMAIRE' ? keyLabel(r.key_id) : sectionLabel(r.section_id)}</td>
                <td className="px-4 py-2.5 text-center"><input type="checkbox" checked={r.actif} onChange={e => toggleRule(adapter, r.id, e.target.checked).then(load)} /></td>
                <td className="px-4 py-2.5 text-right"><button onClick={() => deleteRule(adapter, r.id).then(load)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historique des runs (piste d'audit immuable) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.runsTitle')}</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colDate')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('ventilation.colFiscalYear')}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('ventilation.colCoverage')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('ventilation.colAllocatedLines')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('ventilation.colStatus')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colHash')}</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('ventilation.noRuns')}</td></tr>}
            {runs.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-600 text-xs">{new Date(r.executed_at).toLocaleString('fr-FR')}</td>
                <td className="px-4 py-2.5 text-center text-gray-600">{r.exercice}</td>
                <td className="px-4 py-2.5 text-right text-gray-800">{Number(r.couverture_pct).toFixed(1)}%</td>
                <td className="px-4 py-2.5 text-center text-gray-600">{r.nb_lignes_ventilees}/{r.nb_lignes_gl}</td>
                <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.statut === 'success' ? 'bg-green-100 text-green-700' : r.statut === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{r.statut}</span></td>
                <td className="px-4 py-2.5 text-gray-400 font-mono text-xs flex items-center gap-1"><Hash className="w-3 h-3" />{r.hash_audit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mapping dual-GAAP (IFRS) — référence posée V1 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
          <div>
            <h2 className="font-semibold text-[var(--color-primary)]">{t('ventilation.dualGaapTitle')}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('ventilation.dualGaapSubtitle')}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colTheme')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colSyscohada')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('ventilation.colIfrs')}</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {IFRS_MAPPING.map(m => (
              <tr key={m.themeKey} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{t(m.themeKey)}</td>
                <td className="px-4 py-2.5 text-gray-600">{m.syscohada.startsWith('ventilation.') ? t(m.syscohada) : m.syscohada}</td>
                <td className="px-4 py-2.5 text-gray-600">{t(m.ifrsKey)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VentilationRunPage;
