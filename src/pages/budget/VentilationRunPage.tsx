/**
 * VentilationRunPage — /budget/ventilation (CDC §6, Lot L1).
 *
 * Moteur de ventilation : règles de fléchage (direct) + lancement de run +
 * rapport de couverture / réconciliation + résidu « À VENTILER ». Données LIVE
 * (grand livre réel) — zéro mock. Calcul déterministe (centimes entiers).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { KPICard } from '../../components/ui/DesignSystem';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { askProph3t, isProph3tCoreConfigured } from '../../lib/proph3t';
import {
  listRules, createRule, deleteRule, toggleRule, runVentilation, listRuns, getReconciliation,
  listKeys, createKey, deleteKey, listKeyValues, setKeyValue, getSecondaryTransfers, setRuleComportement, publishRun,
  type AllocationRule, type AllocationRun, type ReconciliationClasse, type RunReport,
  type AllocationKey, type RuleType, type SecondaryTransfer, type Comportement,
} from '../../features/budget/services/ventilationRunService';
import { listControls, type ControlResult } from '../../features/budget/services/controlsService';
import { countQueue } from '../../features/budget/services/qualificationService';
import { listPlans, createPlan, ensureDefaultPlan, type AnaPlan } from '../../features/budget/services/planService';
import {
  ArrowLeft, Split, Play, Plus, Trash2, CheckCircle, AlertTriangle, ShieldCheck, Hash, Search, ExternalLink, Scale, Save, Bot, BookOpen, ListChecks, Inbox, Network, Gauge, Lock, Send, FileText, Layers,
} from 'lucide-react';

type Translate = (key: string, params?: Record<string, string>) => string;

const PHASE_CLASS: Record<string, string> = {
  brouillon: 'bg-gray-100 text-gray-600',
  simule: 'bg-blue-50 text-blue-600',
  controle: 'bg-indigo-50 text-indigo-600',
  publie: 'bg-green-100 text-green-700',
};

const PHASE_KEY: Record<string, string> = {
  brouillon: 'allocationRun.phaseDraft',
  simule: 'allocationRun.phaseSimulated',
  controle: 'allocationRun.phaseChecked',
  publie: 'allocationRun.phasePublished',
};

const CONTROL_KEY: Record<string, string> = {
  C1: 'allocationRun.c1', C2: 'allocationRun.c2', C3: 'allocationRun.c3', C4: 'allocationRun.c4', C5: 'allocationRun.c5',
  C6: 'allocationRun.c6', C7: 'allocationRun.c7', C8: 'allocationRun.c8', C9: 'allocationRun.c9', C10: 'allocationRun.c10',
};

// Mapping dual-GAAP (CDC §3) — référence posée V1, lecture seule.
const buildIfrsMapping = (t: Translate): Array<{ theme: string; syscohada: string; ifrs: string }> => [
  { theme: t('allocationRun.ifrsTheme1'), syscohada: t('allocationRun.ifrsRef1'), ifrs: t('allocationRun.ifrsVal1') },
  { theme: t('allocationRun.ifrsTheme2'), syscohada: t('allocationRun.ifrsRef2'), ifrs: t('allocationRun.ifrsVal2') },
  { theme: t('allocationRun.ifrsTheme3'), syscohada: t('allocationRun.ifrsRef3'), ifrs: t('allocationRun.ifrsVal3') },
  { theme: t('allocationRun.ifrsTheme4'), syscohada: t('allocationRun.ifrsRef4'), ifrs: t('allocationRun.ifrsVal4') },
];

const CLASSE_KEY: Record<string, string> = { '2': 'allocationRun.class2', '6': 'allocationRun.class6', '7': 'allocationRun.class7' };

const VentilationRunPage: React.FC = () => {
  const { adapter } = useData();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
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
  const [nr, setNr] = useState<{ type: RuleType; compte_pattern: string; journal_pattern: string; libelle_pattern: string; tiers_pattern: string; section_id: string; key_id: string; source_section_id: string; comportement: '' | Comportement }>({ type: 'DIRECT', compte_pattern: '', journal_pattern: '', libelle_pattern: '', tiers_pattern: '', section_id: '', key_id: '', source_section_id: '', comportement: '' });
  const [controls, setControls] = useState<ControlResult[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [plans, setPlans] = useState<AnaPlan[]>([]);
  const [planId, setPlanId] = useState<string>('');
  const [historique, setHistorique] = useState(false);
  const [transfers, setTransfers] = useState<SecondaryTransfer[]>([]);
  const [keys, setKeys] = useState<AllocationKey[]>([]);
  const [nk, setNk] = useState({ code: '', libelle: '', unite: '' });
  const [editKey, setEditKey] = useState<string>(''); // key_id en cours d'édition des poids
  const [weights, setWeights] = useState<Record<string, string>>({}); // section_id → valeur
  const [prophet, setProphet] = useState<string | null>(null);
  const [prophetLoading, setProphetLoading] = useState(false);

  const load = async (forcePlan?: string) => {
    setLoading(true);
    try {
      const a = annee || await getDefaultAnnee(adapter);
      // Plans : garantit le plan PRINCIPAL, sélectionne le plan courant.
      let pls = await listPlans(adapter);
      if (pls.length === 0) { await ensureDefaultPlan(adapter); pls = await listPlans(adapter); }
      const pid = forcePlan || planId || pls[0]?.id || '';
      const [secs, rl, rn, rc, ks, tr, qc] = await Promise.all([
        listSections(adapter), listRules(adapter, pid || undefined), listRuns(adapter, 10, pid || undefined), getReconciliation(adapter, a), listKeys(adapter),
        getSecondaryTransfers(adapter, parseInt(a, 10)), countQueue(adapter),
      ]);
      setAnnee(a); setPlans(pls); setPlanId(pid); setSections(secs); setRules(rl); setRuns(rn); setRecon(rc); setKeys(ks); setTransfers(tr); setQueueCount(qc);
      // Contrôles du dernier run (rapport persisté), si un run existe.
      if (rn[0]?.id) { try { setControls(await listControls(adapter, rn[0].id)); } catch { /* table absente : ignore */ } }
    } catch (e: any) { toast.error(e?.message || t('allocationRun.genericError')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [adapter]);

  const sectionLabel = (id: string) => { const s = sections.find(x => x.id === id); return s ? `${s.code} · ${s.libelle}` : '—'; };
  const keyLabel = (id: string | null) => { const k = keys.find(x => x.id === id); return k ? t('allocationRun.keyPrefix', { code: k.code }) : '—'; };

  const addRule = async () => {
    if (nr.type === 'SECONDAIRE') {
      if (!nr.source_section_id) { toast.error(t('allocationRun.errSourceSection')); return; }
      if (!nr.key_id) { toast.error(t('allocationRun.errKey')); return; }
    } else {
      if (!nr.compte_pattern && !nr.journal_pattern && !nr.libelle_pattern && !nr.tiers_pattern) { toast.error(t('allocationRun.errCriteria')); return; }
      if (nr.type === 'DIRECT' && !nr.section_id) { toast.error(t('allocationRun.errTargetSection')); return; }
      if (nr.type === 'PRIMAIRE' && !nr.key_id) { toast.error(t('allocationRun.errKey')); return; }
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
        comportement: nr.type === 'SECONDAIRE' ? null : (nr.comportement || null),
        plan_id: planId || null,
      });
      setNr({ type: 'DIRECT', compte_pattern: '', journal_pattern: '', libelle_pattern: '', tiers_pattern: '', section_id: '', key_id: '', source_section_id: '', comportement: '' });
      toast.success(t('allocationRun.ruleAdded')); load();
    } catch (e: any) { toast.error(e?.message || t('allocationRun.genericError')); }
  };

  const addKey = async () => {
    if (!nk.code.trim() || !nk.libelle.trim()) { toast.error(t('allocationRun.errCodeLabel')); return; }
    try { await createKey(adapter, nk); setNk({ code: '', libelle: '', unite: '' }); toast.success(t('allocationRun.keyCreated')); load(); }
    catch (e: any) { toast.error(e?.message || t('allocationRun.genericError')); }
  };

  const openKeyWeights = async (keyId: string) => {
    if (editKey === keyId) { setEditKey(''); return; }
    setEditKey(keyId);
    try {
      const vals = await listKeyValues(adapter, keyId);
      const m: Record<string, string> = {};
      for (const v of vals) m[v.section_id] = String(v.valeur);
      setWeights(m);
    } catch (e: any) { toast.error(e?.message || t('allocationRun.genericError')); }
  };

  const saveWeights = async () => {
    try {
      for (const s of sections) {
        const v = parseFloat(weights[s.id] || '');
        if (!isNaN(v)) await setKeyValue(adapter, editKey, s.id, v);
      }
      toast.success(t('allocationRun.weightsSaved')); setEditKey('');
    } catch (e: any) { toast.error(e?.message || t('allocationRun.genericError')); }
  };

  const launch = async () => {
    if (sections.length === 0) { toast.error(t('allocationRun.errNoSection')); return; }
    setRunning(true); setReport(null);
    try {
      let rep: RunReport;
      try {
        rep = await runVentilation(adapter, parseInt(annee, 10), null, undefined, planId || undefined, historique);
      } catch (e: any) {
        // Après publication, un nouveau run exige une justification (CDC §7).
        if (String(e?.message || '').toLowerCase().includes('justification')) {
          const j = window.prompt(t('allocationRun.justificationPrompt'));
          if (!j || !j.trim()) { toast.error(t('allocationRun.runCancelled')); return; }
          rep = await runVentilation(adapter, parseInt(annee, 10), null, j.trim(), planId || undefined, historique);
        } else throw e;
      }
      setReport(rep);
      setControls(rep.controls);
      const blocking = rep.controls.filter(c => c.severite === 'bloquant' && c.resultat === 'ko').length;
      if (blocking > 0) toast.error(t('allocationRun.runBlocking', { count: String(blocking), remainder: String(rep.reliquatCount) }));
      else toast.success(t('allocationRun.runDone', {
        coverage: String(rep.couverture_pct),
        reconciled: rep.reconcilie ? t('allocationRun.reconciledSuffix') : t('allocationRun.notReconciledSuffix'),
      }));
      load();
    } catch (e: any) { toast.error(t('allocationRun.runFailed', { message: e?.message || t('allocationRun.errorWord') })); }
    finally { setRunning(false); }
  };

  const publish = async (runId: string) => {
    try { await publishRun(adapter, runId); toast.success(t('allocationRun.runPublished')); load(); }
    catch (e: any) { toast.error(e?.message || t('allocationRun.publishFailed')); }
  };

  const changePlan = (id: string) => { setPlanId(id); void load(id); };
  const addPlan = async () => {
    const code = window.prompt(t('allocationRun.newPlanCodePrompt'));
    if (!code || !code.trim()) return;
    const libelle = window.prompt(t('allocationRun.newPlanLabelPrompt'), code.trim()) || code.trim();
    try { const id = await createPlan(adapter, { code: code.trim(), libelle: libelle.trim() }); toast.success(t('allocationRun.planCreated')); changePlan(id); }
    catch (e: any) { toast.error(e?.message || t('allocationRun.createFailed')); }
  };

  const runProphet = async () => {
    setProphetLoading(true); setProphet(null);
    try {
      const cls = (report?.classes ?? recon).map(c => `classe ${c.classe}: couverture ${c.couverture_pct}%, résidu ${Math.round(c.residu)}`).join(' ; ');
      const top = (report?.topNonFleches ?? []).slice(0, 6).map(row => `${row.account_code} (${Math.round(row.montant)})`).join(', ');
      const res = await askProph3t({
        message: `En tant que contrôleur de gestion SYSCOHADA, commente brièvement (5 lignes max, ${t('allocationRun.prophetPrompt')}) la QUALITÉ de ventilation analytique sans inventer de chiffres. ${cls}. Comptes non fléchés majeurs : ${top || 'aucun'}. Propose 2-3 règles de fléchage concrètes (par compte/journal) pour améliorer la couverture.`,
        sensitivity: 'confidential',
      });
      setProphet(res.answer || 'Aucun commentaire.');
    } catch (e: any) { setProphet('PROPH3T indisponible : ' + (e?.message || 'erreur')); }
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

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">{t('allocationRun.loading')}</div>;

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/budget/cockpit')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Split className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">{t('allocationRun.title')}</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">{t('allocationRun.subtitle', { year: annee })}</p>
        </div>
        {plans.length > 0 && (
          <div className="flex items-center gap-1" title={t('allocationRun.planTitle')}>
            <Layers className="w-4 h-4 text-[var(--color-primary)]" />
            <select value={planId} onChange={e => changePlan(e.target.value)} className="border border-[var(--color-border)] rounded-lg px-2 py-2 text-sm bg-white">
              {plans.map(p => <option key={p.id} value={p.id}>{p.code} · {p.libelle}</option>)}
            </select>
            <button onClick={addPlan} className="p-2 rounded-lg border border-[var(--color-border)] text-gray-500 hover:bg-gray-50" title={t('allocationRun.newPlan')}><Plus className="w-4 h-4" /></button>
          </div>
        )}
        <button onClick={() => navigate('/analytique/dependance')} className="px-3 py-2 text-sm border border-[var(--color-border)] text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2" title={t('allocationRun.dependencyTitle')}>
          <Network className="w-4 h-4" />{t('allocationRun.dependency')}
        </button>
        <button onClick={() => navigate('/analytique/point-mort')} className="px-3 py-2 text-sm border border-[var(--color-border)] text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2" title={t('allocationRun.breakEvenTitle')}>
          <Gauge className="w-4 h-4" />{t('allocationRun.breakEven')}
        </button>
        <button onClick={() => navigate('/analytique/manuel')} className="px-3 py-2 text-sm border border-[var(--color-border)] text-gray-600 rounded-lg hover:bg-gray-50 flex items-center gap-2" title={t('allocationRun.manualTitle')}>
          <FileText className="w-4 h-4" />{t('allocationRun.manual')}
        </button>
        {isProph3tCoreConfigured() && (
          <button onClick={runProphet} disabled={prophetLoading} className="px-3 py-2 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/5 flex items-center gap-2 disabled:opacity-50">
            <Bot className="w-4 h-4" />{prophetLoading ? t('allocationRun.analysing') : t('allocationRun.prophetComment')}
          </button>
        )}
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer" title={t('allocationRun.retroTitle')}>
          <input type="checkbox" checked={historique} onChange={e => setHistorique(e.target.checked)} />{t('allocationRun.retroactive')}
        </label>
        <button onClick={launch} disabled={running} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          <Play className="w-4 h-4" />{running ? t('allocationRun.running') : t('allocationRun.launchRun')}
        </button>
        <PageHeaderActions onToggleFilters={() => setFiltersOpen(o => !o)} filtersOpen={filtersOpen} activeFilters={query.trim() ? 1 : 0} printTitle={t('allocationRun.printTitle', { year: annee })} />
      </div>

      {filtersOpen && (
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm flex flex-wrap items-center gap-4 print-hide">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('allocationRun.searchRule')} className="pl-8 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg w-72" />
          </div>
        </div>
      )}

      {/* KPIs réconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={t('allocationRun.kpiCoverage')} value={`${couverture}%`} icon={ShieldCheck} color={couverture >= 95 ? 'success' : couverture > 0 ? 'warning' : 'neutral'} />
        <KPICard title={t('allocationRun.kpiAllocated')} value={formatCurrency(totVent)} icon={Split} color="primary" valueFontSize="1.05rem" />
        <KPICard title={t('allocationRun.kpiResidual')} value={formatCurrency(residu)} icon={AlertTriangle} color={residu > 0 ? 'warning' : 'success'} valueFontSize="1.05rem" />
        <KPICard title={t('allocationRun.kpiReconciliation')} value={reconcilie ? t('allocationRun.balanced') : t('allocationRun.outOfBalance')} icon={reconcilie ? CheckCircle : AlertTriangle} color={reconcilie ? 'success' : 'error'} />
      </div>

      {sections.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between">
          <span>{t('allocationRun.noSectionWarning')}</span>
          <button onClick={() => navigate('/analytique')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs">{t('allocationRun.goToAnalytics')}</button>
        </div>
      )}

      {/* File de qualification (reliquat non fléché) */}
      {queueCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2"><Inbox className="w-4 h-4" /><b>{queueCount}</b>{' '}{t('allocationRun.queueText')}</span>
          <button onClick={() => navigate('/analytique/qualification')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs flex items-center gap-1"><ListChecks className="w-3.5 h-3.5" />{t('allocationRun.openQueue')}</button>
        </div>
      )}

      {/* Rapport de contrôles C1..C10 */}
      {controls.length > 0 && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
            <div className="flex-1">
              <h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.controlReport')}</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('allocationRun.controlReportSub')}</p>
            </div>
            {controls.some(c => c.severite === 'bloquant' && c.resultat === 'ko')
              ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{t('allocationRun.blocking')}</span>
              : <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{t('allocationRun.compliant')}</span>}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 w-16">{t('allocationRun.colCode')}</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colControl')}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colSeverity')}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colResult')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {controls.map(c => {
                const cnt = Number(c.detail?.count ?? c.detail?.reliquat ?? (c.detail?.aux_non_soldees?.length) ?? 0);
                return (
                  <tr key={c.code} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-gray-500">{c.code}</td>
                    <td className="px-4 py-2.5 text-gray-800">{CONTROL_KEY[c.code] ? t(CONTROL_KEY[c.code]) : c.code}{c.resultat === 'ko' && cnt > 0 && <span className="ml-2 text-xs text-red-600">({cnt})</span>}{c.resultat === 'na' && <span className="ml-2 text-[10px] text-gray-400">{c.detail?.note || 'n/a'}</span>}</td>
                    <td className="px-4 py-2.5 text-center"><span className={`text-[10px] px-1.5 py-0.5 rounded ${c.severite === 'bloquant' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>{c.severite === 'bloquant' ? t('allocationRun.blocking') : t('allocationRun.warning')}</span></td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.resultat === 'ok' ? 'bg-green-100 text-green-700' : c.resultat === 'ko' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{c.resultat === 'ok' ? 'OK' : c.resultat === 'ko' ? t('allocationRun.failed') : 'N/A'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {prophet && (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-primary)]/30 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-primary)] font-semibold text-sm mb-2"><Bot className="w-4 h-4" />{t('allocationRun.prophetReading')}</div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{prophet}</p>
          <p className="text-[10px] text-gray-400 mt-2">{t('allocationRun.prophetDisclaimer')}</p>
        </div>
      )}

      {/* Réconciliation par classe */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.reconciliationTitle')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">{report ? t('allocationRun.lastRunResult') : t('allocationRun.liveState')} {' · '}{t('allocationRun.invariantNote')}</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colClass')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colGlAmount')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colAllocated')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colResidual')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colCoverage')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {classes.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Aucun mouvement analytique sur l’exercice.</td></tr>}
            {classes.map(c => (
              <tr key={c.classe} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{CLASSE_KEY[c.classe] ? t(CLASSE_KEY[c.classe]) : t('allocationRun.classFallback', { digit: c.classe })}</td>
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
          <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.topUnmapped')}</h2></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colAccount')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colUnallocated')}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">GL</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {report.topNonFleches.map(row => (
                <tr key={row.account_code} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{row.account_code}</span> <span className="text-gray-800">{row.account_name}</span></td>
                  <td className="px-4 py-2.5 text-right text-amber-700">{formatCurrency(row.montant)}</td>
                  <td className="px-4 py-2.5 text-center"><button onClick={() => navigate(`/accounting/general-ledger?compte=${row.account_code}`)} className="text-gray-300 hover:text-[var(--color-primary)]" title={t('allocationRun.viewEntries')}><ExternalLink className="w-3.5 h-3.5 inline" /></button></td>
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
              <h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.secondaryAllocation')}</h2>
              <p className="text-xs text-[var(--color-text-tertiary)]">{t('allocationRun.secondaryAllocationSub', {
                total: formatCurrency(transfers.reduce((sum, x) => sum + x.montant, 0)),
              })}</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colAuxSection')}</th>
              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600"></th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colMainSection')}</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colTransferred')}</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {transfers.map((tr, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700">{sectionLabel(tr.from_section_id)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-400">→</td>
                  <td className="px-4 py-2.5 text-gray-800">{sectionLabel(tr.to_section_id)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(tr.montant)}</td>
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
            <h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.allocationKeys')}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('allocationRun.allocationKeysSub')}</p>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-2 border-b border-[var(--color-border)] bg-gray-50/50">
          <input value={nk.code} onChange={e => setNk(s => ({ ...s, code: e.target.value }))} placeholder={t('allocationRun.keyCodePlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
          <input value={nk.libelle} onChange={e => setNk(s => ({ ...s, libelle: e.target.value }))} placeholder={t('allocationRun.labelPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <input value={nk.unite} onChange={e => setNk(s => ({ ...s, unite: e.target.value }))} placeholder={t('allocationRun.unitPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
          <button onClick={addKey} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />{t('allocationRun.keyButton')}</button>
        </div>
        <div className="divide-y divide-gray-100">
          {keys.length === 0 && <div className="px-4 py-8 text-center text-gray-400 text-sm">{t('allocationRun.noKey')}</div>}
          {keys.map(k => (
            <div key={k.id} className="px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="text-sm"><span className="font-mono text-gray-500">{k.code}</span> <span className="text-gray-800">{k.libelle}</span>{k.unite && <span className="text-xs text-gray-400 ml-1">({k.unite})</span>}</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openKeyWeights(k.id)} className="text-xs text-[var(--color-primary)] hover:underline">{editKey === k.id ? t('allocationRun.closeWord') : t('allocationRun.setWeights')}</button>
                  <button onClick={() => deleteKey(adapter, k.id).then(() => load())} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {editKey === k.id && (
                <div className="mt-3 bg-gray-50 rounded-lg p-3">
                  {sections.length === 0 && <p className="text-xs text-gray-400">{t('allocationRun.createSectionsFirst')}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {sections.map(s => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 flex-1 truncate"><span className="font-mono text-gray-400">{s.code}</span> {s.libelle}</span>
                        <input type="number" value={weights[s.id] ?? ''} onChange={e => setWeights(w => ({ ...w, [s.id]: e.target.value }))} placeholder="0" className="w-24 border border-gray-300 rounded px-2 py-1 text-sm text-right" />
                      </div>
                    ))}
                  </div>
                  {sections.length > 0 && <button onClick={saveWeights} className="mt-3 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs flex items-center gap-1"><Save className="w-3.5 h-3.5" />{t('allocationRun.saveWeights')}</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Règles de ventilation (direct / primaire) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.allocationRules')}</h2>
          <p className="text-xs text-[var(--color-text-tertiary)]">{t('allocationRun.allocationRulesSub')}</p>
        </div>
        {/* Ajout */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-8 gap-2 border-b border-[var(--color-border)] bg-gray-50/50">
          <select value={nr.type} onChange={e => setNr(s => ({ ...s, type: e.target.value as RuleType }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
            <option value="DIRECT">{t('allocationRun.typeDirect')}</option>
            <option value="PRIMAIRE">{t('allocationRun.typePrimary')}</option>
            <option value="SECONDAIRE">{t('allocationRun.typeSecondary')}</option>
          </select>
          {nr.type === 'SECONDAIRE' ? (<>
            <select value={nr.source_section_id} onChange={e => setNr(s => ({ ...s, source_section_id: e.target.value }))} className="md:col-span-4 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">{t('allocationRun.sourceAuxSection')}</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
            </select>
            <select value={nr.key_id} onChange={e => setNr(s => ({ ...s, key_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">{t('allocationRun.keyToMain')}</option>
              {keys.map(k => <option key={k.id} value={k.id}>{k.code} · {k.libelle}</option>)}
            </select>
          </>) : (<>
            <input value={nr.compte_pattern} onChange={e => setNr(s => ({ ...s, compte_pattern: e.target.value }))} placeholder={t('allocationRun.accountPrefixPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            <input value={nr.journal_pattern} onChange={e => setNr(s => ({ ...s, journal_pattern: e.target.value }))} placeholder={t('allocationRun.journalPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={nr.libelle_pattern} onChange={e => setNr(s => ({ ...s, libelle_pattern: e.target.value }))} placeholder={t('allocationRun.labelContainsPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
            <input value={nr.tiers_pattern} onChange={e => setNr(s => ({ ...s, tiers_pattern: e.target.value }))} placeholder={t('allocationRun.thirdPartyPlaceholder')} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-mono" />
            {nr.type === 'DIRECT' ? (
              <select value={nr.section_id} onChange={e => setNr(s => ({ ...s, section_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">{t('allocationRun.targetSection')}</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
              </select>
            ) : (
              <select value={nr.key_id} onChange={e => setNr(s => ({ ...s, key_id: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">{t('allocationRun.allocationKey')}</option>
                {keys.map(k => <option key={k.id} value={k.id}>{k.code} · {k.libelle}</option>)}
              </select>
            )}
            <select value={nr.comportement} onChange={e => setNr(s => ({ ...s, comportement: e.target.value as '' | Comportement }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm" title={t('allocationRun.behaviourTitle')}>
              <option value="">{t('allocationRun.behaviourAuto')}</option>
              <option value="fixe">{t('allocationRun.behaviourFixed')}</option>
              <option value="variable">{t('allocationRun.behaviourVariable')}</option>
              <option value="mixte">{t('allocationRun.behaviourMixed')}</option>
            </select>
          </>)}
          <button onClick={addRule} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" />{t('allocationRun.add')}</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colOrder')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colCriteria')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colSection')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colBehaviour')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colActive')}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRules.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{rules.length === 0 ? t('allocationRun.noRule') : t('allocationRun.noRuleMatch')}</td></tr>}
            {filteredRules.map(r => (
              <tr key={r.id} className={`hover:bg-gray-50 ${!r.actif ? 'opacity-50' : ''}`}>
                <td className="px-4 py-2.5 text-gray-500">
                  <span className="inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">{r.type === 'PRIMAIRE' ? 'PRIM.' : r.type === 'SECONDAIRE' ? 'SEC.' : 'DIR.'}</span>
                  {r.ordre}
                </td>
                <td className="px-4 py-2.5 text-gray-700 text-xs">
                  {[
                    r.compte_pattern && t('allocationRun.ruleCriteriaAccount', { value: r.compte_pattern }),
                    r.journal_pattern && t('allocationRun.ruleCriteriaJournal', { value: r.journal_pattern }),
                    r.libelle_pattern && t('allocationRun.ruleCriteriaLabel', { value: r.libelle_pattern }),
                    r.tiers_pattern && t('allocationRun.ruleCriteriaThirdParty', { value: r.tiers_pattern }),
                  ].filter(Boolean).join(' · ')}
                </td>
                <td className="px-4 py-2.5 text-gray-800">{r.type === 'SECONDAIRE' ? <>{sectionLabel(r.source_section_id || '')} <span className="text-gray-400">→</span> {keyLabel(r.key_id)}</> : r.type === 'PRIMAIRE' ? keyLabel(r.key_id) : sectionLabel(r.section_id)}</td>
                <td className="px-4 py-2.5">
                  {r.type === 'SECONDAIRE' ? <span className="text-gray-300 text-xs">—</span> : (
                    <select value={r.comportement || ''} onChange={e => setRuleComportement(adapter, r.id, (e.target.value || null) as Comportement | null).then(() => load())} className="border border-gray-200 rounded px-1.5 py-1 text-xs bg-white" title={t('allocationRun.behaviourTitleShort')}>
                      <option value="">{t('allocationRun.behaviourAutoShort')}</option>
                      <option value="fixe">{t('allocationRun.behaviourFixed')}</option>
                      <option value="variable">{t('allocationRun.behaviourVariable')}</option>
                      <option value="mixte">{t('allocationRun.behaviourMixed')}</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center"><input type="checkbox" checked={r.actif} onChange={e => toggleRule(adapter, r.id, e.target.checked).then(() => load())} /></td>
                <td className="px-4 py-2.5 text-right"><button onClick={() => deleteRule(adapter, r.id).then(() => load())} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Historique des runs (piste d'audit immuable) */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)]"><h2 className="font-semibold text-[var(--color-primary)]">Historique des runs (piste d’audit)</h2></div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colDate')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colVersion')}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">{t('allocationRun.colCoverage')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colLines')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colReconciled')}</th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600">{t('allocationRun.colPhase')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colHash')}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600"></th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {runs.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">{t('allocationRun.noRun')}</td></tr>}
            {runs.map(r => {
              const phaseCls = PHASE_CLASS[r.phase] || PHASE_CLASS.simule;
              const phaseLabel = t(PHASE_KEY[r.phase] || PHASE_KEY.simule);
              const blocking = controls.some(c => c.severite === 'bloquant' && c.resultat === 'ko');
              const isLatest = runs[0]?.id === r.id;
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-600 text-xs">{new Date(r.executed_at).toLocaleString(dateLocale)}</td>
                  <td className="px-4 py-2.5 text-center text-gray-500 font-mono text-xs">v{r.version_run}{r.historique && <span title={t('allocationRun.historicalRebuild')} className="ml-1 text-[9px] px-1 rounded bg-purple-100 text-purple-700">H</span>}</td>
                  <td className="px-4 py-2.5 text-right text-gray-800">{Number(r.couverture_pct).toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{r.nb_lignes_ventilees}/{r.nb_lignes_gl}</td>
                  <td className="px-4 py-2.5 text-center">{r.reconcilie ? <CheckCircle className="w-4 h-4 text-green-600 inline" /> : <AlertTriangle className="w-4 h-4 text-red-500 inline" />}</td>
                  <td className="px-4 py-2.5 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${phaseCls}`}>{r.phase === 'publie' && <Lock className="w-3 h-3" />}{phaseLabel}</span></td>
                  <td className="px-4 py-2.5 text-gray-400 font-mono text-xs"><span className="inline-flex items-center gap-1"><Hash className="w-3 h-3" />{r.hash_audit}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    {r.phase !== 'publie' && isLatest && (
                      <button onClick={() => publish(r.id)} disabled={blocking} title={blocking ? t('allocationRun.blockingCheckFailed') : t('allocationRun.publishAndLock')} className="px-2.5 py-1 text-xs rounded-lg bg-[var(--color-primary)] text-white inline-flex items-center gap-1 disabled:opacity-40">
                        <Send className="w-3.5 h-3.5" />{t('allocationRun.publish')}
                      </button>
                    )}
                    {r.phase === 'publie' && <span className="text-[11px] text-green-700 inline-flex items-center gap-1"><Lock className="w-3 h-3" />{t('allocationRun.locked')}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mapping dual-GAAP (IFRS) — référence posée V1 */}
      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--color-primary)]" />
          <div>
            <h2 className="font-semibold text-[var(--color-primary)]">{t('allocationRun.ifrsMappingTitle')}</h2>
            <p className="text-xs text-[var(--color-text-tertiary)]">{t('allocationRun.ifrsMappingSub')}</p>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{t('allocationRun.colTheme')}</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">SYSCOHADA</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">IFRS</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {buildIfrsMapping(t).map(row => (
              <tr key={row.theme} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-gray-800">{row.theme}</td>
                <td className="px-4 py-2.5 text-gray-600">{row.syscohada}</td>
                <td className="px-4 py-2.5 text-gray-600">{row.ifrs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VentilationRunPage;
